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
import subprocess

import aiohttp
import tornado
from jupyter_server.base.handlers import APIHandler
from google.cloud.jupyter_config.config import async_run_gcloud_subcommand
from dataproc_jupyter_plugin import credentials
from dataproc_jupyter_plugin.services import bigquery

# GCP project holding BigQuery public datasets.
BQ_PUBLIC_DATASET_PROJECT_ID = "bigquery-public-data"


class DatasetController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            page_token = self.get_argument("pageToken")
            project_id = self.get_argument("project_id")
            async with aiohttp.ClientSession() as client_session:
                client = bigquery.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                dataset_list = await client.list_datasets(page_token, project_id)
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
            async with aiohttp.ClientSession() as client_session:
                client = bigquery.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                table_list = await client.list_table(dataset_id, page_token, project_id)
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
            async with aiohttp.ClientSession() as client_session:
                client = bigquery.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                dataset_info = await client.list_dataset_info(dataset_id, project_id)
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
            async with aiohttp.ClientSession() as client_session:
                client = bigquery.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                table_info = await client.list_table_info(
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
            async with aiohttp.ClientSession() as client_session:
                client = bigquery.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                preview_data = await client.bigquery_preview_data(
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
            async with aiohttp.ClientSession() as client_session:
                client = bigquery.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                search_data = await client.bigquery_search(
                    search_string, type, system, projects
                )
            self.finish(json.dumps(search_data))
        except Exception as e:
            self.log.exception("Error fetching search data")
            self.finish({"error": str(e)})


class CheckApiController(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        try:
            project_id = await credentials._gcp_project()
            cmd = f"services list --enabled --project={project_id} | grep bigquery.googleapis.com"
            result = await async_run_gcloud_subcommand(cmd)
            is_enabled = bool(result.strip())
            self.finish({"success": True, "is_enabled": is_enabled})

        except Exception as e:
            self.finish({"success": False, "is_enabled": False, "error": str(e)})
