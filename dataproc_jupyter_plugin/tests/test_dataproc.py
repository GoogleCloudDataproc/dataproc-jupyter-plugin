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


import tornado.httpclient

async def test_stop_cluster_error(monkeypatch, jp_fetch, mock_dataproc_service):
    mocks.patch_mocks(monkeypatch)
    
    mock_dataproc_service.stop_cluster.side_effect = Exception("Stop API Error")

    with pytest.raises(tornado.httpclient.HTTPClientError) as exc_info:
        await jp_fetch(
            "dataproc-plugin",
            "stopCluster",
            method="POST",
            params={
                "cluster": "test-cluster",
            },
            body=""
        )
    assert exc_info.value.code == 500
    payload = json.loads(exc_info.value.response.body)
    assert payload["error"]["code"] == 500
    assert payload["error"]["message"] == "Stop API Error"


async def test_start_cluster_error(monkeypatch, jp_fetch, mock_dataproc_service):
    mocks.patch_mocks(monkeypatch)
    
    mock_dataproc_service.start_cluster.side_effect = Exception("Start API Error")

    with pytest.raises(tornado.httpclient.HTTPClientError) as exc_info:
        await jp_fetch(
            "dataproc-plugin",
            "startCluster",
            method="POST",
            params={
                "cluster": "test-cluster",
            },
            body=""
        )
    assert exc_info.value.code == 500
    payload = json.loads(exc_info.value.response.body)
    assert payload["error"]["code"] == 500
    assert payload["error"]["message"] == "Start API Error"
