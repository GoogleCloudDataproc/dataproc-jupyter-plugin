import requests

from dataproc_jupyter_plugin.services.composerService import ENVIRONMENT_API
from dataproc_jupyter_plugin.services.executorService import getBucket

# import dataproc_jupyter_plugin.services.executorService 


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
            print("arflow error")
            print(f"Error: {e}")
    def list_jobs(self, credentials, composer_name):
        print('-----List jobs------')
        airflow_uri, bucket = DagListService.getAirflowUri(composer_name,credentials)
        if 'access_token' and 'project_id' and 'region_id' in credentials:
            access_token = credentials['access_token']
            project_id = credentials['project_id']
            region_id = credentials['region_id']
        
        try:
            api_endpoint = f"{airflow_uri}/api/v1/dags"
            headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}'
            }
            response = requests.get(api_endpoint,headers=headers)
            if response.status_code == 200:
                resp = response.json()
                print(resp)

            return resp,bucket
        except Exception as e:
            return {"error": str(e)}
    

class DagDeleteService():
    def delete_job(self, credentials, composer_name, dag_id):
        print('-----delete job------')
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
            response = requests.delete(api_endpoint,headers=headers)
            if response.status_code == 200:
                resp = response.json()
                # print(resp)
            # bucket = getBucket(composer_name,cr)

                return 0
            else:
                return resp
        except Exception as e:
            return {"error": str(e)}
    
class DagUpdateService():
    def update_job(self, credentials, composer_name, dag_id):
        print('-----update job------')
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
            data = {"is_paused": True}
            response = requests.patch(api_endpoint,json=data,headers=headers)
            if response.status_code == 200:
                print(response)
                # resp = response.json()
                # print(resp)
            # bucket = getBucket(composer_name,cr)

                return 0
        except Exception as e:
            return {"error": str(e)}
