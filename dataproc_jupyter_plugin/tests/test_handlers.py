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
