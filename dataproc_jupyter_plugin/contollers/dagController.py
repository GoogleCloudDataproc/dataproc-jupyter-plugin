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
from dataproc_jupyter_plugin.utils.credentials import GetCachedCredentials
from jupyter_server.base.handlers import APIHandler
import tornado
from dataproc_jupyter_plugin.services.dagListService import (
    DagListService,
    DagDeleteService,
    DagUpdateService,
)
from dataproc_jupyter_plugin.utils.constants import TAGS


class DagListController(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            dag = DagListService()
            composer_name = self.get_argument("composer")
            credentials = GetCachedCredentials.get_cached_credentials(self.log)
            dag_list = dag.list_jobs(credentials, composer_name, TAGS, self.log)
            self.finish(json.dumps(dag_list))
        except Exception as e:
            self.log.exception(f"Error fetching cluster list")
            self.finish({"error": str(e)})
            self.finish({"error": str(e)})


class DagDownloadController(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            dag_id = self.get_argument("dag_id")
            bucket_name = self.get_argument("bucket_name")
            cmd = f"gsutil cp 'gs://{bucket_name}/dataproc-notebooks/{dag_id}/input_notebooks/*' ~/Downloads"
            process = subprocess.Popen(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True
            )
            output, _ = process.communicate()
            if process.returncode == 0:
                self.finish({"status": 0})
            else:
                self.log.exception(f"Error downloading input notebook")
                self.finish({"status": 1})
        except Exception as e:
            self.log.exception(f"Error downloading input notebook: {str(e)}")
            self.finish({"error": str(e)})


class DagDeleteController(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            dag = DagDeleteService()
            composer = self.get_argument("composer")
            dag_id = self.get_argument("dag_id")
            from_page = self.get_argument("from_page", default=None)
            credentials = GetCachedCredentials.get_cached_credentials(self.log)
            delete_response = dag.delete_job(
                credentials, composer, dag_id, from_page, self.log
            )
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
    def get(self):
        try:
            dag = DagUpdateService()
            composer = self.get_argument("composer")
            dag_id = self.get_argument("dag_id")
            status = self.get_argument("status")
            credentials = GetCachedCredentials.get_cached_credentials(self.log)
            update_response = dag.update_job(
                credentials, composer, dag_id, status, self.log
            )
            if update_response == 0:
                self.finish({"status": 0})
            else:
                self.log.exception(f"Error updating status")
                self.finish(json.dumps(update_response))
        except Exception as e:
            self.log.exception(f"Error updating status: {str(e)}")
            self.finish({"error": str(e)})
