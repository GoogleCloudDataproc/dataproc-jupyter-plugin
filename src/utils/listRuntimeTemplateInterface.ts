export interface SessionTemplateRoot {
  sessionTemplates: SessionTemplate[];
  nextPageToken: string;
}

export interface SessionTemplate {
  name: string;
  createTime: string;
  jupyterSession: JupyterSession;
  creator: string;
  labels: Labels;
  environmentConfig: EnvironmentConfig;
  description: string;
  updateTime: string;
}

export interface JupyterSession {
  kernel: string;
  displayName: string;
}

export interface Labels {
  purpose: string;
}

export interface EnvironmentConfig {
  executionConfig: ExecutionConfig;
}

export interface ExecutionConfig {
  subnetworkUri: string;
}

export interface SessionTemplateDisplay {
  name: string;
  owner: string;
  description: string;
  lastModified: string;
  id: string;
}
