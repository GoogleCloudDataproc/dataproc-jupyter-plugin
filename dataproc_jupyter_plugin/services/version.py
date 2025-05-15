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
import json
import os
import subprocess
import sys
import pkg_resources
from jupyter_server.base.handlers import APIHandler
import tornado
 
from dataproc_jupyter_plugin import urls
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

        # Load package name during initialization
        self.package_name = self.load_package_name()
        self.package_version = self.load_package_version()

    def load_package_name(self):
        try:
            root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
            file_path = os.path.join(root_path, "package.json")
            with open(file_path, "r") as f:
                package_data = json.load(f)
                return package_data.get("name", "unknown-package")
        except Exception as e:
            self.log.exception("Failed to load package.json")
            return "unknown-package"
        
    def load_package_version(self):
        try:
            root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
            file_path = os.path.join(root_path, "package.json")
            with open(file_path, "r") as f:
                package_data = json.load(f)
                return package_data.get("version", "unknown-version")
        except Exception as e:
            self.log.exception("Failed to load package.json")
            return "unknown-package"
        
    def create_headers(self):
        return {
            "Content-Type": CONTENT_TYPE,
            "Authorization": f"Bearer {self._access_token}",
        }

    async def get_latest_version(self):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"https://pypi.org/pypi/{self.package_name}/json", timeout=3) as response:
                    response.raise_for_status()
                    data = await response.json()
                    return data["info"]["version"]

        except Exception as e:
            self.log.exception("Error fetching jupyter lab version")
            return {"error": str(e)}


    async def is_update_available(self):
        try:
            installed = self.package_version
            latest = await self.get_latest_version()
            return latest > self.package_version, installed, latest
        except Exception:
            return False, None, None
    

    def upgrade_package(self):
        print("installing...................")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--upgrade", self.package_name])
 

    async def updatePlugin(self):
        self.upgrade_package()
        self.finish({"status": "ok"})
 