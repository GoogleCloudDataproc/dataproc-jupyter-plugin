import json
from jupyter_server.base.handlers import APIHandler
from dataproc_jupyter_plugin import handlers
from dataproc_jupyter_plugin.services.runtimeListService import RuntimeListService


class RuntimeController(APIHandler):
    def get(self):
        runtime = RuntimeListService()
        credentials = handlers.get_cached_credentials(self.log)
        runtime_list = runtime.list_runtime(credentials)
        print(runtime_list)
        self.finish(json.dumps(runtime_list))