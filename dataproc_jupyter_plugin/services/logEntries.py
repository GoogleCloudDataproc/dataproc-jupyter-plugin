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

from google.cloud import logging
import google.oauth2.credentials as oauth2

from dataproc_jupyter_plugin.commons.constants import (
    CONTENT_TYPE,
)


class Client:
    def __init__(self, credentials, log):
        self.log = log
        if not (
            ("access_token" in credentials)
            and ("project_id" in credentials)
            and ("region_id" in credentials)
        ):
            self.log.exception("Missing required credentials")
            raise ValueError("Missing required credentials")
        self._access_token = credentials["access_token"]
        self.project_id = credentials["project_id"]
        self.region_id = credentials["region_id"]

    def create_headers(self):
        return {
            "Content-Type": CONTENT_TYPE,
            "Authorization": f"Bearer {self._access_token}",
        }

    async def list_log_entries(self, filter_query=None):
        try:
            logs = []
            credentials = oauth2.Credentials(token=self._access_token)
            logging_client = logging.Client(
                project=self.project_id, credentials=credentials
            )
            log_entries = logging_client.list_entries(
                filter_=filter_query, page_size=1000, order_by="timestamp desc"
            )
            for item in log_entries:
                log_dict = item.to_api_repr()
                logs.append(log_dict)
            return logs

        except Exception as e:
            self.log.exception(f"Error fetching log entries: {str(e)}")
            return {"Error fetching log entries": str(e)}
