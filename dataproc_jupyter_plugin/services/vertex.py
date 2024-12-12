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

from cron_descriptor import get_description

from dataproc_jupyter_plugin.commons.constants import (
    CONTENT_TYPE,
)
from dataproc_jupyter_plugin.models.models import DescribeUpdateVertexJob


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
                            if max_run_count == "1" and cron.split(' ', 1)[1] == "* * * * *" or "* * * *":
                                schedule_value = "run once"
                            else:
                                schedule_value = get_description(cron)
                            formatted_schedule = {
                                "name": schedule.get("name"),
                                "displayName": schedule.get("displayName"),
                                "schedule": schedule_value,
                                "status": schedule.get("state"),
                                "lastScheduledRunResponse": schedule.get("lastScheduledRunResponse")
                            }
                            schedule_list.append(formatted_schedule)
                        resp["schedules"] = schedule_list
                        result.update(resp)
                        return result
                else:
                    self.log.exception("Error listing schedules")
                    raise Exception(
                        f"Error listing schedules: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error fetching schedules: {str(e)}")
            return {"Error fetching schedules": str(e)}

    async def pause_schedule(self, region_id, schedule_id):
        try:
            api_endpoint = f"https://{region_id}-aiplatform.googleapis.com/v1/{schedule_id}:pause"

            headers = self.create_headers()
            async with self.client_session.post(
                api_endpoint, headers=headers
            ) as response:
                if response.status == 200:
                    return await response.json()
                elif response.status == 204:
                    return {"message": "Schedule paused successfully"}
                else:
                    self.log.exception("Error pausing the schedule")
                    raise Exception(
                        f"Error pausing the schedule: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error pausing schedule: {str(e)}")
            return {"Error pausing schedule": str(e)}

    async def resume_schedule(self, region_id, schedule_id):
        try:
            api_endpoint = f"https://{region_id}-aiplatform.googleapis.com/v1/{schedule_id}:resume"

            headers = self.create_headers()
            async with self.client_session.post(
                api_endpoint, headers=headers
            ) as response:
                if response.status == 200:
                    return await response.json()
                elif response.status == 204:
                    return {"message": "Schedule resumed successfully"}
                else:
                    self.log.exception("Error resuming the schedule")
                    raise Exception(
                        f"Error resuming the schedule: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error resuming schedule: {str(e)}")
            return {"Error resuming schedule": str(e)}

    async def delete_schedule(self, region_id, schedule_id):
        try:
            api_endpoint = f"https://{region_id}-aiplatform.googleapis.com/v1/{schedule_id}"

            headers = self.create_headers()
            async with self.client_session.delete(
                api_endpoint, headers=headers
            ) as response:
                if response.status == 200:
                    return await response.json()
                elif response.status == 204:
                    return {"message": "Schedule deleted successfully"}
                else:
                    self.log.exception("Error deleting the schedule")
                    raise Exception(
                        f"Error deleting the schedule: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error deleting schedule: {str(e)}")
            return {"Error deleting schedule": str(e)}

    async def get_schedule(self, region_id, schedule_id):
        try:
            api_endpoint = f"https://{region_id}-aiplatform.googleapis.com/v1/{schedule_id}"

            headers = self.create_headers()
            async with self.client_session.get(
                api_endpoint, headers=headers
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    self.log.exception("Error getting the schedule")
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
            async with self.client_session.post(
                api_endpoint, headers=headers, json=payload
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    self.log.exception("Error triggering the schedule")
                    raise Exception(
                        f"Error triggering the schedule: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error triggering schedule: {str(e)}")
            return {"Error triggering schedule": str(e)}

    def get_keys(data, parent_key=""):
        keys = []
        for key, value in data.items():
            full_key = f"{parent_key}.{key}" if parent_key else key
            if isinstance(value, dict):
                keys.extend(get_keys(value, full_key))
            else:
                keys.append(full_key)
        return keys

    async def update_schedule(self, region_id, schedule_id, input_data):
        try:
            data = DescribeUpdateVertexJob(**input_data)
            notebook_execution_job = {"displayName": data.display_name}
            schedule_value = (
                "* * * * *" if data.schedule_value == "" else data.schedule_value
            )

            if data.kernel_name:
                notebook_execution_job["kernelName"]: data.kernel_name
            if data.service_account:
                notebook_execution_job["serviceAccount"]: data.service_account
            if data.cloud_storage_bucket:
                notebook_execution_job["gcsOutputUri"]: data.cloud_storage_bucket
            if data.parameters:
                notebook_execution_job["labels"]: data.parameters
            if data.machine_type:
                notebook_execution_job["customEnvironmentSpec"]: {
                    "machineSpec": {
                        "machineType": data.machine_type,
                        "acceleratorType": data.accelerator_type,
                        "acceleratorCount": data.accelerator_count,
                    }
                }
            if data.network:
                notebook_execution_job["customEnvironmentSpec"]: {
                    "networkSpec": {
                        "network": data.network,
                    }
                }
            if data.subnetwork:
                notebook_execution_job["customEnvironmentSpec"]: {
                    "networkSpec": {
                        "subnetwork": data.subnetwork,
                    }
                }

            payload = {
                "displayName": data.display_name,
                "maxConcurrentRunCount": "1",
                "cron": f"TZ={data.time_zone} {schedule_value}",
                "createNotebookExecutionJobRequest": {
                    "parent": f"projects/{self.project_id}/locations/{region_id}",
                    "notebookExecutionJob": notebook_execution_job,
                },
            }

            if data.start_time:
                payload["startTime"]: data.start_time
            if data.end_date:
                payload["endTime"]: data.end_time

            keys = get_keys(payload)
            filtered_keys = [item for item in keys if "displayName" not in item]
            update_mask = ", ".join(filtered_keys)
            api_endpoint = f"https://{region_id}-aiplatform.googleapis.com/v1/{schedule_id}?updateMask={update_mask}"

            headers = self.create_headers()
            async with self.client_session.patch(
                api_endpoint, headers=headers, json=payload
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    self.log.exception("Error deleting the schedule")
                    raise Exception(
                        f"Error updating the schedule: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error updating schedule: {str(e)}")
            return {"Error updating schedule": str(e)}
