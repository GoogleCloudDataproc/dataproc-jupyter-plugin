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


from typing import Dict, List
import requests
from dataproc_jupyter_plugin.models.models import ComposerEnvironment
from dataproc_jupyter_plugin.utils.constants import CONTENT_TYPE, ENVIRONMENT_API


class ComposerService():
    def list_environments(self, credentials,log) -> List[ComposerEnvironment]:
        if 'access_token' and 'project_id' and 'region_id' in credentials:
            access_token = credentials['access_token']
            project_id = credentials['project_id']
            region_id = credentials['region_id']
        environments = []
        api_endpoint = f"{ENVIRONMENT_API}/projects/{project_id}/locations/{region_id}/environments"

        headers = {
        'Content-Type': CONTENT_TYPE,
        'Authorization': f'Bearer {access_token}'
        }
        try:
            response = requests.get(api_endpoint,headers=headers)
            if response.status_code == 200:
                resp = response.json()    
                if not resp:  
                    return environments   
                else:      
                    environment = resp['environments']
                    # Extract the 'name' values from the 'environments' list
                    names = [env['name'] for env in environment]
                    # Extract the last value after the last slash for each 'name'
                    last_values = [name.split('/')[-1] for name in names]
                    for env in last_values:
                        name = env
                        environments.append(
                            ComposerEnvironment(
                                name=name,
                                label=name,
                                description=f"Environment: {name}",
                                file_extensions=["ipynb"],
                                metadata={"path": env},
                            )
                        )
                    return environments
            else:
                log.exception(f"Error listing environments")
                print(f"Error: {response.status_code} - {response.text}")


        except FileNotFoundError:
                environments = []
                return environments

    def manage_environments_command(self) -> str:
        return ""
