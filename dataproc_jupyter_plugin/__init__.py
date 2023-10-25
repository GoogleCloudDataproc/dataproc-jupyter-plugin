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

from kernels_mixer.kernelspecs import MixingKernelSpecManager
from kernels_mixer.kernels import MixingMappingKernelManager
from kernels_mixer.websockets import DelegatingWebsocketConnection

from jupyter_server.services.sessions.sessionmanager import SessionManager
from traitlets import Unicode
from traitlets.config import Configurable


from .handlers import setup_handlers, update_gateway_client_url

class DataprocPluginConfig(Configurable):
    log_path = Unicode("", config=True, help="File to log ServerApp and Dataproc Jupyter Plugin events.")


def _jupyter_labextension_paths():
    return [{
        "src": "labextension",
        "dest": "dataproc_jupyter_plugin"
    }]


def _jupyter_server_extension_points():
    return [{
        "module": "dataproc_jupyter_plugin"
    }]


def _link_jupyter_server_extension(server_app):
    c = server_app.config
    c.ServerApp.kernel_spec_manager_class = MixingKernelSpecManager
    c.ServerApp.kernel_manager_class = MixingMappingKernelManager
    c.ServerApp.session_manager_class = SessionManager
    c.ServerApp.kernel_websocket_connection_class = (
        DelegatingWebsocketConnection)
    c.DelegatingWebsocketConnection.kernel_ws_protocol=""

    c.GatewayClient.auth_scheme = 'Bearer'
    c.GatewayClient.headers = '{"Cookie": "_xsrf=XSRF", "X-XSRFToken": "XSRF"}'
    c.GatewayClient.gateway_token_renewer_class = CommandTokenRenewer
    c.CommandTokenRenewer.token_command = (
        'gcloud config config-helper --format="value(credential.access_token)"')

    # Version 2.8.0 of the `jupyter_server` package requires the `auth_token`
    # value to be set to a non-empty value or else it will never invoke the
    # token renewer. To accommodate this, we set it to an invalid initial
    # value that will be immediately replaced by the token renewer.
    #
    # See https://github.com/jupyter-server/jupyter_server/issues/1339 for more
    # details and discussion.
    c.GatewayClient.auth_token = 'Initial, invalid value'

    update_gateway_client_url(c, server_app.log)

    plugin_config = DataprocPluginConfig(config=server_app.config)
    if (plugin_config.log_path != ""):
        file_handler = logging.handlers.RotatingFileHandler(plugin_config.log_path, maxBytes= 2 * 1024 * 1024, backupCount=5)
        file_handler.setFormatter(logging.Formatter('[%(levelname)s %(asctime)s %(name)s] %(message)s'))
        server_app.log.addHandler(file_handler)

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
