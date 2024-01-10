import json
from jupyter_server.base.handlers import APIHandler
from dataproc_jupyter_plugin import handlers
from dataproc_jupyter_plugin.services.dagRunService import DagRunListService, DagRunTaskListService

class DagRunController(APIHandler):
    def get(self):
        dagRun = DagRunListService()
        composer_name = self.get_argument("composer")
        dag_id = self.get_argument("dag_id")
        start_date = self.get_argument("start_date")
        end_date = self.get_argument("end_date")
        credentials = handlers.get_cached_credentials(self.log)
        dagRun_list = dagRun.list_jobs(credentials,composer_name,dag_id,start_date,end_date)
        self.finish(json.dumps(dagRun_list))

class DagRunTaskController(APIHandler):
    def get(self):
        dagRun = DagRunTaskListService()
        composer_name = self.get_argument("composer")
        dag_id = self.get_argument("dag_id")
        dag_run_id = self.get_argument("dag_run_id")
        credentials = handlers.get_cached_credentials(self.log)
        dagRun_list = dagRun.list_jobs(credentials,composer_name,dag_id,dag_run_id)
        self.finish(json.dumps(dagRun_list))
