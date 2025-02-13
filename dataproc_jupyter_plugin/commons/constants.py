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

import re

ENVIRONMENT_API = "https://composer.googleapis.com/v1"
TAGS = "dataproc_jupyter_plugin"
GCS = "gs://"
CONTENT_TYPE = "application/json"
PACKAGE_NAME = "dataproc_jupyter_plugin"
COMPOSER_SERVICE_NAME = "composer"
DATAPROC_SERVICE_NAME = "dataproc"
BIGQUERY_SERVICE_NAME = "bigquery"
DATACATALOG_SERVICE_NAME = "datacatalog"
CLOUDRESOURCEMANAGER_SERVICE_NAME = "cloudresourcemanager"
STORAGE_SERVICE_NAME = "storage"
COMPUTE_SERVICE_NAME = "compute"
METASTORE_SERVICE_NAME = "metastore"
CLOUDKMS_SERVICE_NAME = "cloudkms"
COMPUTE_SERVICE_DEFAULT_URL = "https://compute.googleapis.com/compute/v1"
STORAGE_SERVICE_DEFAULT_URL = "https://storage.googleapis.com/storage/v1/"
WRAPPER_PAPPERMILL_FILE = "wrapper_papermill.py"

#######################################################
# Regular expressions used for validating user input: #
#######################################################

# Bucket name restrictions are documented here:
#  https://cloud.google.com/storage/docs/buckets#naming
BUCKET_NAME_REGEXP = re.compile("[a-z][a-z0-9_.-]{1,61}[a-z0-9]")

# Composer environment name restrictions are documented here:
#  https://cloud.google.com/composer/docs/reference/rest/v1/projects.locations.environments#resource:-environment
COMPOSER_ENVIRONMENT_REGEXP = re.compile("[a-z]([a-z0-9-]{0,62}[a-z0-9])?")

# DAG ID name restrictions are documented here:
#  https://airflow.apache.org/docs/apache-airflow/2.1.3/_api/airflow/models/dag/index.html
DAG_ID_REGEXP = re.compile("([a-zA-Z0-9_.-])+")

# DAG run IDs are largely free-form, but we still enforce some sanity checking
#  on them in case the generated ID might cause issues with how we generate
#  output file names.
DAG_RUN_ID_REGEXP = re.compile("[a-zA-Z0-9_:\\+.-]+")

# This matches the requirements set by the scheduler form.
AIRFLOW_JOB_REGEXP = re.compile("[a-zA-Z0-9_-]+")

# Project ID pattern: 6-30 chars, must start with letter, can contain letters, numbers, and hyphens
PROJECT_REGEXP = re.compile("^[a-z0-9.:-]+$")

# Region pattern: standard GCP region format
REGION_REGEXP = re.compile("^[a-z]+-[a-z]+\d+$")
