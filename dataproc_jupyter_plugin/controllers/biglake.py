import json
import tornado
import aiohttp
from jupyter_server.base.handlers import APIHandler
from dataproc_jupyter_plugin import credentials
from dataproc_jupyter_plugin.services import biglake
import logging

class ListCatalogsController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            # 1. Retrieve the project_id sent from the frontend (default to None if not provided)
            project_id = self.get_argument("project_id", default=None)

            async with aiohttp.ClientSession() as client_session:
                creds = await credentials.get_cached()
                client = biglake.Client(creds, client_session, self.log)
                
                # 2. Pass the project_id down so the service knows if it's querying public data
                catalogs_data = await client.list_catalogs(project_id=project_id)
            
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
                creds = await credentials.get_cached()
                client = biglake.Client(creds, client_session, self.log)
                
                namespaces_data = await client.list_namespaces(catalog_name)
            
            self.finish(json.dumps(namespaces_data))
            
        except Exception as e:
            self.log.exception("Error fetching BigLake namespaces")
            self.finish(json.dumps({"error": str(e)}))

class ListTablesController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            # 1. Retrieve the parameters sent from service.tsx
            catalog_name = self.get_argument("catalog_name")
            namespace_name = self.get_argument("namespace_name")

            # 2. Initialize the client session
            async with aiohttp.ClientSession() as client_session:
                creds = await credentials.get_cached()
                client = biglake.Client(creds, client_session, self.log)
                
                # 3. Call the list_tables method from services/biglake.py
                # Note: We pass namespace_name as the db_name parameter
                tables_data = await client.list_tables(catalog_name, namespace_name)
            
            # 4. Send the successful JSON response back to the frontend
            self.finish(json.dumps(tables_data))
            
        except Exception as e:
            self.log.exception(f"Error fetching BigLake tables for catalog {catalog_name} and namespace {namespace_name}")
            # Match the frontend's expected format on error (returning an empty array for tables)
            self.finish(json.dumps({"error": str(e), "tables": []}))

class GetColumnDetailsController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        # Default value to avoid NameError in 'except' block
        table_name = "unknown" 
        try:
            catalog_name = self.get_argument("catalog_name")
            namespace_name = self.get_argument("namespace_name")
            table_name = self.get_argument("table_name")

            async with aiohttp.ClientSession() as client_session:
                creds = await credentials.get_cached()
                client = biglake.Client(creds, client_session, self.log)
                
                schema_data = await client.get_column_details(
                    catalog_name, namespace_name, table_name
                )
            
            self.write(schema_data)
            
        except Exception as e:
            self.log.exception(f"Error fetching BigLake columns for table: {table_name}")
            self.set_status(500)
            self.write({
                "error": str(e), 
                "tableId": table_name, 
                "schema": {"fields": []}
            })