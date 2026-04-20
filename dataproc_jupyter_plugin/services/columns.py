import asyncio
from google.cloud import biglake_v1
import google.auth

async def test_get_column_details():
    # ==========================================
    # HARDCODED VALUES FOR TESTING
    # ==========================================
    PROJECT_ID = "dataproc-jupyter-extension-dev"  
    LOCATION = "us-central1"
    CATALOG_ID = "shubh-biglake-catalog"
    NAMESPACE_ID = "default"  
    TABLE_ID = "my_table" # Replace with a valid table
    # ==========================================

    print(f"Testing get_column_details for table: {TABLE_ID}")
    
    try:
        credentials, _ = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        iceberg_client = biglake_v1.IcebergCatalogServiceClient(credentials=credentials)
    except Exception as e:
        print(f"Authentication failed. Error: {e}")
        return

    try:
        # Prepare the full target table resource path
        table_path = f"projects/{PROJECT_ID}/locations/{LOCATION}/catalogs/{CATALOG_ID}/namespaces/{NAMESPACE_ID}/tables/{TABLE_ID}"
        print(f"Fetching table metadata from: {table_path} ...")
        
        loop = asyncio.get_running_loop()
        
        def _fetch_table():
            # In BigLake SDKs, fetching column schema is done by "getting" the table definition
            request = biglake_v1.GetTableRequest(name=table_path)
            return iceberg_client.get_table(request=request)

        # Execute synchronous SDK call inside executor
        table_response = await loop.run_in_executor(None, _fetch_table)

        formatted_fields = []
        
        # Safely extract columns whether the SDK returns a standard BigLake Schema Protobuf
        # or pure Iceberg metadata. 
        if hasattr(table_response, "schema") and hasattr(table_response.schema, "fields"):
            # Path A: Standard Protobuf Schema mapping
            for field in table_response.schema.fields:
                formatted_fields.append({
                    "name": field.name,
                    "type": str(field.type).upper(),
                    "mode": field.mode
                })
        else:
            # Path B: Fallback if IcebergCatalogServiceClient passes raw metadata blocks
            print("Note: Protobuf 'schema' object not found, falling back to raw metadata structure...")
            print(table_response) # Debug print to inspect SDK behavior in your specific v1 package
        
        result = {
            "tableId": TABLE_ID,
            "schema": {
                "fields": formatted_fields
            }
        }
        
        print("\n[SUCCESS] Retrieved Columns:")
        if formatted_fields:
            for f in formatted_fields:
                print(f" -> {f['name']} (Type: {f['type']}, Mode: {f['mode']})")
        else:
            print(" -> No columns parsed. Inspect raw output above.")
            
        return result
        
    except Exception as e:
        print(f"\n[ERROR] Failed fetching columns via SDK: {e}")

if __name__ == "__main__":
    asyncio.run(test_get_column_details())
    