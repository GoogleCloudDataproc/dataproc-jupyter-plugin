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
            cluster_name = ''
            serverless_name = ''
            if process.returncode == 0:
                log.info(f"Downloaded dag file")
                downloads_path = os.path.expanduser('~/Downloads')
                file_path = os.path.join(downloads_path, f'dag_{dag_id}.py')
                with open(file_path, 'r') as f:
                    for line in f:
                        if 'input_notebook' in line:
                            input_notebook = line.split('=')[-1].strip().strip("'\"")
                            break
                with open(file_path, 'r') as f:
                    for line in f:
                        if 'cluster_name' in line:
                            cluster_name = line.split(":")[-1].strip().strip("'\"}").split("'")[0].strip()# Extract project_id from the line
                            print('--------------------download and print--------------')
                            print(cluster_name)
                        elif 'submit_pyspark_job' in line:
                            mode_selected = 'cluster' if 'submit_pyspark_job' in line else 'serverless'
                            print(mode_selected)
                        elif "'retries'" in line:
                            retries = line.split(":")[-1].strip().strip("'\"},")
                            retry_count = int(retries.strip("'\""))    # Extract retry_count from the line
                        elif 'retry_delay' in line:
                            retry_delay = int(line.split("int('")[1].split("')")[0])    # Extract retry_delay from the line
                        elif 'email_on_failure' in line:
                            second_part = line.split(':')[1].strip()            
                            email_on_failure = second_part.split("'")[1]   # Extract email_failure from the line
                        elif 'email_on_retry' in line:
                            second_part = line.split(':')[1].strip()            
                            email_on_retry = second_part.split("'")[1]  
                        elif 'email_on_success' in line:
                            second_part = line.split(':')[1].strip()            
                            email_on_success = second_part.split("'")[1]  
                           

                payload = {
                    "input_filename": input_notebook,
                    "parameters":'[test: test1,test2:val]',  
                    "mode_selected": mode_selected,
                    "cluster_name":cluster_name,
                    "serverless_name":serverless_name,
                    "retry_count": retry_count,
                    "retry_delay": retry_delay,
                    "email_failure": email_on_failure,
                    "email_delay": email_on_retry,
                    "email_success": email_on_success,
                    "email": ['test@gmail.com'],
                    "schedule_value": '* * * * *',
                    "stop_cluster": 'False',
                    "time_zone": ''
                }
                print(payload)
                return payload

            else:
                log.exception(f"Error downloading dag file")
        except Exception as e:
            log.exception(f"Error downloading dag file: {str(e)}")


        

    

