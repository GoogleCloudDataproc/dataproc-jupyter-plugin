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
from google.cloud import jupyter_config

from dataproc_jupyter_plugin.commons.constants import (
    CLOUDKMS_SERVICE_NAME,
    CLOUDRESOURCEMANAGER_SERVICE_NAME,
    COMPUTE_SERVICE_DEFAULT_URL,
    COMPUTE_SERVICE_NAME,
    DATACATALOG_SERVICE_NAME,
    DATAPROC_SERVICE_NAME,
    METASTORE_SERVICE_NAME,
    STORAGE_SERVICE_DEFAULT_URL,
    STORAGE_SERVICE_NAME,
)


async def map():
    dataproc_url = await gcp_service_url(DATAPROC_SERVICE_NAME)
    compute_url = await gcp_service_url(
        COMPUTE_SERVICE_NAME, default_url=COMPUTE_SERVICE_DEFAULT_URL
    )
    metastore_url = await gcp_service_url(METASTORE_SERVICE_NAME)
    cloudkms_url = await gcp_service_url(CLOUDKMS_SERVICE_NAME)
    cloudresourcemanager_url = await gcp_service_url(CLOUDRESOURCEMANAGER_SERVICE_NAME)
    datacatalog_url = await gcp_service_url(DATACATALOG_SERVICE_NAME)
    storage_url = await gcp_service_url(
        STORAGE_SERVICE_NAME, default_url=STORAGE_SERVICE_DEFAULT_URL
    )
    url_map = {
        "dataproc_url": dataproc_url,
        "compute_url": compute_url,
        "metastore_url": metastore_url,
        "cloudkms_url": cloudkms_url,
        "cloudresourcemanager_url": cloudresourcemanager_url,
        "datacatalog_url": datacatalog_url,
        "storage_url": storage_url,
    }
    return url_map


async def gcp_service_url(service_name, default_url=None):
    default_url = default_url or f"https://{service_name}.googleapis.com/"
    configured_url = await jupyter_config.async_get_gcloud_config(
        f"configuration.properties.api_endpoint_overrides.{service_name}"
    )
    url = configured_url or default_url
    return url
