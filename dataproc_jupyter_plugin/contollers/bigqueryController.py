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
from dataproc_jupyter_plugin.services.bigqueryService import BigQueryDatasetService, BigQuerySchemaService



class BigqueryDatasetController(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            bigquery_dataset = BigQueryDatasetService()
            credentials = handlers.get_cached_credentials(self.log)
            dataset_list = bigquery_dataset.list_datasets(
                credentials,self.log
            )
            self.finish(json.dumps(dataset_list))
        except Exception as e:
            self.log.exception(f"Error fetching datasets")
            self.finish({"error": str(e)})

class BigquerySchemaController(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            entry_name = "bigquery.googleapis.com/projects/dataproc-jupyter-extension-dev/datasets/test_dataset/tables/games_post_wide"
            bigquery_dataset = BigQuerySchemaService()
            credentials = handlers.get_cached_credentials(self.log)
            schema_list = bigquery_dataset.list_datasets(
                credentials,entry_name,self.log
            )
            self.finish(json.dumps(schema_list))
        except Exception as e:
            self.log.exception(f"Error fetching table schema")
            self.finish({"error": str(e)})
