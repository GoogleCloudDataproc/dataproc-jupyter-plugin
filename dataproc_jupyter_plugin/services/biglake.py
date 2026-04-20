import asyncio
from google.cloud import biglake_v1
from google.oauth2.credentials import Credentials
from google.api_core import exceptions as gcp_exceptions
from google.auth import exceptions as auth_exceptions

# Import the constant for the public dataset project
from dataproc_jupyter_plugin.commons.constants import (
    BQ_PUBLIC_DATASET_PROJECT_ID,BASE_PROJECT_ID,PAGE_SIZE_LIMIT
)

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

    def _resolve_catalog_path(self, catalog_name: str) -> str:
        """Helper to ensure the catalog name is a fully qualified Google Cloud resource path."""
        if "projects/" in catalog_name:
            return catalog_name
            
        # If it's the known public catalog, map it to the exact public path
        if catalog_name == "biglake-public-nyc-taxi-iceberg":
            return f"projects/{BQ_PUBLIC_DATASET_PROJECT_ID}/catalogs/{catalog_name}"
            
        # Otherwise, fall back to the user's personal project path
        return f"projects/{self.project_id}/catalogs/{catalog_name}"

    def _get_rest_headers(self, catalog_path: str, needs_vended_credentials: bool = False) -> dict:
        """Generates headers. Injects 'vended-credentials' ONLY when explicitly requested (for table metadata)."""
        headers = {
            "Authorization": f"Bearer {self._access_token}",
            "X-Goog-User-Project": self.project_id,
            "Content-Type": "application/json"
        }
        
        # Mirroring TS: Only inject the header for get_column_details (table metadata) on the public catalog
        if needs_vended_credentials and (BQ_PUBLIC_DATASET_PROJECT_ID in catalog_path or "biglake-public-nyc-taxi-iceberg" in catalog_path):
            headers["X-Iceberg-Access-Delegation"] = "vended-credentials"
            
        return headers

    async def list_catalogs(self, project_id=None):
        """Fetches catalogs. Hardcodes the response for public datasets."""
        try:
            loop = asyncio.get_running_loop()
            catalog_list = []
            
            target_project = project_id if project_id else self.project_id
            
            # 1. Hardcoded Catalog Level (Matches listBigLakeCatalogs in TS)
            if target_project == BQ_PUBLIC_DATASET_PROJECT_ID:
                return {
                    "catalogs": [{
                        "name": "biglake-public-nyc-taxi-iceberg",
                        "displayName": "biglake-public-nyc-taxi-iceberg"
                    }]
                }

            # Normal execution for user projects
            parent = f"projects/{target_project}"

            def _fetch_catalogs():
                return list(self.iceberg_client.list_iceberg_catalogs(parent=parent))

            catalogs = await loop.run_in_executor(None, _fetch_catalogs)

            for catalog in catalogs:
                catalog_list.append({
                    "name": catalog.name,
                    "displayName": catalog.name.split("/")[-1]
                })
            
            return {"catalogs": catalog_list}
            
        except gcp_exceptions.PermissionDenied as e:
            error_msg = "You do not have permission to view BigLake catalogs. Please ensure the BigLake API is enabled and you have the correct IAM permissions."
            self.log.warning(f"Permission denied fetching Iceberg catalogs: {getattr(e, 'message', str(e))}")
            return {"error": error_msg, "catalogs": []}
        except auth_exceptions.RefreshError:
            self.log.warning("Authentication token expired.")
            return {"error": "Authentication token expired. Please log in again.", "catalogs": []}
        except gcp_exceptions.GoogleAPIError as e:
            self.log.error(f"GCP API Error fetching Iceberg catalogs: {getattr(e, 'message', str(e))}")
            return {"error": "An error occurred while communicating with Google Cloud.", "catalogs": []}
        except Exception as e:
            error_msg = getattr(e, 'message', str(e))
            self.log.exception(f"Unexpected error fetching Iceberg catalogs via SDK: {error_msg}")
            return {"error": error_msg, "catalogs": []}

    async def list_namespaces(self, catalog_name):
        """Fetches namespaces dynamically. No special headers required."""
        try:
            catalog_path = self._resolve_catalog_path(catalog_name)
            api_endpoint = f"https://biglake.googleapis.com/iceberg/v1/restcatalog/v1/{catalog_path}/namespaces"
            
            # 2. Dynamic Call, Standard Headers (Matches listBigLakeNamespaces in TS)
            headers = self._get_rest_headers(catalog_path, needs_vended_credentials=False)

            async with self.client_session.get(api_endpoint, headers=headers) as response:
                if response.status == 200:
                    resp_json = await response.json()
                    namespace_list = []
                    
                    if "namespaces" in resp_json:
                        for ns_array in resp_json["namespaces"]:
                            name_str = ".".join(ns_array)
                            namespace_list.append({
                                "name": name_str,
                                "displayName": name_str.split(".")[-1]
                            })
                            
                    return {"namespaces": namespace_list}
                elif response.status == 403:
                    error_text = await response.text()
                    self.log.warning(f"Permission denied fetching BigLake namespaces: {error_text}")
                    return {"error": "You do not have permission to view namespaces. Please ensure the BigLake API is enabled and you have the correct IAM permissions.", "namespaces": []}
                else:
                    error_text = await response.text()
                    self.log.error(f"BigLake REST API Error: {response.status} - {error_text}")
                    return {"error": f"An error occurred while fetching namespaces: API returned status {response.status}", "namespaces": []}
            
        except auth_exceptions.RefreshError:
            self.log.warning("Authentication token expired.")
            return {"error": "Authentication token expired. Please log in again.", "namespaces": []}
        except Exception as e:
            self.log.exception(f"Unexpected error fetching namespaces via REST API: {e}")
            return {"error": str(e), "namespaces": []}

    async def list_tables(self, catalog_name, db_name):
        """Fetches tables dynamically. No special headers required."""
        try:
            catalog_path = self._resolve_catalog_path(catalog_name)
            api_endpoint = f"https://biglake.googleapis.com/iceberg/v1/restcatalog/v1/{catalog_path}/namespaces/{db_name}/tables"
            
            # 2. Dynamic Call, Standard Headers (Matches listBigLakeTables in TS)
            headers = self._get_rest_headers(catalog_path, needs_vended_credentials=False)

            async with self.client_session.get(api_endpoint, headers=headers) as response:
                if response.status == 200:
                    resp_json = await response.json()
                    table_list = []
                    
                    if "identifiers" in resp_json:
                        for table in resp_json["identifiers"]:
                            table_list.append({
                                'name': table['name'], 
                                'type': 'TABLE'
                            })
                            
                    return {"tables": table_list}
                elif response.status == 403:
                    error_text = await response.text()
                    self.log.warning(f"Permission denied fetching BigLake tables: {error_text}")
                    return {"error": "You do not have permission to view tables. Please ensure the BigLake API is enabled and you have the correct IAM permissions.", "tables": []}
                else:
                    error_text = await response.text()
                    self.log.error(f"BigLake REST API Error: {response.status} - {error_text}")
                    return {"error": f"An error occurred while fetching tables: API returned status {response.status}", "tables": []}
            
        except auth_exceptions.RefreshError:
            self.log.warning("Authentication token expired.")
            return {"error": "Authentication token expired. Please log in again.", "tables": []}
        except Exception as e:
            self.log.exception(f"Unexpected error fetching tables via REST API: {e}")
            return {"error": str(e), "tables": []}
        
    async def get_column_details(self, catalog_name, db_name, table_name):
        """Fetches table schema metadata. Injects vended-credentials for public datasets."""
        try:
            catalog_path = self._resolve_catalog_path(catalog_name)
            api_endpoint = f"https://biglake.googleapis.com/iceberg/v1/restcatalog/v1/{catalog_path}/namespaces/{db_name}/tables/{table_name}"
            
            # 3. Dynamic Call, Vended Credentials Required (Matches getBigLakeTable in TS)
            headers = self._get_rest_headers(catalog_path, needs_vended_credentials=True)

            async with self.client_session.get(api_endpoint, headers=headers) as response:
                if response.status == 200:
                    resp_json = await response.json()
                    
                    # If 'metadata' is in the response, use it; otherwise, assume the whole response is the metadata.
                    metadata = resp_json.get("metadata", resp_json)
                    schemas = metadata.get("schemas", [])
                    current_schema_id = metadata.get("current-schema-id", 0)
                    
                    target_schema = next((s for s in schemas if s.get("schema-id") == current_schema_id), None)
                    if not target_schema and schemas:
                        target_schema = schemas[0]
                        
                    formatted_fields = []
                    
                    if target_schema:
                        for field in target_schema.get("fields", []):
                            raw_type = field.get("type", "string")
                            if isinstance(raw_type, str):
                                type_str = raw_type.upper()
                                if type_str == "INT": type_str = "INTEGER"
                                elif type_str == "DOUBLE": type_str = "FLOAT"
                                elif type_str == "TIMESTAMPTZ": type_str = "TIMESTAMP"
                            else:
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
                elif response.status == 403:
                    error_text = await response.text()
                    self.log.warning(f"Permission denied fetching BigLake column details: {error_text}")
                    return {"error": "You do not have permission to view table details. Please ensure the BigLake API is enabled and you have the correct IAM permissions.", "tableId": table_name, "schema": {"fields": []}}
                else:
                    error_text = await response.text()
                    self.log.error(f"BigLake REST API Error fetching columns: {response.status} - {error_text}")
                    return {"error": f"An error occurred while fetching table details: API returned status {response.status}", "tableId": table_name, "schema": {"fields": []}}
            
        except auth_exceptions.RefreshError:
            self.log.warning("Authentication token expired.")
            return {"error": "Authentication token expired. Please log in again.", "tableId": table_name, "schema": {"fields": []}}
        except Exception as e:
            self.log.exception(f"Unexpected error fetching columns via REST API: {e}")
            return {"error": str(e), "tableId": table_name, "schema": {"fields": []}}
