# Copyright 2025 Google LLC
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


from jupyter_server.base.handlers import APIHandler
import tornado
from google.cloud.jupyter_config.config import async_run_gcloud_subcommand
from dataproc_jupyter_plugin import credentials


class CheckApiController(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        """
        Check if a specific GCP API service is enabled for the current project using gcloud.
        """
        service_name = self.get_argument("service_name")
        project_id = await credentials._gcp_project()

        try:
            cmd = f'services list --enabled --project={project_id} --filter="NAME={service_name}"'
            result = await async_run_gcloud_subcommand(cmd)
            is_enabled = bool(result.strip())
            self.finish({"success": True, "is_enabled": is_enabled})
        except Exception as e:
            self.finish({"success": False, "is_enabled": False, "error": str(e)})
