from dataproc_jupyter_plugin.services.dagListService import DagListService
import requests

from dataproc_jupyter_plugin.services.composerService import ENVIRONMENT_API

# import dataproc_jupyter_plugin.services.executorService 


class DagRunListService():
    def list_dag_runs(self, credentials, composer_name, dag_id, start_date, end_date):
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

            return resp
        except Exception as e:
            return {"error": str(e)}

class DagRunTaskListService():
    def list_dag_run_task(self, credentials, composer_name, dag_id, dag_run_id):
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

            return resp
        except Exception as e:
            return {"error": str(e)}
        
class DagRunTaskLogsListService():
    def list_dag_run_task_logs(self, credentials, composer_name, dag_id, dag_run_id, task_id, task_try_number):
        airflow_uri, bucket = DagListService.getAirflowUri(composer_name,credentials)
        if 'access_token' and 'project_id' and 'region_id' in credentials:
            access_token = credentials['access_token']
            project_id = credentials['project_id']
            region_id = credentials['region_id']
        # environments = []

        try:
            api_endpoint = f"{airflow_uri}/api/v1/dags/{dag_id}/dagRuns/{dag_run_id}/taskInstances/{task_id}/logs/{task_try_number}"
            headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}'
            }
            response = requests.get(api_endpoint,headers=headers)
            if response.status_code == 200:
                resp = response.text
                resp_to_json = {
                "content": resp
                }

            return resp_to_json
        except Exception as e:
            return {"error": str(e)}
    
