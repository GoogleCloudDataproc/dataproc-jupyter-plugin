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
import subprocess
from unittest.mock import AsyncMock, MagicMock

import aiohttp

from dataproc_jupyter_plugin.tests import mocks

import pytest
from google.cloud import jupyter_config

from dataproc_jupyter_plugin import credentials
from dataproc_jupyter_plugin.services import airflow


async def mock_get_airflow_uri(self, composer_name):
    return "https://mock_airflow_uri", "mock_bucket"


async def test_list_jobs(monkeypatch, jp_fetch):
    mocks.patch_mocks(monkeypatch)

    monkeypatch.setattr(airflow.Client, "get_airflow_uri", mock_get_airflow_uri)
    mock_composer = "mock-url"
    response = await jp_fetch(
        "dataproc-plugin",
        "dagList",
        params={"composer": mock_composer},
    )

    assert response.code == 200
    payload = json.loads(response.body)
    assert (
        payload[0]["api_endpoint"]
        == "https://mock_airflow_uri/api/v1/dags?tags=dataproc_jupyter_plugin"
    )
    assert payload[0]["headers"]["Authorization"] == f"Bearer mock-token"


async def test_list_dag_with_missing_argument(monkeypatch, jp_fetch):
    mocks.patch_mocks(monkeypatch)
    monkeypatch.setattr(airflow.Client, "get_airflow_uri", mock_get_airflow_uri)
    response = await jp_fetch(
        "dataproc-plugin",
        "dagList",
        params={"project_id": "project_id"},
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"error": "HTTP 400: Bad Request (Missing argument composer)"}


async def test_list_dag_with_invalid_credentials(monkeypatch, jp_fetch):
    async def mock_credentials():
        return {}

    mocks.patch_mocks(monkeypatch)
    monkeypatch.setattr(credentials, "get_cached", mock_credentials)
    monkeypatch.setattr(airflow.Client, "get_airflow_uri", mock_get_airflow_uri)
    mock_composer = "mock-url"
    response = await jp_fetch(
        "dataproc-plugin",
        "dagList",
        params={"project_id": "project_id", "composer": mock_composer},
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"error": "Missing required credentials"}

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "from_page, expected_status", [(None, 0), ("some_page", 0)]
    )
    async def test_delete_job(monkeypatch, from_page, expected_status, jp_fetch):
        monkeypatch.setattr(airflow.Client, "get_airflow_uri", mock_get_airflow_uri)
        mock_delete = AsyncMock()
        mock_delete.return_value.__aenter__.return_value.status = 200
        mock_client_session = MagicMock()
        mock_client_session.delete = mock_delete
        monkeypatch.setattr(
            "dagDelete.aiohttp.ClientSession", lambda: mock_client_session
        )
        mock_bucket = MagicMock()
        mock_blob = MagicMock()
        mock_bucket.blob.return_value = mock_blob
        mock_storage_client = MagicMock()
        mock_storage_client.bucket.return_value = mock_bucket
        monkeypatch.setattr("dagDelete.storage.Client", lambda: mock_storage_client)
        response = await jp_fetch(
            "dataproc-plugin",
            "dagDelete",
            method="DELETE",
            params={
                "composer": "mock-composer",
                "dag_id": "mock_dag_id",
                "from_page": from_page,
            },
        )
        assert response.code == 200
        payload = json.loads(response.body)
        assert payload["status"] == expected_status


class MockClientSession:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *args, **kwargs):
        return

    def patch(self, api_endpoint, json, headers=None):
        if json["is_paused"] is False:
            return mocks.MockResponse({})
        return mocks.MockResponse({}, status=400)

    def get(self, api_endpoint, headers=None):
        return mocks.MockResponse(None, text="mock log content")

    def delete(self, api_endpoint, headers=None):
        return mocks.MockResponse({})


async def test_update_job(monkeypatch, jp_fetch):
    async def mock_config(config_field):
        return ""

    mocks.patch_mocks(monkeypatch)
    monkeypatch.setattr(jupyter_config, "async_get_gcloud_config", mock_config)
    monkeypatch.setattr(aiohttp, "ClientSession", MockClientSession)
    monkeypatch.setattr(airflow.Client, "get_airflow_uri", mock_get_airflow_uri)
    mock_composer = "composer"
    mock_dag_id = "mock_dag_id"
    mock_status = "true"
    response = await jp_fetch(
        "dataproc-plugin",
        "dagUpdate",
        params={
            "composer": mock_composer,
            "dag_id": mock_dag_id,
            "status": mock_status,
        },
        method="POST",
        allow_nonstandard_methods=True,
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload["status"] == 0


async def test_list_dag_run(monkeypatch, jp_fetch):
    mocks.patch_mocks(monkeypatch)
    monkeypatch.setattr(airflow.Client, "get_airflow_uri", mock_get_airflow_uri)

    mock_composer = "mock-url"
    mock_dag_id = "mock_dag_id"
    mock_start_date = "mock_start_date"
    mock_offset = "mock_offset"
    mock_end_date = "mock_end_date"
    response = await jp_fetch(
        "dataproc-plugin",
        "dagRun",
        params={
            "composer": mock_composer,
            "dag_id": mock_dag_id,
            "start_date": mock_start_date,
            "offset": mock_offset,
            "end_date": mock_end_date,
        },
    )
    assert response.code == 200
    payload = json.loads(response.body)

    assert (
        payload["api_endpoint"]
        == f"https://mock_airflow_uri/api/v1/dags/mock_dag_id/dagRuns?execution_date_gte={mock_start_date}&execution_date_lte={mock_end_date}&offset={mock_offset}"
    )
    assert payload["headers"]["Authorization"] == f"Bearer mock-token"


async def test_list_dag_run_task_logs(monkeypatch, jp_fetch):
    mocks.patch_mocks(monkeypatch)
    monkeypatch.setattr(aiohttp, "ClientSession", MockClientSession)
    monkeypatch.setattr(airflow.Client, "get_airflow_uri", mock_get_airflow_uri)

    mock_composer = "mock-url"
    mock_dag_id = "mock_dag_id"
    mock_dag_run_id = "256"
    mock_task_id = "mock_task_id"
    mock_task_try = "mock_task_try"
    response = await jp_fetch(
        "dataproc-plugin",
        "dagRunTaskLogs",
        params={
            "composer": mock_composer,
            "dag_id": mock_dag_id,
            "dag_run_id": mock_dag_run_id,
            "task_id": mock_task_id,
            "task_try_number": mock_task_try,
        },
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload["content"] == "mock log content"


async def test_list_dag_run_task(monkeypatch, jp_fetch):
    mocks.patch_mocks(monkeypatch)
    monkeypatch.setattr(airflow.Client, "get_airflow_uri", mock_get_airflow_uri)

    mock_composer = "mock-url"
    mock_dag_id = "mock_dag_id"
    mock_dag_run_id = "257"
    response = await jp_fetch(
        "dataproc-plugin",
        "dagRunTask",
        params={
            "composer": mock_composer,
            "dag_id": mock_dag_id,
            "dag_run_id": mock_dag_run_id,
        },
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert (
        payload["api_endpoint"]
        == f"https://mock_airflow_uri/api/v1/dags/{mock_dag_id}/dagRuns/{mock_dag_run_id}/taskInstances"
    )
    assert payload["headers"]["Authorization"] == f"Bearer mock-token"


async def test_edit_jobs(monkeypatch, jp_fetch):
    mocks.patch_mocks(monkeypatch)

    mock_bucket_name = "mock-url"
    mock_dag_id = "mock_dag_id"
    response = await jp_fetch(
        "dataproc-plugin",
        "editJobScheduler",
        params={"bucket_name": mock_bucket_name, "dag_id": mock_dag_id},
    )
    assert response.code == 200


async def test_list_import_errors(monkeypatch, jp_fetch):
    mocks.patch_mocks(monkeypatch)
    monkeypatch.setattr(airflow.Client, "get_airflow_uri", mock_get_airflow_uri)

    mock_composer = "mock-composer"
    response = await jp_fetch(
        "dataproc-plugin",
        "importErrorsList",
        params={"composer": mock_composer},
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert (
        payload["api_endpoint"]
        == f"https://mock_airflow_uri/api/v1/importErrors?order_by=-import_error_id"
    )
    assert payload["headers"]["Authorization"] == f"Bearer mock-token"


async def test_dag_trigger(monkeypatch, jp_fetch):
    mocks.patch_mocks(monkeypatch)
    monkeypatch.setattr(airflow.Client, "get_airflow_uri", mock_get_airflow_uri)

    mock_composer = "mock-url"
    mock_dag_id = "mock_dag_id"
    response = await jp_fetch(
        "dataproc-plugin",
        "triggerDag",
        params={"dag_id": mock_dag_id, "composer": mock_composer},
        method="POST",
        allow_nonstandard_methods=True,
    )
    assert response.code == 200
    payload = json.loads(response.body)["results"][0]
    assert (
        payload["api_endpoint"]
        == f"https://mock_airflow_uri/api/v1/dags/{mock_dag_id}/dagRuns"
    )
    assert payload["headers"]["Authorization"] == f"Bearer mock-token"


async def test_invalid_composer(monkeypatch, jp_fetch):
    mocks.patch_mocks(monkeypatch)
    monkeypatch.setattr(airflow.Client, "get_airflow_uri", mock_get_airflow_uri)

    mock_composer = "mock/url"
    mock_dag_id = "mock_dag_id"
    mock_dag_run_id = 22
    response = await jp_fetch(
        "dataproc-plugin",
        "dagRunTask",
        params={
            "dag_id": mock_dag_id,
            "composer": mock_composer,
            "dag_run_id": mock_dag_run_id,
        },
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert "results" not in payload
    assert "error" in payload
    assert "Invalid Composer environment name" in payload["error"]


async def test_invalid_dag_id(monkeypatch, jp_fetch):
    mocks.patch_mocks(monkeypatch)
    monkeypatch.setattr(airflow.Client, "get_airflow_uri", mock_get_airflow_uri)

    mock_composer = "mock-url"
    mock_dag_id = "mock/dag/id"
    mock_dag_run_id = 22
    response = await jp_fetch(
        "dataproc-plugin",
        "dagRunTask",
        params={
            "dag_id": mock_dag_id,
            "composer": mock_composer,
            "dag_run_id": mock_dag_run_id,
        },
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert "results" not in payload
    assert "error" in payload
    assert "Invalid DAG ID" in payload["error"]
