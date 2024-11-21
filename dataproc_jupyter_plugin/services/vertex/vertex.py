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

from google.cloud import storage
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

    def create_headers(self):
        return {
            "Content-Type": CONTENT_TYPE,
            "Authorization": f"Bearer {self._access_token}",
        }

    async def list_uiconfig(self, region_id):
        try:
            uiconfig = []
            api_endpoint = f"https://{region_id}-aiplatform.googleapis.com/ui/projects/{self.project_id}/locations/{region_id}/uiConfig"

            headers = self.create_headers()
            async with self.client_session.get(
                api_endpoint, headers=headers
            ) as response:
                if response.status == 200:
                    resp = await response.json()
                    if not resp:
                        return uiconfig
                    else:
                        for machineconfig in resp.get("notebookRuntimeConfig").get("machineConfigs"):
                            ramBytes_in_gb = round(int(machineconfig.get('ramBytes')) / 1000000000, 2)
                            formatted_config = {
                                "machineType": f"{machineconfig.get('machineType')} ({machineconfig.get('cpuCount')} CPUs, {ramBytes_in_gb} GB RAM)",
                                "acceleratorConfigs": machineconfig.get("acceleratorConfigs")
                            }
                            uiconfig.append(formatted_config)
                        return uiconfig
                else:
                    self.log.exception("Error listing ui config")
                    raise Exception(
                        f"Error getting vertex ui config: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error fetching ui config: {str(e)}")
            return {"Error fetching ui config": str(e)}

    async def list_region(self):
        try:
            regions = []
            vertex_url = await urls.gcp_service_url(COMPUTE_SERVICE_NAME)
            api_endpoint = f"{vertex_url}/compute/v1/projects/{self.project_id}/regions"

            headers = self.create_headers()
            async with self.client_session.get(
                api_endpoint, headers=headers
            ) as response:
                if response.status == 200:
                    resp = await response.json()
                    if not resp:
                        return regions
                    else:
                        for item in resp.get("items"):
                            region = item.get("name")
                            regions.append(region)
                        return regions
                else:
                    self.log.exception("Error listing regions")
                    raise Exception(
                        f"Error getting regions: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error fetching regions: {str(e)}")
            return {"Error fetching regions": str(e)}

    async def get_network(self):
        try:
            networks = []
            vertex_url = await urls.gcp_service_url(COMPUTE_SERVICE_NAME)
            api_endpoint = f"{vertex_url}/compute/v1/projects/{self.project_id}/global/networks"

            headers = self.create_headers()
            async with self.client_session.get(
                api_endpoint, headers=headers
            ) as response:
                if response.status == 200:
                    resp = await response.json()
                    if not resp:
                        return networks
                    else:
                        for item in resp.get("items"):
                            networks.append(item)
                        return networks
                else:
                    self.log.exception("Error getting network")
                    raise Exception(
                        f"Error getting network: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error fetching network: {str(e)}")
            return {"Error fetching network": str(e)}

    async def get_subnetwork(self):
        try:
            sub_networks = []
            vertex_url = await urls.gcp_service_url(COMPUTE_SERVICE_NAME)
            api_endpoint = f"{vertex_url}/compute/v1/projects/{self.project_id}/regions/{self.region_id}/subnetworks"

            headers = self.create_headers()
            async with self.client_session.get(
                api_endpoint, headers=headers
            ) as response:
                if response.status == 200:
                    resp = await response.json()
                    if not resp:
                        return sub_networks
                    else:
                        for item in resp.get("items"):
                            sub_networks.append(item)
                        return sub_networks
                else:
                    self.log.exception("Error getting sub network")
                    raise Exception(
                        f"Error getting sub network: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error fetching sub network: {str(e)}")
            return {"Error fetching sub network": str(e)}

    async def get_shared_network(self):
        try:
            shared_networks = []
            vertex_url = await urls.gcp_service_url(COMPUTE_SERVICE_NAME)
            api_endpoint = f"{vertex_url}/compute/v1/projects/{self.project_id}/aggregated/subnetworks/listUsable"

            headers = self.create_headers()
            async with self.client_session.get(
                api_endpoint, headers=headers
            ) as response:
                if response.status == 200:
                    resp = await response.json()
                    if not resp:
                        return shared_networks
                    else:
                        for item in resp.get("items"):
                            shared_networks.append(item)
                        return shared_networks
                else:
                    self.log.exception("Error getting shared network")
                    raise Exception(
                        f"Error getting network shared from host: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error fetching shared network: {str(e)}")
            return {"Error fetching network shared from host": str(e)}

    async def get_csb(self):
        try:
            cloud_storage_buckets = []
            storage_client = storage.Client()
            buckets = storage_client.list_buckets()
            for bucket in buckets:
                cloud_storage_buckets.append(bucket.name)
            return cloud_storage_buckets

        except Exception as e:
            self.log.exception(f"Error fetching cloud storage buckets: {str(e)}")
            return {"Error fetching cloud storage buckets": str(e)}
