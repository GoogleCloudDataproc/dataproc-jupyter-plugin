import json
from unittest.mock import AsyncMock
from urllib.parse import urlencode

import pytest


async def test_check_api_controller_success_enabled(jp_fetch, monkeypatch):
    """Test successful API check when service is enabled."""
    mock_run_gcloud = AsyncMock(return_value="dataproc.googleapis.com\n")
    mock_gcp_project = AsyncMock(return_value="my-project-123")
    mock_dataproc_url = AsyncMock(return_value="https://dataproc.googleapis.com/")

    monkeypatch.setattr(
        "dataproc_jupyter_plugin.controllers.checkApiEnabled.async_run_gcloud_subcommand",
        mock_run_gcloud,
    )
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.credentials._gcp_project", mock_gcp_project
    )
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.urls.gcp_service_url", mock_dataproc_url
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
    mock_dataproc_url = AsyncMock(return_value="https://storage.googleapis.com/")

    monkeypatch.setattr(
        "dataproc_jupyter_plugin.controllers.checkApiEnabled.async_run_gcloud_subcommand",
        mock_run_gcloud,
    )
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.credentials._gcp_project", mock_gcp_project
    )
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.urls.gcp_service_url", mock_dataproc_url
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


@pytest.mark.parametrize("service_url", ["https:///", "", None])
async def test_check_api_controller_missing_domain(jp_fetch, monkeypatch, service_url):
    """Test API check when service URL has no domain name."""
    mock_service_url = AsyncMock(return_value=service_url)
    mock_gcp_project = AsyncMock()
    mock_run_gcloud = AsyncMock()

    monkeypatch.setattr(
        "dataproc_jupyter_plugin.urls.gcp_service_url", mock_service_url
    )
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.credentials._gcp_project", mock_gcp_project
    )
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.controllers.checkApiEnabled.async_run_gcloud_subcommand",
        mock_run_gcloud,
    )

    body = urlencode({"service_name": "invalid"})
    response = await jp_fetch(
        "dataproc-plugin",
        "checkApiEnabled",
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        body=body,
    )

    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {
        "success": False,
        "is_enabled": False,
        "error": "Service URL for invalid not found.",
    }
    mock_service_url.assert_awaited_once_with("invalid")
    mock_gcp_project.assert_not_awaited()
    mock_run_gcloud.assert_not_awaited()


@pytest.mark.parametrize(
    "service_url",
    [
        "https://dataproc.googleapis.com:443/",
        "dataproc.googleapis.com/",
        "dataproc.googleapis.com:443/v1",
    ],
)
async def test_check_api_controller_extracts_hostname_from_url_variants(
    jp_fetch, monkeypatch, service_url
):
    """Test API check extracts only the hostname for URLs with ports or without a scheme."""
    mock_run_gcloud = AsyncMock(return_value="dataproc.googleapis.com\n")
    mock_gcp_project = AsyncMock(return_value="my-project-123")
    mock_service_url = AsyncMock(return_value=service_url)

    monkeypatch.setattr(
        "dataproc_jupyter_plugin.controllers.checkApiEnabled.async_run_gcloud_subcommand",
        mock_run_gcloud,
    )
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.credentials._gcp_project", mock_gcp_project
    )
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.urls.gcp_service_url", mock_service_url
    )

    body = urlencode({"service_name": "dataproc"})
    response = await jp_fetch(
        "dataproc-plugin",
        "checkApiEnabled",
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        body=body,
    )

    assert response.code == 200
    assert json.loads(response.body) == {"success": True, "is_enabled": True}
    mock_service_url.assert_awaited_once_with("dataproc")
    mock_gcp_project.assert_awaited_once()
    mock_run_gcloud.assert_awaited_once_with(
        'services list --enabled --project=my-project-123 --filter="NAME=dataproc.googleapis.com"'
    )


async def test_check_api_controller_gcloud_error(jp_fetch, monkeypatch):
    """Test API check when gcloud command raises an exception."""
    mock_run_gcloud = AsyncMock(side_effect=RuntimeError("gcloud failure"))
    mock_gcp_project = AsyncMock(return_value="my-project-123")
    mock_service_url = AsyncMock(return_value="https://dataproc.googleapis.com/")

    monkeypatch.setattr(
        "dataproc_jupyter_plugin.controllers.checkApiEnabled.async_run_gcloud_subcommand",
        mock_run_gcloud,
    )
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.credentials._gcp_project", mock_gcp_project
    )
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.urls.gcp_service_url", mock_service_url
    )

    body = urlencode({"service_name": "dataproc"})
    response = await jp_fetch(
        "dataproc-plugin",
        "checkApiEnabled",
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        body=body,
    )

    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {
        "success": False,
        "is_enabled": False,
        "error": "gcloud failure",
    }
    mock_service_url.assert_awaited_once_with("dataproc")
    mock_gcp_project.assert_awaited_once()
    mock_run_gcloud.assert_awaited_once_with(
        'services list --enabled --project=my-project-123 --filter="NAME=dataproc.googleapis.com"'
    )
