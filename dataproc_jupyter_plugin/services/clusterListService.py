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


import requests
from dataproc_jupyter_plugin.utils.constants import CONTENT_TYPE, dataproc_url

from google.cloud import dataproc_v1 as dataproc
import google.oauth2.credentials


class ClusterListService:
    def list_clusters(self, credentials, page_size, page_token, log):
        try:
            if (
                ("access_token" in credentials)
                and ("project_id" in credentials)
                and ("region_id" in credentials)
            ):   
                access_credentials = google.oauth2.credentials.Credentials(credentials["access_token"])

                # Create a client
                client = dataproc.ClusterControllerClient(client_options={"api_endpoint": f"us-central1-dataproc.googleapis.com:443"},credentials = access_credentials)
            
                # Initialize request argument(s)
                request = dataproc.ListClustersRequest(
                    project_id=credentials["project_id"],
                    region=credentials["region_id"],
                    page_size=int(page_size),
                    page_token=page_token
                )

                clusters_list = []
            
                # Make the request
                page_result = client.list_clusters(request=request)
                print("1111",page_result)
                for cluster in page_result:
                    print(cluster)
                    cluster_dict = {
                                "cluster_name": cluster.cluster_name,
                                "status": cluster.status.state,
                            }
                    clusters_list.append(cluster_dict)
                print("2222",clusters_list)
                return clusters_list
            else:
                log.exception(f"Missing required credentials")
                raise ValueError("Missing required credentials")
        except Exception as e:
            log.exception(f"Error fetching cluster list")
            return {"error": str(e)}
        
            
    def get_cluster_detail(self, credentials, cluster_selected, log):
        try:
            if (
                ("access_token" in credentials)
                and ("project_id" in credentials)
                and ("region_id" in credentials)
            ):
                access_token = credentials["access_token"]
                project_id = credentials["project_id"]
                region_id = credentials["region_id"]
                api_endpoint = f"{dataproc_url}/v1/projects/{project_id}/regions/{region_id}/clusters/{cluster_selected}"
                headers = {
                    "Content-Type": CONTENT_TYPE,
                    "Authorization": f"Bearer {access_token}",
                }
                response = requests.get(api_endpoint, headers=headers)
                if response.status_code == 200:
                    resp = response.json()

                return resp
            else:
                log.exception(f"Missing required credentials")
                raise ValueError("Missing required credentials")
        except Exception as e:
            log.exception(f"Error fetching cluster list")
            return {"error": str(e)}
