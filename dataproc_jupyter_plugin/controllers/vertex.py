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

import json

import aiohttp
import tornado
from jupyter_server.base.handlers import APIHandler

from dataproc_jupyter_plugin import credentials
from dataproc_jupyter_plugin.services import vertex


class ListSchedulesController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        """Returns available schedules"""
        try:
            region_id = self.get_argument("region_id")
            next_page_token = self.get_argument("next_page_token", default=None)
            async with aiohttp.ClientSession() as client_session:
                client = vertex.Client(
                    await credentials.get_cached(), self.log, client_session
                )

                schedules = await client.list_schedules(region_id, next_page_token)
                self.finish(json.dumps(schedules))
        except Exception as e:
            self.log.exception(f"Error fetching list of schedules: {str(e)}")
            self.finish({"error": str(e)})


class PauseScheduleController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        """Pauses the schedule"""
        try:
            region_id = self.get_argument("region_id")
            schedule_id = self.get_argument("schedule_id")
            async with aiohttp.ClientSession() as client_session:
                client = vertex.Client(
                    await credentials.get_cached(), self.log, client_session
                )

                resp = await client.pause_schedule(region_id, schedule_id)
                self.finish(json.dumps(resp))
        except Exception as e:
            self.log.exception(f"Error pausing the schedule: {str(e)}")
            self.finish({"error": str(e)})


class ResumeScheduleController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        """Resumes the paused schedule"""
        try:
            region_id = self.get_argument("region_id")
            schedule_id = self.get_argument("schedule_id")
            async with aiohttp.ClientSession() as client_session:
                client = vertex.Client(
                    await credentials.get_cached(), self.log, client_session
                )

                resp = await client.resume_schedule(region_id, schedule_id)
                self.finish(json.dumps(resp))
        except Exception as e:
            self.log.exception(f"Error resuming the schedule: {str(e)}")
            self.finish({"error": str(e)})


class DeleteScheduleController(APIHandler):
    @tornado.web.authenticated
    async def delete(self):
        """Deletes the schedule"""
        try:
            region_id = self.get_argument("region_id")
            schedule_id = self.get_argument("schedule_id")
            async with aiohttp.ClientSession() as client_session:
                client = vertex.Client(
                    await credentials.get_cached(), self.log, client_session
                )

                resp = await client.delete_schedule(region_id, schedule_id)
                self.finish(json.dumps(resp))
        except Exception as e:
            self.log.exception(f"Error deleting the schedule: {str(e)}")
            self.finish({"error": str(e)})


class TriggerScheduleController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        """Trigger the schedule"""
        try:
            region_id = self.get_argument("region_id")
            schedule_id = self.get_argument("schedule_id")
            async with aiohttp.ClientSession() as client_session:
                client = vertex.Client(
                    await credentials.get_cached(), self.log, client_session
                )

                resp = await client.trigger_schedule(region_id, schedule_id)
                self.finish(json.dumps(resp))
        except Exception as e:
            self.log.exception(f"Error triggering the schedule: {str(e)}")
            self.finish({"error": str(e)})


class UpdateScheduleController(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        """Updates the schedule"""
        try:
            region_id = self.get_argument("region_id")
            schedule_id = self.get_argument("schedule_id")
            input_data = self.get_json_body()
            async with aiohttp.ClientSession() as client_session:
                client = vertex.Client(
                    await credentials.get_cached(), self.log, client_session
                )

                resp = await client.update_schedule(region_id, schedule_id, input_data)
                self.finish(json.dumps(resp))
        except Exception as e:
            self.log.exception(f"Error updating the schedule: {str(e)}")
            self.finish({"error": str(e)})
