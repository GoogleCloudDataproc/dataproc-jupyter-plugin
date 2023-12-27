
import json
from jupyter_server.base.handlers import APIHandler
import tornado


from dataproc_jupyter_plugin import handlers
from dataproc_jupyter_plugin.services.executorService import ExecutorService
class ExecutorController(APIHandler):
    @tornado.web.authenticated
    def post(self):
        input_data = self.get_json_body()
        execute  = ExecutorService()
        credentials = handlers.get_cached_credentials(self.log)
        execute.execute(credentials,input_data)

