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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LabIcon } from '@jupyterlab/ui-components';
import { Notification } from '@jupyterlab/apputils';
import LeftArrowIcon from '../../style/icons/left_arrow_icon.svg';
import EditIcon from '../../style/icons/edit_icon.svg';
import DeleteClusterIcon from '../../style/icons/delete_cluster_icon.svg';
import CloneIcon from '../../style/icons/clone_icon.svg';
import ExpandLessIcon from '../../style/icons/expand_less.svg';
import ExpandMoreIcon from '../../style/icons/expand_more.svg';
import {
  formatLastUsed,
  getDefaultTierForVersion,
  IRuntimeProfileTemplate,
  parseRuntimeProfileResourceName
} from './runtimeProfileListMapper';
import {
  AutoscalingEditDrawer,
  ExecutorAndDriverEditDrawer,
  NetworkSecurityEditDrawer,
  OtherCustomizationEditDrawer,
  RuntimeEnvironmentEditDrawer,
  SessionLifecycleEditDrawer
} from './runtimeProfileEditDrawers';
import {
  DATAPROC_METASTORE,
  MetastoreEditDrawer
} from './metastoreEditDrawer';
import {
  CatalogSelectionMode,
  DISK_TIER_HDD,
  DISK_TIER_SSD,
  ExecutionIdentityType,
  IAutoscalingConfig,
  IExecutorAndDriverConfig,
  IMetastoreConfig,
  INetworkAndSecurityConfig,
  IRuntimeEnvironmentConfig,
  ISessionLifecycleConfig,
  NetworkSourceType,
  ProfileLabels,
  SparkProperties,
  TimeUnit
} from './runtimeProfileInterface';
import {
  DEFAULT_DISK_SIZE,
  extractRuntimeVersion,
  getDefaultLakehouseCatalogName,
  getLakehouseCatalogResource,
  isAcceleratedMachine,
  LAKEHOUSE_CATALOG_PROPERTY_PREFIX,
  LAKEHOUSE_DEFAULT_CATALOG_PROPERTY,
  LAKEHOUSE_PROJECT_PROPERTY,
  LAKEHOUSE_RUNTIME_CATALOG,
  METASTORE_NONE,
  parseDiskSpec,
  parseDiskTierAndSize,
  parseMachineTypeSpec
} from './runtimeProfileMapper';
import { RuntimeProfileService } from './runtimeProfileService';
import { LOG_LEVEL, safeLog } from '../utils/loggingService';
import {
  DATAPROC_ACCELERATED_MACHINE_TYPES,
  DATAPROC_LIGHTNING_ENGINE_PROPERTY,
  DATAPROC_STANDARD_MACHINE_TYPES,
  DATAPROC_TIER_PROPERTY,
  DEFAULT_ACCELERATED_EXECUTOR_TYPE,
  DEFAULT_GENERAL_EXECUTOR_TYPE,
  DEFAULT_STANDARD_TIER_EXECUTOR_TYPE
} from '../utils/const';

const makeIcon = (name: string, svgstr: string) =>
  new LabIcon({ name: `runtime-profile-details:${name}`, svgstr });
const iconLeftArrow = makeIcon('left-arrow-icon', LeftArrowIcon);
const iconEdit = makeIcon('edit-icon', EditIcon);
const iconDelete = makeIcon('delete-icon', DeleteClusterIcon);
const iconCopy = makeIcon('copy-icon', CloneIcon);
const iconExpandLess = makeIcon('expand-less-icon', ExpandLessIcon);
const iconExpandMore = makeIcon('expand-more-icon', ExpandMoreIcon);

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec'.split(',');

export const formatCreateTime = (dateString?: string): string => {
  const date = dateString ? new Date(dateString) : null;
  if (!date || isNaN(date.getTime())) {
    return '';
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  const datePart = `${DAY_NAMES[date.getUTCDay()]} ${
    MONTHS[date.getUTCMonth()]
  } ${pad(date.getUTCDate())} ${date.getUTCFullYear()}`;
  const timePart = `${pad(date.getUTCHours())}:${pad(
    date.getUTCMinutes()
  )}:${pad(date.getUTCSeconds())}`;
  return `${datePart} ${timePart} GMT+0000 (Coordinated Universal Time)`;
};

export const stripPropertyPrefix = (key: string): string =>
  key.replace(/^(?:spark|dataproc):/, '');

const getPropertyValue = (props: Record<string, string>, key: string): string =>
  props[key] ?? props[`spark:${key}`] ?? props[`dataproc:${key}`] ?? '';

export const formatDiskConfig = (tier?: string, size?: string): string => {
  const trimmedTier = tier?.trim() || '';
  const trimmedSize = size?.trim() || '';
  if (!trimmedTier && !trimmedSize) {
    return '';
  }
  const formattedTier = trimmedTier
    ? `${trimmedTier.charAt(0).toUpperCase()}${trimmedTier
        .slice(1)
        .toLowerCase()} persistent disk`
    : '';
  const formattedSize = trimmedSize
    ? trimmedSize.replace(
        /^(\d+)\s*([gGmMtT])(?:[iI]?[bB])?$/,
        (_, num, unit) => `${num}${unit.toUpperCase()}B`
      )
    : '';
  return formattedTier && formattedSize
    ? `${formattedTier}, ${formattedSize}`
    : formattedTier || formattedSize;
};

export const formatDurationTtl = (ttl?: string): string => {
  const trimmed = ttl?.trim() || '';
  const match = /^(\d+)\s*s$/i.exec(trimmed);
  if (!match) {
    return trimmed;
  }
  const secs = Number(match[1]);
  if (secs <= 0) {
    return '0 sec';
  }
  const units: Array<[number, string, string]> = [
    [86400, 'day', 'days'],
    [3600, 'hr', 'hrs'],
    [60, 'min', 'mins'],
    [1, 'sec', 'secs']
  ];
  for (const [divisor, singular, plural] of units) {
    if (secs % divisor === 0) {
      const count = secs / divisor;
      return `${count} ${count === 1 ? singular : plural}`;
    }
  }
  return `${secs} secs`;
};

const HANDLED_SPARK_PROPERTY_KEYS = new Set<string>([
  DATAPROC_LIGHTNING_ENGINE_PROPERTY,
  'spark.driver.cores',
  'spark.driver.memory',
  'spark.dataproc.driver.disk.tier',
  'spark.dataproc.driver.disk.size',
  'spark.dataproc.driver.compute.tier',
  'spark.dataproc.driver.resource.accelerator.type',
  'spark.executor.cores',
  'spark.executor.memory',
  'spark.dataproc.executor.disk.tier',
  'spark.dataproc.executor.disk.size',
  'spark.dataproc.executor.compute.tier',
  'spark.dataproc.executor.resource.accelerator.type',
  'spark.dynamicAllocation.enabled',
  'spark.dynamicAllocation.initialExecutors',
  'spark.dynamicAllocation.minExecutors',
  'spark.dynamicAllocation.maxExecutors',
  LAKEHOUSE_DEFAULT_CATALOG_PROPERTY,
  LAKEHOUSE_PROJECT_PROPERTY
]);

const EXECUTOR_AND_DRIVER_PROPERTY_KEYS = [
  DATAPROC_TIER_PROPERTY,
  DATAPROC_LIGHTNING_ENGINE_PROPERTY,
  'spark.driver.cores',
  'spark.driver.memory',
  'spark.dataproc.driver.disk.tier',
  'spark.dataproc.driver.disk.size',
  'spark.dataproc.driver.compute.tier',
  'spark.dataproc.driver.resource.accelerator.type',
  'spark.executor.cores',
  'spark.executor.memory',
  'spark.dataproc.executor.disk.tier',
  'spark.dataproc.executor.disk.size',
  'spark.dataproc.executor.compute.tier',
  'spark.dataproc.executor.resource.accelerator.type'
];

export const buildRuntimeEnvironmentConfigFromTemplate = (
  profile: IRuntimeProfileTemplate,
  shortName: string
): IRuntimeEnvironmentConfig => {
  const properties = profile.runtimeConfig?.properties || {};
  return {
    runtimeProfileId: shortName,
    runtimeVersion: profile.runtimeConfig?.version || '',
    customSparkImage: profile.runtimeConfig?.containerImage || '',
    stagingBucket:
      profile.environmentConfig?.executionConfig?.stagingBucket || '',
    pythonPackageRepository:
      profile.runtimeConfig?.repositoryConfig?.pypiRepositoryConfig
        ?.pypiRepository || '',
    lightningEngineEnabled:
      getPropertyValue(properties, DATAPROC_LIGHTNING_ENGINE_PROPERTY).trim() ===
      'lightningEngine'
  };
};

export const applyRuntimeEnvironmentUpdateToTemplate = (
  profile: IRuntimeProfileTemplate,
  updated: IRuntimeEnvironmentConfig
): IRuntimeProfileTemplate => {
  const version = extractRuntimeVersion(updated.runtimeVersion);
  const trimmedImage = updated.customSparkImage?.trim() || '';
  const containerImage =
    trimmedImage && trimmedImage.toLowerCase() !== 'none'
      ? trimmedImage
      : undefined;

  const trimmedRepo = updated.pythonPackageRepository?.trim() || '';
  const isDefaultPyPi =
    !trimmedRepo ||
    trimmedRepo.toLowerCase() === 'google managed pypi pull through cache' ||
    trimmedRepo.toLowerCase() === 'google managed pypi pull-through cache';

  const trimmedBucket = (updated.stagingBucket ?? '')
    .trim()
    .replace(/^gs:\/\//, '');
  const stagingBucket =
    trimmedBucket && trimmedBucket.toLowerCase() !== 'auto'
      ? trimmedBucket
      : undefined;

  const nextRuntimeConfig = { ...(profile.runtimeConfig || {}) };
  if (version) {
    nextRuntimeConfig.version = version;
  } else {
    delete nextRuntimeConfig.version;
  }
  if (containerImage) {
    nextRuntimeConfig.containerImage = containerImage;
  } else {
    delete nextRuntimeConfig.containerImage;
  }
  if (!isDefaultPyPi) {
    nextRuntimeConfig.repositoryConfig = {
      ...(profile.runtimeConfig?.repositoryConfig || {}),
      pypiRepositoryConfig: {
        pypiRepository: trimmedRepo
      }
    };
  } else {
    delete nextRuntimeConfig.repositoryConfig;
  }

  const nextExecutionConfig = {
    ...(profile.environmentConfig?.executionConfig || {})
  };
  if (stagingBucket) {
    nextExecutionConfig.stagingBucket = stagingBucket;
  } else {
    delete nextExecutionConfig.stagingBucket;
  }

  return {
    ...profile,
    runtimeConfig: nextRuntimeConfig,
    environmentConfig: {
      ...(profile.environmentConfig || {}),
      executionConfig: nextExecutionConfig
    }
  };
};

const resolveMachineTypeFromProperties = (
  cores: string,
  memory: string,
  acceleratorType: string,
  tier: string
): string => {
  if (acceleratorType) {
    const matchedAcc = DATAPROC_ACCELERATED_MACHINE_TYPES.find(
      m =>
        m.acceleratorType?.toLowerCase() === acceleratorType &&
        (!cores || String(m.vCPUs) === cores)
    );
    return matchedAcc?.name || DEFAULT_ACCELERATED_EXECUTOR_TYPE;
  }
  if (cores && memory) {
    const exact = DATAPROC_STANDARD_MACHINE_TYPES.find(
      m => String(m.vCPUs) === cores && m.memory.toLowerCase() === memory
    );
    if (exact) {
      return exact.name;
    }
  }
  if (cores) {
    const byCoresAndTier = DATAPROC_STANDARD_MACHINE_TYPES.find(
      m =>
        String(m.vCPUs) === cores &&
        (tier === 'Standard'
          ? !m.name.includes('highmem')
          : m.name.includes('highmem'))
    );
    if (byCoresAndTier) {
      return byCoresAndTier.name;
    }
    const byCores = DATAPROC_STANDARD_MACHINE_TYPES.find(
      m => String(m.vCPUs) === cores
    );
    if (byCores) {
      return byCores.name;
    }
  }
  return tier === 'Standard'
    ? DEFAULT_STANDARD_TIER_EXECUTOR_TYPE
    : DEFAULT_GENERAL_EXECUTOR_TYPE;
};

export const buildExecutorAndDriverConfigFromTemplate = (
  profile: IRuntimeProfileTemplate
): IExecutorAndDriverConfig => {
  const properties = profile.runtimeConfig?.properties || {};
  const rawTier = getPropertyValue(properties, DATAPROC_TIER_PROPERTY)
    .trim()
    .toLowerCase();
  const tier =
    rawTier === 'standard'
      ? 'Standard'
      : rawTier === 'premium'
        ? 'Premium'
        : getDefaultTierForVersion(profile.runtimeConfig?.version);
  const lightningEngineEnabled =
    getPropertyValue(properties, DATAPROC_LIGHTNING_ENGINE_PROPERTY).trim() ===
    'lightningEngine';

  const execCores = getPropertyValue(properties, 'spark.executor.cores').trim();
  const execMemory = getPropertyValue(properties, 'spark.executor.memory')
    .trim()
    .toLowerCase();
  const execAccelerator = getPropertyValue(
    properties,
    'spark.dataproc.executor.resource.accelerator.type'
  )
    .trim()
    .toLowerCase();
  const executorMachineType = resolveMachineTypeFromProperties(
    execCores,
    execMemory,
    execAccelerator,
    tier
  );

  const drvCores = getPropertyValue(properties, 'spark.driver.cores').trim();
  const drvMemory = getPropertyValue(properties, 'spark.driver.memory')
    .trim()
    .toLowerCase();
  const drvAccelerator = getPropertyValue(
    properties,
    'spark.dataproc.driver.resource.accelerator.type'
  )
    .trim()
    .toLowerCase();
  const driverMachineType =
    drvCores || drvMemory || drvAccelerator
      ? resolveMachineTypeFromProperties(
          drvCores,
          drvMemory,
          drvAccelerator,
          tier
        )
      : executorMachineType;

  const execDiskStr = [
    getPropertyValue(properties, 'spark.dataproc.executor.disk.tier').trim(),
    getPropertyValue(properties, 'spark.dataproc.executor.disk.size').trim()
  ]
    .filter(Boolean)
    .join(' ');
  const parsedExecDisk = parseDiskTierAndSize(
    execDiskStr,
    isAcceleratedMachine(executorMachineType) ? DISK_TIER_SSD : DISK_TIER_HDD
  );

  const drvDiskStr = [
    getPropertyValue(properties, 'spark.dataproc.driver.disk.tier').trim(),
    getPropertyValue(properties, 'spark.dataproc.driver.disk.size').trim()
  ]
    .filter(Boolean)
    .join(' ');
  const parsedDrvDisk = drvDiskStr
    ? parseDiskTierAndSize(
        drvDiskStr,
        isAcceleratedMachine(driverMachineType) ? DISK_TIER_SSD : DISK_TIER_HDD
      )
    : parsedExecDisk;

  const useDifferentDriverConfig =
    driverMachineType !== executorMachineType ||
    parsedDrvDisk.tier !== parsedExecDisk.tier ||
    parsedDrvDisk.size !== parsedExecDisk.size;

  return {
    tier,
    lightningEngineEnabled,
    executorType: executorMachineType,
    executorMachineType,
    executorDiskTier: parsedExecDisk.tier,
    executorDiskSize: parsedExecDisk.size,
    executorDisk: `${parsedExecDisk.tier}, ${parsedExecDisk.size}`,
    useDifferentDriverConfig,
    driverMachineType,
    driverDiskTier: parsedDrvDisk.tier,
    driverDiskSize: parsedDrvDisk.size,
    driverDisk: `${parsedDrvDisk.tier}, ${parsedDrvDisk.size}`
  };
};

export const applyExecutorAndDriverUpdateToTemplate = (
  profile: IRuntimeProfileTemplate,
  updated: IExecutorAndDriverConfig
): IRuntimeProfileTemplate => {
  const existingProps = profile.runtimeConfig?.properties || {};
  const existingRawTier = getPropertyValue(
    existingProps,
    DATAPROC_TIER_PROPERTY
  )
    .trim()
    .toLowerCase();
  const nextProps: Record<string, string> = {
    ...existingProps
  };
  EXECUTOR_AND_DRIVER_PROPERTY_KEYS.forEach(key => {
    delete nextProps[key];
    delete nextProps[`spark:${key}`];
    delete nextProps[`dataproc:${key}`];
  });

  const defaultTier = getDefaultTierForVersion(profile.runtimeConfig?.version);
  const tier = updated.tier || defaultTier;
  if (existingRawTier || tier !== defaultTier) {
    nextProps[DATAPROC_TIER_PROPERTY] = tier.toLowerCase();
  }

  if (tier === 'Premium' && updated.lightningEngineEnabled) {
    nextProps[DATAPROC_LIGHTNING_ENGINE_PROPERTY] = 'lightningEngine';
  }

  const driverMachineName = updated.driverMachineType;
  const driverMachine = parseMachineTypeSpec(driverMachineName);
  if (driverMachine) {
    nextProps['spark.driver.cores'] = String(driverMachine.cores);
    if (!driverMachine.acceleratorType) {
      nextProps['spark.driver.memory'] = driverMachine.memory;
    }
    if (
      driverMachineName?.toLowerCase().includes('highmem') ||
      driverMachine.acceleratorType
    ) {
      nextProps['spark.dataproc.driver.compute.tier'] = 'premium';
    }
    if (driverMachine.acceleratorType) {
      nextProps['spark.dataproc.driver.resource.accelerator.type'] =
        driverMachine.acceleratorType;
    }
  }

  const driverDisk = parseDiskSpec(updated.driverDisk, DEFAULT_DISK_SIZE);
  if (driverDisk.tier) {
    nextProps['spark.dataproc.driver.disk.tier'] = driverDisk.tier;
    if (driverDisk.tier === 'premium') {
      nextProps['spark.dataproc.driver.compute.tier'] = 'premium';
    }
  }
  if (driverDisk.size) {
    nextProps['spark.dataproc.driver.disk.size'] = driverDisk.size;
  }

  const executorMachineName =
    updated.executorMachineType || updated.executorType;
  const executorMachine = parseMachineTypeSpec(executorMachineName);
  if (executorMachine) {
    nextProps['spark.executor.cores'] = String(executorMachine.cores);
    if (!executorMachine.acceleratorType) {
      nextProps['spark.executor.memory'] = executorMachine.memory;
    }
    if (
      executorMachineName?.toLowerCase().includes('highmem') ||
      executorMachine.acceleratorType
    ) {
      nextProps['spark.dataproc.executor.compute.tier'] = 'premium';
    }
    if (executorMachine.acceleratorType) {
      nextProps['spark.dataproc.executor.resource.accelerator.type'] =
        executorMachine.acceleratorType;
    }
  }

  const executorDisk = parseDiskSpec(updated.executorDisk, DEFAULT_DISK_SIZE);
  if (executorDisk.tier) {
    nextProps['spark.dataproc.executor.disk.tier'] = executorDisk.tier;
  }
  if (executorDisk.size) {
    nextProps['spark.dataproc.executor.disk.size'] = executorDisk.size;
  }

  return {
    ...profile,
    runtimeConfig: {
      ...(profile.runtimeConfig || {}),
      properties: nextProps
    }
  };
};

const AUTOSCALING_PROPERTY_KEYS = [
  'spark.dynamicAllocation.enabled',
  'spark.dynamicAllocation.initialExecutors',
  'spark.dynamicAllocation.minExecutors',
  'spark.dynamicAllocation.maxExecutors'
];

const parseAutoscalingCount = (raw: string, fallback: number): number => {
  const parsed = parseInt(raw.trim(), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const buildAutoscalingConfigFromTemplate = (
  profile: IRuntimeProfileTemplate
): IAutoscalingConfig => {
  const properties = profile.runtimeConfig?.properties || {};
  const rawEnabled = getPropertyValue(
    properties,
    'spark.dynamicAllocation.enabled'
  )
    .trim()
    .toLowerCase();
  const autoscalingEnabled = rawEnabled !== 'false';
  const minExecutors = parseAutoscalingCount(
    getPropertyValue(properties, 'spark.dynamicAllocation.minExecutors'),
    2
  );
  const initialExecutors = parseAutoscalingCount(
    getPropertyValue(properties, 'spark.dynamicAllocation.initialExecutors'),
    Math.max(2, minExecutors)
  );
  const maxExecutors = parseAutoscalingCount(
    getPropertyValue(properties, 'spark.dynamicAllocation.maxExecutors'),
    Math.max(1000, minExecutors, initialExecutors)
  );
  return {
    autoscalingEnabled,
    initialExecutors,
    minExecutors,
    maxExecutors
  };
};

export const applyAutoscalingUpdateToTemplate = (
  profile: IRuntimeProfileTemplate,
  updated: IAutoscalingConfig
): IRuntimeProfileTemplate => {
  const existingProps = profile.runtimeConfig?.properties || {};
  const initial = buildAutoscalingConfigFromTemplate(profile);
  const nextProps: Record<string, string> = {
    ...existingProps
  };
  AUTOSCALING_PROPERTY_KEYS.forEach(key => {
    delete nextProps[key];
    delete nextProps[`spark:${key}`];
    delete nextProps[`dataproc:${key}`];
  });

  const hasExistingKey = (key: string): boolean =>
    key in existingProps ||
    `spark:${key}` in existingProps ||
    `dataproc:${key}` in existingProps;

  const enabled = updated.autoscalingEnabled ?? true;
  if (
    hasExistingKey('spark.dynamicAllocation.enabled') ||
    enabled !== initial.autoscalingEnabled
  ) {
    nextProps['spark.dynamicAllocation.enabled'] = String(enabled);
  }
  if (enabled) {
    if (
      updated.initialExecutors !== undefined &&
      (hasExistingKey('spark.dynamicAllocation.initialExecutors') ||
        updated.initialExecutors !== initial.initialExecutors)
    ) {
      nextProps['spark.dynamicAllocation.initialExecutors'] = String(
        updated.initialExecutors
      );
    }
    if (
      updated.minExecutors !== undefined &&
      (hasExistingKey('spark.dynamicAllocation.minExecutors') ||
        updated.minExecutors !== initial.minExecutors)
    ) {
      nextProps['spark.dynamicAllocation.minExecutors'] = String(
        updated.minExecutors
      );
    }
    if (
      updated.maxExecutors !== undefined &&
      (hasExistingKey('spark.dynamicAllocation.maxExecutors') ||
        updated.maxExecutors !== initial.maxExecutors)
    ) {
      nextProps['spark.dynamicAllocation.maxExecutors'] = String(
        updated.maxExecutors
      );
    }
  }

  return {
    ...profile,
    runtimeConfig: {
      ...(profile.runtimeConfig || {}),
      properties: nextProps
    }
  };
};

const UNIT_SECONDS_MAP: Record<TimeUnit, number> = {
  seconds: 1,
  s: 1,
  minutes: 60,
  m: 60,
  hours: 3600,
  h: 3600,
  days: 86400,
  d: 86400
};

const parseTtlToQuantityAndUnit = (
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

const toTtlDurationString = (
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
    const multiplier = UNIT_SECONDS_MAP[unit] ?? 60;
    return `${quantity * multiplier}s`;
  }
  if (fallbackText && fallbackText.trim()) {
    const parsed = parseTtlToQuantityAndUnit(fallbackText, 0, 'seconds');
    if (parsed.quantity > 0) {
      return `${parsed.quantity * UNIT_SECONDS_MAP[parsed.unit]}s`;
    }
  }
  return undefined;
};

export const buildSessionLifecycleConfigFromTemplate = (
  profile: IRuntimeProfileTemplate
): ISessionLifecycleConfig => {
  const executionConfig = profile.environmentConfig?.executionConfig;
  const hasIdleTtl = Boolean(executionConfig?.idleTtl?.trim());
  const hasSessionTtl = Boolean(executionConfig?.ttl?.trim());
  const idle = hasIdleTtl
    ? parseTtlToQuantityAndUnit(executionConfig?.idleTtl, 60, 'minutes')
    : undefined;
  const session = hasSessionTtl
    ? parseTtlToQuantityAndUnit(executionConfig?.ttl, 3, 'days')
    : undefined;
  return {
    ...(idle && {
      maxIdleTimeQuantity: idle.quantity,
      maxIdleTimeUnit: idle.unit
    }),
    maxIdleTime: idle ? `${idle.quantity} ${idle.unit}` : 'None',
    ...(session && {
      maxSessionTimeQuantity: session.quantity,
      maxSessionTimeUnit: session.unit
    }),
    maxSessionTime: session ? `${session.quantity} ${session.unit}` : 'None'
  };
};

export const applySessionLifecycleUpdateToTemplate = (
  profile: IRuntimeProfileTemplate,
  updated: ISessionLifecycleConfig
): IRuntimeProfileTemplate => {
  const nextExecutionConfig = {
    ...(profile.environmentConfig?.executionConfig || {})
  };
  const idleTtl = toTtlDurationString(
    updated.maxIdleTimeQuantity,
    updated.maxIdleTimeUnit,
    updated.maxIdleTime
  );
  const ttl = toTtlDurationString(
    updated.maxSessionTimeQuantity,
    updated.maxSessionTimeUnit,
    updated.maxSessionTime
  );

  if (idleTtl) {
    nextExecutionConfig.idleTtl = idleTtl;
  } else {
    delete nextExecutionConfig.idleTtl;
  }

  if (ttl) {
    nextExecutionConfig.ttl = ttl;
  } else {
    delete nextExecutionConfig.ttl;
  }

  return {
    ...profile,
    environmentConfig: {
      ...(profile.environmentConfig || {}),
      executionConfig: nextExecutionConfig
    }
  };
};

export const buildOtherCustomizationSparkPropertiesFromTemplate = (
  profile: IRuntimeProfileTemplate
): SparkProperties => {
  const properties = profile.runtimeConfig?.properties || {};
  const result: SparkProperties = {};
  Object.keys(properties).forEach(rawKey => {
    const normalizedKey = stripPropertyPrefix(rawKey);
    if (
      !HANDLED_SPARK_PROPERTY_KEYS.has(normalizedKey) &&
      !normalizedKey.startsWith(LAKEHOUSE_CATALOG_PROPERTY_PREFIX) &&
      !(normalizedKey in result)
    ) {
      result[normalizedKey] = getPropertyValue(properties, normalizedKey);
    }
  });
  return result;
};

export const applyOtherCustomizationUpdateToTemplate = (
  profile: IRuntimeProfileTemplate,
  updatedSparkProperties: SparkProperties,
  updatedLabels: ProfileLabels
): IRuntimeProfileTemplate => {
  const existingProps = profile.runtimeConfig?.properties || {};
  const nextProps: Record<string, string> = {};

  Object.entries(existingProps).forEach(([rawKey, value]) => {
    const normalizedKey = stripPropertyPrefix(rawKey);
    if (
      HANDLED_SPARK_PROPERTY_KEYS.has(normalizedKey) ||
      normalizedKey.startsWith(LAKEHOUSE_CATALOG_PROPERTY_PREFIX)
    ) {
      nextProps[rawKey] = value;
    }
  });

  Object.entries(updatedSparkProperties).forEach(([key, value]) => {
    const trimmedKey = key.trim();
    if (trimmedKey) {
      const normalizedKey = stripPropertyPrefix(trimmedKey);
      delete nextProps[normalizedKey];
      delete nextProps[`spark:${normalizedKey}`];
      delete nextProps[`dataproc:${normalizedKey}`];
      nextProps[trimmedKey] = value;
    }
  });

  return {
    ...profile,
    labels: { ...updatedLabels },
    runtimeConfig: {
      ...(profile.runtimeConfig || {}),
      properties: nextProps
    }
  };
};

const LAKEHOUSE_CATALOG_RESOURCE_REGEX =
  /^projects\/([^/]+)\/(?:locations\/[^/]+\/)?catalogs\/([^/]+)$/;

export const buildMetastoreConfigFromTemplate = (
  profile: IRuntimeProfileTemplate,
  projectId: string = '',
  region: string = ''
): IMetastoreConfig => {
  const metastoreService =
    profile.environmentConfig?.peripheralsConfig?.metastoreService?.trim() ||
    '';
  if (metastoreService) {
    const svcMatch = /^projects\/([^/]+)\//.exec(metastoreService);
    const svcProject = svcMatch?.[1] || '';
    return {
      metastore: DATAPROC_METASTORE,
      metastoreType: 'dataproc',
      ...(svcProject && svcProject !== projectId
        ? { projectId: svcProject }
        : {}),
      dataprocMetastoreService: metastoreService
    };
  }

  const properties = profile.runtimeConfig?.properties || {};
  const lakehouseProject = getPropertyValue(
    properties,
    LAKEHOUSE_PROJECT_PROPERTY
  ).trim();
  const defaultCatalog = getPropertyValue(
    properties,
    LAKEHOUSE_DEFAULT_CATALOG_PROPERTY
  ).trim();

  const catalogEntries: Array<{ alias: string; resource: string }> = [];
  const seenAliases = new Set<string>();
  Object.keys(properties).forEach(rawKey => {
    const normalized = stripPropertyPrefix(rawKey);
    if (normalized.startsWith(LAKEHOUSE_CATALOG_PROPERTY_PREFIX)) {
      const alias = normalized.slice(LAKEHOUSE_CATALOG_PROPERTY_PREFIX.length);
      if (alias && !seenAliases.has(alias)) {
        seenAliases.add(alias);
        catalogEntries.push({
          alias,
          resource: getPropertyValue(properties, normalized).trim()
        });
      }
    }
  });

  if (!lakehouseProject && !defaultCatalog && catalogEntries.length === 0) {
    return {
      hiveEndpointEnabled: false
    };
  }

  const isDefaultEntry = (entry: { alias: string; resource: string }) =>
    Boolean(defaultCatalog) &&
    (entry.alias === defaultCatalog || entry.resource === defaultCatalog);

  const defaultEntry = catalogEntries.find(isDefaultEntry);
  const hiveEntry = catalogEntries.find(entry => !isDefaultEntry(entry));

  const icebergRestEndpointEnabled = Boolean(defaultCatalog) || !hiveEntry;
  let catalogSelectionMode: CatalogSelectionMode = 'new';
  let catalogId: string | undefined;
  let catalogName: string | undefined;
  let icebergProject = lakehouseProject;

  if (icebergRestEndpointEnabled) {
    if (defaultCatalog.startsWith('projects/')) {
      catalogSelectionMode = 'existing';
      const parsedDefault =
        LAKEHOUSE_CATALOG_RESOURCE_REGEX.exec(defaultCatalog);
      icebergProject = parsedDefault?.[1] || lakehouseProject;
      catalogId = parsedDefault?.[2] || defaultEntry?.alias || undefined;
    } else {
      catalogSelectionMode = 'new';
      const parsedEntry = defaultEntry
        ? LAKEHOUSE_CATALOG_RESOURCE_REGEX.exec(defaultEntry.resource)
        : null;
      icebergProject = parsedEntry?.[1] || lakehouseProject;
      const defaultRegionCatalogName = getDefaultLakehouseCatalogName(region);
      if (defaultCatalog && defaultCatalog !== defaultRegionCatalogName) {
        catalogName = defaultCatalog;
      }
    }
  }

  const otherProjectId =
    icebergProject && icebergProject !== projectId ? icebergProject : undefined;

  let hiveProjectId: string | undefined;
  let hiveCatalogId: string | undefined;
  let hiveCatalogName: string | undefined;
  if (hiveEntry) {
    const parsedHive = LAKEHOUSE_CATALOG_RESOURCE_REGEX.exec(
      hiveEntry.resource
    );
    hiveProjectId =
      parsedHive?.[1] || lakehouseProject || projectId || undefined;
    hiveCatalogId = parsedHive?.[2] || hiveEntry.alias;
    hiveCatalogName = hiveEntry.alias;
  }

  return {
    metastore: LAKEHOUSE_RUNTIME_CATALOG,
    metastoreType: 'lakehouse',
    ...(icebergRestEndpointEnabled && otherProjectId
      ? { projectId: otherProjectId }
      : {}),
    icebergRestEndpointEnabled,
    ...(icebergRestEndpointEnabled && {
      catalogSelectionMode,
      ...(catalogSelectionMode === 'existing' && catalogId
        ? { catalogId }
        : {}),
      ...(catalogSelectionMode === 'new' && catalogName ? { catalogName } : {})
    }),
    hiveEndpointEnabled: Boolean(hiveEntry),
    ...(hiveEntry && {
      ...(hiveProjectId ? { hiveProjectId } : {}),
      hiveCatalogId,
      hiveCatalogName
    })
  };
};

export const applyMetastoreUpdateToTemplate = (
  profile: IRuntimeProfileTemplate,
  updated: IMetastoreConfig,
  projectId: string = '',
  region: string = ''
): IRuntimeProfileTemplate => {
  if (!updated.metastoreType) {
    return profile;
  }

  const existingProps = profile.runtimeConfig?.properties || {};
  const nextProps: Record<string, string> = {
    ...existingProps
  };

  Object.keys(nextProps).forEach(rawKey => {
    const normalized = stripPropertyPrefix(rawKey);
    if (
      normalized === LAKEHOUSE_PROJECT_PROPERTY ||
      normalized === LAKEHOUSE_DEFAULT_CATALOG_PROPERTY ||
      normalized.startsWith(LAKEHOUSE_CATALOG_PROPERTY_PREFIX)
    ) {
      delete nextProps[rawKey];
    }
  });

  const nextPeripheralsConfig = {
    ...(profile.environmentConfig?.peripheralsConfig || {})
  };

  if (updated.metastoreType === 'dataproc') {
    if (
      updated.dataprocMetastoreService &&
      updated.dataprocMetastoreService !== METASTORE_NONE
    ) {
      nextPeripheralsConfig.metastoreService = updated.dataprocMetastoreService;
    } else {
      delete nextPeripheralsConfig.metastoreService;
    }
  } else if (updated.metastoreType === 'lakehouse') {
    delete nextPeripheralsConfig.metastoreService;

    const isIcebergEnabled = updated.icebergRestEndpointEnabled ?? true;
    const isHiveEnabled = Boolean(updated.hiveEndpointEnabled);
    const hiveProject = updated.hiveProjectId || projectId;

    if (isIcebergEnabled) {
      const icebergProject = updated.projectId || projectId;
      if (icebergProject) {
        nextProps[LAKEHOUSE_PROJECT_PROPERTY] = icebergProject;
      }

      if (updated.catalogSelectionMode === 'existing') {
        if (updated.catalogId && icebergProject) {
          const catalogResource = getLakehouseCatalogResource(
            icebergProject,
            updated.catalogId
          );
          nextProps[LAKEHOUSE_CATALOG_PROPERTY_PREFIX + updated.catalogId] =
            catalogResource;
          nextProps[LAKEHOUSE_DEFAULT_CATALOG_PROPERTY] = catalogResource;
        }
      } else {
        const catalogName =
          updated.catalogName || getDefaultLakehouseCatalogName(region);
        if (catalogName) {
          if (icebergProject) {
            nextProps[LAKEHOUSE_CATALOG_PROPERTY_PREFIX + catalogName] =
              getLakehouseCatalogResource(icebergProject, catalogName);
          }
          nextProps[LAKEHOUSE_DEFAULT_CATALOG_PROPERTY] = catalogName;
        }
      }
    } else if (isHiveEnabled && hiveProject) {
      nextProps[LAKEHOUSE_PROJECT_PROPERTY] = hiveProject;
    }

    if (isHiveEnabled && updated.hiveCatalogName && hiveProject) {
      nextProps[LAKEHOUSE_CATALOG_PROPERTY_PREFIX + updated.hiveCatalogName] =
        getLakehouseCatalogResource(
          hiveProject,
          updated.hiveCatalogId || updated.hiveCatalogName
        );
    }
  }

  const nextEnvironmentConfig = {
    ...(profile.environmentConfig || {})
  };
  if (Object.keys(nextPeripheralsConfig).length > 0) {
    nextEnvironmentConfig.peripheralsConfig = nextPeripheralsConfig;
  } else {
    delete nextEnvironmentConfig.peripheralsConfig;
  }

  const nextProfile: IRuntimeProfileTemplate = {
    ...profile,
    runtimeConfig: {
      ...(profile.runtimeConfig || {}),
      properties: nextProps
    }
  };
  if (Object.keys(nextEnvironmentConfig).length > 0) {
    nextProfile.environmentConfig = nextEnvironmentConfig;
  } else {
    delete nextProfile.environmentConfig;
  }

  return nextProfile;
};

const SUBNETWORK_URI_REGEX =
  /projects\/(?<project>[^/]+)\/regions\/(?<region>[^/]+)\/subnetworks\/(?<subnetwork>[^/?#]+)/;
const NETWORK_URI_REGEX = /(?:^|\/networks\/)([^/?#]+)$/;
const KMS_RESOURCE_REGEX =
  /^projects\/([^/]+)\/locations\/([^/]+)\/keyRings\/([^/]+)\/cryptoKeys\/([^/]+)$/;

export const buildNetworkSecurityConfigFromTemplate = (
  profile: IRuntimeProfileTemplate,
  projectId: string = '',
  region: string = ''
): INetworkAndSecurityConfig => {
  const executionConfig = profile.environmentConfig?.executionConfig;
  const rawSubnetworkUri = executionConfig?.subnetworkUri?.trim() || '';
  const rawNetworkUri = executionConfig?.networkUri?.trim() || '';

  const subnetMatch = SUBNETWORK_URI_REGEX.exec(rawSubnetworkUri);
  const subnetProject = subnetMatch?.groups?.['project'] || '';
  const subnetShortName =
    subnetMatch?.groups?.['subnetwork'] || rawSubnetworkUri;
  const isSharedVpc = Boolean(
    projectId && subnetProject && subnetProject !== projectId
  );
  const networkSource: NetworkSourceType = isSharedVpc
    ? 'shared_from_host'
    : 'project';

  const primaryNetwork =
    (rawNetworkUri && NETWORK_URI_REGEX.exec(rawNetworkUri)?.[1]) || 'default';

  const networkTags = executionConfig?.networkTags
    ? [...executionConfig.networkTags]
    : [];

  const authType =
    executionConfig?.authenticationConfig?.userWorkloadAuthenticationType || '';
  const executionIdentity: ExecutionIdentityType =
    authType === 'END_USER_CREDENTIALS' ? 'user_account' : 'service_account';
  const serviceAccount =
    executionIdentity === 'service_account'
      ? executionConfig?.serviceAccount?.trim() || undefined
      : undefined;

  const rawKmsKey = executionConfig?.kmsKey?.trim() || '';
  const kmsMatch = rawKmsKey ? KMS_RESOURCE_REGEX.exec(rawKmsKey) : null;
  const isLocalSelectKey = Boolean(
    kmsMatch &&
      projectId &&
      region &&
      kmsMatch[1] === projectId &&
      kmsMatch[2] === region
  );

  return {
    networkSource,
    primaryNetwork,
    networkInThisProject: primaryNetwork,
    subnetwork: isSharedVpc ? 'default' : subnetShortName || 'default',
    ...(isSharedVpc && {
      hostProjectId: subnetProject,
      sharedSubnetwork: subnetShortName
    }),
    networkTags,
    executionIdentity,
    ...(serviceAccount && { serviceAccount }),
    encryption: rawKmsKey ? 'customer_managed_key' : 'google_managed',
    ...(rawKmsKey && {
      kmsKeySelectionMode: isLocalSelectKey ? 'select' : 'manual',
      ...(isLocalSelectKey && kmsMatch
        ? { keyRing: kmsMatch[3], cryptoKey: kmsMatch[4] }
        : {}),
      kmsKeyName: rawKmsKey
    })
  };
};

export const applyNetworkSecurityUpdateToTemplate = (
  profile: IRuntimeProfileTemplate,
  updated: INetworkAndSecurityConfig,
  projectId: string = '',
  region: string = ''
): IRuntimeProfileTemplate => {
  const nextExecutionConfig = {
    ...(profile.environmentConfig?.executionConfig || {})
  };

  delete nextExecutionConfig.subnetworkUri;
  delete nextExecutionConfig.networkTags;
  delete nextExecutionConfig.serviceAccount;
  delete nextExecutionConfig.authenticationConfig;
  delete nextExecutionConfig.kmsKey;

  if (updated.networkSource === 'shared_from_host') {
    const sharedSub = updated.sharedSubnetwork?.trim() || '';
    const hostProj = updated.hostProjectId?.trim() || '';
    if (sharedSub) {
      nextExecutionConfig.subnetworkUri =
        sharedSub.startsWith('projects/') || !hostProj
          ? sharedSub
          : `projects/${hostProj}/regions/${region}/subnetworks/${sharedSub}`;
    }
  } else {
    const sub = updated.subnetwork?.trim() || '';
    if (sub) {
      nextExecutionConfig.subnetworkUri = sub;
    }
  }

  if (nextExecutionConfig.subnetworkUri) {
    delete nextExecutionConfig.networkUri;
  }

  if (updated.networkTags && updated.networkTags.length > 0) {
    nextExecutionConfig.networkTags = [...updated.networkTags];
  }

  if (updated.executionIdentity === 'user_account') {
    nextExecutionConfig.authenticationConfig = {
      userWorkloadAuthenticationType: 'END_USER_CREDENTIALS'
    };
  } else if (updated.executionIdentity === 'service_account') {
    const sa = updated.serviceAccount?.trim();
    if (sa) {
      nextExecutionConfig.serviceAccount = sa;
    }
  }

  if (updated.encryption === 'customer_managed_key') {
    const keyRing = updated.keyRing?.trim();
    const cryptoKey = updated.cryptoKey?.trim();
    const manualKeyName = updated.kmsKeyName?.trim();
    let kmsKey: string | undefined;
    if (
      updated.kmsKeySelectionMode !== 'manual' &&
      keyRing &&
      cryptoKey &&
      projectId &&
      region
    ) {
      kmsKey = `projects/${projectId}/locations/${region}/keyRings/${keyRing}/cryptoKeys/${cryptoKey}`;
    } else if (manualKeyName) {
      kmsKey = manualKeyName;
    }
    if (kmsKey) {
      nextExecutionConfig.kmsKey = kmsKey;
    }
  }

  const nextEnvironmentConfig = {
    ...(profile.environmentConfig || {})
  };
  if (Object.keys(nextExecutionConfig).length > 0) {
    nextEnvironmentConfig.executionConfig = nextExecutionConfig;
  } else {
    delete nextEnvironmentConfig.executionConfig;
  }

  const nextProfile: IRuntimeProfileTemplate = {
    ...profile
  };
  if (Object.keys(nextEnvironmentConfig).length > 0) {
    nextProfile.environmentConfig = nextEnvironmentConfig;
  } else {
    delete nextProfile.environmentConfig;
  }

  return nextProfile;
};

const EMPTY_LABELS: ProfileLabels = Object.freeze({});

export interface IDeleteConfirmationModalProps {
  profileName: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmationModal({
  profileName,
  isDeleting,
  onCancel,
  onConfirm
}: IDeleteConfirmationModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDeleting, onCancel]);

  return createPortal(
    <div
      className="delete-profile-modal-backdrop"
      onClick={() => !isDeleting && onCancel()}
    >
      <div
        className="delete-profile-modal"
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        <div className="delete-profile-modal-title">Delete Runtime Profile</div>
        <div className="delete-profile-modal-banner">
          <svg
            className="delete-profile-modal-info-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
          <span>This operation cannot be undone.</span>
        </div>
        <div className="delete-profile-modal-body">
          Do you want to delete runtime profile {profileName}?
        </div>
        <div className="delete-profile-modal-actions">
          <button
            type="button"
            className="delete-profile-modal-btn"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="delete-profile-modal-btn"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export interface IRuntimeProfileDetailsProps {
  profile: IRuntimeProfileTemplate;
  onBack: () => void;
  onDeleteSuccess?: () => void;
  /** Opens this profile in the runtime profile form in edit mode. */
  onEdit?: () => void;
  onUpdateSuccess?: (updatedProfile: IRuntimeProfileTemplate) => void;
}

/** Renders resource details for a selected Serverless Runtime Profile. */
export default function RuntimeProfileDetails({
  profile,
  onBack,
  onDeleteSuccess,
  onEdit,
  onUpdateSuccess
}: IRuntimeProfileDetailsProps) {
  const [currentProfile, setCurrentProfile] =
    useState<IRuntimeProfileTemplate>(profile);
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingSection, setIsSavingSection] = useState(false);
  const [isRuntimeConfigDrawerOpen, setIsRuntimeConfigDrawerOpen] =
    useState(false);
  const [isExecutorDriverDrawerOpen, setIsExecutorDriverDrawerOpen] =
    useState(false);
  const [isAutoscalingDrawerOpen, setIsAutoscalingDrawerOpen] = useState(false);
  const [isMetastoreDrawerOpen, setIsMetastoreDrawerOpen] = useState(false);
  const [isNetworkSecurityDrawerOpen, setIsNetworkSecurityDrawerOpen] =
    useState(false);
  const [isSessionLifecycleDrawerOpen, setIsSessionLifecycleDrawerOpen] =
    useState(false);
  const [isOtherCustomizationDrawerOpen, setIsOtherCustomizationDrawerOpen] =
    useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setCurrentProfile(profile);
  }, [profile]);

  const {
    projectId,
    region,
    profileId: shortName
  } = parseRuntimeProfileResourceName(currentProfile.name);
  const displayName = currentProfile.jupyterSession?.displayName || shortName;
  const properties = currentProfile.runtimeConfig?.properties || {};
  const executionConfig = currentProfile.environmentConfig?.executionConfig;
  const getProp = (key: string) => getPropertyValue(properties, key);

  const encryptionType = executionConfig?.kmsKey
    ? 'Customer-managed'
    : 'Google-managed';
  const rawTier = getProp(DATAPROC_TIER_PROPERTY).trim().toLowerCase();
  const isPremiumTier =
    rawTier === 'premium' ||
    (!rawTier &&
      getDefaultTierForVersion(currentProfile.runtimeConfig?.version) ===
        'Premium');
  const tierDisplay = isPremiumTier ? 'Accelerated' : 'Standard';
  const lightningEngine =
    getProp(DATAPROC_LIGHTNING_ENGINE_PROPERTY).trim() === 'lightningEngine'
      ? 'Enabled'
      : 'Disabled';
  const driverDisk = formatDiskConfig(
    getProp('spark.dataproc.driver.disk.tier'),
    getProp('spark.dataproc.driver.disk.size')
  );
  const executorDisk = formatDiskConfig(
    getProp('spark.dataproc.executor.disk.tier'),
    getProp('spark.dataproc.executor.disk.size')
  );
  const autoscalingStatus =
    getProp('spark.dynamicAllocation.enabled').trim().toLowerCase() === 'false'
      ? 'Off'
      : 'On';

  const runtimeEnvironmentDrawerConfig = useMemo(
    () => buildRuntimeEnvironmentConfigFromTemplate(currentProfile, shortName),
    [currentProfile, shortName]
  );
  const executorAndDriverDrawerConfig = useMemo(
    () => buildExecutorAndDriverConfigFromTemplate(currentProfile),
    [currentProfile]
  );
  const autoscalingDrawerConfig = useMemo(
    () => buildAutoscalingConfigFromTemplate(currentProfile),
    [currentProfile]
  );
  const metastoreDrawerConfig = useMemo(
    () => buildMetastoreConfigFromTemplate(currentProfile, projectId, region),
    [currentProfile, projectId, region]
  );
  const networkSecurityDrawerConfig = useMemo(
    () =>
      buildNetworkSecurityConfigFromTemplate(currentProfile, projectId, region),
    [currentProfile, projectId, region]
  );
  const sessionLifecycleDrawerConfig = useMemo(
    () => buildSessionLifecycleConfigFromTemplate(currentProfile),
    [currentProfile]
  );
  const otherCustomizationSparkProperties = useMemo(
    () => buildOtherCustomizationSparkPropertiesFromTemplate(currentProfile),
    [currentProfile]
  );
  const otherCustomizationLabels = currentProfile.labels ?? EMPTY_LABELS;
  const sparkPropertyEntries = Object.entries(
    otherCustomizationSparkProperties
  );

  const handleCopyName = async () => {
    if (!shortName) {
      Notification.emit('No profile name to copy', 'warning', {
        autoClose: 3000
      });
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shortName);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shortName;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!copied) {
          throw new Error('execCommand copy failed');
        }
      }
      Notification.emit('Name copied to clipboard', 'success', {
        autoClose: 2000
      });
    } catch (error) {
      safeLog(`Failed to copy runtime profile name: ${error}`, LOG_LEVEL.WARN);
      Notification.emit('Failed to copy name to clipboard', 'error', {
        autoClose: 3000
      });
    }
  };

  const confirmDelete = async () => {
    if (isDeleting) {
      return;
    }
    setIsDeleting(true);
    try {
      await RuntimeProfileService.deleteRuntimeProfile(
        currentProfile.name,
        displayName
      );
      Notification.emit(`${displayName} is deleted successfully`, 'success', {
        autoClose: 5000
      });
      if (onDeleteSuccess) {
        onDeleteSuccess();
      } else {
        onBack();
      }
    } catch (error) {
      safeLog(`Error deleting profile: ${error}`, LOG_LEVEL.ERROR);
      Notification.emit(`Failed to delete ${displayName}: ${error}`, 'error', {
        autoClose: 5000
      });
      setIsDeleting(false);
    }
  };

  const handleSaveTemplateUpdate = async (
    nextTemplate: IRuntimeProfileTemplate,
    closeDrawer: () => void
  ) => {
    if (isSavingSection) {
      return;
    }
    setIsSavingSection(true);
    try {
      const savedProfile = await RuntimeProfileService.updateRuntimeProfile(
        currentProfile.name,
        nextTemplate,
        displayName
      );
      if (isMountedRef.current) {
        setCurrentProfile(savedProfile);
        closeDrawer();
      }
      onUpdateSuccess?.(savedProfile);
      Notification.emit(
        `Runtime Profile ${displayName} successfully updated`,
        'success',
        { autoClose: 5000 }
      );
    } catch (error) {
      safeLog(`Error updating profile: ${error}`, LOG_LEVEL.ERROR);
      Notification.emit(`Failed to update ${displayName}: ${error}`, 'error', {
        autoClose: 5000
      });
    } finally {
      if (isMountedRef.current) {
        setIsSavingSection(false);
      }
    }
  };

  const ExpandChevron = isConfigExpanded
    ? iconExpandLess.react
    : iconExpandMore.react;

  const basicInfoRows = [
    {
      label: 'Display name',
      value: currentProfile.jupyterSession?.displayName || ''
    },
    { label: 'Name', value: shortName },
    { label: 'Region', value: region },
    { label: 'Create time', value: formatCreateTime(currentProfile.createTime) },
    { label: 'Creator', value: currentProfile.creator || '' },
    {
      label: 'Last used',
      value: formatLastUsed(currentProfile.updateTime, true)
    },
    { label: 'Description', value: currentProfile.description || '' },
    {
      label: 'Jupyter kernel',
      value: currentProfile.jupyterSession?.kernel || ''
    }
  ];

  const runtimeVersion = currentProfile.runtimeConfig?.version || '';
  const configType = currentProfile.jupyterSession ? 'Jupyter' : '';
  const customSparkImage =
    currentProfile.runtimeConfig?.containerImage || 'None';
  const stagingBucket = executionConfig?.stagingBucket || 'Auto';
  const pythonPackageRepository =
    currentProfile.runtimeConfig?.repositoryConfig?.pypiRepositoryConfig
      ?.pypiRepository || 'Google managed PyPI pull-through cache';
  const initialExec = getProp('spark.dynamicAllocation.initialExecutors');
  const minExec = getProp('spark.dynamicAllocation.minExecutors');
  const maxExec = getProp('spark.dynamicAllocation.maxExecutors');
  const lakehouseProject = getProp(LAKEHOUSE_PROJECT_PROPERTY).trim();
  const defaultLakehouseCatalog = getProp(
    LAKEHOUSE_DEFAULT_CATALOG_PROPERTY
  ).trim();
  const hasLakehouseCatalogEntry = Object.keys(properties).some(rawKey =>
    stripPropertyPrefix(rawKey).startsWith(LAKEHOUSE_CATALOG_PROPERTY_PREFIX)
  );
  const hasLakehouseConfig =
    Boolean(lakehouseProject) ||
    Boolean(defaultLakehouseCatalog) ||
    hasLakehouseCatalogEntry;
  const metastoreService =
    currentProfile.environmentConfig?.peripheralsConfig?.metastoreService?.trim();
  const metastore = metastoreService
    ? metastoreService
    : hasLakehouseConfig
      ? lakehouseProject && projectId && lakehouseProject !== projectId
        ? `${LAKEHOUSE_RUNTIME_CATALOG} (project: ${lakehouseProject})`
        : LAKEHOUSE_RUNTIME_CATALOG
      : METASTORE_NONE;
  const hasHiveCatalog = Object.keys(properties).some(rawKey => {
    const key = stripPropertyPrefix(rawKey);
    if (!key.startsWith(LAKEHOUSE_CATALOG_PROPERTY_PREFIX)) {
      return false;
    }
    const catalogName = key.slice(LAKEHOUSE_CATALOG_PROPERTY_PREFIX.length);
    const catalogResource = getProp(key).trim();
    const isDefaultIcebergCatalog =
      Boolean(defaultLakehouseCatalog) &&
      (catalogName === defaultLakehouseCatalog ||
        catalogResource === defaultLakehouseCatalog);
    return Boolean(catalogName) && !isDefaultIcebergCatalog;
  });
  const hiveEndpoint = hasHiveCatalog ? 'Enabled' : 'Disabled';
  const maxIdleTime = formatDurationTtl(executionConfig?.idleTtl);
  const maxSessionTime = formatDurationTtl(executionConfig?.ttl);
  const sessionLifecycleRows: Array<{ label: string; value: React.ReactNode }> =
    [
      ...(maxIdleTime ? [{ label: 'Max idle time', value: maxIdleTime }] : []),
      ...(maxSessionTime
        ? [{ label: 'Max session time', value: maxSessionTime }]
        : [])
    ];

  const configSections: Array<{
    title: string;
    onEdit?: () => void;
    rows: Array<{ label: string; value: React.ReactNode }>;
  }> = [
    {
      title: 'Runtime configuration',
      onEdit: () => setIsRuntimeConfigDrawerOpen(true),
      rows: [
        { label: 'Spark runtime version', value: runtimeVersion },
        { label: 'Configuration type', value: configType },
        { label: 'Custom Spark image', value: customSparkImage },
        { label: 'Cloud storage staging bucket', value: stagingBucket },
        {
          label: 'Python package repository',
          value: pythonPackageRepository
        }
      ]
    },
    {
      title: 'Executor and driver configuration',
      onEdit: () => setIsExecutorDriverDrawerOpen(true),
      rows: [
        { label: 'Tier', value: tierDisplay },
        { label: 'Lightning Engine', value: lightningEngine },
        { label: 'Driver disk', value: driverDisk },
        { label: 'Executor disk', value: executorDisk }
      ]
    },
    {
      title: 'Autoscaling',
      onEdit: () => setIsAutoscalingDrawerOpen(true),
      rows:
        autoscalingStatus === 'Off'
          ? [{ label: 'Autoscaling', value: autoscalingStatus }]
          : [
              { label: 'Autoscaling', value: autoscalingStatus },
              { label: 'Initial executors', value: initialExec },
              { label: 'Minimum executors', value: minExec },
              { label: 'Maximum executors', value: maxExec }
            ]
    },
    {
      title: 'Metastore configuration',
      onEdit: () => setIsMetastoreDrawerOpen(true),
      rows: [
        { label: 'Metastore', value: metastore },
        { label: 'Hive endpoint', value: hiveEndpoint }
      ]
    },
    {
      title: 'Network and security',
      onEdit: () => setIsNetworkSecurityDrawerOpen(true),
      rows: [{ label: 'Encryption type', value: encryptionType }]
    },
    {
      title: 'Session lifecycle',
      onEdit: () => setIsSessionLifecycleDrawerOpen(true),
      rows: sessionLifecycleRows
    },
    {
      title: 'Other customizations',
      onEdit: () => setIsOtherCustomizationDrawerOpen(true),
      rows: [
        {
          label: 'Spark properties',
          value:
            sparkPropertyEntries.length > 0
              ? sparkPropertyEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="runtime-profile-details-spark-prop-line"
                  >
                    {`${key}: ${value}`}
                  </div>
                ))
              : 'None'
        },
        {
          label: 'Labels',
          value:
            Object.keys(currentProfile.labels || {}).length > 0
              ? Object.entries(currentProfile.labels || {}).map(
                  ([key, value]) => (
                    <div
                      key={key}
                      className="runtime-profile-details-spark-prop-line"
                    >
                      {`${key}: ${value}`}
                    </div>
                  )
                )
              : 'None'
        }
      ]
    }
  ];

  return (
    <div className="runtime-profile-details-wrapper">
      {showDeleteModal && (
        <DeleteConfirmationModal
          profileName={displayName}
          isDeleting={isDeleting}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={() => void confirmDelete()}
        />
      )}

      <div className="runtime-profile-details-header">
        <button
          type="button"
          className="runtime-profile-details-back-btn"
          onClick={onBack}
          aria-label="Back"
        >
          <iconLeftArrow.react tag="div" aria-hidden="true" />
        </button>
        <div className="runtime-profile-details-header-title">
          Resource details
        </div>
        <div className="runtime-profile-details-header-actions">
          <button
            type="button"
            className="secondary-action-btn"
            onClick={onEdit}
            disabled={!onEdit}
          >
            <iconEdit.react tag="div" aria-hidden="true" />
            Edit
          </button>
          <button
            type="button"
            className="secondary-action-btn"
            onClick={() => setShowDeleteModal(true)}
          >
            <iconDelete.react tag="div" aria-hidden="true" />
            Delete
          </button>
        </div>
      </div>

      <div className="runtime-profile-details-body">
        <div className="runtime-profile-details-title-row">
          <span className="runtime-profile-details-name">{shortName}</span>
          <button
            type="button"
            className="runtime-profile-details-copy-btn"
            onClick={() => void handleCopyName()}
            title="Copy name"
            aria-label="Copy name"
          >
            <iconCopy.react tag="div" aria-hidden="true" />
          </button>
        </div>

        <div className="runtime-profile-details-section-header">
          <span>Basic Information</span>
        </div>

        {basicInfoRows.map(row => (
          <div className="runtime-profile-details-row" key={row.label}>
            <div className="runtime-profile-details-label level-1">
              {row.label}
            </div>
            <div className="runtime-profile-details-value">{row.value}</div>
          </div>
        ))}

        <div
          className="runtime-profile-details-section-header collapsible configuration-header"
          onClick={() => setIsConfigExpanded(prev => !prev)}
          role="button"
          tabIndex={0}
          aria-expanded={isConfigExpanded}
          aria-controls="runtime-profile-config-content"
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsConfigExpanded(prev => !prev);
            }
          }}
        >
          <span>Configuration</span>
          <span
            className="runtime-profile-details-expand-icon"
            aria-hidden="true"
          >
            <ExpandChevron tag="div" aria-hidden="true" />
          </span>
        </div>

        {isConfigExpanded && (
          <div id="runtime-profile-config-content">
            {configSections.map(section => (
              <React.Fragment key={section.title}>
                <div className="runtime-profile-details-subsection-header">
                  <span>{section.title}</span>
                  <button
                    type="button"
                    className="runtime-profile-details-subsection-edit-btn"
                    aria-label={`Edit ${section.title}`}
                    title={`Edit ${section.title}`}
                    disabled={!section.onEdit || isSavingSection}
                    onClick={section.onEdit}
                  >
                    <iconEdit.react tag="div" aria-hidden="true" />
                  </button>
                </div>
                {section.rows.map(row => (
                  <div
                    className="runtime-profile-details-row"
                    key={`${section.title}-${row.label}`}
                  >
                    <div className="runtime-profile-details-label level-2">
                      {row.label}
                    </div>
                    <div className="runtime-profile-details-value">
                      {row.value}
                    </div>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      <RuntimeEnvironmentEditDrawer
        open={isRuntimeConfigDrawerOpen}
        config={runtimeEnvironmentDrawerConfig}
        isProfileIdDisabled
        onClose={() => setIsRuntimeConfigDrawerOpen(false)}
        onSave={updatedConfig => {
          const nextTemplate = applyRuntimeEnvironmentUpdateToTemplate(
            currentProfile,
            updatedConfig
          );
          void handleSaveTemplateUpdate(nextTemplate, () =>
            setIsRuntimeConfigDrawerOpen(false)
          );
        }}
      />

      <ExecutorAndDriverEditDrawer
        open={isExecutorDriverDrawerOpen}
        config={executorAndDriverDrawerConfig}
        onClose={() => setIsExecutorDriverDrawerOpen(false)}
        onSave={updatedConfig => {
          const nextTemplate = applyExecutorAndDriverUpdateToTemplate(
            currentProfile,
            updatedConfig
          );
          void handleSaveTemplateUpdate(nextTemplate, () =>
            setIsExecutorDriverDrawerOpen(false)
          );
        }}
      />

      <AutoscalingEditDrawer
        open={isAutoscalingDrawerOpen}
        config={autoscalingDrawerConfig}
        onClose={() => setIsAutoscalingDrawerOpen(false)}
        onSave={updatedConfig => {
          const nextTemplate = applyAutoscalingUpdateToTemplate(
            currentProfile,
            updatedConfig
          );
          void handleSaveTemplateUpdate(nextTemplate, () =>
            setIsAutoscalingDrawerOpen(false)
          );
        }}
      />

      <MetastoreEditDrawer
        open={isMetastoreDrawerOpen}
        config={metastoreDrawerConfig}
        region={region}
        projectId={projectId}
        onClose={() => setIsMetastoreDrawerOpen(false)}
        onSave={updatedConfig => {
          const nextTemplate = applyMetastoreUpdateToTemplate(
            currentProfile,
            updatedConfig,
            projectId,
            region
          );
          void handleSaveTemplateUpdate(nextTemplate, () =>
            setIsMetastoreDrawerOpen(false)
          );
        }}
      />

      <NetworkSecurityEditDrawer
        open={isNetworkSecurityDrawerOpen}
        config={networkSecurityDrawerConfig}
        region={region}
        projectId={projectId}
        onClose={() => setIsNetworkSecurityDrawerOpen(false)}
        onSave={updatedConfig => {
          const nextTemplate = applyNetworkSecurityUpdateToTemplate(
            currentProfile,
            updatedConfig,
            projectId,
            region
          );
          void handleSaveTemplateUpdate(nextTemplate, () =>
            setIsNetworkSecurityDrawerOpen(false)
          );
        }}
      />

      <SessionLifecycleEditDrawer
        open={isSessionLifecycleDrawerOpen}
        config={sessionLifecycleDrawerConfig}
        onClose={() => setIsSessionLifecycleDrawerOpen(false)}
        onSave={updatedConfig => {
          const nextTemplate = applySessionLifecycleUpdateToTemplate(
            currentProfile,
            updatedConfig
          );
          void handleSaveTemplateUpdate(nextTemplate, () =>
            setIsSessionLifecycleDrawerOpen(false)
          );
        }}
      />

      <OtherCustomizationEditDrawer
        open={isOtherCustomizationDrawerOpen}
        sparkProperties={otherCustomizationSparkProperties}
        labels={otherCustomizationLabels}
        onClose={() => setIsOtherCustomizationDrawerOpen(false)}
        onSave={(updatedSparkProperties, updatedLabels) => {
          const nextTemplate = applyOtherCustomizationUpdateToTemplate(
            currentProfile,
            updatedSparkProperties,
            updatedLabels
          );
          void handleSaveTemplateUpdate(nextTemplate, () =>
            setIsOtherCustomizationDrawerOpen(false)
          );
        }}
      />
    </div>
  );
}

