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

import asyncio
import json
import re
import subprocess
import sys
import tempfile


import tornado
from google.cloud.jupyter_config.config import (
    async_run_gcloud_subcommand,
    clear_gcloud_cache,
    gcp_kernel_gateway_url,
    gcp_project_number,
    gcp_region,
)
from jupyter_server.base.handlers import APIHandler
from jupyter_server.serverapp import ServerApp
from jupyter_server.utils import url_path_join
from traitlets import Bool, Undefined, Unicode
from traitlets.config import SingletonConfigurable

from dataproc_jupyter_plugin import credentials, urls
from dataproc_jupyter_plugin.commons import constants
from dataproc_jupyter_plugin.controllers import (
    airflow,
    bigquery,
    composer,
    dataproc,
    executor,
)

_region_not_set_error = """GCP region not set in gcloud.

You must configure either the `compute/region` or `dataproc/region` setting
before you can use the Dataproc Jupyter Plugin.
"""

_project_number_not_set_error = """GCP project number not set in gcloud.

You must configure the `core/project` setting in gcloud to a project that you
have viewer permission on before you can use the Dataproc Jupyter Plugin.
"""


def configure_gateway_client_url(c, log):
    try:
        if not gcp_region():
            log.error(_region_not_set_error)
            return False
        if not gcp_project_number():
            log.error(_project_number_not_set_error)
            return False

        kernel_gateway_url = gcp_kernel_gateway_url()
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
    enable_cloud_storage_integration = Bool(
        False,
        config=True,
        help="Enable integration with gcs in JupyterLab",
    )
    enable_metastore_integration = Bool(
        False,
        config=True,
        help="Enable integration with metastore in JupyterLab",
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
        project_id = input_data["projectId"]
        region = input_data["region"]
        # Validate inputs before processing
        if not re.fullmatch(constants.PROJECT_REGEXP, project_id):
            self.set_status(400)
            self.finish({"error": f"Unsupported project ID: {project_id}"})
            return
        if not re.fullmatch(constants.REGION_REGEXP, region):
            self.set_status(400)
            self.finish({"error": f"Unsupported region: {region}"})
            return
        try:
            await async_run_gcloud_subcommand(f"config set project {project_id}")
            await async_run_gcloud_subcommand(f"config set dataproc/region {region}")
            clear_gcloud_cache()
            configure_gateway_client_url(self.config, self.log)
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
            subcmd = f'projects describe {project} --format="value(projectNumber)"'
            with tempfile.TemporaryFile() as t:
                with tempfile.TemporaryFile() as errt:
                    p = await asyncio.create_subprocess_shell(
                        f"gcloud {subcmd}",
                        stdin=subprocess.DEVNULL,
                        stderr=errt,
                        stdout=t,
                    )
                    await p.wait()
                    if p.returncode != 0:
                        errt.seek(0)
                        stderr_str = errt.read().decode("UTF-8").strip()
                        raise subprocess.CalledProcessError(
                            p.returncode, f"gcloud {subcmd}", None, stderr_str
                        )
                    t.seek(0)
                    t.read().decode("UTF-8").strip()
            self.finish({"status": "OK"})
        except subprocess.CalledProcessError as er:
            self.finish({"status": "ERROR", "error": er.stderr})


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
        "composerList": composer.EnvironmentListController,
        "dagRun": airflow.DagRunController,
        "dagRunTask": airflow.DagRunTaskController,
        "dagRunTaskLogs": airflow.DagRunTaskLogsController,
        "clusterList": dataproc.ClusterListController,
        "runtimeList": dataproc.RuntimeController,
        "createJobScheduler": executor.ExecutorController,
        "dagList": airflow.DagListController,
        "dagDelete": airflow.DagDeleteController,
        "dagUpdate": airflow.DagUpdateController,
        "editJobScheduler": airflow.EditDagController,
        "importErrorsList": airflow.ImportErrorController,
        "triggerDag": airflow.TriggerDagController,
        "downloadOutput": executor.DownloadOutputController,
        "bigQueryDataset": bigquery.DatasetController,
        "bigQueryTable": bigquery.TableController,
        "bigQueryDatasetInfo": bigquery.DatasetInfoController,
        "bigQueryTableInfo": bigquery.TableInfoController,
        "bigQueryPreview": bigquery.PreviewController,
        "bigQueryProjectsList": bigquery.ProjectsController,
        "bigQuerySearch": bigquery.SearchController,
        "bigQueryApiEnabled": bigquery.CheckApiController,
        "checkResourceManager": ResourceManagerHandler,
    }
    handlers = [(full_path(name), handler) for name, handler in handlersMap.items()]
    web_app.add_handlers(host_pattern, handlers)
