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

import proto
from google.cloud import compute_v1
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

    async def list_region(self):
        try:
            regions = []
            client = compute_v1.RegionsClient()
            request = compute_v1.ListRegionsRequest(
                project=self.project_id,
            )
            response = client.list(request=request)
            for item in response:
                regions.append(item.name)
            return regions

        except Exception as e:
            self.log.exception(f"Error fetching regions: {str(e)}")
            return {"Error fetching regions": str(e)}

    async def get_network(self):
        try:
            networks = []
            client = compute_v1.NetworksClient()
            request = compute_v1.ListNetworksRequest(
                project=self.project_id,
            )
            response = client.list(request=request)
            for item in response.items:
                networks.append(
                    proto.Message.to_dict(
                        item,
                        use_integers_for_enums=False,
                        preserving_proto_field_name=False,
                    )
                )
            return networks

        except Exception as e:
            self.log.exception(f"Error fetching network: {str(e)}")
            return {"Error fetching network": str(e)}

    async def get_subnetwork(self, region_id, network_id):
        try:
            sub_networks = []
            client = compute_v1.SubnetworksClient()
            request = compute_v1.ListSubnetworksRequest(
                project=self.project_id,
                region=region_id,
            )
            response = client.list(request=request)
            for item in response.items:
                if network_id in item.network:
                    sub_networks.append(
                        proto.Message.to_dict(
                            item,
                            use_integers_for_enums=False,
                            preserving_proto_field_name=False,
                        )
                    )
            return sub_networks

        except Exception as e:
            self.log.exception(f"Error fetching sub network: {str(e)}")
            return {"Error fetching sub network": str(e)}

    async def get_shared_network(self, project_id, region_id):
        try:
            shared_networks = []
            client = compute_v1.SubnetworksClient()
            request = compute_v1.ListUsableSubnetworksRequest(
                project=project_id,
            )
            response = client.list_usable(request=request)
            for item in response:
                if region_id in item.subnetwork:
                    shared_networks.append(
                        proto.Message.to_dict(
                            item,
                            use_integers_for_enums=False,
                            preserving_proto_field_name=False,
                        )
                    )
            return shared_networks

        except Exception as e:
            self.log.exception(f"Error fetching shared network: {str(e)}")
            return {"Error fetching network shared from host": str(e)}


    async def get_xpn_host(self):
        try:
            res = {}
            api_endpoint = f"https://compute.googleapis.com/compute/v1/projects/{self.project_id}/getXpnHost"
            headers = self.create_headers()
            async with self.client_session.get(
                api_endpoint, headers=headers
            ) as response:
                if response.status == 200:
                    resp = await response.json()
                    if not resp:
                        return res
                    else:
                        res["name"]: resp.get(name)
                        return res
                elif response.status == 204:
                    return res
                else:
                    self.log.exception("Error getting xpn host")
                    raise Exception(
                        f"Error getting the xpn host: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error getting xpn host: {str(e)}")
            return {"Error getting xpn host": str(e)}
