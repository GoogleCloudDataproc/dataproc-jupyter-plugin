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
import asyncio
import time
from unittest.mock import AsyncMock, patch, Mock

from dataproc_jupyter_plugin.services.bigquery import Client
from dataproc_jupyter_plugin.commons.constants import (
    DATAPLEX_SERVICE_NAME
)

@pytest.fixture
def mock_credentials():
    return {
        "access_token": "mock-token",
        "project_id": "test-project",
        "region_id": "us-central1"
    }

@pytest.fixture
def mock_log():
    return Mock()

@pytest.fixture
def mock_client_session():
    return AsyncMock(spec=aiohttp.ClientSession)

@pytest.fixture
def mock_dataplex_url():
    with patch("dataproc_jupyter_plugin.urls.gcp_service_url") as mock_url:
        mock_url.return_value = "https://dataplex.googleapis.com/"
        yield mock_url

@pytest.mark.asyncio
async def test_semantic_search_payload_construction(
    mock_credentials, mock_log, mock_client_session, mock_dataplex_url
):
    """Verifies that the Dataplex query and JSON payload are correctly formed."""
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json.return_value = {
        "results": [{"dataplexEntry": {"displayName": "sales_table"}}],
        "totalSize": 1
    }
    mock_client_session.post.return_value.__aenter__.return_value = mock_response

    client = Client(mock_credentials, mock_log, mock_client_session)
    
    await client.bigquery_semantic_search(
        search_string="revenue",
        search_type="TABLE|VIEW",
        system="BIGQUERY",
        projects=["proj-1"],
        scope=True,
        locations=["us"],
        page_size=20,
        page_token="token-abc"
    )

    # Validate the generated URL
    expected_url = "https://dataplex.googleapis.com/v1/projects/test-project/locations/global:searchEntries"
    
    # Validate the complex query string construction
    expected_query = "revenue AND system=BIGQUERY AND (type=TABLE OR type=VIEW) AND (projectid=proj-1) AND (location=us)"
    
    # Validate the JSON payload including the semanticSearch toggle
    expected_payload = {
        "name": "projects/test-project/locations/global",
        "query": expected_query,
        "pageSize": 20,
        "semanticSearch": True,
        "pageToken": "token-abc",
        "scope": "projects/test-project"
    }

    call_args = mock_client_session.post.call_args
    assert call_args[0][0] == expected_url
    assert call_args[1]["json"] == expected_payload
    assert call_args[1]["headers"]["X-Goog-User-Project"] == "test-project"

@pytest.mark.asyncio
async def test_semantic_search_empty_input_handling(
    mock_credentials, mock_log, mock_client_session
):
    """Ensures the client returns early with a warning if no search parameters exist."""
    client = Client(mock_credentials, mock_log, mock_client_session)
    
    result = await client.bigquery_semantic_search(
        "", "", "", [], False, []
    )
    
    assert result == {}
    mock_log.warning.assert_called_once_with("No search query provided. Returning empty result.")

@pytest.mark.asyncio
async def test_semantic_search_api_failure(
    mock_credentials, mock_log, mock_client_session, mock_dataplex_url
):
    """Verifies error handling when the Dataplex API returns a non-200 status."""
    mock_response = AsyncMock()
    mock_response.status = 403
    mock_response.reason = "Forbidden"
    mock_response.text.return_value = "Access Denied"
    mock_client_session.post.return_value.__aenter__.return_value = mock_response

    client = Client(mock_credentials, mock_log, mock_client_session)
    
    result = await client.bigquery_semantic_search("test", "TABLE", "BQ", [], False, [])

    assert "error" in result
    assert "Dataplex API Error: 403" in result["error"]
    mock_log.exception.assert_called_once()

@pytest.mark.asyncio
async def test_tornado_responsiveness_during_semantic_search(
    mock_credentials, mock_log, mock_client_session, mock_dataplex_url
):
    """
    Verifies that the Tornado event loop remains responsive (non-blocking)
    while the semantic search API call is in flight.
    """
    # Create a mock response object first
    mock_json_body = AsyncMock()
    mock_json_body.return_value = {}
    
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json = mock_json_body
    # This is the key: Mock the context manager __aenter__ to return our response
    mock_response.__aenter__ = AsyncMock(return_value=mock_response)

    async def slow_response(*args, **kwargs):
        await asyncio.sleep(0.5)
        return mock_response

    # Use side_effect to trigger the delay
    mock_client_session.post.side_effect = slow_response
    client = Client(mock_credentials, mock_log, mock_client_session)

    start_canary = time.perf_counter()

    # Start the search task
    search_task = asyncio.create_task(
        client.bigquery_semantic_search(
            search_string="revenue", 
            search_type="TABLE", 
            system="BQ", 
            projects=["*"], 
            scope=False, 
            locations=[]
        )
    )

    # Canary sleep to check for blocking
    await asyncio.sleep(0.05) 
    
    end_canary = time.perf_counter()
    latency = end_canary - start_canary

    # Await the actual task to clean up the coroutine
    await search_task

    assert latency < 0.1, f"Tornado loop was blocked! Latency was {latency:.4f}s"