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
from jupyter_server.base.handlers import APIHandler
# from dataproc_jupyter_plugin import handlers
from dataproc_jupyter_plugin.services.editDagService import DagEditService
from dataproc_jupyter_plugin.utils.constants import TAGS

class EditDagController(APIHandler):
    def get(self):
        try:
            dag = DagEditService()
            bucket_name = self.get_argument("bucket_name")
            dag_id = self.get_argument("dag_id")
            dag_details = dag.edit_jobs(dag_id,bucket_name,self.log)
            self.finish(json.dumps(dag_details))
        except Exception as e:
            self.log.exception(f"Error getting dag details")
            self.finish ({"error": str(e)})