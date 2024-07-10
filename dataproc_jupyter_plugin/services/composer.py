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


from typing import List

from dataproc_jupyter_plugin import urls
from dataproc_jupyter_plugin.commons.constants import (
    COMPOSER_SERVICE_NAME,
    CONTENT_TYPE,
)
from dataproc_jupyter_plugin.models.models import ComposerEnvironment


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

    def create_headers(self):
        return {
            "Content-Type": CONTENT_TYPE,
            "Authorization": f"Bearer {self._access_token}",
        }

    async def list_environments(self) -> List[ComposerEnvironment]:
        try:
            environments = []
            composer_url = await urls.gcp_service_url(COMPOSER_SERVICE_NAME)
            api_endpoint = f"{composer_url}/v1/projects/{self.project_id}/locations/{self.region_id}/environments"

            headers = self.create_headers()
            async with self.client_session.get(
                api_endpoint, headers=headers
            ) as response:
                if response.status == 200:
                    resp = await response.json()
                    if not resp:
                        return environments
                    else:
                        environment = resp.get("environments", [])
                        # Extract the 'name' values from the 'environments' list
                        names = [env["name"] for env in environment]
                        # Extract the last value after the last slash for each 'name'
                        last_values = [name.split("/")[-1] for name in names]
                        for env in last_values:
                            name = env
                            environments.append(
                                ComposerEnvironment(
                                    name=name,
                                    label=name,
                                    description=f"Environment: {name}",
                                    file_extensions=["ipynb"],
                                    metadata={"path": env},
                                )
                            )
                        return environments
                else:
                    self.log.exception("Error listing environments")
                    raise Exception(
                        f"Error getting composer list: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error fetching environments list: {str(e)}")
            return {"Error fetching environments list": str(e)}
