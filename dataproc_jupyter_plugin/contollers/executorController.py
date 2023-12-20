
import json
from jupyter_server.base.handlers import APIHandler


from dataproc_jupyter_plugin import handlers
from dataproc_jupyter_plugin.services.executorService import ExecutorService
class ExecutorController(APIHandler):
    def get(self):
        execute  = ExecutorService()
        credentials = handlers.get_cached_credentials(self.log)
        execute.execute(credentials)

