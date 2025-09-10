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


import json
import time
import asyncio

import aiohttp
import tornado
from jupyter_server.base.handlers import APIHandler
from dataproc_jupyter_plugin import credentials
from dataproc_jupyter_plugin.services import bigquery

from dataproc_jupyter_plugin.commons.constants import (
    BQ_PUBLIC_DATASET_PROJECT_ID,BQ_CLIENT_EXPIRY_DURATION
)
    
class BigQueryClient:
    _client = None
    _session = None
    _creation_time = None
    _lock = asyncio.Lock()
	
    async def get_client(self, log):
        async with self._lock:
            if self._client is None or (time.time() - self._creation_time) > BQ_CLIENT_EXPIRY_DURATION:
                if self._session:
                    await self._session.close()

                self._session = aiohttp.ClientSession()
                self._client = bigquery.Client(
                    await credentials.get_cached(), log, self._session
                )
                self._creation_time = time.time()
            return self._client

bigquery_client = BigQueryClient()

class DatasetController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            page_token = self.get_argument("pageToken")
            project_id = self.get_argument("project_id")
            location = self.get_argument("location", default="us").lower()
            bq_client = await bigquery_client.get_client(self.log)
            dataset_list = await bq_client.list_datasets(page_token, project_id, location)
            self.finish(json.dumps(dataset_list))
        except Exception as e:
            self.log.exception("Error fetching datasets")
            self.finish({"error": str(e)})


class TableController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            page_token = self.get_argument("pageToken")
            dataset_id = self.get_argument("dataset_id")
            project_id = self.get_argument("project_id")
            bq_client = await bigquery_client.get_client(self.log)
            table_list = await bq_client.list_table(dataset_id, page_token, project_id)
            self.finish(json.dumps(table_list))
        except Exception as e:
            self.log.exception("Error fetching datasets")
            self.finish({"error": str(e)})


class DatasetInfoController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            dataset_id = self.get_argument("dataset_id")
            project_id = self.get_argument("project_id")
            bq_client = await bigquery_client.get_client(self.log)
            dataset_info = await bq_client.list_dataset_info(dataset_id, project_id)
            self.finish(json.dumps(dataset_info))
        except Exception as e:
            self.log.exception("Error fetching dataset information")
            self.finish({"error": str(e)})


class TableInfoController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            dataset_id = self.get_argument("dataset_id")
            table_id = self.get_argument("table_id")
            project_id = self.get_argument("project_id")
            bq_client = await bigquery_client.get_client(self.log)
            table_info = await bq_client.list_table_info(
                dataset_id, table_id, project_id
            )
            self.finish(json.dumps(table_info))
        except Exception as e:
            self.log.exception("Error fetching table information")
            self.finish({"error": str(e)})


class PreviewController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            dataset_id = self.get_argument("dataset_id")
            table_id = self.get_argument("table_id")
            max_results = self.get_argument("max_results")
            start_index = self.get_argument("start_index")
            project_id = self.get_argument("project_id")
            bq_client = await bigquery_client.get_client(self.log)
            preview_data = await bq_client.bigquery_preview_data(
                dataset_id, table_id, max_results, start_index, project_id
            )
            self.finish(json.dumps(preview_data))
        except Exception as e:
            self.log.exception("Error fetching preview data")
            self.finish({"error": str(e)})


async def bq_projects_list():
    creds = await credentials.get_cached()
    project_list = [BQ_PUBLIC_DATASET_PROJECT_ID]
    if creds["project_id"]:
        project_list.append(creds["project_id"])
    return project_list


class ProjectsController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            project_list = await bq_projects_list()
            self.finish(json.dumps(project_list))
        except Exception as e:
            self.log.exception("Error fetching projects")
            self.finish({"error": str(e)})


class SearchController(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        try:
            search_string = self.get_argument("search_string")
            type = self.get_argument("type")
            system = self.get_argument("system")
            projects = await bq_projects_list()
            bq_client = await bigquery_client.get_client(self.log)
            search_data = await bq_client.bigquery_search(
                search_string, type, system, projects
            )
            self.finish(json.dumps(search_data))
        except Exception as e:
            self.log.exception("Error fetching search data")
            self.finish({"error": str(e)})
