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
import proto

import google.oauth2.credentials as oauth2
from google.cloud import iam_admin_v1
from google.cloud.iam_admin_v1 import types


class Client:
    def __init__(self, credentials, log):
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

    async def list_service_account(self):
        try:
            credentials = oauth2.Credentials(self._access_token)
            iam_client = iam_admin_v1.IAMAsyncClient(credentials=credentials)
            request = types.ListServiceAccountsRequest()
            request.name = f"projects/{self.project_id}"

            accounts = await iam_client.list_service_accounts(request=request)
            account_list = []
            async for account in accounts:
                account_list.append(json.loads(proto.Message.to_json(account)))

            return account_list
        except Exception as e:
            self.log.exception(f"Error listing service accounts: {str(e)}")
            return {"error": str(e)}
