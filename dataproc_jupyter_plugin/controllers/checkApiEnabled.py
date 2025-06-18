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
from google.cloud import service_usage_v1
from google.cloud.service_usage_v1.types import GetServiceRequest
from dataproc_jupyter_plugin import credentials


class CheckApiController(APIHandler):

    async def post(self, service_name):
        """
        Check if a specific GCP API service is enabled for the current project.
        """
        service_name = self.get_argument("service_name")
        project_id = await credentials._gcp_project()
        client = service_usage_v1.ServiceUsageAsyncClient()
        full_service_name = f"projects/{project_id}/services/{service_name}"
        try:
            request = GetServiceRequest(name=full_service_name)
            service = await client.get_service(request=request)
            is_enabled = service.state == service_usage_v1.types.State.ENABLED
            self.finish({"success": True, "is_enabled": is_enabled})

        except Exception as e:
            self.finish({"success": False, "is_enabled": False, "error": str(e)})
