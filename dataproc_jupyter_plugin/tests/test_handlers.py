# Copyright 2023 Google LLC
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
from unittest.mock import AsyncMock, Mock, call

import pytest
from dataproc_jupyter_plugin.tests import mocks
from google.cloud import jupyter_config


async def test_get_default_settings(jp_fetch):
    response = await jp_fetch("dataproc-plugin", "settings")

    assert response.code == 200
    payload = json.loads(response.body)
    assert "enable_bigquery_integration" in payload
    assert "log_path" in payload
    assert payload["enable_bigquery_integration"] is False
    assert payload["log_path"] is ""


async def test_get_modified_settings(jp_fetch, jp_serverapp):
    jp_serverapp.config.DataprocPluginConfig.enable_bigquery_integration = True
    response = await jp_fetch("dataproc-plugin", "settings")
    assert response.code == 200
    payload = json.loads(response.body)
    assert "enable_bigquery_integration" in payload
    assert "log_path" in payload
    assert payload["enable_bigquery_integration"] is True
    assert payload["log_path"] is ""


async def test_post_config_handler_success(jp_fetch, monkeypatch):
    mock_run_gcloud = AsyncMock()
    mock_clear_cache = Mock()
    mock_configure_gateway = Mock(return_value=True)

    monkeypatch.setattr(
        "dataproc_jupyter_plugin.handlers.async_run_gcloud_subcommand", mock_run_gcloud
    )
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.handlers.clear_gcloud_cache", mock_clear_cache
    )
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.handlers.configure_gateway_client_url",
        mock_configure_gateway,
    )

    body = {"projectId": "my-project-123", "region": "us-central1"}

    response = await jp_fetch(
        "dataproc-plugin", "configuration", method="POST", body=json.dumps(body)
    )

    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"config": "Project and region update successful"}

    expected_calls = [
        call("config set project my-project-123"),
        call("config set dataproc/region us-central1"),
    ]
    assert mock_run_gcloud.call_count == 2
    mock_run_gcloud.assert_has_calls(expected_calls, any_order=False)
    assert mock_clear_cache.called
    assert mock_configure_gateway.called


@pytest.mark.parametrize(
    "project_id",
    [
        "my-project-123",  # Standard format with hyphens
        "project.123",  # With dots
        "project:123",  # With colons
    ],
)
async def test_valid_project_ids(jp_fetch, monkeypatch, project_id):
    mock_run_gcloud = AsyncMock()
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.handlers.async_run_gcloud_subcommand", mock_run_gcloud
    )

    body = {"projectId": project_id, "region": "us-central1"}

    response = await jp_fetch(
        "dataproc-plugin", "configuration", method="POST", body=json.dumps(body)
    )

    assert response.code == 200


@pytest.mark.parametrize(
    "invalid_project_id",
    [
        "Project123",  # Invalid: uppercase letters
        "project_123",  # Invalid: underscore
        "project@123",  # Invalid: @ symbol
    ],
)
async def test_invalid_project_ids(jp_fetch, monkeypatch, invalid_project_id):
    mock_run_gcloud = AsyncMock()
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.handlers.async_run_gcloud_subcommand", mock_run_gcloud
    )

    body = {"projectId": invalid_project_id, "region": "us-central1"}

    response = await jp_fetch(
        "dataproc-plugin",
        "configuration",
        method="POST",
        body=json.dumps(body),
        raise_error=False,
    )

    assert response.code == 400
    payload = json.loads(response.body)
    print("sss", payload)
    assert "Unsupported project ID:" in payload["error"]


@pytest.mark.parametrize(
    "region",
    [
        "us-central1",  # US region
        "europe-west1",  # European region
        "asia-east1",  # Asian region
    ],
)
async def test_valid_regions(jp_fetch, monkeypatch, region):
    mock_run_gcloud = AsyncMock()
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.handlers.async_run_gcloud_subcommand", mock_run_gcloud
    )

    body = {"projectId": "valid-project-123", "region": region}

    response = await jp_fetch(
        "dataproc-plugin", "configuration", method="POST", body=json.dumps(body)
    )

    assert response.code == 200


@pytest.mark.parametrize(
    "invalid_region",
    [
        "US-CENTRAL1",  # Invalid: uppercase letters
        "us_central1",  # Invalid: underscore
        "us.central1",  # Invalid: dot
        "",  # Invalid: empty string
    ],
)
async def test_invalid_regions(jp_fetch, monkeypatch, invalid_region):
    mock_run_gcloud = AsyncMock()
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.handlers.async_run_gcloud_subcommand", mock_run_gcloud
    )

    body = {"projectId": "valid-project-123", "region": invalid_region}

    response = await jp_fetch(
        "dataproc-plugin",
        "configuration",
        method="POST",
        body=json.dumps(body),
        raise_error=False,
    )

    assert response.code == 400
    payload = json.loads(response.body)
    assert "Unsupported region:" in payload["error"]


async def test_post_config_handler_gcloud_error(jp_fetch, monkeypatch):
    mock_run_gcloud = AsyncMock(
        side_effect=subprocess.CalledProcessError(1, "gcloud config set")
    )
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.handlers.async_run_gcloud_subcommand", mock_run_gcloud
    )

    body = {"projectId": "valid-project-123", "region": "us-central1"}

    response = await jp_fetch(
        "dataproc-plugin", "configuration", method="POST", body=json.dumps(body)
    )

    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"config": "Project and region update failed"}


async def test_resource_manager_handler_success(jp_fetch, monkeypatch):
    # Mock the project ID retrieval
    mock_gcp_project = AsyncMock(return_value="my-project-123")
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.handlers.credentials._gcp_project", mock_gcp_project
    )

    async def mock_create_subprocess_shell(*args, **kwargs):
        class MockProcess:
            def __init__(self):
                self.returncode = 0

            async def wait(self):
                pass

        return MockProcess()

    monkeypatch.setattr("asyncio.create_subprocess_shell", mock_create_subprocess_shell)

    # Call the handler
    response = await jp_fetch(
        "dataproc-plugin",
        "checkResourceManager",
        method="POST",
        allow_nonstandard_methods=True,
    )

    # Validate the response
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload["status"] == "OK"


async def test_resource_manager_handler_error(jp_fetch, monkeypatch):
    # Mock the project ID retrieval
    mock_gcp_project = AsyncMock(return_value="my-project-123")
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.handlers.credentials._gcp_project", mock_gcp_project
    )

    # Mock the subprocess for gcloud command execution to simulate an error
    async def mock_create_subprocess_shell(*args, **kwargs):
        class MockProcess:
            def __init__(self):
                self.returncode = 1

            async def wait(self):
                pass

        return MockProcess()

    monkeypatch.setattr("asyncio.create_subprocess_shell", mock_create_subprocess_shell)

    # Mock the error output from the subprocess
    def mock_tempfile():
        class MockTempFile:
            def __enter__(self):
                self.content = b"Simulated gcloud error"
                return self

            def __exit__(self, exc_type, exc_val, exc_tb):
                pass

            def seek(self, pos):
                pass

            def read(self):
                return self.content

        return MockTempFile()

    monkeypatch.setattr("tempfile.TemporaryFile", mock_tempfile)

    # Call the handler
    response = await jp_fetch(
        "dataproc-plugin",
        "checkResourceManager",
        method="POST",
        allow_nonstandard_methods=True,
    )

    # Validate the response
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload["status"] == "ERROR"
    assert payload["error"] == "Simulated gcloud error"
