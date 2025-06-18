# Copyright 2024 Google LLC
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

import re
import subprocess
import urllib
from google.cloud import storage

from dataproc_jupyter_plugin import urls
from dataproc_jupyter_plugin.commons.commands import async_run_gsutil_subcommand
from dataproc_jupyter_plugin.commons.constants import (
    COMPOSER_SERVICE_NAME,
    CONTENT_TYPE,
    STORAGE_SERVICE_DEFAULT_URL,
    STORAGE_SERVICE_NAME,
    TAGS,
)


class Client:
    def __init__(self, credentials, log, client_session):
        self.log = log
        if not (
            ("access_token" in credentials)
            and ("project_id" in credentials)
            and ("region_id" in credentials)
        ):
            self.log.exception("Missing required credentials")
            raise ValueError("Missing required credentials")
        self._access_token = credentials["access_token"]
        self.project_id = credentials["project_id"]
        self.region_id = credentials["region_id"]
        self.client_session = client_session

    def create_headers(self):
        return {
            "Content-Type": CONTENT_TYPE,
            "Authorization": f"Bearer {self._access_token}",
        }

    async def get_airflow_uri(self, composer_name):
        try:
            composer_url = await urls.gcp_service_url(COMPOSER_SERVICE_NAME)
            api_endpoint = f"{composer_url}v1/projects/{self.project_id}/locations/{self.region_id}/environments/{composer_name}"
            async with self.client_session.get(
                api_endpoint, headers=self.create_headers()
            ) as response:
                if response.status == 200:
                    resp = await response.json()
                    airflow_uri = resp.get("config", {}).get("airflowUri", "")
                    bucket = resp.get("storageConfig", {}).get("bucket", "")
                    return airflow_uri, bucket
                else:
                    raise Exception(
                        f"Error getting airflow uri: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error getting airflow uri: {str(e)}")
            raise Exception(f"Error getting airflow uri: {str(e)}")

    async def list_jobs(self, composer_name):
        airflow_uri, bucket = await self.get_airflow_uri(composer_name)
        try:
            api_endpoint = f"{airflow_uri}/api/v1/dags?tags={TAGS}"
            async with self.client_session.get(
                api_endpoint, headers=self.create_headers()
            ) as response:
                if response.status == 200:
                    resp = await response.json()
                    return resp, bucket
                else:
                    raise Exception(
                        f"Error lsiting scheduled jobs: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error getting dag list: {str(e)}")
            return {"error": str(e)}

    async def delete_job(self, composer_name, dag_id, from_page):
        airflow_uri, bucket_name = await self.get_airflow_uri(composer_name)
        try:
            api_endpoint = f"{airflow_uri}/api/v1/dags/{dag_id}"
            # Delete the DAG via the Airflow API if from_page is None
            if from_page is None:
                async with self.client_session.delete(
                    api_endpoint, headers=self.create_headers()
                ) as response:
                    self.log.info(response)
            bucket = storage.Client().bucket(bucket_name)
            blob_name = f"dags/dag_{dag_id}.py"
            blob = bucket.blob(blob_name)
            blob.delete()

            self.log.info(f"Deleted {blob_name} from bucket {bucket_name}")

            return 0
        except Exception as e:
            self.log.exception(f"Error deleting DAG: {str(e)}")
            return {"error": str(e)}

    async def update_job(self, composer_name, dag_id, status):
        airflow_uri, bucket = await self.get_airflow_uri(composer_name)
        try:
            api_endpoint = f"{airflow_uri}/api/v1/dags/{dag_id}"

            data = {"is_paused": status.lower() != "true"}
            async with self.client_session.patch(
                api_endpoint, json=data, headers=self.create_headers()
            ) as response:
                if response.status == 200:
                    return 0
                else:
                    self.log.exception("Error updating status")
                    return {
                        "error": f"Error updating Airflow DAG status: {response.reason} {await response.text()}"
                    }
        except Exception as e:
            self.log.exception(f"Error updating status: {str(e)}")
            return {"error": str(e)}

    async def list_dag_runs(self, composer_name, dag_id, start_date, end_date, offset):
        airflow_uri, bucket = await self.get_airflow_uri(composer_name)
        try:
            api_endpoint = f"{airflow_uri}/api/v1/dags/{dag_id}/dagRuns?execution_date_gte={start_date}&execution_date_lte={end_date}&offset={offset}"
            async with self.client_session.get(
                api_endpoint, headers=self.create_headers()
            ) as response:
                if response.status == 200:
                    resp = await response.json()
                    return resp
                else:
                    raise Exception(
                        f"Error displaying BigQuery preview data: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error fetching dag run list: {str(e)}")
            return {"error": str(e)}

    async def list_dag_run_task(self, composer_name, dag_id, dag_run_id):
        airflow_uri, bucket = await self.get_airflow_uri(composer_name)
        try:
            api_endpoint = (
                f"{airflow_uri}/api/v1/dags/{dag_id}/dagRuns/{dag_run_id}/taskInstances"
            )
            async with self.client_session.get(
                api_endpoint, headers=self.create_headers()
            ) as response:
                if response.status == 200:
                    resp = await response.json()
                    return resp
                else:
                    raise Exception(
                        f"Error listing dag runs: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error fetching dag run task list: {str(e)}")
            return {"error": str(e)}

    async def list_dag_run_task_logs(
        self, composer_name, dag_id, dag_run_id, task_id, task_try_number
    ):
        airflow_uri, bucket = await self.get_airflow_uri(composer_name)
        try:
            api_endpoint = f"{airflow_uri}/api/v1/dags/{dag_id}/dagRuns/{dag_run_id}/taskInstances/{task_id}/logs/{task_try_number}"
            async with self.client_session.get(
                api_endpoint, headers=self.create_headers()
            ) as response:
                if response.status == 200:
                    resp = await response.text()
                    return {"content": resp}
                else:
                    raise Exception(
                        f"Error listing dag run task logs: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error fetching dag run task logs: {str(e)}")
            return {"error": str(e)}

    async def get_dag_file(self, dag_id, bucket_name):
        try:
            file_path = f"dags/dag_{dag_id}.py"
            encoded_path = urllib.parse.quote(file_path, safe="")
            storage_url = await urls.gcp_service_url(
                STORAGE_SERVICE_NAME, default_url=STORAGE_SERVICE_DEFAULT_URL
            )
            api_endpoint = f"{storage_url}b/{bucket_name}/o/{encoded_path}?alt=media"
            async with self.client_session.get(
                api_endpoint, headers=self.create_headers()
            ) as response:
                if response.status == 200:
                    self.log.info("Dag file response fetched")
                    return await response.read()
                else:
                    raise Exception(
                        f"Error getting dag file: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error reading dag file: {str(e)}")
            return {"error": str(e)}

    async def edit_jobs(self, dag_id, bucket_name):
        try:
            cluster_name = ""
            serverless_name = ""
            email_on_success = "False"
            stop_cluster_check = "False"
            mode_selected = "serverless"
            time_zone = ""
            pattern = r"parameters\s*=\s*'''(.*?)'''"
            file_response = await self.get_dag_file(dag_id, bucket_name)
            content_str = file_response.decode("utf-8")
            file_content = re.sub(r"(?<!\\)\\(?!n)", "", content_str)

            if file_content:
                for line in file_content.split("\n"):
                    if "input_notebook" in line:
                        input_notebook = line.split("=")[-1].strip().strip("'\"")
                        break

                for line in file_content.split("\n"):
                    match = re.search(pattern, file_content, re.DOTALL)
                    if match:
                        parameters_yaml = match.group(1)
                        parameters_list = [
                            line.strip()
                            for line in parameters_yaml.split("\n")
                            if line.strip()
                        ]
                    else:
                        parameters_list = []

                for line in file_content.split("\n"):
                    if "email" in line:
                        # Extract the email string from the line
                        email_str = (
                            line.split(":")[-1].strip().strip("'\"").replace(",", "")
                        )
                        # Use regular expression to extract email addresses
                        email_list = re.findall(
                            r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
                            email_str,
                        )
                        # Remove quotes from the email addresses
                        email_list = [email.strip("'\"") for email in email_list]
                        break
                for line in file_content.split("\n"):
                    if "cluster_name" in line:
                        cluster_name = (
                            line.split(":")[-1]
                            .strip()
                            .strip("'\"}")
                            .split("'")[0]
                            .strip()
                        )  # Extract project_id from the line
                    elif "submit_pyspark_job" in line:
                        mode_selected = "cluster"
                    elif "'retries'" in line:
                        retries = line.split(":")[-1].strip().strip("'\"},")
                        retry_count = int(
                            retries.strip("'\"")
                        )  # Extract retry_count from the line
                    elif "retry_delay" in line:
                        retry_delay = int(
                            line.split("int('")[1].split("')")[0]
                        )  # Extract retry_delay from the line
                    elif "email_on_failure" in line:
                        second_part = line.split(":")[1].strip()
                        email_on_failure = second_part.split("'")[
                            1
                        ]  # Extract email_failure from the line
                    elif "email_on_retry" in line:
                        second_part = line.split(":")[1].strip()
                        email_on_retry = second_part.split("'")[1]
                    elif "email_on_success" in line:
                        second_part = line.split(":")[1].strip()
                        email_on_success = second_part.split("'")[1]
                    elif "schedule_interval" in line:
                        schedule_interval = (
                            line.split("=")[-1]
                            .strip()
                            .strip("'\"")
                            .split(",")[0]
                            .rstrip("'\"")
                        )  # Extract schedule_interval from the line
                    elif "stop_cluster_check" in line:
                        stop_cluster_check = line.split("=")[-1].strip().strip("'\"")
                    elif "serverless_name" in line:
                        serverless_name = line.split("=")[-1].strip().strip("'\"")
                    elif "time_zone" in line:
                        time_zone = line.split("=")[-1].strip().strip("'\"")

                payload = {
                    "input_filename": input_notebook,
                    "parameters": parameters_list,
                    "mode_selected": mode_selected,
                    "cluster_name": cluster_name,
                    "serverless_name": serverless_name,
                    "retry_count": retry_count,
                    "retry_delay": retry_delay,
                    "email_failure": email_on_failure,
                    "email_delay": email_on_retry,
                    "email_success": email_on_success,
                    "email": email_list,
                    "schedule_value": schedule_interval,
                    "stop_cluster": stop_cluster_check,
                    "time_zone": time_zone,
                }
                return payload

            else:
                self.log.exception("No Dag file found")
        except Exception as e:
            self.log.exception(f"Error downloading dag file: {str(e)}")

    async def list_import_errors(self, composer):
        airflow_uri, bucket = await self.get_airflow_uri(composer)
        try:
            api_endpoint = (
                f"{airflow_uri}/api/v1/importErrors?order_by=-import_error_id"
            )
            async with self.client_session.get(
                api_endpoint, headers=self.create_headers()
            ) as response:
                if response.status == 200:
                    resp = await response.json()
                    return resp
                else:
                    raise Exception(
                        f"Error listing import errors: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error fetching import error list: {str(e)}")
            return {"error": str(e)}

    async def dag_trigger(self, dag_id, composer):
        airflow_uri, bucket = await self.get_airflow_uri(composer)
        try:
            api_endpoint = f"{airflow_uri}/api/v1/dags/{dag_id}/dagRuns"
            body = {"conf": {}}
            async with self.client_session.post(
                api_endpoint, headers=self.create_headers(), json=body
            ) as response:
                if response.status == 200:
                    resp = await response.json()
                    return resp
                else:
                    raise Exception(
                        f"Error triggering dag: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error triggering dag: {str(e)}")
            return {"error": str(e)}
