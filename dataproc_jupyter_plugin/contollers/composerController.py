# Copyright 2023 Google LLC
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
from jupyter_server.base.handlers import APIHandler
from dataproc_jupyter_plugin import handlers
from dataproc_jupyter_plugin.services.composerService import ComposerService
from jupyter_server.utils import ensure_async
from requests import HTTPError


class ComposerController(APIHandler):
    def get(self):
        """Returns names of available runtime environments and output formats mappings"""
        try:
            environments_manager = ComposerService()
            credentials = handlers.get_cached_credentials(self.log)
            environments = environments_manager.list_environments(credentials)
            output_formats = environments_manager.output_formats_mapping()
                
        except:
            raise HTTPError(500, "Error")

        response = []
        for environment in environments:
            env = environment.dict()
            formats = env["output_formats"]
            env["output_formats"] = [{"name": f, "label": output_formats[f]} for f in formats]
            response.append(env)
        self.finish(json.dumps(response))


