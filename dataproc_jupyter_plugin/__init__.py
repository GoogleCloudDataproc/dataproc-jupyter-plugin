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

from google.cloud.jupyter_config.tokenrenewer import CommandTokenRenewer

from kernels_mixer.kernelspecs import MixingKernelSpecManager
from kernels_mixer.kernels import MixingMappingKernelManager
from kernels_mixer.websockets import DelegatingWebsocketConnection

from jupyter_server.services.sessions.sessionmanager import SessionManager


from .handlers import setup_handlers, update_gateway_client_url


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

    update_gateway_client_url(c, server_app.log)


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
