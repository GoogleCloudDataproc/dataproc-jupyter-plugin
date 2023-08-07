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

export const CREATE_CLUSTER_URL =
  'https://console.cloud.google.com/dataproc/clusters';
export const CREATE_BATCH_URL =
  'https://console.cloud.google.com/dataproc/batches/create';
export const BASE_URL = 'https://dataproc.googleapis.com/v1';
export const BASE_URL_META='https://metastore.googleapis.com/v1'
export const VIEW_LOGS_URL = 'https://console.cloud.google.com/logs';
export const POLLING_TIME_LIMIT = 10000;
export const API_HEADER_CONTENT_TYPE = 'application/json';
export enum ClusterStatus {
  STATUS_RUNNING = 'RUNNING',
  STATUS_STOPPED = 'STOPPED',
  STATUS_ACTIVE = 'ACTIVE'
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
export const NETWORK_LABEL = 'Sub network';
export const SUBNETWORK_KEY = 'subnetworkUri';
export const SUBNETWORK_LABEL = 'Sub network';
export const PROJECT_LIST_URL =
  'https://cloudresourcemanager.googleapis.com/v1/projects';
export const USER_INFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
export const REGION_URL = 'https://compute.googleapis.com/compute/v1/projects/';
export const LOGIN_STATE = '1';
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
export const QUERYFILEMESSAGE =
  'Can be a GCS file with the gs:// prefix, an HDFS file on the cluster with the hdfs:// prefix, or a local file on the cluster with the file:// prefix';
export const MAINCLASSMESSAGE =
  'The fully qualified name of a class in a provided or standard jar file, for example, com.example.wordcount, or a provided jar file to use the main class of that jar file';
export const JARFILEMESSAGE =
  'Jar files are included in the CLASSPATH. Can be a GCS file with the gs:// prefix, an HDFS file on the cluster with the hdfs:// prefix, or a local file on the cluster with the file:// prefix.';
export const FILESMESSAGE =
  'Files are included in the working directory of each executor. Can be a GCS file with the gs:// prefix, an HDFS file on the cluster with the hdfs:// prefix, or a local file on the cluster with the file:// prefix.';
export const ARCHIVEFILESMESSAGE =
  'Archive files are extracted in the Spark working directory. Can be a GCS file with the gs:// prefix, an HDFS file on the cluster with the hdfs:// prefix, or a local file on the cluster with the file:// prefix. Supported file types: .jar, .tar, .tar.gz, .tgz, .zip';
export const ARGUMENTSMESSAGE =
  'Additional arguments to pass to the main class. Press Return after each argument.';
export const MAXRESTARTMESSAGE =
  'Leave blank if you do not want to allow automatic restarts on job failure. ';
export const VIEW_LOGS_CLUSTER_URL =
  'https://console.cloud.google.com/logs/query;query=resource.type="cloud_dataproc_cluster" resource.labels.cluster_name=';
export const VIEW_LOGS_SESSION_URL =
  'https://console.cloud.google.com/logs/query;query=resource.type="cloud_dataproc_session"';
  export const VIEW_LOGS_BATCH_URL =
  'https://console.cloud.google.com/logs/query;query=resource.type="cloud_dataproc_batch"';
export const RESTART_JOB_URL =
  'https://cloud.google.com/dataproc/docs/concepts/jobs/restartable-jobs';
export const SPARK = 'Spark';
export const SPARKSQL = 'SparkSQL';
export const SPARKR = 'SparkR';
export const PYSPARK = 'PySpark';
export const DCU_HOURS = 3600000;
export const GB_MONTHS = 2592000;
export const TITLE_LAUNCHER_CATEGORY = 'Dataproc Jobs and Sessions';
