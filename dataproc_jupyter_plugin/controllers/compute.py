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

import aiohttp
import tornado
from jupyter_server.base.handlers import APIHandler

from dataproc_jupyter_plugin import credentials
from dataproc_jupyter_plugin.services import compute


class RegionController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        """Returns available regions"""
        try:
            async with aiohttp.ClientSession() as client_session:
                client = compute.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                regions = await client.list_region()
                self.finish(json.dumps(regions))
        except Exception as e:
            self.log.exception(f"Error fetching regions: {str(e)}")
            self.finish({"error": str(e)})


class NetworkController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        """Returns network"""
        try:
            async with aiohttp.ClientSession() as client_session:
                client = compute.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                network = await client.get_network()
                self.finish(json.dumps(network))
        except Exception as e:
            self.log.exception(f"Error fetching network: {str(e)}")
            self.finish({"error": str(e)})


class SubNetworkController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        """Returns sub network"""
        try:
            region_id = self.get_argument("region_id")
            network_id = self.get_argument("network_id")
            async with aiohttp.ClientSession() as client_session:
                client = compute.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                sub_network = await client.get_subnetwork(region_id, network_id)
                self.finish(json.dumps(sub_network))
        except Exception as e:
            self.log.exception(f"Error fetching sub network: {str(e)}")
            self.finish({"error": str(e)})


class SharedNetworkController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        """Returns shared network"""
        try:
            project_id = self.get_argument("project_id")
            region_id = self.get_argument("region_id")
            async with aiohttp.ClientSession() as client_session:
                client = compute.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                shared_network = await client.get_shared_network(project_id, region_id)
                self.finish(json.dumps(shared_network))
        except Exception as e:
            self.log.exception(f"Error fetching network shared from host: {str(e)}")
            self.finish({"error": str(e)})


class GetXpnHostController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            async with aiohttp.ClientSession() as client_session:
                client = compute.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                xpn_host = await client.get_xpn_host()
                self.finish(json.dumps(xpn_host))
        except Exception as e:
            self.log.exception(f"Error fetching xpn host: {str(e)}")
            self.finish({"error": str(e)})
