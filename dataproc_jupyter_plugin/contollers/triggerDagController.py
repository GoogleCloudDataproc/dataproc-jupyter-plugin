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
import tornado
from dataproc_jupyter_plugin import handlers
from dataproc_jupyter_plugin.services.triggerDagService import TriggerDagService



class TriggerDagController(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            trigger_dag = TriggerDagService()
            dag_id = self.get_argument("dag_id")
            composer = self.get_argument("composer")
            credentials = handlers.get_cached_credentials(self.log)
            trigger = trigger_dag.dag_trigger(credentials,dag_id,composer,self.log)
            self.finish(json.dumps(trigger))
        except Exception as e:
            self.log.exception(f"Error triggering dag")
            self.finish ({"error": str(e)})