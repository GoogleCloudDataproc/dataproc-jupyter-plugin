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


import requests
from dataproc_jupyter_plugin.utils.constants import CONTENT_TYPE, dataproc_url


class RuntimeListService:
    def list_runtime(self, credentials, page_size, page_token, log):
        try:
            if (
                ("access_token" in credentials)
                and ("project_id" in credentials)
                and ("region_id" in credentials)
            ):
                access_token = credentials["access_token"]
                project_id = credentials["project_id"]
                region_id = credentials["region_id"]
                api_endpoint = f"{dataproc_url}/v1/projects/{project_id}/locations/{region_id}/sessionTemplates?pageSize={page_size}&pageToken={page_token}"

                headers = {
                    "Content-Type": CONTENT_TYPE,
                    "Authorization": f"Bearer {access_token}",
                }
                response = requests.get(api_endpoint, headers=headers)
                if response.status_code == 200:
                    resp = response.json()

                return resp
            else:
                log.exception(f"Missing required credentials")
                raise ValueError("Missing required credentials")
        except Exception as e:
            log.exception(f"Error fetching runtime list: {str(e)}")
            return {"error": str(e)}
