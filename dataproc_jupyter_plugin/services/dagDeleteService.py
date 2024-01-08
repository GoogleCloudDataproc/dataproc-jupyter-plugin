

import requests
from dataproc_jupyter_plugin.services.dagListService import DagListService


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