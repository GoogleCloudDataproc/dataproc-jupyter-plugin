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


import json
import subprocess
from jupyter_server.base.handlers import APIHandler
from dataproc_jupyter_plugin import handlers
from dataproc_jupyter_plugin.services.dagListService import DagListService, DagDeleteService, DagUpdateService
from dataproc_jupyter_plugin.utils.constants import TAGS


class DagController(APIHandler):
    def get(self):
        try:
            dag = DagListService()
            composer_name = self.get_argument("composer")
            credentials = handlers.get_cached_credentials(self.log)
            dag_list = dag.list_jobs(credentials,composer_name,TAGS)
            self.finish(json.dumps(dag_list))
        except Exception as e:
            self.finish ({"error": str(e)})
    
class Download(APIHandler):
    def get(self):
        try:
            composer = self.get_argument("composer")
            dag_id = self.get_argument("dag_id")
            bucket_name = self.get_argument("bucket_name")
            cmd = f"gsutil cp 'gs://{bucket_name}/dataproc-notebooks/{dag_id}/input_notebooks/*' ~/Downloads"
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
            output, _ = process.communicate()
            if process.returncode == 0:
                self.finish({'status' : 0})
            else:
                self.finish({'status': 1})
        except Exception as e:
            self.finish ({"error": str(e)})
            
class Delete(APIHandler):
    def get(self):
        try:
            dag = DagDeleteService()
            composer = self.get_argument("composer")
            dag_id = self.get_argument("dag_id")
            credentials = handlers.get_cached_credentials(self.log)
            delete_response = dag.delete_job(credentials,composer, dag_id)
            if delete_response == 0: 
                self.finish({'status' : 0})
            else:
                self.finish(json.dumps(delete_response))
        except Exception as e:
            self.finish ({"error": str(e)})

class Update(APIHandler):
    def get(self):
        try:
            dag = DagUpdateService()
            composer = self.get_argument("composer")
            dag_id = self.get_argument("dag_id")
            status = self.get_argument('status')
            credentials = handlers.get_cached_credentials(self.log)
            update_response = dag.update_job(credentials,composer, dag_id,status)
            if update_response == 0: 
                self.finish({'status' : 0})
            else:
                self.finish(json.dumps(update_response))
        except Exception as e:
            self.finish ({"error": str(e)})
        



        