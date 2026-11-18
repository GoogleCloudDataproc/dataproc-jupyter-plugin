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
import re

import aiohttp
import tornado
from jupyter_server.base.handlers import APIHandler

from dataproc_jupyter_plugin.services import version

# PEP 508 distribution name format (blocks path traversal and pip CLI option injection).
PACKAGE_NAME_REGEXP = re.compile(r"^[A-Za-z0-9]([A-Za-z0-9._-]*[A-Za-z0-9])?$")


class LatestVersionController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            package_name = self.get_argument("packageName")
            if not PACKAGE_NAME_REGEXP.match(package_name):
                self.set_status(400)
                self.finish({"error": f"Invalid package name: {package_name}"})
                return

            async with aiohttp.ClientSession() as client_session:
                client = version.Client(self.log, client_session)
                version_id = await client.get_latest_version(package_name)

            self.finish(json.dumps(version_id))
        except Exception as e:
            self.log.exception("Error fetching version")
            self.finish({"error": str(e)})


class UpdatePackage(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        try:
            package_name = self.get_argument("packageName")
            if not PACKAGE_NAME_REGEXP.match(package_name):
                self.set_status(400)
                self.finish({"error": f"Invalid package name: {package_name}"})
                return

            client = version.Client(self.log)
            is_updated = await client.updatePlugin(package_name)

            self.finish(json.dumps(is_updated))
        except Exception as e:
            self.log.exception("Error updating package")
            self.finish({"error": str(e)})
