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
from dataproc_jupyter_plugin.services import logEntries


class ListEntriesController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        """Returns log entries"""
        try:
            filter_query = self.get_argument("filter_query")
            logging_client = logEntries.Client(await credentials.get_cached(), self.log)
            logs = await logging_client.list_log_entries(filter_query)
            self.finish(json.dumps(logs))
        except Exception as e:
            self.log.exception(f"Error fetching entries: {str(e)}")
            self.finish({"error": str(e)})
