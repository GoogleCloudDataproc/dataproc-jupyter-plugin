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
import asyncio
import subprocess
import sys


class Client:
    def __init__(self, log, client_session=None):
        self.log = log
        self.client_session = client_session

    async def get_latest_version(self, package_name):
        try:
            if self.client_session is None:
                raise ValueError(
                    "client_session is required to fetch the latest version"
                )
            async with self.client_session.get(
                f"https://pypi.org/pypi/{package_name}/json", timeout=3
            ) as response:
                response.raise_for_status()
                data = await response.json()
                return data["info"]["version"]

        except Exception as e:
            self.log.exception("Error fetching jupyter lab version")
            return {"error": str(e)}

    def upgrade_package(self, package_name):
        try:
            subprocess.check_call(
                [sys.executable, "-m", "pip", "install", "--upgrade", package_name]
            )
        except subprocess.CalledProcessError as e:
            self.log.exception(f"Failed to upgrade package: {package_name}")
            raise e

    async def updatePlugin(self, package_name):
        await asyncio.to_thread(self.upgrade_package, package_name)
        return {"status": "ok"}