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

import datetime
import inspect
import json
import re
import subprocess
import threading
import time

from dataproc_jupyter_plugin.contollers.bigqueryController import (
    BigqueryDatasetController,
    BigqueryDatasetInfoController,
    BigqueryPreviewController,
    BigqueryProjectsController,
    BigquerySearchController,
    BigqueryTableController,
    BigqueryTableInfoController,
)
from jupyter_server.base.handlers import APIHandler
from jupyter_server.serverapp import ServerApp
from jupyter_server.utils import url_path_join
from jupyter_server.utils import ensure_async
from requests import HTTPError
import tornado
from traitlets import Bool, Undefined, Unicode
from traitlets.config import SingletonConfigurable

from google.cloud.jupyter_config.config import (
    clear_gcloud_cache,
    gcp_credentials,
    gcp_kernel_gateway_url,
    gcp_project,
    gcp_project_number,
    gcp_region,
    get_gcloud_config,
    run_gcloud_subcommand,
)

from dataproc_jupyter_plugin.contollers.clusterController import ClusterListController
from dataproc_jupyter_plugin.contollers.composerController import ComposerListController
from dataproc_jupyter_plugin.contollers.dagController import (
    DagDeleteController,
    DagDownloadController,
    DagListController,
    DagUpdateController,
)
from dataproc_jupyter_plugin.contollers.dagRunController import (
    DagRunController,
    DagRunTaskController,
    DagRunTaskLogsController,
)
from dataproc_jupyter_plugin.contollers.downloadOutputController import (
    downloadOutputController,
)
from dataproc_jupyter_plugin.contollers.editDagController import EditDagController
from dataproc_jupyter_plugin.contollers.executorController import ExecutorController
from dataproc_jupyter_plugin.contollers.importErrorController import (
    ImportErrorController,
)
from dataproc_jupyter_plugin.contollers.runtimeController import RuntimeController
from dataproc_jupyter_plugin.contollers.triggerDagController import TriggerDagController


_region_not_set_error = '''GCP region not set in gcloud.

You must configure either the `compute/region` or `dataproc/region` setting
before you can use the Dataproc Jupyter Plugin.
'''

_project_number_not_set_error = '''GCP project number not set in gcloud.

You must configure the `core/project` setting in gcloud to a project that you
have viewer permission on before you can use the Dataproc Jupyter Plugin.
'''


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
    def get(self):
        credentials = {
            "project_id": "",
            "project_number": 0,
            "region_id": "",
            "access_token": "",
            "config_error": 0,
            "login_error": 0,
        }
        try:
            credentials["project_id"] = gcp_project()
            credentials["region_id"] = gcp_region()
            credentials["config_error"] = 0
            credentials["access_token"] = gcp_credentials()
            credentials["project_number"] = gcp_project_number()
        except Exception as ex:
            self.log.exception(f"Error fetching credentials from gcloud")
            credentials["config_error"] = 1
        if not credentials["access_token"] or not credentials["project_number"]:
            # These will only be set if the user is logged in to gcloud with
            # an account that has the appropriate permissions on the configured
            # project.
            #
            # As such, we treat them being missing as a signal that there is
            # a problem with how the user is logged in to gcloud.
            credentials["login_error"] = 1
        self.finish(json.dumps(credentials))


class LoginHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
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
    def post(self):
        ERROR_MESSAGE = "Project and region update "
        input_data = self.get_json_body()
        project_id = input_data["projectId"]
        region = input_data["region"]
        try:
            run_gcloud_subcommand(f"config set project {project_id}")
            run_gcloud_subcommand(f"config set dataproc/region {region}")
            clear_gcloud_cache()
            update_gateway_client_url(self.config, self.log)
            self.finish({"config": ERROR_MESSAGE + "successful"})
        except subprocess.CalledProcessError as er:
            self.finish({"config": ERROR_MESSAGE + "failed"})


class UrlHandler(APIHandler):
    url = {}

    @tornado.web.authenticated
    def get(self):
        dataproc_url = self.gcp_service_url("dataproc")
        compute_url = self.gcp_service_url(
            "compute", default_url="https://compute.googleapis.com/compute/v1"
        )
        metastore_url = self.gcp_service_url("metastore")
        cloudkms_url = self.gcp_service_url("cloudkms")
        cloudresourcemanager_url = self.gcp_service_url("cloudresourcemanager")
        datacatalog_url = self.gcp_service_url("datacatalog")
        storage_url = self.gcp_service_url(
            "storage", default_url="https://storage.googleapis.com/storage/v1/"
        )
        url = {
            "dataproc_url": dataproc_url,
            "compute_url": compute_url,
            "metastore_url": metastore_url,
            "cloudkms_url": cloudkms_url,
            "cloudresourcemanager_url": cloudresourcemanager_url,
            "datacatalog_url": datacatalog_url,
            "storage_url": storage_url,
        }
        self.finish(url)

    def gcp_service_url(self, service_name, default_url=None):
        default_url = default_url or f"https://{service_name}.googleapis.com/"
        configured_url = get_gcloud_config(
            f"configuration.properties.api_endpoint_overrides.{service_name}"
        )
        url = configured_url or default_url
        self.log.info(f"Service_url for service {service_name}: {url}")
        return url


class LogHandler(APIHandler):
    @tornado.web.authenticated
    def post(self):
        logger = self.log.getChild("DataprocPluginClient")
        log_body = self.get_json_body()
        logger.log(log_body["level"], log_body["message"])
        self.finish({"status": "OK"})


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
        "composerList": ComposerListController,
        "dagRun": DagRunController,
        "dagRunTask": DagRunTaskController,
        "dagRunTaskLogs": DagRunTaskLogsController,
        "clusterList": ClusterListController,
        "runtimeList": RuntimeController,
        "createJobScheduler": ExecutorController,
        "dagList": DagListController,
        "dagDownload": DagDownloadController,
        "dagDelete": DagDeleteController,
        "dagUpdate": DagUpdateController,
        "editJobScheduler": EditDagController,
        "importErrorsList": ImportErrorController,
        "triggerDag": TriggerDagController,
        "downloadOutput": downloadOutputController,
        "bigQueryDataset": BigqueryDatasetController,
        "bigQueryTable": BigqueryTableController,
        "bigQueryDatasetInfo": BigqueryDatasetInfoController,
        "bigQueryTableInfo": BigqueryTableInfoController,
        "bigQueryPreview": BigqueryPreviewController,
        "bigQueryProjectsList": BigqueryProjectsController,
        "bigQuerySearch": BigquerySearchController,
    }
    handlers = [(full_path(name), handler) for name, handler in handlersMap.items()]
    web_app.add_handlers(host_pattern, handlers)
