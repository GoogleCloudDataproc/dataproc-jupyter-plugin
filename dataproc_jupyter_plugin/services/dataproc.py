import json
from google.oauth2 import credentials as oauth2
from google.cloud import dataproc_v1 as dataproc
from dataproc_jupyter_plugin import credentials
import proto

class DataprocService:
    def __init__(self):
        pass

    async def get_client(self):
        cached = await credentials.get_cached()
        if cached.get("login_error") or cached.get("config_error"):
            raise ValueError("GCP credentials or configuration (project/region) are missing or invalid.")
        access_token = cached.get("access_token")
        project_id = cached.get("project_id")
        region_id = cached.get("region_id")
        
        cred = oauth2.Credentials(access_token)
        api_endpoint = f"{region_id}-dataproc.googleapis.com:443"
        
        client = dataproc.ClusterControllerAsyncClient(
            credentials=cred,
            client_options={"api_endpoint": api_endpoint}
        )
        return client, project_id, region_id

    async def stop_cluster(self, cluster_name):
        client, project_id, region_id = await self.get_client()
        request = dataproc.StopClusterRequest(
            project_id=project_id,
            region=region_id,
            cluster_name=cluster_name
        )
        operation = await client.stop_cluster(request=request)
        return {"status": "stopping", "operationName": operation.operation.name}

    async def start_cluster(self, cluster_name):
        client, project_id, region_id = await self.get_client()
        request = dataproc.StartClusterRequest(
            project_id=project_id,
            region=region_id,
            cluster_name=cluster_name
        )
        operation = await client.start_cluster(request=request)
        return {"status": "starting", "operationName": operation.operation.name}
