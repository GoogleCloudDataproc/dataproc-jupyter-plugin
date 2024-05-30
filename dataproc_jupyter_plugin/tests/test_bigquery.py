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


async def test_list_datasets(monkeypatch, jp_fetch):
    monkeypatch.setattr(credentials, "get_cached", mock_credentials)
    monkeypatch.setattr(jupyter_config, "async_get_gcloud_config", mock_config)
    monkeypatch.setattr(requests, "get", mock_get)

    mock_project_id = "mock-project-id"
    mock_page_token = "mock-page-token"
    response = await jp_fetch(
        "dataproc-plugin",
        "bigQueryDataset",
        params={"project_id": mock_project_id, "pageToken": mock_page_token},
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert (
        payload["api_endpoint"]
        == f"https://bigquery.googleapis.com/bigquery/v2/projects/{mock_project_id}/datasets?pageToken={mock_page_token}"
    )
    assert payload["headers"]["Authorization"] == f"Bearer mock-token"


async def test_list_datasets_with_invalid_credentials(monkeypatch, jp_fetch):
    async def mock_credentials():
        return {}

    monkeypatch.setattr(credentials, "get_cached", mock_credentials)
    monkeypatch.setattr(jupyter_config, "async_get_gcloud_config", mock_config)
    monkeypatch.setattr(requests, "get", mock_get)
    response = await jp_fetch(
        "dataproc-plugin",
        "bigQueryDataset",
        params={"project_id": "project_id", "pageToken": "page_token"},
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"error": "Missing required credentials"}


async def test_list_tables(monkeypatch, jp_fetch):
    monkeypatch.setattr(credentials, "get_cached", mock_credentials)
    monkeypatch.setattr(jupyter_config, "async_get_gcloud_config", mock_config)
    monkeypatch.setattr(requests, "get", mock_get)

    mock_dataset_id = "mock-dataset-id"
    mock_project_id = "mock-project-id"
    mock_page_token = "mock-page-token"
    response = await jp_fetch(
        "dataproc-plugin",
        "bigQueryTable",
        params={
            "dataset_id": mock_dataset_id,
            "project_id": mock_project_id,
            "pageToken": mock_page_token,
        },
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert (
        payload["api_endpoint"]
        == f"https://bigquery.googleapis.com/bigquery/v2/projects/{mock_project_id}/datasets/{mock_dataset_id}/tables?pageToken={mock_page_token}"
    )
    assert payload["headers"]["Authorization"] == f"Bearer mock-token"


async def test_dataset_info(monkeypatch, jp_fetch):
    monkeypatch.setattr(credentials, "get_cached", mock_credentials)
    monkeypatch.setattr(jupyter_config, "async_get_gcloud_config", mock_config)
    monkeypatch.setattr(requests, "get", mock_get)

    mock_dataset_id = "mock-dataset-id"
    mock_project_id = "mock-project-id"
    response = await jp_fetch(
        "dataproc-plugin",
        "bigQueryDatasetInfo",
        params={
            "dataset_id": mock_dataset_id,
            "project_id": mock_project_id,
        },
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert (
        payload["api_endpoint"]
        == f"https://bigquery.googleapis.com/bigquery/v2/projects/{mock_project_id}/datasets/{mock_dataset_id}"
    )
    assert payload["headers"]["Authorization"] == f"Bearer mock-token"


async def test_table_info(monkeypatch, jp_fetch):
    monkeypatch.setattr(credentials, "get_cached", mock_credentials)
    monkeypatch.setattr(jupyter_config, "async_get_gcloud_config", mock_config)
    monkeypatch.setattr(requests, "get", mock_get)

    mock_dataset_id = "mock-dataset-id"
    mock_project_id = "mock-project-id"
    mock_table_id = "mock-table-id"
    response = await jp_fetch(
        "dataproc-plugin",
        "bigQueryTableInfo",
        params={
            "dataset_id": mock_dataset_id,
            "project_id": mock_project_id,
            "table_id": mock_table_id,
        },
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert (
        payload["api_endpoint"]
        == f"https://bigquery.googleapis.com/bigquery/v2/projects/{mock_project_id}/datasets/{mock_dataset_id}/tables/{mock_table_id}"
    )
    assert payload["headers"]["Authorization"] == f"Bearer mock-token"


async def test_preview(monkeypatch, jp_fetch):
    monkeypatch.setattr(credentials, "get_cached", mock_credentials)
    monkeypatch.setattr(jupyter_config, "async_get_gcloud_config", mock_config)
    monkeypatch.setattr(requests, "get", mock_get)

    mock_dataset_id = "mock-dataset-id"
    mock_max_results = "mock-max-results"
    mock_project_id = "mock-project-id"
    mock_start_index = "mock-start-index"
    mock_table_id = "mock-table-id"
    response = await jp_fetch(
        "dataproc-plugin",
        "bigQueryPreview",
        params={
            "dataset_id": mock_dataset_id,
            "max_results": mock_max_results,
            "project_id": mock_project_id,
            "start_index": mock_start_index,
            "table_id": mock_table_id,
        },
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert (
        payload["api_endpoint"]
        == f"https://bigquery.googleapis.com/bigquery/v2/projects/{mock_project_id}/datasets/{mock_dataset_id}/tables/{mock_table_id}/data?maxResults={mock_max_results}&startIndex={mock_start_index}"
    )
    assert payload["headers"]["Authorization"] == f"Bearer mock-token"


async def test_projects_list(monkeypatch, jp_fetch):
    monkeypatch.setattr(credentials, "get_cached", mock_credentials)
    monkeypatch.setattr(requests, "get", mock_get)

    response = await jp_fetch(
        "dataproc-plugin",
        "bigQueryProjectsList",
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == ["bigquery-public-data", "credentials-project"]


async def test_search(monkeypatch, jp_fetch):
    def mock_post(api_endpoint, headers=None, json=None):
        response = Mock()
        response.status_code = 200
        response.json.return_value = {
            "results": [
                {
                    "api_endpoint": api_endpoint,
                    "headers": headers,
                    "json": json,
                }
            ]
        }
        return response

    async def mock_config(config_field):
        return ""

    monkeypatch.setattr(jupyter_config, "async_get_gcloud_config", mock_config)
    monkeypatch.setattr(credentials, "get_cached", mock_credentials)
    monkeypatch.setattr(jupyter_config, "async_get_gcloud_config", mock_config)
    monkeypatch.setattr(requests, "post", mock_post)

    mock_search_string = "mock-search-string"
    mock_system = "mock-system"
    mock_type = "mock-type"
    response = await jp_fetch(
        "dataproc-plugin",
        "bigQuerySearch",
        params={
            "search_string": mock_search_string,
            "system": mock_system,
            "type": mock_type,
        },
    )
    assert response.code == 200
    payload = json.loads(response.body)["results"][0]
    assert (
        payload["api_endpoint"]
        == f"https://datacatalog.googleapis.com/v1/catalog:search"
    )
    assert payload["headers"]["Authorization"] == f"Bearer mock-token"
    assert (
        payload["json"]["query"]
        == f"{mock_search_string}, system={mock_system}, type={mock_type}"
    )
    assert payload["json"]["scope"]["includeProjectIds"] == [
        "bigquery-public-data",
        "credentials-project",
    ]
