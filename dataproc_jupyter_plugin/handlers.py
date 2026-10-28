# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import json
import re
import subprocess
from urllib.parse import quote


from google.cloud.jupyter_config.config import (
    async_run_gcloud_subcommand,
    clear_gcloud_cache,
    gcp_project_number,
    gcp_region,
)
from jupyter_server.base.handlers import APIHandler
from jupyter_server.serverapp import ServerApp
from jupyter_server.utils import url_path_join
from tornado.httpclient import AsyncHTTPClient
from traitlets import Bool, Undefined, Unicode
from traitlets.config import SingletonConfigurable

from dataproc_jupyter_plugin import credentials, urls
from dataproc_jupyter_plugin.commons import constants
from dataproc_jupyter_plugin.controllers import (
    bigquery,
    checkApiEnabled
)
from dataproc_jupyter_plugin.controllers.version import (
    LatestVersionController,
    UpdatePackage,
    tornado
)


from importlib.metadata import version, PackageNotFoundError

try:
    __version__ = version("dataproc_jupyter_plugin")
except PackageNotFoundError:
    __version__ = "unknown"

_region_not_set_error = """GCP region not set in gcloud.

You must configure either the `compute/region` or `dataproc/region` setting
before you can use the Dataproc Jupyter Plugin.
"""

_project_number_not_set_error = """GCP project number not set in gcloud.

You must configure the `core/project` setting in gcloud to a project that you
have viewer permission on before you can use the Dataproc Jupyter Plugin.
"""


def configure_gateway_client_url(c, log, kernel_gateway_project_number):
    try:
        region = gcp_region()
        if not region:
            log.error(_region_not_set_error)
            return False

        project_number = kernel_gateway_project_number or gcp_project_number()
        if not project_number:
            log.error(_project_number_not_set_error)
            return False

        kernel_gateway_url = f"https://{project_number}-dot-{region}.kernels.googleusercontent.com"
        log.info(f"Updating remote kernel gateway URL to {kernel_gateway_url}")
        c.GatewayClient.url = kernel_gateway_url
        return True
    except subprocess.SubprocessError as e:
        log.error(
            f"Error constructing the kernel gateway URL; configure your project, region, and credentials using gcloud: {e}"
        )
        return False


class DataprocPluginConfig(SingletonConfigurable):
    log_path = Unicode(
        "",
        config=True,
        help="File to log ServerApp and Dataproc Jupyter Plugin events.",
    )

    enable_bigquery_integration = Bool(
        False,
        config=True,
        help="Enable integration with BigQuery in JupyterLab",
    )

    enable_runtime_profile_integration = Bool(
        False,
        config=True,
        help="Enable runtime profile UI in JupyterLab",
    )

    enable_metastore_integration = Bool(
        False,
        config=True,
        help="Enable integration with metastore in JupyterLab",
    )

    # activate with the command line argument
    # `--DataprocPluginConfig.kernel_gateway_project_number=<project_number>`
    kernel_gateway_project_number = Unicode(
        "",
        config=True,
        help="Use this project number for kernel gateway and skip project number verification",
    )

    custom_user_agent = Unicode(
        f"dataproc-jupyter-plugin/{__version__}",
        config=True,
        help="Custom User-Agent header value for outbound requests to the kernels mixer.",
    )


class SettingsHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        dataproc_plugin_config = ServerApp.instance().config.DataprocPluginConfig
        for t, v in DataprocPluginConfig.instance().traits().items():
            # The `DataprocPluginConfig` config value will be a dictionary holding
            # all of the settings that were explicitly set.
            #
            # We want the returned JSON object to also include settings where we
            # fallback to a default value, so we add in any addition traits that
            # we do not yet have a value for but for which a default has been defined.
            #
            # We explicitly filter out the `config`, `parent`, and `log` attributes
            # that are inherited from the `SingletonConfigurable` class.
            if t not in dataproc_plugin_config and t not in ["config", "parent", "log"]:
                if v.default_value is not Undefined:
                    dataproc_plugin_config[t] = v.default_value

        self.log.info(f"DataprocPluginConfig: {dataproc_plugin_config}")
        self.finish(json.dumps(dataproc_plugin_config))


class CredentialsHandler(APIHandler):
    # The following decorator should be present on all verb methods (head, get, post,
    # patch, put, delete, options) to ensure only authorized user can request the
    # Jupyter server
    @tornado.web.authenticated
    async def get(self):
        cached = await credentials.get_cached()
        if cached["config_error"] == 1:
            self.log.exception(f"Error fetching credentials from gcloud")
        self.finish(json.dumps(cached))


class LoginHandler(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        cmd = "gcloud auth login"
        process = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True
        )
        output, _ = process.communicate()
        # Check if the authentication was successful
        if process.returncode == 0:
            self.finish({"login": "SUCCEEDED"})
        else:
            self.finish({"login": "FAILED"})


class ConfigHandler(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        ERROR_MESSAGE = "Project and region update "
        input_data = self.get_json_body()
        config_project_number = self.config.DataprocPluginConfig.kernel_gateway_project_number
        if config_project_number:
            self.log.debug(f"Using DataprocPluginConfig.kernel_gateway_project_number: {config_project_number}")
        project_id = input_data["projectId"]
        region = input_data["region"]
        # Validate inputs before processing
        if not config_project_number and not re.fullmatch(constants.PROJECT_REGEXP, project_id):
            self.set_status(400)
            self.finish({"error": f"Unsupported project ID: {project_id}"})
            return
        if not re.fullmatch(constants.REGION_REGEXP, region):
            self.set_status(400)
            self.finish({"error": f"Unsupported region: {region}"})
            return
        try:
            if not config_project_number:
                await async_run_gcloud_subcommand(f"config set project {project_id}")
            await async_run_gcloud_subcommand(f"config set dataproc/region {region}")
            clear_gcloud_cache()
            configure_gateway_client_url(self.config, self.log, config_project_number)
            self.finish({"config": ERROR_MESSAGE + "successful"})
        except subprocess.CalledProcessError as er:
            self.finish({"config": ERROR_MESSAGE + "failed"})


class UrlHandler(APIHandler):
    url = {}

    @tornado.web.authenticated
    async def get(self):
        url_map = await urls.map()
        self.log.info(f"Service URL map: {url_map}")
        self.finish(url_map)
        return


class LogHandler(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        logger = self.log.getChild("DataprocPluginClient")
        log_body = self.get_json_body()
        logger.log(log_body["level"], log_body["message"])
        self.finish({"status": "OK"})


class ResourceManagerHandler(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        try:
            project = await credentials._gcp_project()
            await async_run_gcloud_subcommand(
                f'projects describe {project} --format="value(projectNumber)"'
            )
            self.finish({"status": "OK"})
        except subprocess.CalledProcessError as er:
            self.finish({"status": "ERROR", "error": er.stderr})


# Catalog list paths of the Lakehouse runtime catalog endpoints.
BIGLAKE_CATALOG_PATHS = {
    "iceberg": "iceberg/v1/restcatalog/extensions/projects/{project}/catalogs",
    "hive": "hive/v1/projects/{project}/catalogs",
}


class BigLakeCatalogsHandler(APIHandler):
    """Lists a project's catalogs from a Lakehouse runtime catalog endpoint.

    These BigLake endpoints don't answer the browser's CORS preflight, so the
    server calls them. Errors are returned in BigLake's error shape.
    """

    @tornado.web.authenticated
    async def get(self):
        path = BIGLAKE_CATALOG_PATHS.get(self.get_argument("endpoint", ""))
        project_id = self.get_argument("project_id", "")
        # The project ID becomes a URL path segment, so "." and ".." are rejected too.
        if (
            not path
            or not re.fullmatch(constants.PROJECT_REGEXP, project_id)
            or project_id in (".", "..")
        ):
            message = f"Unsupported catalog endpoint or project ID: {project_id}"
            self.finish({"error": {"code": 400, "message": message}})
            return
        try:
            creds = await credentials.get_cached()
            biglake_url = await urls.gcp_service_url(constants.BIGLAKE_SERVICE_NAME)
            project = quote(project_id, safe="")
            url = f"{biglake_url.rstrip('/')}/{path.format(project=project)}"
            headers = {"Authorization": f"Bearer {creds['access_token']}"}
            # raise_error=False returns BigLake's JSON error responses (403, 404,
            # ...) as is, so the UI shows BigLake's message.
            response = await AsyncHTTPClient().fetch(
                url, headers=headers, raise_error=False
            )
            data = json.loads(response.body)
            # finish() serializes dicts only.
            if not isinstance(data, dict):
                raise ValueError(f"Unexpected BigLake response ({response.code})")
        except Exception:
            self.log.exception("Error fetching BigLake catalogs")
            message = "Failed to fetch catalogs. See the Jupyter server log for details."
            data = {"error": {"code": 500, "message": message}}
        self.finish(data)


def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    application_url = "dataproc-plugin"

    def full_path(name):
        return url_path_join(base_url, application_url, name)

    handlersMap = {
        "settings": SettingsHandler,
        "credentials": CredentialsHandler,
        "login": LoginHandler,
        "configuration": ConfigHandler,
        "getGcpServiceUrls": UrlHandler,
        "log": LogHandler,
        "bigQueryDataset": bigquery.DatasetController,
        "bigQueryTable": bigquery.TableController,
        "bigQueryDatasetInfo": bigquery.DatasetInfoController,
        "bigQueryTableInfo": bigquery.TableInfoController,
        "bigQueryPreview": bigquery.PreviewController,
        "bigQueryProjectsList": bigquery.ProjectsController,
        "bigQuerySearch": bigquery.SearchController,
        "biglakeCatalogs": BigLakeCatalogsHandler,
        "checkResourceManager": ResourceManagerHandler,
        "jupyterlabVersion": LatestVersionController,
        "updatePlugin": UpdatePackage,
        "checkApiEnabled": checkApiEnabled.CheckApiController,
        
    }
    handlers = [(full_path(name), handler) for name, handler in handlersMap.items()]
    web_app.add_handlers(host_pattern, handlers)
