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
  ExecutorCategoryType,
  HDD_DISK_SIZES,
  IAutoscalingConfig,
  ICreateRuntimeProfilePayload,
  IExecutorAndDriverConfig,
  IExecutorAndDriverDraftConfig,
  IMachineTypeOption,
  IRuntimeProfileFormInitialValues,
  SSD_DISK_SIZES,
  SparkProperties,
  TimeUnit
} from './runtimeProfileInterface';
import {
  IRuntimeProfileTemplate,
  parseRuntimeProfileResourceName
} from './runtimeProfileListMapper';

// Lakehouse runtime catalog properties. Like DATAPROC_TIER_PROPERTY, the keys
// without the `spark.` prefix are read by the Dataproc service, not by Spark.
export const LAKEHOUSE_PROJECT_PROPERTY = 'spark.dataproc.lakehouse.project';
export const LAKEHOUSE_DEFAULT_CATALOG_PROPERTY =
  'dataproc.lakehouse.defaultCatalog';
export const LAKEHOUSE_CATALOG_PROPERTY_PREFIX = 'dataproc.lakehouse.catalog.';
// The default catalog the service creates is named after the region.
const LAKEHOUSE_DEFAULT_CATALOG_NAME_PREFIX = 'standard-lh-catalog-';

// Metastore values used in IMetastoreConfig.
export const LAKEHOUSE_RUNTIME_CATALOG = 'Lakehouse runtime catalog';
export const METASTORE_NONE = 'None';

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
  environmentConfig?: {
    peripheralsConfig?: {
      metastoreService?: string;
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
 * Name of the default Lakehouse catalog the service creates in a region,
 * e.g. 'standard-lh-catalog-us-central1'. Empty when the region is unknown.
 */
export const getDefaultLakehouseCatalogName = (region?: string): string =>
  region ? `${LAKEHOUSE_DEFAULT_CATALOG_NAME_PREFIX}${region}` : '';

/**
 * Resource name of a Lakehouse catalog, e.g. 'projects/p/catalogs/c'.
 */
export const getLakehouseCatalogResource = (
  project: string,
  catalogId: string
): string => `projects/${project}/catalogs/${catalogId}`;

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

  // Lakehouse runtime catalog. The untouched default config sends nothing, so
  // the service uses the Lakehouse runtime catalog in the profile's project.
  // Derived values never override the user's sparkProperties.
  const metastoreConfig = payload.metastoreConfig;
  if (metastoreConfig?.metastoreType === 'lakehouse') {
    const isIcebergEnabled = metastoreConfig.icebergRestEndpointEnabled ?? true;
    const isHiveEnabled = Boolean(metastoreConfig.hiveEndpointEnabled);
    const hiveProject = metastoreConfig.hiveProjectId || projectId;

    if (isIcebergEnabled) {
      const icebergProject = metastoreConfig.projectId || projectId;
      setIfAbsent(LAKEHOUSE_PROJECT_PROPERTY, icebergProject);

      if (metastoreConfig.catalogSelectionMode === 'existing') {
        // An existing catalog becomes the default catalog.
        if (metastoreConfig.catalogId) {
          const catalogResource = getLakehouseCatalogResource(
            icebergProject,
            metastoreConfig.catalogId
          );
          setIfAbsent(
            LAKEHOUSE_CATALOG_PROPERTY_PREFIX + metastoreConfig.catalogId,
            catalogResource
          );
          setIfAbsent(LAKEHOUSE_DEFAULT_CATALOG_PROPERTY, catalogResource);
        }
      } else {
        // New default catalog, created by the service in the project above.
        const catalogName =
          metastoreConfig.catalogName ||
          getDefaultLakehouseCatalogName(targetRegion);
        if (catalogName) {
          setIfAbsent(
            LAKEHOUSE_CATALOG_PROPERTY_PREFIX + catalogName,
            getLakehouseCatalogResource(icebergProject, catalogName)
          );
          setIfAbsent(LAKEHOUSE_DEFAULT_CATALOG_PROPERTY, catalogName);
        }
      }
    } else if (isHiveEnabled) {
      // Hive only: the Lakehouse project is the Hive endpoint's project.
      setIfAbsent(LAKEHOUSE_PROJECT_PROPERTY, hiveProject);
    }

    // The Hive endpoint registers its catalog but never sets the default
    // catalog, which belongs to the Iceberg REST endpoint.
    if (isHiveEnabled && metastoreConfig.hiveCatalogName) {
      setIfAbsent(
        LAKEHOUSE_CATALOG_PROPERTY_PREFIX + metastoreConfig.hiveCatalogName,
        getLakehouseCatalogResource(
          hiveProject,
          metastoreConfig.hiveCatalogId || metastoreConfig.hiveCatalogName
        )
      );
    }
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

  // Dataproc Metastore service
  const metastoreService =
    metastoreConfig?.metastoreType === 'dataproc' &&
    metastoreConfig.dataprocMetastoreService &&
    metastoreConfig.dataprocMetastoreService !== METASTORE_NONE
      ? metastoreConfig.dataprocMetastoreService
      : undefined;

  const templatePayload: ISessionTemplateApiPayload = {
    name: `projects/${projectId}/locations/${targetRegion}/sessionTemplates/${templateId}`,
    description: payload.description,
    jupyterSession: {
      kernel: 'PYTHON',
      displayName: payload.displayName
    },
    labels: payload.labels || {},
    runtimeConfig,
    ...(metastoreService && {
      environmentConfig: {
        peripheralsConfig: { metastoreService }
      }
    })
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

/** Property key without the `spark:` / `dataproc:` prefix the API may return. */
const normalizePropertyKey = (key: string): string =>
  key.replace(/^(?:spark|dataproc):/, '');

/** Spark properties that mapRuntimeProfileToSessionTemplate derives from form controls. */
const FORM_DERIVED_PROPERTY_KEYS = new Set<string>([
  DATAPROC_TIER_PROPERTY,
  DATAPROC_LIGHTNING_ENGINE_PROPERTY,
  'spark.dynamicAllocation.enabled',
  'spark.dynamicAllocation.initialExecutors',
  'spark.dynamicAllocation.minExecutors',
  'spark.dynamicAllocation.maxExecutors',
  'spark.driver.cores',
  'spark.driver.memory',
  'spark.dataproc.driver.compute.tier',
  'spark.dataproc.driver.disk.tier',
  'spark.dataproc.driver.disk.size',
  'spark.executor.cores',
  'spark.executor.memory',
  'spark.dataproc.executor.compute.tier',
  'spark.dataproc.executor.resource.accelerator.type',
  'spark.dataproc.executor.disk.tier',
  'spark.dataproc.executor.disk.size'
]);

/** Known machine type with the given Spark cores and memory, e.g. 4 and '32g' -> highmem-4. */
const findMachineType = (
  cores: string | undefined,
  memory: string | undefined,
  category: ExecutorCategoryType
): IMachineTypeOption | undefined => {
  const memoryMb = memory ? memoryToMb(memory) : 0;
  if (!cores || !memoryMb) {
    return undefined;
  }
  return KNOWN_MACHINE_TYPES.find(
    machine =>
      machine.category === category &&
      String(machine.vCPUs) === cores &&
      memoryToMb(machine.memory) === memoryMb
  );
};

/**
 * Disk label that parseDiskSpec reads back to the same tier and size, e.g.
 * 'standard' + '400g' -> 'Standard persistent disk, 400 GB'. Undefined when the
 * values can't be represented that way.
 */
const formatDiskSpec = (tier?: string, size?: string): string | undefined => {
  const normalizedTier = tier?.toLowerCase();
  const sizeMatch = size?.match(/^(\d+)\s*g(?:i?b)?$/i);
  if (
    (normalizedTier !== 'standard' && normalizedTier !== 'premium') ||
    !sizeMatch
  ) {
    return undefined;
  }
  const tierLabel = normalizedTier === 'premium' ? 'Premium' : 'Standard';
  return `${tierLabel} persistent disk, ${sizeMatch[1]} GB`;
};

const DURATION_UNITS: Array<[number, TimeUnit]> = [
  [86400, 'days'],
  [3600, 'hours'],
  [60, 'minutes'],
  [1, 'seconds']
];

/** Splits a duration such as '3600s' into its largest whole unit (1 hour). */
const parseDuration = (
  duration?: string
): { quantity: number; unit: TimeUnit; label: string } | undefined => {
  const match = duration?.trim().match(/^(\d+)(?:\.\d+)?s$/);
  if (!match) {
    return undefined;
  }
  const seconds = Number(match[1]);
  const [divisor, unit] =
    DURATION_UNITS.find(([unitSeconds]) => seconds % unitSeconds === 0) ??
    DURATION_UNITS[DURATION_UNITS.length - 1];
  const quantity = seconds / divisor;
  const unitLabel = quantity === 1 ? unit.slice(0, -1) : unit;
  return { quantity, unit, label: `${quantity} ${unitLabel}` };
};

/**
 * Maps an existing session template to the runtime profile form's initial
 * values (the reverse of mapRuntimeProfileToSessionTemplate), so the form can
 * open in edit mode pre-filled with the profile's settings.
 *
 * Spark properties that a form control owns (tier, Lightning Engine, executor
 * and driver shape, disks, autoscaling) are mapped into that control's config.
 * All other properties stay in initialSparkProperties under their original
 * keys. A derived property that its control can't represent also stays there,
 * so it is saved unchanged.
 */
export function mapSessionTemplateToFormValues(
  template: IRuntimeProfileTemplate
): IRuntimeProfileFormInitialValues {
  const { region, profileId } = parseRuntimeProfileResourceName(template.name);
  const rawProperties = template.runtimeConfig?.properties ?? {};

  // Lookup by unprefixed key; an unprefixed key wins over its prefixed variants.
  const properties: Record<string, string> = {};
  Object.entries(rawProperties).forEach(([key, value]) => {
    const normalizedKey = normalizePropertyKey(key);
    if (key === normalizedKey || properties[normalizedKey] === undefined) {
      properties[normalizedKey] = value;
    }
  });
  const getProperty = (key: string): string | undefined =>
    properties[key]?.trim() || undefined;
  const mappedKeys = new Set<string>();
  const markMapped = (...keys: string[]) =>
    keys.forEach(key => mappedKeys.add(key));

  // Dataproc defaults to the standard tier; Lightning Engine needs premium.
  const lightningEngineEnabled =
    getProperty(DATAPROC_LIGHTNING_ENGINE_PROPERTY) === 'lightningEngine';
  const tierValue = getProperty(DATAPROC_TIER_PROPERTY)?.toLowerCase();
  const tier =
    tierValue === 'premium' || (!tierValue && lightningEngineEnabled)
      ? 'Premium'
      : 'Standard';
  markMapped(DATAPROC_TIER_PROPERTY, DATAPROC_LIGHTNING_ENGINE_PROPERTY);

  const executorCategory: ExecutorCategoryType = getProperty(
    'spark.dataproc.executor.resource.accelerator.type'
  )
    ? 'accelerated'
    : 'general';
  const executorMachine = findMachineType(
    getProperty('spark.executor.cores'),
    getProperty('spark.executor.memory'),
    executorCategory
  );
  if (executorMachine) {
    markMapped(
      'spark.executor.cores',
      'spark.executor.memory',
      'spark.dataproc.executor.compute.tier',
      'spark.dataproc.executor.resource.accelerator.type'
    );
  }

  const driverMachine = findMachineType(
    getProperty('spark.driver.cores'),
    getProperty('spark.driver.memory'),
    'general'
  );
  if (driverMachine) {
    markMapped('spark.driver.cores', 'spark.driver.memory');
  }

  const driverDisk = formatDiskSpec(
    getProperty('spark.dataproc.driver.disk.tier'),
    getProperty('spark.dataproc.driver.disk.size')
  );
  if (driverDisk) {
    markMapped(
      'spark.dataproc.driver.disk.tier',
      'spark.dataproc.driver.disk.size'
    );
  }
  const executorDisk = formatDiskSpec(
    getProperty('spark.dataproc.executor.disk.tier'),
    getProperty('spark.dataproc.executor.disk.size')
  );
  if (executorDisk) {
    markMapped(
      'spark.dataproc.executor.disk.tier',
      'spark.dataproc.executor.disk.size'
    );
  }

  const autoscalingConfig: IAutoscalingConfig = {};
  const dynamicAllocation = getProperty(
    'spark.dynamicAllocation.enabled'
  )?.toLowerCase();
  if (dynamicAllocation === 'true' || dynamicAllocation === 'false') {
    autoscalingConfig.autoscalingEnabled = dynamicAllocation === 'true';
    markMapped('spark.dynamicAllocation.enabled');
  }
  const executorCountKeys: Array<
    ['initialExecutors' | 'minExecutors' | 'maxExecutors', string]
  > = [
    ['initialExecutors', 'spark.dynamicAllocation.initialExecutors'],
    ['minExecutors', 'spark.dynamicAllocation.minExecutors'],
    ['maxExecutors', 'spark.dynamicAllocation.maxExecutors']
  ];
  executorCountKeys.forEach(([field, key]) => {
    const value = getProperty(key);
    if (value && /^\d+$/.test(value)) {
      autoscalingConfig[field] = Number(value);
      markMapped(key);
    }
  });

  // Derived keys that weren't mapped keep their unprefixed name, so the create
  // mapping finds them and doesn't add a second, conflicting value.
  const sparkProperties: SparkProperties = {};
  Object.entries(rawProperties).forEach(([key, value]) => {
    const normalizedKey = normalizePropertyKey(key);
    if (mappedKeys.has(normalizedKey)) {
      return;
    }
    if (FORM_DERIVED_PROPERTY_KEYS.has(normalizedKey)) {
      sparkProperties[normalizedKey] = properties[normalizedKey];
    } else {
      sparkProperties[key] = value;
    }
  });

  const executionConfig = template.environmentConfig?.executionConfig;
  const authenticationType =
    executionConfig?.authenticationConfig?.userWorkloadAuthenticationType;
  const idleTtl = parseDuration(executionConfig?.idleTtl);
  const sessionTtl = parseDuration(executionConfig?.ttl);
  // The default catalog is stored by name (new catalog) or by resource
  // (existing catalog); any other registered catalog is the Hive endpoint's.
  const defaultCatalog = getProperty(LAKEHOUSE_DEFAULT_CATALOG_PROPERTY);
  const hiveEndpointEnabled = Object.entries(properties).some(
    ([key, value]) => {
      const catalog = key.startsWith(LAKEHOUSE_CATALOG_PROPERTY_PREFIX)
        ? key.slice(LAKEHOUSE_CATALOG_PROPERTY_PREFIX.length)
        : '';
      return (
        Boolean(catalog) &&
        catalog !== defaultCatalog &&
        value.trim() !== defaultCatalog
      );
    }
  );

  return {
    initialDisplayName: template.jupyterSession?.displayName || profileId,
    initialRegion: region,
    initialDescription: template.description ?? '',
    initialTier: tier,
    initialLightningEngineEnabled: lightningEngineEnabled,
    initialExecutorCategory: executorCategory,
    initialExecutorType: executorMachine?.name,
    initialRuntimeEnvironmentConfig: {
      runtimeProfileId: profileId,
      // Left undefined when unset, so saving doesn't pin a version.
      runtimeVersion: template.runtimeConfig?.version,
      customSparkImage: template.runtimeConfig?.containerImage ?? '',
      stagingBucket: executionConfig?.stagingBucket ?? '',
      pythonPackageRepository:
        template.runtimeConfig?.repositoryConfig?.pypiRepositoryConfig
          ?.pypiRepository ?? ''
    },
    initialExecutorAndDriverConfig: {
      tier,
      driverMachineType: driverMachine?.name,
      driverDisk,
      executorType: executorMachine?.name,
      executorDisk
    },
    initialAutoscalingConfig: autoscalingConfig,
    initialMetastoreConfig: {
      metastore:
        template.environmentConfig?.peripheralsConfig?.metastoreService,
      hiveEndpointEnabled,
      projectId: getProperty(LAKEHOUSE_PROJECT_PROPERTY)
    },
    initialNetworkAndSecurityConfig: {
      executionIdentity:
        authenticationType === 'END_USER_CREDENTIALS'
          ? 'user_account'
          : authenticationType === 'SERVICE_ACCOUNT'
          ? 'service_account'
          : undefined,
      networkInThisProject:
        executionConfig?.subnetworkUri || executionConfig?.networkUri,
      primaryNetwork: executionConfig?.networkUri,
      subnetwork: executionConfig?.subnetworkUri,
      networkTags: executionConfig?.networkTags,
      encryption: executionConfig?.kmsKey
        ? 'customer_managed_key'
        : 'google_managed',
      kmsKeyName: executionConfig?.kmsKey
    },
    initialSessionLifecycleConfig: {
      maxIdleTime: idleTtl?.label,
      maxIdleTimeQuantity: idleTtl?.quantity,
      maxIdleTimeUnit: idleTtl?.unit,
      maxSessionTime: sessionTtl?.label,
      maxSessionTimeQuantity: sessionTtl?.quantity,
      maxSessionTimeUnit: sessionTtl?.unit
    },
    initialSparkProperties: sparkProperties,
    initialLabels: { ...template.labels }
  };
}

/** Body of a sessionTemplates.patch request built by mapRuntimeProfileToSessionTemplateUpdate. */
export interface ISessionTemplateUpdatePayload
  extends ISessionTemplateApiPayload {
  environmentConfig?: IRuntimeProfileTemplate['environmentConfig'];
}

/** Bucket name for executionConfig.stagingBucket; empty or 'Auto' means unset. */
const normalizeStagingBucket = (bucket?: string): string | undefined => {
  const name = bucket
    ?.trim()
    .replace(/^gs:\/\//, '')
    .replace(/\/+$/, '');
  return name && name.toLowerCase() !== 'auto' ? name : undefined;
};

/**
 * Maps the edited form payload to the body of a sessionTemplates.patch request
 * for `existingTemplate`, using the same mapping as create.
 *
 * PATCH replaces the whole template, so the body also keeps the profile's
 * resource name (its ID and region can't change), its Jupyter kernel, and the
 * settings this mapping doesn't produce yet: the environment config (network,
 * KMS key, TTLs, metastore service) and any other runtime config fields. The
 * staging bucket is taken from the form.
 */
export function mapRuntimeProfileToSessionTemplateUpdate(
  payload: ICreateRuntimeProfilePayload,
  existingTemplate: IRuntimeProfileTemplate
): ISessionTemplateUpdatePayload {
  const { region } = parseRuntimeProfileResourceName(existingTemplate.name);
  const projectId = existingTemplate.name.split('/')[1] ?? '';
  const mapped = mapRuntimeProfileToSessionTemplate(payload, projectId, region);

  // Runtime config fields the mapping doesn't manage, e.g. autotuningConfig.
  const otherRuntimeConfig: Record<string, unknown> = {
    ...existingTemplate.runtimeConfig
  };
  ['version', 'containerImage', 'properties', 'repositoryConfig'].forEach(
    field => delete otherRuntimeConfig[field]
  );

  const stagingBucket = normalizeStagingBucket(
    payload.runtimeEnvironmentConfig?.stagingBucket
  );
  const executionConfig = {
    ...existingTemplate.environmentConfig?.executionConfig
  };
  if (stagingBucket) {
    executionConfig.stagingBucket = stagingBucket;
  } else {
    delete executionConfig.stagingBucket;
  }
  const hasEnvironmentConfig =
    Boolean(existingTemplate.environmentConfig) || Boolean(stagingBucket);

  return {
    ...mapped,
    name: existingTemplate.name,
    jupyterSession: {
      ...mapped.jupyterSession,
      kernel:
        existingTemplate.jupyterSession?.kernel || mapped.jupyterSession.kernel
    },
    runtimeConfig: {
      ...otherRuntimeConfig,
      ...mapped.runtimeConfig
    } as ISessionTemplateApiPayload['runtimeConfig'],
    ...(hasEnvironmentConfig
      ? {
          environmentConfig: {
            ...existingTemplate.environmentConfig,
            executionConfig
          }
        }
      : {})
  };
}
