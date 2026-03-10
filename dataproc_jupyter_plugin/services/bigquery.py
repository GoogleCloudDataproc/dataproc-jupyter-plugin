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

from google.cloud import bigquery
import json
import datetime

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

    def create_headers(self):
        return {
            "Content-Type": CONTENT_TYPE,
            "Authorization": f"Bearer {self._access_token}",
        }

    async def list_datasets(self, page_token, project_id, location):
        try:
            if project_id == BQ_PUBLIC_DATASET_PROJECT_ID:
                # Use BigQuery API for public datasets
                bigquery_url = await urls.gcp_service_url(BIGQUERY_SERVICE_NAME)
                api_endpoint = f"{bigquery_url}bigquery/v2/projects/{BQ_PUBLIC_DATASET_PROJECT_ID}/datasets?maxResults={PAGE_SIZE_LIMIT}"
                if page_token:
                    api_endpoint += f"&pageToken={page_token}"
            else:
                # Use Dataplex API for user-specific datasets
                dataplex_url = await urls.gcp_service_url(DATAPLEX_SERVICE_NAME)
                api_endpoint = (
                    f"{dataplex_url}/v1/projects/{project_id}/locations/{location}/entryGroups/@bigquery/entries?filter=entry_type=projects/{BASE_PROJECT_ID}/locations/global/entryTypes/bigquery-dataset&pageSize={PAGE_SIZE_LIMIT}"
                )
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
        self,
        dataset_id,
        table_id,
        max_results,
        start_index,
        project_id,
        group_by=None,
        aggregation_fields=None,
        aggregation_operators=None,
        filter_fields=None,
        filter_operators=None,
        filter_vals=None,
        sort_field=None,
        sort_dir=None,
    ):
        try:
            offset = int(start_index)
            table_ref = f"`{project_id}.{dataset_id}.{table_id}`"

            # Construct the SQL query with optional filtering, grouping, and aggregation
            if (
                group_by
                and aggregation_fields
                and aggregation_operators
                and len(aggregation_fields) > 0
                and len(aggregation_operators) > 0
            ):
                aggregations_query = ""
                for i, field in enumerate(aggregation_fields):
                    op = (
                        aggregation_operators[i]
                        if i < len(aggregation_operators)
                        else "none"
                    )
                    if op != "none":
                        aggregations_query += (
                            f"{op.upper()}(`{field}`) AS `{field}_{op}`"
                        )
                sql_query = f"SELECT {group_by},{aggregations_query} FROM {table_ref}"
            else:
                sql_query = f"SELECT * FROM {table_ref}"

            conditions = []
            query_params = []

            # Adding filtering conditions if provided
            if filter_fields and len(filter_fields) > 0:
                for i, field in enumerate(filter_fields):
                    op = filter_operators[i] if i < len(filter_operators) else "equals"
                    val = filter_vals[i] if i < len(filter_vals) else None

                    if val is not None and val != "":
                        param_name = f"filterVal{i}"

                        if op == "equals":
                            conditions.append(f"`{field}` = @{param_name}")
                            query_params.append(
                                bigquery.ScalarQueryParameter(param_name, "STRING", val)
                            )
                        elif op == "contains":
                            conditions.append(
                                f"CONTAINS_SUBSTR(CAST(`{field}` AS STRING), @{param_name})"
                            )
                            query_params.append(
                                bigquery.ScalarQueryParameter(param_name, "STRING", val)
                            )

                if conditions:
                    sql_query += f" WHERE {' AND '.join(conditions)}"

            # Adding grouping and aggregation conditions if provided
            if (
                group_by
                and aggregation_fields
                and aggregation_operators
                and len(aggregation_fields) > 0
                and len(aggregation_operators) > 0
            ):
                group_by_fields = [f"`{field}`" for field in group_by.split(",")]
                sql_query += f" GROUP BY {', '.join(group_by_fields)}"

            # Constructing count query to retrive total rows for pagination
            if (
                group_by
                and aggregation_fields
                and aggregation_operators
                and len(aggregation_fields) > 0
                and len(aggregation_operators) > 0
            ):
                sql_count_query = (
                    f"SELECT COUNT(*) as total_count FROM ({sql_query}) AS subquery"
                )
            else:
                sql_count_query = sql_query.replace(
                    f"SELECT * FROM {table_ref}",
                    f"SELECT COUNT(*) as total_count FROM {table_ref}",
                )

            # Adding sorting if provided
            if sort_field and sort_dir:
                direction = "DESC" if sort_dir.lower() == "desc" else "ASC"
                sql_query = sql_query + f"ORDER BY {sort_field} {direction}"

            sql_query_with_limit = sql_query + " LIMIT @limit OFFSET @offset"
            query_params.append(
                bigquery.ScalarQueryParameter("limit", "INT64", max_results)
            )
            query_params.append(
                bigquery.ScalarQueryParameter("offset", "INT64", offset)
            )

            job_config = bigquery.QueryJobConfig(query_parameters=query_params)

            # Execute the query
            query_job = self.bqclient.query(sql_query_with_limit, job_config=job_config)
            results = query_job.result()
            # Execute the count query to get total rows
            count_query_job = self.bqclient.query(
                sql_count_query, job_config=job_config
            )
            count_results = count_query_job.result()

            for row in count_results:
                total_rows_estimate = row["total_count"]
                break
            else:
                total_rows_estimate = 0

            # Transform results to match the expected format for the frontend, converting datetime objects to ISO format
            transformed_rows = []
            for row in results:
                f_list = []
                for field_name in row.keys():
                    value = row[field_name]
                    if (
                        isinstance(value, datetime.datetime)
                        or isinstance(value, datetime.date)
                        or isinstance(value, datetime.time)
                    ):
                        value = value.isoformat()
                    f_list.append({"v": value})
                transformed_rows.append({"f": f_list})

            return {
                "rows": transformed_rows,
                "totalRows": str(total_rows_estimate),
                "sqlQuery": sql_query,
            }

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
