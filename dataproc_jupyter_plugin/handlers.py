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
from jupyter_server.utils import url_path_join
import tornado
import subprocess
from cachetools import TTLCache
import datetime

from google.cloud.jupyter_config.config import gcp_kernel_gateway_url


def update_gateway_client_url(c, log):
    try:
        kernel_gateway_url = gcp_kernel_gateway_url()
    except subprocess.SubprocessError as e:
        log.warning(f"Error constructing the kernel gateway URL; configure your project, region, and credentials using gcloud: {e}")
        return
    log.info(f"Updating remote kernel gateway URL to {kernel_gateway_url}")
    c.GatewayClient.url = kernel_gateway_url


credentials_cache = None

def get_cached_credentials():
    global credentials_cache
    
    try:
        cmd = "gcloud config config-helper --format=json"
        process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        output, error = process.communicate()
        if process.returncode == 0:
            config_data = json.loads(output)
            credentials = {
                    'project_id': config_data['configuration']['properties']['core']['project'],
                    'region_id': config_data['configuration']['properties']['compute']['region'],
                    'access_token': config_data['credential']['access_token']
                }

            token_expiry = config_data['credential']['token_expiry']
            utc_datetime = datetime.datetime.strptime(token_expiry, '%Y-%m-%dT%H:%M:%SZ')
            current_utc_datetime = datetime.datetime.utcnow()
            expiry_timedelta = utc_datetime - current_utc_datetime 
            expiry_seconds = expiry_timedelta.total_seconds()
            if expiry_seconds > 1000:
                ttl_seconds = 1000
            else:
                ttl_seconds = expiry_seconds
            credentials_cache = TTLCache(maxsize=1, ttl=ttl_seconds)
            credentials_cache['credentials'] = credentials
            return credentials
        else:
            cmd = "gcloud config get-value account"
            process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            output, error = process.communicate()
            if output == '':
                cmd = "gcloud config get-value project"
                process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                project, error = process.communicate()
                if project == '':
                        credentials = {
                    'project_id': '',
                    'region_id': '',
                    'access_token': '',
                    'config_error': 1,
                    'login_error': 0
                    }
                else:
                    cmd = "gcloud config get-value compute/region"
                    process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                    region, error = process.communicate()
                    if region == '':
                        credentials = {
                            'project_id': '',
                            'region_id': '',
                            'access_token': '',
                            'config_error': 1,
                            'login_error': 0
                        }
                    else:
                        credentials = {
                            'project_id': '',
                            'region_id': '',
                            'access_token': '',
                            'config_error': 0,
                            'login_error': 1
                            }
            else:
                credentials = {
                    'project_id': '',
                    'region_id': '',
                    'access_token': '',
                    'config_error': 1,
                    'login_error': 0
                    }
            credentials_cache = TTLCache(maxsize=1, ttl=5)
            credentials_cache['credentials'] = credentials
            return credentials
    except Exception:
        credentials = {
            'access_token': '',
            'config_error': 1
        }
        credentials_cache = TTLCache(maxsize=1, ttl=2)
        credentials_cache['credentials'] = credentials

        return credentials

class TestHandler(APIHandler):
    # The following decorator should be present on all verb methods (head, get, post,
    # patch, put, delete, options) to ensure only authorized user can request the
    # Jupyter server
    @tornado.web.authenticated
    def get(self):
        self.finish(json.dumps({
            "data": "This is /dataproc-plugin/get-example endpoint!"
        }))

class RouteHandler(APIHandler):
    # The following decorator should be present on all verb methods (head, get, post,
    # patch, put, delete, options) to ensure only authorized user can request the
    # Jupyter server
    credentials_cache = None
    @tornado.web.authenticated
    def get(self):
        try:
            if credentials_cache is None or 'credentials' not in credentials_cache:
                cached_credentials = get_cached_credentials()
                self.finish(json.dumps(cached_credentials))               
            else:
                self.finish(json.dumps(credentials_cache['credentials']))
        except Exception:
            cached_credentials = get_cached_credentials()
            self.finish(json.dumps(cached_credentials))


class LoginHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        cmd = "gcloud auth login"
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
        output, _ = process.communicate()
        # Check if the authentication was successful
        if process.returncode == 0:
            self.finish({'login' : 'SUCCEEDED'})
        else:
            self.finish({'login' : 'FAILED'})

class ConfigHandler(APIHandler):
    @tornado.web.authenticated
    def post(self):
        ERROR_MESSAGE = "Project and region update "
        global credentials_cache
        input_data = self.get_json_body()
        project_id = input_data["projectId"]
        region = input_data["region"]
        cmd = 'gcloud config set project '+project_id
        project_set = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
        output, _ = project_set.communicate()
        if project_set.returncode == 0:
            cmd = 'gcloud config set compute/region '+region
            region_set = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
            output, _ = region_set.communicate()
            if region_set.returncode == 0:
                credentials_cache = None
                update_gateway_client_url(self.config, self.log)
                self.finish({'config' : ERROR_MESSAGE + 'successful'})
            else:
                self.finish({'config' : ERROR_MESSAGE + 'failed'})
        else:
            self.finish({'config' : ERROR_MESSAGE + 'failed'})


def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]

    # Prepend the base_url so that it works in a JupyterHub setting
    route_pattern = url_path_join(base_url, "dataproc-plugin", "credentials")
    handlers = [(route_pattern, RouteHandler)]
    web_app.add_handlers(host_pattern, handlers)
    
    route_pattern = url_path_join(base_url, "dataproc-plugin", "login")
    handlers = [(route_pattern, LoginHandler)]
    web_app.add_handlers(host_pattern, handlers)

    route_pattern = url_path_join(base_url, "dataproc-plugin", "configuration")
    handlers = [(route_pattern, ConfigHandler)]
    web_app.add_handlers(host_pattern, handlers)
