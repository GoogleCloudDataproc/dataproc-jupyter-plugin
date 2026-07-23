import json
import tornado
from jupyter_server.base.handlers import APIHandler
from dataproc_jupyter_plugin.services.dataproc import DataprocService

class ListClustersController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            page_size = int(self.get_argument("pageSize", 50))
            page_token = self.get_argument("pageToken", "")
            service = DataprocService()
            result = await service.list_clusters(page_size, page_token)
            self.finish(result)
        except Exception as e:
            self.log.exception("Error listing clusters")
            self.set_status(500)
            self.finish({"error": {"code": 500, "message": str(e)}})


class ClusterDetailController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            cluster_name = self.get_argument("cluster")
            service = DataprocService()
            result = await service.get_cluster_details(cluster_name)
            self.finish(result)
        except Exception as e:
            self.log.exception("Error getting cluster details")
            self.set_status(500)
            self.finish({"error": {"code": 500, "message": str(e)}})

class StopClusterController(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        try:
            cluster_name = self.get_argument("cluster")
            service = DataprocService()
            result = await service.stop_cluster(cluster_name)
            self.finish(result)
        except Exception as e:
            self.log.exception("Error stopping cluster")
            self.set_status(500)
            self.finish({"error": {"code": 500, "message": str(e)}})

class StartClusterController(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        try:
            cluster_name = self.get_argument("cluster")
            service = DataprocService()
            result = await service.start_cluster(cluster_name)
            self.finish(result)
        except Exception as e:
            self.log.exception("Error starting cluster")
            self.set_status(500)
            self.finish({"error": {"code": 500, "message": str(e)}})

class DeleteClusterController(APIHandler):
    @tornado.web.authenticated
    async def delete(self):
        try:
            cluster_name = self.get_argument("cluster")
            service = DataprocService()
            result = await service.delete_cluster(cluster_name)
            self.finish(result)
        except Exception as e:
            self.log.exception("Error deleting cluster")
            self.set_status(500)
            self.finish({"error": {"code": 500, "message": str(e)}})
