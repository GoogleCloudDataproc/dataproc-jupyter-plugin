import requests

from dataproc_jupyter_plugin.services.composerService import ENVIRONMENT_API

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
                print(airflow_uri)
                # # AIRFLOW_URI = resp.airflowUri
                # print(resp)
                # # print(AIRFLOW_URI)
                return airflow_uri
        except Exception as e:
            print(f"Error: {e}")
    def list_jobs(self, credentials, composer_name):
        print('-----List jobs------')
        # print(dataproc_jupyter_plugin.services.executorService.AIRFLOW_URI)
        
        # print(self.json())
        airflow_uri = DagListService.getAirflowUri(composer_name,credentials)
        if 'access_token' and 'project_id' and 'region_id' in credentials:
            access_token = credentials['access_token']
            project_id = credentials['project_id']
            region_id = credentials['region_id']
        # environments = []
        
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

            return resp
        except Exception as e:
            return {"error": str(e)}
    
