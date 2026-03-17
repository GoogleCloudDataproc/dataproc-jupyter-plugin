import asyncio
from google.cloud import biglake_v1
from google.oauth2.credentials import Credentials

class Client:
    def __init__(self, credentials, log, client_session):
        self.log = log
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
