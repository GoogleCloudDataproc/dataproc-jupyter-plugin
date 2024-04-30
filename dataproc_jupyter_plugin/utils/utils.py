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

import datetime
import json
import subprocess
from cachetools import TTLCache
from google.cloud.jupyter_config.config import (
    gcp_credentials,
    gcp_project,
    gcp_project_number,
    gcp_region,
)

credentials_cache = None
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
        global credentials_cache
        try:
            if credentials_cache is None or "credentials" not in credentials_cache:
                credentials["project_id"] = gcp_project()
                credentials["region_id"] = gcp_region()
                credentials["config_error"] = 0
                credentials["access_token"] = gcp_credentials()
                credentials["project_number"] = gcp_project_number()
                cmd = "gcloud config config-helper --format=json"
                process = subprocess.Popen(
                    cmd,
                    shell=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                )
                output, error = process.communicate()
                if process.returncode == 0:
                    config_data = json.loads(output)

                    token_expiry = config_data["credential"]["token_expiry"]
                    utc_datetime = datetime.datetime.strptime(
                        token_expiry, "%Y-%m-%dT%H:%M:%SZ"
                    )
                    current_utc_datetime = datetime.datetime.utcnow()
                    expiry_timedelta = utc_datetime - current_utc_datetime
                    expiry_seconds = expiry_timedelta.total_seconds()
                    if expiry_seconds > 1000:
                        ttl_seconds = 1000
                    else:
                        ttl_seconds = expiry_seconds
                    credentials_cache = TTLCache(maxsize=1, ttl=ttl_seconds)
                    credentials_cache["credentials"] = credentials
                    return credentials
                else:
                    return credentials
            else:
                return credentials_cache["credentials"]
        except Exception as ex:
            self.log.exception(f"Error fetching credentials from gcloud")
            credentials["config_error"] = 1
            return credentials
