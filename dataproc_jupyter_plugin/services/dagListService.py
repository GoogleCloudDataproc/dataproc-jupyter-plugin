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


import subprocess
import requests
from dataproc_jupyter_plugin.services.composerService import ENVIRONMENT_API
from dataproc_jupyter_plugin.utils.constants import CONTENT_TYPE




class DagListService():
    def get_airflow_uri(self,composer_name, credentials,log):
        if 'access_token' and 'project_id' and 'region_id' in credentials:
            access_token = credentials['access_token']
            project_id = credentials['project_id']
            region_id = credentials['region_id']
        api_endpoint = f"{ENVIRONMENT_API}/projects/{project_id}/locations/{region_id}/environments/{composer_name}"

        headers = {
        'Content-Type': CONTENT_TYPE,
        'Authorization': f'Bearer {access_token}'
        }
        try:
            response = requests.get(api_endpoint,headers=headers)
            if response.status_code == 200:
                resp = response.json()
                airflow_uri=  resp.get('config', {}).get('airflowUri', '')
                bucket = resp.get('storageConfig', {}).get('bucket', '')
                return airflow_uri,bucket
        except Exception as e:
            log.exception(f"Error getting airflow uri: {str(e)}")
            print(f"Error: {e}")
    def list_jobs(self, credentials, composer_name, tags, log):
        airflow_uri, bucket = DagListService.get_airflow_uri(self,composer_name,credentials,log)
        if 'access_token' and 'project_id' and 'region_id' in credentials:
            access_token = credentials['access_token']
        
        try:
            api_endpoint = f"{airflow_uri}/api/v1/dags?tags={tags}"
            headers = {
            'Content-Type': CONTENT_TYPE,
            'Authorization': f'Bearer {access_token}'
            }
            response = requests.get(api_endpoint,headers=headers)
            if response.status_code == 200:
                resp = response.json()
            return resp,bucket
        except Exception as e:
            log.exception(f"Error getting dag list: {str(e)}")
            return {"error": str(e)}
    

class DagDeleteService():
    def delete_job(self, credentials, composer_name, dag_id,from_page,log):
        airflow_uri, bucket = DagListService.get_airflow_uri(self,composer_name,credentials,log)
        if 'access_token' and 'project_id' and 'region_id' in credentials:
            access_token = credentials['access_token']
        
        try:
            api_endpoint = f"{airflow_uri}/api/v1/dags/{dag_id}"
            headers = {
            'Content-Type': CONTENT_TYPE,
            'Authorization': f'Bearer {access_token}'
            }
            if from_page == None:
                response = requests.delete(api_endpoint,headers=headers)
                log.info(response)
            cmd = f"gsutil rm gs://{bucket}/dags/dag_{dag_id}.py"
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
            output, _ = process.communicate()
            if process.returncode == 0:
                return 0
            else:
                log.exception(f"Error deleting dag")
                return 1
        except Exception as e:
            log.exception(f"Error deleting dag: {str(e)}")
            return {"error": str(e)}
    
class DagUpdateService():
    def update_job(self, credentials, composer_name, dag_id, status,log):
        airflow_uri, bucket = DagListService.get_airflow_uri(self,composer_name,credentials,log)
        if 'access_token' and 'project_id' and 'region_id' in credentials:
            access_token = credentials['access_token']
        try:
            api_endpoint = f"{airflow_uri}/api/v1/dags/{dag_id}"
            headers = {
            'Content-Type': CONTENT_TYPE,
            'Authorization': f'Bearer {access_token}'
            }
            if(status == 'true'):
                data = {"is_paused": False}
            else:
                data = {"is_paused": True}
            response = requests.patch(api_endpoint,json=data,headers=headers)
            if response.status_code == 200:
                return 0              
            else:
                log.exception(f"Error updating status")
                return 1
        except Exception as e:
            log.exception(f"Error updating status: {str(e)}")
            return {"error": str(e)}
