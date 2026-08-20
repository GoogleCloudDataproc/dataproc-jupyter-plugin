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

from google.api_core.client_options import ClientOptions
from google.cloud import dataproc_v1
from google.oauth2.credentials import Credentials


class BatchesService:
    """Service layer for interacting with GCP Dataproc Batches API via Python SDK."""

    def __init__(self, credentials_dict, log):
        self.log = log
        self.project_id = credentials_dict.get("project_id")
        self.region_id = credentials_dict.get("region_id")
        self._access_token = credentials_dict.get("access_token")

    def _get_credentials(self):
        if self._access_token:
            return Credentials(token=self._access_token)
        return None

    def _get_client_options(self):
        if self.region_id and self.region_id != "global":
            return ClientOptions(api_endpoint=f"{self.region_id}-dataproc.googleapis.com:443")
        return None

    async def list_batches(self, page_size=50, page_token=None):
        if not self.project_id or not self.region_id:
            return {"error": {"code": 400, "message": "Project ID and Region ID must be configured."}}
        try:
            async with dataproc_v1.BatchControllerAsyncClient(
                credentials=self._get_credentials(),
                client_options=self._get_client_options(),
            ) as client:
                parent = f"projects/{self.project_id}/locations/{self.region_id}"
                request = dataproc_v1.ListBatchesRequest(
                    parent=parent,
                    page_size=int(page_size) if page_size else 50,
                    page_token=page_token if page_token else None,
                    order_by="create_time desc",
                )
                pager = await client.list_batches(request=request)
                batches_list = []
                next_page_token = None
                async for page in pager.pages:
                    for batch in page.batches:
                        batch_dict = dataproc_v1.Batch.to_dict(
                            batch,
                            use_integers_for_enums=False,
                            preserving_proto_field_name=False,
                        )
                        batches_list.append(batch_dict)
                    if page.next_page_token:
                        next_page_token = page.next_page_token
                    break

                result = {"batches": batches_list}
                if next_page_token:
                    result["nextPageToken"] = next_page_token
                return result
        except Exception as e:
            self.log.exception("Error listing batches in BatchesService")
            return {"error": {"code": 500, "message": str(e)}}

    async def get_batch(self, batch_id):
        if not self.project_id or not self.region_id:
            return {"error": {"code": 400, "message": "Project ID and Region ID must be configured."}}
        try:
            async with dataproc_v1.BatchControllerAsyncClient(
                credentials=self._get_credentials(),
                client_options=self._get_client_options(),
            ) as client:
                name = f"projects/{self.project_id}/locations/{self.region_id}/batches/{batch_id}"
                request = dataproc_v1.GetBatchRequest(name=name)
                batch = await client.get_batch(request=request)
                batch_dict = dataproc_v1.Batch.to_dict(
                    batch,
                    use_integers_for_enums=False,
                    preserving_proto_field_name=False,
                )
                return batch_dict
        except Exception as e:
            self.log.exception(f"Error getting batch {batch_id} in BatchesService")
            code = getattr(e, "code", 500)
            if hasattr(code, "value"):
                code = code.value
            if not isinstance(code, int):
                code = 500
            return {"error": {"code": code, "message": str(e)}}

    async def delete_batch(self, batch_id):
        if not self.project_id or not self.region_id:
            return {"error": {"code": 400, "message": "Project ID and Region ID must be configured."}}
        try:
            async with dataproc_v1.BatchControllerAsyncClient(
                credentials=self._get_credentials(),
                client_options=self._get_client_options(),
            ) as client:
                name = f"projects/{self.project_id}/locations/{self.region_id}/batches/{batch_id}"
                request = dataproc_v1.DeleteBatchRequest(name=name)
                await client.delete_batch(request=request)
                return {"status": "DELETED", "message": f"Batch {batch_id} deleted successfully."}
        except Exception as e:
            self.log.exception(f"Error deleting batch {batch_id} in BatchesService")
            code = getattr(e, "code", 500)
            if hasattr(code, "value"):
                code = code.value
            if not isinstance(code, int):
                code = 500
            return {"error": {"code": code, "message": str(e)}}

