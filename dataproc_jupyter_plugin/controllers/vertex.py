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

import json

import aiohttp
import tornado
from jupyter_server.base.handlers import APIHandler

from dataproc_jupyter_plugin import credentials
from dataproc_jupyter_plugin.services import vertex


class ListNotebookExecutionJobsController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        """Returns list of notebook execution jobs"""
        try:
            region_id = self.get_argument("region_id")
            schedule_id = self.get_argument("schedule_id")
            start_date = self.get_argument("start_date")
            async with aiohttp.ClientSession() as client_session:
                client = vertex.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                jobs = await client.list_notebook_execution_jobs(
                    region_id, schedule_id, start_date
                )
                self.finish(json.dumps(jobs))
        except Exception as e:
            self.log.exception(f"Error fetching notebook execution jobs: {str(e)}")
            self.finish({"error": str(e)})
