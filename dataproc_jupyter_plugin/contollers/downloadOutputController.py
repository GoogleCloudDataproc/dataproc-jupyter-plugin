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
from dataproc_jupyter_plugin.services.downloadOutputService import DownloadOutputService




class downloadOutputController(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            download_dag = DownloadOutputService()
            bucket_name = self.get_argument("bucket_name")
            dag_id = self.get_argument("dag_run_id")
            dag_run_id = self.get_argument("dag_run_id")
            credentials = handlers.get_cached_credentials(self.log)
            download = download_dag.daownload_dag_output(credentials,bucket_name,dag_id,dag_run_id,self.log)
            self.finish(json.dumps(download))
        except Exception as e:
            self.log.exception(f"Error download output file")
            self.finish ({"error": str(e)})