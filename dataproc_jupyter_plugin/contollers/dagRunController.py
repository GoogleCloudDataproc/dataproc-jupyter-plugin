import json
from jupyter_server.base.handlers import APIHandler
from dataproc_jupyter_plugin import handlers
from dataproc_jupyter_plugin.services.dagRunService import DagRunListService

class DagRunController(APIHandler):
    def get(self):
        dagRun = DagRunListService()
        composer_name = self.get_argument("composer")
        dag_id = self.get_argument("dag_id")
        credentials = handlers.get_cached_credentials(self.log)
        dagRun_list = dagRun.list_jobs(credentials,composer_name,dag_id)
        self.finish(json.dumps(dagRun_list))