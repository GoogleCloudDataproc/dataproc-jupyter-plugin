# Copyright 2026 Google LLC
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
from dataproc_jupyter_plugin.services.jobs import JobsService

class JobItemController(APIHandler):
    """Controller for fetching, updating, and deleting a specific Dataproc job."""

    @tornado.web.authenticated
    async def get(self):
        try:
            job_id = self.get_argument("jobId", default=None)
            if not job_id:
                self.finish({"error": {"code": 400, "message": "Missing required parameter: jobId"}})
                return

            creds = await credentials.get_cached()
            async with aiohttp.ClientSession() as session:
                service = JobsService(creds, self.log, session)
                result = await service.get_job(job_id)
            self.finish(json.dumps(result))
        except ValueError as e:
            self.log.warning(f"Validation error in JobItemController GET: {e}")
            self.finish({"error": {"code": 400, "message": str(e)}})
        except Exception as e:
            self.log.exception("Unexpected error in JobItemController GET")
            self.finish({"error": {"code": 500, "message": f"Server error: {str(e)}"}} if not self._finished else None)

    @tornado.web.authenticated
    async def patch(self):
        try:
            job_id = self.get_argument("jobId", default=None)
            if not job_id:
                self.finish({"error": {"code": 400, "message": "Missing required parameter: jobId"}})
                return

            update_mask = self.get_argument("updateMask", default="labels")
            try:
                payload = self.get_json_body()
            except Exception as json_err:
                self.log.warning(f"Invalid JSON body in JobItemController PATCH: {json_err}")
                self.finish({"error": {"code": 400, "message": "Invalid JSON request body."}})
                return

            if not payload or not isinstance(payload, dict):
                self.finish({"error": {"code": 400, "message": "Missing or empty update payload."}})
                return

            creds = await credentials.get_cached()
            async with aiohttp.ClientSession() as session:
                service = JobsService(creds, self.log, session)
                result = await service.update_job(job_id, payload, update_mask)
            self.finish(json.dumps(result))
        except ValueError as e:
            self.log.warning(f"Validation error in JobItemController PATCH: {e}")
            self.finish({"error": {"code": 400, "message": str(e)}})
        except Exception as e:
            self.log.exception("Unexpected error in JobItemController PATCH")
            self.finish({"error": {"code": 500, "message": f"Server error: {str(e)}"}} if not self._finished else None)

    @tornado.web.authenticated
    async def delete(self):
        try:
            job_id = self.get_argument("jobId", default=None)
            if not job_id:
                self.finish({"error": {"code": 400, "message": "Missing required parameter: jobId"}})
                return

            creds = await credentials.get_cached()
            async with aiohttp.ClientSession() as session:
                service = JobsService(creds, self.log, session)
                result = await service.delete_job(job_id)
            self.finish(json.dumps(result))
        except ValueError as e:
            self.log.warning(f"Validation error in JobItemController DELETE: {e}")
            self.finish({"error": {"code": 400, "message": str(e)}})
        except Exception as e:
            self.log.exception("Unexpected error in JobItemController DELETE")
            self.finish({"error": {"code": 500, "message": f"Server error: {str(e)}"}} if not self._finished else None)


class JobCancelController(APIHandler):
    """Controller for canceling a Dataproc job."""

    @tornado.web.authenticated
    async def post(self):
        try:
            job_id = self.get_argument("jobId", default=None)
            if not job_id:
                self.finish({"error": {"code": 400, "message": "Missing required parameter: jobId"}})
                return

            creds = await credentials.get_cached()
            async with aiohttp.ClientSession() as session:
                service = JobsService(creds, self.log, session)
                result = await service.cancel_job(job_id)
            self.finish(json.dumps(result))
        except ValueError as e:
            self.log.warning(f"Validation error in JobCancelController POST: {e}")
            self.finish({"error": {"code": 400, "message": str(e)}})
        except Exception as e:
            self.log.exception("Unexpected error in JobCancelController POST")
            self.finish({"error": {"code": 500, "message": f"Server error: {str(e)}"}} if not self._finished else None)
