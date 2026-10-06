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
  DATAPROC_LIGHTNING_ENGINE_PROPERTY,
  DATAPROC_STANDARD_MACHINE_TYPES,
  DATAPROC_TIER_PROPERTY
} from '../utils/const';
import {
  ICreateRuntimeProfilePayload,
  IMachineTypeOption
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
  const cleanName = machineTypeName.trim().toLowerCase().split(' ')[0];
  const known = KNOWN_MACHINE_TYPES.find(m => m.name === cleanName);
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
 * Parses disk specification string into disk tier ('standard' | 'premium') and size (e.g. '400g').
 * Dataproc Serverless requires a minimum disk size of 250 GB.
 */
export const parseDiskSpec = (
  diskStr?: string,
  defaultSize = '400g'
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
    // Dataproc Serverless enforces a minimum disk size of 250 GB
    const clampedNum = parsedNum < 250 ? 250 : parsedNum;
    size = `${clampedNum}g`;
  }
  return { tier, size };
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
    const sanitized = preferredId
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    if (sanitized) {
      return sanitized;
    }
  }

  if (displayName && displayName.trim() !== '') {
    const sanitized = displayName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
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

  const driverDisk = parseDiskSpec(executorAndDriverConfig?.driverDisk, '400g');
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
      properties['spark.dataproc.executor.resource.accelerator.type'] = 'l4';
    }
  }

  // Executor disk properties
  const executorDisk = parseDiskSpec(
    executorAndDriverConfig?.executorDisk,
    '400g'
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
