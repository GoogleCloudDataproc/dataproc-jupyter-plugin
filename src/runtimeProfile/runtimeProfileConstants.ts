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
  DATAPROC_STANDARD_MACHINE_TYPES
} from '../utils/const';
import { IMachineTypeOption } from './runtimeProfileInterface';
import { normalizeMachineTypeName } from './runtimeProfileMapper';

/** Compute tier constant for Premium. */
export const TIER_PREMIUM = 'PREMIUM';
/** Compute tier constant for Standard. */
export const TIER_STANDARD = 'STANDARD';

/** Label for Premium executor tier. */
export const MSG_EXECUTOR_TIER_PREMIUM = 'Premium';
/** Label for Premium tier with Lightning Engine enabled. */
export const MSG_EXECUTOR_TIER_PREMIUM_LIGHTNING =
  'Premium (Lightning Engine enabled)';
/** Label for Standard executor tier. */
export const MSG_EXECUTOR_TIER_STANDARD = 'Standard';

export const DEFAULT_EMPTY_DISPLAY_VALUE = '—';

/** Default executor count constants for summary and pricing estimate display. */
export const DEFAULT_INITIAL_EXECUTORS = 2;
export const DEFAULT_MIN_EXECUTORS = 2;
export const DEFAULT_MAX_EXECUTORS = 1000;

/** Combined list of standard and accelerated machine types. */
export const ALL_MACHINE_TYPES: IMachineTypeOption[] = [
  ...DATAPROC_STANDARD_MACHINE_TYPES,
  ...DATAPROC_ACCELERATED_MACHINE_TYPES
];

/** vCPU count and memory of the node that runs a machine shape. */
export interface IMachineShapeResources {
  readonly vcpus: number;
  readonly memoryGib: number;
}

/**
 * vCPUs and memory, in GiB, that DCU usage is metered on for each machine
 * shape.
 *
 * Standard shapes use their nominal size, as shown in the machine shape
 * picker. Accelerated shapes use the fixed GCE machine type they always run on
 * (g2-standard-* for L4, a2-highgpu-1g and a2-ultragpu-1g for A100), since
 * that is what gets metered even where the display name lists less memory.
 */
export const MACHINE_SHAPE_RESOURCES: Record<string, IMachineShapeResources> = {
  'highmem-4': { vcpus: 4, memoryGib: 32 },
  'standard-4': { vcpus: 4, memoryGib: 16 },
  'highmem-8': { vcpus: 8, memoryGib: 64 },
  'standard-8': { vcpus: 8, memoryGib: 32 },
  'highmem-16': { vcpus: 16, memoryGib: 128 },
  'standard-16': { vcpus: 16, memoryGib: 64 },
  'l4-4': { vcpus: 4, memoryGib: 16 }, // g2-standard-4
  'l4-8': { vcpus: 8, memoryGib: 32 }, // g2-standard-8
  'l4-12': { vcpus: 12, memoryGib: 48 }, // g2-standard-12
  'l4-16': { vcpus: 16, memoryGib: 64 }, // g2-standard-16
  'l4-24': { vcpus: 24, memoryGib: 96 }, // g2-standard-24
  'l4-48': { vcpus: 48, memoryGib: 192 }, // g2-standard-48
  'l4-96': { vcpus: 96, memoryGib: 384 }, // g2-standard-96
  'a100-40': { vcpus: 12, memoryGib: 85 }, // a2-highgpu-1g
  'a100-40-12': { vcpus: 12, memoryGib: 85 }, // a2-highgpu-1g
  'a100-80': { vcpus: 12, memoryGib: 170 }, // a2-ultragpu-1g
  'a100-80-12': { vcpus: 12, memoryGib: 170 } // a2-ultragpu-1g
};

/** Milli-DCUs consumed per vCPU. */
const MILLI_DCU_PER_VCPU = 600;

/** Milli-DCUs consumed per GiB of regular memory. */
const MILLI_DCU_PER_REGULAR_MEMORY_GIB = 100;

/** Milli-DCUs consumed per GiB of extended memory. */
const MILLI_DCU_PER_EXTENDED_MEMORY_GIB = 200;

/**
 * Memory per vCPU, in GiB, metered at the regular rate. Memory beyond this is
 * extended memory, metered at the higher extended rate.
 */
const MAX_REGULAR_MEMORY_GIB_PER_VCPU = 8;

/**
 * Returns the DCUs consumed by a node with the given vCPUs and memory, which
 * is also the DCU-hours it consumes per hour of usage.
 *
 * Mirrors the server-side metering formula: each vCPU is 0.6 DCU, each GiB of
 * memory up to 8 GiB per vCPU is 0.1 DCU, and each GiB beyond that is 0.2 DCU.
 * Accelerators (GPUs) are billed separately and are not included.
 */
export function calculateDcu(vcpus: number, memoryGib: number): number {
  const regularMemoryGib = Math.min(
    memoryGib,
    vcpus * MAX_REGULAR_MEMORY_GIB_PER_VCPU
  );
  const extendedMemoryGib = Math.max(0, memoryGib - regularMemoryGib);
  const milliDcu =
    vcpus * MILLI_DCU_PER_VCPU +
    regularMemoryGib * MILLI_DCU_PER_REGULAR_MEMORY_GIB +
    extendedMemoryGib * MILLI_DCU_PER_EXTENDED_MEMORY_GIB;
  return milliDcu / 1000;
}

/**
 * Precomputed DCU-hours per node per hour of usage for each machine shape.
 */
export const MACHINE_SHAPE_DCU: Record<string, number> = Object.fromEntries(
  Object.entries(MACHINE_SHAPE_RESOURCES).map(([shape, res]) => [
    shape,
    calculateDcu(res.vcpus, res.memoryGib)
  ])
);

/** Pricing estimate copy constants and message builders. */
export const MSG_PRICING_ESTIMATE_TITLE = 'Pricing estimate';
export const MSG_PRICING_ESTIMATE_SUBJECT_TO_AUTOSCALING =
  'Subject to autoscaling';
export const MSG_PRICING_ESTIMATE_ITEM_HEADER = 'Item';
export const MSG_PRICING_ESTIMATE_DCU_HEADER = 'DCU hours / hour of usage';
export const MSG_PRICING_ESTIMATE_DRIVER_NODE = 'Driver node';
export const MSG_PRICING_ESTIMATE_TOTAL_BASELINE = 'Total (baseline)';
export const MSG_PRICING_ESTIMATE_TABLE_ARIA_LABEL =
  'Basic resource costs in DCU hours per hour of usage';

export const getPricingHeroMsg = (dcuFormatted: string): string =>
  `${dcuFormatted} DCU hours / hour of usage`;

export const getPricingDcuValueMsg = (dcuFormatted: string): string =>
  `${dcuFormatted} DCU hours / hour of usage`;

export const getPricingDcuRangeMsg = (
  minDcuFormatted: string,
  maxDcuFormatted: string
): string =>
  `${minDcuFormatted} – ${maxDcuFormatted} DCU hours / hour of usage`;

export const getPricingBaselineCaptionMsg = (
  initialExecutorsFormatted: string
): string =>
  `Baseline for 1 driver and ${initialExecutorsFormatted} initial executors`;

export const getPricingExecutorRowMsg = (
  initialExecutorsFormatted: string
): string => `Executor nodes (initial ${initialExecutorsFormatted})`;

export const getPricingAutoscalingRowMsg = (
  minFormatted: string,
  maxFormatted: string
): string => `Autoscaling range (${minFormatted}–${maxFormatted} executors)`;

export const getPricingAutoscalingSingleRowMsg = (
  countFormatted: string
): string => `Autoscaling range (${countFormatted} executors)`;

/**
 * Display-only: maps a machine id (e.g. 'highmem-4') to its label; falls back to the raw value.
 */
export const getMachineTypeLabel = (machineName?: string): string | undefined =>
  ALL_MACHINE_TYPES.find(m => m.name === machineName)?.label ?? machineName;

const DEFAULT_DCU_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

/**
 * Returns the DCU-hours consumed per hour of usage by a single node of the
 * given machine shape, or 0 when the shape is unknown.
 */
export function getShapeDcu(shape?: string | null): number {
  if (!shape || !shape.trim()) {
    return 0;
  }
  const trimmed = shape.trim();
  const key = Object.prototype.hasOwnProperty.call(
    MACHINE_SHAPE_RESOURCES,
    trimmed
  )
    ? trimmed
    : normalizeMachineTypeName(trimmed, ALL_MACHINE_TYPES);
  if (!Object.prototype.hasOwnProperty.call(MACHINE_SHAPE_RESOURCES, key)) {
    return 0;
  }
  const resources = MACHINE_SHAPE_RESOURCES[key];
  return calculateDcu(resources.vcpus, resources.memoryGib);
}

/**
 * Formats a count for display with locale-aware digit grouping.
 */
export function formatDcuNumber(value: number, locale = 'en-US'): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  if (!locale || locale === 'en-US') {
    return DEFAULT_DCU_NUMBER_FORMATTER.format(safeValue);
  }
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(safeValue);
  } catch {
    return DEFAULT_DCU_NUMBER_FORMATTER.format(safeValue);
  }
}

/**
 * Formats a compact disk label for the Summary Executor and Driver node lines,
 * or empty string when no disk string is provided.
 */
export function formatCompactDiskLabel(diskStr?: string): string {
  if (!diskStr || !diskStr.trim()) {
    return '';
  }
  const lower = diskStr.toLowerCase();
  const diskType =
    lower.includes('ssd') || lower.includes('premium') ? 'SSD' : 'HDD';
  const sizeMatch =
    diskStr.match(/(\d+)\s*(?:GiB|GB)\b/i) || diskStr.match(/(\d+)/);
  if (!sizeMatch) {
    return diskStr.trim();
  }
  return `${sizeMatch[1]} GB ${diskType}`;
}

/**
 * Parses an executor count into a non-negative number with safe fallback.
 */
export function parseExecutorCount(
  value: string | number | null | undefined,
  fallback: number
): number {
  if (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}
