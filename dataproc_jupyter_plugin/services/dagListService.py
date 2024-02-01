import subprocess
import requests
from dataproc_jupyter_plugin.services.composerService import ENVIRONMENT_API
from dataproc_jupyter_plugin.services.executorService import getBucket



class DagListService():
    def getAirflowUri(composer_name, credentials):
        if 'access_token' and 'project_id' and 'region_id' in credentials:
            access_token = credentials['access_token']
            project_id = credentials['project_id']
            region_id = credentials['region_id']
        api_endpoint = f"{ENVIRONMENT_API}/projects/{project_id}/locations/{region_id}/environments/{composer_name}"

        headers = {
        'Content-Type': 'application/json',
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
            print(f"Error: {e}")
    def list_jobs(self, credentials, composer_name, tags):
        airflow_uri, bucket = DagListService.getAirflowUri(composer_name,credentials)
        if 'access_token' and 'project_id' and 'region_id' in credentials:
            access_token = credentials['access_token']
        
        try:
            api_endpoint = f"{airflow_uri}/api/v1/dags?tags={tags}"
            headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}'
            }
            response = requests.get(api_endpoint,headers=headers)
            if response.status_code == 200:
                resp = response.json()
            return resp,bucket
        except Exception as e:
            return {"error": str(e)}
    

class DagDeleteService():
    def delete_job(self, credentials, composer_name, dag_id):
        airflow_uri, bucket = DagListService.getAirflowUri(composer_name,credentials)
        if 'access_token' and 'project_id' and 'region_id' in credentials:
            access_token = credentials['access_token']
            project_id = credentials['project_id']
            region_id = credentials['region_id']
        
        try:
            api_endpoint = f"{airflow_uri}/api/v1/dags/{dag_id}"
            headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}'
            }
            cmd = f"gsutil rm gs://{bucket}/dags/dag_{dag_id}.py"
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
            output, _ = process.communicate()
            if process.returncode == 0:
                return 0
            else:
                return 1
        except Exception as e:
            return {"error": str(e)}
    
class DagUpdateService():
    def update_job(self, credentials, composer_name, dag_id, status):
        airflow_uri, bucket = DagListService.getAirflowUri(composer_name,credentials)
        if 'access_token' and 'project_id' and 'region_id' in credentials:
            access_token = credentials['access_token']
        try:
            api_endpoint = f"{airflow_uri}/api/v1/dags/{dag_id}"
            headers = {
            'Content-Type': 'application/json',
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
                return 1
        except Exception as e:
            return {"error": str(e)}
