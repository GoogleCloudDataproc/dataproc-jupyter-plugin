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
import re





class DagEditService():
    def edit_jobs(self,dag_id,bucket_name,log):
        try:
            cmd = f"gsutil cp 'gs://{bucket_name}/dags/dag_{dag_id}.py' ~/Downloads"
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
            output, _ = process.communicate()
            cluster_name = ''
            serverless_name = ''
            email_on_success= 'False'
            stop_cluster_check = 'False'
            mode_selected = 'serverless'
            pattern = r"parameters\s*=\s*'''(.*?)'''"
            if process.returncode == 0:
                log.info(f"Downloaded dag file")
                downloads_path = os.path.expanduser('~/Downloads')
                file_path = os.path.join(downloads_path, f'dag_{dag_id}.py')
                with open(file_path, 'r') as f:
                    for line in f:
                        if 'input_notebook' in line:
                            input_notebook = line.split('=')[-1].strip().strip("'\"")
                            break
                with open(file_path, 'r') as file:
                    file_content = file.read()
                    match = re.search(pattern, file_content, re.DOTALL)
                    if match:
                        parameters_yaml = match.group(1)
                        parameters_list = [line.strip() for line in parameters_yaml.split('\n') if line.strip()]
                        print(parameters_list)
                    else:
                        parameters_list = []
                        print("No match found.")


                    # for line in f:
                    #     if 'parameters' in line:
                    #         # parameters = line.split('=')[-1].strip().strip("'\"")
                    #         # parameters_lines = [line.strip() for line in parameters.split('\n') if line.strip()]
                    #         # # Convert each line into a string in the format <key>:<value>
                    #         # parameters_list = [line for line in parameters_lines]
                    #         parameter_lines = [line.strip() for line in parameters.split('\n') if line.strip()]

                    #         # Convert each line into a string in the format <key>:<value>
                    #         parameters_list = [line for line in parameter_lines]

                    #         print(parameters_list)
                    #         break

                with open(file_path, 'r') as f:
                    for line in f:
                        if 'email' in line:
                            email_list = line.split(":")[-1].strip().strip("'\"").replace(',', '')
                            # email_list = [email.strip().strip("'\"") for email in emails]  # Extract emails from the line
                            print(email_list)
                            break
                with open(file_path, 'r') as f:
                    for line in f:
                        if 'cluster_name' in line:
                            cluster_name = line.split(":")[-1].strip().strip("'\"}").split("'")[0].strip()# Extract project_id from the line
                            print('--------------------download and print--------------')
                            print(cluster_name)
                        elif 'submit_pyspark_job' in line:
                            mode_selected = 'cluster' 
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
                        elif 'schedule_interval' in line:
                            schedule_interval = line.split('=')[-1].strip().strip("'\"").split(',')[0].rstrip("'\"")  # Extract schedule_interval from the line
                            print(schedule_interval)
                        elif 'stop_cluster_check' in line:
                            stop_cluster_check = line.split('=')[-1].strip().strip("'\"")
                        elif 'serverless_name' in line:
                            serverless_name = line.split('=')[-1].strip().strip("'\"")
                        

                           

                payload = {
                    "input_filename": input_notebook,
                    "parameters":parameters_list,  
                    "mode_selected": mode_selected,
                    "cluster_name":cluster_name,
                    "serverless_name":serverless_name,
                    "retry_count": retry_count,
                    "retry_delay": retry_delay,
                    "email_failure": email_on_failure,
                    "email_delay": email_on_retry,
                    "email_success": email_on_success,
                    "email": email_list,
                    "schedule_value": schedule_interval,
                    "stop_cluster": stop_cluster_check,
                    "time_zone": 'UTC'
                }
                print(payload)
                return payload

            else:
                log.exception(f"Error downloading dag file")
        except Exception as e:
            log.exception(f"Error downloading dag file: {str(e)}")


        

    

