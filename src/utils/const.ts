/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export const VERSION_DETAIL = "0.1.41"
export const CREATE_CLUSTER_URL =
  'https://console.cloud.google.com/dataproc/clusters';
export const CREATE_BATCH_URL =
  'https://console.cloud.google.com/dataproc/batches/create';
export const BASE_URL = 'https://dataproc.googleapis.com/v1';
export const BASE_URL_NETWORKS = 'https://compute.googleapis.com/compute/v1';
export const BASE_URL_META = 'https://metastore.googleapis.com/v1';
export const BASE_URL_KEY = 'https://cloudkms.googleapis.com/v1';
export const VIEW_LOGS_URL = 'https://console.cloud.google.com/logs';
export const POLLING_TIME_LIMIT = 10000;
export const API_HEADER_CONTENT_TYPE = 'application/json';
export enum ClusterStatus {
  STATUS_RUNNING = 'RUNNING',
  STATUS_STOPPED = 'STOPPED',
  STATUS_ACTIVE = 'ACTIVE'
}
export enum BatchStatus {
  STATUS_PENDING = 'PENDING'
}
export const STATUS_RUNNING = 'RUNNING';
export const STATUS_ERROR = 'ERROR';
export const STATUS_DONE = 'DONE';
export const STATUS_CANCELLED = 'CANCELLED';
export const STATUS_SUCCESS = 'SUCCEEDED';
export const STATUS_FAIL = 'FAILED';
export const STATUS_STOPPED = 'STOPPED';
export const STATUS_STARTING = 'STARTING';
export const STATUS_STOPPING = 'STOPPING';
export const STATUS_DELETING = 'DELETING';
export const STATUS_SETUP_DONE = 'SETUP_DONE';
export const STATUS_CREATING = 'CREATING';
export const STATUS_PENDING = 'PENDING';
export const STATUS_PROVISIONING = 'Provisioning';
export const STATUS_ACTIVE = 'ACTIVE';
export const STATUS_TERMINATED = 'TERMINATED';
export const STATUS_TERMINATING = 'TERMINATING';
export const LABEL_TEXT = 'labels';
export const API_HEADER_BEARER = 'Bearer ';
export const SERVICE_ACCOUNT_KEY = 'serviceAccount';
export const SERVICE_ACCOUNT_LABEL = 'Service account';
export const NETWORK_KEY = 'networkUri';
export const NETWORK_LABEL = 'Network';
export const SUBNETWORK_KEY = 'subnetworkUri';
export const SUBNETWORK_LABEL = 'Sub network';
export const NETWORK_TAGS_KEY = 'networkTags';
export const NETWORK_TAGS_LABEL = 'Network tags';
export const METASTORE_SERVICE_KEY = 'metastoreService';
export const METASTORE_SERVICE_LABEL = 'Metastore service';
export const DATAPROC_CLUSTER_KEY = 'dataprocCluster';
export const DATAPROC_CLUSTER_LABEL = 'Dataproc cluster';
export const SPARK_HISTORY_SERVER_KEY = 'sparkHistoryServerConfig';
export const PROJECT_LIST_URL =
  'https://cloudresourcemanager.googleapis.com/v1/projects';
export const USER_INFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
export const REGION_URL = 'https://compute.googleapis.com/compute/v1/projects';
export const LOGIN_STATE = '1';
export const QUERY_TABLE = 'system=dataproc_metastore AND type=TABLE parent=';
export const QUERY_DATABASE =
  'system=dataproc_metastore AND type=DATABASE parent=';
export const CATALOG_SEARCH =
  'https://datacatalog.googleapis.com/v1/catalog:search';
export const COLUMN_API = 'https://datacatalog.googleapis.com/v1/';
export const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];
export const QUERY_FILE_MESSAGE =
  'Can be a GCS file with the gs:// prefix, an HDFS file on the cluster with the hdfs:// prefix, or a local file on the cluster with the file:// prefix';
export const MAIN_CLASS_MESSAGE =
  'The fully qualified name of a class in a provided or standard jar file, for example, com.example.wordcount, or a provided jar file to use the main class of that jar file';
export const JAR_FILE_MESSAGE =
  'Jar files are included in the CLASSPATH. Can be a GCS file with the gs:// prefix, an HDFS file on the cluster with the hdfs:// prefix, or a local file on the cluster with the file:// prefix.';
export const FILES_MESSAGE =
  'Files are included in the working directory of each executor. Can be a GCS file with the gs:// prefix, an HDFS file on the cluster with the hdfs:// prefix, or a local file on the cluster with the file:// prefix.';
export const ARCHIVE_FILES_MESSAGE =
  'Archive files are extracted in the Spark working directory. Can be a GCS file with the gs:// prefix, an HDFS file on the cluster with the hdfs:// prefix, or a local file on the cluster with the file:// prefix. Supported file types: .jar, .tar, .tar.gz, .tgz, .zip';
export const ARGUMENTS_MESSAGE =
  'Additional arguments to pass to the main class. Press Return after each argument.';
export const MAX_RESTART_MESSAGE =
  'Leave blank if you do not want to allow automatic restarts on job failure. ';
export const VIEW_LOGS_CLUSTER_URL =
  'https://console.cloud.google.com/logs/query;query=resource.type="cloud_dataproc_cluster" resource.labels.cluster_name=';
export const VIEW_LOGS_SESSION_URL =
  'https://console.cloud.google.com/logs/query;query=resource.type="cloud_dataproc_session"';
export const VIEW_LOGS_BATCH_URL =
  'https://console.cloud.google.com/logs/query;query=resource.type="cloud_dataproc_batch"';
export const RESTART_JOB_URL =
  'https://cloud.google.com/dataproc/docs/concepts/jobs/restartable-jobs';
export const SELF_MANAGED_CLUSTER =
  'https://cloud.google.com/dataproc-metastore/docs/attach-dataproc';
export const SECURITY_KEY =
  'https://console.cloud.google.com/security/kms/keyrings';
export const SERVICE_ACCOUNT =
  'https://cloud.google.com/compute/docs/access/service-accounts';
export const CUSTOM_CONTAINERS =
  'https://cloud.google.com/dataproc-serverless/docs/guides/custom-containers';
export const SHARED_VPC='https://cloud.google.com/vpc/docs/shared-vpc';

export const CONTAINER_REGISTERY = 'https://console.cloud.google.com/gcr';
export const ARTIFACT_REGISTERY = 'https://console.cloud.google.com/artifacts';
export const METASTORE_MESSAGE =
  'We recommend this option to persist table metadata when the batch finishes processing. A metastore can be shared across many serverless batches in different projects and GCP regions.';
export const CUSTOM_CONTAINER_MESSAGE =
  'Specify a custom container image to add Java or Python dependencies not provided by the default container';
export const CUSTOM_CONTAINER_MESSAGE_PART='image. You must host your custom container on';
export const SPARK = 'Spark';
export const SPARKSQL = 'SparkSQL';
export const SPARKR = 'SparkR';
export const PYSPARK = 'PySpark';
export const DCU_HOURS = 3600000;
export const GB_MONTHS = 2592000;
export const TITLE_LAUNCHER_CATEGORY = 'Dataproc Jobs and Sessions';
export const SPARK_HISTORY_SERVER = 'Spark History Server';
export const DEFAULT_LABEL_DETAIL = 'client:dataproc-jupyter-plugin';
export const JOB_FIELDS_EXCLUDED = ['queryList', 'properties', 'args'];
export const BATCH_FIELDS_EXCLUDED = ['queryList', 'properties'];
export const GCS_URL = 'https://storage.googleapis.com/storage/v1/b';
export const GCS_UPLOAD_URL = 'https://storage.googleapis.com/upload/storage/v1/b'
export const KEY_MESSAGE='Example format:projects/<project-name>/locations/<location-name>/keyRings/<keyring-name>/cryptoKeys/<key-name>';
export enum HTTP_METHOD {
  GET = 'GET',
  POST = 'POST'
};
export const NETWORK_TAG_MESSAGE = 'Network tags are text attributes you can add to make firewall rules and routes applicable to specific VM instances.';
