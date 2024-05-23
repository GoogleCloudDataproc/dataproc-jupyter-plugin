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


from dataproc_jupyter_plugin import credentials
from jupyter_server.base.handlers import APIHandler
import tornado
from dataproc_jupyter_plugin.services.executorService import ExecutorService


class ExecutorController(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        try:
            input_data = self.get_json_body()
            execute = ExecutorService()
            gcp_credentials = await credentials.get_cached()
            execute.execute(gcp_credentials, input_data, self.log)
        except Exception as e:
            self.log.exception(f"Error creating dag schedule: {str(e)}")
            self.finish({"error": str(e)})
