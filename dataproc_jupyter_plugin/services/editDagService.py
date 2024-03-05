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
import requests
import urllib
from dataproc_jupyter_plugin.utils.constants import CONTENT_TYPE, storage_url


class DagEditService:
    def get_dag_file(self, credentials, dag_id, bucket_name, log):
        try:
            if ("access_token" in credentials) and ("project_id" in credentials):
                access_token = credentials["access_token"]
                project_id = credentials["project_id"]
                file_path = f"dags/dag_{dag_id}.py"
                encoded_path = urllib.parse.quote(file_path, safe="")
                api_endpoint = (
                    f"{storage_url}b/{bucket_name}/o/{encoded_path}?alt=media"
                )
                headers = {
                    "Content-Type": CONTENT_TYPE,
                    "Authorization": f"Bearer {access_token}",
                    "X-Goog-User-Project": project_id,
                }
                response = requests.get(api_endpoint, headers=headers)
                if response.status_code == 200:
                    log.info("Dag file response fetched")

                return response.content
            else:
                log.exception(f"Missing required credentials")
                raise ValueError("Missing required credentials")
        except Exception as e:
            log.exception(f"Error reading dag file: {str(e)}")
            return {"error": str(e)}

    def edit_jobs(self, dag_id, bucket_name, credentials, log):
        try:
            cluster_name = ""
            serverless_name = ""
            email_on_success = "False"
            stop_cluster_check = "False"
            mode_selected = "serverless"
            time_zone = ""
            pattern = r"parameters\s*=\s*'''(.*?)'''"
            file_response = DagEditService.get_dag_file(
                self, credentials, dag_id, bucket_name, log
            )
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
                        # Remove quotes from email addresses
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
                log.exception(f"No Dag file found")
        except Exception as e:
            log.exception(f"Error downloading dag file: {str(e)}")
