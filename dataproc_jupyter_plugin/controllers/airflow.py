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
import subprocess
from dataproc_jupyter_plugin import credentials
from dataproc_jupyter_plugin.services import airflow
from jupyter_server.base.handlers import APIHandler
import tornado


class DagListController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            client = airflow.Client(await credentials.get_cached(), self.log)
            composer_name = self.get_argument("composer")
            dag_list = await client.list_jobs(composer_name)
            self.finish(json.dumps(dag_list))
        except Exception as e:
            self.log.exception(f"Error fetching cluster list")
            self.finish({"error": str(e)})


class DagDeleteController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            client = airflow.Client(await credentials.get_cached(), self.log)
            composer = self.get_argument("composer")
            dag_id = self.get_argument("dag_id")
            from_page = self.get_argument("from_page", default=None)
            delete_response = await client.delete_job(composer, dag_id, from_page)
            if delete_response == 0:
                self.finish(json.dumps({"status": delete_response}))
            else:
                self.log.exception(f"Error deleting dag file")
                self.finish(json.dumps({"status": delete_response}))
        except Exception as e:
            self.log.exception(f"Error deleting dag file: {str(e)}")
            self.finish({"error": str(e)})


class DagUpdateController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            client = airflow.Client(await credentials.get_cached(), self.log)
            composer = self.get_argument("composer")
            dag_id = self.get_argument("dag_id")
            status = self.get_argument("status")
            update_response = await client.update_job(composer, dag_id, status)
            if update_response == 0:
                self.finish({"status": 0})
            else:
                self.log.exception(f"Error updating status")
                self.finish(json.dumps(update_response))
        except Exception as e:
            self.log.exception(f"Error updating status: {str(e)}")
            self.finish({"error": str(e)})


class DagRunController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            client = airflow.Client(await credentials.get_cached(), self.log)
            composer_name = self.get_argument("composer")
            dag_id = self.get_argument("dag_id")
            start_date = self.get_argument("start_date")
            offset = self.get_argument("offset")
            end_date = self.get_argument("end_date")
            dag_run_list = await client.list_dag_runs(
                composer_name, dag_id, start_date, end_date, offset
            )
            self.finish(json.dumps(dag_run_list))
        except Exception as e:
            self.log.exception(f"Error fetching dag run list {str(e)}")
            self.finish({"error": str(e)})


class DagRunTaskController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            client = airflow.Client(await credentials.get_cached(), self.log)
            composer_name = self.get_argument("composer")
            dag_id = self.get_argument("dag_id")
            dag_run_id = self.get_argument("dag_run_id")
            dag_run_list = await client.list_dag_run_task(
                composer_name, dag_id, dag_run_id
            )
            self.finish(json.dumps(dag_run_list))
        except Exception as e:
            self.log.exception(f"Error fetching dag run tasks: {str(e)}")
            self.finish({"error": str(e)})


class DagRunTaskLogsController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            client = airflow.Client(await credentials.get_cached(), self.log)
            composer_name = self.get_argument("composer")
            dag_id = self.get_argument("dag_id")
            dag_run_id = self.get_argument("dag_run_id")
            task_id = self.get_argument("task_id")
            task_try_number = self.get_argument("task_try_number")
            dag_run_list = await client.list_dag_run_task_logs(
                composer_name, dag_id, dag_run_id, task_id, task_try_number
            )
            self.finish(json.dumps(dag_run_list))
        except Exception as e:
            self.log.exception(f"Error fetching dag run task logs: {str(e)}")
            self.finish({"error": str(e)})


class EditDagController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            client = airflow.Client(await credentials.get_cached(), self.log)
            bucket_name = self.get_argument("bucket_name")
            dag_id = self.get_argument("dag_id")
            dag_details = await client.edit_jobs(dag_id, bucket_name)
            self.finish(json.dumps(dag_details))
        except Exception as e:
            self.log.exception(f"Error getting dag details")
            self.finish({"error": str(e)})


class ImportErrorController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            client = airflow.Client(await credentials.get_cached(), self.log)
            composer_name = self.get_argument("composer")
            import_errors_list = await client.list_import_errors(composer_name)
            self.finish(json.dumps(import_errors_list))
        except Exception as e:
            self.log.exception(f"Error fetching import error list")
            self.finish({"error": str(e)})


class TriggerDagController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        try:
            client = airflow.Client(await credentials.get_cached(), self.log)
            dag_id = self.get_argument("dag_id")
            composer = self.get_argument("composer")
            trigger = await client.dag_trigger(dag_id, composer)
            self.finish(json.dumps(trigger))
        except Exception as e:
            self.log.exception(f"Error triggering dag")
            self.finish({"error": str(e)})
