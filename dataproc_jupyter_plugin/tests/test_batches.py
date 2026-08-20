# Copyright 2026 Google LLC
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
from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from dataproc_jupyter_plugin.services.batches import BatchesService


@pytest.fixture
def mock_credentials():
    return {
        "project_id": "test-project",
        "region_id": "us-central1",
        "access_token": "test-token",
        "config_error": 0,
        "login_error": 0,
    }


# ==============================================================================
# Controller Unit Tests (API endpoints via Tornado jp_fetch)
# ==============================================================================

async def test_list_batches_controller_success(jp_fetch, monkeypatch, mock_credentials):
    mock_get_cached = AsyncMock(return_value=mock_credentials)
    monkeypatch.setattr("dataproc_jupyter_plugin.credentials.get_cached", mock_get_cached)

    expected_data = {
        "batches": [
            {
                "name": "projects/test-project/locations/us-central1/batches/batch-1",
                "state": "SUCCEEDED",
                "createTime": "2026-08-07T10:00:00Z",
            }
        ],
        "nextPageToken": "token-123",
    }

    with patch(
        "dataproc_jupyter_plugin.services.batches.BatchesService.list_batches",
        new_callable=AsyncMock,
        return_value=expected_data,
    ) as mock_list:
        response = await jp_fetch("dataproc-plugin", "listBatches", params={"pageSize": "10"})
        assert response.code == 200
        payload = json.loads(response.body)
        assert payload == expected_data
        mock_list.assert_called_once_with("10", None)


async def test_list_batches_controller_error(jp_fetch, monkeypatch, mock_credentials):
    mock_get_cached = AsyncMock(return_value=mock_credentials)
    monkeypatch.setattr("dataproc_jupyter_plugin.credentials.get_cached", mock_get_cached)

    with patch(
        "dataproc_jupyter_plugin.services.batches.BatchesService.list_batches",
        new_callable=AsyncMock,
        side_effect=Exception("API Call Failed"),
    ):
        response = await jp_fetch("dataproc-plugin", "listBatches")
        assert response.code == 200
        payload = json.loads(response.body)
        assert "error" in payload
        assert payload["error"]["code"] == 500
        assert "API Call Failed" in payload["error"]["message"]


async def test_batch_detail_controller_success(jp_fetch, monkeypatch, mock_credentials):
    mock_get_cached = AsyncMock(return_value=mock_credentials)
    monkeypatch.setattr("dataproc_jupyter_plugin.credentials.get_cached", mock_get_cached)

    expected_data = {
        "name": "projects/test-project/locations/us-central1/batches/batch-123",
        "uuid": "uuid-123",
        "state": "SUCCEEDED",
        "createTime": "2026-08-07T10:00:00Z",
    }

    with patch(
        "dataproc_jupyter_plugin.services.batches.BatchesService.get_batch",
        new_callable=AsyncMock,
        return_value=expected_data,
    ) as mock_get:
        response = await jp_fetch("dataproc-plugin", "batchDetail", params={"batch": "batch-123"})
        assert response.code == 200
        payload = json.loads(response.body)
        assert payload == expected_data
        mock_get.assert_called_once_with("batch-123")


async def test_batch_detail_controller_error(jp_fetch, monkeypatch, mock_credentials):
    mock_get_cached = AsyncMock(return_value=mock_credentials)
    monkeypatch.setattr("dataproc_jupyter_plugin.credentials.get_cached", mock_get_cached)

    with patch(
        "dataproc_jupyter_plugin.services.batches.BatchesService.get_batch",
        new_callable=AsyncMock,
        side_effect=Exception("Batch not found"),
    ):
        response = await jp_fetch("dataproc-plugin", "batchDetail", params={"batch": "invalid-batch"})
        assert response.code == 200
        payload = json.loads(response.body)
        assert "error" in payload
        assert payload["error"]["code"] == 500
        assert "Batch not found" in payload["error"]["message"]


async def test_delete_batch_controller_success(jp_fetch, monkeypatch, mock_credentials):
    mock_get_cached = AsyncMock(return_value=mock_credentials)
    monkeypatch.setattr("dataproc_jupyter_plugin.credentials.get_cached", mock_get_cached)

    expected_data = {
        "status": "DELETED",
        "message": "Batch batch-123 deleted successfully.",
    }

    with patch(
        "dataproc_jupyter_plugin.services.batches.BatchesService.delete_batch",
        new_callable=AsyncMock,
        return_value=expected_data,
    ) as mock_delete:
        response = await jp_fetch("dataproc-plugin", "deleteBatch", method="DELETE", params={"batch": "batch-123"})
        assert response.code == 200
        payload = json.loads(response.body)
        assert payload == expected_data
        mock_delete.assert_called_once_with("batch-123")


async def test_delete_batch_controller_error(jp_fetch, monkeypatch, mock_credentials):
    mock_get_cached = AsyncMock(return_value=mock_credentials)
    monkeypatch.setattr("dataproc_jupyter_plugin.credentials.get_cached", mock_get_cached)

    with patch(
        "dataproc_jupyter_plugin.services.batches.BatchesService.delete_batch",
        new_callable=AsyncMock,
        side_effect=Exception("Delete failed"),
    ):
        response = await jp_fetch("dataproc-plugin", "deleteBatch", method="DELETE", params={"batch": "batch-123"})
        assert response.code == 200
        payload = json.loads(response.body)
        assert "error" in payload
        assert payload["error"]["code"] == 500
        assert "Delete failed" in payload["error"]["message"]


async def test_list_networks_controller_success(jp_fetch, monkeypatch, mock_credentials):
    mock_get_cached = AsyncMock(return_value=mock_credentials)
    monkeypatch.setattr("dataproc_jupyter_plugin.credentials.get_cached", mock_get_cached)

    expected_data = {
        "items": [
            {"name": "default", "selfLink": "https://www.googleapis.com/compute/v1/projects/test-project/global/networks/default"}
        ]
    }

    with patch(
        "dataproc_jupyter_plugin.services.batches.BatchesService.list_networks",
        new_callable=AsyncMock,
        return_value=expected_data,
    ) as mock_list:
        response = await jp_fetch("dataproc-plugin", "listNetworks")
        assert response.code == 200
        payload = json.loads(response.body)
        assert payload == expected_data
        mock_list.assert_called_once()


async def test_list_networks_controller_error(jp_fetch, monkeypatch, mock_credentials):
    mock_get_cached = AsyncMock(return_value=mock_credentials)
    monkeypatch.setattr("dataproc_jupyter_plugin.credentials.get_cached", mock_get_cached)

    with patch(
        "dataproc_jupyter_plugin.services.batches.BatchesService.list_networks",
        new_callable=AsyncMock,
        side_effect=Exception("Failed to list networks"),
    ):
        response = await jp_fetch("dataproc-plugin", "listNetworks")
        assert response.code == 200
        payload = json.loads(response.body)
        assert "error" in payload
        assert payload["error"]["code"] == 500
        assert "Failed to list networks" in payload["error"]["message"]


async def test_subnetwork_controller_success(jp_fetch, monkeypatch, mock_credentials):
    mock_get_cached = AsyncMock(return_value=mock_credentials)
    monkeypatch.setattr("dataproc_jupyter_plugin.credentials.get_cached", mock_get_cached)

    expected_data = {
        "name": "sub-1",
        "network": "https://www.googleapis.com/compute/v1/projects/test-project/global/networks/default",
        "selfLink": "https://www.googleapis.com/compute/v1/projects/test-project/regions/us-central1/subnetworks/sub-1",
    }

    with patch(
        "dataproc_jupyter_plugin.services.batches.BatchesService.get_subnetwork",
        new_callable=AsyncMock,
        return_value=expected_data,
    ) as mock_get:
        response = await jp_fetch("dataproc-plugin", "subNetwork", params={"subNetwork": "sub-1"})
        assert response.code == 200
        payload = json.loads(response.body)
        assert payload == expected_data
        mock_get.assert_called_once_with("sub-1")


async def test_subnetwork_controller_error(jp_fetch, monkeypatch, mock_credentials):
    mock_get_cached = AsyncMock(return_value=mock_credentials)
    monkeypatch.setattr("dataproc_jupyter_plugin.credentials.get_cached", mock_get_cached)

    with patch(
        "dataproc_jupyter_plugin.services.batches.BatchesService.get_subnetwork",
        new_callable=AsyncMock,
        side_effect=Exception("Failed to get subnetwork"),
    ):
        response = await jp_fetch("dataproc-plugin", "subNetwork", params={"subNetwork": "invalid-sub"})
        assert response.code == 200
        payload = json.loads(response.body)
        assert "error" in payload
        assert payload["error"]["code"] == 500
        assert "Failed to get subnetwork" in payload["error"]["message"]


# ==============================================================================
# Service Unit Tests (BatchesService Python SDK calls)
# ==============================================================================

async def test_batches_service_list_batches_success(mock_credentials):
    log = MagicMock()
    service = BatchesService(mock_credentials, log)

    mock_batch = MagicMock()
    mock_batch.name = "projects/test-project/locations/us-central1/batches/batch-1"

    mock_page = MagicMock()
    mock_page.batches = [mock_batch]
    mock_page.next_page_token = "next-token"

    class AsyncPagesMock:
        def __aiter__(self):
            async def gen():
                yield mock_page
            return gen()

    mock_pager = MagicMock()
    mock_pager.pages = AsyncPagesMock()

    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.list_batches = AsyncMock(return_value=mock_pager)

    expected_batch_dict = {
        "name": "projects/test-project/locations/us-central1/batches/batch-1",
        "state": "SUCCEEDED",
        "createTime": "2026-08-07T10:00:00Z",
    }

    with patch(
        "google.cloud.dataproc_v1.BatchControllerAsyncClient",
        return_value=mock_client,
    ), patch(
        "google.cloud.dataproc_v1.Batch.to_dict",
        return_value=expected_batch_dict,
    ):
        res = await service.list_batches(page_size=10, page_token="prev-token")
        assert "batches" in res
        assert len(res["batches"]) == 1
        assert res["batches"][0] == expected_batch_dict
        assert res["nextPageToken"] == "next-token"
        mock_client.list_batches.assert_called_once()


async def test_batches_service_list_batches_exception(mock_credentials):
    log = MagicMock()
    service = BatchesService(mock_credentials, log)

    with patch(
        "google.cloud.dataproc_v1.BatchControllerAsyncClient",
        side_effect=Exception("SDK Connection error"),
    ):
        res = await service.list_batches()
        assert "error" in res
        assert res["error"]["code"] == 500
        assert "SDK Connection error" in res["error"]["message"]


async def test_batches_service_get_batch_success(mock_credentials):
    log = MagicMock()
    service = BatchesService(mock_credentials, log)

    mock_batch = MagicMock()
    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.get_batch = AsyncMock(return_value=mock_batch)

    expected_dict = {
        "name": "projects/test-project/locations/us-central1/batches/batch-123",
        "uuid": "uuid-123",
        "state": "SUCCEEDED",
    }

    with patch(
        "google.cloud.dataproc_v1.BatchControllerAsyncClient",
        return_value=mock_client,
    ), patch(
        "google.cloud.dataproc_v1.Batch.to_dict",
        return_value=expected_dict,
    ):
        res = await service.get_batch("batch-123")
        assert res == expected_dict
        mock_client.get_batch.assert_called_once()


async def test_batches_service_get_batch_exception(mock_credentials):
    log = MagicMock()
    service = BatchesService(mock_credentials, log)

    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.get_batch = AsyncMock(side_effect=Exception("Batch 404 Not Found"))

    with patch(
        "google.cloud.dataproc_v1.BatchControllerAsyncClient",
        return_value=mock_client,
    ):
        res = await service.get_batch("batch-404")
        assert "error" in res
        assert res["error"]["code"] == 500
        assert "Batch 404 Not Found" in res["error"]["message"]


async def test_batches_service_get_batch_exception_with_code_value(mock_credentials):
    log = MagicMock()
    service = BatchesService(mock_credentials, log)

    err = Exception("Not Found")
    err.code = MagicMock()
    err.code.value = 404

    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.get_batch = AsyncMock(side_effect=err)

    with patch(
        "google.cloud.dataproc_v1.BatchControllerAsyncClient",
        return_value=mock_client,
    ):
        res = await service.get_batch("batch-404")
        assert "error" in res
        assert res["error"]["code"] == 404


async def test_batches_service_delete_batch_success(mock_credentials):
    log = MagicMock()
    service = BatchesService(mock_credentials, log)

    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.delete_batch = AsyncMock(return_value=None)

    with patch(
        "google.cloud.dataproc_v1.BatchControllerAsyncClient",
        return_value=mock_client,
    ):
        res = await service.delete_batch("batch-123")
        assert res == {
            "status": "DELETED",
            "message": "Batch batch-123 deleted successfully.",
        }
        mock_client.delete_batch.assert_called_once()


async def test_batches_service_delete_batch_exception(mock_credentials):
    log = MagicMock()
    service = BatchesService(mock_credentials, log)

    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.delete_batch = AsyncMock(side_effect=Exception("Failed to delete batch"))

    with patch(
        "google.cloud.dataproc_v1.BatchControllerAsyncClient",
        return_value=mock_client,
    ):
        res = await service.delete_batch("batch-123")
        assert "error" in res
        assert res["error"]["code"] == 500
        assert "Failed to delete batch" in res["error"]["message"]


async def test_batches_service_delete_batch_exception_with_code_value(mock_credentials):
    log = MagicMock()
    service = BatchesService(mock_credentials, log)

    err = Exception("Not Found")
    err.code = MagicMock()
    err.code.value = 404

    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.delete_batch = AsyncMock(side_effect=err)

    with patch(
        "google.cloud.dataproc_v1.BatchControllerAsyncClient",
        return_value=mock_client,
    ):
        res = await service.delete_batch("batch-404")
        assert "error" in res
        assert res["error"]["code"] == 404


async def test_batches_service_list_networks_success(mock_credentials):
    log = MagicMock()
    service = BatchesService(mock_credentials, log)

    mock_network = MagicMock()
    mock_network.name = "default"
    mock_network.self_link = "https://www.googleapis.com/compute/v1/projects/test-project/global/networks/default"

    mock_client = MagicMock()
    mock_client.list.return_value = [mock_network]

    with patch(
        "google.cloud.compute_v1.NetworksClient",
        return_value=mock_client,
    ):
        res = await service.list_networks()
        assert "items" in res
        assert len(res["items"]) == 1
        assert res["items"][0]["name"] == "default"
        assert res["items"][0]["selfLink"] == mock_network.self_link
        mock_client.list.assert_called_once()


async def test_batches_service_list_networks_exception(mock_credentials):
    log = MagicMock()
    service = BatchesService(mock_credentials, log)

    mock_client = MagicMock()
    mock_client.list.side_effect = Exception("Compute API error")

    with patch(
        "google.cloud.compute_v1.NetworksClient",
        return_value=mock_client,
    ):
        res = await service.list_networks()
        assert "error" in res
        assert res["error"]["code"] == 500
        assert "Compute API error" in res["error"]["message"]


async def test_batches_service_list_networks_exception_with_code_value(mock_credentials):
    log = MagicMock()
    service = BatchesService(mock_credentials, log)

    err = Exception("Forbidden")
    err.code = MagicMock()
    err.code.value = 403

    mock_client = MagicMock()
    mock_client.list.side_effect = err

    with patch(
        "google.cloud.compute_v1.NetworksClient",
        return_value=mock_client,
    ):
        res = await service.list_networks()
        assert "error" in res
        assert res["error"]["code"] == 403


async def test_batches_service_get_subnetwork_success(mock_credentials):
    log = MagicMock()
    service = BatchesService(mock_credentials, log)

    mock_subnetwork = MagicMock()
    mock_subnetwork.name = "default"
    mock_subnetwork.network = "https://www.googleapis.com/compute/v1/projects/test-project/global/networks/default"
    mock_subnetwork.self_link = "https://www.googleapis.com/compute/v1/projects/test-project/regions/us-central1/subnetworks/default"

    mock_client = MagicMock()
    mock_client.get.return_value = mock_subnetwork

    with patch(
        "google.cloud.compute_v1.SubnetworksClient",
        return_value=mock_client,
    ):
        res = await service.get_subnetwork("https://.../subnetworks/default")
        assert res == {
            "name": "default",
            "network": "https://www.googleapis.com/compute/v1/projects/test-project/global/networks/default",
            "selfLink": "https://www.googleapis.com/compute/v1/projects/test-project/regions/us-central1/subnetworks/default",
        }
        mock_client.get.assert_called_once()


async def test_batches_service_get_subnetwork_exception(mock_credentials):
    log = MagicMock()
    service = BatchesService(mock_credentials, log)

    mock_client = MagicMock()
    mock_client.get.side_effect = Exception("Subnetwork Not Found")

    with patch(
        "google.cloud.compute_v1.SubnetworksClient",
        return_value=mock_client,
    ):
        res = await service.get_subnetwork("non-existent-sub")
        assert "error" in res
        assert res["error"]["code"] == 500
        assert "Subnetwork Not Found" in res["error"]["message"]


async def test_batches_service_get_subnetwork_exception_with_code_value(mock_credentials):
    log = MagicMock()
    service = BatchesService(mock_credentials, log)

    err = Exception("Not Found")
    err.code = MagicMock()
    err.code.value = 404

    mock_client = MagicMock()
    mock_client.get.side_effect = err

    with patch(
        "google.cloud.compute_v1.SubnetworksClient",
        return_value=mock_client,
    ):
        res = await service.get_subnetwork("non-existent-sub")
        assert "error" in res
        assert res["error"]["code"] == 404


def test_batches_service_client_options():
    log = MagicMock()
    service_regional = BatchesService({"region_id": "us-central1"}, log)
    opts = service_regional._get_client_options()
    assert opts is not None
    assert opts.api_endpoint == "us-central1-dataproc.googleapis.com:443"

    service_global = BatchesService({"region_id": "global"}, log)
    assert service_global._get_client_options() is None


def test_batches_service_credentials():
    log = MagicMock()
    service = BatchesService({"access_token": "my-access-token"}, log)
    creds = service._get_credentials()
    assert creds is not None
    assert creds.token == "my-access-token"

    service_no_token = BatchesService({}, log)
    assert service_no_token._get_credentials() is None


async def test_batches_service_missing_config():
    log = MagicMock()
    service = BatchesService({}, log)
    res_list = await service.list_batches()
    assert res_list["error"]["code"] == 400
    assert "Project ID and Region ID must be configured." in res_list["error"]["message"]

    res_get = await service.get_batch("b1")
    assert res_get["error"]["code"] == 400
    assert "Project ID and Region ID must be configured." in res_get["error"]["message"]

    res_del = await service.delete_batch("b1")
    assert res_del["error"]["code"] == 400
    assert "Project ID and Region ID must be configured." in res_del["error"]["message"]

    res_net = await service.list_networks()
    assert res_net["error"]["code"] == 400
    assert "Project ID must be configured." in res_net["error"]["message"]

    res_subnet = await service.get_subnetwork("s1")
    assert res_subnet["error"]["code"] == 400
    assert "Project ID and Region ID must be configured." in res_subnet["error"]["message"]





