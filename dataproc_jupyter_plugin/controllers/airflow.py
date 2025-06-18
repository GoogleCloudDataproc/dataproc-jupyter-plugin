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
import re

import aiohttp
import tornado
from jupyter_server.base.handlers import APIHandler

from dataproc_jupyter_plugin import credentials
from dataproc_jupyter_plugin.commons import constants
from dataproc_jupyter_plugin.services import airflow


class AirflowHandler(APIHandler):
    """Base class for all Airflow-related handlers.

    This class handles argument validation and error reporting.
    """

    @property
    def composer_environment(self):
        composer_arg = self.get_argument("composer")
        if not re.fullmatch(constants.COMPOSER_ENVIRONMENT_REGEXP, composer_arg):
            raise ValueError(f"Invalid Composer environment name: {composer_arg}")
        return composer_arg

    @property
    def dag_id(self):
        dag_id_arg = self.get_argument("dag_id")
        if not re.fullmatch(constants.DAG_ID_REGEXP, dag_id_arg):
            raise ValueError(f"Invalid DAG ID: {dag_id_arg}")
        return dag_id_arg

    @property
    def dag_run_id(self):
        dag_run_id_arg = self.get_argument("dag_run_id")
        return dag_run_id_arg

    @property
    def bucket_name(self):
        bucket_arg = self.get_argument("bucket_name")
        if not re.fullmatch(constants.BUCKET_NAME_REGEXP, bucket_arg):
            raise ValueError(f"Invalid bucket name: {bucket_arg}")
        return bucket_arg

    def description(self):
        pass

    async def _handle_get(self, client):
        raise Exception("GET method unsupported")

    @tornado.web.authenticated
    async def get(self):
        try:
            async with aiohttp.ClientSession() as client_session:
                client = airflow.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                resp = await self._handle_get(client)
                self.finish(json.dumps(resp))
        except Exception as e:
            self.log.exception(f"Error fetching {self.description()}")
            self.finish({"error": str(e)})

    async def _handle_post(self, client):
        raise Exception("POST method unsupported")

    @tornado.web.authenticated
    async def post(self):
        try:
            async with aiohttp.ClientSession() as client_session:
                client = airflow.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                resp = await self._handle_post(client)
                self.finish(json.dumps(resp))
        except Exception as e:
            self.log.exception(f"Error updating {self.description()}")
            self.finish({"error": str(e)})

    async def _handle_delete(self, client):
        raise Exception("DELETE method unsupported")

    @tornado.web.authenticated
    async def delete(self):
        try:
            async with aiohttp.ClientSession() as client_session:
                client = airflow.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                resp = await self._handle_delete(client)
                self.finish(json.dumps(resp))
        except Exception as e:
            self.log.exception(f"Error deleting {self.description()}")
            self.finish({"error": str(e)})


class DagListController(AirflowHandler):
    def description(self):
        return "cluster list"

    async def _handle_get(self, client):
        return await client.list_jobs(self.composer_environment)


class DagDeleteController(AirflowHandler):
    def description(self):
        return "dag file"

    async def _handle_delete(self, client):
        from_page = self.get_argument("from_page", default=None)
        delete_response = await client.delete_job(
            self.composer_environment, self.dag_id, from_page
        )
        if delete_response != 0:
            raise Exception(
                f"Error deleting dag file, unexpected response: {delete_response}"
            )
        return {"status": delete_response}


class DagUpdateController(AirflowHandler):
    def description(self):
        return "status"

    async def _handle_post(self, client):
        status = self.get_argument("status")
        update_response = await client.update_job(
            self.composer_environment, self.dag_id, status
        )
        if update_response != 0:
            raise Exception(
                f"Error updating job status, unexpected response: {update_response}"
            )
        return {"status": update_response}


class DagRunController(AirflowHandler):
    def description(self):
        return "dag run list"

    async def _handle_get(self, client):
        start_date = self.get_argument("start_date")
        offset = self.get_argument("offset")
        end_date = self.get_argument("end_date")
        return await client.list_dag_runs(
            self.composer_environment, self.dag_id, start_date, end_date, offset
        )


class DagRunTaskController(AirflowHandler):
    def description(self):
        return "dag run tasks"

    async def _handle_get(self, client):
        return await client.list_dag_run_task(
            self.composer_environment, self.dag_id, self.dag_run_id
        )


class DagRunTaskLogsController(AirflowHandler):
    def description(self):
        return "dag run task logs"

    async def _handle_get(self, client):
        task_id = self.get_argument("task_id")
        task_try_number = self.get_argument("task_try_number")
        return await client.list_dag_run_task_logs(
            self.composer_environment,
            self.dag_id,
            self.dag_run_id,
            task_id,
            task_try_number,
        )


class EditDagController(AirflowHandler):
    def description(self):
        return "job"

    async def _handle_post(self, client):
        return await client.edit_jobs(self.dag_id, self.bucket_name)


class ImportErrorController(AirflowHandler):
    def description(self):
        return "import error list"

    async def _handle_get(self, client):
        return await client.list_import_errors(self.composer_environment)


class TriggerDagController(AirflowHandler):
    def description(self):
        return "DAG"

    async def _handle_post(self, client):
        return await client.dag_trigger(self.dag_id, self.composer_environment)
