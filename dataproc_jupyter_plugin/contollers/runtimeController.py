import json
from jupyter_server.base.handlers import APIHandler
from dataproc_jupyter_plugin import handlers
from dataproc_jupyter_plugin.services.runtimeListService import RuntimeListService


class RuntimeController(APIHandler):
    def get(self):
        page_token = self.get_query_arguments("pageToken")
        pagae_size = self.get_query_arguments("pageSize")
        runtime = RuntimeListService()
        credentials = handlers.get_cached_credentials(self.log)
        runtime_list = runtime.list_runtime(credentials,page_token,pagae_size)
        print(runtime_list)
        self.finish(json.dumps(runtime_list))