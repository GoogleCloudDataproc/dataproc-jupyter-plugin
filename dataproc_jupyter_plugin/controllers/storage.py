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
from dataproc_jupyter_plugin.services import storage


class CloudStorageController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        """Returns cloud storage bucket"""
        try:
            async with aiohttp.ClientSession() as client_session:
                client = storage.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                csb = await client.list_bucket()
                self.finish(json.dumps(csb))
        except Exception as e:
            self.log.exception(f"Error fetching cloud storage bucket: {str(e)}")
            self.finish({"error": str(e)})
