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


import requests
from dataproc_jupyter_plugin.utils.constants import CONTENT_TYPE, dataplex_url


class ApiHeaders:
    @staticmethod
    def create_headers(access_token):
        return {
            "Content-Type": CONTENT_TYPE,
            "Authorization": f"Bearer {access_token}",
        }


class BigQueryDatasetListService:
    def list_datasets(self, credentials, page_token, log):
        try:
            if (
                ("access_token" in credentials)
                and ("project_id" in credentials)
                and ("region_id" in credentials)
            ):
                access_token = credentials["access_token"]
                project_id = credentials["project_id"]
                api_endpoint = f"https://bigquery.googleapis.com/bigquery/v2/projects/{project_id}/datasets?pageToken={page_token}"
                headers = ApiHeaders.create_headers(access_token)
                response = requests.get(api_endpoint, headers=headers)
                if response.status_code == 200:
                    resp = response.json()
                    return resp
                else:
                    log.exception(f"Missing required credentials")
                    raise ValueError("Missing required credentials")
            else:
                log.exception(f"Missing required credentials")
                raise ValueError("Missing required credentials")
        except Exception as e:
            log.exception(f"Error fetching cluster list")
            return {"error": str(e)}


class BigQueryTableListService:
    def list_table(self, credentials, dataset_id, page_token, log):
        try:
            if (
                ("access_token" in credentials)
                and ("project_id" in credentials)
                and ("region_id" in credentials)
            ):
                access_token = credentials["access_token"]
                project_id = credentials["project_id"]
                api_endpoint = f"https://bigquery.googleapis.com/bigquery/v2/projects/{project_id}/datasets/{dataset_id}/tables?pageToken={page_token}"
                headers = ApiHeaders.create_headers(access_token)
                response = requests.get(api_endpoint, headers=headers)
                if response.status_code == 200:
                    resp = response.json()
                    return resp
                else:
                    log.exception(f"Missing required credentials")
                    raise ValueError("Missing required credentials")
            else:
                log.exception(f"Missing required credentials")
                raise ValueError("Missing required credentials")
        except Exception as e:
            log.exception(f"Error fetching schema")
            return {"error": str(e)}


class BigQueryDatasetInfoService:
    def list_dataset_info(self, credentials, dataset_id, log):
        try:
            if (
                ("access_token" in credentials)
                and ("project_id" in credentials)
                and ("region_id" in credentials)
            ):
                access_token = credentials["access_token"]
                project_id = credentials["project_id"]
                api_endpoint = f"https://bigquery.googleapis.com/bigquery/v2/projects/{project_id}/datasets/{dataset_id}"
                headers = ApiHeaders.create_headers(access_token)
                response = requests.get(api_endpoint, headers=headers)
                if response.status_code == 200:
                    resp = response.json()
                    return resp
                else:
                    log.exception(f"Missing required credentials")
                    raise ValueError("Missing required credentials")
            else:
                log.exception(f"Missing required credentials")
                raise ValueError("Missing required credentials")
        except Exception as e:
            log.exception(f"Error fetching dataset information")
            return {"error": str(e)}


class BigQueryTableInfoService:
    def list_table_info(self, credentials, dataset_id, table_id, log):
        try:
            if (
                ("access_token" in credentials)
                and ("project_id" in credentials)
                and ("region_id" in credentials)
            ):
                access_token = credentials["access_token"]
                project_id = credentials["project_id"]
                api_endpoint = f"https://bigquery.googleapis.com/bigquery/v2/projects/{project_id}/datasets/{dataset_id}/tables/{table_id}"
                headers = ApiHeaders.create_headers(access_token)
                response = requests.get(api_endpoint, headers=headers)
                if response.status_code == 200:
                    resp = response.json()
                    return resp
                else:
                    log.exception(f"Missing required credentials")
                    raise ValueError("Missing required credentials")
            else:
                log.exception(f"Missing required credentials")
                raise ValueError("Missing required credentials")
        except Exception as e:
            log.exception(f"Error fetching table information")
            return {"error": str(e)}


class BigQueryPreviewService:
    def bigquery_preview_data(self, credentials, dataset_id, table_id, page_token, log):
        try:
            if (
                ("access_token" in credentials)
                and ("project_id" in credentials)
                and ("region_id" in credentials)
            ):
                access_token = credentials["access_token"]
                project_id = credentials["project_id"]
                api_endpoint = f"https://bigquery.googleapis.com/bigquery/v2/projects/{project_id}/datasets/{dataset_id}/tables/{table_id}/data?pageToken={page_token}"
                headers = ApiHeaders.create_headers(access_token)
                response = requests.get(api_endpoint, headers=headers)
                if response.status_code == 200:
                    resp = response.json()
                    return resp
                else:
                    log.exception(f"Missing required credentials")
                    raise ValueError("Missing required credentials")
            else:
                log.exception(f"Missing required credentials")
                raise ValueError("Missing required credentials")
        except Exception as e:
            log.exception(f"Error fetching preview data")
            return {"error": str(e)}


class BigQueryProjectService:
    def bigquery_projects(self, credentials, dataset_id, table_id, log):
        try:
            if (
                ("access_token" in credentials)
                and ("project_id" in credentials)
                and ("region_id" in credentials)
            ):
                access_token = credentials["access_token"]
                api_endpoint = (
                    f"https://cloudresourcemanager.googleapis.com/v1/projects"
                )
                headers = ApiHeaders.create_headers(access_token)
                response = requests.get(api_endpoint, headers=headers)
                if response.status_code == 200:
                    resp = response.json()
                    return resp
                else:
                    log.exception(f"Missing required credentials")
                    raise ValueError("Missing required credentials")
            else:
                log.exception(f"Missing required credentials")
                raise ValueError("Missing required credentials")
        except Exception as e:
            log.exception(f"Error fetching projects")
            return {"error": str(e)}
