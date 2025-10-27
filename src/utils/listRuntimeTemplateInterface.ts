export interface ISessionTemplateRoot {
  error: {
    code: number;
    message: string;
  };
  sessionTemplates: ISessionTemplate[];
  nextPageToken: string;
}

interface ILigntningProperties {
  'dataproc:dataproc.tier'?: string;
  'spark:spark.dataproc.engine'?: string;
  [key: string]: any;
}

interface IRuntimeConfig {
  properties?: ILigntningProperties;
}

export interface ISessionTemplate {
  name: string;
  createTime: string;
  jupyterSession: IJupyterSession;
  creator: string;
  labels: ILabels;
  environmentConfig?: IEnvironmentConfig;
  description: string;
  updateTime: string;
  runtimeConfig?: IRuntimeConfig;
  id: string;
}

export interface IJupyterSession {
  kernel: string;
  displayName: string;
}

export interface ILabels {
  purpose: string;
}

export interface IEnvironmentConfig {
  executionConfig?: IExecutionConfig;
}
export interface IExecutionConfig {
  subnetworkUri: string;
  authenticationConfig?: {
    userWorkloadAuthenticationType: string;
  };
}

export interface ISessionTemplateDisplay {
  name: string;
  owner: string;
  description: string;
  authentication: string;
  lastModified: string;
  id: string;
}
