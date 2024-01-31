import json
from jupyter_server.base.handlers import APIHandler
from dataproc_jupyter_plugin import handlers
from dataproc_jupyter_plugin.services.runtimeListService import RuntimeListService


class RuntimeController(APIHandler):
    def get(self):
        try:
            page_token = self.get_argument("pageToken")
            page_size = self.get_argument("pageSize")
            runtime = RuntimeListService()
            credentials = handlers.get_cached_credentials(self.log)
            runtime_list = runtime.list_runtime(credentials,page_size,page_token)
            self.finish(json.dumps(runtime_list))
        except Exception as e:
            self.finish ({"error": str(e)})