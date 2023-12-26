import requests
from dataproc_jupyter_plugin.utils.constants import dataproc_url




class RuntimeListService():
    def list_runtime(self, credentials,page_size,page_token):
        print('-----List runtime------')
        # print(self.json())
        if 'access_token' and 'project_id' and 'region_id' in credentials:
            access_token = credentials['access_token']
            project_id = credentials['project_id']
            region_id = credentials['region_id']
        # print(urls)
        api_endpoint = f"{dataproc_url}/v1/projects/{project_id}/locations/{region_id}/sessionTemplates?pageSize={page_size}&pageToken={page_token}"

        headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {access_token}'
        }
        response = requests.get(api_endpoint,headers=headers)
        if response.status_code == 200:
            resp = response.json()
            # print(resp)

        return resp