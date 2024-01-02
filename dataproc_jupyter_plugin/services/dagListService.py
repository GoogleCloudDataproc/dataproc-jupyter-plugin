import requests
# import dataproc_jupyter_plugin.services.executorService 



class DagListService():
    def list_jobs(self, credentials):
        print('-----List jobs------')
        # print(dataproc_jupyter_plugin.services.executorService.AIRFLOW_URI)
        
        # print(self.json())
        if 'access_token' and 'project_id' and 'region_id' in credentials:
            access_token = credentials['access_token']
            project_id = credentials['project_id']
            region_id = credentials['region_id']
        # environments = []
        try:
            api_endpoint = f"https://b56b51577bc548479916c7b35fb7dd23-dot-us-central1.composer.googleusercontent.com/api/v1/dags"

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
    
