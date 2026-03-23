import asyncio
from google.cloud import biglake_v1
from google.oauth2.credentials import Credentials

class Client:
    def __init__(self, credentials, log, client_session):
        self.log = log
        self.client_session = client_session
        if not (
            ("access_token" in credentials)
            and ("project_id" in credentials)
        ):
            self.log.exception("Missing required credentials")
            raise ValueError("Missing required credentials")
            
        self._access_token = credentials["access_token"]
        self.project_id = credentials["project_id"]
        
        creds = Credentials(
            token=self._access_token, 
            quota_project_id=self.project_id
        )
        self.iceberg_client = biglake_v1.IcebergCatalogServiceClient(credentials=creds)

    async def list_catalogs(self):
        """Fetches catalogs using the official BigLake Iceberg SDK."""
        try:
            loop = asyncio.get_running_loop()
            catalog_list = []
            
            parent = f"projects/{self.project_id}"

            def _fetch_catalogs():
                return list(self.iceberg_client.list_iceberg_catalogs(parent=parent))

            catalogs = await loop.run_in_executor(None, _fetch_catalogs)

            for catalog in catalogs:
                catalog_list.append({
                    "name": catalog.name,
                    "displayName": catalog.name.split("/")[-1]
                })
            
            return {"catalogs": catalog_list}
            
        except Exception as e:
            error_msg = getattr(e, 'message', str(e))
            self.log.exception(f"Error fetching Iceberg catalogs via SDK: {error_msg}")
            return {"error": error_msg, "catalogs": []}

    # --- NEW METHOD FOR NAMESPACES ---
    # async def list_namespaces(self, catalog_name):
    #     """Fetches namespaces (databases) using the official PyIceberg SDK."""
    #     try:
    #         loop = asyncio.get_running_loop()
    #         namespace_list = []

    #         def _fetch_namespaces():
    #             # Import inside the function to keep the global namespace fast and clean
    #             from pyiceberg.catalog import load_catalog
                
    #             # Initialize the official Apache PyIceberg SDK for BigLake
    #             # The PyIceberg REST catalog automatically handles the backend routing
    #             catalog = load_catalog(
    #                 "biglake_catalog",
    #                 **{
    #                     "type": "rest",
    #                     # We pass the exact BigLake REST URI base
    #                     "uri": "https://biglake.googleapis.com/iceberg/v1/restcatalog",
    #                     # The prefix acts as the specific Google Cloud catalog path
    #                     "prefix": f"v1/{catalog_name}", 
    #                     "token": self._access_token,
    #                     "header.x-goog-user-project": self.project_id
    #                 }
    #             )
                
    #             # The SDK perfectly wraps the REST endpoint you found in the docs!
    #             return catalog.list_namespaces()

    #         # Run it non-blocking
    #         namespaces = await loop.run_in_executor(None, _fetch_namespaces)

    #         # PyIceberg returns a list of tuples (e.g., ("default",) or ("sales", "eu"))
    #         for ns in namespaces:
    #             # Join the tuple into a clean string for your UI
    #             name_str = ".".join(ns)
    #             namespace_list.append({
    #                 "name": name_str,
    #                 "displayName": name_str.split(".")[-1]
    #             })
            
    #         return {"namespaces": namespace_list}
            
    #     except Exception as e:
    #         self.log.exception(f"Error fetching Iceberg namespaces via PyIceberg SDK: {e}")
    #         return {"error": str(e), "namespaces": []}
    async def list_namespaces(self, catalog_name):
        """Fetches namespaces using the exact BigLake Iceberg REST API endpoint."""
        try:
            # 1. Hit the exact Google Cloud Data Plane URL
            # catalog_name format: projects/{project_id}/catalogs/{catalog_id}
            api_endpoint = f"https://biglake.googleapis.com/iceberg/v1/restcatalog/v1/{catalog_name}/namespaces"
            
            # 2. Pass Google Auth + Billing headers
            headers = {
                "Authorization": f"Bearer {self._access_token}",
                "X-Goog-User-Project": self.project_id,
                "Content-Type": "application/json"
            }

            # 3. Fetch asynchronously using your existing aiohttp session
            async with self.client_session.get(api_endpoint, headers=headers) as response:
                if response.status == 200:
                    resp_json = await response.json()
                    namespace_list = []
                    
                    # The Iceberg REST spec returns nested arrays: {"namespaces": [["default"]]}
                    if "namespaces" in resp_json:
                        for ns_array in resp_json["namespaces"]:
                            name_str = ".".join(ns_array)
                            namespace_list.append({
                                "name": name_str,
                                "displayName": name_str.split(".")[-1]
                            })
                            
                    return {"namespaces": namespace_list}
                else:
                    error_text = await response.text()
                    self.log.error(f"BigLake REST API Error: {response.status} - {error_text}")
                    return {"error": f"API returned {response.status}", "namespaces": []}
            
        except Exception as e:
            self.log.exception(f"Error fetching namespaces via REST API: {e}")
            return {"error": str(e), "namespaces": []}

    async def list_tables(self, catalog_name, db_name):
        try:
            api_endpoint = f"https://biglake.googleapis.com/iceberg/v1/restcatalog/v1/{catalog_name}/namespaces/{db_name}/tables"
            
            headers = {
                "Authorization": f"Bearer {self._access_token}",
                "X-Goog-User-Project": self.project_id,
                "Content-Type": "application/json"
            }

            async with self.client_session.get(api_endpoint, headers=headers) as response:
                if response.status == 200:
                    resp_json = await response.json()
                    table_list = []
                    
                    # FIX: Look for 'identifiers' instead of 'tables'
                    if "identifiers" in resp_json:
                        for table in resp_json["identifiers"]:
                            table_list.append({
                                'name': table['name'], # This successfully grabs "flowers_iceberg"
                                'type': 'TABLE'
                            })
                            
                    # We still return the dictionary with the "tables" key 
                    # because that is what your frontend service.tsx expects!
                    return {"tables": table_list}
                else:
                    error_text = await response.text()
                    self.log.error(f"BigLake REST API Error: {response.status} - {error_text}")
                    return {"error": f"API returned {response.status}", "tables": []}
            
        except Exception as e:
            self.log.exception(f"Error fetching tables via REST API: {e}")
            return {"error": str(e), "tables": []}

        
    async def get_column_details(self, catalog_name, db_name, table_name):
        """Fetches table schema details using the BigLake Iceberg REST API."""
        try:
            # FIX: Ensure the catalog name includes the full Google Cloud resource path.
            # If the frontend only passes "shubh-biglake-catalog", this builds the required full path.
            if "projects/" not in catalog_name:
                catalog_name = f"projects/{self.project_id}/catalogs/{catalog_name}"

            # Construct the full REST path
            api_endpoint = f"https://biglake.googleapis.com/iceberg/v1/restcatalog/v1/{catalog_name}/namespaces/{db_name}/tables/{table_name}"
            
            headers = {
                "Authorization": f"Bearer {self._access_token}",
                "X-Goog-User-Project": self.project_id,
                "Content-Type": "application/json"
            }

            async with self.client_session.get(api_endpoint, headers=headers) as response:
                if response.status == 200:
                    resp_json = await response.json()
                    
                    # Extract the metadata dictionary
                    metadata = resp_json.get("metadata", {})
                    schemas = metadata.get("schemas", [])
                    current_schema_id = metadata.get("current-schema-id", 0)
                    
                    # Find the active schema by ID (fallback to the first schema if ID matching fails)
                    target_schema = next((s for s in schemas if s.get("schema-id") == current_schema_id), None)
                    if not target_schema and schemas:
                        target_schema = schemas[0]
                        
                    formatted_fields = []
                    
                    if target_schema:
                        for field in target_schema.get("fields", []):
                            # Map Iceberg types to generic BQ/SQL UI types to match your mock setup
                            raw_type = field.get("type", "string")
                            if isinstance(raw_type, str):
                                type_str = raw_type.upper()
                                if type_str == "INT": type_str = "INTEGER"
                                elif type_str == "DOUBLE": type_str = "FLOAT"
                                elif type_str == "TIMESTAMPTZ": type_str = "TIMESTAMP"
                            else:
                                # Fallback if 'type' is a complex struct object in Iceberg
                                type_str = "RECORD/STRUCT"

                            formatted_fields.append({
                                "name": field.get("name"),
                                "type": type_str,
                                "mode": "REQUIRED" if field.get("required") else "NULLABLE"
                            })

                    return {
                        "tableId": table_name,
                        "schema": {
                            "fields": formatted_fields
                        }
                    }
                else:
                    error_text = await response.text()
                    self.log.error(f"BigLake REST API Error fetching columns: {response.status} - {error_text}")
                    return {"error": f"API returned {response.status}", "tableId": table_name, "schema": {"fields": []}}
            
        except Exception as e:
            self.log.exception(f"Error fetching columns via REST API: {e}")
            return {"error": str(e), "tableId": table_name, "schema": {"fields": []}}
