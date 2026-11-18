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
import subprocess
import sys
from unittest.mock import AsyncMock, Mock
from urllib.parse import urlencode

import aiohttp
import pytest

from dataproc_jupyter_plugin.services import version as version_service
from dataproc_jupyter_plugin.tests import mocks


@pytest.fixture
def valid_credentials():
    return {
        "access_token": "tok",
        "project_id": "proj",
        "region_id": "us-central1",
    }


@pytest.fixture
def mock_log():
    return Mock()


@pytest.fixture
def mock_client_session():
    return AsyncMock(spec=aiohttp.ClientSession)


@pytest.mark.parametrize(
    "incomplete_creds",
    [
        {"project_id": "proj", "region_id": "us-central1"},
        {"access_token": "tok", "region_id": "us-central1"},
        {"access_token": "tok", "project_id": "proj"},
    ],
)
def test_version_client_init_missing_credentials(
    incomplete_creds, mock_log, mock_client_session
):
    with pytest.raises(ValueError, match="Missing required credentials"):
        version_service.Client(incomplete_creds, mock_log, mock_client_session)
    mock_log.exception.assert_called_once_with("Missing required credentials")


@pytest.mark.asyncio
async def test_get_latest_version_success(
    valid_credentials, mock_log, mock_client_session
):
    mock_resp = AsyncMock()
    mock_resp.raise_for_status = Mock()
    mock_resp.json.return_value = {"info": {"version": "2.3.4"}}
    mock_client_session.get.return_value.__aenter__.return_value = mock_resp

    client = version_service.Client(valid_credentials, mock_log, mock_client_session)
    ver = await client.get_latest_version("dataproc_jupyter_plugin")

    assert ver == "2.3.4"
    mock_client_session.get.assert_called_once_with(
        "https://pypi.org/pypi/dataproc_jupyter_plugin/json", timeout=3
    )
    mock_resp.raise_for_status.assert_called_once_with()


@pytest.mark.asyncio
async def test_get_latest_version_http_error(
    valid_credentials, mock_log, mock_client_session
):
    mock_resp = AsyncMock()
    mock_resp.raise_for_status = Mock(side_effect=aiohttp.ClientError("not found"))
    mock_client_session.get.return_value.__aenter__.return_value = mock_resp

    client = version_service.Client(valid_credentials, mock_log, mock_client_session)
    result = await client.get_latest_version("dataproc_jupyter_plugin")

    assert result == {"error": "not found"}
    mock_log.exception.assert_called_once_with("Error fetching jupyter lab version")


@pytest.mark.asyncio
async def test_get_latest_version_malformed_payload(
    valid_credentials, mock_log, mock_client_session
):
    mock_resp = AsyncMock()
    mock_resp.raise_for_status = Mock()
    mock_resp.json.return_value = {}
    mock_client_session.get.return_value.__aenter__.return_value = mock_resp

    client = version_service.Client(valid_credentials, mock_log, mock_client_session)
    result = await client.get_latest_version("dataproc_jupyter_plugin")

    assert result == {"error": "'info'"}
    mock_log.exception.assert_called_once_with("Error fetching jupyter lab version")


@pytest.mark.asyncio
async def test_update_plugin_success(monkeypatch, valid_credentials, mock_log):
    mock_check_call = Mock(return_value=0)
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.services.version.subprocess.check_call",
        mock_check_call,
    )

    client = version_service.Client(valid_credentials, mock_log)
    result = await client.updatePlugin("dataproc_jupyter_plugin")

    assert result == {"status": "ok"}
    mock_check_call.assert_called_once_with(
        [sys.executable, "-m", "pip", "install", "--upgrade", "dataproc_jupyter_plugin"]
    )


def test_upgrade_package_failure(monkeypatch, valid_credentials, mock_log):
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.services.version.subprocess.check_call",
        Mock(side_effect=subprocess.CalledProcessError(1, "pip")),
    )

    client = version_service.Client(valid_credentials, mock_log)
    with pytest.raises(subprocess.CalledProcessError):
        client.upgrade_package("dataproc_jupyter_plugin")
    mock_log.exception.assert_called_once_with(
        "Failed to upgrade package: dataproc_jupyter_plugin"
    )


async def test_latest_version_controller_success(jp_fetch, monkeypatch):
    mocks.patch_mocks(monkeypatch)
    mock_get_latest = AsyncMock(return_value="2.3.4")
    monkeypatch.setattr(
        version_service.Client, "get_latest_version", mock_get_latest
    )

    resp = await jp_fetch(
        "dataproc-plugin",
        "jupyterlabVersion",
        params={"packageName": "dataproc_jupyter_plugin"},
    )
    assert resp.code == 200
    assert json.loads(resp.body) == "2.3.4"
    mock_get_latest.assert_awaited_once_with("dataproc_jupyter_plugin")


async def test_latest_version_controller_error(jp_fetch, monkeypatch):
    mocks.patch_mocks(monkeypatch)
    monkeypatch.setattr(
        version_service.Client,
        "get_latest_version",
        AsyncMock(side_effect=RuntimeError("version error")),
    )

    resp = await jp_fetch(
        "dataproc-plugin",
        "jupyterlabVersion",
        params={"packageName": "dataproc_jupyter_plugin"},
    )
    assert resp.code == 200
    assert json.loads(resp.body) == {"error": "version error"}


async def test_update_package_controller_success(jp_fetch, monkeypatch):
    mocks.patch_mocks(monkeypatch)
    mock_update = AsyncMock(return_value={"status": "ok"})
    monkeypatch.setattr(version_service.Client, "updatePlugin", mock_update)

    resp = await jp_fetch(
        "dataproc-plugin",
        "updatePlugin",
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        body=urlencode({"packageName": "dataproc_jupyter_plugin"}),
    )
    assert resp.code == 200
    assert json.loads(resp.body) == {"status": "ok"}
    mock_update.assert_awaited_once_with("dataproc_jupyter_plugin")


async def test_update_package_controller_error(jp_fetch, monkeypatch):
    mocks.patch_mocks(monkeypatch)
    monkeypatch.setattr(
        version_service.Client,
        "updatePlugin",
        AsyncMock(side_effect=RuntimeError("upgrade failed")),
    )

    resp = await jp_fetch(
        "dataproc-plugin",
        "updatePlugin",
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        body=urlencode({"packageName": "dataproc_jupyter_plugin"}),
    )
    assert resp.code == 200
    assert json.loads(resp.body) == {"error": "upgrade failed"}
