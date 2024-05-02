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
from dataproc_jupyter_plugin.utils.credentials import GetCachedCredentials
from jupyter_server.base.handlers import APIHandler
import tornado
from dataproc_jupyter_plugin.services.runtimeListService import RuntimeListService


class RuntimeController(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            page_token = self.get_argument("pageToken")
            page_size = self.get_argument("pageSize")
            runtime = RuntimeListService()
            credentials = GetCachedCredentials.get_cached_credentials(self.log)
            runtime_list = runtime.list_runtime(
                credentials, page_size, page_token, self.log
            )
            self.finish(json.dumps(runtime_list))
        except Exception as e:
            self.log.exception(f"Error fetching runtime template list: {str(e)}")
            self.finish({"error": str(e)})
