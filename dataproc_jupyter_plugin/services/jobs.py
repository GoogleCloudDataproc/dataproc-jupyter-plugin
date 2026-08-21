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
import asyncio
import aiohttp
from dataproc_jupyter_plugin import urls
from dataproc_jupyter_plugin.commons.constants import (
    CONTENT_TYPE,
    DATAPROC_SERVICE_NAME,
)


class JobsService:
    """Service class to handle Dataproc Job REST API operations."""

    def __init__(self, credentials, log, client_session):
        self.log = log
        if not credentials:
            self.log.error("Credentials object is None or empty")
            raise ValueError("Authentication credentials are missing or invalid.")

        if not (
            credentials.get("access_token")
            and credentials.get("project_id")
            and credentials.get("region_id")
        ):
            missing = [
                k for k in ["access_token", "project_id", "region_id"]
                if not credentials.get(k)
            ]
            self.log.error(f"Missing required credential fields: {missing}")
            raise ValueError(f"Missing required credential fields: {', '.join(missing)}")

        self._access_token = credentials["access_token"]
        self.project_id = credentials["project_id"]
        self.region_id = credentials["region_id"]
        self.client_session = client_session

    def create_headers(self):
        return {
            "Content-Type": CONTENT_TYPE,
            "Authorization": f"Bearer {self._access_token}",
        }

    async def get_base_url(self):
        try:
            dataproc_url = await urls.gcp_service_url(DATAPROC_SERVICE_NAME)
            if not dataproc_url.endswith("/"):
                dataproc_url += "/"
            return f"{dataproc_url}v1/projects/{self.project_id}/regions/{self.region_id}/jobs"
        except Exception as e:
            self.log.exception("Failed to resolve Dataproc service URL")
            raise RuntimeError(f"Failed to resolve Dataproc service URL: {str(e)}") from e

    async def _parse_response(self, response, operation_name):
        """Helper method to safely parse HTTP response from Dataproc API."""
        try:
            if response.status == 204:
                return {}
            try:
                res_json = await response.json()
                return res_json
            except (aiohttp.ContentTypeError, json.JSONDecodeError):
                raw_text = await response.text()
                if response.status == 200 and not raw_text.strip():
                    return {}
                self.log.warning(
                    f"Non-JSON response received during {operation_name} (HTTP {response.status}): {raw_text}"
                )
                if response.status != 200:
                    return {
                        "error": {
                            "code": response.status,
                            "message": f"HTTP {response.status} {response.reason}: {raw_text}",
                        }
                    }
                return {
                    "error": {
                        "code": 500,
                        "message": f"Failed to parse server response as JSON during {operation_name}.",
                    }
                }
        except Exception as e:
            self.log.exception(f"Error parsing response during {operation_name}")
            return {
                "error": {
                    "code": 500,
                    "message": f"Response processing error during {operation_name}: {str(e)}",
                }
            }

    async def get_job(self, job_id):
        """Get details for a specific Dataproc job."""
        if not job_id:
            return {"error": {"code": 400, "message": "Job ID must not be empty."}}
        try:
            base_url = await self.get_base_url()
            url = f"{base_url}/{job_id}"
            async with self.client_session.get(
                url, headers=self.create_headers()
            ) as response:
                return await self._parse_response(response, f"get_job({job_id})")
        except aiohttp.ClientError as e:
            self.log.exception(f"HTTP network error while fetching job {job_id}: {e}")
            return {"error": {"code": 503, "message": f"Network error connecting to Dataproc API: {str(e)}"}}
        except asyncio.TimeoutError:
            self.log.exception(f"Timeout error while fetching job {job_id}")
            return {"error": {"code": 504, "message": f"Request to fetch job {job_id} timed out."}}
        except Exception as e:
            self.log.exception(f"Unexpected error fetching details for job {job_id}: {e}")
            return {"error": {"code": 500, "message": f"Unexpected error fetching job details: {str(e)}"}}

    async def update_job(self, job_id, payload, update_mask="labels"):
        """Update an existing Dataproc job."""
        if not job_id:
            return {"error": {"code": 400, "message": "Job ID must not be empty."}}
        if not payload or not isinstance(payload, dict):
            return {"error": {"code": 400, "message": "Invalid or missing job payload."}}
        try:
            base_url = await self.get_base_url()
            url = f"{base_url}/{job_id}?updateMask={update_mask}"
            async with self.client_session.patch(
                url, headers=self.create_headers(), data=json.dumps(payload)
            ) as response:
                return await self._parse_response(response, f"update_job({job_id})")
        except aiohttp.ClientError as e:
            self.log.exception(f"HTTP network error while updating job {job_id}: {e}")
            return {"error": {"code": 503, "message": f"Network error updating job: {str(e)}"}}
        except asyncio.TimeoutError:
            self.log.exception(f"Timeout error while updating job {job_id}")
            return {"error": {"code": 504, "message": f"Request to update job {job_id} timed out."}}
        except Exception as e:
            self.log.exception(f"Unexpected error updating job {job_id}: {e}")
            return {"error": {"code": 500, "message": f"Unexpected error updating job: {str(e)}"}}

    async def delete_job(self, job_id):
        """Delete a Dataproc job."""
        if not job_id:
            return {"error": {"code": 400, "message": "Job ID must not be empty."}}
        try:
            base_url = await self.get_base_url()
            url = f"{base_url}/{job_id}"
            async with self.client_session.delete(
                url, headers=self.create_headers()
            ) as response:
                return await self._parse_response(response, f"delete_job({job_id})")
        except aiohttp.ClientError as e:
            self.log.exception(f"HTTP network error while deleting job {job_id}: {e}")
            return {"error": {"code": 503, "message": f"Network error deleting job: {str(e)}"}}
        except asyncio.TimeoutError:
            self.log.exception(f"Timeout error while deleting job {job_id}")
            return {"error": {"code": 504, "message": f"Request to delete job {job_id} timed out."}}
        except Exception as e:
            self.log.exception(f"Unexpected error deleting job {job_id}: {e}")
            return {"error": {"code": 500, "message": f"Unexpected error deleting job: {str(e)}"}}

    async def cancel_job(self, job_id):
        """Cancel a running Dataproc job."""
        if not job_id:
            return {"error": {"code": 400, "message": "Job ID must not be empty."}}
        try:
            base_url = await self.get_base_url()
            url = f"{base_url}/{job_id}:cancel"
            async with self.client_session.post(
                url, headers=self.create_headers()
            ) as response:
                return await self._parse_response(response, f"cancel_job({job_id})")
        except aiohttp.ClientError as e:
            self.log.exception(f"HTTP network error while canceling job {job_id}: {e}")
            return {"error": {"code": 503, "message": f"Network error canceling job: {str(e)}"}}
        except asyncio.TimeoutError:
            self.log.exception(f"Timeout error while canceling job {job_id}")
            return {"error": {"code": 504, "message": f"Request to cancel job {job_id} timed out."}}
        except Exception as e:
            self.log.exception(f"Unexpected error canceling job {job_id}: {e}")
            return {"error": {"code": 500, "message": f"Unexpected error canceling job: {str(e)}"}}