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
import tornado
from jupyter_server.base.handlers import APIHandler
from dataproc_jupyter_plugin.commons.vertexPlatform import _parse_vertexai_flag

class VertexPlatformController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            return self.finish({"enabled": _parse_vertexai_flag()})

        except Exception as e:
            return self.finish({"error": str(e)})
