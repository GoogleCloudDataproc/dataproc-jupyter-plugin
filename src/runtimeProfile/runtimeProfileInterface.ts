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
import { IRuntimeProfileTemplate } from './runtimeProfileListMapper';

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

/** Backward-compatibility aliases */
export type IDriverAndExecutorConfiguration = IExecutorAndDriverConfig;
export type IDriverConfig = IExecutorAndDriverConfig;
export type IExecutorDiskConfig = IExecutorAndDriverConfig;

export interface IRuntimePricingEstimateInput {
  executorMachineType?: string | null;
  driverMachineType?: string | null;
  driverShape?: string | null;
  useDifferentDriverConfig?: boolean;
  autoscalingEnabled?: boolean;
  initialExecutors?: string | number | null;
  minExecutors?: string | number | null;
  maxExecutors?: string | number | null;
  locale?: string;
}

export interface IRuntimePricingEstimateResult {
  executorDcu: number;
  driverDcu: number;
  initialExecutors: number;
  autoscalingEnabled: boolean;
  executorsBaselineDcu: number;
  baselineDcu: number;
  autoscalingBounds: {
    min: number;
    max: number;
    isRange: boolean;
  };
  hero: string;
  baselineCaption: string;
  subjectToAutoscaling: boolean;
  executorRowLabel: string;
  executorRowValue: string;
  driverRowLabel: string;
  driverRowValue: string;
  autoscalingRowLabel: string | null;
  autoscalingRowValue: string | null;
  totalRowLabel: string;
  totalRowValue: string;
}

export interface IRuntimeProfileSummaryInput {
  tier?: string;
  lightningEngineEnabled?: boolean;
  regionDisplayName?: string;
  runtimeVersion?: string;
  executorMachineType?: string;
  executorDisk?: string;
  driverMachineType?: string;
  driverDisk?: string;
  useDifferentDriverConfig?: boolean;
  autoscalingEnabled?: boolean;
  initialExecutors?: number;
  minExecutors?: number;
  maxExecutors?: number;
  metastore?: string;
  projectId?: string;
}

export interface IAutoscalingConfig {
  autoscalingEnabled?: boolean;
  initialExecutors?: number;
  minExecutors?: number;
  maxExecutors?: number;
}

export type MetastoreType = 'lakehouse' | 'dataproc';
export type CatalogSelectionMode = 'existing' | 'new';

/**
 * Metastore settings of a runtime profile. `metastoreType` decides which
 * fields apply. When it is unset nothing is sent, and the service uses its
 * default: the Lakehouse runtime catalog in the profile's project.
 */
export interface IMetastoreConfig {
  /** Display label for the summary. Not used to build the payload. */
  metastore?: string;
  metastoreType?: MetastoreType;
  /** Project of the metastore, when different from the profile's project. */
  projectId?: string;
  // Lakehouse runtime catalog: Iceberg REST endpoint
  icebergRestEndpointEnabled?: boolean;
  catalogSelectionMode?: CatalogSelectionMode;
  /** Existing catalog to use as the default catalog. */
  catalogId?: string;
  /** Name of the new default catalog. Unset means the region's default name. */
  catalogName?: string;
  // Lakehouse runtime catalog: Hive endpoint
  hiveEndpointEnabled?: boolean;
  hiveProjectId?: string;
  hiveCatalogId?: string;
  hiveCatalogName?: string;
  // Dataproc Metastore
  dataprocMetastoreService?: string;
}

export type NetworkSourceType = 'project' | 'shared_from_host';
export type ExecutionIdentityType = 'user_account' | 'service_account';
export type EncryptionType = 'google_managed' | 'customer_managed_key';

export interface INetworkAndSecurityConfig {
  networkSource?: NetworkSourceType;
  executionIdentity?: ExecutionIdentityType;
  serviceAccount?: string;
  networkInThisProject?: string;
  primaryNetwork?: string;
  subnetwork?: string;
  sharedSubnetwork?: string;
  hostProjectId?: string;
  networkTags?: string[];
  internalIpOnly?: boolean;
  encryption?: EncryptionType;
  keyRing?: string;
  cryptoKey?: string;
  kmsKeySelectionMode?: 'select' | 'manual';
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

/** Whether the runtime profile form creates a new profile or edits an existing one. */
export type RuntimeProfileFormMode = 'create' | 'edit';

/**
 * Values that seed the runtime profile form. Unset values fall back to the
 * form defaults; in edit mode they come from the selected profile.
 */
export interface IRuntimeProfileFormInitialValues {
  initialDisplayName?: string;
  initialRegion?: string;
  initialDescription?: string;
  initialTier?: string;
  initialLightningEngineEnabled?: boolean;
  initialExecutorCategory?: ExecutorCategoryType;
  initialExecutorType?: string;
  initialRuntimeEnvironmentConfig?: IRuntimeEnvironmentConfig;
  initialExecutorAndDriverConfig?: IExecutorAndDriverConfig;
  initialAutoscalingConfig?: IAutoscalingConfig;
  initialMetastoreConfig?: IMetastoreConfig;
  initialNetworkAndSecurityConfig?: INetworkAndSecurityConfig;
  initialSessionLifecycleConfig?: ISessionLifecycleConfig;
  initialSparkProperties?: SparkProperties;
  initialLabels?: ProfileLabels;
}

export interface ISharedVpcSubnetworksResult {
  hostProjectId: string;
  subnetworks: string[];
}

export interface IRuntimeProfileService {
  getRegions(projectId?: string): Promise<IRegionOption[]>;
  getStorageBuckets?(projectId?: string): Promise<string[]>;
  getBucketObjects?(bucketName: string): Promise<string[]>;
  createStorageBucket?(bucketName: string, projectId?: string): Promise<string>;
  getMachineTypes?(
    category?: ExecutorCategoryType
  ): Promise<IMachineTypeOption[]>;
  getNetworks?(projectId?: string): Promise<string[]>;
  getSubnetworks?(
    network: string,
    projectId?: string,
    region?: string
  ): Promise<string[]>;
  getSharedVpcSubnetworks?(
    projectId?: string,
    region?: string
  ): Promise<ISharedVpcSubnetworksResult>;
  getKeyRings?(projectId?: string, region?: string): Promise<string[]>;
  getCryptoKeys?(
    keyRing: string,
    projectId?: string,
    region?: string
  ): Promise<string[]>;
  createRuntimeProfile(
    payload: ICreateRuntimeProfilePayload,
    projectId?: string,
    region?: string
  ): Promise<IRuntimeProfile>;
  updateRuntimeProfile?(
    existingProfile: IRuntimeProfileTemplate,
    payload: ICreateRuntimeProfilePayload
  ): Promise<IRuntimeProfileTemplate>;
}
