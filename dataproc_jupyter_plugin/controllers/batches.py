# Copyright 2026 Google LLC
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
import tornado
from jupyter_server.base.handlers import APIHandler
from dataproc_jupyter_plugin import credentials
from dataproc_jupyter_plugin.services.batches import BatchesService


class ListBatchesController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            page_size = self.get_argument("pageSize", default="50")
            page_token = self.get_argument("pageToken", default=None)
            credentials_dict = await credentials.get_cached()
            service = BatchesService(credentials_dict, self.log)
            result = await service.list_batches(page_size, page_token)
            self.finish(json.dumps(result))
        except Exception as e:
            self.log.exception("Error in ListBatchesController")
            self.finish({"error": {"code": 500, "message": str(e)}})


class BatchDetailController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            batch_id = self.get_argument("batch")
            credentials_dict = await credentials.get_cached()
            service = BatchesService(credentials_dict, self.log)
            result = await service.get_batch(batch_id)
            self.finish(json.dumps(result))
        except Exception as e:
            self.log.exception("Error in BatchDetailController")
            self.finish({"error": {"code": 500, "message": str(e)}})
