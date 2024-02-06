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


import subprocess
import os





class DagEditService():
    def edit_jobs(self,dag_id,bucket_name,log):
        try:
            cmd = f"gsutil cp 'gs://{bucket_name}/dags/dag_{dag_id}.py' ~/Downloads"
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
            output, _ = process.communicate()
            if process.returncode == 0:
                log.info(f"Downloaded dag file")
                downloads_path = os.path.expanduser('~/Downloads')
                file_path = os.path.join(downloads_path, f'dag_{dag_id}.py')
                with open(file_path, 'r') as f:
                    for line in f:
                        if 'project_id' in line:
                            project_id = line.split('=')[-1].strip().strip("'\"")  # Extract project_id from the line
                            print('--------------------download and print--------------')
                            print(project_id)
                        if 'cluster_name' in line:
                            cluster_name = line.split(":")[-1].strip().strip("'\"}").split("'")[0].strip()# Extract project_id from the line
                            print('--------------------download and print--------------')
                            print(cluster_name)
                payload = {
                    "input_filename": 'test.ipynb',
                    "parameters": {'test': 'test1','test2':'val'},  
                    "mode_selected": 'cluster',
                    "cluster_name":cluster_name,
                    "serverless_name":'',
                    "retry_count": 2,
                    "retry_delay": 5,
                    "email_failure": 'True',
                    "email_delay": 'False',
                    "email_success": 'True',
                    "email": ['test@gmail.com'],
                    "schedule_value": '* * * * *',
                    "stop_cluster": 'False',
                    "time_zone": 'UTC'
                }
                print(payload)
                return payload

            else:
                log.exception(f"Error downloading dag file")
        except Exception as e:
            log.exception(f"Error downloading dag file: {str(e)}")


        

    

