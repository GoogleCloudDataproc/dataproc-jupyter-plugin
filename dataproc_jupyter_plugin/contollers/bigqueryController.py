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
from dataproc_jupyter_plugin.utils.utils import GetCachedCredentials
from jupyter_server.base.handlers import APIHandler
import tornado
from dataproc_jupyter_plugin.services.bigqueryService import (
    BigQueryDatasetInfoService,
    BigQueryDatasetListService,
    BigQueryPreviewService,
    BigQueryProjectService,
    BigQuerySearchService,
    BigQueryTableInfoService,
    BigQueryTableListService,
)
from dataproc_jupyter_plugin.utils.constants import bq_public_dataset_project_id
from google.cloud.jupyter_config import gcp_project


class BigqueryDatasetController(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            page_token = self.get_argument("pageToken")
            project_id = self.get_argument("project_id")
            bigquery_dataset = BigQueryDatasetListService()
            credentials = GetCachedCredentials.get_cached_credentials(self.log)
            dataset_list = bigquery_dataset.list_datasets(
                credentials, page_token, project_id, self.log
            )
            self.finish(json.dumps(dataset_list))
        except Exception as e:
            self.log.exception(f"Error fetching datasets")
            self.finish({"error": str(e)})


class BigqueryTableController(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            page_token = self.get_argument("pageToken")
            dataset_id = self.get_argument("dataset_id")
            project_id = self.get_argument("project_id")
            bigquery_dataset = BigQueryTableListService()
            credentials = GetCachedCredentials.get_cached_credentials(self.log)
            table_list = bigquery_dataset.list_table(
                credentials, dataset_id, page_token, project_id, self.log
            )
            self.finish(json.dumps(table_list))
        except Exception as e:
            self.log.exception(f"Error fetching datasets")
            self.finish({"error": str(e)})


class BigqueryDatasetInfoController(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            dataset_id = self.get_argument("dataset_id")
            project_id = self.get_argument("project_id")
            bq_dataset = BigQueryDatasetInfoService()
            credentials = GetCachedCredentials.get_cached_credentials(self.log)
            dataset_info = bq_dataset.list_dataset_info(
                credentials, dataset_id, project_id, self.log
            )
            self.finish(json.dumps(dataset_info))
        except Exception as e:
            self.log.exception(f"Error fetching dataset information")
            self.finish({"error": str(e)})


class BigqueryTableInfoController(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            dataset_id = self.get_argument("dataset_id")
            table_id = self.get_argument("table_id")
            project_id = self.get_argument("project_id")
            bq_table = BigQueryTableInfoService()
            credentials = GetCachedCredentials.get_cached_credentials(self.log)
            table_info = bq_table.list_table_info(
                credentials, dataset_id, table_id, project_id, self.log
            )
            self.finish(json.dumps(table_info))
        except Exception as e:
            self.log.exception(f"Error fetching table information")
            self.finish({"error": str(e)})


class BigqueryPreviewController(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            dataset_id = self.get_argument("dataset_id")
            table_id = self.get_argument("table_id")
            max_results = self.get_argument("max_results")
            start_index = self.get_argument("start_index")
            project_id = self.get_argument("project_id")
            bq_preview = BigQueryPreviewService()
            credentials = GetCachedCredentials.get_cached_credentials(self.log)
            preview_data = bq_preview.bigquery_preview_data(
                credentials,
                dataset_id,
                table_id,
                max_results,
                start_index,
                project_id,
                self.log,
            )
            self.finish(json.dumps(preview_data))
        except Exception as e:
            self.log.exception(f"Error fetching preview data")
            self.finish({"error": str(e)})


class BigqueryProjectsController(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            project_list = [gcp_project(), bq_public_dataset_project_id]
            self.finish(json.dumps(project_list))
        except Exception as e:
            self.log.exception(f"Error fetching projects")
            self.finish({"error": str(e)})


class BigquerySearchController(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            search_string = self.get_argument("search_string")
            type = self.get_argument("type")
            system = self.get_argument("system")
            projects = [gcp_project(), bq_public_dataset_project_id]
            bq_search = BigQuerySearchService()
            credentials = GetCachedCredentials.get_cached_credentials(self.log)
            search_data = bq_search.bigquery_search(
                credentials, search_string, type, system, projects, self.log
            )
            self.finish(json.dumps(search_data))
        except Exception as e:
            self.log.exception(f"Error fetching search data")
            self.finish({"error": str(e)})
