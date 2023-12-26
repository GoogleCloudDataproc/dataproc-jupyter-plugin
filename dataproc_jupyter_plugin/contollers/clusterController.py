import json
from jupyter_server.base.handlers import APIHandler
from dataproc_jupyter_plugin import handlers
from dataproc_jupyter_plugin.services.clusterListService import ClusterListService


class ClusterController(APIHandler):
    def get(self):
        page_token = self.get_query_arguments("pageToken")
        pagae_size = self.get_query_arguments("pageSize")
        cluster = ClusterListService()
        credentials = handlers.get_cached_credentials(self.log)
        cluster_list = cluster.list_clusters(credentials,page_token,pagae_size)
        # print(cluster_list)
        self.finish(json.dumps(cluster_list))