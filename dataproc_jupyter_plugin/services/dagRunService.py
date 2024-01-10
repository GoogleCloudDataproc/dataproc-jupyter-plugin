from dataproc_jupyter_plugin.services.dagListService import DagListService
import requests

from dataproc_jupyter_plugin.services.composerService import ENVIRONMENT_API

# import dataproc_jupyter_plugin.services.executorService 


class DagRunListService():
    def list_jobs(self, credentials, composer_name, dag_id, start_date, end_date):
        print('-----List jobs------')
        # print(dataproc_jupyter_plugin.services.executorService.AIRFLOW_URI)
        
        # print(self.json())
        airflow_uri, bucket = DagListService.getAirflowUri(composer_name,credentials)
        if 'access_token' and 'project_id' and 'region_id' in credentials:
            access_token = credentials['access_token']
            project_id = credentials['project_id']
            region_id = credentials['region_id']
        # environments = []
        
        try:
            api_endpoint = f"{airflow_uri}/api/v1/dags/{dag_id}/dagRuns?execution_date_gte={start_date}&execution_date_lte={end_date}"
            headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}'
            }
            response = requests.get(api_endpoint,headers=headers)
            if response.status_code == 200:
                resp = response.json()
                print(resp)

            return resp
        except Exception as e:
            return {"error": str(e)}

class DagRunTaskListService():
    def list_jobs(self, credentials, composer_name, dag_id, dag_run_id):
        print('-----List jobs------')
        # print(dataproc_jupyter_plugin.services.executorService.AIRFLOW_URI)
        
        # print(self.json())
        airflow_uri, bucket = DagListService.getAirflowUri(composer_name,credentials)
        if 'access_token' and 'project_id' and 'region_id' in credentials:
            access_token = credentials['access_token']
            project_id = credentials['project_id']
            region_id = credentials['region_id']
        # environments = []

        try:
            api_endpoint = f"{airflow_uri}/api/v1/dags/{dag_id}/dagRuns/{dag_run_id}/taskInstances"
            headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}'
            }
            response = requests.get(api_endpoint,headers=headers)
            if response.status_code == 200:
                resp = response.json()
                print(resp)

            return resp
        except Exception as e:
            return {"error": str(e)}
    
