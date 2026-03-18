import json
import tornado
import aiohttp
from jupyter_server.base.handlers import APIHandler
from dataproc_jupyter_plugin import credentials
from dataproc_jupyter_plugin.services import biglake

class ListCatalogsController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            async with aiohttp.ClientSession() as client_session:
                client = biglake.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                
                catalogs_data = await client.list_catalogs()
            
            self.finish(json.dumps(catalogs_data))
            
        except Exception as e:
            self.log.exception("Error fetching BigLake catalogs")
            self.finish(json.dumps({"error": str(e)}))

class ListNamespacesController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            catalog_name = self.get_argument("catalog_name")

            async with aiohttp.ClientSession() as client_session:
                client = biglake.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                
                namespaces_data = await client.list_namespaces(catalog_name)
            
            self.finish(json.dumps(namespaces_data))
            
        except Exception as e:
            self.log.exception("Error fetching BigLake namespaces")
            self.finish(json.dumps({"error": str(e)}))
