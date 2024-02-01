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

import os
from typing import Dict
import requests
from dataproc_jupyter_plugin.services.composerService import ENVIRONMENT_API
from dataproc_jupyter_plugin.models.models import DagModel, DescribeJob
import nbconvert
import nbformat
from nbconvert.preprocessors import CellExecutionError, ExecutePreprocessor
import subprocess
from jinja2 import Environment, FileSystemLoader, PackageLoader, select_autoescape
import uuid
from datetime import datetime, timedelta, timezone
import json
import pendulum

unique_id = str(uuid.uuid4().hex)
job_id = ''
job_name = ''
TEMPLATES_FOLDER_PATH = "dagTemplates"
ROOT_FOLDER = "dataproc_jupyter_plugin"
def getBucket(runtime_env, credentials):
    if 'access_token' and 'project_id' and 'region_id' in credentials:
            access_token = credentials['access_token']
            project_id = credentials['project_id']
            region_id = credentials['region_id']
    api_endpoint = f"{ENVIRONMENT_API}/projects/{project_id}/locations/{region_id}/environments/{runtime_env}"

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {access_token}'
        }
    try:
        response = requests.get(api_endpoint,headers=headers)
        if response.status_code == 200:
                resp = response.json()
                gcs_dag_path = resp.get('storageConfig', {}).get('bucket', '')
                return gcs_dag_path
    except Exception as e:
            print(f"Error: {e}")

def check_file_exists(bucket, file_path):
    cmd = f"gsutil ls gs://{bucket}/dataproc-notebooks/{file_path}"
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
    output, error = process.communicate()

    # Check if the command was successful
    if process.returncode == 0:
        return True
    else:
        # Check if the error indicates that the file doesn't exist
        if "matched no objects" in error.decode():
            return False
        else:
            # Handle other errors if needed
            raise Exception(f"Error checking file existence: {error.decode()}")
    

class ExecutorService():
    """Default execution manager that executes notebooks"""
    @staticmethod
    def uploadToGcloud(runtime_env,dag_file,credentials):
        if 'region_id' in credentials:
            region = credentials['region_id']
            cmd = f"gcloud beta composer environments storage dags import --environment {runtime_env} --location {region} --source={dag_file}"
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
            output, error = process.communicate()
        if process.returncode == 0:
            os.remove(dag_file)
        if process.returncode != 0:
            raise Exception(f"Error file uploading: {error.decode()}")
    
    @staticmethod
    def uploadInputFileToGcs(input,gcs_dag_bucket,job_name):
        cmd = f"gsutil cp './{input}' gs://{gcs_dag_bucket}/dataproc-notebooks/{job_name}/input_notebooks/"
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
        output, error = process.communicate()
        if process.returncode == 1:
            raise Exception(f"Error file uploading: {error.decode()}")

    @staticmethod
    def uploadPapermillToGcs(gcs_dag_bucket):
        env = Environment(
        loader=PackageLoader('dataproc_jupyter_plugin', 'dagTemplates'),
        autoescape=select_autoescape(['py'])
        )   
        wrapper_papermill_path = env.get_template('wrapper_papermill.py').filename
        cmd = f"gsutil cp '{wrapper_papermill_path}' gs://{gcs_dag_bucket}/dataproc-notebooks/"
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
        output, error = process.communicate()
        print(process.returncode,error,output)
        if process.returncode == 0:
            print(process.returncode,error,output)
        else:
            raise Exception(f"Error file uploading: {error.decode()}")



    @staticmethod
    def prepareDag(job,gcs_dag_bucket,dag_file,credentials):
        DAG_TEMPLATE_CLUSTER_V1 = "pysparkJobTemplate-v1.txt"
        DAG_TEMPLATE_SERVERLESS_V1 = "pysparkBatchTemplate-v1.txt"
        environment = Environment(loader=PackageLoader('dataproc_jupyter_plugin', TEMPLATES_FOLDER_PATH))
        if  'project_id' and'region_id' in credentials:
            gcp_project_id = credentials['project_id']
            gcp_region_id = credentials['region_id']
        cmd = "gcloud config get-value account"
        process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        user, error = process.communicate()
        owner = user.split('@')[0] #getting username from email
        if job.schedule_value == '':
            schedule_interval = "@once"
        else:
            schedule_interval = job.schedule_value
        if job.time_zone == '':
            yesterday = datetime.combine(datetime.today() - timedelta(1),datetime.min.time())
            start_date = yesterday
        else:
            yesterday = pendulum.now().subtract(days=1)
            desired_timezone = job.time_zone
            dag_timezone = pendulum.timezone(desired_timezone)
            start_date =  yesterday.replace(tzinfo=dag_timezone)
        if len(job.parameters) != 0:
            parameters = '\n'.join(item.replace(':', ': ') for item in job.parameters)
        else:
            parameters = ''
        if job.mode_selected == 'cluster':
            template = environment.get_template(DAG_TEMPLATE_CLUSTER_V1)
            content = template.render(job, inputFilePath=f"gs://{gcs_dag_bucket}/dataproc-notebooks/wrapper_papermill.py", \
                                    gcpProjectId=gcp_project_id,gcpRegion=gcp_region_id,input_notebook=f"gs://{gcs_dag_bucket}/dataproc-notebooks/{job.name}/input_notebooks/{job.input_filename}",\
                                    output_notebook=f"gs://{gcs_dag_bucket}/dataproc-output/{job.name}/output-notebooks/{job.name}_{job.dag_id}.ipynb",owner = owner,\
                                    schedule_interval=schedule_interval,start_date = start_date,parameters=parameters)
        else:
            template = environment.get_template(DAG_TEMPLATE_SERVERLESS_V1)
            job_dict = job.dict()
            phs_path = job_dict.get("serverless_name", {}).get("environmentConfig", {}).get("peripheralsConfig", {}).get("sparkHistoryServerConfig", {}).get("dataprocCluster", "")
            content = template.render(job, inputFilePath=f"gs://{gcs_dag_bucket}/dataproc-notebooks/wrapper_papermill.py", \
                                    gcpProjectId=gcp_project_id,gcpRegion=gcp_region_id,input_notebook=f"gs://{gcs_dag_bucket}/dataproc-notebooks/{job.name}/input_notebooks/{job.input_filename}",\
                                    output_notebook=f"gs://{gcs_dag_bucket}/dataproc-output/{job.name}/output-notebooks/{job.name}_{job.dag_id}.ipynb",owner = owner,\
                                    schedule_interval=schedule_interval,start_date = start_date,parameters=parameters,phs_path = phs_path)

        print(content)
        with open(dag_file, mode="w", encoding="utf-8") as message:
            message.write(content)


    def execute(self,credentials,input_data):
        job = DescribeJob(**input_data)
        global job_id
        global job_name
        job_id = job.dag_id
        job_name = job.name
        dag_file = f"dag_{job_name}.py"
        gcs_dag_bucket = getBucket(job.composer_environment_name, credentials)
        remote_file_path = "wrapper_papermill.py"
      
        if check_file_exists(gcs_dag_bucket, remote_file_path):
            print(f"The file gs://{gcs_dag_bucket}/{remote_file_path} exists.")
        else:
            self.uploadPapermillToGcs(gcs_dag_bucket)
            print(f"The file gs://{gcs_dag_bucket}/{remote_file_path} does not exist.")
        self.uploadInputFileToGcs(job.input_filename,gcs_dag_bucket,job_name)
        self.prepareDag(job,gcs_dag_bucket,dag_file,credentials)
        self.uploadToGcloud(job.composer_environment_name,dag_file,credentials)



    def validate(cls, input_path: str) -> bool:
        with open(input_path, encoding="utf-8") as f:
            nb = nbformat.read(f, as_version=4)
            try:
                nb.metadata.kernelspec["name"]
            except:
                return False
            else:
                return True
