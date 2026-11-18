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
from google.cloud import jupyter_config
from tornado.simple_httpclient import HTTPTimeoutError
from traitlets.config import Config

import dataproc_jupyter_plugin
from dataproc_jupyter_plugin.commons import constants
from dataproc_jupyter_plugin.handlers import configure_gateway_client_url
from dataproc_jupyter_plugin.services import biglake
from dataproc_jupyter_plugin.tests import mocks


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


async def test_biglake_catalogs_handler_unexpected_credentials_error(
    jp_fetch, monkeypatch
):
    client = mocks.patch_biglake_client(monkeypatch)
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.credentials.get_cached",
        AsyncMock(side_effect=RuntimeError("unexpected error")),
    )
    params = {"endpoint": "hive", "project_id": "my-project"}

    response = await jp_fetch(
        "dataproc-plugin", "biglakeCatalogs", params=params, raise_error=False
    )
    assert response.code == 500
    error = json.loads(response.body)["error"]
    assert error["code"] == 500
    assert "unexpected error" not in error["message"]
    assert client.requests == []


def test_configure_gateway_client_url_missing_region(monkeypatch):
    log = Mock()
    c = Config()
    monkeypatch.setattr("dataproc_jupyter_plugin.handlers.gcp_region", lambda: "")

    assert configure_gateway_client_url(c, log, "") is False
    assert "GatewayClient" not in c
    log.error.assert_called_once()


def test_configure_gateway_client_url_missing_project_number(monkeypatch):
    log = Mock()
    c = Config()
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.handlers.gcp_region", lambda: "us-central1"
    )
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.handlers.gcp_project_number", lambda: ""
    )

    assert configure_gateway_client_url(c, log, "") is False
    assert "GatewayClient" not in c
    log.error.assert_called_once()


def test_configure_gateway_client_url_success_from_gcloud(monkeypatch):
    log = Mock()
    c = Config()
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.handlers.gcp_region", lambda: "us-central1"
    )
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.handlers.gcp_project_number", lambda: "123456"
    )

    assert configure_gateway_client_url(c, log, "") is True
    assert (
        c.GatewayClient.url
        == "https://123456-dot-us-central1.kernels.googleusercontent.com"
    )
    log.info.assert_called_once()


def test_configure_gateway_client_url_uses_explicit_project_number(monkeypatch):
    log = Mock()
    c = Config()
    mock_project_number = Mock(return_value="should-not-be-used")
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.handlers.gcp_region", lambda: "us-central1"
    )
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.handlers.gcp_project_number", mock_project_number
    )

    assert configure_gateway_client_url(c, log, "999999") is True
    assert (
        c.GatewayClient.url
        == "https://999999-dot-us-central1.kernels.googleusercontent.com"
    )
    mock_project_number.assert_not_called()
    log.info.assert_called_once()


def test_configure_gateway_client_url_subprocess_error(monkeypatch):
    log = Mock()
    c = Config()

    def raise_subproc():
        raise subprocess.SubprocessError("gcloud failed")

    monkeypatch.setattr("dataproc_jupyter_plugin.handlers.gcp_region", raise_subproc)

    assert configure_gateway_client_url(c, log, "") is False
    assert "GatewayClient" not in c
    log.error.assert_called_once()


async def test_credentials_handler_success(jp_fetch, monkeypatch):
    mocks.patch_mocks(monkeypatch)
    response = await jp_fetch("dataproc-plugin", "credentials")
    assert response.code == 200
    assert json.loads(response.body) == {
        "project_id": "credentials-project",
        "region_id": "mock-region",
        "access_token": "mock-token",
        "config_error": 0,
        "login_error": 0,
    }


async def test_credentials_handler_config_error(jp_fetch, monkeypatch):
    expected_creds = {
        "project_id": "",
        "region_id": "",
        "access_token": "tok",
        "config_error": 1,
        "login_error": 0,
    }

    monkeypatch.setattr(
        "dataproc_jupyter_plugin.credentials.get_cached",
        AsyncMock(return_value=expected_creds),
    )
    response = await jp_fetch("dataproc-plugin", "credentials")
    assert response.code == 200
    assert json.loads(response.body) == expected_creds


@pytest.mark.parametrize(
    "returncode,expected_status",
    [(0, "SUCCEEDED"), (1, "FAILED")],
)
async def test_login_handler(jp_fetch, monkeypatch, returncode, expected_status):
    mock_proc = Mock()
    mock_proc.communicate.return_value = (b"out", b"err")
    mock_proc.returncode = returncode
    mock_popen = Mock(return_value=mock_proc)
    monkeypatch.setattr("dataproc_jupyter_plugin.handlers.subprocess.Popen", mock_popen)

    response = await jp_fetch(
        "dataproc-plugin", "login", method="POST", allow_nonstandard_methods=True
    )
    assert response.code == 200
    assert json.loads(response.body) == {"login": expected_status}
    mock_popen.assert_called_once_with(
        "gcloud auth login",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=True,
    )
    mock_proc.communicate.assert_called_once_with()


async def test_url_handler_defaults(jp_fetch, monkeypatch):
    mocks.patch_mocks(monkeypatch)
    url_resp = await jp_fetch("dataproc-plugin", "getGcpServiceUrls")
    assert url_resp.code == 200
    assert json.loads(url_resp.body) == {
        "dataproc_url": "https://dataproc.googleapis.com/",
        "compute_url": constants.COMPUTE_SERVICE_DEFAULT_URL,
        "metastore_url": "https://metastore.googleapis.com/",
        "cloudkms_url": "https://cloudkms.googleapis.com/",
        "cloudresourcemanager_url": "https://cloudresourcemanager.googleapis.com/",
        "storage_url": constants.STORAGE_SERVICE_DEFAULT_URL,
        "dataplex_url": "https://dataplex.googleapis.com/",
        "bigquery_url": "https://bigquery.googleapis.com/",
    }


async def test_url_handler_with_endpoint_override(jp_fetch, monkeypatch):
    mocks.patch_mocks(monkeypatch)

    async def mock_override_config(field_name):
        if field_name == "configuration.properties.api_endpoint_overrides.dataproc":
            return "https://staging-dataproc.sandbox.googleapis.com/"
        return None

    monkeypatch.setattr(jupyter_config, "async_get_gcloud_config", mock_override_config)

    url_resp = await jp_fetch("dataproc-plugin", "getGcpServiceUrls")
    assert url_resp.code == 200
    url_payload = json.loads(url_resp.body)
    assert (
        url_payload["dataproc_url"]
        == "https://staging-dataproc.sandbox.googleapis.com/"
    )
    assert url_payload["bigquery_url"] == "https://bigquery.googleapis.com/"


async def test_log_handler(jp_fetch, jp_serverapp, monkeypatch):
    child_logger = jp_serverapp.log.getChild("DataprocPluginClient")
    mock_log = Mock()
    monkeypatch.setattr(child_logger, "log", mock_log)

    log_resp = await jp_fetch(
        "dataproc-plugin",
        "log",
        method="POST",
        body=json.dumps({"level": 20, "message": "test log message"}),
    )
    assert log_resp.code == 200
    assert json.loads(log_resp.body) == {"status": "OK"}
    mock_log.assert_called_once_with(20, "test log message")


def test_jupyter_extension_metadata_helpers():
    assert dataproc_jupyter_plugin._jupyter_labextension_paths() == [
        {"src": "labextension", "dest": "dataproc_jupyter_plugin"}
    ]
    assert dataproc_jupyter_plugin._jupyter_server_extension_points() == [
        {"module": "dataproc_jupyter_plugin"}
    ]


@pytest.mark.parametrize(
    "config_val,min_val,expected",
    [
        ("not-an-int", 10, 10),
        (5, 10, 10),
        (25, 10, 25),
    ],
)
def test_get_config_value_to_assign(config_val, min_val, expected):
    assert (
        dataproc_jupyter_plugin._get_config_value_to_assign(config_val, min_val)
        == expected
    )


def test_link_jupyter_server_extension_gateway_error_and_log_file(
    monkeypatch, tmp_path
):
    log_file = str(tmp_path / "plugin.log")
    mock_server_app = Mock()
    mock_server_app.config = Config()
    mock_plugin_config = Mock()
    mock_plugin_config.log_path = log_file
    mock_plugin_config.kernel_gateway_project_number = ""

    mock_handler = Mock()
    mock_rotating_cls = Mock(return_value=mock_handler)

    monkeypatch.setattr(
        "dataproc_jupyter_plugin.DataprocPluginConfig.instance",
        Mock(return_value=mock_plugin_config),
    )
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.configure_gateway_client_url",
        lambda c, log, num: False,
    )
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.logging.handlers.RotatingFileHandler",
        mock_rotating_cls,
    )

    dataproc_jupyter_plugin._link_jupyter_server_extension(mock_server_app)

    mock_rotating_cls.assert_called_once_with(
        log_file, maxBytes=2 * 1024 * 1024, backupCount=5
    )
    mock_handler.setFormatter.assert_called_once()
    mock_server_app.log.addHandler.assert_called_once_with(mock_handler)
    mock_server_app.log.warning.assert_called_once_with(
        "Disabling remote kernel support due to a gateway config error."
    )
    assert "GatewayClient" not in mock_server_app.config


def test_link_jupyter_server_extension_without_optional_gateway_classes_or_user_agent(
    monkeypatch,
):
    mock_server_app = Mock()
    mock_server_app.config = Config()
    mock_plugin_config = Mock()
    mock_plugin_config.log_path = ""
    mock_plugin_config.kernel_gateway_project_number = ""
    mock_plugin_config.custom_user_agent = ""

    monkeypatch.setattr(
        "dataproc_jupyter_plugin.DataprocPluginConfig.instance",
        Mock(return_value=mock_plugin_config),
    )
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.configure_gateway_client_url",
        lambda c, log, num: True,
    )
    monkeypatch.setattr(
        dataproc_jupyter_plugin, "DataprocGatewayKernelSpecManager", None
    )
    monkeypatch.setattr(
        dataproc_jupyter_plugin, "DataprocGatewayMappingKernelManager", None
    )
    monkeypatch.setattr(
        dataproc_jupyter_plugin, "DataprocGatewayWebSocketConnection", None
    )

    dataproc_jupyter_plugin._link_jupyter_server_extension(mock_server_app)

    headers = json.loads(mock_server_app.config.GatewayClient.headers)
    assert "User-Agent" not in headers
    assert "MixingKernelSpecManager" not in mock_server_app.config
    assert "MixingMappingKernelManager" not in mock_server_app.config
    assert (
        "remote_websocket_connection_class"
        not in mock_server_app.config.DelegatingWebsocketConnection
    )
