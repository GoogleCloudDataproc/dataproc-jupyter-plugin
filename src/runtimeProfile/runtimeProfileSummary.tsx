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

import React from 'react';
import { ISectionProperty } from '../controls/SectionDetail';
import { IRuntimeProfileSummaryInput } from './runtimeProfileInterface';
import {
  DEFAULT_EMPTY_DISPLAY_VALUE,
  DEFAULT_INITIAL_EXECUTORS,
  DEFAULT_MAX_EXECUTORS,
  DEFAULT_MIN_EXECUTORS,
  formatCompactDiskLabel,
  getMachineTypeDisplayName,
  MSG_EXECUTOR_TIER_PREMIUM,
  MSG_EXECUTOR_TIER_PREMIUM_LIGHTNING,
  MSG_EXECUTOR_TIER_STANDARD,
  normalizeMachineShapeKey,
  parseExecutorCount,
  TIER_PREMIUM
} from './runtimeProfileConstants';

/**
 * Formats the 7 rows of the Runtime Profile Summary section to match the UI design.
 */
export function formatRuntimeProfileSummaryProperties(
  input: IRuntimeProfileSummaryInput = {}
): ISectionProperty[] {
  // 1. Profile tier
  const isPremium =
    (input.tier || '').toUpperCase() === TIER_PREMIUM ||
    input.tier === 'Premium';
  const tierLabel = isPremium
    ? input.lightningEngineEnabled !== false
      ? MSG_EXECUTOR_TIER_PREMIUM_LIGHTNING
      : MSG_EXECUTOR_TIER_PREMIUM
    : MSG_EXECUTOR_TIER_STANDARD;

  // 2. Region
  const regionValue =
    input.regionDisplayName && input.regionDisplayName.trim() !== ''
      ? input.regionDisplayName
      : DEFAULT_EMPTY_DISPLAY_VALUE;

  // 3. Version
  const versionValue = input.runtimeVersion || DEFAULT_EMPTY_DISPLAY_VALUE;

  // 4. Executor node
  const autoscalingEnabled = input.autoscalingEnabled ?? true;
  const minExec = parseExecutorCount(
    input.minExecutors,
    DEFAULT_MIN_EXECUTORS
  );
  const maxExec = parseExecutorCount(
    input.maxExecutors,
    DEFAULT_MAX_EXECUTORS
  );
  const initExec = parseExecutorCount(
    input.initialExecutors,
    DEFAULT_INITIAL_EXECUTORS
  );

  const executorDisplayName = getMachineTypeDisplayName(
    input.executorMachineType || ''
  );
  const compactDisk = formatCompactDiskLabel(input.executorDisk);
  const executorTarget = [executorDisplayName, compactDisk]
    .filter(Boolean)
    .join(', ');
  const executorPrefix = autoscalingEnabled
    ? `Min: ${minExec}, Max: ${maxExec}`
    : `${initExec}`;

  const executorNodeValue = executorTarget
    ? `${executorPrefix} x ${executorTarget}`
    : executorPrefix;

  // 5. Driver node
  const normalizedDriverShape = normalizeMachineShapeKey(
    input.driverMachineType
  );
  const normalizedExecutorShape = normalizeMachineShapeKey(
    input.executorMachineType
  );
  const isSameDriver =
    input.separateDriverConfig === false ||
    (!input.separateDriverConfig &&
      (!input.driverMachineType ||
        normalizedDriverShape === normalizedExecutorShape));

  const driverDisplayName = getMachineTypeDisplayName(input.driverMachineType);
  const driverDiskLabel = formatCompactDiskLabel(
    input.driverDisk || input.executorDisk
  );
  const driverParts = [driverDisplayName, driverDiskLabel].filter(Boolean);
  const driverNodeValue = isSameDriver
    ? 'Same as executor'
    : driverParts.length > 0
    ? driverParts.join(', ')
    : DEFAULT_EMPTY_DISPLAY_VALUE;

  // 6. Autoscaling
  const autoscalingValue = autoscalingEnabled
    ? `Enabled (Min: ${minExec}, Max: ${maxExec})`
    : 'Disabled';

  // 7. Metastore
  const rawMetastore = input.metastore || '';
  const metastoreValue =
    rawMetastore !== 'None' && input.projectId
      ? `${rawMetastore} (${input.projectId})`
      : rawMetastore || DEFAULT_EMPTY_DISPLAY_VALUE;

  return [
    { label: 'Profile tier', value: tierLabel },
    { label: 'Region', value: regionValue },
    { label: 'Version', value: versionValue },
    { label: 'Executor node', value: executorNodeValue },
    { label: 'Driver node', value: driverNodeValue },
    { label: 'Autoscaling', value: autoscalingValue },
    { label: 'Metastore', value: metastoreValue }
  ];
}

export interface IRuntimeProfileSummaryProps {
  summaryInput: IRuntimeProfileSummaryInput;
}

/**
 * Standalone Runtime Profile Summary component injected into CreateRuntimeProfileComponent.
 */
export const RuntimeProfileSummary: React.FC<IRuntimeProfileSummaryProps> =
  React.memo(({ summaryInput }) => {
    const summaryRows = React.useMemo(
      () => formatRuntimeProfileSummaryProperties(summaryInput),
      [summaryInput]
    );

    return (
      <div
        className="runtime-summary-section"
        data-testid="runtime-profile-summary-section"
      >
        <div className="runtime-summary-title">Summary</div>
        <div className="runtime-summary-list">
          {summaryRows.map(row => (
            <div className="runtime-summary-row" key={row.label}>
              <div className="runtime-summary-label">{row.label}</div>
              <div className="runtime-summary-value">{row.value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  });

RuntimeProfileSummary.displayName = 'RuntimeProfileSummary';
