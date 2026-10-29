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
from unittest.mock import ANY, AsyncMock, Mock, call

import pytest
from dataproc_jupyter_plugin.services import biglake
from dataproc_jupyter_plugin.tests import mocks
from google.cloud import jupyter_config
from tornado.simple_httpclient import HTTPTimeoutError


async def test_get_default_settings(jp_fetch):
    response = await jp_fetch("dataproc-plugin", "settings")

    assert response.code == 200
    payload = json.loads(response.body)
    assert "enable_bigquery_integration" in payload
    assert "enable_runtime_profile_integration" in payload
    assert "log_path" in payload
    assert payload["enable_bigquery_integration"] is False
    assert payload["enable_runtime_profile_integration"] is False
    assert payload["log_path"] == ""


async def test_get_modified_settings(jp_fetch, jp_serverapp):
    jp_serverapp.config.DataprocPluginConfig.enable_bigquery_integration = True
    jp_serverapp.config.DataprocPluginConfig.enable_runtime_profile_integration = True
    response = await jp_fetch("dataproc-plugin", "settings")
    assert response.code == 200
    payload = json.loads(response.body)
    assert "enable_bigquery_integration" in payload
    assert "enable_runtime_profile_integration" in payload
    assert "log_path" in payload
    assert payload["enable_bigquery_integration"] is True
    assert payload["enable_runtime_profile_integration"] is True
    assert payload["log_path"] == ""


async def test_get_default_config(jp_serverapp):
    server_config = jp_serverapp.config
    assert server_config.DataprocPluginConfig.kernel_gateway_project_number == ""
    assert server_config.GatewayClient.gateway_retry_interval == 20
    assert server_config.GatewayClient.gateway_retry_max == 45
    assert server_config.GatewayClient.request_timeout == 600
    assert server_config.GatewayClient.connect_timeout == 300

@pytest.mark.parametrize(
    "config_project_number,expected_calls",
    [
        (
            "",
            [
                call("config set project my-project-123"),
                call("config set dataproc/region us-central1")
            ],
        ),
        (
            "12345",
            [
                call("config set dataproc/region us-central1")
            ],
        )
    ],
)
async def test_post_config_handler_success(jp_fetch, monkeypatch, jp_serverapp, config_project_number, expected_calls):
    jp_serverapp.config.DataprocPluginConfig.kernel_gateway_project_number = config_project_number

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

    assert mock_run_gcloud.call_count == len(expected_calls)
    mock_run_gcloud.assert_has_calls(expected_calls, any_order=False)
    assert mock_clear_cache.called
    assert mock_configure_gateway.called
    mock_configure_gateway.assert_called_with(ANY, ANY, config_project_number)

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

    # Mock the gcloud command execution
    mock_run_gcloud = AsyncMock(return_value="123456789")
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.handlers.async_run_gcloud_subcommand", mock_run_gcloud
    )

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

    # Verify the correct gcloud command was called
    mock_run_gcloud.assert_called_once_with(
        'projects describe my-project-123 --format="value(projectNumber)"'
    )


async def test_resource_manager_handler_error(jp_fetch, monkeypatch):
    # Mock the project ID retrieval
    mock_gcp_project = AsyncMock(return_value="my-project-123")
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.handlers.credentials._gcp_project", mock_gcp_project
    )

    # Mock a failure in the gcloud command execution
    mock_run_gcloud = AsyncMock(
        side_effect=subprocess.CalledProcessError(
            1, "gcloud projects describe", stderr="Simulated gcloud error"
        )
    )
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.handlers.async_run_gcloud_subcommand", mock_run_gcloud
    )

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


@pytest.mark.parametrize(
    "endpoint,path,catalogs_key",
    [
        ("hive", "hive/v1/projects/google.com%3Amy-project/catalogs", "catalogs"),
        (
            "iceberg",
            "iceberg/v1/restcatalog/extensions/projects/google.com%3Amy-project/catalogs",
            "iceberg-catalogs",
        ),
    ],
)
async def test_biglake_catalogs_handler(
    jp_fetch, monkeypatch, endpoint, path, catalogs_key
):
    mocks.patch_mocks(monkeypatch)
    catalogs = [{"name": "projects/google.com:my-project/catalogs/one"}]
    client = mocks.patch_biglake_client(monkeypatch, ({catalogs_key: catalogs}, 200))
    params = {"endpoint": endpoint, "project_id": "google.com:my-project"}

    response = await jp_fetch("dataproc-plugin", "biglakeCatalogs", params=params)

    assert response.code == 200
    assert response.headers["Content-Type"].startswith("application/json")
    assert json.loads(response.body) == {catalogs_key: catalogs}
    [request] = client.requests
    assert request["url"] == f"https://biglake.googleapis.com/{path}"
    assert request["headers"]["Authorization"] == "Bearer mock-token"
    # Bounded, so a silently dropped connection fails fast.
    assert request["connect_timeout"] == biglake.CONNECT_TIMEOUT_SECONDS
    assert request["request_timeout"] == biglake.REQUEST_TIMEOUT_SECONDS


@pytest.mark.parametrize(
    "endpoint,catalogs_key,next_page_token,page_token",
    [
        ("hive", "catalogs", "nextPageToken", "pageToken"),
        ("iceberg", "iceberg-catalogs", "next-page-token", "page-token"),
    ],
)
async def test_biglake_catalogs_handler_lists_all_pages(
    jp_fetch, monkeypatch, endpoint, catalogs_key, next_page_token, page_token
):
    mocks.patch_mocks(monkeypatch)
    one = {"name": "projects/my-project/catalogs/one"}
    two = {"name": "projects/my-project/catalogs/two"}
    client = mocks.patch_biglake_client(
        monkeypatch,
        ({catalogs_key: [one], next_page_token: "page-2"}, 200),
        ({catalogs_key: [two]}, 200),
    )
    params = {"endpoint": endpoint, "project_id": "my-project"}

    response = await jp_fetch("dataproc-plugin", "biglakeCatalogs", params=params)

    assert json.loads(response.body) == {catalogs_key: [one, two]}
    # The endpoints name their page token parameter differently.
    assert client.requests[1]["url"].endswith(f"/catalogs?{page_token}=page-2")


async def test_biglake_catalogs_handler_stops_after_max_pages(jp_fetch, monkeypatch):
    mocks.patch_mocks(monkeypatch)
    monkeypatch.setattr(biglake, "MAX_PAGES", 2)
    page = ({"catalogs": [{"name": "c"}], "nextPageToken": "next"}, 200)
    client = mocks.patch_biglake_client(monkeypatch, page, page, page)
    params = {"endpoint": "hive", "project_id": "my-project"}

    response = await jp_fetch("dataproc-plugin", "biglakeCatalogs", params=params)

    assert len(client.requests) == 2
    assert json.loads(response.body) == {"catalogs": [{"name": "c"}, {"name": "c"}]}


@pytest.mark.parametrize(
    "earlier_pages",
    [
        pytest.param([], id="first-page-fails"),
        pytest.param(
            [({"catalogs": [{"name": "c"}], "nextPageToken": "page-2"}, 200)],
            id="later-page-fails",
        ),
    ],
)
async def test_biglake_catalogs_handler_returns_biglake_errors(
    jp_fetch, monkeypatch, earlier_pages
):
    mocks.patch_mocks(monkeypatch)
    error = {
        "error": {
            "code": 403,
            "message": "Permission denied on project my-project.",
            "status": "PERMISSION_DENIED",
        }
    }
    mocks.patch_biglake_client(monkeypatch, *earlier_pages, (error, 403))
    params = {"endpoint": "hive", "project_id": "my-project"}

    response = await jp_fetch(
        "dataproc-plugin", "biglakeCatalogs", params=params, raise_error=False
    )

    # BigLake's own status and message reach the UI, not a generic failure.
    assert response.code == 403
    assert json.loads(response.body) == error


@pytest.mark.parametrize(
    "body,code,expected_code",
    [
        (b"<html>Gateway Timeout</html>", 504, 504),  # A proxy's error page
        (b"<html>OK</html>", 200, 502),  # Not JSON
        ([], 200, 502),  # JSON, but not an object
    ],
)
async def test_biglake_catalogs_handler_rejects_unexpected_responses(
    jp_fetch, monkeypatch, body, code, expected_code
):
    mocks.patch_mocks(monkeypatch)
    mocks.patch_biglake_client(monkeypatch, (body, code))
    params = {"endpoint": "hive", "project_id": "my-project"}

    response = await jp_fetch(
        "dataproc-plugin", "biglakeCatalogs", params=params, raise_error=False
    )

    assert response.code == expected_code
    error = json.loads(response.body)["error"]
    assert error["code"] == expected_code
    # The response itself is logged, not shown in the UI.
    assert "<html>" not in error["message"]


@pytest.mark.parametrize(
    "error,expected_code",
    [
        (HTTPTimeoutError("Timeout during request"), 504),
        (ConnectionRefusedError("Connection refused"), 502),
        (RuntimeError("Unexpected error"), 500),
    ],
)
async def test_biglake_catalogs_handler_reports_failed_calls(
    jp_fetch, monkeypatch, error, expected_code
):
    mocks.patch_mocks(monkeypatch)
    mocks.patch_biglake_client(monkeypatch, error)
    params = {"endpoint": "hive", "project_id": "my-project"}

    response = await jp_fetch(
        "dataproc-plugin", "biglakeCatalogs", params=params, raise_error=False
    )

    assert response.code == expected_code
    assert json.loads(response.body)["error"]["code"] == expected_code


async def test_biglake_catalogs_handler_requires_sign_in(jp_fetch, monkeypatch):
    mocks.patch_mocks(monkeypatch)

    async def signed_out_credentials():
        return {
            "project_id": "",
            "region_id": "",
            "access_token": "",
            "config_error": 0,
            "login_error": 1,
        }

    monkeypatch.setattr(
        "dataproc_jupyter_plugin.credentials.get_cached", signed_out_credentials
    )
    client = mocks.patch_biglake_client(monkeypatch)
    params = {"endpoint": "hive", "project_id": "my-project"}

    response = await jp_fetch(
        "dataproc-plugin", "biglakeCatalogs", params=params, raise_error=False
    )

    assert response.code == 401
    assert json.loads(response.body)["error"]["code"] == 401
    assert client.requests == []


@pytest.mark.parametrize(
    "params",
    [
        {"endpoint": "other", "project_id": "my-project"},
        {"endpoint": "hive", "project_id": "a/../b"},
        {"endpoint": "hive", "project_id": ".."},
    ],
)
async def test_biglake_catalogs_handler_rejects_unsupported_input(
    jp_fetch, monkeypatch, params
):
    mocks.patch_mocks(monkeypatch)
    client = mocks.patch_biglake_client(monkeypatch)

    response = await jp_fetch(
        "dataproc-plugin", "biglakeCatalogs", params=params, raise_error=False
    )

    assert response.code == 400
    assert json.loads(response.body)["error"]["code"] == 400
    assert client.requests == []
