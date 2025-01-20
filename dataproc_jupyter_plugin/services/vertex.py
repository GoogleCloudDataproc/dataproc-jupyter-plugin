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
from cron_descriptor import get_description

import google.oauth2.credentials as oauth2
from google.cloud import storage

from dataproc_jupyter_plugin.commons.constants import (
    CONTENT_TYPE,
    VERTEX_STORAGE_BUCKET,
)
from dataproc_jupyter_plugin.models.models import (
    DescribeVertexJob,
    DescribeBucketName,
    DescribeUpdateVertexJob,
)


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
            credentials = oauth2.Credentials(token=self._access_token)
            storage_client = storage.Client(credentials=credentials)
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

    async def list_schedules(self, region_id, next_page_token=None):
        try:
            result = {}
            if next_page_token:
                api_endpoint = f"https://{region_id}-aiplatform.googleapis.com/v1/projects/{self.project_id}/locations/{region_id}/schedules?orderBy=createTime desc&pageToken={next_page_token}"
            else:
                api_endpoint = f"https://{region_id}-aiplatform.googleapis.com/v1/projects/{self.project_id}/locations/{region_id}/schedules?orderBy=createTime desc"

            headers = self.create_headers()
            async with self.client_session.get(
                api_endpoint, headers=headers
            ) as response:
                if response.status == 200:
                    resp = await response.json()
                    if not resp:
                        return result
                    else:
                        schedule_list = []
                        schedules = resp.get("schedules")
                        for schedule in schedules:
                            max_run_count = schedule.get("maxRunCount")
                            cron = schedule.get("cron")
                            cron_value = (
                                cron.split(" ", 1)[1] if ("TZ" in cron) else cron
                            )
                            if max_run_count == "1" and cron_value == "* * * * *":
                                schedule_value = "run once"
                            else:
                                schedule_value = get_description(cron)

                            formatted_schedule = {
                                "name": schedule.get("name"),
                                "displayName": schedule.get("displayName"),
                                "schedule": schedule_value,
                                "status": schedule.get("state"),
                                "createTime": schedule.get("createTime"),
                                "gcsNotebookSourceUri": schedule.get(
                                    "createNotebookExecutionJobRequest"
                                )
                                .get("notebookExecutionJob")
                                .get("gcsNotebookSource"),
                                "lastScheduledRunResponse": schedule.get(
                                    "lastScheduledRunResponse"
                                ),
                            }
                            schedule_list.append(formatted_schedule)
                        resp["schedules"] = schedule_list
                        result.update(resp)
                        return result
                else:
                    self.log.exception(
                        f"Error listing schedules: {response.reason} {await response.text()}"
                    )
                    raise Exception(
                        f"Error listing schedules: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error fetching schedules: {str(e)}")
            return {"Error fetching schedules": str(e)}

    async def pause_schedule(self, region_id, schedule_id):
        try:
            api_endpoint = (
                f"https://{region_id}-aiplatform.googleapis.com/v1/{schedule_id}:pause"
            )

            headers = self.create_headers()
            async with self.client_session.post(
                api_endpoint, headers=headers
            ) as response:
                if response.status == 200:
                    return await response.json()
                elif response.status == 204:
                    return {"message": "Schedule paused successfully"}
                else:
                    self.log.exception(
                        f"Error pausing the schedule: {response.reason} {await response.text()}"
                    )
                    raise Exception(
                        f"Error pausing the schedule: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error pausing schedule: {str(e)}")
            return {"Error pausing schedule": str(e)}

    async def resume_schedule(self, region_id, schedule_id):
        try:
            api_endpoint = (
                f"https://{region_id}-aiplatform.googleapis.com/v1/{schedule_id}:resume"
            )

            headers = self.create_headers()
            async with self.client_session.post(
                api_endpoint, headers=headers
            ) as response:
                if response.status == 200:
                    return await response.json()
                elif response.status == 204:
                    return {"message": "Schedule resumed successfully"}
                else:
                    self.log.exception(
                        f"Error resuming the schedule: {response.reason} {await response.text()}"
                    )
                    raise Exception(
                        f"Error resuming the schedule: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error resuming schedule: {str(e)}")
            return {"Error resuming schedule": str(e)}

    async def delete_schedule(self, region_id, schedule_id):
        try:
            api_endpoint = (
                f"https://{region_id}-aiplatform.googleapis.com/v1/{schedule_id}"
            )

            headers = self.create_headers()
            async with self.client_session.delete(
                api_endpoint, headers=headers
            ) as response:
                if response.status == 200:
                    return await response.json()
                elif response.status == 204:
                    return {"message": "Schedule deleted successfully"}
                else:
                    self.log.exception(
                        f"Error deleting the schedule: {response.reason} {await response.text()}"
                    )
                    raise Exception(
                        f"Error deleting the schedule: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error deleting schedule: {str(e)}")
            return {"Error deleting schedule": str(e)}

    async def get_schedule(self, region_id, schedule_id):
        try:
            api_endpoint = (
                f"https://{region_id}-aiplatform.googleapis.com/v1/{schedule_id}"
            )

            headers = self.create_headers()
            async with self.client_session.get(
                api_endpoint, headers=headers
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    self.log.exception(
                        f"Error getting the schedule: {response.reason} {await response.text()}"
                    )
                    raise Exception(
                        f"Error getting the schedule: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error getting schedule: {str(e)}")
            return {"Error getting schedule": str(e)}

    async def trigger_schedule(self, region_id, schedule_id):
        try:
            data = await self.get_schedule(region_id, schedule_id)
            api_endpoint = f"https://{region_id}-aiplatform.googleapis.com/v1/projects/{self.project_id}/locations/{region_id}/notebookExecutionJobs"

            headers = self.create_headers()
            payload = data.get("createNotebookExecutionJobRequest").get(
                "notebookExecutionJob"
            )
            payload["scheduleResourceName"] = data.get("name")
            async with self.client_session.post(
                api_endpoint, headers=headers, json=payload
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    self.log.exception(
                        f"Error triggering the schedule: {response.reason} {await response.text()}"
                    )
                    raise Exception(
                        f"Error triggering the schedule: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error triggering schedule: {str(e)}")
            return {"Error triggering schedule": str(e)}

    async def update_schedule(self, region_id, schedule_id, input_data):
        try:
            data = DescribeUpdateVertexJob(**input_data)
            custom_environment_spec = {}
            notebook_execution_job = {
                "displayName": data.display_name,
                "gcsNotebookSource": {"uri": data.gcs_notebook_source},
                "customEnvironmentSpec": custom_environment_spec,
            }
            schedule_value = (
                "* * * * *" if data.schedule_value == "" else data.schedule_value
            )
            cron = (
                schedule_value
                if data.time_zone == "UTC"
                else f"TZ={data.time_zone} {schedule_value}"
            )
            # getting list of strings from UI, the api accepts dictionary, so converting it
            labels = {
                param.split(":")[0]: param.split(":")[1] for param in data.parameters
            }

            if data.kernel_name:
                notebook_execution_job["kernelName"] = data.kernel_name
            if data.service_account:
                notebook_execution_job["serviceAccount"] = data.service_account
            if data.cloud_storage_bucket:
                notebook_execution_job["gcsOutputUri"] = data.cloud_storage_bucket
            if data.parameters:
                notebook_execution_job["labels"] = labels
            if data.machine_type:
                custom_environment_spec["machineSpec"] = {
                    "machineType": data.machine_type.split(" ", 1)[0],
                    "acceleratorType": data.accelerator_type,
                    "acceleratorCount": data.accelerator_count,
                }
            if data.network or data.subnetwork:
                custom_environment_spec["networkSpec"] = {
                    "network": data.network,
                    "subnetwork": data.subnetwork,
                }
            if data.disk_size or data.disk_type:
                custom_environment_spec["persistentDiskSpec"] = {
                    "diskSizeGb": data.disk_size,
                    "diskType": data.disk_type.split(" ", 1)[0],
                }

            payload = {
                "displayName": data.display_name,
                "maxConcurrentRunCount": "1",
                "cron": cron,
                "createNotebookExecutionJobRequest": {
                    "parent": f"projects/{self.project_id}/locations/{region_id}",
                    "notebookExecutionJob": notebook_execution_job,
                },
            }

            if data.start_time:
                payload["startTime"] = data.start_time
            if data.end_time:
                payload["endTime"] = data.end_time

            keys = payload.keys()
            keys_to_filter = ["displayName", "maxConcurrentRunCount"]
            filtered_keys = [
                item for item in keys if not any(key in item for key in keys_to_filter)
            ]
            update_mask = ",".join(filtered_keys)
            api_endpoint = f"https://{region_id}-aiplatform.googleapis.com/v1/{schedule_id}?updateMask={update_mask}"

            headers = self.create_headers()
            async with self.client_session.patch(
                api_endpoint, headers=headers, json=payload
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    self.log.exception(
                        f"Error updating the schedule: {response.reason} {await response.text()}"
                    )
                    raise Exception(
                        f"Error updating the schedule: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error updating schedule: {str(e)}")
            return {"Error updating schedule": str(e)}

    async def list_notebook_execution_jobs(self, region_id, schedule_id, start_date):
        try:
            execution_jobs = []
            api_endpoint = f"https://{region_id}-aiplatform.googleapis.com/v1/projects/{self.project_id}/locations/{region_id}/notebookExecutionJobs?filter=schedule={schedule_id}&orderBy=createTime desc"

            headers = self.create_headers()
            async with self.client_session.get(
                api_endpoint, headers=headers
            ) as response:
                if response.status == 200:
                    resp = await response.json()
                    if not resp:
                        return execution_jobs
                    else:
                        jobs = resp.get("notebookExecutionJobs")
                        for job in jobs:
                            # getting only the jobs whose create time is equal to start date
                            # splitting it in order to get only the date part from the values which is in zulu format (2011-08-12T20:17:46.384Z)
                            if (
                                start_date.rsplit("-", 1)[0]
                                == job.get("createTime").rsplit("-", 1)[0]
                            ):
                                execution_jobs.append(job)
                        return execution_jobs
                else:
                    self.log.exception(
                        f"Error fetching notebook execution jobs: {response.reason} {await response.text()}"
                    )
                    raise Exception(
                        f"Error fetching notebook execution jobs: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(
                f"Error fetching list of notebook execution jobs: {str(e)}"
            )
            return {"Error fetching list of notebook execution jobs": str(e)}
