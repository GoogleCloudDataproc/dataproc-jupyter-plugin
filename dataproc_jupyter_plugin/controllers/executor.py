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
from dataproc_jupyter_plugin.services import executor


class ExecutorController(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        try:
            input_data = self.get_json_body()
            if not re.fullmatch(
                constants.COMPOSER_ENVIRONMENT_REGEXP,
                input_data["composer_environment_name"],
            ):
                raise ValueError(f"Invalid environment name: {input_data}")
            if not re.fullmatch(constants.DAG_ID_REGEXP, input_data["dag_id"]):
                raise ValueError(f"Invalid DAG ID: {input_data}")
            if not re.fullmatch(constants.AIRFLOW_JOB_REGEXP, input_data["name"]):
                raise ValueError(f"Invalid job name: {input_data}")
            async with aiohttp.ClientSession() as client_session:
                client = executor.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                result = await client.execute(input_data)
                self.finish(json.dumps(result))
        except Exception as e:
            self.log.exception(f"Error creating dag schedule: {str(e)}")
            self.finish({"error": str(e)})


class DownloadOutputController(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        try:
            composer_name = self.get_argument("composer")
            bucket_name = self.get_argument("bucket_name")
            dag_id = self.get_argument("dag_id")
            dag_run_id = self.get_argument("dag_run_id")
            if not re.fullmatch(constants.COMPOSER_ENVIRONMENT_REGEXP, composer_name):
                raise ValueError(f"Invalid Composer environment name: {composer_name}")
            if not re.fullmatch(constants.BUCKET_NAME_REGEXP, bucket_name):
                raise ValueError(f"Invalid bucket name: {bucket_name}")
            if not re.fullmatch(constants.DAG_ID_REGEXP, dag_id):
                raise ValueError(f"Invalid DAG ID: {dag_id}")
            if not re.fullmatch(constants.DAG_RUN_ID_REGEXP, dag_run_id):
                raise ValueError(f"Invalid DAG Run ID: {dag_run_id}")
            async with aiohttp.ClientSession() as client_session:
                client = executor.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                download_status = await client.download_dag_output(
                    composer_name, bucket_name, dag_id, dag_run_id
                )
                self.finish(json.dumps({"status": download_status}))
        except Exception as e:
            self.log.exception("Error download output file")
            self.finish({"error": str(e)})
