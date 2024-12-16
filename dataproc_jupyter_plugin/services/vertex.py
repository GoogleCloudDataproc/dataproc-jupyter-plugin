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

    async def list_notebook_execution_jobs(self, region_id, schedule_id, start_date):
        try:
            execution_jobs = []
            api_endpoint = f"https://{region_id}-aiplatform.googleapis.com/v1/projects/{self.project_id}/locations/{region_id}/notebookExecutionJobs?filter=schedule={schedule_id}&orderBy=createTime desc"

            headers = self.create_headers()
            async with self.client_session.get(
                api_endpoint, headers=headers
            ) as response:
                if response.status == 200:
                    resp = await response.json()
                    if not resp:
                        return execution_jobs
                    else:
                        jobs = resp.get("notebookExecutionJobs")
                        for job in jobs:
                            if if start_date.rsplit('-',1)[0] == job.get('createTime').rsplit('-',1)[0]:
                                execution_jobs.append(job)
                        return execution_jobs
                else:
                    self.log.exception("Error fetching notebook execution jobs")
                    raise Exception(
                        f"Error fetching notebook execution jobs: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error fetching list of notebook execution jobs: {str(e)}")
            return {"Error fetching list of notebook execution jobs": str(e)}