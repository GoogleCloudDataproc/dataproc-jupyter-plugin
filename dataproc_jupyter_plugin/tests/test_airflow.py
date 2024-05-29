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
import pytest
import requests

from unittest.mock import Mock
from google.cloud import jupyter_config
from dataproc_jupyter_plugin import credentials
from dataproc_jupyter_plugin.services import airflow


async def mock_credentials():
    return {
        "project_id": "credentials-project",
        "project_number": 12345,
        "region_id": "mock-region",
        "access_token": "mock-token",
        "config_error": 0,
        "login_error": 0,
    }


def mock_get(api_endpoint, headers=None):
    response = Mock()
    response.status_code = 200
    response.json.return_value = {
        "api_endpoint": api_endpoint,
        "headers": headers,
    }
    return response


async def mock_config(field_name):
    return None


async def mock_get_airflow_uri(self, composer_name):
    return "https://mock_airflow_uri", "mock_bucket"


async def test_list_jobs(monkeypatch, jp_fetch):
    monkeypatch.setattr(credentials, "get_cached", mock_credentials)
    monkeypatch.setattr(requests, "get", mock_get)
    monkeypatch.setattr(jupyter_config, "async_get_gcloud_config", mock_config)
    monkeypatch.setattr(airflow.Client, "get_airflow_uri", mock_get_airflow_uri)
    mock_composer = "mock_url"
    response = await jp_fetch(
        "dataproc-plugin",
        "dagList",
        params={"composer": mock_composer},
    )

    assert response.code == 200
    payload = json.loads(response.body)
    print(payload)
    assert (
        payload[0]["api_endpoint"]
        == "https://mock_airflow_uri/api/v1/dags?tags=dataproc_jupyter_plugin"
    )
    assert payload[0]["headers"]["Authorization"] == f"Bearer mock-token"


async def test_list_dag_with_invalid_credentials(monkeypatch, jp_fetch):
    async def mock_credentials():
        return {}

    monkeypatch.setattr(credentials, "get_cached", mock_credentials)
    monkeypatch.setattr(requests, "get", mock_get)
    monkeypatch.setattr(jupyter_config, "async_get_gcloud_config", mock_config)
    monkeypatch.setattr(airflow.Client, "get_airflow_uri", mock_get_airflow_uri)
    response = await jp_fetch(
        "dataproc-plugin",
        "dagList",
        params={"project_id": "project_id"},
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"error": "Missing required credentials"}


@pytest.mark.parametrize("returncode, expected_result", [(0, 0)])
async def test_delete_job(monkeypatch, returncode, expected_result, jp_fetch):
    def mock_popen(returncode=0):
        def _mock_popen(*args, **kwargs):
            mock_process = Mock()
            mock_process.communicate.return_value = (b"output", b"")
            mock_process.returncode = returncode
            return mock_process

        return _mock_popen

    monkeypatch.setattr(credentials, "get_cached", mock_credentials)
    monkeypatch.setattr(requests, "get", mock_get)
    monkeypatch.setattr(jupyter_config, "async_get_gcloud_config", mock_config)
    monkeypatch.setattr(airflow.Client, "get_airflow_uri", mock_get_airflow_uri)
    monkeypatch.setattr(subprocess, "Popen", mock_popen(returncode))

    mock_composer = "mock_composer"
    mock_dag_id = "mock_dag_id"
    mock_from_page = "mock_from_page"
    response = await jp_fetch(
        "dataproc-plugin",
        "dagDelete",
        params={
            "composer": mock_composer,
            "dag_id": mock_dag_id,
            "from_page": mock_from_page,
        },
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload["status"] == 0


async def test_update_job(monkeypatch, jp_fetch):

    def mock_patch(url, json, headers):
        mock_resp = Mock()
        mock_resp.status_code = 200 if json["is_paused"] is False else 400
        return mock_resp

    async def mock_config(config_field):
        return ""

    monkeypatch.setattr(credentials, "get_cached", mock_credentials)
    monkeypatch.setattr(requests, "patch", mock_patch)
    monkeypatch.setattr(jupyter_config, "async_get_gcloud_config", mock_config)
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
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload["status"] == 0


async def test_list_dag_run(monkeypatch, jp_fetch):
    monkeypatch.setattr(credentials, "get_cached", mock_credentials)
    monkeypatch.setattr(requests, "get", mock_get)
    monkeypatch.setattr(airflow.Client, "get_airflow_uri", mock_get_airflow_uri)
    monkeypatch.setattr(jupyter_config, "async_get_gcloud_config", mock_config)

    mock_composer = "mock_url"
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
    print(payload)
    assert (
        payload["api_endpoint"]
        == f"https://mock_airflow_uri/api/v1/dags/mock_dag_id/dagRuns?execution_date_gte={mock_start_date}&execution_date_lte={mock_end_date}&offset={mock_offset}"
    )
    assert payload["headers"]["Authorization"] == f"Bearer mock-token"


async def test_list_dag_run_task_logs(monkeypatch, jp_fetch):
    def mock_get(url, headers):
        mock_resp = Mock()
        mock_resp.status_code = 200
        mock_resp.text = "mock log content"
        return mock_resp

    monkeypatch.setattr(credentials, "get_cached", mock_credentials)
    monkeypatch.setattr(requests, "get", mock_get)
    monkeypatch.setattr(airflow.Client, "get_airflow_uri", mock_get_airflow_uri)
    monkeypatch.setattr(jupyter_config, "async_get_gcloud_config", mock_config)

    mock_composer = "mock_url"
    mock_dag_id = "mock_dag_id"
    mock_dag_run_id = "mock_dag_run_id"
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
    print(response.body)
    payload = json.loads(response.body)
    print(payload)
    assert payload["content"] == "mock log content"


async def test_list_dag_run_task(monkeypatch, jp_fetch):

    monkeypatch.setattr(credentials, "get_cached", mock_credentials)
    monkeypatch.setattr(requests, "get", mock_get)
    monkeypatch.setattr(airflow.Client, "get_airflow_uri", mock_get_airflow_uri)
    monkeypatch.setattr(jupyter_config, "async_get_gcloud_config", mock_config)

    mock_composer = "mock_url"
    mock_dag_id = "mock_dag_id"
    mock_dag_run_id = "mock_dag_run_id"
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
    print(payload)
    assert (
        payload["api_endpoint"]
        == f"https://mock_airflow_uri/api/v1/dags/{mock_dag_id}/dagRuns/{mock_dag_run_id}/taskInstances"
    )
    assert payload["headers"]["Authorization"] == f"Bearer mock-token"


async def test_edit_jobs(monkeypatch, jp_fetch):
    monkeypatch.setattr(credentials, "get_cached", mock_credentials)
    monkeypatch.setattr(requests, "get", mock_get)

    mock_bucket_name = "mock_url"
    mock_dag_id = "mock_dag_id"
    response = await jp_fetch(
        "dataproc-plugin",
        "editJobScheduler",
        params={"bucket_name": mock_bucket_name, "dag_id": mock_dag_id},
    )
    assert response.code == 200


async def test_list_import_errors(monkeypatch, jp_fetch):
    monkeypatch.setattr(credentials, "get_cached", mock_credentials)
    monkeypatch.setattr(requests, "get", mock_get)
    monkeypatch.setattr(airflow.Client, "get_airflow_uri", mock_get_airflow_uri)
    monkeypatch.setattr(jupyter_config, "async_get_gcloud_config", mock_config)

    mock_composer = "mock_composer"
    response = await jp_fetch(
        "dataproc-plugin",
        "importErrorsList",
        params={"composer": mock_composer},
    )
    assert response.code == 200
    payload = json.loads(response.body)
    print(payload)
    assert (
        payload["api_endpoint"]
        == f"https://mock_airflow_uri/api/v1/importErrors?order_by=-import_error_id"
    )
    assert payload["headers"]["Authorization"] == f"Bearer mock-token"


async def test_dag_trigger(monkeypatch, jp_fetch):
    def mock_post(api_endpoint, headers=None, json=None):
        response = Mock()
        response.status_code = 200
        response.json.return_value = {
            "results": [
                {
                    "api_endpoint": api_endpoint,
                    "headers": headers,
                    "json": json,
                }
            ]
        }
        return response

    monkeypatch.setattr(credentials, "get_cached", mock_credentials)
    monkeypatch.setattr(requests, "post", mock_post)
    monkeypatch.setattr(airflow.Client, "get_airflow_uri", mock_get_airflow_uri)
    monkeypatch.setattr(jupyter_config, "async_get_gcloud_config", mock_config)

    mock_composer = "mock_url"
    mock_dag_id = "mock_dag_id"
    response = await jp_fetch(
        "dataproc-plugin",
        "triggerDag",
        params={"dag_id": mock_dag_id, "composer": mock_composer},
    )
    assert response.code == 200
    payload = json.loads(response.body)["results"][0]
    print(payload)
    assert (
        payload["api_endpoint"]
        == f"https://mock_airflow_uri/api/v1/dags/{mock_dag_id}/dagRuns"
    )
    assert payload["headers"]["Authorization"] == f"Bearer mock-token"
