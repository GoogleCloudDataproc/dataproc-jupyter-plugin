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

import aiohttp

from google.cloud import storage
from dataproc_jupyter_plugin.commons.constants import (
    CONTENT_TYPE,
    VERTEX_STORAGE_BUCKET,
)
from dataproc_jupyter_plugin.models.models import DescribeVertexJob, DescribeBucketName


class Client:
    client_session = aiohttp.ClientSession()

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

    async def check_bucket_exists(self, bucket_name):
        try:
            if not bucket_name:
                raise ValueError("Bucket name cannot be empty")
            cloud_storage_buckets = []
            storage_client = storage.Client()
            buckets = storage_client.list_buckets()
            for bucket in buckets:
                cloud_storage_buckets.append(bucket.name)
            return bucket_name in cloud_storage_buckets
        except Exception as error:
            self.log.exception(f"Error checking Bucket: {error}")
            raise IOError(f"Error checking Bucket: {error}")

    async def create_gcs_bucket(self, bucket_name):
        try:
            if not bucket_name:
                raise ValueError("Bucket name cannot be empty")
            storage_client = storage.Client()
            bucket = storage_client.create_bucket(bucket_name)
        except Exception as error:
            self.log.exception(f"Error in creating Bucket: {error}")
            raise IOError(f"Error in creating Bucket: {error}")

    async def upload_to_gcs(self, bucket_name, file_path, job_name):
        input_notebook = file_path.split("/")[-1]
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)

        # uploading the input file
        blob_name = f"{job_name}/{input_notebook}"
        blob = bucket.blob(blob_name)
        blob.upload_from_filename(file_path)

        # uploading json file containing the input file path
        json_blob_name = f"{job_name}/{job_name}.json"
        json_blob = bucket.blob(json_blob_name)
        json_blob.upload_from_string(f"gs://{bucket_name}/{blob_name}")

        self.log.info(f"File {input_notebook} uploaded to gcs successfully")
        return blob_name

    async def create_schedule(self, job, file_path, bucket_name):
        try:
            schedule_value = (
                "* * * * *" if job.schedule_value == "" else job.schedule_value
            )
            cron = (
                schedule_value
                if job.time_zone == "UTC"
                else f"TZ={job.time_zone} {schedule_value}"
            )
            machine_type = job.machine_type.split(" ", 1)[0]
            disk_type = job.disk_type.split(" ", 1)[0]

            # getting list of strings from UI, the api accepts dictionary, so converting it
            labels = {
                param.split(":")[0]: param.split(":")[1] for param in job.parameters
            }

            api_endpoint = f"https://{self.region_id}-aiplatform.googleapis.com/v1/projects/{self.project_id}/locations/{self.region_id}/schedules"
            headers = self.create_headers()
            payload = {
                "displayName": job.display_name,
                "cron": cron,
                "maxConcurrentRunCount": "1",
                "createNotebookExecutionJobRequest": {
                    "parent": f"projects/{self.project_id}/locations/{self.region_id}",
                    "notebookExecutionJob": {
                        "displayName": job.display_name,
                        "labels": labels,
                        "customEnvironmentSpec": {
                            "machineSpec": {
                                "machineType": machine_type,
                                "acceleratorType": job.accelerator_type,
                                "acceleratorCount": job.accelerator_count,
                            },
                            "persistentDiskSpec": {
                                "diskType": disk_type,
                                "diskSizeGb": job.disk_size,
                            },
                            "networkSpec": {
                                "enableInternetAccess": "TRUE",
                                "network": job.network,
                                "subnetwork": job.subnetwork,
                            },
                        },
                        "gcsNotebookSource": {"uri": f"gs://{bucket_name}/{file_path}"},
                        "gcsOutputUri": job.cloud_storage_bucket,
                        "serviceAccount": job.service_account,
                        "kernelName": job.kernel_name,
                    },
                },
            }
            if job.max_run_count:
                payload["maxRunCount"] = job.max_run_count
            if job.start_time:
                payload["startTime"] = job.start_time
            if job.end_time:
                payload["endTime"] = job.end_time

            async with self.client_session.post(
                api_endpoint, headers=headers, json=payload
            ) as response:
                if response.status == 200:
                    resp = await response.json()
                    return resp
                else:
                    self.log.exception("Error creating the schedule")
                    raise Exception(
                        f"Error creating the schedule: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error creating schedule: {str(e)}")
            raise Exception(f"Error creating schedule: {str(e)}")

    async def create_job_schedule(self, input_data):
        try:
            job = DescribeVertexJob(**input_data)
            if await self.check_bucket_exists(VERTEX_STORAGE_BUCKET):
                print("The bucket exists")
            else:
                await self.create_gcs_bucket(VERTEX_STORAGE_BUCKET)
                print("The bucket is created")

            file_path = await self.upload_to_gcs(
                VERTEX_STORAGE_BUCKET, job.input_filename, job.display_name
            )
            res = await self.create_schedule(job, file_path, VERTEX_STORAGE_BUCKET)
            return res
        except Exception as e:
            return {"error": str(e)}

    async def create_new_bucket(self, input_data):
        try:
            data = DescribeBucketName(**input_data)
            res = await self.create_gcs_bucket(data.bucket_name)
            return res
        except Exception as e:
            return {"error": str(e)}

            
    async def list_uiconfig(self, region_id):
        try:
            uiconfig = []
            api_endpoint = f"https://{region_id}-aiplatform.googleapis.com/ui/projects/{self.project_id}/locations/{region_id}/uiConfig"

            headers = self.create_headers()
            async with self.client_session.get(
                api_endpoint, headers=headers
            ) as response:
                if response.status == 200:
                    resp = await response.json()
                    if not resp:
                        return uiconfig
                    else:
                        for machineconfig in resp.get("notebookRuntimeConfig").get(
                            "machineConfigs"
                        ):
                            ramBytes_in_gb = round(
                                int(machineconfig.get("ramBytes")) / 1000000000, 2
                            )
                            formatted_config = {
                                "machineType": f"{machineconfig.get('machineType')} ({machineconfig.get('cpuCount')} CPUs, {ramBytes_in_gb} GB RAM)",
                                "acceleratorConfigs": machineconfig.get(
                                    "acceleratorConfigs"
                                ),
                            }
                            uiconfig.append(formatted_config)
                        return uiconfig
                else:
                    self.log.exception("Error listing ui config")
                    raise Exception(
                        f"Error getting vertex ui config: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error fetching ui config: {str(e)}")
            return {"Error fetching ui config": str(e)}
