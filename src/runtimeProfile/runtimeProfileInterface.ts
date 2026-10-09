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

import {
  DEFAULT_HDD_DISK_SIZE,
  DEFAULT_SSD_DISK_SIZE,
  DISK_TIER_HDD,
  DISK_TIER_OPTIONS,
  DISK_TIER_SSD,
  HDD_DISK_SIZES,
  SSD_DISK_SIZES
} from '../utils/const';

export {
  DEFAULT_HDD_DISK_SIZE,
  DEFAULT_SSD_DISK_SIZE,
  DISK_TIER_HDD,
  DISK_TIER_OPTIONS,
  DISK_TIER_SSD,
  HDD_DISK_SIZES,
  SSD_DISK_SIZES
};

export interface IRegionOption {
  name: string;
  displayName: string;
}

export type ExecutorType = string;
export type ExecutorCategoryType = 'general' | 'accelerated';

export interface IMachineTypeOption {
  name: string;
  label: string;
  vCPUs: number;
  memory: string;
  category: ExecutorCategoryType;
  subgroup?: string;
  acceleratorType?: string;
  gpuCount?: number;
}

export interface IExecutorConfig {
  executorType?: ExecutorCategoryType;
  machineType?: string;
}

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
  executorType?: ExecutorType;
  executorDisk?: string;
  useDifferentDriverConfig?: boolean;
  executorDiskTier?: string;
  executorDiskSize?: string;
  driverDiskTier?: string;
  driverDiskSize?: string;
  lightningEngineEnabled?: boolean;
  executorCategory?: ExecutorCategoryType;
  executorMachineType?: string;
  /** Legacy compatibility fields */
  machineType?: string;
  disk?: string;
  diskType?: string;
}

export interface IExecutorAndDriverDraftConfig {
  tier: string;
  lightningEngineEnabled: boolean;
  executorType: string;
  executorDiskTier: string;
  executorDiskSize: string;
  useDifferentDriverConfig: boolean;
  driverMachineType: string;
  driverDiskTier: string;
  driverDiskSize: string;
}

export interface IExecutorAndDriverEditDrawerProps {
  open: boolean;
  config: IExecutorAndDriverConfig;
  onClose: () => void;
  onSave: (updatedConfig: IExecutorAndDriverConfig) => void;
  availableMachineTypes?: IMachineTypeOption[];
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
  executorConfig?: IExecutorConfig;
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
  executorConfig?: IExecutorConfig;
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
  getStorageBuckets?(projectId?: string): Promise<string[]>;
  getBucketObjects?(bucketName: string): Promise<string[]>;
  createStorageBucket?(bucketName: string, projectId?: string): Promise<string>;
  createRuntimeProfile(
    payload: ICreateRuntimeProfilePayload,
    projectId?: string,
    region?: string
  ): Promise<IRuntimeProfile>;
}
