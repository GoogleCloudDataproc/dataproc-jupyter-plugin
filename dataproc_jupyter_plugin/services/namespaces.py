from google.cloud import biglake_v1

def list_iceberg_namespaces(project_id, location, catalog_id):
    """Lists Iceberg namespaces in a BigLake catalog."""
    
    # Create the client
    client = biglake_v1.IcebergCatalogServiceAsyncClient()

    # Prepare the parent resource string
    parent = f"projects/{project_id}/locations/{location}/catalogs/{catalog_id}"

    # Initialize the request to list databases (namespaces)
    request = biglake_v1.ListIcebergNamespaces(parent=parent)

    # Make the request
    page_result = client.list_iceberg_namespaces(request=request)

    print(f"Namespaces in catalog '{catalog_id}':")
    for response in page_result:
        # The 'name' is the full resource path; you can split to get the ID
        namespace_id = response.name.split("/")[-1]
        print(f"- {namespace_id}")
# Example usage:
# list_iceberg_namespaces("your-project-id", "us-central1", "your-catalog-id")

if __name__ == "__main__":
    # Remove the '#' to make these active lines of code
    PROJECT = "dataproc-jupyter-extension-dev"  # Replace with your actual project ID
    LOCATION = "us-central1"
    CATALOG = "shubh-biglake-catalog"
    
    print(f"Listing namespaces for {CATALOG}...")
    list_iceberg_namespaces(PROJECT, LOCATION, CATALOG)
