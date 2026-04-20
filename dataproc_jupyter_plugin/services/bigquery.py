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
from google.cloud import bigquery, dataplex_v1
from google.oauth2.credentials import Credentials
from google.protobuf.json_format import MessageToDict
from google.api_core import exceptions as gcp_exceptions
from google.auth import exceptions as auth_exceptions

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
        self.bigquery_client = bigquery.Client(credentials=creds, project=self.project_id)

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
                # Use BigQuery SDK for public datasets
                loop = asyncio.get_running_loop()

                def _fetch_public_datasets():
                    pager = self.bigquery_client.list_datasets(
                        project=BQ_PUBLIC_DATASET_PROJECT_ID,
                        max_results=PAGE_SIZE_LIMIT,
                        page_token=page_token or None,
                    )
                    first_page = next(pager.pages)
                    dataset_list = []
                    for dataset_item in first_page:
                        dataset_list.append({
                            "datasetReference": {
                                "datasetId": getattr(dataset_item, "dataset_id", None),
                                "projectId": getattr(dataset_item, "project", None),
                            },
                            "description": getattr(dataset_item, "description", None),
                        })
                    return {
                        "datasets": dataset_list,
                        "nextPageToken": getattr(pager, "next_page_token", None),
                    }

                return await loop.run_in_executor(None, _fetch_public_datasets)
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
                
        except gcp_exceptions.NotFound:
            self.log.warning(f"Datasets not found for project: {project_id}")
            return {"error": "The requested resource could not be found."}
        except gcp_exceptions.PermissionDenied:
            self.log.warning(f"Permission denied accessing datasets for project: {project_id}")
            return {"error": "You do not have permission to view this resource."}
        except auth_exceptions.RefreshError:
            self.log.warning("Authentication token expired.")
            return {"error": "Authentication token expired. Please log in again."}
        except gcp_exceptions.GoogleAPIError as e:
            self.log.error(f"GCP API Error fetching datasets: {e.message}")
            return {"error": "An error occurred while communicating with Google Cloud."}
        except Exception as e:
            self.log.exception("Unexpected error fetching datasets list")
            return {"error": str(e)}

    async def list_table(self, dataset_id, page_token, project_id):
        try:
            dataset_ref = bigquery.DatasetReference(project_id, dataset_id)

            def _fetch_tables():
                pager = self.bigquery_client.list_tables(
                    dataset_ref,
                    max_results=PAGE_SIZE_LIMIT,
                    page_token=page_token or None,
                )
                first_page = next(pager.pages)
                table_list = []
                for table_item in first_page:
                    table_list.append({
                        "tableReference": {
                            "projectId": getattr(table_item, "project", None),
                            "datasetId": getattr(table_item, "dataset_id", None),
                            "tableId": getattr(table_item, "table_id", None),
                        },
                        "type": getattr(table_item, "table_type", None),
                        "friendlyName": getattr(table_item, "friendly_name", None),
                        "description": getattr(table_item, "description", None),
                    })
                return {
                    "tables": table_list,
                    "nextPageToken": getattr(pager, "next_page_token", None),
                }

            return await asyncio.to_thread(_fetch_tables)
            
        except gcp_exceptions.NotFound:
            self.log.warning(f"Dataset {dataset_id} not found.")
            return {"error": f"Dataset '{dataset_id}' could not be found."}
        except gcp_exceptions.PermissionDenied:
            self.log.warning(f"Permission denied accessing dataset: {dataset_id}")
            return {"error": "You do not have permission to view tables in this dataset."}
        except auth_exceptions.RefreshError:
            self.log.warning("Authentication token expired.")
            return {"error": "Authentication token expired. Please log in again."}
        except gcp_exceptions.GoogleAPIError as e:
            self.log.error(f"GCP API Error fetching tables: {e.message}")
            return {"error": "An error occurred while communicating with Google Cloud."}
        except Exception as e:
            self.log.exception("Unexpected error fetching tables list")
            return {"error": str(e)}

    async def list_dataset_info(self, dataset_id, project_id):
        try:
            dataset_ref = bigquery.DatasetReference(project_id, dataset_id)

            def _fetch_dataset_info():
                dataset = self.bigquery_client.get_dataset(dataset_ref)
                return {
                    "id": getattr(dataset, "id", None),
                    "creationTime": str(
                        int(dataset.created.timestamp() * 1000)
                    ) if getattr(dataset, "created", None) else None,
                    "defaultTableExpirationMs": getattr(
                        dataset, "default_table_expiration_ms", None
                    ),
                    "lastModifiedTime": str(
                        int(dataset.modified.timestamp() * 1000)
                    ) if getattr(dataset, "modified", None) else None,
                    "location": getattr(dataset, "location", None),
                    "description": getattr(dataset, "description", None),
                    "defaultCollation": getattr(dataset, "default_collation", None),
                    "defaultRoundingMode": getattr(dataset, "default_rounding_mode", None),
                    "maxTimeTravelHours": getattr(dataset, "max_time_travel_hours", None),
                    "storageBillingModel": getattr(dataset, "storage_billing_model", None),
                    "isCaseInsensitive": getattr(dataset, "is_case_insensitive", None),
                }

            return await asyncio.to_thread(_fetch_dataset_info)
            
        except gcp_exceptions.NotFound:
            self.log.warning(f"Dataset info not found for: {dataset_id}")
            return {"error": f"Dataset '{dataset_id}' could not be found."}
        except gcp_exceptions.PermissionDenied:
            self.log.warning(f"Permission denied accessing dataset info: {dataset_id}")
            return {"error": "You do not have permission to view this dataset's details."}
        except auth_exceptions.RefreshError:
            self.log.warning("Authentication token expired.")
            return {"error": "Authentication token expired. Please log in again."}
        except gcp_exceptions.GoogleAPIError as e:
            self.log.error(f"GCP API Error fetching dataset info: {e.message}")
            return {"error": "An error occurred while communicating with Google Cloud."}
        except Exception as e:
            self.log.exception("Unexpected error fetching dataset info")
            return {"error": str(e)}

    async def list_table_info(self, dataset_id, table_id, project_id):
        try:
            dataset_ref = bigquery.DatasetReference(project_id, dataset_id)
            table_ref = bigquery.TableReference(dataset_ref, table_id)

            def _fetch_table_info():
                table = self.bigquery_client.get_table(table_ref)
                schema_fields = []
                if getattr(table, "schema", None):
                    for field in table.schema:
                        field_obj = {
                            "name": field.name,
                            "type": field.field_type,
                            "mode": getattr(field, "mode", None),
                        }
                        if getattr(field, "fields", None):
                            field_obj["fields"] = [
                                {
                                    "name": subfield.name,
                                    "type": subfield.field_type,
                                    "mode": getattr(subfield, "mode", None),
                                }
                                for subfield in field.fields
                            ]
                        schema_fields.append(field_obj)

                return {
                    "tableReference": {
                        "projectId": project_id,
                        "datasetId": dataset_id,
                        "tableId": table_id,
                    },
                    "id": getattr(table, "full_table_id", None) or getattr(table, "table_id", None),
                    "creationTime": str(
                        int(table.created.timestamp() * 1000)
                    ) if getattr(table, "created", None) else None,
                    "lastModifiedTime": str(
                        int(table.modified.timestamp() * 1000)
                    ) if getattr(table, "modified", None) else None,
                    "expirationTime": str(
                        int(table.expires.timestamp() * 1000)
                    ) if getattr(table, "expires", None) else None,
                    "location": getattr(table, "location", None),
                    "defaultCollation": getattr(table, "default_collation", None),
                    "defaultRoundingMode": getattr(table, "default_rounding_mode", None),
                    "description": getattr(table, "description", None),
                    "schema": {"fields": schema_fields},
                }

            return await asyncio.to_thread(_fetch_table_info)
            
        except gcp_exceptions.NotFound:
            self.log.warning(f"Table info not found for: {table_id} in {dataset_id}")
            return {"error": f"Table '{table_id}' could not be found."}
        except gcp_exceptions.PermissionDenied:
            self.log.warning(f"Permission denied accessing table info: {table_id}")
            return {"error": "You do not have permission to view this table's details."}
        except auth_exceptions.RefreshError:
            self.log.warning("Authentication token expired.")
            return {"error": "Authentication token expired. Please log in again."}
        except gcp_exceptions.GoogleAPIError as e:
            self.log.error(f"GCP API Error fetching table info: {e.message}")
            return {"error": "An error occurred while communicating with Google Cloud."}
        except Exception as e:
            self.log.exception(f"Unexpected error fetching table information")
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
