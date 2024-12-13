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

# import proto
# from google.cloud import logging
from dataproc_jupyter_plugin.commons.constants import (
    CONTENT_TYPE,
)


class Client:
    def __init__(self, credentials, log, client_session):
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
        self.client_session = client_session

    def create_headers(self):
        return {
            "Content-Type": CONTENT_TYPE,
            "Authorization": f"Bearer {self._access_token}",
        }

    async def list_log_entries(self, filter_query=None):
        try:
            # logs = []
            api_endpoint = f"https://logging.googleapis.com/v2/entries:list"
            headers = self.create_headers()
            payload = {
                "resourceNames": [
                    f"projects/{self.project_id}"
                ],
                "filter": filter_query,
                "orderBy": "timestamp desc",
                "pageSize": 1000,
            }

            async with self.client_session.post(
                api_endpoint, headers=headers, json=payload
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    self.log.exception("Error fetching log entries")
                    raise Exception(
                        f"Error fetching log entries: {response.reason} {await response.text()}"
                    )

            # client = logging.Client(project=f"projects/{self.project_id}")
            # log_entries = client.list_entries(
            #     filter=filter_query, page_size=1000, order_by="timestamp desc"
            # )
            # for item in log_entries:
            #     logs.append(
            #         proto.Message.to_dict(
            #             item,
            #             use_integers_for_enums=False,
            #             preserving_proto_field_name=False,
            #         )
            #     )
            # return logs

        except Exception as e:
            self.log.exception(f"Error fetching log entries: {str(e)}")
            return {"Error fetching log entries": str(e)}
