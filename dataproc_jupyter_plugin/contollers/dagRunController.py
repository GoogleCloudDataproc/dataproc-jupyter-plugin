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
from dataproc_jupyter_plugin.services.dagRunService import (
    DagRunListService,
    DagRunTaskListService,
    DagRunTaskLogsListService,
)


class DagRunController(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            dag_run = DagRunListService()
            composer_name = self.get_argument("composer")
            dag_id = self.get_argument("dag_id")
            start_date = self.get_argument("start_date")
            end_date = self.get_argument("end_date")
            credentials = handlers.get_cached_credentials(self.log)
            dag_run_list = dag_run.list_dag_runs(
                credentials, composer_name, dag_id, start_date, end_date, self.log
            )
            self.finish(json.dumps(dag_run_list))
        except Exception as e:
            self.log.exception(f"Error fetching dag run list {str(e)}")
            self.finish({"error": str(e)})


class DagRunTaskController(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            dag_run = DagRunTaskListService()
            composer_name = self.get_argument("composer")
            dag_id = self.get_argument("dag_id")
            dag_run_id = self.get_argument("dag_run_id")
            credentials = handlers.get_cached_credentials(self.log)
            dag_run_list = dag_run.list_dag_run_task(
                credentials, composer_name, dag_id, dag_run_id, self.log
            )
            self.finish(json.dumps(dag_run_list))
        except Exception as e:
            self.log.exception(f"Error fetching dag run tasks: {str(e)}")
            self.finish({"error": str(e)})


class DagRunTaskLogsController(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            dag_run = DagRunTaskLogsListService()
            composer_name = self.get_argument("composer")
            dag_id = self.get_argument("dag_id")
            dag_run_id = self.get_argument("dag_run_id")
            task_id = self.get_argument("task_id")
            task_try_number = self.get_argument("task_try_number")
            credentials = handlers.get_cached_credentials(self.log)
            dag_run_list = dag_run.list_dag_run_task_logs(
                credentials,
                composer_name,
                dag_id,
                dag_run_id,
                task_id,
                task_try_number,
                self.log,
            )
            self.finish(json.dumps(dag_run_list))
        except Exception as e:
            self.log.exception(f"Error fetching dag run task logs: {str(e)}")
            self.finish({"error": str(e)})
