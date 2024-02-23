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


import subprocess
from dataproc_jupyter_plugin.utils.constants import CONTENT_TYPE
from google.cloud import storage
import google.oauth2.credentials
 
 
class DownloadOutputService():
    def download_dag_output(self, credentials,bucket_name,dag_id,dag_run_id,log):
        try:
            cmd = f"gsutil cp 'gs://{bucket_name}/dataproc-notebooks/{dag_id}/output_notebooks/{dag_id}_{dag_run_id}' ./"
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
            output, _ = process.communicate()
            if process.returncode == 0:
                return 0
            else:
                self.log.exception(f"Error downloading output notebook file")
                return 1

        except Exception as e:
            log.exception(f"Error downloading output notebook file: {str(e)}")
            return {"error": str(e)}

