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

import pytest

pytest_plugins = ("pytest_jupyter.jupyter_server", )


@pytest.fixture
def jp_server_config(jp_server_config, mock_configure_gateway_client_url_true):
    return {"ServerApp": {"jpserver_extensions": {"dataproc_jupyter_plugin": True}}, "GatewayClient": {"gateway_retry_interval": 1, "gateway_retry_max": 1, "request_timeout": 1}}


# Since the jp_server_config fixture calls configure_gateway_client_url before we have a chance to mock it, we need to mock the result here
@pytest.fixture(autouse=True)
def mock_configure_gateway_client_url_true(monkeypatch):
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.configure_gateway_client_url",
        lambda c, log: True,
    )
