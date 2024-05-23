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
from dataproc_jupyter_plugin import credentials
from jupyter_server.base.handlers import APIHandler
import tornado
from dataproc_jupyter_plugin.services.importErrorService import ImportErrorService


class ImportErrorController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            import_errors = ImportErrorService()
            composer_name = self.get_argument("composer")
            gcp_credentials = await credentials.get_cached()
            import_errors_list = import_errors.list_import_errors(
                gcp_credentials, composer_name, self.log
            )
            self.finish(json.dumps(import_errors_list))
        except Exception as e:
            self.log.exception(f"Error fetching import error list")
            self.finish({"error": str(e)})
