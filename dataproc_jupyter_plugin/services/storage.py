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

from google.cloud import storage


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

    async def list_bucket(self):
        try:
            cloud_storage_buckets = []
            storage_client = storage.Client()
            buckets = storage_client.list_buckets()
            for bucket in buckets:
                cloud_storage_buckets.append(bucket.name)
            return cloud_storage_buckets

        except Exception as e:
            self.log.exception(f"Error fetching cloud storage buckets: {str(e)}")
            return {"Error fetching cloud storage buckets": str(e)}
