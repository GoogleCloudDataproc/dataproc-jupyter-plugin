import json
import tornado
from google.api_core.exceptions import GoogleAPICallError
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
        except GoogleAPICallError as e:
            self.log.exception("Google API Error listing clusters")
            status_code = e.code if isinstance(e.code, int) and 100 <= e.code < 600 else 500
            self.set_status(status_code)
            self.finish({"message": str(e), "error": {"code": status_code, "message": str(e)}})
        except ValueError as e:
            self.log.exception("Configuration Error")
            self.set_status(400)
            self.finish({"message": str(e), "error": {"code": 400, "message": str(e)}})
        except Exception as e:
            self.log.exception("Error listing clusters")
            self.set_status(500)
            self.finish({"message": str(e), "error": {"code": 500, "message": str(e)}})


class ClusterDetailController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            cluster_name = self.get_argument("cluster")
            service = DataprocService()
            result = await service.get_cluster_details(cluster_name)
            self.finish(result)
        except GoogleAPICallError as e:
            self.log.exception("Google API Error getting cluster details")
            status_code = e.code if isinstance(e.code, int) and 100 <= e.code < 600 else 500
            self.set_status(status_code)
            self.finish({"message": str(e), "error": {"code": status_code, "message": str(e)}})
        except ValueError as e:
            self.log.exception("Configuration Error")
            self.set_status(400)
            self.finish({"message": str(e), "error": {"code": 400, "message": str(e)}})
        except Exception as e:
            self.log.exception("Error getting cluster details")
            self.set_status(500)
            self.finish({"message": str(e), "error": {"code": 500, "message": str(e)}})
