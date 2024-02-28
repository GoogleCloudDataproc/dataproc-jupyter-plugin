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
from dataproc_jupyter_plugin.models.models import DescribeJob
import nbformat
import subprocess
from jinja2 import Environment, PackageLoader, select_autoescape
import uuid
from datetime import datetime, timedelta
from dataproc_jupyter_plugin.utils.constants import CONTENT_TYPE, GCS
import pendulum

unique_id = str(uuid.uuid4().hex)
job_id = ""
job_name = ""
TEMPLATES_FOLDER_PATH = "dagTemplates"
ROOT_FOLDER = "dataproc_jupyter_plugin"


def get_bucket(runtime_env, credentials, log):
    try:
        if (
            ("access_token" in credentials)
            and ("project_id" in credentials)
            and ("region_id" in credentials)
        ):
            access_token = credentials["access_token"]
            project_id = credentials["project_id"]
            region_id = credentials["region_id"]
            api_endpoint = f"{ENVIRONMENT_API}/projects/{project_id}/locations/{region_id}/environments/{runtime_env}"

            headers = {
                "Content-Type": CONTENT_TYPE,
                "Authorization": f"Bearer {access_token}",
            }

            response = requests.get(api_endpoint, headers=headers)
            if response.status_code == 200:
                resp = response.json()
                gcs_dag_path = resp.get("storageConfig", {}).get("bucket", "")
                return gcs_dag_path
        else:
            log.exception(f"Missing required credentials")
            raise ValueError("Missing required credentials")
    except Exception as e:
        log.exception(f"Error getting bucket name: {str(e)}")
        print(f"Error: {e}")


def check_file_exists(bucket, file_path, log):
    cmd = f"gsutil ls gs://{bucket}/dataproc-notebooks/{file_path}"
    process = subprocess.Popen(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True
    )
    output, error = process.communicate()
    if process.returncode == 0:
        return True
    else:
        if "matched no objects" in error.decode():
            return False
        else:
            log.exception(f"Error cheking file existence: {error.decode()}")
            raise FileNotFoundError(error.decode)


class ExecutorService:
    """Default execution manager that executes notebooks"""

    @staticmethod
    def upload_dag_to_gcs(dag_file, credentials, gcs_dag_bucket, log):
        if "region_id" in credentials:
            cmd = f"gsutil cp '{dag_file}' gs://{gcs_dag_bucket}/dags/"
            process = subprocess.Popen(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True
            )
            output, error = process.communicate()
        if process.returncode == 0:
            log.info(f"Dag file uploaded to gcs successfully")
            os.remove(dag_file)
        if process.returncode != 0:
            log.exception(f"Error uploading dag file to gcs: {error.decode()}")
            raise IOError(error.decode)

    @staticmethod
    def upload_input_file_to_gcs(input, gcs_dag_bucket, job_name, log):
        cmd = f"gsutil cp './{input}' gs://{gcs_dag_bucket}/dataproc-notebooks/{job_name}/input_notebooks/"
        process = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True
        )
        output, error = process.communicate()
        if process.returncode == 0:
            log.info(f"Input file uploaded to gcs successfully")
        else:
            log.exception(f"Error uploading input file to gcs: {error.decode()}")
            raise IOError(error.decode)

    @staticmethod
    def upload_papermill_to_gcs(gcs_dag_bucket, log):
        env = Environment(
            loader=PackageLoader("dataproc_jupyter_plugin", "dagTemplates"),
            autoescape=select_autoescape(["py"]),
        )
        wrapper_papermill_path = env.get_template("wrapper_papermill.py").filename
        cmd = f"gsutil cp '{wrapper_papermill_path}' gs://{gcs_dag_bucket}/dataproc-notebooks/"
        process = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True
        )
        output, error = process.communicate()
        print(process.returncode, error, output)
        if process.returncode == 0:
            log.info(f"Papermill file uploaded to gcs successfully")
            print(process.returncode, error, output)
        else:
            log.exception(f"Error uploading papermill file to gcs: {error.decode()}")
            raise IOError(error.decode)

    @staticmethod
    def prepare_dag(job, gcs_dag_bucket, dag_file, credentials, log):
        log.info(f"Generating dag file")
        DAG_TEMPLATE_CLUSTER_V1 = "pysparkJobTemplate-v1.txt"
        DAG_TEMPLATE_SERVERLESS_V1 = "pysparkBatchTemplate-v1.txt"
        environment = Environment(
            loader=PackageLoader("dataproc_jupyter_plugin", TEMPLATES_FOLDER_PATH)
        )
        if ("project_id" in credentials) and ("region_id" in credentials):
            gcp_project_id = credentials["project_id"]
            gcp_region_id = credentials["region_id"]
        cmd = "gcloud config get-value account"
        process = subprocess.Popen(
            cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
        )
        user, error = process.communicate()
        owner = user.split("@")[0]  # getting username from email
        if job.schedule_value == "":
            schedule_interval = "@once"
        else:
            schedule_interval = job.schedule_value
        if job.time_zone == "":
            yesterday = datetime.combine(
                datetime.today() - timedelta(1), datetime.min.time()
            )
            start_date = yesterday
            time_zone = ""
        else:
            yesterday = pendulum.now().subtract(days=1)
            desired_timezone = job.time_zone
            dag_timezone = pendulum.timezone(desired_timezone)
            start_date = yesterday.replace(tzinfo=dag_timezone)
            time_zone = job.time_zone
        if len(job.parameters) != 0:
            parameters = "\n".join(item.replace(":", ": ") for item in job.parameters)
        else:
            parameters = ""
        if job.mode_selected == "cluster":
            template = environment.get_template(DAG_TEMPLATE_CLUSTER_V1)
            if not job.input_filename.startswith(GCS):
                input_notebook = f"gs://{gcs_dag_bucket}/dataproc-notebooks/{job.name}/input_notebooks/{job.input_filename}"
            else:
                input_notebook = job.input_filename
            content = template.render(
                job,
                inputFilePath=f"gs://{gcs_dag_bucket}/dataproc-notebooks/wrapper_papermill.py",
                gcpProjectId=gcp_project_id,
                gcpRegion=gcp_region_id,
                input_notebook=input_notebook,
                output_notebook=f"gs://{gcs_dag_bucket}/dataproc-output/{job.name}/output-notebooks/{job.name}_{job.dag_id}.ipynb",
                owner=owner,
                schedule_interval=schedule_interval,
                start_date=start_date,
                parameters=parameters,
                time_zone=time_zone,
            )
        else:
            template = environment.get_template(DAG_TEMPLATE_SERVERLESS_V1)
            job_dict = job.dict()
            phs_path = (
                job_dict.get("serverless_name", {})
                .get("environmentConfig", {})
                .get("peripheralsConfig", {})
                .get("sparkHistoryServerConfig", {})
                .get("dataprocCluster", "")
            )
            serverless_name = (
                job_dict.get("serverless_name", {})
                .get("jupyterSession", {})
                .get("displayName", "")
            )
            custom_container = (
                job_dict.get("serverless_name", {})
                .get("runtimeConfig", {})
                .get("containerImage", "")
            )
            metastore_service = (
                job_dict.get("serverless_name", {})
                .get("environmentConfig", {})
                .get("peripheralsConfig", {})
                .get("metastoreService", {})
            )
            if not job.input_filename.startswith(GCS):
                input_notebook = f"gs://{gcs_dag_bucket}/dataproc-notebooks/{job.name}/input_notebooks/{job.input_filename}"
            else:
                input_notebook = job.input_filename
            content = template.render(
                job,
                inputFilePath=f"gs://{gcs_dag_bucket}/dataproc-notebooks/wrapper_papermill.py",
                gcpProjectId=gcp_project_id,
                gcpRegion=gcp_region_id,
                input_notebook=input_notebook,
                output_notebook=f"gs://{gcs_dag_bucket}/dataproc-output/{job.name}/output-notebooks/{job.name}_{job.dag_id}.ipynb",
                owner=owner,
                schedule_interval=schedule_interval,
                start_date=start_date,
                parameters=parameters,
                phs_path=phs_path,
                serverless_name=serverless_name,
                time_zone=time_zone,
                custom_container=custom_container,
                metastore_service=metastore_service,
            )

        print(content)
        with open(dag_file, mode="w", encoding="utf-8") as message:
            message.write(content)

    def execute(self, credentials, input_data, log):
        job = DescribeJob(**input_data)
        global job_id
        global job_name
        job_id = job.dag_id
        job_name = job.name
        dag_file = f"dag_{job_name}.py"
        gcs_dag_bucket = get_bucket(job.composer_environment_name, credentials, log)
        remote_file_path = "wrapper_papermill.py"

        if check_file_exists(gcs_dag_bucket, remote_file_path, log):
            print(f"The file gs://{gcs_dag_bucket}/{remote_file_path} exists.")
        else:
            self.upload_papermill_to_gcs(gcs_dag_bucket, log)
            print(f"The file gs://{gcs_dag_bucket}/{remote_file_path} does not exist.")
        if not job.input_filename.startswith(GCS):
            self.upload_input_file_to_gcs(
                job.input_filename, gcs_dag_bucket, job_name, log
            )
        self.prepare_dag(job, gcs_dag_bucket, dag_file, credentials, log)
        self.upload_dag_to_gcs(dag_file, credentials, gcs_dag_bucket, log)
