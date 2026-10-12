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

/** Compute tier constant for Premium. */
export const TIER_PREMIUM = 'PREMIUM';
/** Compute tier constant for Standard. */
export const TIER_STANDARD = 'STANDARD';
/** Disk type constant for SSD (premium). */
export const DISK_TYPE_SSD = 'ssd';
/** Disk type constant for standard HDD. */
export const DISK_TYPE_STANDARD = 'standard';

/** Label for SSD premium disk type. */
export const MSG_DISK_TYPE_SSD_PREMIUM = 'SSD (premium)';
/** Label for HDD standard disk type. */
export const MSG_DISK_TYPE_HDD_STANDARD = 'HDD (standard)';
/** Label for Premium executor tier. */
export const MSG_EXECUTOR_TIER_PREMIUM = 'Premium';
/** Label for Premium tier with Lightning Engine enabled. */
export const MSG_EXECUTOR_TIER_PREMIUM_LIGHTNING =
  'Premium (Lightning Engine enabled)';
/** Label for Standard executor tier. */
export const MSG_EXECUTOR_TIER_STANDARD = 'Standard';

/** Machine shape constants */
export const MACHINE_SHAPE_HIGHMEM_4 = 'highmem-4';
export const MACHINE_SHAPE_STANDARD_4 = 'standard-4';
export const MACHINE_SHAPE_HIGHMEM_8 = 'highmem-8';
export const MACHINE_SHAPE_STANDARD_8 = 'standard-8';
export const MACHINE_SHAPE_HIGHMEM_16 = 'highmem-16';
export const MACHINE_SHAPE_STANDARD_16 = 'standard-16';
export const MACHINE_SHAPE_L4_4 = 'l4-4';
export const MACHINE_SHAPE_L4_8 = 'l4-8';
export const MACHINE_SHAPE_L4_12 = 'l4-12';
export const MACHINE_SHAPE_L4_16 = 'l4-16';
export const MACHINE_SHAPE_L4_24 = 'l4-24';
export const MACHINE_SHAPE_L4_48 = 'l4-48';
export const MACHINE_SHAPE_L4_96 = 'l4-96';
export const MACHINE_SHAPE_A100_40 = 'a100-40';
export const MACHINE_SHAPE_A100_40_12 = 'a100-40-12';
export const MACHINE_SHAPE_A100_80 = 'a100-80';
export const MACHINE_SHAPE_A100_80_12 = 'a100-80-12';

export type MachineShape =
  | typeof MACHINE_SHAPE_HIGHMEM_4
  | typeof MACHINE_SHAPE_STANDARD_4
  | typeof MACHINE_SHAPE_HIGHMEM_8
  | typeof MACHINE_SHAPE_STANDARD_8
  | typeof MACHINE_SHAPE_HIGHMEM_16
  | typeof MACHINE_SHAPE_STANDARD_16
  | typeof MACHINE_SHAPE_L4_4
  | typeof MACHINE_SHAPE_L4_8
  | typeof MACHINE_SHAPE_L4_12
  | typeof MACHINE_SHAPE_L4_16
  | typeof MACHINE_SHAPE_L4_24
  | typeof MACHINE_SHAPE_L4_48
  | typeof MACHINE_SHAPE_L4_96
  | typeof MACHINE_SHAPE_A100_40
  | typeof MACHINE_SHAPE_A100_40_12
  | typeof MACHINE_SHAPE_A100_80
  | typeof MACHINE_SHAPE_A100_80_12;

/**
 * Map of machine shapes to their human-readable display names.
 */
export const MACHINE_SHAPE_DISPLAY_NAMES: Record<string, string> = {
  [MACHINE_SHAPE_HIGHMEM_4]: 'highmem-4 (4 vCPU, 32 GB)',
  [MACHINE_SHAPE_STANDARD_4]: 'standard-4 (4 vCPU, 16 GB)',
  [MACHINE_SHAPE_HIGHMEM_8]: 'highmem-8 (8 vCPU, 64 GB)',
  [MACHINE_SHAPE_STANDARD_8]: 'standard-8 (8 vCPU, 32 GB)',
  [MACHINE_SHAPE_HIGHMEM_16]: 'highmem-16 (16 vCPU, 128 GB)',
  [MACHINE_SHAPE_STANDARD_16]: 'standard-16 (16 vCPU, 64 GB)',
  [MACHINE_SHAPE_L4_4]: 'l4-4 (4 vCPU, 16 GB, 1 GPU)',
  [MACHINE_SHAPE_L4_8]: 'l4-8 (8 vCPU, 32 GB, 1 GPU)',
  [MACHINE_SHAPE_L4_12]: 'l4-12 (12 vCPU, 48 GB, 1 GPU)',
  [MACHINE_SHAPE_L4_16]: 'l4-16 (16 vCPU, 64 GB, 1 GPU)',
  [MACHINE_SHAPE_L4_24]: 'l4-24 (24 vCPU, 96 GB, 2 GPUs)',
  [MACHINE_SHAPE_L4_48]: 'l4-48 (48 vCPU, 192 GB, 4 GPUs)',
  [MACHINE_SHAPE_L4_96]: 'l4-96 (96 vCPU, 384 GB, 8 GPUs)',
  [MACHINE_SHAPE_A100_40]: 'a100-40 (12 vCPU, 78 GB, 1 GPU)',
  [MACHINE_SHAPE_A100_40_12]: 'a100-40-12 (12 vCPU, 85 GB, 1 GPU)',
  [MACHINE_SHAPE_A100_80]: 'a100-80 (12 vCPU, 165 GB, 1 GPU)',
  [MACHINE_SHAPE_A100_80_12]: 'a100-80-12 (12 vCPU, 170 GB, 1 GPU)',
  'highcpu-4': 'highcpu-4 (4 vCPU, 8 GB)',
  'highcpu-8': 'highcpu-8 (8 vCPU, 16 GB)',
  'g2-standard-4': 'g2-standard-4 (4 vCPU, 16 GB, 1 NVIDIA L4)',
  'g2-standard-8': 'g2-standard-8 (8 vCPU, 32 GB, 1 NVIDIA L4)',
  'g2-standard-16': 'g2-standard-16 (16 vCPU, 64 GB, 1 NVIDIA L4)',
  'a2-highgpu-1g': 'a2-highgpu-1g (12 vCPU, 85 GB, 1 NVIDIA A100)'
};

export const SHAPE_MAP = MACHINE_SHAPE_DISPLAY_NAMES;
export const DEFAULT_EMPTY_DISPLAY_VALUE = '—';

/** Supported standard disk (HDD) sizes in GiB. */
export const HDD_SIZES = [
  200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500
];

/** Supported premium disk (SSD) sizes in GiB. */
export const SSD_SIZES = [375, 750, 1500];

/** Default executor count constants for summary display. */
export const DEFAULT_INITIAL_EXECUTORS = 2;
export const DEFAULT_MIN_EXECUTORS = 2;
export const DEFAULT_MAX_EXECUTORS = 1000;

/**
 * Validates and resolves a raw machine shape or formatted display label
 * (e.g. 'highmem-4 (4 vCPU, 32 GB)' or 'Standard-4') to its canonical key.
 */
export function normalizeMachineShapeKey(
  shape?: string | null
): string | undefined {
  if (!shape || typeof shape !== 'string') {
    return undefined;
  }
  const trimmed = shape.trim();
  if (!trimmed) {
    return undefined;
  }
  const lower = trimmed.toLowerCase();
  if (MACHINE_SHAPE_DISPLAY_NAMES[lower] !== undefined) {
    return lower;
  }
  const matchedDisplayEntry = Object.entries(MACHINE_SHAPE_DISPLAY_NAMES).find(
    ([, label]) => label.toLowerCase() === lower
  );
  if (matchedDisplayEntry) {
    return matchedDisplayEntry[0];
  }
  const patternMatch = lower.match(
    /^([a-z0-9]+(?:-[a-z0-9]+)+)(?:\s*\(.*\))?$/
  );
  if (
    patternMatch &&
    MACHINE_SHAPE_DISPLAY_NAMES[patternMatch[1]] !== undefined
  ) {
    return patternMatch[1];
  }
  return undefined;
}

/**
 * Returns a human-readable display name for the given machine shape,
 * or empty string when no shape is provided.
 */
export function getMachineTypeDisplayName(shape?: string | null): string {
  if (!shape || !shape.trim()) {
    return '';
  }
  if (MACHINE_SHAPE_DISPLAY_NAMES[shape]) {
    return MACHINE_SHAPE_DISPLAY_NAMES[shape];
  }
  const normalized = normalizeMachineShapeKey(shape);
  if (normalized && MACHINE_SHAPE_DISPLAY_NAMES[normalized]) {
    return MACHINE_SHAPE_DISPLAY_NAMES[normalized];
  }
  return shape;
}

/**
 * Formats a disk type and size into a human-readable summary string.
 */
export function formatDiskSummary(type?: string, sizeGb?: number): string {
  if (!type && !sizeGb) {
    return '';
  }
  const isSsd =
    type?.toLowerCase() === DISK_TYPE_SSD ||
    type?.toLowerCase().includes('ssd') ||
    type?.toLowerCase().includes('premium');
  const typeLabel = isSsd
    ? MSG_DISK_TYPE_SSD_PREMIUM
    : MSG_DISK_TYPE_HDD_STANDARD;
  if (!sizeGb) {
    return typeLabel;
  }
  return `${typeLabel}, ${sizeGb} GiB`;
}

/**
 * Formats a compact disk label for the Summary Executor node line,
 * or empty string when no disk string is provided.
 */
export function formatCompactDiskLabel(diskStr?: string): string {
  if (!diskStr || !diskStr.trim()) {
    return '';
  }
  const lower = diskStr.toLowerCase();
  const diskType =
    lower.includes('ssd') || lower.includes('premium') ? 'SSD' : 'HDD';
  const sizeMatch = diskStr.match(/(\d+)/);
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
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

