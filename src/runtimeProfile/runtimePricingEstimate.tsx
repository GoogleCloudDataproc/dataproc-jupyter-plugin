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
import {
  IRuntimePricingEstimateInput,
  IRuntimePricingEstimateResult
} from './runtimeProfileInterface';
import {
  DEFAULT_INITIAL_EXECUTORS,
  DEFAULT_MAX_EXECUTORS,
  DEFAULT_MIN_EXECUTORS,
  formatDcuNumber,
  getPricingAutoscalingRowMsg,
  getPricingAutoscalingSingleRowMsg,
  getPricingBaselineCaptionMsg,
  getPricingDcuRangeMsg,
  getPricingDcuValueMsg,
  getPricingExecutorRowMsg,
  getPricingHeroMsg,
  getShapeDcu,
  MSG_PRICING_ESTIMATE_DCU_HEADER,
  MSG_PRICING_ESTIMATE_DRIVER_NODE,
  MSG_PRICING_ESTIMATE_ITEM_HEADER,
  MSG_PRICING_ESTIMATE_SUBJECT_TO_AUTOSCALING,
  MSG_PRICING_ESTIMATE_TABLE_ARIA_LABEL,
  MSG_PRICING_ESTIMATE_TITLE,
  MSG_PRICING_ESTIMATE_TOTAL_BASELINE,
  parseExecutorCount
} from './runtimeProfileConstants';

/**
 * Computes the complete Dataproc Serverless Spark Runtime Profile pricing estimate.
 */
export function calculateRuntimePricingEstimate(
  input?: IRuntimePricingEstimateInput | null
): IRuntimePricingEstimateResult {
  const safeInput = input ?? {};
  const locale = safeInput.locale || 'en-US';
  const fmt = (val: number) => formatDcuNumber(val, locale);

  const executorDcu = getShapeDcu(safeInput.executorMachineType);
  const rawDriverShape =
    safeInput.driverMachineType?.trim() || safeInput.driverShape?.trim();
  const driverDcu = safeInput.useDifferentDriverConfig
    ? getShapeDcu(rawDriverShape)
    : executorDcu;

  const initialExecutors = parseExecutorCount(
    safeInput.initialExecutors,
    DEFAULT_INITIAL_EXECUTORS
  );

  const autoscalingEnabled = safeInput.autoscalingEnabled ?? true;

  const executorsBaselineDcu = initialExecutors * executorDcu;
  const baselineDcu = executorsBaselineDcu + driverDcu;

  const minRaw = parseExecutorCount(
    safeInput.minExecutors,
    DEFAULT_MIN_EXECUTORS
  );
  const maxRaw = parseExecutorCount(
    safeInput.maxExecutors,
    DEFAULT_MAX_EXECUTORS
  );

  const autoscalingBounds =
    minRaw >= maxRaw
      ? { min: maxRaw, max: maxRaw, isRange: false }
      : { min: minRaw, max: maxRaw, isRange: true };

  const hero = getPricingHeroMsg(fmt(baselineDcu));
  const baselineCaption = getPricingBaselineCaptionMsg(fmt(initialExecutors));

  const executorRowLabel = getPricingExecutorRowMsg(fmt(initialExecutors));
  const executorRowValue = getPricingDcuValueMsg(fmt(executorsBaselineDcu));

  const driverRowLabel = MSG_PRICING_ESTIMATE_DRIVER_NODE;
  const driverRowValue = getPricingDcuValueMsg(fmt(driverDcu));

  let autoscalingRowLabel: string | null = null;
  let autoscalingRowValue: string | null = null;

  if (autoscalingEnabled) {
    if (!autoscalingBounds.isRange) {
      autoscalingRowLabel = getPricingAutoscalingSingleRowMsg(
        fmt(autoscalingBounds.max)
      );
      autoscalingRowValue = getPricingDcuValueMsg(
        fmt(autoscalingBounds.max * executorDcu + driverDcu)
      );
    } else {
      autoscalingRowLabel = getPricingAutoscalingRowMsg(
        fmt(autoscalingBounds.min),
        fmt(autoscalingBounds.max)
      );
      autoscalingRowValue = getPricingDcuRangeMsg(
        fmt(autoscalingBounds.min * executorDcu + driverDcu),
        fmt(autoscalingBounds.max * executorDcu + driverDcu)
      );
    }
  }

  const totalRowLabel = MSG_PRICING_ESTIMATE_TOTAL_BASELINE;
  const totalRowValue = getPricingDcuValueMsg(fmt(baselineDcu));

  return {
    executorDcu,
    driverDcu,
    initialExecutors,
    autoscalingEnabled,
    executorsBaselineDcu,
    baselineDcu,
    autoscalingBounds,
    hero,
    baselineCaption,
    subjectToAutoscaling: autoscalingEnabled,
    executorRowLabel,
    executorRowValue,
    driverRowLabel,
    driverRowValue,
    autoscalingRowLabel,
    autoscalingRowValue,
    totalRowLabel,
    totalRowValue
  };
}

export interface IRuntimePricingEstimateProps {
  pricingInput: IRuntimePricingEstimateInput;
}

/**
 * Standalone Runtime Pricing Estimate component injected into CreateRuntimeProfileComponent.
 */
export const RuntimePricingEstimate: React.FC<IRuntimePricingEstimateProps> =
  React.memo(({ pricingInput }) => {
    const headingId = React.useId();
    const pricing = React.useMemo(
      () => calculateRuntimePricingEstimate(pricingInput),
      [pricingInput]
    );

    return (
      <section
        className="runtime-pricing-section"
        aria-labelledby={headingId}
        data-testid="runtime-pricing-estimate-section"
      >
        <div id={headingId} className="runtime-pricing-subtitle">
          {MSG_PRICING_ESTIMATE_TITLE}
        </div>
        <div className="runtime-pricing-hero" data-testid="pricing-hero">
          {pricing.hero}
        </div>
        <div className="runtime-pricing-caption" data-testid="pricing-caption">
          <div>{pricing.baselineCaption}</div>
          {pricing.subjectToAutoscaling && (
            <div data-testid="pricing-autoscaling-caption">
              {MSG_PRICING_ESTIMATE_SUBJECT_TO_AUTOSCALING}
            </div>
          )}
        </div>

        <table
          className="runtime-pricing-table"
          aria-label={MSG_PRICING_ESTIMATE_TABLE_ARIA_LABEL}
        >
          <thead>
            <tr>
              <th scope="col" className="runtime-pricing-th-item">
                {MSG_PRICING_ESTIMATE_ITEM_HEADER}
              </th>
              <th scope="col" className="runtime-pricing-th-dcu">
                {MSG_PRICING_ESTIMATE_DCU_HEADER}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr data-testid="pricing-executor-row">
              <td className="runtime-pricing-td-item">
                {pricing.executorRowLabel}
              </td>
              <td className="runtime-pricing-td-dcu">
                {pricing.executorRowValue}
              </td>
            </tr>
            <tr data-testid="pricing-driver-row">
              <td className="runtime-pricing-td-item">
                {pricing.driverRowLabel}
              </td>
              <td className="runtime-pricing-td-dcu">
                {pricing.driverRowValue}
              </td>
            </tr>
            {pricing.autoscalingRowLabel && pricing.autoscalingRowValue && (
              <tr data-testid="pricing-autoscaling-row">
                <td className="runtime-pricing-td-item">
                  {pricing.autoscalingRowLabel}
                </td>
                <td className="runtime-pricing-td-dcu">
                  {pricing.autoscalingRowValue}
                </td>
              </tr>
            )}
            <tr
              className="runtime-pricing-total-row"
              data-testid="pricing-total-row"
            >
              <th scope="row" className="runtime-pricing-td-item">
                {pricing.totalRowLabel}
              </th>
              <td className="runtime-pricing-td-dcu">
                {pricing.totalRowValue}
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    );
  });

RuntimePricingEstimate.displayName = 'RuntimePricingEstimate';
