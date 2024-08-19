# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from google.cloud import dataproc_v1 as dataproc
import proto
import json
import google.oauth2.credentials as oauth2
from google.protobuf.empty_pb2 import Empty

class Client:
    def __init__(self, credentials, log):
        self.log = log
        if not (
            ("access_token" in credentials)
            and ("project_id" in credentials)
            and ("region_id" in credentials)
        ):
            self.log.exception("Missing required credentials")
            raise ValueError("Missing required credentials")
        self._access_token = credentials["access_token"]
        self.project_id = credentials["project_id"]
        self.region_id = credentials["region_id"]

    async def list_clusters(self, page_size, page_token):
        try:
            # Create a client
            client = dataproc.ClusterControllerAsyncClient(
                client_options={
                    "api_endpoint": f"us-central1-dataproc.googleapis.com:443"
                },
                credentials=oauth2.Credentials(self._access_token),
            )

            # Initialize request argument(s)
            request = dataproc.ListClustersRequest(
                project_id=self.project_id,
                page_size=int(page_size),
                page_token=page_token,
                region=self.region_id,
            )

            # Make the request
            page_result = await client.list_clusters(request=request)
            clusters_list = []

            # Handle the response
            async for response in page_result:
                clusters_list.append(json.loads(proto.Message.to_json(response)))

            return clusters_list
        except Exception as e:
            self.log.exception(f"Error fetching cluster list")
            return {"error": str(e)}

    async def get_cluster_detail(self, cluster_selected):
        try:
            # Create a client
            client = dataproc.ClusterControllerAsyncClient(
                client_options={
                    "api_endpoint": f"us-central1-dataproc.googleapis.com:443"
                },
                credentials=oauth2.Credentials(self._access_token),
            )

            # Initialize request argument(s)
            request = dataproc.GetClusterRequest(
                project_id=self.project_id,
                region=self.region_id,
                cluster_name=cluster_selected,
            )

            # Make the request
            response = await client.get_cluster(request=request)

            # Handle the response
            return json.loads(proto.Message.to_json(response))
        except Exception as e:
            self.log.exception(f"Error fetching cluster detail")
            return {"error": str(e)}

    async def stop_cluster(self, cluster_selected):
        try:
            # Create a client
            client = dataproc.ClusterControllerAsyncClient(
                client_options={
                    "api_endpoint": f"us-central1-dataproc.googleapis.com:443"
                },
                credentials=oauth2.Credentials(self._access_token),
            )

            # Initialize request argument(s)
            request = dataproc.StopClusterRequest(
                project_id=self.project_id,
                region=self.region_id,
                cluster_name=cluster_selected,
            )

            operation = await client.stop_cluster(request=request)

            response = await operation.result()
            # Handle the response
            return json.loads(proto.Message.to_json(response))
        except Exception as e:
            self.log.exception(f"Error fetching stop cluster")
            return {"error": str(e)}

    async def start_cluster(self, cluster_selected):
        try:
            # Create a client
            client = dataproc.ClusterControllerAsyncClient(
                client_options={
                    "api_endpoint": f"us-central1-dataproc.googleapis.com:443"
                },
                credentials=oauth2.Credentials(self._access_token),
            )

            # Initialize request argument(s)
            request = dataproc.StartClusterRequest(
                project_id=self.project_id,
                region=self.region_id,
                cluster_name=cluster_selected,
            )

            operation = await client.start_cluster(request=request)

            response = await operation.result()
            # Handle the response
            return json.loads(proto.Message.to_json(response))
        except Exception as e:
            self.log.exception(f"Error fetching start cluster")
            return {"error": str(e)}
        
    async def delete_cluster(self, cluster_selected):
        try:
            # Create a client
            client = dataproc.ClusterControllerAsyncClient(
                client_options={
                    "api_endpoint": f"us-central1-dataproc.googleapis.com:443"
                },
                credentials=oauth2.Credentials(self._access_token),
            )

            # Initialize request argument(s)
            request = dataproc.DeleteClusterRequest(
                project_id=self.project_id,
                region=self.region_id,
                cluster_name=cluster_selected,
            )

            operation = await client.delete_cluster(request=request)

            response = await operation.result()
            # Handle the response
            if isinstance(response, Empty):
                return "Deleted successfully"
            else:
                return json.loads(proto.Message.to_json(response))
        except Exception as e:
            self.log.exception(f"Error deleting cluster")
            return {"error": str(e)}
