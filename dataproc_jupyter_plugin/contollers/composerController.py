
import json
from jupyter_server.base.handlers import APIHandler
from dataproc_jupyter_plugin import handlers
from dataproc_jupyter_plugin.services.composerService import ComposerService
from jupyter_server.utils import ensure_async
from requests import HTTPError


class ComposerController(APIHandler):
    def get(self):
        """Returns names of available runtime environments and output formats mappings"""
        print("RUNTIME")
        try:
            environments_manager = ComposerService()
            credentials = handlers.get_cached_credentials(self.log)
            environments = environments_manager.list_environments(credentials)
            output_formats = environments_manager.output_formats_mapping()
            if len(environments) == 0:
                raise HTTPError(404, "Not Found")
        except:
            raise HTTPError(500, "Error")

        response = []
        for environment in environments:
            env = environment.dict()
            formats = env["output_formats"]
            env["output_formats"] = [{"name": f, "label": output_formats[f]} for f in formats]
            response.append(env)
        print(json.dumps(response))
        self.finish(json.dumps(response))


