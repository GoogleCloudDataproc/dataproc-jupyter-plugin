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
  DATAPROC_ACCELERATED_MACHINE_TYPES,
  DATAPROC_DEFAULT_ACCELERATOR,
  DATAPROC_LIGHTNING_ENGINE_PROPERTY,
  DATAPROC_STANDARD_MACHINE_TYPES,
  DATAPROC_TIER_PROPERTY,
  DEFAULT_GENERAL_EXECUTOR_TYPE,
  DEFAULT_STANDARD_TIER_EXECUTOR_TYPE,
  DISK_HELPER_TEXT_ACCELERATED,
  DISK_HELPER_TEXT_DEFAULT,
  DISK_HELPER_TEXT_STANDARD_TIER
} from '../utils/const';
import {
  DEFAULT_HDD_DISK_SIZE,
  DEFAULT_SSD_DISK_SIZE,
  DISK_TIER_HDD,
  DISK_TIER_SSD,
  HDD_DISK_SIZES,
  ICreateRuntimeProfilePayload,
  IExecutorAndDriverConfig,
  IExecutorAndDriverDraftConfig,
  IMachineTypeOption,
  SSD_DISK_SIZES
} from './runtimeProfileInterface';

/**
 * Interface representing the exact Google Cloud Dataproc SessionTemplate API payload schema.
 * Endpoint: POST https://dataproc.googleapis.com/v1/projects/{project}/locations/{location}/sessionTemplates
 */
export interface ISessionTemplateApiPayload {
  name: string;
  description?: string;
  jupyterSession: {
    kernel: string;
    displayName: string;
  };
  labels?: Record<string, string>;
  runtimeConfig?: {
    version?: string;
    containerImage?: string;
    properties?: Record<string, string>;
    repositoryConfig?: {
      pypiRepositoryConfig?: {
        pypiRepository?: string;
      };
    };
  };
}

/**
 * Extracts version code from version string.
 * Example: '2.3 LTS (Spark 3.5.1, Python 3.12)' -> '2.3'
 */
export const extractRuntimeVersion = (
  rawVersion?: string
): string | undefined => {
  const trimmed = rawVersion?.trim();
  if (!trimmed || trimmed === 'None') {
    return undefined;
  }
  const match = trimmed.match(/^([0-9]+\.[0-9]+)/);
  return match ? match[1] : trimmed;
};

export interface IMachineSpec {
  cores: number;
  /** Spark memory string, e.g. '32g' or '13384m' */
  memory: string;
  acceleratorType?: string;
}

const KNOWN_MACHINE_TYPES: IMachineTypeOption[] = [
  ...DATAPROC_STANDARD_MACHINE_TYPES,
  ...DATAPROC_ACCELERATED_MACHINE_TYPES
];

/**
 * Converts a Spark memory string ('32g', '13384m') to megabytes.
 */
const memoryToMb = (memory: string): number => {
  const match = memory.trim().match(/^(\d+)\s*([mg])$/i);
  if (!match) {
    return 0;
  }
  const value = parseInt(match[1], 10);
  return match[2].toLowerCase() === 'g' ? value * 1024 : value;
};

/**
 * Resolves a machine type name (or label, e.g. 'highmem-4 (4 vCPU, 32 GB)') into
 * CPU cores, memory and optional accelerator. Known shapes come from
 * DATAPROC_*_MACHINE_TYPES; other names fall back to a best-effort estimate.
 */
export const parseMachineTypeSpec = (
  machineTypeName?: string
): IMachineSpec | undefined => {
  if (!machineTypeName || machineTypeName.trim() === '') {
    return undefined;
  }
  const trimmedLower = machineTypeName.trim().toLowerCase();
  const cleanName = trimmedLower.split(' ')[0];
  const known = KNOWN_MACHINE_TYPES.find(
    m => m.name === cleanName || m.label.toLowerCase() === trimmedLower
  );
  if (known) {
    return {
      cores: known.vCPUs,
      memory: known.memory,
      ...(known.acceleratorType && { acceleratorType: known.acceleratorType })
    };
  }
  const numMatch = cleanName.match(/-(\d+)$/) || cleanName.match(/(\d+)$/);
  if (numMatch) {
    const cores = parseInt(numMatch[1], 10);
    let multiplier = 4;
    if (cleanName.includes('highmem')) multiplier = 8;
    if (cleanName.includes('highcpu')) multiplier = 2;
    return { cores, memory: `${cores * multiplier}g` };
  }
  return undefined;
};

/**
 * Default disk size for Dataproc Serverless driver and executors
 * (matches RESOURCE_ALLOCATION_DEFAULT in const.ts).
 */
export const DEFAULT_DISK_SIZE = '400g';

/**
 * Parses disk specification string into disk tier ('standard' | 'premium') and size (e.g. '400g').
 */
export const parseDiskSpec = (
  diskStr?: string,
  defaultSize = DEFAULT_DISK_SIZE
): { tier?: string; size?: string } => {
  if (!diskStr || diskStr.trim() === '') {
    return {};
  }
  const lower = diskStr.toLowerCase();
  const tier =
    lower.includes('ssd') || lower.includes('premium') ? 'premium' : 'standard';

  // Require a size unit so unrelated numbers (e.g. 'pd-standard-2') are not parsed as size
  const sizeMatch = lower.match(/(\d+)\s*(?:gib|gb|g)\b/);
  let size = defaultSize;
  if (sizeMatch) {
    const parsedNum = parseInt(sizeMatch[1], 10);
    size = `${parsedNum}g`;
  }
  return { tier, size };
};

/**
 * Lowercases and hyphenates a value into a session template ID.
 * Dataproc resource IDs must start with a letter, so IDs beginning with a
 * digit (e.g. "1st Finance Profile") are prefixed with 'runtime-'.
 */
const toSessionTemplateId = (value: string): string => {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!sanitized) {
    return '';
  }
  return /^[a-z]/.test(sanitized) ? sanitized : `runtime-${sanitized}`;
};

/**
 * Generates a clean session template ID from profile display name or ID
 */
export const sanitizeSessionTemplateId = (
  displayName: string,
  preferredId?: string
): string => {
  if (
    preferredId &&
    preferredId.trim() !== '' &&
    preferredId !== 'Name of the runtime profile'
  ) {
    const sanitized = toSessionTemplateId(preferredId);
    if (sanitized) {
      return sanitized;
    }
  }

  if (displayName && displayName.trim() !== '') {
    const sanitized = toSessionTemplateId(displayName);
    if (sanitized) {
      return sanitized;
    }
  }

  // Generate random 12-char hex ID (6 random bytes = 48 bits of entropy)
  try {
    const cryptoObj: Crypto | undefined =
      typeof window !== 'undefined' ? window.crypto : undefined;
    if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
      const array = new Uint8Array(6);
      cryptoObj.getRandomValues(array);
      const hex = Array.from(array, b => b.toString(16).padStart(2, '0')).join(
        ''
      );
      return 'runtime-' + hex;
    }
  } catch (e) {
    // ignore
  }

  const randomHex = Math.floor(Math.random() * 0xffffffffffff)
    .toString(16)
    .padStart(12, '0');
  return 'runtime-' + randomHex;
};

/**
 * Maps ICreateRuntimeProfilePayload to Dataproc SessionTemplate API payload schema
 */
export function mapRuntimeProfileToSessionTemplate(
  payload: ICreateRuntimeProfilePayload,
  projectId: string,
  region: string
): ISessionTemplateApiPayload {
  const templateId = sanitizeSessionTemplateId(
    payload.displayName,
    payload.runtimeEnvironmentConfig?.runtimeProfileId
  );

  const targetRegion = payload.region || region;
  const executorAndDriverConfig = payload.executorAndDriverConfig;

  // Build spark / runtime properties
  const properties: Record<string, string> = {
    ...(payload.sparkProperties || {})
  };

  /** Sets a derived property only if the user did not provide it in sparkProperties. */
  const setIfAbsent = (key: string, value?: string): void => {
    if (value !== undefined && properties[key] === undefined) {
      properties[key] = value;
    }
  };

  // Tier and Lightning Engine come from explicit UI controls and intentionally
  // override sparkProperties (consistent with createBatch.tsx).
  // Compute tier (standard vs premium)
  const tier = payload.tier || executorAndDriverConfig?.tier;
  if (tier) {
    properties[DATAPROC_TIER_PROPERTY] = tier.toLowerCase();
  }

  // Lightning Engine
  if (
    payload.lightningEngineEnabled ||
    payload.runtimeEnvironmentConfig?.lightningEngineEnabled
  ) {
    properties[DATAPROC_LIGHTNING_ENGINE_PROPERTY] = 'lightningEngine';
  }

  // Autoscaling / Dynamic allocation properties (user sparkProperties take precedence)
  const autoscaling = payload.autoscalingConfig;
  if (autoscaling) {
    const asString = (v?: number | boolean): string | undefined =>
      v === undefined ? undefined : String(v);
    setIfAbsent(
      'spark.dynamicAllocation.enabled',
      asString(autoscaling.autoscalingEnabled)
    );
    setIfAbsent(
      'spark.dynamicAllocation.initialExecutors',
      asString(autoscaling.initialExecutors)
    );
    setIfAbsent(
      'spark.dynamicAllocation.minExecutors',
      asString(autoscaling.minExecutors)
    );
    setIfAbsent(
      'spark.dynamicAllocation.maxExecutors',
      asString(autoscaling.maxExecutors)
    );
  }

  // Driver machine type & disk properties
  const driverMachine = parseMachineTypeSpec(
    executorAndDriverConfig?.driverMachineType
  );
  if (driverMachine) {
    if (!properties['spark.driver.cores']) {
      properties['spark.driver.cores'] = String(driverMachine.cores);
    }
    if (!properties['spark.driver.memory']) {
      properties['spark.driver.memory'] = driverMachine.memory;
    }
  }

  const driverDisk = parseDiskSpec(
    executorAndDriverConfig?.driverDisk,
    DEFAULT_DISK_SIZE
  );
  if (driverDisk.tier && !properties['spark.dataproc.driver.disk.tier']) {
    properties['spark.dataproc.driver.disk.tier'] = driverDisk.tier;
    if (
      driverDisk.tier === 'premium' &&
      !properties['spark.dataproc.driver.compute.tier']
    ) {
      properties['spark.dataproc.driver.compute.tier'] = 'premium';
    }
  }
  if (driverDisk.size && !properties['spark.dataproc.driver.disk.size']) {
    properties['spark.dataproc.driver.disk.size'] = driverDisk.size;
  }

  // Executor machine type & accelerator properties
  const executorMachineType =
    payload.executorConfig?.machineType ||
    executorAndDriverConfig?.executorMachineType ||
    executorAndDriverConfig?.executorType;

  const executorMachine = parseMachineTypeSpec(executorMachineType);
  if (executorMachine) {
    if (!properties['spark.executor.cores']) {
      properties['spark.executor.cores'] = String(executorMachine.cores);
    }
    if (!properties['spark.executor.memory']) {
      properties['spark.executor.memory'] = executorMachine.memory;
    }
    // High-memory shapes (e.g. highmem-4 with 32 GB RAM for 4 cores = 8 GB/core) exceed the
    // Standard compute tier memory limit of 7,424 MB per core (including 40% memoryOverhead).
    // Dataproc Serverless requires 'premium' compute tier for highmem executor shapes.
    const isHighmemShape =
      executorMachineType?.toLowerCase().includes('highmem') ||
      (executorMachine.cores > 0 &&
        (memoryToMb(executorMachine.memory) * 1.4) / executorMachine.cores >
          7424);

    if (
      (isHighmemShape || executorMachine.acceleratorType) &&
      !properties['spark.dataproc.executor.compute.tier']
    ) {
      properties['spark.dataproc.executor.compute.tier'] = 'premium';
    }

    if (executorMachine.acceleratorType) {
      if (!properties['spark.dataproc.executor.resource.accelerator.type']) {
        properties['spark.dataproc.executor.resource.accelerator.type'] =
          executorMachine.acceleratorType;
      }
    }
  }

  if (payload.executorConfig?.executorType === 'accelerated') {
    if (!properties['spark.dataproc.executor.compute.tier']) {
      properties['spark.dataproc.executor.compute.tier'] = 'premium';
    }
    if (!properties['spark.dataproc.executor.resource.accelerator.type']) {
      properties['spark.dataproc.executor.resource.accelerator.type'] =
        DATAPROC_DEFAULT_ACCELERATOR;
    }
  }

  // Executor disk properties
  const executorDisk = parseDiskSpec(
    executorAndDriverConfig?.executorDisk,
    DEFAULT_DISK_SIZE
  );
  if (executorDisk.tier && !properties['spark.dataproc.executor.disk.tier']) {
    properties['spark.dataproc.executor.disk.tier'] = executorDisk.tier;
  }
  if (executorDisk.size && !properties['spark.dataproc.executor.disk.size']) {
    properties['spark.dataproc.executor.disk.size'] = executorDisk.size;
  }

  // Runtime Config
  const runtimeVersion = extractRuntimeVersion(
    payload.runtimeEnvironmentConfig?.runtimeVersion
  );
  const customImage =
    payload.runtimeEnvironmentConfig?.customSparkImage &&
    payload.runtimeEnvironmentConfig.customSparkImage !== 'None'
      ? payload.runtimeEnvironmentConfig.customSparkImage
      : undefined;

  const pythonRepo =
    payload.runtimeEnvironmentConfig?.pythonPackageRepository &&
    payload.runtimeEnvironmentConfig.pythonPackageRepository !==
      'Google Managed PyPI pull through cache'
      ? payload.runtimeEnvironmentConfig.pythonPackageRepository
      : undefined;

  const runtimeConfig: ISessionTemplateApiPayload['runtimeConfig'] = {
    ...(runtimeVersion && { version: runtimeVersion }),
    ...(customImage && { containerImage: customImage }),
    ...(Object.keys(properties).length > 0 && { properties }),
    ...(pythonRepo && {
      repositoryConfig: {
        pypiRepositoryConfig: {
          pypiRepository: pythonRepo
        }
      }
    })
  };

  const templatePayload: ISessionTemplateApiPayload = {
    name: `projects/${projectId}/locations/${targetRegion}/sessionTemplates/${templateId}`,
    description: payload.description,
    jupyterSession: {
      kernel: 'PYTHON',
      displayName: payload.displayName
    },
    labels: payload.labels || {},
    runtimeConfig
  };

  return templatePayload;
}

/**
 * Parses a human-readable disk string (e.g. 'HDD (standard), 200 GiB' or 'SSD 750 GB')
 * into its UI disk tier and size.
 */
export const parseDiskTierAndSize = (
  diskStr?: string,
  defaultTier: string = DISK_TIER_HDD
): { tier: string; size: string } => {
  if (!diskStr || diskStr.trim() === '') {
    return {
      tier: defaultTier,
      size:
        defaultTier === DISK_TIER_SSD
          ? DEFAULT_SSD_DISK_SIZE
          : DEFAULT_HDD_DISK_SIZE
    };
  }
  const lower = diskStr.toLowerCase();
  const isSsd = lower.includes('ssd') || lower.includes('premium');
  const tier = isSsd ? DISK_TIER_SSD : DISK_TIER_HDD;
  const match = diskStr.match(/(\d+)\s*(?:gib|gb|g)?/i);
  let size = isSsd ? DEFAULT_SSD_DISK_SIZE : DEFAULT_HDD_DISK_SIZE;
  if (match) {
    const rawNum = match[1];
    const formatted = `${rawNum} GiB`;
    if (isSsd) {
      size = SSD_DISK_SIZES.includes(formatted)
        ? formatted
        : DEFAULT_SSD_DISK_SIZE;
    } else {
      size = HDD_DISK_SIZES.includes(formatted)
        ? formatted
        : DEFAULT_HDD_DISK_SIZE;
    }
  }
  return { tier, size };
};

/**
 * Normalizes a machine type string or display label (e.g. 'highmem-4 (4 vCPU, 32 GB)' or 'L4 (4 cores)')
 * to its canonical machine type name (e.g. 'highmem-4' or 'l4-4').
 */
export const normalizeMachineTypeName = (
  raw?: string,
  allTypes: IMachineTypeOption[] = KNOWN_MACHINE_TYPES
): string => {
  if (!raw || raw.trim() === '') {
    return DEFAULT_GENERAL_EXECUTOR_TYPE;
  }
  const clean = raw.trim().toLowerCase();
  const byName = allTypes.find(m => m.name.toLowerCase() === clean);
  if (byName) {
    return byName.name;
  }
  const byLabel = allTypes.find(m => m.label.toLowerCase() === clean);
  if (byLabel) {
    return byLabel.name;
  }
  const firstWord = clean.split(' ')[0];
  const byFirstWord = allTypes.find(m => m.name.toLowerCase() === firstWord);
  if (byFirstWord) {
    return byFirstWord.name;
  }
  return firstWord || raw;
};

/**
 * Determines whether a machine type name belongs to the accelerated (GPU) category.
 */
export const isAcceleratedMachine = (
  name: string,
  allTypes: IMachineTypeOption[] = KNOWN_MACHINE_TYPES
): boolean => {
  const match = allTypes.find(m => m.name === name);
  if (match) {
    return match.category === 'accelerated' || Boolean(match.acceleratorType);
  }
  const clean = name.toLowerCase();
  return (
    clean.startsWith('l4-') ||
    clean.startsWith('a100-') ||
    clean.startsWith('h100-') ||
    clean.startsWith('g2-') ||
    clean.startsWith('a2-')
  );
};

/**
 * Resolves the appropriate disk size when switching disk tier.
 */
export const resolveDiskSizeForTier = (
  diskTier: string,
  currentSize: string
): string => {
  if (diskTier === DISK_TIER_SSD && !SSD_DISK_SIZES.includes(currentSize)) {
    return DEFAULT_SSD_DISK_SIZE;
  }
  if (diskTier === DISK_TIER_HDD && !HDD_DISK_SIZES.includes(currentSize)) {
    return DEFAULT_HDD_DISK_SIZE;
  }
  return currentSize;
};

/**
 * Builds the initial draft state for ExecutorAndDriverEditDrawer from the current config.
 */
export const buildInitialExecutorAndDriverDraft = (
  config: IExecutorAndDriverConfig,
  allMachineTypes: IMachineTypeOption[] = KNOWN_MACHINE_TYPES
): IExecutorAndDriverDraftConfig => {
  const initialTier = config.tier || 'Premium';
  const initialExecType = normalizeMachineTypeName(
    config.executorMachineType ||
      (typeof config.executorType === 'string'
        ? config.executorType
        : undefined),
    allMachineTypes
  );
  const isExecAcc = isAcceleratedMachine(initialExecType, allMachineTypes);
  const defaultExecDiskTier = isExecAcc ? DISK_TIER_SSD : DISK_TIER_HDD;
  const parsedExecDisk = parseDiskTierAndSize(
    config.executorDisk || config.diskType,
    defaultExecDiskTier
  );
  const initialDriverType = normalizeMachineTypeName(
    config.driverMachineType || config.machineType || initialExecType,
    allMachineTypes
  );
  const isDrvAcc = isAcceleratedMachine(initialDriverType, allMachineTypes);
  const defaultDrvDiskTier = isDrvAcc ? DISK_TIER_SSD : DISK_TIER_HDD;
  const parsedDrvDisk = parseDiskTierAndSize(
    config.driverDisk || config.disk,
    defaultDrvDiskTier
  );
  const diffDriver = Boolean(config.useDifferentDriverConfig);

  const execDiskTier = isExecAcc
    ? DISK_TIER_SSD
    : initialTier === 'Standard'
    ? DISK_TIER_HDD
    : config.executorDiskTier || parsedExecDisk.tier;
  const execDiskSize =
    execDiskTier === DISK_TIER_SSD
      ? SSD_DISK_SIZES.includes(config.executorDiskSize || parsedExecDisk.size)
        ? config.executorDiskSize || parsedExecDisk.size
        : DEFAULT_SSD_DISK_SIZE
      : config.executorDiskSize || parsedExecDisk.size;

  const drvDiskTier = diffDriver
    ? isDrvAcc
      ? DISK_TIER_SSD
      : initialTier === 'Standard'
      ? DISK_TIER_HDD
      : config.driverDiskTier || parsedDrvDisk.tier
    : execDiskTier;

  const drvDiskSize = diffDriver
    ? drvDiskTier === DISK_TIER_SSD
      ? SSD_DISK_SIZES.includes(config.driverDiskSize || parsedDrvDisk.size)
        ? config.driverDiskSize || parsedDrvDisk.size
        : DEFAULT_SSD_DISK_SIZE
      : config.driverDiskSize || parsedDrvDisk.size
    : execDiskSize;

  return {
    tier: initialTier,
    lightningEngineEnabled:
      config.lightningEngineEnabled !== undefined
        ? config.lightningEngineEnabled
        : true,
    executorType: initialExecType,
    executorDiskTier: execDiskTier,
    executorDiskSize: execDiskSize,
    useDifferentDriverConfig: diffDriver,
    driverMachineType: diffDriver ? initialDriverType : initialExecType,
    driverDiskTier: drvDiskTier,
    driverDiskSize: drvDiskSize
  };
};

/**
 * Updates the draft state when the user toggles between Premium and Standard tier.
 * Preserves the user's `lightningEngineEnabled` checkbox state across tier toggles.
 */
export const applyTierChangeToDraft = (
  prev: IExecutorAndDriverDraftConfig,
  selectedTier: string,
  allMachineTypes: IMachineTypeOption[] = KNOWN_MACHINE_TYPES
): IExecutorAndDriverDraftConfig => {
  if (selectedTier === 'Standard') {
    const fallbackExec =
      isAcceleratedMachine(prev.executorType, allMachineTypes) ||
      prev.executorType.includes('highmem')
        ? DEFAULT_STANDARD_TIER_EXECUTOR_TYPE
        : prev.executorType;
    const fallbackDriver =
      isAcceleratedMachine(prev.driverMachineType, allMachineTypes) ||
      prev.driverMachineType.includes('highmem')
        ? DEFAULT_STANDARD_TIER_EXECUTOR_TYPE
        : prev.driverMachineType;
    return {
      ...prev,
      tier: 'Standard',
      executorType: fallbackExec,
      executorDiskTier: DISK_TIER_HDD,
      executorDiskSize: SSD_DISK_SIZES.includes(prev.executorDiskSize)
        ? DEFAULT_HDD_DISK_SIZE
        : prev.executorDiskSize,
      driverMachineType: prev.useDifferentDriverConfig
        ? fallbackDriver
        : fallbackExec,
      driverDiskTier: DISK_TIER_HDD,
      driverDiskSize: SSD_DISK_SIZES.includes(prev.driverDiskSize)
        ? DEFAULT_HDD_DISK_SIZE
        : prev.driverDiskSize
    };
  }
  return {
    ...prev,
    tier: 'Premium'
  };
};

/**
 * Updates the draft state when the executor machine type changes.
 */
export const applyExecutorTypeChangeToDraft = (
  prev: IExecutorAndDriverDraftConfig,
  selectedType: string,
  allMachineTypes: IMachineTypeOption[] = KNOWN_MACHINE_TYPES
): IExecutorAndDriverDraftConfig => {
  const isAcc = isAcceleratedMachine(selectedType, allMachineTypes);
  const nextDiskTier = isAcc ? DISK_TIER_SSD : prev.executorDiskTier;
  const nextDiskSize =
    isAcc && !SSD_DISK_SIZES.includes(prev.executorDiskSize)
      ? DEFAULT_SSD_DISK_SIZE
      : prev.executorDiskSize;
  return {
    ...prev,
    executorType: selectedType,
    executorDiskTier: nextDiskTier,
    executorDiskSize: nextDiskSize,
    driverMachineType: prev.useDifferentDriverConfig
      ? prev.driverMachineType
      : selectedType,
    driverDiskTier: prev.useDifferentDriverConfig
      ? prev.driverDiskTier
      : nextDiskTier,
    driverDiskSize: prev.useDifferentDriverConfig
      ? prev.driverDiskSize
      : nextDiskSize
  };
};

/**
 * Updates the draft state when the executor disk tier changes.
 */
export const applyExecutorDiskTierChangeToDraft = (
  prev: IExecutorAndDriverDraftConfig,
  selectedTier: string
): IExecutorAndDriverDraftConfig => {
  const nextSize = resolveDiskSizeForTier(selectedTier, prev.executorDiskSize);
  return {
    ...prev,
    executorDiskTier: selectedTier,
    executorDiskSize: nextSize,
    driverDiskTier: prev.useDifferentDriverConfig
      ? prev.driverDiskTier
      : selectedTier,
    driverDiskSize: prev.useDifferentDriverConfig
      ? prev.driverDiskSize
      : nextSize
  };
};

/**
 * Updates the draft state when the driver machine type changes.
 */
export const applyDriverTypeChangeToDraft = (
  prev: IExecutorAndDriverDraftConfig,
  selectedType: string,
  allMachineTypes: IMachineTypeOption[] = KNOWN_MACHINE_TYPES
): IExecutorAndDriverDraftConfig => {
  const isAcc = isAcceleratedMachine(selectedType, allMachineTypes);
  const nextDiskTier = isAcc ? DISK_TIER_SSD : prev.driverDiskTier;
  const nextDiskSize =
    isAcc && !SSD_DISK_SIZES.includes(prev.driverDiskSize)
      ? DEFAULT_SSD_DISK_SIZE
      : prev.driverDiskSize;
  return {
    ...prev,
    driverMachineType: selectedType,
    driverDiskTier: nextDiskTier,
    driverDiskSize: nextDiskSize
  };
};

/**
 * Updates the draft state when the driver disk tier changes.
 */
export const applyDriverDiskTierChangeToDraft = (
  prev: IExecutorAndDriverDraftConfig,
  selectedTier: string
): IExecutorAndDriverDraftConfig => {
  const nextSize = resolveDiskSizeForTier(selectedTier, prev.driverDiskSize);
  return {
    ...prev,
    driverDiskTier: selectedTier,
    driverDiskSize: nextSize
  };
};

/**
 * Builds the saved IExecutorAndDriverConfig object from the drawer's draft state.
 * Preserves the user's `lightningEngineEnabled` checkbox choice across tiers.
 */
export const buildSavedExecutorAndDriverConfig = (
  config: IExecutorAndDriverConfig,
  draftConfig: IExecutorAndDriverDraftConfig,
  allMachineTypes: IMachineTypeOption[] = KNOWN_MACHINE_TYPES
): IExecutorAndDriverConfig => {
  const execObj = allMachineTypes.find(
    m => m.name === draftConfig.executorType
  );
  const drvObj = allMachineTypes.find(
    m => m.name === draftConfig.driverMachineType
  );

  const execLabel = execObj ? execObj.label : draftConfig.executorType;
  const drvLabel = draftConfig.useDifferentDriverConfig
    ? drvObj
      ? drvObj.label
      : draftConfig.driverMachineType
    : execLabel;

  const drvDiskTier = draftConfig.useDifferentDriverConfig
    ? draftConfig.driverDiskTier
    : draftConfig.executorDiskTier;
  const drvDiskSize = draftConfig.useDifferentDriverConfig
    ? draftConfig.driverDiskSize
    : draftConfig.executorDiskSize;

  return {
    ...config,
    tier: draftConfig.tier,
    lightningEngineEnabled: draftConfig.lightningEngineEnabled,
    executorCategory: isAcceleratedMachine(
      draftConfig.executorType,
      allMachineTypes
    )
      ? 'accelerated'
      : 'general',
    executorType: execLabel,
    executorMachineType: draftConfig.executorType,
    executorDiskTier: draftConfig.executorDiskTier,
    executorDiskSize: draftConfig.executorDiskSize,
    executorDisk: `${draftConfig.executorDiskTier}, ${draftConfig.executorDiskSize}`,
    useDifferentDriverConfig: draftConfig.useDifferentDriverConfig,
    driverMachineType: drvLabel,
    driverDiskTier: drvDiskTier,
    driverDiskSize: drvDiskSize,
    driverDisk: `${drvDiskTier}, ${drvDiskSize}`,
    machineType: drvLabel,
    disk: `${drvDiskTier}, ${drvDiskSize}`,
    diskType: `${draftConfig.executorDiskTier}, ${draftConfig.executorDiskSize}`
  };
};

/**
 * Filters and groups machine types by subgroup for the Executor/Driver dropdown.
 */
export const groupAndFilterMachineTypes = (
  allMachineTypes: IMachineTypeOption[],
  activeTier: string,
  searchQuery: string
): Record<string, IMachineTypeOption[]> => {
  const allowed =
    activeTier === 'Standard'
      ? allMachineTypes.filter(
          m =>
            m.category === 'general' &&
            !m.name.toLowerCase().includes('highmem')
        )
      : allMachineTypes;

  const query = searchQuery.trim().toLowerCase();
  const filtered = query
    ? allowed.filter(
        m =>
          m.name.toLowerCase().includes(query) ||
          m.label.toLowerCase().includes(query) ||
          (m.subgroup && m.subgroup.toLowerCase().includes(query))
      )
    : allowed;

  const groups: Record<string, IMachineTypeOption[]> = {};
  filtered.forEach(m => {
    const lowerName = m.name.toLowerCase();
    const groupName =
      m.subgroup ||
      (m.category === 'accelerated'
        ? lowerName.startsWith('a100')
          ? 'Accelerated (A100)'
          : lowerName.startsWith('l4')
          ? 'Accelerated (L4)'
          : 'Accelerated'
        : lowerName.startsWith('highmem')
        ? 'General (High memory)'
        : 'General (Standard)');
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(m);
  });
  return groups;
};

/**
 * Returns the contextual helper text for Executor or Driver disk configuration.
 */
export const getDiskHelperText = (
  tier: string,
  isAccelerated: boolean
): string => {
  if (tier === 'Standard') {
    return DISK_HELPER_TEXT_STANDARD_TIER;
  }
  if (isAccelerated) {
    return DISK_HELPER_TEXT_ACCELERATED;
  }
  return DISK_HELPER_TEXT_DEFAULT;
};
