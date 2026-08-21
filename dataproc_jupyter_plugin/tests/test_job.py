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
import pytest
import aiohttp
import asyncio
from unittest.mock import AsyncMock, patch, Mock

from dataproc_jupyter_plugin.services.jobs import JobsService
from dataproc_jupyter_plugin.commons.constants import DATAPROC_SERVICE_NAME


@pytest.fixture
def mock_credentials():
    return {
        "access_token": "test-access-token",
        "project_id": "test-project-123",
        "region_id": "us-central1",
    }


@pytest.fixture
def mock_log():
    return Mock()


@pytest.fixture
def mock_client_session():
    return AsyncMock(spec=aiohttp.ClientSession)

def test_jobs_service_init_success(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    assert service.project_id == "test-project-123"
    assert service.region_id == "us-central1"
    assert service._access_token == "test-access-token"


def test_jobs_service_init_missing_credentials_none(mock_log, mock_client_session):
    with pytest.raises(ValueError, match="Authentication credentials are missing or invalid"):
        JobsService(None, mock_log, mock_client_session)


@pytest.mark.parametrize(
    "creds, missing_field",
    [
        ({"project_id": "p", "region_id": "r"}, "access_token"),
        ({"access_token": "a", "region_id": "r"}, "project_id"),
        ({"access_token": "a", "project_id": "p"}, "region_id"),
    ],
)
def test_jobs_service_init_missing_fields(creds, missing_field, mock_log, mock_client_session):
    with pytest.raises(ValueError, match=f"Missing required credential fields: {missing_field}"):
        JobsService(creds, mock_log, mock_client_session)


def test_jobs_service_create_headers(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    headers = service.create_headers()
    assert headers["Authorization"] == "Bearer test-access-token"
    assert headers["Content-Type"] == "application/json"


@pytest.mark.asyncio
async def test_jobs_service_get_base_url_success(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    with patch("dataproc_jupyter_plugin.urls.gcp_service_url", new_callable=AsyncMock) as mock_url:
        mock_url.return_value = "https://dataproc.googleapis.com/"
        base_url = await service.get_base_url()
        assert base_url == "https://dataproc.googleapis.com/v1/projects/test-project-123/regions/us-central1/jobs"
        mock_url.assert_called_once_with(DATAPROC_SERVICE_NAME)


@pytest.mark.asyncio
async def test_jobs_service_get_base_url_error(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    with patch("dataproc_jupyter_plugin.urls.gcp_service_url", new_callable=AsyncMock) as mock_url:
        mock_url.side_effect = Exception("Resolution failed")
        with pytest.raises(RuntimeError, match="Failed to resolve Dataproc service URL"):
            await service.get_base_url()


@pytest.mark.asyncio
async def test_jobs_service_parse_response_non_json_non_200(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    mock_resp = AsyncMock()
    mock_resp.status = 502
    mock_resp.reason = "Bad Gateway"
    mock_resp.json.side_effect = aiohttp.ContentTypeError(None, None)
    mock_resp.text.return_value = "<html>Error</html>"

    result = await service._parse_response(mock_resp, "test_op")
    assert result == {"error": {"code": 502, "message": "HTTP 502 Bad Gateway: <html>Error</html>"}}


@pytest.mark.asyncio
async def test_jobs_service_parse_response_non_json_200(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    mock_resp = AsyncMock()
    mock_resp.status = 200
    mock_resp.json.side_effect = json.JSONDecodeError("msg", "doc", 0)
    mock_resp.text.return_value = "Not JSON"

    result = await service._parse_response(mock_resp, "test_op")
    assert result == {"error": {"code": 500, "message": "Failed to parse server response as JSON during test_op."}}


@pytest.mark.asyncio
async def test_jobs_service_parse_response_exception(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    mock_resp = AsyncMock()
    mock_resp.json.side_effect = Exception("Unexpected error")

    result = await service._parse_response(mock_resp, "test_op")
    assert result == {"error": {"code": 500, "message": "Response processing error during test_op: Unexpected error"}}


# =====================================================================
# Service Unit Tests: Job CRUD Operations (get, update, delete, cancel)
# =====================================================================

@pytest.mark.asyncio
async def test_jobs_service_get_job_empty_id(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    result = await service.get_job("")
    assert result == {"error": {"code": 400, "message": "Job ID must not be empty."}}


@pytest.mark.asyncio
async def test_jobs_service_get_job_success(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    mock_resp = AsyncMock()
    mock_resp.status = 200
    mock_resp.json.return_value = {"reference": {"jobId": "job-123"}, "status": {"state": "RUNNING"}}

    mock_get_ctx = AsyncMock()
    mock_get_ctx.__aenter__.return_value = mock_resp
    mock_client_session.get.return_value = mock_get_ctx

    with patch.object(service, "get_base_url", new_callable=AsyncMock) as mock_base_url:
        mock_base_url.return_value = "https://dataproc.googleapis.com/v1/jobs"
        result = await service.get_job("job-123")
        assert result["reference"]["jobId"] == "job-123"
        mock_client_session.get.assert_called_once_with(
            "https://dataproc.googleapis.com/v1/jobs/job-123",
            headers=service.create_headers(),
        )


@pytest.mark.asyncio
async def test_jobs_service_get_job_client_error(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    mock_client_session.get.side_effect = aiohttp.ClientError("Host unreachable")

    with patch.object(service, "get_base_url", new_callable=AsyncMock) as mock_base_url:
        mock_base_url.return_value = "https://dataproc.googleapis.com/v1/jobs"
        result = await service.get_job("job-123")
        assert result == {"error": {"code": 503, "message": "Network error connecting to Dataproc API: Host unreachable"}}


@pytest.mark.asyncio
async def test_jobs_service_get_job_timeout(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    mock_client_session.get.side_effect = asyncio.TimeoutError()

    with patch.object(service, "get_base_url", new_callable=AsyncMock) as mock_base_url:
        mock_base_url.return_value = "https://dataproc.googleapis.com/v1/jobs"
        result = await service.get_job("job-123")
        assert result == {"error": {"code": 504, "message": "Request to fetch job job-123 timed out."}}


@pytest.mark.asyncio
async def test_jobs_service_get_job_unexpected_error(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    mock_client_session.get.side_effect = Exception("Crash")

    with patch.object(service, "get_base_url", new_callable=AsyncMock) as mock_base_url:
        mock_base_url.return_value = "https://dataproc.googleapis.com/v1/jobs"
        result = await service.get_job("job-123")
        assert result == {"error": {"code": 500, "message": "Unexpected error fetching job details: Crash"}}


@pytest.mark.asyncio
async def test_jobs_service_update_job_empty_id(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    result = await service.update_job("", {"job": {}})
    assert result == {"error": {"code": 400, "message": "Job ID must not be empty."}}


@pytest.mark.asyncio
async def test_jobs_service_update_job_invalid_payload(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    result = await service.update_job("job-1", None)
    assert result == {"error": {"code": 400, "message": "Invalid or missing job payload."}}


@pytest.mark.asyncio
async def test_jobs_service_update_job_success(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    mock_resp = AsyncMock()
    mock_resp.status = 200
    mock_resp.json.return_value = {"reference": {"jobId": "job-1"}, "labels": {"key": "val"}}

    mock_patch_ctx = AsyncMock()
    mock_patch_ctx.__aenter__.return_value = mock_resp
    mock_client_session.patch.return_value = mock_patch_ctx

    payload = {"labels": {"key": "val"}}

    with patch.object(service, "get_base_url", new_callable=AsyncMock) as mock_base_url:
        mock_base_url.return_value = "https://dataproc.googleapis.com/v1/jobs"
        result = await service.update_job("job-1", payload, update_mask="labels")
        assert result["labels"] == {"key": "val"}
        mock_client_session.patch.assert_called_once_with(
            "https://dataproc.googleapis.com/v1/jobs/job-1?updateMask=labels",
            headers=service.create_headers(),
            data=json.dumps(payload),
        )


@pytest.mark.asyncio
async def test_jobs_service_update_job_client_error(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    mock_client_session.patch.side_effect = aiohttp.ClientError("Patch fail")

    with patch.object(service, "get_base_url", new_callable=AsyncMock) as mock_base_url:
        mock_base_url.return_value = "https://dataproc.googleapis.com/v1/jobs"
        result = await service.update_job("job-1", {"job": {}})
        assert result == {"error": {"code": 503, "message": "Network error updating job: Patch fail"}}


@pytest.mark.asyncio
async def test_jobs_service_update_job_timeout(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    mock_client_session.patch.side_effect = asyncio.TimeoutError()

    with patch.object(service, "get_base_url", new_callable=AsyncMock) as mock_base_url:
        mock_base_url.return_value = "https://dataproc.googleapis.com/v1/jobs"
        result = await service.update_job("job-1", {"job": {}})
        assert result == {"error": {"code": 504, "message": "Request to update job job-1 timed out."}}


@pytest.mark.asyncio
async def test_jobs_service_update_job_unexpected_error(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    mock_client_session.patch.side_effect = Exception("Update error")

    with patch.object(service, "get_base_url", new_callable=AsyncMock) as mock_base_url:
        mock_base_url.return_value = "https://dataproc.googleapis.com/v1/jobs"
        result = await service.update_job("job-1", {"job": {}})
        assert result == {"error": {"code": 500, "message": "Unexpected error updating job: Update error"}}


@pytest.mark.asyncio
async def test_jobs_service_delete_job_empty_id(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    result = await service.delete_job("")
    assert result == {"error": {"code": 400, "message": "Job ID must not be empty."}}


@pytest.mark.asyncio
async def test_jobs_service_delete_job_success(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    mock_resp = AsyncMock()
    mock_resp.status = 200
    mock_resp.json.return_value = {}

    mock_delete_ctx = AsyncMock()
    mock_delete_ctx.__aenter__.return_value = mock_resp
    mock_client_session.delete.return_value = mock_delete_ctx

    with patch.object(service, "get_base_url", new_callable=AsyncMock) as mock_base_url:
        mock_base_url.return_value = "https://dataproc.googleapis.com/v1/jobs"
        result = await service.delete_job("job-123")
        assert result == {}
        mock_client_session.delete.assert_called_once_with(
            "https://dataproc.googleapis.com/v1/jobs/job-123",
            headers=service.create_headers(),
        )


@pytest.mark.asyncio
async def test_jobs_service_delete_job_client_error(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    mock_client_session.delete.side_effect = aiohttp.ClientError("Delete error")

    with patch.object(service, "get_base_url", new_callable=AsyncMock) as mock_base_url:
        mock_base_url.return_value = "https://dataproc.googleapis.com/v1/jobs"
        result = await service.delete_job("job-123")
        assert result == {"error": {"code": 503, "message": "Network error deleting job: Delete error"}}


@pytest.mark.asyncio
async def test_jobs_service_delete_job_timeout(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    mock_client_session.delete.side_effect = asyncio.TimeoutError()

    with patch.object(service, "get_base_url", new_callable=AsyncMock) as mock_base_url:
        mock_base_url.return_value = "https://dataproc.googleapis.com/v1/jobs"
        result = await service.delete_job("job-123")
        assert result == {"error": {"code": 504, "message": "Request to delete job job-123 timed out."}}


@pytest.mark.asyncio
async def test_jobs_service_delete_job_unexpected_error(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    mock_client_session.delete.side_effect = Exception("Delete fail")

    with patch.object(service, "get_base_url", new_callable=AsyncMock) as mock_base_url:
        mock_base_url.return_value = "https://dataproc.googleapis.com/v1/jobs"
        result = await service.delete_job("job-123")
        assert result == {"error": {"code": 500, "message": "Unexpected error deleting job: Delete fail"}}


@pytest.mark.asyncio
async def test_jobs_service_cancel_job_empty_id(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    result = await service.cancel_job("")
    assert result == {"error": {"code": 400, "message": "Job ID must not be empty."}}


@pytest.mark.asyncio
async def test_jobs_service_cancel_job_success(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    mock_resp = AsyncMock()
    mock_resp.status = 200
    mock_resp.json.return_value = {"status": {"state": "CANCELLED"}}

    mock_post_ctx = AsyncMock()
    mock_post_ctx.__aenter__.return_value = mock_resp
    mock_client_session.post.return_value = mock_post_ctx

    with patch.object(service, "get_base_url", new_callable=AsyncMock) as mock_base_url:
        mock_base_url.return_value = "https://dataproc.googleapis.com/v1/jobs"
        result = await service.cancel_job("job-123")
        assert result == {"status": {"state": "CANCELLED"}}
        mock_client_session.post.assert_called_once_with(
            "https://dataproc.googleapis.com/v1/jobs/job-123:cancel",
            headers=service.create_headers(),
        )


@pytest.mark.asyncio
async def test_jobs_service_cancel_job_client_error(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    mock_client_session.post.side_effect = aiohttp.ClientError("Cancel error")

    with patch.object(service, "get_base_url", new_callable=AsyncMock) as mock_base_url:
        mock_base_url.return_value = "https://dataproc.googleapis.com/v1/jobs"
        result = await service.cancel_job("job-123")
        assert result == {"error": {"code": 503, "message": "Network error canceling job: Cancel error"}}


@pytest.mark.asyncio
async def test_jobs_service_cancel_job_timeout(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    mock_client_session.post.side_effect = asyncio.TimeoutError()

    with patch.object(service, "get_base_url", new_callable=AsyncMock) as mock_base_url:
        mock_base_url.return_value = "https://dataproc.googleapis.com/v1/jobs"
        result = await service.cancel_job("job-123")
        assert result == {"error": {"code": 504, "message": "Request to cancel job job-123 timed out."}}


@pytest.mark.asyncio
async def test_jobs_service_cancel_job_unexpected_error(mock_credentials, mock_log, mock_client_session):
    service = JobsService(mock_credentials, mock_log, mock_client_session)
    mock_client_session.post.side_effect = Exception("Cancel fail")

    with patch.object(service, "get_base_url", new_callable=AsyncMock) as mock_base_url:
        mock_base_url.return_value = "https://dataproc.googleapis.com/v1/jobs"
        result = await service.cancel_job("job-123")
        assert result == {"error": {"code": 500, "message": "Unexpected error canceling job: Cancel fail"}}


# =====================================================================
# Controller Integration Tests: JobItemController & JobCancelController
# =====================================================================

async def test_job_item_controller_get_missing_job_id(jp_fetch):
    response = await jp_fetch("dataproc-plugin", "jobItem", method="GET")
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"error": {"code": 400, "message": "Missing required parameter: jobId"}}


async def test_job_item_controller_get_success(jp_fetch, monkeypatch):
    mock_creds = AsyncMock(return_value={"access_token": "token", "project_id": "p", "region_id": "r"})
    mock_get_job = AsyncMock(return_value={"reference": {"jobId": "job-item-1"}})

    monkeypatch.setattr("dataproc_jupyter_plugin.controllers.jobs.credentials.get_cached", mock_creds)
    monkeypatch.setattr("dataproc_jupyter_plugin.services.jobs.JobsService.get_job", mock_get_job)

    response = await jp_fetch("dataproc-plugin", "jobItem", method="GET", params={"jobId": "job-item-1"})
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"reference": {"jobId": "job-item-1"}}


async def test_job_item_controller_get_value_error(jp_fetch, monkeypatch):
    mock_creds = AsyncMock(side_effect=ValueError("No creds"))
    monkeypatch.setattr("dataproc_jupyter_plugin.controllers.jobs.credentials.get_cached", mock_creds)

    response = await jp_fetch("dataproc-plugin", "jobItem", method="GET", params={"jobId": "job-item-1"})
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"error": {"code": 400, "message": "No creds"}}


async def test_job_item_controller_get_server_error(jp_fetch, monkeypatch):
    mock_creds = AsyncMock(side_effect=Exception("GCP down"))
    monkeypatch.setattr("dataproc_jupyter_plugin.controllers.jobs.credentials.get_cached", mock_creds)

    response = await jp_fetch("dataproc-plugin", "jobItem", method="GET", params={"jobId": "job-item-1"})
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"error": {"code": 500, "message": "Server error: GCP down"}}


async def test_job_item_controller_patch_missing_job_id(jp_fetch):
    response = await jp_fetch("dataproc-plugin", "jobItem", method="PATCH", body=json.dumps({"labels": {}}))
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"error": {"code": 400, "message": "Missing required parameter: jobId"}}


async def test_job_item_controller_patch_invalid_json(jp_fetch):
    response = await jp_fetch("dataproc-plugin", "jobItem", method="PATCH", params={"jobId": "j1"}, body="Bad Json")
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"error": {"code": 400, "message": "Invalid JSON request body."}}


async def test_job_item_controller_patch_empty_payload(jp_fetch):
    response = await jp_fetch("dataproc-plugin", "jobItem", method="PATCH", params={"jobId": "j1"}, body=json.dumps({}))
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"error": {"code": 400, "message": "Missing or empty update payload."}}


async def test_job_item_controller_patch_success(jp_fetch, monkeypatch):
    mock_creds = AsyncMock(return_value={"access_token": "token", "project_id": "p", "region_id": "r"})
    mock_update_job = AsyncMock(return_value={"reference": {"jobId": "job-item-1"}, "labels": {"env": "prod"}})

    monkeypatch.setattr("dataproc_jupyter_plugin.controllers.jobs.credentials.get_cached", mock_creds)
    monkeypatch.setattr("dataproc_jupyter_plugin.services.jobs.JobsService.update_job", mock_update_job)

    body = json.dumps({"labels": {"env": "prod"}})
    response = await jp_fetch("dataproc-plugin", "jobItem", method="PATCH", params={"jobId": "job-item-1"}, body=body)
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload["labels"] == {"env": "prod"}


async def test_job_item_controller_patch_value_error(jp_fetch, monkeypatch):
    mock_creds = AsyncMock(side_effect=ValueError("Invalid auth"))
    monkeypatch.setattr("dataproc_jupyter_plugin.controllers.jobs.credentials.get_cached", mock_creds)

    body = json.dumps({"labels": {"env": "prod"}})
    response = await jp_fetch("dataproc-plugin", "jobItem", method="PATCH", params={"jobId": "job-item-1"}, body=body)
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"error": {"code": 400, "message": "Invalid auth"}}


async def test_job_item_controller_patch_server_error(jp_fetch, monkeypatch):
    mock_creds = AsyncMock(side_effect=Exception("Internal error"))
    monkeypatch.setattr("dataproc_jupyter_plugin.controllers.jobs.credentials.get_cached", mock_creds)

    body = json.dumps({"labels": {"env": "prod"}})
    response = await jp_fetch("dataproc-plugin", "jobItem", method="PATCH", params={"jobId": "job-item-1"}, body=body)
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"error": {"code": 500, "message": "Server error: Internal error"}}


async def test_job_item_controller_delete_missing_job_id(jp_fetch):
    response = await jp_fetch("dataproc-plugin", "jobItem", method="DELETE")
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"error": {"code": 400, "message": "Missing required parameter: jobId"}}


async def test_job_item_controller_delete_success(jp_fetch, monkeypatch):
    mock_creds = AsyncMock(return_value={"access_token": "token", "project_id": "p", "region_id": "r"})
    mock_delete_job = AsyncMock(return_value={})

    monkeypatch.setattr("dataproc_jupyter_plugin.controllers.jobs.credentials.get_cached", mock_creds)
    monkeypatch.setattr("dataproc_jupyter_plugin.services.jobs.JobsService.delete_job", mock_delete_job)

    response = await jp_fetch("dataproc-plugin", "jobItem", method="DELETE", params={"jobId": "job-item-1"})
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {}


async def test_job_item_controller_delete_value_error(jp_fetch, monkeypatch):
    mock_creds = AsyncMock(side_effect=ValueError("Creds error"))
    monkeypatch.setattr("dataproc_jupyter_plugin.controllers.jobs.credentials.get_cached", mock_creds)

    response = await jp_fetch("dataproc-plugin", "jobItem", method="DELETE", params={"jobId": "job-item-1"})
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"error": {"code": 400, "message": "Creds error"}}


async def test_job_item_controller_delete_server_error(jp_fetch, monkeypatch):
    mock_creds = AsyncMock(side_effect=Exception("Delete failure"))
    monkeypatch.setattr("dataproc_jupyter_plugin.controllers.jobs.credentials.get_cached", mock_creds)

    response = await jp_fetch("dataproc-plugin", "jobItem", method="DELETE", params={"jobId": "job-item-1"})
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"error": {"code": 500, "message": "Server error: Delete failure"}}


async def test_job_cancel_controller_post_missing_job_id(jp_fetch):
    response = await jp_fetch("dataproc-plugin", "jobCancel", method="POST", body="")
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"error": {"code": 400, "message": "Missing required parameter: jobId"}}


async def test_job_cancel_controller_post_success(jp_fetch, monkeypatch):
    mock_creds = AsyncMock(return_value={"access_token": "token", "project_id": "p", "region_id": "r"})
    mock_cancel_job = AsyncMock(return_value={"status": {"state": "CANCELLED"}})

    monkeypatch.setattr("dataproc_jupyter_plugin.controllers.jobs.credentials.get_cached", mock_creds)
    monkeypatch.setattr("dataproc_jupyter_plugin.services.jobs.JobsService.cancel_job", mock_cancel_job)

    response = await jp_fetch("dataproc-plugin", "jobCancel", method="POST", params={"jobId": "job-1"}, body="")
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"status": {"state": "CANCELLED"}}


async def test_job_cancel_controller_post_value_error(jp_fetch, monkeypatch):
    mock_creds = AsyncMock(side_effect=ValueError("Auth failed"))
    monkeypatch.setattr("dataproc_jupyter_plugin.controllers.jobs.credentials.get_cached", mock_creds)

    response = await jp_fetch("dataproc-plugin", "jobCancel", method="POST", params={"jobId": "job-1"}, body="")
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"error": {"code": 400, "message": "Auth failed"}}


async def test_job_cancel_controller_post_server_error(jp_fetch, monkeypatch):
    mock_creds = AsyncMock(side_effect=Exception("Cancel internal error"))
    monkeypatch.setattr("dataproc_jupyter_plugin.controllers.jobs.credentials.get_cached", mock_creds)

    response = await jp_fetch("dataproc-plugin", "jobCancel", method="POST", params={"jobId": "job-1"}, body="")
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"error": {"code": 500, "message": "Server error: Cancel internal error"}}