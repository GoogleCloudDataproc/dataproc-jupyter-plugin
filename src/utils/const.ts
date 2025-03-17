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

import { requestAPI } from '../handler/handler';
const { version } = require('../../package.json');
export const VERSION_DETAIL = version;
export const CREATE_CLUSTER_URL =
  'https://console.cloud.google.com/dataproc/clusters';
export const CREATE_BATCH_URL =
  'https://console.cloud.google.com/dataproc/batches/create';

interface IGcpUrlResponseData {
  dataproc_url: string;
  compute_url: string;
  metastore_url: string;
  cloudkms_url: string;
  cloudresourcemanager_url: string;
  datacatalog_url: string;
  storage_url: string;
}
export const gcpServiceUrls = (async () => {
  const data = (await requestAPI('getGcpServiceUrls')) as IGcpUrlResponseData;
  const storage_url = new URL(data.storage_url);
  const storage_upload_url = new URL(data.storage_url);

  if (
    !storage_url.pathname ||
    storage_url.pathname === '' ||
    storage_url.pathname === '/'
  ) {
    // If the overwritten  storage_url doesn't contain a path, add it.
    storage_url.pathname = 'storage/v1/';
  }
  storage_upload_url.pathname = 'upload/storage/v1/';

  return {
    DATAPROC: data.dataproc_url + 'v1',
    COMPUTE: data.compute_url,
    METASTORE: data.metastore_url + 'v1',
    CLOUD_KMS: data.cloudkms_url + 'v1',
    CLOUD_RESOURCE_MANAGER: data.cloudresourcemanager_url + 'v1/projects',
    REGION_URL: data.compute_url + '/projects',
    CATALOG: data.datacatalog_url + 'v1/catalog:search',
    COLUMN: data.datacatalog_url + 'v1/',
    STORAGE: storage_url.toString(),
    STORAGE_UPLOAD: storage_upload_url.toString()
  };
})();
export const VIEW_LOGS_URL = 'https://console.cloud.google.com/logs';
export const POLLING_TIME_LIMIT = 10000;
export const POLLING_IMPORT_ERROR = 30000;
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
export const USER_INFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
export const LOGIN_STATE = '1';
export const QUERY_TABLE = 'system=dataproc_metastore AND type=TABLE parent=';
export const QUERY_DATABASE =
  'system=dataproc_metastore AND type=DATABASE parent=';
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
export const SHARED_VPC = 'https://cloud.google.com/vpc/docs/shared-vpc';

export const CONTAINER_REGISTERY = 'https://console.cloud.google.com/gcr';
export const ARTIFACT_REGISTERY = 'https://console.cloud.google.com/artifacts';
export const METASTORE_MESSAGE =
  'We recommend this option to persist table metadata when the batch finishes processing. A metastore can be shared across many serverless batches in different projects and GCP regions.';
export const CUSTOM_CONTAINER_MESSAGE =
  'Specify a custom container image to add Java or Python dependencies not provided by the default container';
export const CUSTOM_CONTAINER_MESSAGE_PART =
  'image. You must host your custom container on';
export const SPARK = 'Spark';
export const SPARKSQL = 'SparkSQL';
export const SPARKR = 'SparkR';
export const PYSPARK = 'PySpark';
export const DCU_HOURS = 3600000;
export const GB_MONTHS = 2592000;
export const TITLE_LAUNCHER_CATEGORY = 'Google Cloud Resources';
export const SPARK_HISTORY_SERVER = 'Spark History Server';
export const DEFAULT_LABEL_DETAIL = 'client:bigquery-jupyter-plugin';
export const JOB_FIELDS_EXCLUDED = ['queryList', 'properties', 'args'];
export const BATCH_FIELDS_EXCLUDED = ['queryList', 'properties'];
export const KEY_MESSAGE =
  'Example format:projects/<project-name>/locations/<location-name>/keyRings/<keyring-name>/cryptoKeys/<key-name>';
export enum HTTP_METHOD {
  GET = 'GET',
  POST = 'POST'
}
export const NETWORK_TAG_MESSAGE =
  'Network tags are text attributes you can add to make firewall rules and routes applicable to specific VM instances.';
export const LOGIN_ERROR_MESSAGE =
  'Please navigate to Settings -> Google BigQuery Settings to login and continue';
export const NOTEBOOK_TEMPLATES_LIST_URL =
  'https://api.github.com/repos/GoogleCloudPlatform/ai-ml-recipes/contents/.ci/index.json';
export type scheduleMode = 'runNow' | 'runSchedule';
export const scheduleValueExpression = '30 17 * * 1-5'; //Expression for schedule Value in Scheduler Jobs
export const PLUGIN_ID = 'dataproc_jupyter_plugin:plugin';
export const SPARK_RESOURCE_ALLOCATION_INFO_URL =
  'https://cloud.google.com/dataproc-serverless/docs/concepts/properties';
export const SPARK_AUTOSCALING_INFO_URL =
  'https://cloud.google.com/dataproc-serverless/docs/concepts/autoscaling#spark_dynamic_allocation_properties';
export const SPARK_GPU_INFO_URL =
  'https://cloud.google.com/dataproc-serverless/docs/guides/gpus-serverless';
export const RESOURCE_ALLOCATION_DEFAULT = [
  'spark.driver.cores:4',
  'spark.driver.memory:12200m',
  'spark.driver.memoryOverhead:1220m',
  'spark.dataproc.driver.disk.size:400g',
  'spark.dataproc.driver.disk.tier:standard',
  'spark.executor.cores:4',
  'spark.executor.memory:12200m',
  'spark.executor.memoryOverhead:1220m',
  'spark.dataproc.executor.disk.size:400g',
  'spark.dataproc.executor.disk.tier:standard',
  'spark.executor.instances:2'
];
export const AUTO_SCALING_DEFAULT = [
  'spark.dynamicAllocation.enabled:true',
  'spark.dynamicAllocation.initialExecutors:2',
  'spark.dynamicAllocation.minExecutors:2',
  'spark.dynamicAllocation.maxExecutors:1000',
  'spark.dynamicAllocation.executorAllocationRatio:0.3',
  'spark.reducer.fetchMigratedShuffle.enabled:false'
];
export const GPU_DEFAULT = [
  'spark.dataproc.driverEnv.LANG:C.UTF-8',
  'spark.executorEnv.LANG:C.UTF-8',
  'spark.dataproc.executor.compute.tier:premium',
  'spark.dataproc.executor.resource.accelerator.type:l4',
  'spark.plugins:com.nvidia.spark.SQLPlugin',
  'spark.task.resource.gpu.amount',
  'spark.shuffle.manager:com.nvidia.spark.rapids.RapidsShuffleManager'
];
export const SELECT_FIELDS = [
  'spark.dataproc.driver.disk.tier',
  'spark.dataproc.executor.disk.tier',
  'spark.dynamicAllocation.enabled',
  'spark.reducer.fetchMigratedShuffle.enabled'
];
export const MEMORY_RELATED_PROPERTIES = [
  'spark.driver.memory',
  'spark.driver.memoryOverhead',
  'spark.executor.memory',
  'spark.executor.memoryOverhead'
];
export const DISK_RELATED_PROPERTIES = [
  'spark.dataproc.driver.disk.size',
  'spark.dataproc.executor.disk.size'
];
export const CORE_RELATED_PROPERTIES = [
  'spark.driver.cores',
  'spark.executor.cores'
];
export const EXECUTOR_RELATED_PROPERTIES = [
  'spark.executor.instances',
  'spark.dynamicAllocation.maxExecutors'
];
export const BOOLEAN_SELECT_OPTIONS = [
  { key: 'true', value: 'true', text: 'true' },
  { key: 'false', value: 'false', text: 'false' }
];
export const TIER_SELECT_OPTIONS = [
  { key: 'standard', value: 'standard', text: 'standard' },
  { key: 'premium', value: 'premium', text: 'premium' }
];
export const CLOUD_COMPOSER_API =
  'https://console.developers.google.com/apis/api/composer.googleapis.com';
