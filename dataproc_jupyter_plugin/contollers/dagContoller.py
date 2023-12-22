from jupyter_server.base.handlers import APIHandler
from dataproc_jupyter_plugin import handlers
from dataproc_jupyter_plugin.services.dagListService import DagListService

class DagController(APIHandler):
    def get(self):
        dag = DagListService()
        credentials = handlers.get_cached_credentials(self.log)
        dag_list = dag.list_jobs(credentials)
        print(dag_list)