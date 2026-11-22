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

import os
import unittest
from unittest.mock import AsyncMock, call, patch

from google.cloud.jupyter_config.config import clear_gcloud_cache

from dataproc_jupyter_plugin import credentials


class TestGetCached(unittest.IsolatedAsyncioTestCase):
    _mock_cloudsdk_variables = {
        "CLOUDSDK_AUTH_ACCESS_TOKEN": "example-token",
        "CLOUDSDK_CORE_PROJECT": "",
        "CLOUDSDK_DATAPROC_REGION": "example-region",
    }

    def setUp(self):
        self.original_cloudsdk_variables = {}
        for key in os.environ:
            if key.startswith("CLOUDSDK_"):
                self.original_cloudsdk_variables[key] = os.environ[key]
        for key in self._mock_cloudsdk_variables:
            os.environ[key] = self._mock_cloudsdk_variables[key]
        clear_gcloud_cache()
        return

    def tearDown(self):
        for key in self._mock_cloudsdk_variables:
            del os.environ[key]
        for key in self.original_cloudsdk_variables:
            os.environ[key] = self.original_cloudsdk_variables[key]
        clear_gcloud_cache()
        return

    async def test_get_cached(self):
        cached = await credentials.get_cached()
        self.assertEqual(cached["project_id"], "")
        self.assertEqual(cached["access_token"], "example-token")
        self.assertEqual(cached["region_id"], "example-region")
        self.assertEqual(cached["login_error"], 0)


class TestCredentialsUnit(unittest.IsolatedAsyncioTestCase):
    def _patch_gcloud_config(self, mapping):
        mock_get_config = AsyncMock(side_effect=lambda key: mapping.get(key, ""))
        return (
            patch(
                "dataproc_jupyter_plugin.credentials.async_get_gcloud_config",
                mock_get_config,
            ),
            mock_get_config,
        )

    async def test_gcp_region_fallback_to_compute(self):
        patcher, mock_get_config = self._patch_gcloud_config(
            {
                "configuration.properties.dataproc.region": "",
                "configuration.properties.compute.region": "us-west1",
            }
        )
        with patcher:
            region = await credentials._gcp_region()
            self.assertEqual(region, "us-west1")
            mock_get_config.assert_has_awaits(
                [
                    call("configuration.properties.dataproc.region"),
                    call("configuration.properties.compute.region"),
                ]
            )

    async def test_get_cached_full_success(self):
        patcher, _ = self._patch_gcloud_config(
            {
                "configuration.properties.core.project": "my-project",
                "configuration.properties.dataproc.region": "us-central1",
                "credential.access_token": "valid-token",
            }
        )
        with patcher:
            cached = await credentials.get_cached()
            self.assertEqual(
                cached,
                {
                    "project_id": "my-project",
                    "region_id": "us-central1",
                    "access_token": "valid-token",
                    "config_error": 0,
                    "login_error": 0,
                },
            )

    async def test_get_cached_config_error_missing_project(self):
        patcher, _ = self._patch_gcloud_config(
            {
                "configuration.properties.core.project": "",
                "configuration.properties.dataproc.region": "us-central1",
                "credential.access_token": "valid-token",
            }
        )
        with patcher:
            cached = await credentials.get_cached()
            self.assertEqual(
                cached,
                {
                    "project_id": "",
                    "region_id": "us-central1",
                    "access_token": "valid-token",
                    "config_error": 1,
                    "login_error": 0,
                },
            )

    async def test_get_cached_config_error_missing_region(self):
        patcher, _ = self._patch_gcloud_config(
            {
                "configuration.properties.core.project": "my-project",
                "configuration.properties.dataproc.region": "",
                "configuration.properties.compute.region": "",
                "credential.access_token": "valid-token",
            }
        )
        with patcher:
            cached = await credentials.get_cached()
            self.assertEqual(
                cached,
                {
                    "project_id": "my-project",
                    "region_id": "",
                    "access_token": "valid-token",
                    "config_error": 1,
                    "login_error": 0,
                },
            )

    async def test_get_cached_missing_access_token(self):
        patcher, _ = self._patch_gcloud_config(
            {
                "configuration.properties.core.project": "my-project",
                "configuration.properties.dataproc.region": "us-central1",
                "credential.access_token": "",
            }
        )
        with patcher:
            cached = await credentials.get_cached()
            self.assertEqual(
                cached,
                {
                    "project_id": "my-project",
                    "region_id": "us-central1",
                    "access_token": "",
                    "config_error": 0,
                    "login_error": 1,
                },
            )

    async def test_get_cached_exception(self):
        with (
            patch(
                "dataproc_jupyter_plugin.credentials._gcp_project",
                AsyncMock(side_effect=RuntimeError("gcloud error")),
            ),
            patch("dataproc_jupyter_plugin.credentials.logging.error") as mock_log_error,
        ):
            cached = await credentials.get_cached()
            self.assertEqual(
                cached,
                {
                    "project_id": "",
                    "region_id": "",
                    "access_token": "",
                    "config_error": 0,
                    "login_error": 1,
                },
            )
            mock_log_error.assert_called_once_with(
                "Error getting gcloud config: gcloud error"
            )
