export interface IStatus {
  state: string;
  stateStartTime: string;
}

export interface IStatusHistoryItem {
  stateStartTime: string;
}

export interface IReference {
  jobId: string;
}

export interface IScheduling {
  maxFailuresPerHour: number;
}

export interface IPysparkJob {
  args: string[];
  mainPythonFileUri: string;
  pythonFileUris: string[];
  jarFileUris: string[];
  fileUris: string[];
  archiveUris: string[];
  properties: Record<string, string>;
}

export interface ISparkRJob {
  args: string[];
  mainRFileUri: string;
  fileUris: string[];
  archiveUris: string[];
  properties: Record<string, string>;
}

export interface ISparkJob {
  args: string[];
  mainJarFileUri: string;
  mainClass: string;
  jarFileUris: string[];
  fileUris: string[];
  archiveUris: string[];
  properties: Record<string, string>;
}

export interface IQueryList {
  queries: string;
}

export interface ISparkSqlJob {
  queryFileUri: string;
  queryList: IQueryList;
  args: string[];
  scriptVariables: Record<string, string>;
  properties: Record<string, string>;
  jarFileUris: string[];
}

export interface IPlacement {
  clusterName: string;
}

export interface IJobDetails {
  status: IStatus;
  statusHistory: IStatusHistoryItem[];
  labels: Record<string, string>;
  reference: IReference;
  jobUuid: string;
  scheduling: IScheduling;
  pysparkJob: IPysparkJob;
  sparkRJob: ISparkRJob;
  sparkJob: ISparkJob;
  sparkSqlJob: ISparkSqlJob;
  placement: IPlacement;
}
