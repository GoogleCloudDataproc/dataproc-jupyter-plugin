/**
 * @license
 * Copyright 2026 Google LLC
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

export interface IRegionOption {
  name: string;
  displayName: string;
}

export type ExecutorType = 'standard' | 'accelerated';

export interface IRuntimeEnvironmentConfig {
  runtimeProfileId?: string;
  runtimeVersion?: string;
  customSparkImage?: string;
  stagingBucket?: string;
  pythonPackageRepository?: string;
  lightningEngineEnabled?: boolean;
}

export interface IExecutorAndDriverConfig {
  tier?: string;
  driverMachineType?: string;
  driverDisk?: string;
  executorType?: ExecutorType | string;
  executorDisk?: string;
}

export interface IAutoscalingConfig {
  autoscalingEnabled?: boolean;
  initialExecutors?: number;
  minExecutors?: number;
  maxExecutors?: number;
}

export interface IMetastoreConfig {
  metastore?: string;
  hiveEndpointEnabled?: boolean;
  projectId?: string;
}

export type ExecutionIdentityType = 'user_account' | 'service_account';
export type EncryptionType = 'google_managed' | 'customer_managed_key';

export interface INetworkAndSecurityConfig {
  executionIdentity?: ExecutionIdentityType;
  networkInThisProject?: string;
  primaryNetwork?: string;
  subnetwork?: string;
  networkTags?: string[];
  internalIpOnly?: boolean;
  encryption?: EncryptionType;
  kmsKeyName?: string;
}

export type TimeUnit =
  | 'seconds'
  | 'minutes'
  | 'hours'
  | 'days'
  | 's'
  | 'm'
  | 'h'
  | 'd';

export interface ISessionLifecycleConfig {
  maxIdleTime?: string;
  maxIdleTimeQuantity?: number;
  maxIdleTimeUnit?: TimeUnit;
  maxSessionTime?: string;
  maxSessionTimeQuantity?: number;
  maxSessionTimeUnit?: TimeUnit;
}

export type SparkProperties = Record<string, string>;
export type ProfileLabels = Record<string, string>;

export interface IRuntimeProfile {
  name?: string;
  id?: string;
  displayName: string;
  region: string;
  description?: string;
  tier?: string;
  lightningEngineEnabled?: boolean;
  createTime?: string;
  updateTime?: string;
  state?: string;
  runtimeEnvironmentConfig?: IRuntimeEnvironmentConfig;
  executorAndDriverConfig?: IExecutorAndDriverConfig;
  autoscalingConfig?: IAutoscalingConfig;
  metastoreConfig?: IMetastoreConfig;
  networkAndSecurityConfig?: INetworkAndSecurityConfig;
  sessionLifecycleConfig?: ISessionLifecycleConfig;
  sparkProperties?: SparkProperties;
  labels?: ProfileLabels;
}

export interface ICreateRuntimeProfilePayload {
  displayName: string;
  region: string;
  description?: string;
  tier?: string;
  lightningEngineEnabled?: boolean;
  runtimeEnvironmentConfig?: IRuntimeEnvironmentConfig;
  executorAndDriverConfig?: IExecutorAndDriverConfig;
  autoscalingConfig?: IAutoscalingConfig;
  metastoreConfig?: IMetastoreConfig;
  networkAndSecurityConfig?: INetworkAndSecurityConfig;
  sessionLifecycleConfig?: ISessionLifecycleConfig;
  sparkProperties?: SparkProperties;
  labels?: ProfileLabels;
}

export interface IRuntimeProfileService {
  getRegions(projectId?: string): Promise<IRegionOption[]>;
  createRuntimeProfile(
    payload: ICreateRuntimeProfilePayload,
    projectId?: string,
    region?: string
  ): Promise<IRuntimeProfile>;
}

