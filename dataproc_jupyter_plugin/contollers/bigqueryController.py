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


import json
from jupyter_server.base.handlers import APIHandler
import tornado
from dataproc_jupyter_plugin import handlers
from dataproc_jupyter_plugin.services.bigqueryService import (
    BigQueryDatasetInfoService,
    BigQueryDatasetListService,
    BigQueryPreviewService,
    BigQueryProjectService,
    BigQueryTableInfoService,
    BigQueryTableListService,
)


class BigqueryDatasetController(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            page_token = self.get_argument("pageToken")
            bigquery_dataset = BigQueryDatasetListService()
            credentials = handlers.get_cached_credentials(self.log)
            dataset_list = bigquery_dataset.list_datasets(
                credentials, page_token, self.log
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
            bigquery_dataset = BigQueryTableListService()
            credentials = handlers.get_cached_credentials(self.log)
            table_list = bigquery_dataset.list_table(
                credentials, dataset_id, page_token, self.log
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
            bq_dataset = BigQueryDatasetInfoService()
            credentials = handlers.get_cached_credentials(self.log)
            dataset_info = bq_dataset.list_dataset_info(
                credentials, dataset_id, self.log
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
            bq_table = BigQueryTableInfoService()
            credentials = handlers.get_cached_credentials(self.log)
            table_info = bq_table.list_table_info(
                credentials, dataset_id, table_id, self.log
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
            page_token = self.get_argument("pageToken")
            bq_preview = BigQueryPreviewService()
            credentials = handlers.get_cached_credentials(self.log)
            preview_data = bq_preview.bigquery_preview_data(
                credentials, dataset_id, table_id, page_token, self.log
            )
            self.finish(json.dumps(preview_data))
        except Exception as e:
            self.log.exception(f"Error fetching preview data")
            self.finish({"error": str(e)})


class BigqueryProjectsController(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            bq_preview = BigQueryProjectService()
            credentials = handlers.get_cached_credentials(self.log)
            preview_data = bq_preview.bigquery_preview_data(credentials, self.log)
            self.finish(json.dumps(preview_data))
        except Exception as e:
            self.log.exception(f"Error fetching projects")
            self.finish({"error": str(e)})
