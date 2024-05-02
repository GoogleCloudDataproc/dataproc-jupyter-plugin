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


from google.cloud.jupyter_config.config import (
    gcp_credentials,
    gcp_project,
    gcp_project_number,
    gcp_region
)

class GetCachedCredentials:
    def get_cached_credentials(self):
        credentials = {
            "project_id": "",
            "project_number": 0,
            "region_id": "",
            "access_token": "",
            "config_error": 0,
            "login_error": 0,
        }

        try:
            credentials["project_id"] = gcp_project()
            credentials["region_id"] = gcp_region()
            credentials["config_error"] = 0
            credentials["access_token"] = gcp_credentials()
            credentials["project_number"] = gcp_project_number()
            return credentials
        except Exception as ex:
            self.log.exception(f"Error fetching credentials from gcloud ", ex)
            credentials["config_error"] = 1
            return credentials
