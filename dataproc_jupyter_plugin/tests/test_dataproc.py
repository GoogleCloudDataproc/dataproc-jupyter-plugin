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


def mock_get(api_endpoint, headers=None):
    response = Mock()
    response.status_code = 200
    response.json.return_value = {
        "api_endpoint": api_endpoint,
        "headers": headers,
    }
    return response


async def mock_config(field_name):
    return None


async def test_list_clusters(monkeypatch, jp_fetch):
    monkeypatch.setattr(credentials, "get_cached", mock_credentials)
    monkeypatch.setattr(jupyter_config, "async_get_gcloud_config", mock_config)
    monkeypatch.setattr(requests, "get", mock_get)
    mock_project_id = "credentials-project"
    mock_page_token = "mock-page-token"
    mock_region_id = "mock-region"
    mock_page_size = "mock_page_size"
    response = await jp_fetch(
        "dataproc-plugin",
        "clusterList",
        params={"pageSize": mock_page_size, "pageToken": mock_page_token},
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert (
        payload["api_endpoint"]
        == f"https://dataproc.googleapis.com//v1/projects/credentials-project/regions/{mock_region_id}/clusters?pageSize={mock_page_size}&pageToken={mock_page_token}"
    )
    assert payload["headers"]["Authorization"] == f"Bearer mock-token"


async def test_list_runtime(monkeypatch, jp_fetch):
    monkeypatch.setattr(credentials, "get_cached", mock_credentials)
    monkeypatch.setattr(requests, "get", mock_get)
    monkeypatch.setattr(jupyter_config, "async_get_gcloud_config", mock_config)
    mock_project_id = "credentials-project"
    mock_page_token = "mock-page-token"
    mock_region_id = "mock-region"
    mock_page_size = "mock_page_size"
    mock_service_url = "mock_url"
    response = await jp_fetch(
        "dataproc-plugin",
        "runtimeList",
        params={"pageSize": mock_page_size, "pageToken": mock_page_token},
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert (
        payload["api_endpoint"]
        == f"https://dataproc.googleapis.com//v1/projects/{mock_project_id}/locations/{mock_region_id}/sessionTemplates?pageSize=mock_page_size&pageToken={mock_page_token}"
    )
    assert payload["headers"]["Authorization"] == f"Bearer mock-token"
