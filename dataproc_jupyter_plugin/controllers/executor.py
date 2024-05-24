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
from dataproc_jupyter_plugin import credentials
from jupyter_server.base.handlers import APIHandler
import tornado
from dataproc_jupyter_plugin.services.executorService import ExecutorService
from dataproc_jupyter_plugin.services import executor


class ExecutorController(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        try:
            input_data = self.get_json_body()
            client = executor.Client(await credentials.get_cached(), self.log)
            await client.execute(input_data)
        except Exception as e:
            self.log.exception(f"Error creating dag schedule: {str(e)}")
            self.finish({"error": str(e)})

class DownloadOutputController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            client = executor.Client(await credentials.get_cached(), self.log)
            bucket_name = self.get_argument("bucket_name")
            dag_id = self.get_argument("dag_id")
            dag_run_id = self.get_argument("dag_run_id")
            download_status = client.download_dag_output(
                bucket_name, dag_id, dag_run_id, self.log
            )
            self.finish(json.dumps({"status": download_status}))
        except Exception as e:
            self.log.exception(f"Error download output file")
            self.finish({"error": str(e)})
