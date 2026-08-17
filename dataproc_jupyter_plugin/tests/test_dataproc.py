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

async def test_delete_cluster_error(monkeypatch, jp_fetch, mock_dataproc_service):
    mocks.patch_mocks(monkeypatch)
    
    mock_dataproc_service.delete_cluster.side_effect = Exception("Delete API Error")

    with pytest.raises(tornado.httpclient.HTTPClientError) as exc_info:
        await jp_fetch(
            "dataproc-plugin",
            "deleteCluster",
            method="DELETE",
            params={
                "cluster": "test-cluster",
            },
        )
    assert exc_info.value.code == 500
    payload = json.loads(exc_info.value.response.body)
    assert payload["error"]["code"] == 500
    assert payload["error"]["message"] == "Delete API Error"
