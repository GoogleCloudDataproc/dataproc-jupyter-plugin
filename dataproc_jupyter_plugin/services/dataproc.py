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

    async def list_clusters(self, page_size=50, page_token=""):
        client, project_id, region_id = await self.get_client()
        request = dataproc.ListClustersRequest(
            project_id=project_id,
            region=region_id,
            page_size=page_size,
            page_token=page_token
        )
        response = await client.list_clusters(request=request)
        # response is a pager, we just want the raw page to return next_page_token and clusters
        page = response.messages[0] if hasattr(response, "messages") else response
        
        # Actually, list_clusters returns a pager. We can get the raw response page by doing:
        # We should use the async pager's raw_page or just iterate. But frontend expects:
        # { clusters: [...], nextPageToken: "..." }
        clusters = []
        async for cluster in response:
            clusters.append(proto.Message.to_dict(cluster, use_integers_for_enums=False, preserving_proto_field_name=False))
            if len(clusters) == page_size:
                break
        
        return {
            "clusters": clusters,
            "nextPageToken": response.next_page_token
        }


    async def get_cluster_details(self, cluster_name):
        client, project_id, region_id = await self.get_client()
        request = dataproc.GetClusterRequest(
            project_id=project_id,
            region=region_id,
            cluster_name=cluster_name
        )
        response = await client.get_cluster(request=request)
        return proto.Message.to_dict(response, use_integers_for_enums=False, preserving_proto_field_name=False)

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

    async def delete_cluster(self, cluster_name):
        client, project_id, region_id = await self.get_client()
        request = dataproc.DeleteClusterRequest(
            project_id=project_id,
            region=region_id,
            cluster_name=cluster_name
        )
        operation = await client.delete_cluster(request=request)
        return {"status": "deleting", "operationName": operation.operation.name}
