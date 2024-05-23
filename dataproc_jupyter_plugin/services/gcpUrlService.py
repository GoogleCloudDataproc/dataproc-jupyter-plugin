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

from google.cloud import jupyter_config

async def gcp_service_url(service_name, default_url=None):
    default_url = default_url or f"https://{service_name}.googleapis.com/"
    configured_url = await jupyter_config.async_get_gcloud_config(
        f"configuration.properties.api_endpoint_overrides.{service_name}"
    )
    url = configured_url or default_url
    return url
