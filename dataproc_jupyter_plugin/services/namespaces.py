import asyncio
from google.cloud import biglake_v1
import google.auth

async def test_list_namespaces():
    # ==========================================
    # HARDCODED VALUES FOR TESTING
    # ==========================================
    PROJECT_ID = "dataproc-jupyter-extension-dev"  
    LOCATION = "us-central1"
    CATALOG_ID = "shubh-biglake-catalog"
    # ==========================================

    print(f"Testing list_namespaces for catalog: {CATALOG_ID}")
    
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
        # Prepare the parent resource string
        parent = f"projects/{PROJECT_ID}/locations/{LOCATION}/catalogs/{CATALOG_ID}"
        print(f"Fetching namespaces from parent path: {parent} ...")
        
        loop = asyncio.get_running_loop()
        
        def _fetch_namespaces():
            # Initialize the request using the Iceberg namespace method
            request = biglake_v1.ListNamespacesRequest(parent=parent)
            # Make the synchronous SDK request
            return list(iceberg_client.list_namespaces(request=request))

        # Run the SDK call in an executor so it doesn't block the async event loop
        page_result = await loop.run_in_executor(None, _fetch_namespaces)

        namespace_list = []
        for response in page_result:
            # Iceberg namespaces are fundamentally arrays of strings.
            # The SDK protobuf response typically stores this in a `namespace` property, 
            # or a standard GCP `name` resource path. We handle both to ensure safety.
            if hasattr(response, 'namespace'): 
                ns_array = list(response.namespace) 
                name_str = ".".join(ns_array)
            elif hasattr(response, 'name'):
                name_str = response.name.split("/")[-1]
            else:
                name_str = str(response)

            namespace_list.append({
                "name": name_str,
                "displayName": name_str.split(".")[-1]
            })
        
        result = {"namespaces": namespace_list}
        
        print("\n[SUCCESS] Retrieved Namespaces:")
        for ns in namespace_list:
            print(f" -> {ns['displayName']}  (Identifier: {ns['name']})")
            
        return result
        
    except Exception as e:
        print(f"\n[ERROR] Failed fetching namespaces: {e}")

if __name__ == "__main__":
    # Run the async test
    asyncio.run(test_list_namespaces())