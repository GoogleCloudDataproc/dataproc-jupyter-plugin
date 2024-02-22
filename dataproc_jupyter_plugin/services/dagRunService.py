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


from dataproc_jupyter_plugin.services.dagListService import DagListService
import requests
from dataproc_jupyter_plugin.services.composerService import ENVIRONMENT_API
from dataproc_jupyter_plugin.utils.constants import CONTENT_TYPE

class DagRunListService():
    def list_dag_runs(self, credentials, composer_name, dag_id, start_date, end_date, offset, log):
        airflow_uri, bucket = DagListService.get_airflow_uri(self,composer_name,credentials,log)
        if 'access_token' and 'project_id' and 'region_id' in credentials:
            access_token = credentials['access_token']
        
        try:
            api_endpoint = f"{airflow_uri}/api/v1/dags/{dag_id}/dagRuns?execution_date_gte={start_date}&execution_date_lte={end_date}&offset={offset}"
            headers = {
            'Content-Type': CONTENT_TYPE,
            'Authorization': f'Bearer {access_token}'
            }
            response = requests.get(api_endpoint,headers=headers)
            if response.status_code == 200:
                resp = response.json()

            return resp
        except Exception as e:
            log.exception(f"Error fetching dag run list: {str(e)}")
            return {"error": str(e)}

class DagRunTaskListService():
    def list_dag_run_task(self, credentials, composer_name, dag_id, dag_run_id,log):
        airflow_uri, bucket = DagListService.get_airflow_uri(self,composer_name,credentials,log)
        if 'access_token' and 'project_id' and 'region_id' in credentials:
            access_token = credentials['access_token']
        try:
            api_endpoint = f"{airflow_uri}/api/v1/dags/{dag_id}/dagRuns/{dag_run_id}/taskInstances"
            headers = {
            'Content-Type': CONTENT_TYPE,
            'Authorization': f'Bearer {access_token}'
            }
            response = requests.get(api_endpoint,headers=headers)
            if response.status_code == 200:
                resp = response.json()

            return resp
        except Exception as e:
            log.exception(f"Error fetching dag run task list: {str(e)}")
            return {"error": str(e)}
        
class DagRunTaskLogsListService():
    def list_dag_run_task_logs(self, credentials, composer_name, dag_id, dag_run_id, task_id, task_try_number,log):
        airflow_uri, bucket = DagListService.get_airflow_uri(self,composer_name,credentials,log)
        if 'access_token' and 'project_id' and 'region_id' in credentials:
            access_token = credentials['access_token']

        try:
            api_endpoint = f"{airflow_uri}/api/v1/dags/{dag_id}/dagRuns/{dag_run_id}/taskInstances/{task_id}/logs/{task_try_number}"
            headers = {
            'Content-Type': CONTENT_TYPE,
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
            log.exception(f"Error fetching dag run task logs: {str(e)}")
            return {"error": str(e)}
    
