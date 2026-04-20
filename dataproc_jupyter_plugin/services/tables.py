import asyncio
from google.cloud import biglake_v1
import google.auth

async def test_list_tables():
    # ==========================================
    # HARDCODED VALUES FOR TESTING
    # ==========================================
    PROJECT_ID = "dataproc-jupyter-extension-dev"  
    LOCATION = "us-central1"
    CATALOG_ID = "shubh-biglake-catalog"
    NAMESPACE_ID = "default"  # Replace with a valid namespace from your catalog
    # ==========================================

    print(f"Testing list_tables for namespace: {NAMESPACE_ID}")
    
    # Authenticate using standard environment credentials
    try:
        credentials, _ = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        iceberg_client = biglake_v1.IcebergCatalogServiceClient(credentials=credentials)
    except Exception as e:
        print(f"Authentication failed. Error: {e}")
        return

    try:
        # Prepare the parent resource string.
        # Note: BigLake's underlying gRPC might expect "databases" instead of "namespaces" 
        # in the path depending on the exact SDK version. Try "namespaces" first.
        parent = f"projects/{PROJECT_ID}/locations/{LOCATION}/catalogs/{CATALOG_ID}/namespaces/{NAMESPACE_ID}"
        print(f"Fetching tables from parent path: {parent} ...")
        
        loop = asyncio.get_running_loop()
        
        def _fetch_tables():
            request = biglake_v1.ListTablesRequest(parent=parent)
            return list(iceberg_client.list_tables(request=request))

        # Execute synchronous SDK call inside executor
        page_result = await loop.run_in_executor(None, _fetch_tables)

        table_list = []
        for response in page_result:
            # Extract the pure table name from the full GCP resource path
            name_str = response.name.split("/")[-1] if hasattr(response, 'name') else str(response)
            table_list.append({
                "name": name_str,
                "type": "TABLE"
            })
        
        result = {"tables": table_list}
        
        print("\n[SUCCESS] Retrieved Tables:")
        for t in table_list:
            print(f" -> {t['name']}")
            
        return result
        
    except Exception as e:
        print(f"\n[ERROR] Failed fetching tables via SDK: {e}")

if __name__ == "__main__":
    asyncio.run(test_list_tables())
    