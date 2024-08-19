/**
 * @license
 * Copyright 2024 Google LLC
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
import { LabIcon } from '@jupyterlab/ui-components';
import errorIcon from '../../style/icons/error_icon.svg';
import { Input } from '../controls/MuiWrappedInput';
import { Select } from '../controls/MuiWrappedLabelSelect';
import {
  BOOLEAN_SELECT_OPTIONS,
  CORE_RELATED_PROPERTIES,
  DISK_RELATED_PROPERTIES,
  EXECUTOR_RELATED_PROPERTIES,
  MEMORY_RELATED_PROPERTIES,
  SELECT_FIELDS,
  TIER_SELECT_OPTIONS
} from '../utils/const';

const iconError = new LabIcon({
  name: 'launcher:error-icon',
  svgstr: errorIcon
});

function SparkProperties({
  labelDetail,
  setLabelDetail,
  labelDetailUpdated,
  setLabelDetailUpdated,
  sparkValueValidation,
  setSparkValueValidation,
  sparkSection,
  setGpuDetailChangeDone
}: any) {
  /*
  labelDetail used to store the permanent label details when onblur
  labelDetailUpdated used to store the temporay label details when onchange
  */
  const handleLabelDetailSelected = (
    event: React.SyntheticEvent<HTMLElement, Event>,
    data: string,
    index: number
  ) => {
    const labelEdit = [...labelDetail];

    labelEdit.forEach((labelData, dataNumber: number) => {
      if (index === dataNumber) {
        labelData = labelData.replace(
          labelData.split(':')[1],
          data!.toString()
        );
        labelEdit[dataNumber] = labelData;
      }
    });
    setLabelDetail(labelEdit);
    setLabelDetailUpdated(labelEdit);
  };

  const handleEditLabelSwitch = () => {
    setLabelDetail(labelDetailUpdated);
    if (sparkSection === 'gpu') {
      setGpuDetailChangeDone(false);
    }
  };

  const updateErrorIndexes = (index: number, hasError: boolean) => {
    let newErrorIndexes = { ...sparkValueValidation };

    // Ensure deep copy for the specific section
    newErrorIndexes[sparkSection] = [...newErrorIndexes[sparkSection]];

    const errorIndex = newErrorIndexes[sparkSection].indexOf(index);

    if (hasError && errorIndex === -1) {
      newErrorIndexes[sparkSection].push(index);
    } else if (!hasError && errorIndex !== -1) {
      newErrorIndexes[sparkSection].splice(errorIndex, 1);
    }

    setSparkValueValidation(newErrorIndexes);
  };

  const handleEditLabel = (value: string, index: number, keyValue: string) => {
    const labelEdit = [...labelDetail];

    labelEdit.forEach((data, dataNumber: number) => {
      if (index === dataNumber) {
        /*
          allowed aplhanumeric and spaces and underscores values
        */
        if (MEMORY_RELATED_PROPERTIES.includes(data.split(':')[0])) {
          const regex = /^(0*[1-9][0-9]*)(m|g|t)$/i;

          if (value.search(regex) === -1) {
            updateErrorIndexes(index, true);
          } else {
            updateErrorIndexes(index, false);
          }
        } else if (DISK_RELATED_PROPERTIES.includes(data.split(':')[0])) {
          const regex = /^(0*[1-9][0-9]*)(k|m|g|t)$/i;

          if (value.search(regex) === -1) {
            updateErrorIndexes(index, true);
          } else {
            updateErrorIndexes(index, false);
          }
        } else if (CORE_RELATED_PROPERTIES.includes(data.split(':')[0])) {
          if (
            value.includes('.') ||
            !Number.isInteger(Number(value)) ||
            Number(value) <= 0
          ) {
            updateErrorIndexes(index, true);
          } else {
            updateErrorIndexes(index, false);
          }
        } else if (EXECUTOR_RELATED_PROPERTIES.includes(data.split(':')[0])) {
          if (
            value.includes('.') ||
            !Number.isInteger(Number(value)) ||
            Number(value) < 2 ||
            Number(value) > 2000
          ) {
            updateErrorIndexes(index, true);
          } else {
            updateErrorIndexes(index, false);
          }
        } else if (
          data.split(':')[0] === 'spark.dynamicAllocation.initialExecutors'
        ) {
          if (
            value.includes('.') ||
            !Number.isInteger(Number(value)) ||
            Number(value) < 2 ||
            Number(value) > 500
          ) {
            updateErrorIndexes(index, true);
          } else {
            updateErrorIndexes(index, false);
          }
        } else if (
          data.split(':')[0] === 'spark.dynamicAllocation.minExecutors'
        ) {
          if (
            value.includes('.') ||
            !Number.isInteger(Number(value)) ||
            Number(value) < 2
          ) {
            updateErrorIndexes(index, true);
          } else {
            updateErrorIndexes(index, false);
          }
        } else if (
          data.split(':')[0] ===
          'spark.dynamicAllocation.executorAllocationRatio'
        ) {
          if (
            Number.isNaN(Number(value)) ||
            Number(value) < 0 ||
            Number(value) > 1
          ) {
            updateErrorIndexes(index, true);
          } else {
            updateErrorIndexes(index, false);
          }
        }
        /*
          value is split from labels
          Example:"client:dataproc_jupyter_plugin"
          */
        let sparkProperties = data.split(':');
        sparkProperties[1] = value.trim();
        data = sparkProperties[0] + ':' + sparkProperties[1];
      }
      labelEdit[dataNumber] = data;
    });
    setLabelDetailUpdated(labelEdit);
  };

  return (
    <div>
      <div className="spark-property-parent">
        {labelDetail.length > 0 &&
          labelDetail.map((label: string, index: number) => {
            /*
                     Extracting key, value from label
                      Example: "{client:dataProc_plugin}"
                  */
            const labelSplit = label.split(':');

            return (
              <div key={label}>
                <div className="job-label-edit-row">
                  <div className="key-message-wrapper">
                    <div
                      className="select-text-overlay-label"
                      title={labelSplit[0]}
                    >
                      <Input
                        sx={{ margin: 0 }}
                        className={`edit-input-style`}
                        disabled={true}
                        onBlur={() => handleEditLabelSwitch()}
                        onChange={e =>
                          handleEditLabel(e.target.value, index, 'key')
                        }
                        defaultValue={labelSplit[0]}
                        Label={`Key ${index + 1}*`}
                      />
                    </div>
                  </div>
                  <div className="key-message-wrapper">
                    <div className="select-text-overlay-label">
                      {SELECT_FIELDS.includes(labelSplit[0]) &&
                      sparkSection !== 'gpu' ? (
                        <Select
                          className="spark-properties-select-style"
                          value={labelSplit[1]}
                          onChange={(e, { value }) =>
                            handleLabelDetailSelected(e, value as string, index)
                          }
                          options={
                            labelSplit[1] === 'true' ||
                            labelSplit[1] === 'false'
                              ? BOOLEAN_SELECT_OPTIONS
                              : TIER_SELECT_OPTIONS
                          }
                          Label={`Value ${index + 1}`}
                        />
                      ) : (
                        <Input
                          sx={{ margin: 0 }}
                          className={`edit-input-style`}
                          onBlur={() => handleEditLabelSwitch()}
                          onChange={e =>
                            handleEditLabel(e.target.value, index, 'value')
                          }
                          disabled={
                            labelSplit[0] ===
                            'spark.dataproc.executor.compute.tier'
                              ? true
                              : false
                          }
                          defaultValue={
                            labelSplit.length > 2
                              ? labelSplit[1] + ':' + labelSplit[2]
                              : labelSplit[1]
                          }
                          Label={`Value ${index + 1}`}
                        />
                      )}
                    </div>
                    {sparkValueValidation[sparkSection].includes(index) && (
                      <div className="error-key-parent">
                        <iconError.react
                          tag="div"
                          className="logo-alignment-style"
                        />
                        <div className="error-key-missing">
                          Invalid value. Consult Dataproc documentation
                        </div>
                      </div>
                    )}
                  </div>
                  <></>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default SparkProperties;
