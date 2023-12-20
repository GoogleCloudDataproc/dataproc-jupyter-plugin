import json
import os
import subprocess
import sys
from typing import Dict, List



import requests
from dataproc_jupyter_plugin.models.models import ComposerEnvironment


ENVIRONMENT_API = 'https://composer.googleapis.com/v1'
class ComposerService():
    """Provides a list of Conda environments. If Conda is not
    installed or activated, it defaults to providing exclusively
    the Python executable that JupyterLab is currently running in.
    """

    def list_environments(self, credentials) -> List[ComposerEnvironment]:
        # credentials = credentials
        if 'access_token' and 'project_id' and 'region_id' in credentials:
            access_token = credentials['access_token']
            project_id = credentials['project_id']
            region_id = credentials['region_id']
        environments = []
        api_endpoint = f"{ENVIRONMENT_API}/projects/{project_id}/locations/{region_id}/environments"

        headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {access_token}'
        }
        try:
            response = requests.get(api_endpoint,headers=headers)
            if response.status_code == 200:
                resp = response.json()
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
                            output_formats=["ipynb", "html"],
                            metadata={"path": env},
                        )
                    )
                return environments
            else:
                print(f"Error: {response.status_code} - {response.text}")

        except Exception as e:
            print(f"Error: {e}")
            try:
                envs = subprocess.check_output(["conda", "env", "list", "--json"])
                envs = json.loads(envs).get("envs", [])
            except subprocess.CalledProcessError as e:
                envs = []
            except FileNotFoundError as e:
                envs = []

            current_python_root = sys.prefix
            if not envs or current_python_root not in envs:
                envs = [sys.executable]

            for env in envs:
                name = os.path.basename(env)
                environments.append(
                    RuntimeEnvironment(
                        name=name,
                        label=name,
                        description=f"Environment: {name}",
                        file_extensions=["ipynb"],
                        output_formats=["ipynb", "html"],
                        metadata={"path": env},
                    )
                )
            return environments

    def manage_environments_command(self) -> str:
        return ""

    def output_formats_mapping(self) -> Dict[str, str]:
        return {"ipynb": "Notebook", "html": "HTML"}
    
    # class EnvironmentRetrievalError(Exception):
    #     pass
