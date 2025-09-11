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
import pytest
import aiohttp
from unittest.mock import AsyncMock, patch, Mock
import json

from google.cloud import jupyter_config

from dataproc_jupyter_plugin import credentials
from dataproc_jupyter_plugin.tests import mocks
from dataproc_jupyter_plugin.commons.constants import BQ_PUBLIC_DATASET_PROJECT_ID

from dataproc_jupyter_plugin.services.bigquery import Client
from dataproc_jupyter_plugin.commons.constants import (
    BQ_PUBLIC_DATASET_PROJECT_ID,
    BASE_PROJECT_ID,
    PAGE_SIZE_LIMIT,
    BIGQUERY_SERVICE_NAME,
    DATAPLEX_SERVICE_NAME
)

@pytest.fixture
def mock_credentials():
    return {
        "access_token": "mock-token",
        "project_id": "mock-project-id",
        "region_id": "us-central1"
    }

@pytest.fixture
def mock_log():
    return Mock()

@pytest.fixture
def mock_client_session():
    return AsyncMock(spec=aiohttp.ClientSession)

@pytest.fixture
def mock_gcp_urls():
    with patch("dataproc_jupyter_plugin.urls.gcp_service_url") as mock_url:
        mock_url.side_effect = lambda service_name: {
            BIGQUERY_SERVICE_NAME: "https://bigquery.googleapis.com/",
            DATAPLEX_SERVICE_NAME: "https://dataplex.googleapis.com/"
        }.get(service_name)
        yield mock_url

def test_client_init_success(mock_credentials, mock_log, mock_client_session):
    client = Client(mock_credentials, mock_log, mock_client_session)
    assert client._access_token == "mock-token"
    assert client.project_id == "mock-project-id"
    assert client.region_id == "us-central1"
    assert client.client_session is mock_client_session

def test_client_init_missing_credentials(mock_log, mock_client_session):
    incomplete_credentials = {"access_token": "mock-token"}
    with pytest.raises(ValueError, match="Missing required credentials"):
        Client(incomplete_credentials, mock_log, mock_client_session)
    mock_log.exception.assert_called_once_with("Missing required credentials")

def test_create_headers(mock_credentials, mock_log, mock_client_session):
    client = Client(mock_credentials, mock_log, mock_client_session)
    headers = client.create_headers()
    assert headers["Content-Type"] == "application/json"
    assert headers["Authorization"] == "Bearer mock-token"

@pytest.mark.asyncio
async def test_list_datasets_public_with_page_token(
    mock_credentials, mock_log, mock_client_session, mock_gcp_urls
):
    # Mock the response from the aiohttp session
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json.return_value = {"datasets": ["public_dataset1", "public_dataset2"]}
    mock_client_session.get.return_value.__aenter__.return_value = mock_response

    client = Client(mock_credentials, mock_log, mock_client_session)
    result = await client.list_datasets(
        page_token="next-page",
        project_id=BQ_PUBLIC_DATASET_PROJECT_ID,
        location="us"
    )

    expected_url = f"https://bigquery.googleapis.com/bigquery/v2/projects/{BQ_PUBLIC_DATASET_PROJECT_ID}/datasets?maxResults={PAGE_SIZE_LIMIT}&pageToken=next-page"
    mock_client_session.get.assert_called_once_with(expected_url, headers=client.create_headers())
    assert result == {"datasets": ["public_dataset1", "public_dataset2"]}

@pytest.mark.asyncio
async def test_list_datasets_user_specific(
    mock_credentials, mock_log, mock_client_session, mock_gcp_urls
):
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json.return_value = {"entries": ["user_dataset1", "user_dataset2"]}
    mock_client_session.get.return_value.__aenter__.return_value = mock_response

    client = Client(mock_credentials, mock_log, mock_client_session)
    result = await client.list_datasets(
        page_token=None,
        project_id="my-project-123",
        location="us"
    )

    expected_url = f"https://dataplex.googleapis.com//v1/projects/my-project-123/locations/us/entryGroups/@bigquery/entries?filter=entry_type=projects/{BASE_PROJECT_ID}/locations/global/entryTypes/bigquery-dataset&pageSize={PAGE_SIZE_LIMIT}"
    mock_client_session.get.assert_called_once_with(expected_url, headers=client.create_headers())
    assert result == {"entries": ["user_dataset1", "user_dataset2"]}

@pytest.mark.asyncio
async def test_list_datasets_api_error(
    mock_credentials, mock_log, mock_client_session, mock_gcp_urls
):
    mock_response = AsyncMock()
    mock_response.status = 403
    mock_response.reason = "Forbidden"
    mock_response.text.return_value = "Permission denied"
    mock_client_session.get.return_value.__aenter__.return_value = mock_response

    client = Client(mock_credentials, mock_log, mock_client_session)
    result = await client.list_datasets(
        page_token=None,
        project_id="my-project-123",
        location="us"
    )

    assert result["error"] == "Error response from BigQuery: Forbidden Permission denied"
    mock_log.exception.assert_called_once_with("Error fetching datasets list")

async def test_list_tables(monkeypatch, jp_fetch):
    mocks.patch_mocks(monkeypatch)

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
    mocks.patch_mocks(monkeypatch)

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
    mocks.patch_mocks(monkeypatch)

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
    mocks.patch_mocks(monkeypatch)

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
    mocks.patch_mocks(monkeypatch)

    response = await jp_fetch(
        "dataproc-plugin",
        "bigQueryProjectsList",
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == ["bigquery-public-data", "credentials-project"]