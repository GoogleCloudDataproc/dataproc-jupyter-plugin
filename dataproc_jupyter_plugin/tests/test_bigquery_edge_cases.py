
import pytest
import aiohttp
from unittest.mock import AsyncMock, Mock, patch
from dataproc_jupyter_plugin.services.bigquery import Client
from dataproc_jupyter_plugin.commons.constants import (
    BIGQUERY_SERVICE_NAME,
    DATAPLEX_SERVICE_NAME,
    PAGE_SIZE_LIMIT
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

@pytest.mark.asyncio
async def test_list_datasets_null_results(
    mock_credentials, mock_log, mock_client_session, mock_gcp_urls
):
    """Test that list_datasets handles null results from Dataplex API without TypeError."""
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json.return_value = {"results": None}
    mock_client_session.post.return_value.__aenter__.return_value = mock_response

    client = Client(mock_credentials, mock_log, mock_client_session)
    result = await client.list_datasets(
        page_token=None,
        project_id="my-project-123"
    )
    assert result == {"entries": [], "nextPageToken": None}

@pytest.mark.asyncio
async def test_list_datasets_filter_missing_dataplex_entry(
    mock_credentials, mock_log, mock_client_session, mock_gcp_urls
):
    """Test that list_datasets filters out results missing dataplexEntry."""
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json.return_value = {
        "results": [
            {"dataplexEntry": {"name": "entry1"}},
            {"somethingElse": "no-dataplex-entry"},
            {"dataplexEntry": None}
        ]
    }
    mock_client_session.post.return_value.__aenter__.return_value = mock_response

    client = Client(mock_credentials, mock_log, mock_client_session)
    result = await client.list_datasets(
        page_token=None,
        project_id="my-project-123"
    )
    assert result["entries"] == [{"name": "entry1"}]

@pytest.mark.asyncio
async def test_bigquery_search_null_results(
    mock_credentials, mock_log, mock_client_session, mock_gcp_urls
):
    """Test that bigquery_search handles null results from Dataplex API."""
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json.return_value = {"results": None}
    mock_client_session.post.return_value.__aenter__.return_value = mock_response

    client = Client(mock_credentials, mock_log, mock_client_session)
    result = await client.bigquery_search("query", "type", "system", ["p1"])
    assert result == {}

@pytest.mark.asyncio
async def test_bigquery_search_filter_missing_dataplex_entry(
    mock_credentials, mock_log, mock_client_session, mock_gcp_urls
):
    """Test that bigquery_search filters out results missing dataplexEntry."""
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json.return_value = {
        "results": [
            {"dataplexEntry": {"name": "entry1"}},
            {"somethingElse": "no-dataplex-entry"}
        ]
    }
    mock_client_session.post.return_value.__aenter__.return_value = mock_response

    client = Client(mock_credentials, mock_log, mock_client_session)
    result = await client.bigquery_search("query", "type", "system", ["p1"])
    assert result["results"] == [{"dataplexEntry": {"name": "entry1"}}]
