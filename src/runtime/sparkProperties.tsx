/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
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
import { TextField, MenuItem } from '@mui/material';
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
  defaultSchema = []
}: any) {
  const handleLabelDetailSelected = (
    data: string,
    index: number
  ) => {
    const labelEdit = [...labelDetailUpdated];
    if (labelEdit[index]) {
      const parts = labelEdit[index].split(':');
      parts[1] = data ? data.toString() : '';
      labelEdit[index] = parts.join(':');
    }
    setLabelDetail(labelEdit);
    setLabelDetailUpdated(labelEdit);
  };

  const handleEditLabelSwitch = () => {
    setLabelDetail(labelDetailUpdated);
  };

  const updateErrorIndexes = (index: number, hasError: boolean) => {
    let newErrorIndexes = { ...sparkValueValidation };
    newErrorIndexes[sparkSection] = [...newErrorIndexes[sparkSection]];
    const errorIndex = newErrorIndexes[sparkSection].indexOf(index);

    if (hasError && errorIndex === -1) {
      newErrorIndexes[sparkSection].push(index);
    } else if (!hasError && errorIndex !== -1) {
      newErrorIndexes[sparkSection].splice(errorIndex, 1);
    }

    setSparkValueValidation(newErrorIndexes);
  };

  const handleEditLabel = (
    section: string,
    value: string,
    index: number,
    keyValue: string
  ) => {
    const DISALLOWED_CHARS_REGEX = /[^a-z0-9_.]/g;
    value = value.replace(DISALLOWED_CHARS_REGEX, '');
    const labelEdit = [...labelDetailUpdated];

    if (labelEdit[index]) {
      const parts = labelEdit[index].split(':');
      const propertyKey = parts[0];

      parts[1] = value;
      labelEdit[index] = parts.join(':');

      if (value.trim() === '') {
        updateErrorIndexes(index, false);
        setLabelDetailUpdated(labelEdit);
        return;
      }

      if (MEMORY_RELATED_PROPERTIES.includes(propertyKey)) {
        const regex = /^(0*[1-9][0-9]*)(m|g|t)$/i;
        updateErrorIndexes(index, value.search(regex) === -1);
      } else if (DISK_RELATED_PROPERTIES.includes(propertyKey)) {
        const regex = /^(0*[1-9][0-9]*)(k|m|g|t)$/i;
        updateErrorIndexes(index, value.search(regex) === -1);
      } else if (CORE_RELATED_PROPERTIES.includes(propertyKey)) {
        if (
          value.includes('.') ||
          !Number.isInteger(Number(value)) ||
          Number(value) <= 0
        ) {
          updateErrorIndexes(index, true);
        } else {
          updateErrorIndexes(index, false);
        }
      } else if (EXECUTOR_RELATED_PROPERTIES.includes(propertyKey)) {
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
      } else if (propertyKey === 'spark.dynamicAllocation.initialExecutors') {
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
      } else if (propertyKey === 'spark.dynamicAllocation.minExecutors') {
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
        propertyKey === 'spark.dynamicAllocation.executorAllocationRatio'
      ) {
        if (
          value.length === 0 ||
          Number.isNaN(Number(value)) ||
          Number(value) < 0 ||
          Number(value) > 1
        ) {
          updateErrorIndexes(index, true);
        } else {
          updateErrorIndexes(index, false);
        }
      }
    }
    setLabelDetailUpdated(labelEdit);
  };

  return (
    <div>
      <div className="spark-property-parent">
        {labelDetail.length > 0 &&
          labelDetail.map((label: string, index: number) => {
            const labelSplit = label.split(':');
            const propertyKey = labelSplit[0];

            const draftLabel = labelDetailUpdated[index] || '';
            const draftColonIndex = draftLabel.indexOf(':');
            const userValue = draftColonIndex !== -1 ? draftLabel.substring(draftColonIndex + 1) : '';

            const matchDefault = defaultSchema.find((item: string) => item.startsWith(propertyKey + ':'));
            const placeholderValue = matchDefault ? matchDefault.split(':')[1] : '';

            const isBooleanOption =
              propertyKey.includes('.enabled') ||
              userValue === 'true' || userValue === 'false' ||
              placeholderValue === 'true' || placeholderValue === 'false';

            const currentOptions = isBooleanOption ? BOOLEAN_SELECT_OPTIONS : TIER_SELECT_OPTIONS;

            const selectedValue = userValue || placeholderValue || (currentOptions.length > 0 ? currentOptions[0].value : '');

            return (
              <div key={propertyKey}>
                <div className="job-label-edit-row">
                  <div className="key-message-wrapper">
                    <div
                      className="select-text-overlay-label"
                      title={propertyKey}
                    >
                      <Input
                        sx={{ margin: 0 }}
                        className={`edit-input-style`}
                        disabled={true}
                        onBlur={() => handleEditLabelSwitch()}
                        onChange={e =>
                          handleEditLabel(
                            sparkSection,
                            e.target.value,
                            index,
                            'key'
                          )
                        }
                        Label={`Key ${index + 1}*`}
                        value={propertyKey}
                        InputLabelProps={{ shrink: true }}
                      />
                    </div>
                  </div>
                  <div className="key-message-wrapper">
                    <div className="select-text-overlay-label">
                      {SELECT_FIELDS.includes(propertyKey) &&
                      sparkSection !== 'gpu' ? (
                        <TextField
                          select
                          fullWidth
                          variant="outlined"
                          className="edit-input-style"
                          value={selectedValue}
                          label={`Value ${index + 1}`}
                          InputLabelProps={{ shrink: true }}
                          SelectProps={{
                            displayEmpty: true
                          }}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            handleLabelDetailSelected(
                              e.target.value,
                              index
                            );
                          }}
                        >
                          {currentOptions.map((option: any) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.text || option.label || option.value}
                            </MenuItem>
                          ))}
                        </TextField>
                      ) : (
                        <TextField
                          fullWidth
                          size="medium"
                          variant="outlined"
                          className="edit-input-style"
                          onBlur={() => handleEditLabelSwitch()}
                          onChange={e =>
                            handleEditLabel(
                              sparkSection,
                              e.target.value,
                              index,
                              'value'
                            )
                          }
                          disabled={
                            propertyKey ===
                              'spark.dataproc.executor.compute.tier' ||
                            (sparkSection === 'metastore' && index === 2)
                          }
                          value={userValue}
                          placeholder={placeholderValue}
                          label={`Value ${index + 1}`}
                          InputLabelProps={{ shrink: true }}
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
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default SparkProperties;