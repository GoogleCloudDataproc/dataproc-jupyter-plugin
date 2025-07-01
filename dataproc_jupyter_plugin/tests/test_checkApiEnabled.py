import json
from unittest.mock import AsyncMock
from urllib.parse import urlencode


async def test_check_api_controller_success_enabled(jp_fetch, monkeypatch):
    """Test successful API check when service is enabled."""
    mock_run_gcloud = AsyncMock(return_value="dataproc.googleapis.com\n")
    mock_gcp_project = AsyncMock(return_value="my-project-123")

    monkeypatch.setattr(
        "dataproc_jupyter_plugin.controllers.checkApiEnabled.async_run_gcloud_subcommand",
        mock_run_gcloud,
    )
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.handlers.credentials._gcp_project", mock_gcp_project
    )

    body = urlencode({"service_name": "dataproc.googleapis.com"})

    response = await jp_fetch(
        "dataproc-plugin",
        "checkApiEnabled",
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        body=body,
    )

    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"success": True, "is_enabled": True}

    expected_cmd = 'services list --enabled --project=my-project-123 --filter="NAME=dataproc.googleapis.com"'
    mock_run_gcloud.assert_called_once_with(expected_cmd)
    mock_gcp_project.assert_called_once()


async def test_check_api_controller_success_disabled(jp_fetch, monkeypatch):
    """Test successful API check when service is disabled."""
    mock_run_gcloud = AsyncMock(return_value="")
    mock_gcp_project = AsyncMock(return_value="my-project-123")

    monkeypatch.setattr(
        "dataproc_jupyter_plugin.controllers.checkApiEnabled.async_run_gcloud_subcommand",
        mock_run_gcloud,
    )
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.handlers.credentials._gcp_project", mock_gcp_project
    )

    body = urlencode({"service_name": "storage.googleapis.com"})

    response = await jp_fetch(
        "dataproc-plugin",
        "checkApiEnabled",
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        body=body,
    )

    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"success": True, "is_enabled": False}

    expected_cmd = 'services list --enabled --project=my-project-123 --filter="NAME=storage.googleapis.com"'
    mock_run_gcloud.assert_called_once_with(expected_cmd)
