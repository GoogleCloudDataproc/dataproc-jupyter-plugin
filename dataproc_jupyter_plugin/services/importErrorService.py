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


import requests
from dataproc_jupyter_plugin.services.dagListService import DagListService
from dataproc_jupyter_plugin.commons.constants import CONTENT_TYPE


class ImportErrorService:
    def list_import_errors(self, credentials, composer, log):
        airflow_uri, bucket = DagListService.get_airflow_uri(
            self, composer, credentials, log
        )
        try:
            if (
                ("access_token" in credentials)
                and ("project_id" in credentials)
                and ("region_id" in credentials)
            ):
                access_token = credentials["access_token"]
                api_endpoint = (
                    f"{airflow_uri}/api/v1/importErrors?order_by=-import_error_id"
                )

                headers = {
                    "Content-Type": CONTENT_TYPE,
                    "Authorization": f"Bearer {access_token}",
                }
                response = requests.get(api_endpoint, headers=headers)
                if response.status_code == 200:
                    resp = response.json()
                return resp
            else:
                log.exception(f"Missing required credentials")
                raise ValueError("Missing required credentials")
        except Exception as e:
            log.exception(f"Error fetching import error list: {str(e)}")
            return {"error": str(e)}
