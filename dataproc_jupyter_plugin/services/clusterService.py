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
import proto
import json


class ClusterService:
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
                print("call params",int(page_size), page_token)
                request = dataproc.ListClustersRequest(
                    project_id=credentials["project_id"],
                    page_size=int(page_size),
                    page_token=page_token,
                    region=credentials["region_id"],
                )

                # Make the request
                page_result = client.list_clusters(request=request)

                clusters_list = []
            
                # Handle the response
                for response in page_result:
                    # response.status.state = 'STOPPED'
                    # print("aaaaaaa", response.status.state)
                    clusters_list.append(json.loads(proto.Message.to_json(response)))

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
                access_credentials = google.oauth2.credentials.Credentials(credentials["access_token"])

                # Create a client
                client = dataproc.ClusterControllerClient(client_options={"api_endpoint": f"us-central1-dataproc.googleapis.com:443"},credentials = access_credentials)

                # Initialize request argument(s)
                request = dataproc.GetClusterRequest(
                    project_id=credentials["project_id"],
                    region=credentials["region_id"],
                    cluster_name=cluster_selected
                )

                # Make the request
                response = client.get_cluster(request=request)

                # Handle the response
                return json.loads(proto.Message.to_json(response))
            else:
                log.exception(f"Missing required credentials")
                raise ValueError("Missing required credentials")
        except Exception as e:
            log.exception(f"Error fetching cluster detail")
            return {"error": str(e)}
