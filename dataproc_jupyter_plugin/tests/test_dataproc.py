import json
import pytest
from unittest.mock import AsyncMock, patch

from dataproc_jupyter_plugin.tests import mocks
from google.api_core.exceptions import NotFound


@pytest.fixture
def mock_dataproc_service():
    with patch("dataproc_jupyter_plugin.controllers.dataproc.DataprocService") as mock_service_class:
        mock_instance = AsyncMock()
        mock_service_class.return_value = mock_instance
        yield mock_instance


async def test_list_clusters(monkeypatch, jp_fetch, mock_dataproc_service):
    mocks.patch_mocks(monkeypatch)
    
    mock_dataproc_service.list_clusters.return_value = {
        "clusters": [{"clusterName": "test-cluster"}],
        "nextPageToken": "token"
    }

    response = await jp_fetch(
        "dataproc-plugin",
        "listClusters",
        params={
            "pageSize": "50",
            "pageToken": "token123",
        },
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {
        "clusters": [{"clusterName": "test-cluster"}],
        "nextPageToken": "token"
    }
    mock_dataproc_service.list_clusters.assert_called_once_with(50, "token123")


async def test_cluster_detail(monkeypatch, jp_fetch, mock_dataproc_service):
    mocks.patch_mocks(monkeypatch)
    
    mock_dataproc_service.get_cluster_details.return_value = {
        "clusterName": "test-cluster",
        "status": {"state": "RUNNING"}
    }

    response = await jp_fetch(
        "dataproc-plugin",
        "clusterDetail",
        params={
            "cluster": "test-cluster",
        },
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {
        "clusterName": "test-cluster",
        "status": {"state": "RUNNING"}
    }
    mock_dataproc_service.get_cluster_details.assert_called_once_with("test-cluster")


import tornado.httpclient

async def test_list_clusters_error(monkeypatch, jp_fetch, mock_dataproc_service):
    mocks.patch_mocks(monkeypatch)
    
    mock_dataproc_service.list_clusters.side_effect = Exception("Mocked API Error")

    with pytest.raises(tornado.httpclient.HTTPClientError) as exc_info:
        await jp_fetch(
            "dataproc-plugin",
            "listClusters",
            params={
                "pageSize": "50",
                "pageToken": "token123",
            },
        )
    assert exc_info.value.code == 500
    payload = json.loads(exc_info.value.response.body)
    assert payload["error"]["code"] == 500
    assert payload["error"]["message"] == "Mocked API Error"


async def test_cluster_detail_error(monkeypatch, jp_fetch, mock_dataproc_service):
    mocks.patch_mocks(monkeypatch)
    
    mock_dataproc_service.get_cluster_details.side_effect = NotFound("Cluster not found")

    with pytest.raises(tornado.httpclient.HTTPClientError) as exc_info:
        await jp_fetch(
            "dataproc-plugin",
            "clusterDetail",
            params={
                "cluster": "test-cluster",
            },
        )
    assert exc_info.value.code == 404
    payload = json.loads(exc_info.value.response.body)
    assert payload["error"]["code"] == 404
    assert "Cluster not found" in payload["error"]["message"]
