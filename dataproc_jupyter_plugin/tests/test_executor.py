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
import unittest
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest
import requests
from google.cloud import jupyter_config

from dataproc_jupyter_plugin import credentials
from dataproc_jupyter_plugin.services import executor


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


class TestExecuteMethod(unittest.TestCase):
    def setUp(self):
        self.instance = executor.Client
        self.input_data = {
            "dag_id": "test_dag_id",
            "name": "test_job_name",
            "composer_environment_name": "test_env",
            "input_filename": "test_input_file",
        }

    @patch("models.DescribeJob")
    @patch("executor.Client.get_bucket", new_callable=AsyncMock)
    @patch("executor.Client.check_file_exists")
    @patch("executor.Client.upload_papermill_to_gcs")
    @patch("executor.Client.upload_input_file_to_gcs")
    @patch("executor.Client.prepare_dag")
    @patch("executor.Client.upload_dag_to_gcs")
    async def test_execute_success(
        self,
        mock_upload_dag_to_gcs,
        mock_prepare_dag,
        mock_upload_input_file_to_gcs,
        mock_upload_papermill_to_gcs,
        mock_check_file_exists,
        mock_get_bucket,
        mock_describe_job,
    ):
        mock_job = MagicMock()
        mock_job.dag_id = "test_dag_id"
        mock_job.name = "test_job_name"
        mock_job.composer_environment_name = "test_env"
        mock_job.input_filename = "test_input_file"
        mock_describe_job.return_value = mock_job

        mock_get_bucket.return_value = "test_bucket"
        mock_check_file_exists.return_value = True

        result = await self.instance.execute(self.input_data)

        self.assertEqual(result, {"status": 0})


@pytest.mark.parametrize("returncode, expected_result", [(0, 0)])
async def test_downlaod_output(monkeypatch, returncode, expected_result, jp_fetch):
    def mock_popen(returncode=0):
        def _mock_popen(*args, **kwargs):
            mock_process = Mock()
            mock_process.communicate.return_value = (b"output", b"")
            mock_process.returncode = returncode
            return mock_process

        return _mock_popen

    monkeypatch.setattr(credentials, "get_cached", mock_credentials)
    monkeypatch.setattr(jupyter_config, "async_get_gcloud_config", mock_config)
    monkeypatch.setattr(requests, "get", mock_get)
    monkeypatch.setattr(subprocess, "Popen", mock_popen(returncode))
    mock_bucket_name = "mock_bucekt"
    mock_dag_id = "mock_dag_id"
    mock_dag_run_id = "mock_dag_run_id"
    response = await jp_fetch(
        "dataproc-plugin",
        "downloadOutput",
        params={
            "bucket_name": mock_bucket_name,
            "dag_id": mock_dag_id,
            "dag_run_id": mock_dag_run_id,
        },
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload["status"] == 0
