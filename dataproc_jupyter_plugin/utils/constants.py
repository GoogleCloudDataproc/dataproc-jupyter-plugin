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


from dataproc_jupyter_plugin.services.gcpUrlService import gcp_service_url

ENVIRONMENT_API = "https://composer.googleapis.com/v1"
TAGS = "dataproc_jupyter_plugin"
GCS = "gs://"
CONTENT_TYPE = "application/json"


dataproc_url = gcp_service_url("dataproc")
dataproc_url = gcp_service_url("dataproc")
compute_url = gcp_service_url(
    "compute", default_url="https://compute.googleapis.com/compute/v1"
)
metastore_url = gcp_service_url("metastore")
cloudkms_url = gcp_service_url("cloudkms")
cloudresourcemanager_url = gcp_service_url("cloudresourcemanager")
datacatalog_url = gcp_service_url("datacatalog")
storage_url = gcp_service_url(
    "storage", default_url="https://storage.googleapis.com/storage/v1/"
)
dataplex_url = gcp_service_url("dataplex", default_url="https://dataplex.googleapis.com/v1")
bq_public_dataset_project_id = "bigquery-public-data"
