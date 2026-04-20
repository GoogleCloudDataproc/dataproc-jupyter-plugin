import asyncio
from google.cloud import biglake_v1
import google.auth

async def test_list_catalogs():
    # ==========================================
    # HARDCODED VALUES FOR TESTING
    # ==========================================
    PROJECT_ID = "dataproc-jupyter-extension-dev" 
    BQ_PUBLIC_DATASET_PROJECT_ID = "bigquery-public-data" 
    
    # Change this to BQ_PUBLIC_DATASET_PROJECT_ID to test the public catalog branch
    target_project = PROJECT_ID 
    # ==========================================

    print(f"Testing list_catalogs for project: {target_project}")
    
    # Authenticate using standard environment credentials
    try:
        credentials, _ = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        iceberg_client = biglake_v1.IcebergCatalogServiceClient(credentials=credentials)
    except Exception as e:
        print(f"Authentication failed. Make sure you are logged in (e.g., via `gcloud auth application-default login`). Error: {e}")
        return

    try:
        # 1. Public dataset hardcoded branch
        if target_project == BQ_PUBLIC_DATASET_PROJECT_ID:
            result = {
                "catalogs": [{
                    "name": "biglake-public-nyc-taxi-iceberg",
                    "displayName": "biglake-public-nyc-taxi-iceberg"
                }]
            }
            print("\n[SUCCESS] Public Catalog Result:")
            print(result)
            return result

        # 2. Standard user project dynamic branch
        parent = f"projects/{target_project}"
        print(f"Fetching catalogs from parent path: {parent} ...")
        
        loop = asyncio.get_running_loop()
        
        def _fetch_catalogs():
            # Exact match to your working snippet
            return list(iceberg_client.list_iceberg_catalogs(parent=parent))

        catalogs = await loop.run_in_executor(None, _fetch_catalogs)

        catalog_list = []
        for catalog in catalogs:
            catalog_list.append({
                "name": catalog.name,
                "displayName": catalog.name.split("/")[-1]
            })
        
        result = {"catalogs": catalog_list}
        
        print("\n[SUCCESS] Retrieved Catalogs:")
        for c in catalog_list:
            print(f" -> {c['displayName']}  (Full Path: {c['name']})")
            
        return result
        
    except Exception as e:
        print(f"\n[ERROR] Failed fetching catalogs: {e}")

if __name__ == "__main__":
    # Run the async test
    asyncio.run(test_list_catalogs())
    