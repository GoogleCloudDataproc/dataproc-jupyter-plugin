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

/** Default executor count constants for summary display. */
export const DEFAULT_INITIAL_EXECUTORS = 2;
export const DEFAULT_MIN_EXECUTORS = 2;
export const DEFAULT_MAX_EXECUTORS = 1000;

/** Combined list of standard and accelerated machine types. */
export const ALL_MACHINE_TYPES: IMachineTypeOption[] = [
  ...DATAPROC_STANDARD_MACHINE_TYPES,
  ...DATAPROC_ACCELERATED_MACHINE_TYPES
];

/**
 * Display-only: maps a machine id (e.g. 'highmem-4') to its label; falls back to the raw value.
 */
export const getMachineTypeLabel = (
  machineName?: string
): string | undefined =>
  ALL_MACHINE_TYPES.find(m => m.name === machineName)?.label ?? machineName;

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
 * Parses an executor count into a non-negative integer with safe fallback.
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

