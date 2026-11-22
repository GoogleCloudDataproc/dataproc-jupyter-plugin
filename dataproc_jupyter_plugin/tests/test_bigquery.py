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
from unittest.mock import AsyncMock, Mock, patch
from urllib.parse import urlencode

import aiohttp
import pytest

from dataproc_jupyter_plugin.commons.constants import (
    BASE_PROJECT_ID,
    BIGQUERY_SERVICE_NAME,
    BQ_PUBLIC_DATASET_PROJECT_ID,
    CLOUDRESOURCEMANAGER_SERVICE_NAME,
    DATAPLEX_SERVICE_NAME,
    PAGE_SIZE_LIMIT,
)
from dataproc_jupyter_plugin.controllers import bigquery as bq_controller
from dataproc_jupyter_plugin.services import bigquery as bq_service
from dataproc_jupyter_plugin.services.bigquery import Client
from dataproc_jupyter_plugin.tests import mocks


@pytest.fixture(autouse=True)
def reset_bigquery_singleton():
    def _reset():
        bq_controller.bigquery_client._client = None
        bq_controller.bigquery_client._session = None
        bq_controller.bigquery_client._creation_time = None
        bq_controller.bigquery_client._lock = None

    _reset()
    yield
    _reset()


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
            DATAPLEX_SERVICE_NAME: "https://dataplex.googleapis.com/",
            CLOUDRESOURCEMANAGER_SERVICE_NAME: "https://cloudresourcemanager.googleapis.com/",
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

    expected_url = f"https://dataplex.googleapis.com/v1/projects/my-project-123/locations/us/entryGroups/@bigquery/entries?filter=entry_type=projects/{BASE_PROJECT_ID}/locations/global/entryTypes/bigquery-dataset&pageSize={PAGE_SIZE_LIMIT}"
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


@pytest.mark.asyncio
async def test_list_datasets_public_without_page_token(
    mock_credentials, mock_log, mock_client_session, mock_gcp_urls
):
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json.return_value = {"datasets": ["public_dataset1"]}
    mock_client_session.get.return_value.__aenter__.return_value = mock_response

    client = Client(mock_credentials, mock_log, mock_client_session)
    result = await client.list_datasets(
        page_token=None,
        project_id=BQ_PUBLIC_DATASET_PROJECT_ID,
        location="us",
    )

    expected_url = (
        f"https://bigquery.googleapis.com/bigquery/v2/projects/"
        f"{BQ_PUBLIC_DATASET_PROJECT_ID}/datasets?maxResults={PAGE_SIZE_LIMIT}"
    )
    mock_client_session.get.assert_called_once_with(
        expected_url, headers=client.create_headers()
    )
    assert result == {"datasets": ["public_dataset1"]}


@pytest.mark.asyncio
async def test_list_datasets_user_specific_with_page_token(
    mock_credentials, mock_log, mock_client_session, mock_gcp_urls
):
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json.return_value = {"entries": ["user_dataset1"]}
    mock_client_session.get.return_value.__aenter__.return_value = mock_response

    client = Client(mock_credentials, mock_log, mock_client_session)
    result = await client.list_datasets(
        page_token="token-123",
        project_id="my-project-123",
        location="us",
    )

    expected_url = (
        f"https://dataplex.googleapis.com/v1/projects/my-project-123/locations/us/"
        f"entryGroups/@bigquery/entries?filter=entry_type=projects/{BASE_PROJECT_ID}/"
        f"locations/global/entryTypes/bigquery-dataset&pageSize={PAGE_SIZE_LIMIT}&pageToken=token-123"
    )
    mock_client_session.get.assert_called_once_with(
        expected_url, headers=client.create_headers()
    )
    assert result == {"entries": ["user_dataset1"]}


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "method_name,args,expected_url,expected_error_prefix,expected_log_msg",
    [
        (
            "list_table",
            ("ds1", "tok", "proj1"),
            "https://bigquery.googleapis.com/bigquery/v2/projects/proj1/datasets/ds1/tables?pageToken=tok",
            "Error listing BigQuery tables",
            "Error fetching tables list",
        ),
        (
            "list_dataset_info",
            ("ds1", "proj1"),
            "https://bigquery.googleapis.com/bigquery/v2/projects/proj1/datasets/ds1",
            "Error listing BigQuery dataset info",
            "Error fetching dataset info",
        ),
        (
            "list_table_info",
            ("ds1", "tbl1", "proj1"),
            "https://bigquery.googleapis.com/bigquery/v2/projects/proj1/datasets/ds1/tables/tbl1",
            "Error listing BigQuery table info",
            "Error fetching table information",
        ),
        (
            "bigquery_preview_data",
            ("ds1", "tbl1", 10, 0, "proj1"),
            "https://bigquery.googleapis.com/bigquery/v2/projects/proj1/datasets/ds1/tables/tbl1/data?maxResults=10&startIndex=0",
            "Error displaying BigQuery preview data",
            "Error fetching preview data",
        ),
        (
            "bigquery_projects",
            ("ds1", "tbl1"),
            "https://cloudresourcemanager.googleapis.com/v1/projects",
            "Error listing BigQuery projects",
            "Error fetching projects",
        ),
    ],
)
async def test_service_methods_api_errors(
    mock_credentials,
    mock_log,
    mock_client_session,
    mock_gcp_urls,
    method_name,
    args,
    expected_url,
    expected_error_prefix,
    expected_log_msg,
):
    mock_response = AsyncMock()
    mock_response.status = 500
    mock_response.reason = "Internal Server Error"
    mock_response.text.return_value = "Backend error"
    mock_client_session.get.return_value.__aenter__.return_value = mock_response

    client = Client(mock_credentials, mock_log, mock_client_session)
    result = await getattr(client, method_name)(*args)

    mock_client_session.get.assert_called_once_with(
        expected_url, headers=client.create_headers()
    )
    assert result == {
        "error": f"{expected_error_prefix}: Internal Server Error Backend error"
    }
    mock_log.exception.assert_called_once_with(expected_log_msg)


@pytest.mark.asyncio
async def test_bigquery_projects_success(
    mock_credentials, mock_log, mock_client_session, mock_gcp_urls
):
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json.return_value = {"projects": [{"projectId": "p1"}]}
    mock_client_session.get.return_value.__aenter__.return_value = mock_response

    client = Client(mock_credentials, mock_log, mock_client_session)
    result = await client.bigquery_projects("ds1", "tbl1")

    mock_client_session.get.assert_called_once_with(
        "https://cloudresourcemanager.googleapis.com/v1/projects",
        headers=client.create_headers(),
    )
    assert result == {"projects": [{"projectId": "p1"}]}


@pytest.mark.asyncio
async def test_bigquery_search_pagination_and_filters(
    mock_credentials, mock_log, mock_client_session, mock_gcp_urls
):
    resp_page1 = AsyncMock()
    resp_page1.status = 200
    resp_page1.json.return_value = {
        "results": [{"name": "r1"}],
        "nextPageToken": "page2-token",
    }

    resp_page2 = AsyncMock()
    resp_page2.status = 200
    resp_page2.json.return_value = {
        "results": [{"name": "r2"}],
    }

    cm1 = AsyncMock()
    cm1.__aenter__.return_value = resp_page1
    cm2 = AsyncMock()
    cm2.__aenter__.return_value = resp_page2
    mock_client_session.post.side_effect = [cm1, cm2]

    client = Client(mock_credentials, mock_log, mock_client_session)
    result = await client.bigquery_search(
        search_string="sales",
        type="table|dataset",
        system="bigquery",
        projects=["proj-1", "proj-2"],
    )

    expected_endpoint = (
        "https://dataplex.googleapis.com/v1/projects/mock-project-id/"
        "locations/global:searchEntries"
    )
    expected_headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer mock-token",
        "X-Goog-User-Project": "mock-project-id",
    }
    expected_query = (
        "sales AND system=BIGQUERY AND (type=TABLE OR type=DATASET) "
        "AND (projectid=proj-1 OR projectid=proj-2)"
    )

    assert result == {"results": [{"name": "r1"}, {"name": "r2"}]}
    assert mock_client_session.post.call_count == 2
    first_call, second_call = mock_client_session.post.call_args_list
    assert first_call.args == (expected_endpoint,)
    assert first_call.kwargs == {
        "headers": expected_headers,
        "json": {"query": expected_query, "pageSize": 500},
    }
    assert second_call.args == (expected_endpoint,)
    assert second_call.kwargs == {
        "headers": expected_headers,
        "json": {
            "query": expected_query,
            "pageSize": 500,
            "pageToken": "page2-token",
        },
    }


@pytest.mark.asyncio
async def test_bigquery_search_stops_on_empty_next_page_token(
    mock_credentials, mock_log, mock_client_session, mock_gcp_urls
):
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json.return_value = {
        "results": [{"name": "r1"}],
        "nextPageToken": "",
    }
    mock_client_session.post.return_value.__aenter__.return_value = mock_response

    client = Client(mock_credentials, mock_log, mock_client_session)
    result = await client.bigquery_search("sales", "", "", [])

    assert result == {"results": [{"name": "r1"}]}
    assert mock_client_session.post.call_count == 1


@pytest.mark.asyncio
async def test_bigquery_search_stops_after_max_pages(
    monkeypatch, mock_credentials, mock_log, mock_client_session, mock_gcp_urls
):
    monkeypatch.setattr(bq_service, "MAX_SEARCH_PAGES", 2)

    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json.return_value = {
        "results": [{"name": "r"}],
        "nextPageToken": "next",
    }
    mock_client_session.post.return_value.__aenter__.return_value = mock_response

    client = Client(mock_credentials, mock_log, mock_client_session)
    result = await client.bigquery_search("sales", "", "", [])

    assert mock_client_session.post.call_count == 2
    assert result == {"results": [{"name": "r"}, {"name": "r"}]}
    mock_log.warning.assert_called_once()


@pytest.mark.asyncio
async def test_bigquery_search_empty_query(
    mock_credentials, mock_log, mock_client_session, mock_gcp_urls
):
    client = Client(mock_credentials, mock_log, mock_client_session)

    result = await client.bigquery_search("", "", "", [])

    assert result == {}
    mock_client_session.post.assert_not_called()
    mock_log.warning.assert_called_once_with(
        "No search query provided. Returning empty result."
    )


@pytest.mark.asyncio
async def test_bigquery_search_empty_results(
    mock_credentials, mock_log, mock_client_session, mock_gcp_urls
):
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json.return_value = {}
    mock_client_session.post.return_value.__aenter__.return_value = mock_response

    client = Client(mock_credentials, mock_log, mock_client_session)
    result = await client.bigquery_search("sales", "", "", [])

    assert result == {}
    mock_client_session.post.assert_called_once()


@pytest.mark.asyncio
async def test_bigquery_search_api_error(
    mock_credentials, mock_log, mock_client_session, mock_gcp_urls
):
    mock_response = AsyncMock()
    mock_response.status = 400
    mock_response.reason = "Bad Request"
    mock_response.text.return_value = "Invalid query"
    mock_client_session.post.return_value.__aenter__.return_value = mock_response

    client = Client(mock_credentials, mock_log, mock_client_session)
    result = await client.bigquery_search("sales", "", "", [])

    assert result == {"error": "Dataplex API Error: 400 - Bad Request - Invalid query"}
    mock_log.error.assert_called_once_with(
        "Error searching in Dataplex: 400 - Invalid query"
    )
    mock_log.exception.assert_called_once()


@pytest.mark.asyncio
async def test_bigquery_search_client_error(
    mock_credentials, mock_log, mock_client_session, mock_gcp_urls
):
    mock_client_session.post.side_effect = aiohttp.ClientError("connection failed")

    client = Client(mock_credentials, mock_log, mock_client_session)
    result = await client.bigquery_search("sales", "", "", [])

    assert result == {"error": "connection failed"}
    mock_log.error.assert_called_once_with(
        "Aiohttp client error during API call: connection failed"
    )
    mock_log.exception.assert_called_once()


@pytest.mark.asyncio
async def test_bigquery_client_reuses_non_expired_session(monkeypatch, mock_log):
    mocks.patch_mocks(monkeypatch)
    monkeypatch.setattr(bq_controller.time, "time", lambda: 1000.0)

    bq_client_wrapper = bq_controller.BigQueryClient()
    existing_client = Mock()
    existing_session = AsyncMock()
    bq_client_wrapper._client = existing_client
    bq_client_wrapper._session = existing_session
    bq_client_wrapper._creation_time = 900.0

    returned_client = await bq_client_wrapper.get_client(mock_log)

    assert returned_client is existing_client
    existing_session.close.assert_not_awaited()
    assert bq_client_wrapper._session is existing_session


@pytest.mark.asyncio
async def test_bigquery_client_expiry_closes_session(monkeypatch, mock_log):
    mocks.patch_mocks(monkeypatch)
    monkeypatch.setattr(bq_controller.time, "time", lambda: 5000.0)

    bq_client_wrapper = bq_controller.BigQueryClient()
    old_client = Mock()
    old_session = AsyncMock()
    bq_client_wrapper._client = old_client
    bq_client_wrapper._session = old_session
    bq_client_wrapper._creation_time = 1000.0

    new_client = await bq_client_wrapper.get_client(mock_log)

    old_session.close.assert_awaited_once()
    assert isinstance(new_client, Client)
    assert new_client is not old_client
    assert bq_client_wrapper._session is not old_session
    assert bq_client_wrapper._creation_time == 5000.0


@pytest.mark.parametrize(
    "params,expected_location",
    [
        ({"pageToken": "p1", "project_id": "my-proj", "location": "US"}, "us"),
        ({"pageToken": "p1", "project_id": "my-proj"}, "us"),
    ],
)
async def test_dataset_controller_success(
    monkeypatch, jp_fetch, params, expected_location
):
    mocks.patch_mocks(monkeypatch)

    ds_response = await jp_fetch(
        "dataproc-plugin",
        "bigQueryDataset",
        params=params,
    )
    assert ds_response.code == 200
    ds_payload = json.loads(ds_response.body)
    expected_url = (
        f"https://dataplex.googleapis.com/v1/projects/my-proj/locations/{expected_location}/"
        f"entryGroups/@bigquery/entries?filter=entry_type=projects/{BASE_PROJECT_ID}/"
        f"locations/global/entryTypes/bigquery-dataset&pageSize={PAGE_SIZE_LIMIT}&pageToken=p1"
    )
    assert ds_payload["api_endpoint"] == expected_url
    assert ds_payload["headers"]["Authorization"] == "Bearer mock-token"


async def test_search_controller_success(monkeypatch, jp_fetch):
    mocks.patch_mocks(monkeypatch)

    search_body = urlencode(
        {"search_string": "orders", "type": "table", "system": "bigquery"}
    )
    search_response = await jp_fetch(
        "dataproc-plugin",
        "bigQuerySearch",
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        body=search_body,
    )
    assert search_response.code == 200
    search_payload = json.loads(search_response.body)
    assert len(search_payload["results"]) == 1
    first_result = search_payload["results"][0]
    assert (
        first_result["api_endpoint"]
        == "https://dataplex.googleapis.com/v1/projects/credentials-project/locations/global:searchEntries"
    )
    assert first_result["headers"]["Authorization"] == "Bearer mock-token"
    assert first_result["headers"]["X-Goog-User-Project"] == "credentials-project"
    assert first_result["json"] == {
        "query": (
            "orders AND system=BIGQUERY AND (type=TABLE) "
            "AND (projectid=bigquery-public-data OR projectid=credentials-project)"
        ),
        "pageSize": 500,
    }


async def test_projects_list_without_configured_project(monkeypatch, jp_fetch):
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.credentials.get_cached",
        AsyncMock(
            return_value={
                "project_id": "",
                "region_id": "mock-region",
                "access_token": "mock-token",
                "config_error": 1,
                "login_error": 0,
            }
        ),
    )

    response = await jp_fetch("dataproc-plugin", "bigQueryProjectsList")
    assert response.code == 200
    assert json.loads(response.body) == [BQ_PUBLIC_DATASET_PROJECT_ID]


@pytest.mark.parametrize(
    "endpoint,params,expected_error",
    [
        ("bigQueryDataset", {"pageToken": "", "project_id": "p"}, "client failure"),
        (
            "bigQueryTable",
            {"pageToken": "", "dataset_id": "d", "project_id": "p"},
            "client failure",
        ),
        (
            "bigQueryDatasetInfo",
            {"dataset_id": "d", "project_id": "p"},
            "client failure",
        ),
        (
            "bigQueryTableInfo",
            {"dataset_id": "d", "table_id": "t", "project_id": "p"},
            "client failure",
        ),
        (
            "bigQueryPreview",
            {
                "dataset_id": "d",
                "table_id": "t",
                "max_results": "10",
                "start_index": "0",
                "project_id": "p",
            },
            "client failure",
        ),
        ("bigQueryProjectsList", {}, "projects failure"),
    ],
)
async def test_bigquery_get_controllers_exception_handling(
    monkeypatch, jp_fetch, endpoint, params, expected_error
):
    monkeypatch.setattr(
        bq_controller.bigquery_client,
        "get_client",
        AsyncMock(side_effect=RuntimeError("client failure")),
    )
    monkeypatch.setattr(
        bq_controller,
        "bq_projects_list",
        AsyncMock(side_effect=RuntimeError("projects failure")),
    )

    resp = await jp_fetch("dataproc-plugin", endpoint, params=params)
    assert resp.code == 200
    assert json.loads(resp.body) == {"error": expected_error}


@pytest.mark.parametrize(
    "fail_target,expected_error",
    [
        ("projects", "projects failure"),
        ("client", "client failure"),
    ],
)
async def test_search_controller_exception_handling(
    monkeypatch, jp_fetch, fail_target, expected_error
):
    if fail_target == "projects":
        monkeypatch.setattr(
            bq_controller,
            "bq_projects_list",
            AsyncMock(side_effect=RuntimeError("projects failure")),
        )
    else:
        monkeypatch.setattr(
            bq_controller,
            "bq_projects_list",
            AsyncMock(return_value=["bigquery-public-data"]),
        )
        monkeypatch.setattr(
            bq_controller.bigquery_client,
            "get_client",
            AsyncMock(side_effect=RuntimeError("client failure")),
        )

    search_resp = await jp_fetch(
        "dataproc-plugin",
        "bigQuerySearch",
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        body=urlencode({"search_string": "q", "type": "table", "system": "bigquery"}),
    )
    assert search_resp.code == 200
    assert json.loads(search_resp.body) == {"error": expected_error}