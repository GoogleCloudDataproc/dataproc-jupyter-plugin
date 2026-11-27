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

import logging
import json

try:
    from google.cloud.jupyter_config import (
        DataprocGatewayKernelSpecManager,
        DataprocGatewayMappingKernelManager,
        DataprocGatewayWebSocketConnection,
    )
except ImportError:
    DataprocGatewayKernelSpecManager = None
    DataprocGatewayMappingKernelManager = None
    DataprocGatewayWebSocketConnection = None

from google.cloud.jupyter_config.tokenrenewer import CommandTokenRenewer
from jupyter_server.gateway.gateway_client import GatewayClient
from jupyter_server.gateway.managers import GatewayKernelSpecManager
from jupyter_server.services.sessions.sessionmanager import SessionManager
from jupyter_server.utils import url_path_join
from kernels_mixer.kernels import MixingMappingKernelManager
from kernels_mixer.kernelspecs import MixingKernelSpecManager
from kernels_mixer.websockets import DelegatingWebsocketConnection

from .handlers import DataprocPluginConfig, configure_gateway_client_url, setup_handlers

_BaseGatewayKernelSpecManager = (
    DataprocGatewayKernelSpecManager
    if DataprocGatewayKernelSpecManager is not None
    else GatewayKernelSpecManager
)


class _DynamicGatewayKernelSpecManager(_BaseGatewayKernelSpecManager):
    """Skips remote calls until a gateway URL is configured and keeps endpoints synced."""

    def _sync_gateway_endpoints(self):
        gateway_client = GatewayClient.instance()
        if not gateway_client.gateway_enabled:
            return False
        base_endpoint = url_path_join(
            gateway_client.url, gateway_client.kernelspecs_endpoint
        )
        if hasattr(self, "_get_endpoint_for_user_filter"):
            self.base_endpoint = self._get_endpoint_for_user_filter(base_endpoint)
        else:
            self.base_endpoint = base_endpoint
        self.base_resource_endpoint = url_path_join(
            gateway_client.url, gateway_client.kernelspecs_resource_endpoint
        )
        return True

    async def get_all_specs(self):
        if not self._sync_gateway_endpoints():
            return {}
        return await super().get_all_specs()

    async def get_kernel_spec(self, kernel_name, **kwargs):
        if not self._sync_gateway_endpoints():
            raise KeyError(f"kernelspec {kernel_name} not found")
        return await super().get_kernel_spec(kernel_name, **kwargs)

    async def get_kernel_spec_resource(self, kernel_name, path):
        if not self._sync_gateway_endpoints():
            return None
        return await super().get_kernel_spec_resource(kernel_name, path)


# In seconds
MIN_GATEWAY_REQUEST_TIMEOUT = 600

# In seconds
MIN_GATEWAY_CONNECT_TIMEOUT = 300

# In seconds
MIN_GATEWAY_RETRY_INTERVAL = 20

# In number of iterations
MIN_GATEWAY_RETRY_MAX = 45


def _jupyter_labextension_paths():
    return [{"src": "labextension", "dest": "dataproc_jupyter_plugin"}]


def _jupyter_server_extension_points():
    return [{"module": "dataproc_jupyter_plugin"}]


# Helper method to set a config flag value to be at least the min value.
# Assumes the config flag takes an int
def _get_config_value_to_assign(config, min_value):
    if not isinstance(config, int):
        return min_value
    else:
        return max(config, min_value)


def _link_jupyter_server_extension(server_app):
    plugin_config = DataprocPluginConfig.instance(parent=server_app)
    if plugin_config.log_path != "":
        file_handler = logging.handlers.RotatingFileHandler(
            plugin_config.log_path, maxBytes=2 * 1024 * 1024, backupCount=5
        )
        file_handler.setFormatter(
            logging.Formatter("[%(levelname)s %(asctime)s %(name)s] %(message)s")
        )
        server_app.log.addHandler(file_handler)

    c = server_app.config
    if not configure_gateway_client_url(c, server_app.log, plugin_config.kernel_gateway_project_number):
        # Keep the mixing managers registered even when logged out or unconfigured
        # at startup, so signing in or saving settings activates remote kernels
        # without restarting JupyterLab.
        server_app.log.warning(
            "Remote kernel gateway URL is not configured yet; remote kernels will remain inactive until sign-in and project/region configuration."
        )

    c.ServerApp.kernel_spec_manager_class = MixingKernelSpecManager
    c.MixingKernelSpecManager.remote_kernel_spec_manager_class = (
        _DynamicGatewayKernelSpecManager
    )

    c.ServerApp.kernel_manager_class = MixingMappingKernelManager
    if DataprocGatewayMappingKernelManager is not None:
        c.MixingMappingKernelManager.remote_kernel_manager_class = DataprocGatewayMappingKernelManager

    c.ServerApp.session_manager_class = SessionManager
    c.ServerApp.kernel_websocket_connection_class = DelegatingWebsocketConnection
    if DataprocGatewayWebSocketConnection is not None:
        c.DelegatingWebsocketConnection.remote_websocket_connection_class = DataprocGatewayWebSocketConnection
    c.DelegatingWebsocketConnection.kernel_ws_protocol = ""

    c.GatewayClient.auth_scheme = "Bearer"
    headers = {
        "Cookie": "_xsrf=XSRF",
        "X-XSRFToken": "XSRF"
    }
    if plugin_config.custom_user_agent:
        headers["User-Agent"] = plugin_config.custom_user_agent
    c.GatewayClient.headers = json.dumps(headers)
    c.GatewayClient.gateway_token_renewer_class = CommandTokenRenewer
    c.CommandTokenRenewer.token_command = (
        'gcloud config config-helper --format="value(credential.access_token)"'
    )

    # The default gateway retry intervals and gateway retry max's were too short compared to
    # Dataproc s8s instance start up time, so we want to extend them to be at least the values
    # posted below.

    c.GatewayClient.gateway_retry_interval = _get_config_value_to_assign(
        c.GatewayClient.gateway_retry_interval, MIN_GATEWAY_RETRY_INTERVAL
    )
    c.GatewayClient.gateway_retry_max = _get_config_value_to_assign(
        c.GatewayClient.gateway_retry_max, MIN_GATEWAY_RETRY_MAX
    )


    # The default gateway client request timeout is 42 seconds but the POST request to
    # create a batch can take upwards to 600 seconds, so we want to increase the timeout
    # so that the minimum is 600 seconds.
    c.GatewayClient.request_timeout = _get_config_value_to_assign(
        c.GatewayClient.request_timeout, MIN_GATEWAY_REQUEST_TIMEOUT
    )
    c.GatewayClient.connect_timeout = _get_config_value_to_assign(
        c.GatewayClient.connect_timeout, MIN_GATEWAY_CONNECT_TIMEOUT
    )

    # Version 2.8.0 of the `jupyter_server` package requires the `auth_token`
    # value to be set to a non-empty value or else it will never invoke the
    # token renewer. To accommodate this, we set it to an invalid initial
    # value that will be immediately replaced by the token renewer.
    #
    # See https://github.com/jupyter-server/jupyter_server/issues/1339 for more
    # details and discussion.
    c.GatewayClient.auth_token = "Initial, invalid value"


def _load_jupyter_server_extension(server_app):
    """Registers the API handler to receive HTTP requests from the frontend extension.

    Parameters
    ----------
    server_app: jupyterlab.labapp.LabApp
        JupyterLab application instance
    """
    setup_handlers(server_app.web_app)
    name = "dataproc_jupyter_plugin"
    server_app.log.info(f"Registered {name} server extension")


# For backward compatibility with notebook server - useful for Binder/JupyterHub
load_jupyter_server_extension = _load_jupyter_server_extension
