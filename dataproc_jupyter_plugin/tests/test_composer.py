# Copyright 2024 Google LLC
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
from unittest.mock import Mock

import requests
from google.cloud import jupyter_config

from dataproc_jupyter_plugin import credentials


async def mock_credentials():
    return {
        "project_id": "credentials-project",
        "project_number": 12345,
        "region_id": "mock-region",
        "access_token": "mock-token",
        "config_error": 0,
        "login_error": 0,
    }


def mock_get(url, headers):
    mock_resp = Mock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "environments": [
            {"name": "projects/mock-project/locations/mock-location/environments/env1"},
            {"name": "projects/mock-project/locations/mock-location/environments/env2"},
        ]
    }
    return mock_resp


async def mock_config(field_name):
    return None


async def test_list_composer(monkeypatch, jp_fetch):
    monkeypatch.setattr(credentials, "get_cached", mock_credentials)
    monkeypatch.setattr(requests, "get", mock_get)
    monkeypatch.setattr(jupyter_config, "async_get_gcloud_config", mock_config)
    response = await jp_fetch("dataproc-plugin", "composerList")
    assert response.code == 200
    payload = json.loads(response.body)
    assert len(payload) == 2
    assert payload[0]["name"] == "env1"
    assert payload[1]["name"] == "env2"
