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
import aiohttp
from jupyter_server.base.handlers import APIHandler
import tornado
from dataproc_jupyter_plugin import credentials
from dataproc_jupyter_plugin.services import clusterService


class ClusterListPageController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            page_token = self.get_argument("pageToken")
            page_size = self.get_argument("pageSize")
            async with aiohttp.ClientSession() as client_session:
                client = clusterService.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                cluster_list = await client.list_clusters(page_size, page_token)
            self.finish(json.dumps(cluster_list))
        except Exception as e:
            self.log.exception(f"Error fetching cluster list")
            self.finish({"error": str(e)})


class ClusterDetailController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            cluster_selected = self.get_argument("clusterSelected")
            async with aiohttp.ClientSession() as client_session:
                client = clusterService.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                get_cluster = await client.get_cluster_detail(cluster_selected)
            self.finish(json.dumps(get_cluster))
        except Exception as e:
            self.log.exception(f"Error fetching get cluster")
            self.finish({"error": str(e)})


class StopClusterController(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        try:
            cluster_selected = self.get_argument("clusterSelected")
            async with aiohttp.ClientSession() as client_session:
                client = clusterService.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                stop_cluster = await client.post_stop_cluster(cluster_selected)
            self.finish(json.dumps(stop_cluster))
        except Exception as e:
            self.log.exception(f"Error fetching stop cluster")
            self.finish({"error": str(e)})


class StartClusterController(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        try:
            cluster_selected = self.get_argument("clusterSelected")
            async with aiohttp.ClientSession() as client_session:
                client = clusterService.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                start_cluster = await client.post_start_cluster(cluster_selected)
            self.finish(json.dumps(start_cluster))
        except Exception as e:
            self.log.exception(f"Error fetching start cluster")
            self.finish({"error": str(e)})
