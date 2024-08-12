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

from dataproc_jupyter_plugin import urls
from dataproc_jupyter_plugin.commons.constants import (
    CONTENT_TYPE,
    DATAPROC_SERVICE_NAME,
)


class Client:
    def __init__(self, credentials, log, client_session):
        self.log = log
        if not (
            ("access_token" in credentials)
            and ("project_id" in credentials)
            and ("region_id" in credentials)
        ):
            self.log.exception("Missing required credentials")
            raise ValueError("Missing required credentials")
        self._access_token = credentials["access_token"]
        self.project_id = credentials["project_id"]
        self.region_id = credentials["region_id"]
        self.client_session = client_session

    def create_headers(self):
        return {
            "Content-Type": CONTENT_TYPE,
            "Authorization": f"Bearer {self._access_token}",
        }

    async def list_clusters(self, page_size, page_token):
        try:
            dataproc_url = await urls.gcp_service_url(DATAPROC_SERVICE_NAME)
            api_endpoint = f"{dataproc_url}/v1/projects/{self.project_id}/regions/{self.region_id}/clusters?pageSize={page_size}&pageToken={page_token}"
            async with self.client_session.get(
                api_endpoint, headers=self.create_headers()
            ) as response:
                if response.status == 200:
                    resp = await response.json()
                    return resp
                else:
                    return {
                        "error": f"Failed to fetch clusters: {response.status} {await response.text()}"
                    }

        except Exception as e:
            self.log.exception("Error fetching cluster list")
            return {"error": str(e)}

    async def list_runtime(self, page_size, page_token):
        try:
            dataproc_url = await urls.gcp_service_url(DATAPROC_SERVICE_NAME)
            api_endpoint = f"{dataproc_url}/v1/projects/{self.project_id}/locations/{self.region_id}/sessionTemplates?pageSize={page_size}&pageToken={page_token}"
            async with self.client_session.get(
                api_endpoint, headers=self.create_headers()
            ) as response:
                if response.status == 200:
                    resp = await response.json()
                    return resp
                else:
                    return {
                        "error": f"Failed to fetch runtimes: {response.status} {await response.text()}"
                    }
        except Exception as e:
            self.log.exception(f"Error fetching runtime list: {str(e)}")
            return {"error": str(e)}
