export interface ISessionTemplateRoot {
  error: {
    code: number;
    message: string;
  };
  sessionTemplates: ISessionTemplate[];
  nextPageToken: string;
}

export interface ISessionTemplate {
  name: string;
  createTime: string;
  jupyterSession: IJupyterSession;
  creator: string;
  labels: ILabels;
  environmentConfig: IEnvironmentConfig;
  description: string;
  updateTime: string;
}

export interface IJupyterSession {
  kernel: string;
  displayName: string;
}

export interface ILabels {
  purpose: string;
}

export interface IEnvironmentConfig {
  executionConfig: IExecutionConfig;
}

export interface IExecutionConfig {
  subnetworkUri: string;
}

export interface ISessionTemplateDisplay {
  name: string;
  owner: string;
  description: string;
  lastModified: string;
  id: string;
}
