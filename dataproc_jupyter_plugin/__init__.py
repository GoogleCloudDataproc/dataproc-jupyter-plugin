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
# limitations under the License.from ._version import __version__
import logging

from google.cloud.jupyter_config.tokenrenewer import CommandTokenRenewer
from jupyter_server.services.sessions.sessionmanager import SessionManager
from kernels_mixer.kernels import MixingMappingKernelManager
from kernels_mixer.kernelspecs import MixingKernelSpecManager
from kernels_mixer.websockets import DelegatingWebsocketConnection

from .handlers import DataprocPluginConfig, configure_gateway_client_url, setup_handlers

# In seconds
MIN_GATEWAY_REQUEST_TIMEOUT = 600

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
        # We were not able to configure the gateway client URL so do not modify
        # any of the server settings that rely on that.

        # Short-circuiting these remaining configurations should not have any
        # impact on the UI components of the Dataproc Jupyter Plugin, as these
        # are only related to running remote kernels and are independent of
        # the UI extensions provided by the plugin.
        server_app.log.warning("Disabling remote kernel support due to a gateway config error.")
        return

    c.ServerApp.kernel_spec_manager_class = MixingKernelSpecManager
    c.ServerApp.kernel_manager_class = MixingMappingKernelManager
    c.ServerApp.session_manager_class = SessionManager
    c.ServerApp.kernel_websocket_connection_class = DelegatingWebsocketConnection
    c.DelegatingWebsocketConnection.kernel_ws_protocol = ""

    c.GatewayClient.auth_scheme = "Bearer"
    c.GatewayClient.headers = '{"Cookie": "_xsrf=XSRF", "X-XSRFToken": "XSRF"}'
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
