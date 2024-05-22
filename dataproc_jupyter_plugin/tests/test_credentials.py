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

from google.cloud.jupyter_config.config import clear_gcloud_cache

from .. import credentials


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
        self.assertEqual(cached["project_number"], None)
        self.assertEqual(cached["access_token"], "example-token")
        self.assertEqual(cached["region_id"], "example-region")
        self.assertEqual(cached["config_error"], 0)
        self.assertEqual(cached["login_error"], 1)
