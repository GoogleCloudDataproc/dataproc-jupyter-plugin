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


from dataproc_jupyter_plugin.utils.constants import CONTENT_TYPE
from google.cloud import storage
import google.oauth2.credentials
 
 
class DownloadOutputService():
    def download_dag_output(self, credentials,bucket_name,dag_id,dag_run_id,log):
        if 'access_token' in credentials:
            access_token = credentials['access_token']
        try:
            credentials = google.oauth2.credentials.Credentials(access_token)
            storage_client = storage.Client()
            bucket = storage_client.bucket(bucket_name)
            blob = bucket.blob(f'dataproc-output/{dag_id}/output-notebooks/{dag_id}_{dag_run_id}.ipynb')
            file_name = blob.name.split('/')[-1] # Extract the filename from the blob's path
            blob.download_to_filename(file_name)

        except Exception as e:
            log.exception(f"Error downloading output file: {str(e)}")
            return {"error": str(e)}

