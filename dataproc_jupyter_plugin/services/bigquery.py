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


import aiohttp
import asyncio
from google.cloud import dataplex_v1
from google.oauth2.credentials import Credentials
from google.protobuf.json_format import MessageToDict

from dataproc_jupyter_plugin import urls
from dataproc_jupyter_plugin.commons.constants import (
    BIGQUERY_SERVICE_NAME,
    CLOUDRESOURCEMANAGER_SERVICE_NAME,
    CONTENT_TYPE,
    DATAPLEX_SERVICE_NAME
)

from dataproc_jupyter_plugin.commons.constants import (
    BQ_PUBLIC_DATASET_PROJECT_ID,BASE_PROJECT_ID,PAGE_SIZE_LIMIT
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

        creds = Credentials(token=self._access_token, quota_project_id=self.project_id)
        self.dataplex_client = dataplex_v1.CatalogServiceClient(credentials=creds)

    def create_headers(self):
        return {
            "Content-Type": CONTENT_TYPE,
            "Authorization": f"Bearer {self._access_token}",
        }

    def _entry_to_dict(self, entry):
        # Dataplex SDK entries may be protobuf messages or wrapper objects.
        if hasattr(entry, "_pb"):
            entry_obj = entry._pb
        else:
            entry_obj = entry

        try:
            return MessageToDict(entry_obj)
        except Exception:
            entry_source = getattr(entry, "entry_source", None)
            display_name = (
                getattr(entry, "display_name", None)
                or getattr(entry, "displayName", None)
                or getattr(entry_source, "display_name", None)
                or getattr(entry_source, "displayName", None)
            )
            return {
                "name": getattr(entry, "name", None),
                "displayName": display_name,
                "entrySource": {
                    "location": getattr(entry_source, "location", None),
                    "displayName": (
                        getattr(entry_source, "display_name", None)
                        or getattr(entry_source, "displayName", None)
                    ),
                    "description": getattr(entry_source, "description", None),
                    "resource": getattr(entry_source, "resource", None),
                    "system": getattr(entry_source, "system", None),
                    "platform": getattr(entry_source, "platform", None),
                },
                "asset": getattr(entry, "asset", None),
                "type": getattr(entry, "type", None),
            }

    async def list_datasets(self, page_token, project_id, location):
        try:
            if project_id == BQ_PUBLIC_DATASET_PROJECT_ID:
                # Use BigQuery API for public datasets
                bigquery_url = await urls.gcp_service_url(BIGQUERY_SERVICE_NAME)
                api_endpoint = f"{bigquery_url}bigquery/v2/projects/{BQ_PUBLIC_DATASET_PROJECT_ID}/datasets?maxResults={PAGE_SIZE_LIMIT}"
                if page_token:
                    api_endpoint += f"&pageToken={page_token}"

                async with self.client_session.get(
                    api_endpoint, headers=self.create_headers()
                ) as response:
                    if response.status == 200:
                        resp = await response.json()
                        return resp
                    else:
                        raise Exception(
                            f"Error response from BigQuery: {response.reason} {await response.text()}"
                        )
            else:
                # Use Dataplex SDK for user-specific datasets
                loop = asyncio.get_running_loop()
                parent = f"projects/{project_id}/locations/{location}/entryGroups/@bigquery"
                filter_str = (
                    f"entry_type=projects/{BASE_PROJECT_ID}/locations/global/entryTypes/bigquery-dataset"
                )

                def _fetch_datasets():
                    request = dataplex_v1.ListEntriesRequest(
                        parent=parent,
                        filter=filter_str,
                        page_size=PAGE_SIZE_LIMIT,
                        page_token=page_token or "",
                    )
                    pager = self.dataplex_client.list_entries(request=request)
                    first_page = next(pager.pages)
                    entries = [self._entry_to_dict(entry) for entry in first_page.entries]
                    return {
                        "entries": entries,
                        "nextPageToken": first_page.next_page_token,
                    }

                return await loop.run_in_executor(None, _fetch_datasets)
        except Exception as e:
            self.log.exception("Error fetching datasets list")
            return {"error": str(e)}

    async def list_table(self, dataset_id, page_token, project_id):
        try:
            bigquery_url = await urls.gcp_service_url(BIGQUERY_SERVICE_NAME)
            api_endpoint = f"{bigquery_url}bigquery/v2/projects/{project_id}/datasets/{dataset_id}/tables?pageToken={page_token}"
            async with self.client_session.get(
                api_endpoint, headers=self.create_headers()
            ) as response:
                if response.status == 200:
                    resp = await response.json()
                    return resp
                else:
                    raise Exception(
                        f"Error listing BigQuery tables: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception("Error fetching tables list")
            return {"error": str(e)}

    async def list_dataset_info(self, dataset_id, project_id):
        try:
            bigquery_url = await urls.gcp_service_url(BIGQUERY_SERVICE_NAME)
            api_endpoint = (
                f"{bigquery_url}bigquery/v2/projects/{project_id}/datasets/{dataset_id}"
            )
            async with self.client_session.get(
                api_endpoint, headers=self.create_headers()
            ) as response:
                if response.status == 200:
                    resp = await response.json()
                    return resp
                else:
                    raise Exception(
                        f"Error listing BigQuery dataset info: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception("Error fetching dataset info")
            return {"error": str(e)}

    async def list_table_info(self, dataset_id, table_id, project_id):
        try:
            bigquery_url = await urls.gcp_service_url(BIGQUERY_SERVICE_NAME)
            api_endpoint = f"{bigquery_url}bigquery/v2/projects/{project_id}/datasets/{dataset_id}/tables/{table_id}"
            async with self.client_session.get(
                api_endpoint, headers=self.create_headers()
            ) as response:
                if response.status == 200:
                    resp = await response.json()
                    return resp
                else:
                    raise Exception(
                        f"Error listing BigQuery table info: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error fetching table information")
            return {"error": str(e)}

    async def bigquery_preview_data(
        self, dataset_id, table_id, max_results, start_index, project_id
    ):
        try:
            bigquery_url = await urls.gcp_service_url(BIGQUERY_SERVICE_NAME)
            api_endpoint = f"{bigquery_url}bigquery/v2/projects/{project_id}/datasets/{dataset_id}/tables/{table_id}/data?maxResults={max_results}&startIndex={start_index}"
            async with self.client_session.get(
                api_endpoint, headers=self.create_headers()
            ) as response:
                if response.status == 200:
                    resp = await response.json()
                    return resp
                else:
                    raise Exception(
                        f"Error displaying BigQuery preview data: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception("Error fetching preview data")
            return {"error": str(e)}

    async def bigquery_search(self, search_string: str, type: str, system: str, projects: list):
        """Searches for BigQuery data assets using the Dataplex API."""
        try:
            dataplex_url = await urls.gcp_service_url(DATAPLEX_SERVICE_NAME)
            api_endpoint = f"{dataplex_url}v1/projects/{self.project_id}/locations/global:searchEntries"
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self._access_token}",
                "X-Goog-User-Project": self.project_id,
            }

            query_parts = []
            if search_string:
                query_parts.append(f"{search_string}")
            if system:
                query_parts.append(f"system={system.upper()}")
            if type:
                type_filters = " OR ".join([f"type={t.upper()}" for t in type.split('|')])
                query_parts.append(f"({type_filters})")
            if projects:
                project_filters = " OR ".join([f"projectid={p}" for p in projects])
                query_parts.append(f"({project_filters})")

            full_query = " AND ".join(filter(None, query_parts))
            
            if not full_query:
                self.log.warning("No search query provided. Returning empty result.")
                return {}

            payload = {
                "query": full_query,
                "pageSize": 500,
            }
            
            has_next = True
            search_results = []
            
            # Handle pagination to retrieve all results.
            while has_next:
                try:
                    async with self.client_session.post(
                        api_endpoint, headers=headers, json=payload
                    ) as response:
                        if response.status == 200:
                            resp = await response.json()
                            if "results" in resp:
                                search_results.extend(resp["results"])

                            if "nextPageToken" in resp:
                                payload["pageToken"] = resp["nextPageToken"]
                            else:
                                has_next = False
                        else:
                            response_text = await response.text()
                            self.log.error(f"Error searching in Dataplex: {response.status} - {response_text}")
                            raise Exception(f"Dataplex API Error: {response.status} - {response.reason} - {response_text}")

                except aiohttp.ClientError as e:
                    self.log.error(f"Aiohttp client error during API call: {e}")
                    raise

            if not search_results:
                return {}
            else:
                return {"results": search_results}

        except Exception as e:
            self.log.exception(f"Error fetching Dataplex search data: {e}")
            return {"error": str(e)}

    async def bigquery_projects(self, dataset_id, table_id):
        try:
            cloudresourcemanager_url = await urls.gcp_service_url(
                CLOUDRESOURCEMANAGER_SERVICE_NAME
            )
            api_endpoint = f"{cloudresourcemanager_url}v1/projects"
            async with self.client_session.get(
                api_endpoint, headers=self.create_headers()
            ) as response:
                if response.status == 200:
                    resp = await response.json()
                    return resp
                else:
                    raise Exception(
                        f"Error listing BigQuery projects: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception("Error fetching projects")
            return {"error": str(e)}
