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

from google.cloud.jupyter_config.config import (
    async_get_gcloud_config,
    async_run_gcloud_subcommand,
)


async def _gcp_credentials():
    """Helper method to get the project configured through gcloud"""
    return await async_get_gcloud_config("credential.access_token")


async def _gcp_project():
    """Helper method to get the project configured through gcloud"""
    return await async_get_gcloud_config("configuration.properties.core.project")


async def _gcp_project_number():
    """Helper method to get the project number for the project configured through gcloud"""
    project = await _gcp_project()
    if not project:
        return None
    return await async_run_gcloud_subcommand(
        f'projects describe {project} --format="value(projectNumber)"'
    )


async def _gcp_region():
    """Helper method to get the project configured through gcloud"""
    region = await async_get_gcloud_config("configuration.properties.dataproc.region")
    if not region:
        region = await async_get_gcloud_config(
            "configuration.properties.compute.region"
        )
    return region


async def get_cached():
    credentials = {
        "project_id": "",
        "project_number": 0,
        "region_id": "",
        "access_token": "",
        "config_error": 0,
        "login_error": 0,
    }
    try:
        credentials["project_id"] = await _gcp_project()
        credentials["region_id"] = await _gcp_region()
        credentials["config_error"] = 0
        credentials["access_token"] = await _gcp_credentials()
        credentials["project_number"] = await _gcp_project_number()
    except Exception as ex:
        credentials["config_error"] = 1

    if not credentials["access_token"] or not credentials["project_number"]:
        # These will only be set if the user is logged in to gcloud with
        # an account that has the appropriate permissions on the configured
        # project.
        #
        # As such, we treat them being missing as a signal that there is
        # a problem with how the user is logged in to gcloud.
        credentials["login_error"] = 1

    return credentials
