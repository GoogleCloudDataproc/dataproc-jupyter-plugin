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


import requests

from dataproc_jupyter_plugin import urls
from dataproc_jupyter_plugin.commons.constants import CONTENT_TYPE


class Client:
    def __init__(self, credentials, log):
        self.log = log
        if not (
            ("access_token" in credentials)
            and ("project_id" in credentials)
            and ("region_id" in credentials)
        ):
            log.exception(f"Missing required credentials")
            raise ValueError("Missing required credentials")
        self._access_token = credentials["access_token"]
        self.project_id = credentials["project_id"]
        self.region_id = credentials["region_id"]

    def create_headers(self):
        return {
            "Content-Type": CONTENT_TYPE,
            "Authorization": f"Bearer {self._access_token}",
        }

    async def list_datasets(self, page_token, project_id):
        try:
            api_endpoint = f"https://bigquery.googleapis.com/bigquery/v2/projects/{project_id}/datasets?pageToken={page_token}"
            response = requests.get(api_endpoint, headers=self.create_headers())
            if response.status_code == 200:
                resp = response.json()
                return resp
            else:
                raise Exception(f"Error response from BigQuery: {response.body}")
        except Exception as e:
            self.log.exception(f"Error fetching datasets list")
            return {"error": str(e)}

    async def list_table(self, dataset_id, page_token, project_id):
        try:
            api_endpoint = f"https://bigquery.googleapis.com/bigquery/v2/projects/{project_id}/datasets/{dataset_id}/tables?pageToken={page_token}"
            response = requests.get(api_endpoint, headers=self.create_headers())
            if response.status_code == 200:
                resp = response.json()
                return resp
            else:
                raise Exception(f"Error response from BigQuery: {response.body}")
        except Exception as e:
            self.log.exception(f"Error fetching tables list")
            return {"error": str(e)}

    async def list_dataset_info(self, dataset_id, project_id):
        try:
            api_endpoint = f"https://bigquery.googleapis.com/bigquery/v2/projects/{project_id}/datasets/{dataset_id}"
            response = requests.get(api_endpoint, headers=self.create_headers())
            if response.status_code == 200:
                resp = response.json()
                return resp
            else:
                raise Exception(f"Error response from BigQuery: {response.body}")
        except Exception as e:
            self.log.exception(f"Error fetching dataset info")
            return {"error": str(e)}

    async def list_table_info(self, dataset_id, table_id, project_id):
        try:
            api_endpoint = f"https://bigquery.googleapis.com/bigquery/v2/projects/{project_id}/datasets/{dataset_id}/tables/{table_id}"
            response = requests.get(api_endpoint, headers=self.create_headers())
            if response.status_code == 200:
                resp = response.json()
                return resp
            else:
                raise Exception(f"Error response from BigQuery: {response.body}")
        except Exception as e:
            log.exception(f"Error fetching table information")
            return {"error": str(e)}

    async def bigquery_preview_data(
        self,
        dataset_id,
        table_id,
        max_results,
        start_index,
        project_id,
    ):
        try:
            api_endpoint = f"https://bigquery.googleapis.com/bigquery/v2/projects/{project_id}/datasets/{dataset_id}/tables/{table_id}/data?maxResults={max_results}&startIndex={start_index}"
            response = requests.get(api_endpoint, headers=self.create_headers())
            if response.status_code == 200:
                resp = response.json()
                return resp
            else:
                raise Exception(f"Error response from BigQuery: {response.body}")
        except Exception as e:
            log.exception(f"Error fetching preview data")
            return {"error": str(e)}

    async def bigquery_search(self, search_string, type, system, projects):
        try:
            datacatalog_url = await urls.gcp_service_url("datacatalog")
            api_endpoint = f"{datacatalog_url}v1/catalog:search"
            headers = {
                "Content-Type": CONTENT_TYPE,
                "Authorization": f"Bearer {self._access_token}",
                "X-Goog-User-Project": self.project_id,
            }
            payload = {
                "query": f"{search_string}, system={system}, type={type}",
                "scope": {"includeProjectIds": projects},
                "pageSize": 500,
            }
            has_next = True
            search_result = []
            while has_next:
                response = requests.post(api_endpoint, headers=headers, json=payload)
                if response.status_code == 200:
                    resp = response.json()
                    if "results" in resp:
                        search_result += resp["results"]
                    if "nextPageToken" in resp:
                        payload["pageToken"] = resp["nextPageToken"]
                    else:
                        has_next = False
                else:
                    raise Exception(f"Error response from BigQuery: {response.body}")
            if len(search_result) == 0:
                return {}
            else:
                return {"results": search_result}
        except Exception as e:
            log.exception(f"Error fetching search data")
            return {"error": str(e)}

    async def bigquery_projects(self, dataset_id, table_id):
        try:
            api_endpoint = f"https://cloudresourcemanager.googleapis.com/v1/projects"
            response = requests.get(api_endpoint, headers=self.create_headers())
            if response.status_code == 200:
                resp = response.json()
                return resp
            else:
                raise Exception(f"Error response from BigQuery: {response.body}")
        except Exception as e:
            log.exception(f"Error fetching projects")
            return {"error": str(e)}
