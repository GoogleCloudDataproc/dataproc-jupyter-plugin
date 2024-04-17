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
from jupyter_server.base.handlers import APIHandler
import tornado
from dataproc_jupyter_plugin import handlers
from dataproc_jupyter_plugin.services.clusterService import ClusterService


class ClusterListController(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            page_token = self.get_argument("pageToken")
            page_size = self.get_argument("pageSize")
            cluster = ClusterService()
            credentials = handlers.get_cached_credentials(self.log)
            cluster_list = cluster.list_clusters(
                credentials, page_size, page_token, self.log
            )
            self.finish(json.dumps(cluster_list))
        except Exception as e:
            self.log.exception(f"Error fetching cluster list")
            self.finish({"error": str(e)})

class ClusterDetailController(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            cluster_selected = self.get_argument("clusterSelected")
            cluster = ClusterService()
            credentials = handlers.get_cached_credentials(self.log)
            cluster_list = cluster.get_cluster_detail(
                credentials, cluster_selected, self.log
            )
            self.finish(json.dumps(cluster_list))
        except Exception as e:
            self.log.exception(f"Error fetching cluster list")
            self.finish({"error": str(e)})
