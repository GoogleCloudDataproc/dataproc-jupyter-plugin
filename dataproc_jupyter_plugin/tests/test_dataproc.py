import json
import pytest
from unittest.mock import AsyncMock, patch

from dataproc_jupyter_plugin.tests import mocks


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


async def test_stop_cluster(monkeypatch, jp_fetch, mock_dataproc_service):
    mocks.patch_mocks(monkeypatch)
    
    mock_dataproc_service.stop_cluster.return_value = {
        "status": "stopping",
        "operationName": "op-123"
    }

    response = await jp_fetch(
        "dataproc-plugin",
        "stopCluster",
        method="POST",
        params={
            "cluster": "test-cluster",
        },
        body=""
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {
        "status": "stopping",
        "operationName": "op-123"
    }
    mock_dataproc_service.stop_cluster.assert_called_once_with("test-cluster")


async def test_start_cluster(monkeypatch, jp_fetch, mock_dataproc_service):
    mocks.patch_mocks(monkeypatch)
    
    mock_dataproc_service.start_cluster.return_value = {
        "status": "starting",
        "operationName": "op-123"
    }

    response = await jp_fetch(
        "dataproc-plugin",
        "startCluster",
        method="POST",
        params={
            "cluster": "test-cluster",
        },
        body=""
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {
        "status": "starting",
        "operationName": "op-123"
    }
    mock_dataproc_service.start_cluster.assert_called_once_with("test-cluster")


async def test_delete_cluster(monkeypatch, jp_fetch, mock_dataproc_service):
    mocks.patch_mocks(monkeypatch)
    
    mock_dataproc_service.delete_cluster.return_value = {
        "status": "deleting",
        "operationName": "op-123"
    }

    response = await jp_fetch(
        "dataproc-plugin",
        "deleteCluster",
        method="DELETE",
        params={
            "cluster": "test-cluster",
        },
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {
        "status": "deleting",
        "operationName": "op-123"
    }
    mock_dataproc_service.delete_cluster.assert_called_once_with("test-cluster")

import tornado.httpclient

async def test_list_clusters_error(monkeypatch, jp_fetch, mock_dataproc_service):
    mocks.patch_mocks(monkeypatch)
    
    mock_dataproc_service.list_clusters.side_effect = Exception("Mocked API Error")

    try:
        response = await jp_fetch(
            "dataproc-plugin",
            "listClusters",
            params={
                "pageSize": "50",
                "pageToken": "token123",
            },
        )
    except tornado.httpclient.HTTPClientError as e:
        assert e.code == 500
        payload = json.loads(e.response.body)
        assert payload["error"]["code"] == 500
        assert payload["error"]["message"] == "Mocked API Error"


async def test_cluster_detail_error(monkeypatch, jp_fetch, mock_dataproc_service):
    mocks.patch_mocks(monkeypatch)
    
    mock_dataproc_service.get_cluster_details.side_effect = Exception("Detail API Error")

    try:
        response = await jp_fetch(
            "dataproc-plugin",
            "clusterDetail",
            params={
                "cluster": "test-cluster",
            },
        )
    except tornado.httpclient.HTTPClientError as e:
        assert e.code == 500
        payload = json.loads(e.response.body)
        assert payload["error"]["code"] == 500
        assert payload["error"]["message"] == "Detail API Error"


async def test_stop_cluster_error(monkeypatch, jp_fetch, mock_dataproc_service):
    mocks.patch_mocks(monkeypatch)
    
    mock_dataproc_service.stop_cluster.side_effect = Exception("Stop API Error")

    try:
        response = await jp_fetch(
            "dataproc-plugin",
            "stopCluster",
            method="POST",
            params={
                "cluster": "test-cluster",
            },
            body=""
        )
    except tornado.httpclient.HTTPClientError as e:
        assert e.code == 500
        payload = json.loads(e.response.body)
        assert payload["error"]["code"] == 500
        assert payload["error"]["message"] == "Stop API Error"


async def test_start_cluster_error(monkeypatch, jp_fetch, mock_dataproc_service):
    mocks.patch_mocks(monkeypatch)
    
    mock_dataproc_service.start_cluster.side_effect = Exception("Start API Error")

    try:
        response = await jp_fetch(
            "dataproc-plugin",
            "startCluster",
            method="POST",
            params={
                "cluster": "test-cluster",
            },
            body=""
        )
    except tornado.httpclient.HTTPClientError as e:
        assert e.code == 500
        payload = json.loads(e.response.body)
        assert payload["error"]["code"] == 500
        assert payload["error"]["message"] == "Start API Error"


async def test_delete_cluster_error(monkeypatch, jp_fetch, mock_dataproc_service):
    mocks.patch_mocks(monkeypatch)
    
    mock_dataproc_service.delete_cluster.side_effect = Exception("Delete API Error")

    try:
        response = await jp_fetch(
            "dataproc-plugin",
            "deleteCluster",
            method="DELETE",
            params={
                "cluster": "test-cluster",
            },
        )
    except tornado.httpclient.HTTPClientError as e:
        assert e.code == 500
        payload = json.loads(e.response.body)
        assert payload["error"]["code"] == 500
        assert payload["error"]["message"] == "Delete API Error"
