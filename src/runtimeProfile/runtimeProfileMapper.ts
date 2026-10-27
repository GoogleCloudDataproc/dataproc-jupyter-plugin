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
  INetworkAndSecurityConfig,
  IRuntimeProfileFormInitialValues,
  ISessionLifecycleConfig,
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
    executionConfig?: {
      serviceAccount?: string;
      networkTags?: string[];
      kmsKey?: string;
      subnetworkUri?: string;
      idleTtl?: string;
      ttl?: string;
      authentication_config?: {
        user_workload_authentication_type: string;
      };
      stagingBucket?: string;
    };
    peripheralsConfig?: {
      metastoreService?: string;
      sparkHistoryServerConfig?: {
        dataprocCluster?: string;
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

/** Property key without the `spark:` / `dataproc:` prefix the API may return. */
const normalizePropertyKey = (key: string): string =>
  key.replace(/^(?:spark|dataproc):/, '');

/** Value of a property under its plain key or its `spark:` / `dataproc:` prefixed key. */
const findPropertyValue = (
  properties: Record<string, string>,
  key: string
): string | undefined =>
  properties[key] ??
  properties[`spark:${key}`] ??
  properties[`dataproc:${key}`];

/** Seconds in each session lifecycle time unit. */
export const TTL_UNIT_SECONDS: Record<TimeUnit, number> = {
  seconds: 1,
  s: 1,
  minutes: 60,
  m: 60,
  hours: 3600,
  h: 3600,
  days: 86400,
  d: 86400
};

/**
 * Splits a TTL such as '3600s' or '2 hours' into its largest whole unit, e.g.
 * 1 hour. Empty or unreadable values return the given defaults.
 */
export const parseTtlToQuantityAndUnit = (
  ttl: string | undefined,
  defaultQty: number,
  defaultUnit: TimeUnit
): { quantity: number; unit: TimeUnit } => {
  const trimmed = ttl?.trim() || '';
  if (!trimmed) {
    return { quantity: defaultQty, unit: defaultUnit };
  }
  const secMatch = /^(\d+)\s*s$/i.exec(trimmed);
  if (secMatch) {
    const secs = Number(secMatch[1]);
    if (secs > 0) {
      if (secs % 86400 === 0) {
        return { quantity: secs / 86400, unit: 'days' };
      }
      if (secs % 3600 === 0) {
        return { quantity: secs / 3600, unit: 'hours' };
      }
      if (secs % 60 === 0) {
        return { quantity: secs / 60, unit: 'minutes' };
      }
      return { quantity: secs, unit: 'seconds' };
    }
  }
  const genericMatch = /^(\d+)\s*([a-zA-Z]+)$/.exec(trimmed);
  if (genericMatch) {
    const qty = parseInt(genericMatch[1], 10);
    const rawUnit = genericMatch[2].toLowerCase();
    if (!Number.isNaN(qty) && qty > 0) {
      if (rawUnit.startsWith('d')) {
        return { quantity: qty, unit: 'days' };
      }
      if (rawUnit.startsWith('h')) {
        return { quantity: qty, unit: 'hours' };
      }
      if (rawUnit.startsWith('m')) {
        return { quantity: qty, unit: 'minutes' };
      }
      if (rawUnit.startsWith('s')) {
        return { quantity: qty, unit: 'seconds' };
      }
    }
  }
  return { quantity: defaultQty, unit: defaultUnit };
};

/**
 * Duration for executionConfig.idleTtl / ttl, e.g. 60 minutes -> '3600s'.
 * Undefined when the time is unset or reads as 'None'.
 */
export const toTtlDurationString = (
  quantity?: number,
  unit?: TimeUnit,
  fallbackText?: string
): string | undefined => {
  if (
    typeof quantity === 'number' &&
    !Number.isNaN(quantity) &&
    quantity > 0 &&
    unit
  ) {
    const multiplier = TTL_UNIT_SECONDS[unit] ?? 60;
    return `${quantity * multiplier}s`;
  }
  if (fallbackText && fallbackText.trim()) {
    const parsed = parseTtlToQuantityAndUnit(fallbackText, 0, 'seconds');
    if (parsed.quantity > 0) {
      return `${parsed.quantity * TTL_UNIT_SECONDS[parsed.unit]}s`;
    }
  }
  return undefined;
};

/** Bucket name for executionConfig.stagingBucket; empty or 'Auto' means unset. */
const normalizeStagingBucket = (bucket?: string): string | undefined => {
  const name = bucket
    ?.trim()
    .replace(/^gs:\/\//, '')
    .replace(/\/+$/, '');
  return name && name.toLowerCase() !== 'auto' ? name : undefined;
};

type ExecutionConfigPayload = NonNullable<
  NonNullable<
    ISessionTemplateApiPayload['environmentConfig']
  >['executionConfig']
>;

/**
 * executionConfig.subnetworkUri for the network settings. Throws when a
 * network is selected without a subnetwork.
 */
const buildSubnetworkUri = (
  networkConfig: INetworkAndSecurityConfig | undefined,
  region: string
): string | undefined => {
  if (networkConfig?.networkSource === 'shared_from_host') {
    const sharedSub = networkConfig.sharedSubnetwork?.trim();
    const hostProject = networkConfig.hostProjectId?.trim();
    if (!sharedSub) {
      throw new Error(
        'Shared subnetwork is required when shared VPC network is selected.'
      );
    }
    return sharedSub.startsWith('projects/') || !hostProject
      ? sharedSub
      : `projects/${hostProject}/regions/${region}/subnetworks/${sharedSub}`;
  }
  if (!networkConfig) {
    return undefined;
  }
  const subnetworkUri = networkConfig.subnetwork?.trim() || undefined;
  const selectedNetwork = (
    networkConfig.primaryNetwork || networkConfig.networkInThisProject
  )?.trim();
  if (
    !subnetworkUri &&
    (networkConfig.networkSource === 'project' || selectedNetwork)
  ) {
    throw new Error(
      'Subnetwork is required when a project network is selected.'
    );
  }
  return subnetworkUri;
};

/** executionConfig.networkTags; unset when there are none. */
const buildNetworkTags = (
  networkConfig: INetworkAndSecurityConfig | undefined
): string[] | undefined =>
  networkConfig?.networkTags && networkConfig.networkTags.length > 0
    ? networkConfig.networkTags
    : undefined;

/**
 * executionConfig.kmsKey for customer-managed encryption. Throws when that is
 * selected without a key.
 */
const buildKmsKey = (
  networkConfig: INetworkAndSecurityConfig | undefined,
  projectId: string,
  region: string
): string | undefined => {
  if (networkConfig?.encryption !== 'customer_managed_key') {
    return undefined;
  }
  const keyRing = networkConfig.keyRing?.trim();
  const cryptoKey = networkConfig.cryptoKey?.trim();
  const manualKeyName = networkConfig.kmsKeyName?.trim();
  let kmsKey: string | undefined;
  if (networkConfig.kmsKeySelectionMode !== 'manual' && keyRing && cryptoKey) {
    kmsKey = `projects/${projectId}/locations/${region}/keyRings/${keyRing}/cryptoKeys/${cryptoKey}`;
  } else if (manualKeyName) {
    kmsKey = manualKeyName;
  }
  if (!kmsKey) {
    throw new Error(
      'Customer-managed encryption key (Cloud KMS key) is required when customer-managed encryption is selected.'
    );
  }
  return kmsKey;
};

/** executionConfig.serviceAccount; only set for the service account identity. */
const buildServiceAccount = (
  networkConfig: INetworkAndSecurityConfig | undefined
): string | undefined =>
  networkConfig?.executionIdentity === 'service_account'
    ? networkConfig.serviceAccount?.trim() || undefined
    : undefined;

/**
 * executionConfig network, encryption and identity fields for the Network and
 * security settings. Throws when a required value is missing.
 */
export const buildNetworkExecutionConfig = (
  networkConfig: INetworkAndSecurityConfig | undefined,
  projectId: string,
  region: string
): ExecutionConfigPayload => {
  const subnetworkUri = buildSubnetworkUri(networkConfig, region);
  const networkTags = buildNetworkTags(networkConfig);
  const kmsKey = buildKmsKey(networkConfig, projectId, region);
  const serviceAccount = buildServiceAccount(networkConfig);
  const isUserAccount = networkConfig?.executionIdentity === 'user_account';

  return {
    ...(subnetworkUri && { subnetworkUri }),
    ...(networkTags && { networkTags }),
    ...(kmsKey && { kmsKey }),
    ...(serviceAccount && { serviceAccount }),
    ...(isUserAccount && {
      authentication_config: {
        user_workload_authentication_type: 'END_USER_CREDENTIALS'
      }
    })
  };
};

/** executionConfig idleTtl / ttl for the Session lifecycle settings. */
export const buildSessionLifecycleTtls = (
  lifecycleConfig?: ISessionLifecycleConfig
): Pick<ExecutionConfigPayload, 'idleTtl' | 'ttl'> => {
  if (!lifecycleConfig) {
    return {};
  }
  const idleTtl = toTtlDurationString(
    lifecycleConfig.maxIdleTimeQuantity,
    lifecycleConfig.maxIdleTimeUnit,
    lifecycleConfig.maxIdleTime
  );
  const ttl = toTtlDurationString(
    lifecycleConfig.maxSessionTimeQuantity,
    lifecycleConfig.maxSessionTimeUnit,
    lifecycleConfig.maxSessionTime
  );
  return {
    ...(idleTtl && { idleTtl }),
    ...(ttl && { ttl })
  };
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

  // Derived values never override the user's sparkProperties, whether the
  // user wrote the key with or without a `spark:` / `dataproc:` prefix.
  /** Sets a derived property only if the user did not provide it in sparkProperties. */
  const setIfAbsent = (key: string, value?: string): void => {
    if (
      value !== undefined &&
      findPropertyValue(properties, key) === undefined
    ) {
      properties[key] = value;
    }
  };
  /** Sets a derived property unless the properties already have a value for it. */
  const setIfEmpty = (key: string, value: string): void => {
    if (!findPropertyValue(properties, key)) {
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
    setIfEmpty('spark.driver.cores', String(driverMachine.cores));
    setIfEmpty('spark.driver.memory', driverMachine.memory);
  }

  const driverDisk = parseDiskSpec(
    executorAndDriverConfig?.driverDisk,
    DEFAULT_DISK_SIZE
  );
  if (
    driverDisk.tier &&
    !findPropertyValue(properties, 'spark.dataproc.driver.disk.tier')
  ) {
    properties['spark.dataproc.driver.disk.tier'] = driverDisk.tier;
    if (driverDisk.tier === 'premium') {
      setIfEmpty('spark.dataproc.driver.compute.tier', 'premium');
    }
  }
  if (driverDisk.size) {
    setIfEmpty('spark.dataproc.driver.disk.size', driverDisk.size);
  }

  // Executor machine type & accelerator properties
  const executorMachineType =
    payload.executorConfig?.machineType ||
    executorAndDriverConfig?.executorMachineType ||
    executorAndDriverConfig?.executorType;

  const executorMachine = parseMachineTypeSpec(executorMachineType);
  if (executorMachine) {
    setIfEmpty('spark.executor.cores', String(executorMachine.cores));
    setIfEmpty('spark.executor.memory', executorMachine.memory);
    // High-memory shapes (e.g. highmem-4 with 32 GB RAM for 4 cores = 8 GB/core) exceed the
    // Standard compute tier memory limit of 7,424 MB per core (including 40% memoryOverhead).
    // Dataproc Serverless requires 'premium' compute tier for highmem executor shapes.
    const isHighmemShape =
      executorMachineType?.toLowerCase().includes('highmem') ||
      (executorMachine.cores > 0 &&
        (memoryToMb(executorMachine.memory) * 1.4) / executorMachine.cores >
          7424);

    if (isHighmemShape || executorMachine.acceleratorType) {
      setIfEmpty('spark.dataproc.executor.compute.tier', 'premium');
    }

    if (executorMachine.acceleratorType) {
      setIfEmpty(
        'spark.dataproc.executor.resource.accelerator.type',
        executorMachine.acceleratorType
      );
    }
  }

  if (payload.executorConfig?.executorType === 'accelerated') {
    setIfEmpty('spark.dataproc.executor.compute.tier', 'premium');
    setIfEmpty(
      'spark.dataproc.executor.resource.accelerator.type',
      DATAPROC_DEFAULT_ACCELERATOR
    );
  }

  // Executor disk properties
  const executorDisk = parseDiskSpec(
    executorAndDriverConfig?.executorDisk,
    DEFAULT_DISK_SIZE
  );
  if (executorDisk.tier) {
    setIfEmpty('spark.dataproc.executor.disk.tier', executorDisk.tier);
  }
  if (executorDisk.size) {
    setIfEmpty('spark.dataproc.executor.disk.size', executorDisk.size);
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

  const pythonPackageRepository =
    payload.runtimeEnvironmentConfig?.pythonPackageRepository;
  const pythonRepo =
    pythonPackageRepository &&
    pythonPackageRepository !== 'Google managed PyPI pull-through cache' &&
    pythonPackageRepository !== 'Google Managed PyPI pull through cache'
      ? pythonPackageRepository
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

  // Execution Config (Network & Security, staging bucket, session lifecycle)
  const stagingBucket = normalizeStagingBucket(
    payload.runtimeEnvironmentConfig?.stagingBucket
  );
  const executionConfig: ExecutionConfigPayload = {
    ...buildNetworkExecutionConfig(
      payload.networkAndSecurityConfig,
      projectId,
      targetRegion
    ),
    ...(stagingBucket && { stagingBucket }),
    ...buildSessionLifecycleTtls(payload.sessionLifecycleConfig)
  };

  const hasExecutionConfig = Object.keys(executionConfig).length > 0;

  const templatePayload: ISessionTemplateApiPayload = {
    name: `projects/${projectId}/locations/${targetRegion}/sessionTemplates/${templateId}`,
    description: payload.description,
    jupyterSession: {
      kernel: 'PYTHON',
      displayName: payload.displayName
    },
    labels: payload.labels || {},
    runtimeConfig,
    ...((hasExecutionConfig || metastoreService) && {
      environmentConfig: {
        ...(hasExecutionConfig && { executionConfig }),
        ...(metastoreService && {
          peripheralsConfig: { metastoreService }
        })
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

/**
 * A group of Spark properties that one form control derives (see
 * mapRuntimeProfileToSessionTemplate). When an edit changes the control, the
 * whole group is rewritten, so values that belong together (e.g. an executor
 * shape and the compute tier it needs) stay consistent.
 */
interface IPropertyGroup {
  keys: string[];
  owns: (key: string) => boolean;
  /** Set only by its control; a value typed in Spark properties is ignored. */
  isControlOnly?: boolean;
}

const propertyGroup = (
  keys: string[],
  isControlOnly = false
): IPropertyGroup => {
  const keySet = new Set(keys);
  return { keys, owns: key => keySet.has(key), isControlOnly };
};

const CONTROL_PROPERTY_GROUPS: IPropertyGroup[] = [
  propertyGroup([DATAPROC_TIER_PROPERTY], true),
  propertyGroup([DATAPROC_LIGHTNING_ENGINE_PROPERTY], true),
  propertyGroup(['spark.dynamicAllocation.enabled']),
  propertyGroup(['spark.dynamicAllocation.initialExecutors']),
  propertyGroup(['spark.dynamicAllocation.minExecutors']),
  propertyGroup(['spark.dynamicAllocation.maxExecutors']),
  propertyGroup(['spark.driver.cores', 'spark.driver.memory']),
  propertyGroup([
    'spark.dataproc.driver.disk.tier',
    'spark.dataproc.driver.disk.size',
    'spark.dataproc.driver.compute.tier'
  ]),
  propertyGroup([
    'spark.executor.cores',
    'spark.executor.memory',
    'spark.dataproc.executor.compute.tier',
    'spark.dataproc.executor.resource.accelerator.type'
  ]),
  propertyGroup([
    'spark.dataproc.executor.disk.tier',
    'spark.dataproc.executor.disk.size'
  ])
];

/** Spark properties that mapRuntimeProfileToSessionTemplate derives from form controls. */
export const FORM_DERIVED_PROPERTY_KEYS: ReadonlySet<string> = new Set(
  CONTROL_PROPERTY_GROUPS.reduce<string[]>(
    (keys, group) => keys.concat(group.keys),
    []
  )
);

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

/** Subnetwork resource name or URL, e.g. 'projects/p/regions/r/subnetworks/s'. */
const SUBNETWORK_RESOURCE_PATTERN =
  /(?:^|\/)projects\/([^/]+)\/regions\/[^/]+\/subnetworks\/([^/]+)$/;

type TemplateExecutionConfig = NonNullable<
  IRuntimeProfileTemplate['environmentConfig']
>['executionConfig'];

/** Network and security settings of a session template's execution config. */
const mapNetworkAndSecurityConfig = (
  executionConfig: TemplateExecutionConfig,
  projectId: string,
  runtimeVersion?: string
): INetworkAndSecurityConfig => {
  const subnetworkUri = executionConfig?.subnetworkUri?.trim() || undefined;
  const networkUri = executionConfig?.networkUri?.trim() || undefined;
  // A subnetwork in another project is shared from a Shared VPC host project.
  const subnetworkResource = subnetworkUri
    ? SUBNETWORK_RESOURCE_PATTERN.exec(subnetworkUri)
    : null;
  const hostProjectId =
    subnetworkResource && subnetworkResource[1] !== projectId
      ? subnetworkResource[1]
      : undefined;

  const authenticationType =
    executionConfig?.authenticationConfig?.userWorkloadAuthenticationType;
  // Without an authentication type, runtimes 3.0 and newer use end-user
  // credentials and older runtimes use the service account.
  const usesUserAccount =
    authenticationType &&
    authenticationType !== 'AUTHENTICATION_TYPE_UNSPECIFIED'
      ? authenticationType === 'END_USER_CREDENTIALS'
      : parseFloat(runtimeVersion ?? '') >= 3;
  const kmsKey = executionConfig?.kmsKey?.trim() || undefined;

  return {
    networkSource: hostProjectId ? 'shared_from_host' : 'project',
    ...(hostProjectId && subnetworkResource
      ? { hostProjectId, sharedSubnetwork: subnetworkResource[2] }
      : {
          networkInThisProject: subnetworkUri || networkUri,
          primaryNetwork: networkUri,
          subnetwork: subnetworkUri
        }),
    networkTags: executionConfig?.networkTags,
    executionIdentity: usesUserAccount ? 'user_account' : 'service_account',
    serviceAccount: executionConfig?.serviceAccount,
    encryption: kmsKey ? 'customer_managed_key' : 'google_managed',
    ...(kmsKey && { kmsKeySelectionMode: 'manual', kmsKeyName: kmsKey })
  };
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
  const projectId = template.name.split('/')[1] ?? '';
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
    initialNetworkAndSecurityConfig: mapNetworkAndSecurityConfig(
      executionConfig,
      projectId,
      template.runtimeConfig?.version
    ),
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

/**
 * Body of a sessionTemplates.patch request built by mapRuntimeProfileToSessionTemplateUpdate.
 *
 * `session_config` is a oneof in the API, so the body carries exactly one of
 * `jupyterSession` or `sparkConnectSession`: whichever the saved template has.
 */
export interface ISessionTemplateUpdatePayload
  extends Omit<ISessionTemplateApiPayload, 'jupyterSession'> {
  jupyterSession?: ISessionTemplateApiPayload['jupyterSession'];
  sparkConnectSession?: IRuntimeProfileTemplate['sparkConnectSession'];
  environmentConfig?: IRuntimeProfileTemplate['environmentConfig'];
}

/** Fields the API sets on a session template; they aren't sent back. */
const OUTPUT_ONLY_TEMPLATE_FIELDS = [
  'createTime',
  'updateTime',
  'creator',
  'uuid'
];

/**
 * One Network and security setting for the update: the form fields it reads,
 * the executionConfig value they map to (`build` throws when it's invalid)
 * and how that value is written.
 */
interface INetworkSetting {
  fields: (keyof INetworkAndSecurityConfig)[];
  build: (networkConfig: INetworkAndSecurityConfig | undefined) => unknown;
  write: (value: unknown) => void;
}

/** JSON of a value with sorted object keys, for comparisons. */
const toComparableJson = (value: unknown): string =>
  JSON.stringify(value ?? null, (_key, nested) =>
    nested && typeof nested === 'object' && !Array.isArray(nested)
      ? Object.keys(nested)
          .sort()
          .reduce<Record<string, unknown>>((sorted, key) => {
            sorted[key] = nested[key];
            return sorted;
          }, {})
      : nested
  );

const isSameValue = (first: unknown, second: unknown): boolean =>
  toComparableJson(first) === toComparableJson(second);

/** Sets `key` on `target`, or removes it when `value` is undefined. */
const setOrDelete = (
  target: Record<string, any>,
  key: string,
  value: unknown
): void => {
  if (value === undefined) {
    delete target[key];
  } else {
    target[key] = value;
  }
};

/** Sets a nested object on `target`, or removes it when it is empty. */
const setUnlessEmpty = (
  target: Record<string, any>,
  key: string,
  value: Record<string, any>
): void =>
  setOrDelete(target, key, Object.keys(value).length > 0 ? value : undefined);

/** Applies the keys whose values differ between `before` and `after` to `target`. */
const applyChangedKeys = (
  target: Record<string, string>,
  before: Record<string, string>,
  after: Record<string, string>
): void => {
  Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).forEach(
    key => {
      if (before[key] !== after[key]) {
        setOrDelete(target, key, after[key]);
      }
    }
  );
};

/** The properties a group owns, by unprefixed key (an unprefixed key wins). */
const pickGroupProperties = (
  properties: Record<string, string>,
  group: IPropertyGroup
): Record<string, string> => {
  const picked: Record<string, string> = {};
  Object.entries(properties).forEach(([key, value]) => {
    const normalizedKey = normalizePropertyKey(key);
    if (
      group.owns(normalizedKey) &&
      (key === normalizedKey || picked[normalizedKey] === undefined)
    ) {
      picked[normalizedKey] = value;
    }
  });
  return picked;
};

/** The value `build` returns, or the error it throws. */
const tryBuild = <T>(
  build: () => T
): { ok: true; value: T } | { ok: false; error: unknown } => {
  try {
    return { ok: true, value: build() };
  } catch (error) {
    return { ok: false, error };
  }
};

/**
 * Builds the body of a sessionTemplates.patch request for an edited runtime
 * profile. PATCH replaces the whole template, so the body starts from
 * `latestTemplate` (the saved profile, ideally reloaded just before saving)
 * and applies only what the user changed in the form: the difference between
 * `initialPayload` (the form values when it opened) and `payload` (the form
 * values on Save).
 *
 * - Settings the user didn't change keep their saved values, including values
 *   the form can't show (e.g. a custom executor shape or a network without a
 *   subnetwork) and changes saved elsewhere since the form opened.
 * - A changed control rewrites every property it derives (e.g. an executor
 *   shape together with its compute tier), replacing values it couldn't show.
 * - Network and security settings (network, network tags, encryption key,
 *   execution identity and service account) are compared one by one, so
 *   changing one doesn't rewrite or re-validate the others.
 * - Spark properties and labels are applied key by key.
 * - The resource name (ID and region), the session kind (`jupyterSession`
 *   with its kernel, or `sparkConnectSession`) and fields the form doesn't
 *   manage are kept; output-only fields are dropped.
 */
export function mapRuntimeProfileToSessionTemplateUpdate(
  payload: ICreateRuntimeProfilePayload,
  initialPayload: ICreateRuntimeProfilePayload,
  latestTemplate: IRuntimeProfileTemplate
): ISessionTemplateUpdatePayload {
  const { region } = parseRuntimeProfileResourceName(latestTemplate.name);
  const projectId = latestTemplate.name.split('/')[1] ?? '';

  // What the form controls write. Spark properties and network settings are
  // compared separately (network settings can be invalid).
  const mapControls = (formPayload: ICreateRuntimeProfilePayload) =>
    mapRuntimeProfileToSessionTemplate(
      {
        ...formPayload,
        sparkProperties: {},
        networkAndSecurityConfig: undefined
      },
      projectId,
      region
    );
  const initialControls = mapControls(initialPayload);
  const editedControls = mapControls(payload);

  const result: Record<string, any> = JSON.parse(
    JSON.stringify(latestTemplate)
  );
  OUTPUT_ONLY_TEMPLATE_FIELDS.forEach(field => delete result[field]);

  // Basic info
  if (initialControls.description !== editedControls.description) {
    setOrDelete(result, 'description', editedControls.description);
  }
  // session_config is a oneof: `result` already carries the saved template's
  // kind, and a Spark Connect template has no display name or kernel, so
  // jupyterSession is only ever written for a Jupyter template.
  const displayName = editedControls.jupyterSession.displayName;
  if (
    !result.sparkConnectSession &&
    initialControls.jupyterSession.displayName !== displayName
  ) {
    result.jupyterSession = { ...result.jupyterSession, displayName };
  }

  // Labels
  const labels: Record<string, string> = { ...result.labels };
  applyChangedKeys(
    labels,
    initialControls.labels ?? {},
    editedControls.labels ?? {}
  );
  setOrDelete(
    result,
    'labels',
    Object.keys(labels).length > 0 || result.labels ? labels : undefined
  );

  // Runtime environment
  const runtimeConfig: Record<string, any> = { ...result.runtimeConfig };
  (['version', 'containerImage', 'repositoryConfig'] as const).forEach(
    field => {
      const editedValue = editedControls.runtimeConfig?.[field];
      if (!isSameValue(initialControls.runtimeConfig?.[field], editedValue)) {
        setOrDelete(runtimeConfig, field, editedValue);
      }
    }
  );

  // Spark properties: find the controls whose derived properties changed.
  const groups = CONTROL_PROPERTY_GROUPS;
  const findGroup = (key: string): IPropertyGroup | undefined => {
    const normalizedKey = normalizePropertyKey(key);
    return groups.find(group => group.owns(normalizedKey));
  };
  const initialControlProperties =
    initialControls.runtimeConfig?.properties ?? {};
  const editedControlProperties =
    editedControls.runtimeConfig?.properties ?? {};
  const changedGroups = new Set(
    groups.filter(
      group =>
        !isSameValue(
          pickGroupProperties(initialControlProperties, group),
          pickGroupProperties(editedControlProperties, group)
        )
    )
  );
  // A changed control replaces the values of its properties that were kept as
  // Spark properties because it couldn't show them, unless the user edited them.
  const initialSparkProperties = initialPayload.sparkProperties ?? {};
  const editedSparkProperties = payload.sparkProperties ?? {};
  const sparkPropertiesForControls = { ...editedSparkProperties };
  Object.keys(sparkPropertiesForControls).forEach(key => {
    const group = findGroup(key);
    if (
      group &&
      changedGroups.has(group) &&
      initialSparkProperties[key] === sparkPropertiesForControls[key]
    ) {
      delete sparkPropertiesForControls[key];
    }
  });
  const derivedProperties =
    mapRuntimeProfileToSessionTemplate(
      {
        ...payload,
        sparkProperties: sparkPropertiesForControls,
        networkAndSecurityConfig: undefined
      },
      projectId,
      region
    ).runtimeConfig?.properties ?? {};

  const properties: Record<string, string> = { ...runtimeConfig.properties };
  const removeProperty = (normalizedKey: string): void =>
    Object.keys(properties).forEach(key => {
      if (normalizePropertyKey(key) === normalizedKey) {
        delete properties[key];
      }
    });

  // 1. Spark properties the user edited directly.
  Array.from(
    new Set([
      ...Object.keys(initialSparkProperties),
      ...Object.keys(editedSparkProperties)
    ])
  ).forEach(key => {
    const editedValue = editedSparkProperties[key];
    if (initialSparkProperties[key] === editedValue) {
      return;
    }
    const group = findGroup(key);
    if (group && (group.isControlOnly || changedGroups.has(group))) {
      // Written with its control below.
      return;
    }
    if (group) {
      // A derived key replaces all of its prefixed variants.
      removeProperty(normalizePropertyKey(key));
    } else {
      delete properties[key];
    }
    if (editedValue !== undefined) {
      properties[key] = editedValue;
    }
  });

  // 2. All properties of the controls the user changed.
  changedGroups.forEach(group => {
    Object.keys(properties).forEach(key => {
      if (group.owns(normalizePropertyKey(key))) {
        delete properties[key];
      }
    });
    Object.entries(derivedProperties).forEach(([key, value]) => {
      if (group.owns(normalizePropertyKey(key))) {
        properties[key] = value;
      }
    });
  });
  setUnlessEmpty(runtimeConfig, 'properties', properties);
  setUnlessEmpty(result, 'runtimeConfig', runtimeConfig);

  // Environment: network and security, staging bucket and session lifecycle.
  // Fields the form doesn't manage (e.g. the Dataproc Metastore service) are
  // kept.
  const environmentConfig: Record<string, any> = {
    ...result.environmentConfig
  };
  const executionConfig: Record<string, any> = {
    ...environmentConfig.executionConfig
  };

  // Network and security, setting by setting: only a setting the user changed
  // is written, so the others keep their saved values (even ones the form
  // can't express, e.g. a network without a subnetwork) and aren't validated.
  const initialNetworkConfig = initialPayload.networkAndSecurityConfig;
  const editedNetworkConfig = payload.networkAndSecurityConfig;
  const networkSettings: INetworkSetting[] = [
    {
      // network_uri and subnetwork_uri are a oneof; the form sets a subnetwork.
      fields: [
        'networkSource',
        'primaryNetwork',
        'networkInThisProject',
        'subnetwork',
        'sharedSubnetwork',
        'hostProjectId'
      ],
      build: networkConfig => buildSubnetworkUri(networkConfig, region),
      write: subnetworkUri => {
        delete executionConfig.networkUri;
        setOrDelete(executionConfig, 'subnetworkUri', subnetworkUri);
      }
    },
    {
      fields: ['networkTags'],
      build: buildNetworkTags,
      write: networkTags =>
        setOrDelete(executionConfig, 'networkTags', networkTags)
    },
    {
      fields: [
        'encryption',
        'keyRing',
        'cryptoKey',
        'kmsKeySelectionMode',
        'kmsKeyName'
      ],
      build: networkConfig => buildKmsKey(networkConfig, projectId, region),
      write: kmsKey => setOrDelete(executionConfig, 'kmsKey', kmsKey)
    },
    {
      fields: ['executionIdentity'],
      build: networkConfig => networkConfig?.executionIdentity,
      write: executionIdentity => {
        delete executionConfig.authentication_config;
        // Explicit, because the default depends on the runtime version.
        setOrDelete(
          executionConfig,
          'authenticationConfig',
          executionIdentity
            ? {
                userWorkloadAuthenticationType:
                  executionIdentity === 'user_account'
                    ? 'END_USER_CREDENTIALS'
                    : 'SERVICE_ACCOUNT'
              }
            : undefined
        );
      }
    },
    {
      fields: ['executionIdentity', 'serviceAccount'],
      build: buildServiceAccount,
      write: serviceAccount =>
        setOrDelete(executionConfig, 'serviceAccount', serviceAccount)
    }
  ];
  networkSettings.forEach(({ fields, build, write }) => {
    const initial = tryBuild(() => build(initialNetworkConfig));
    const edited = tryBuild(() => build(editedNetworkConfig));
    // Compare what the setting writes. When that can't be built (e.g. a saved
    // network without a subnetwork), compare its form fields instead, so it
    // only counts as changed when the user changed them.
    const isChanged =
      initial.ok && edited.ok
        ? !isSameValue(initial.value, edited.value)
        : fields.some(
            field =>
              !isSameValue(
                initialNetworkConfig?.[field],
                editedNetworkConfig?.[field]
              )
          );
    if (!isChanged) {
      return;
    }
    if (!edited.ok) {
      throw edited.error;
    }
    write(edited.value);
  });

  const initialExecution = initialControls.environmentConfig?.executionConfig;
  const editedExecution = editedControls.environmentConfig?.executionConfig;
  (['stagingBucket', 'idleTtl', 'ttl'] as const).forEach(field => {
    if (initialExecution?.[field] !== editedExecution?.[field]) {
      setOrDelete(executionConfig, field, editedExecution?.[field]);
    }
  });

  setUnlessEmpty(environmentConfig, 'executionConfig', executionConfig);
  setUnlessEmpty(result, 'environmentConfig', environmentConfig);

  return result as ISessionTemplateUpdatePayload;
}
