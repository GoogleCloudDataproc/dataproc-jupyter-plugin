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
from dataproc_jupyter_plugin.utils.utils import GetCachedCredentials
from jupyter_server.base.handlers import APIHandler
import tornado
from dataproc_jupyter_plugin.services.composerService import ComposerService
from requests import HTTPError


class ComposerListController(APIHandler):
    @tornado.web.authenticated
    def get(self):
        """Returns names of available composer environments"""
        try:
            environments_manager = ComposerService()
            credentials = GetCachedCredentials.get_cached_credentials(self.log)
            environments = environments_manager.list_environments(credentials, self.log)

        except Exception as e:
            self.log.exception(f"Error fetching composer environments: {str(e)}")
            self.finish({"error": str(e)})

        response = []
        for environment in environments:
            env = environment.dict()
            response.append(env)
        self.finish(json.dumps(response))
