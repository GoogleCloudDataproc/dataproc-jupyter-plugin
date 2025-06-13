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
import aiohttp
import subprocess
import sys
from jupyter_server.base.handlers import APIHandler

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


    async def get_latest_version(self, package_name):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"https://pypi.org/pypi/{package_name}/json", timeout=3) as response:
                    response.raise_for_status()
                    data = await response.json()
                    return data["info"]["version"]

        except Exception as e:
            self.log.exception("Error fetching jupyter lab version")
            return {"error": str(e)}


    def upgrade_package(self, package_name):
        try:
            print("installing...................")
            subprocess.check_call([sys.executable, "-m", "pip", "install", "--upgrade", package_name])
        except subprocess.CalledProcessError as e:
            self.log.exception(f"Failed to upgrade package: {package_name}")
            raise e


    async def updatePlugin(self, package_name):
        self.upgrade_package(package_name)
        return {"status": "ok"}
 