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
  setGpuDetailChangeDone,
  metastoreKeyValidation,
  setMetastoreKeyValidation
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

  const handleEditLabel = (section:string, value: string, index: number, keyValue: string) => {
    const DISALLOWED_CHARS_REGEX = /[^a-z0-9_.]/g;
    value = value.replace(DISALLOWED_CHARS_REGEX, '');
    const labelEdit = [...labelDetailUpdated];
    labelEdit.forEach((data, dataNumber: number) => {
      if (index === dataNumber) {
        if (keyValue === 'value') {
          /*
            allowed alphanumeric and spaces and underscores values
          */
          let label = data.split(':')[0];
          if (MEMORY_RELATED_PROPERTIES.includes(label)) {
            const regex = /^(0*[1-9][0-9]*)(m|g|t)$/i;
            const isError = value.search(regex) === -1;
            updateErrorIndexes(index, isError);
          } else if (DISK_RELATED_PROPERTIES.includes(label)) {
            const regex = /^(0*[1-9][0-9]*)(k|m|g|t)$/i;
            const isError = value.search(regex) === -1;
            updateErrorIndexes(index, isError);
          } else if (CORE_RELATED_PROPERTIES.includes(label)) {
            const isError =
              value.includes('.') ||
              !Number.isInteger(Number(value)) ||
              Number(value) <= 0;
            updateErrorIndexes(index, isError);
          } else if (EXECUTOR_RELATED_PROPERTIES.includes(label)) {
            const isError =
              value.includes('.') ||
              !Number.isInteger(Number(value)) ||
              Number(value) < 2 ||
              Number(value) > 2000;
            updateErrorIndexes(index, isError);
          } else if (label === 'spark.dynamicAllocation.initialExecutors') {
            const isError =
              value.includes('.') ||
              !Number.isInteger(Number(value)) ||
              Number(value) < 2 ||
              Number(value) > 500;
            updateErrorIndexes(index, isError);
          } else if (label === 'spark.dynamicAllocation.minExecutors') {
            const isError =
              value.includes('.') ||
              !Number.isInteger(Number(value)) ||
              Number(value) < 2;
            updateErrorIndexes(index, isError);
          } else if (label === 'spark.dynamicAllocation.executorAllocationRatio') {
            const isError =
              value.length === 0 ||
              Number.isNaN(Number(value)) ||
              Number(value) < 0 ||
              Number(value) > 1;
            updateErrorIndexes(index, isError);
          }
          let sparkProperties = data.split(':');
          sparkProperties[1] = value.trim();
          data = sparkProperties[0] + ':' + sparkProperties[1];
        } else if (keyValue === 'key' && section === 'metastore') {
          const originalKey = data.split(':')[0];
          const valueKey = value.trim(); // The proposed new key
          const prefix = 'spark.sql.catalog.';
          const baseKeyPattern = /^spark\.sql\.catalog\.([a-z][a-z0-9_]*)$/i;
          let originalSuffix = '';
          if (originalKey.match(baseKeyPattern)) {
              originalSuffix = '';
          } else {
              const suffixMatch = originalKey.match(/(\.[a-z][a-z0-9_]*)$/i);
              originalSuffix = suffixMatch ? suffixMatch[0] : '';
          }
          const isPrefixPreserved = valueKey.startsWith(prefix);
          let isSuffixPreserved = valueKey.endsWith(originalSuffix) && valueKey.length >= prefix.length + originalSuffix.length
            && !(valueKey.endsWith('.') && valueKey !== prefix);

          let isValidChange = isPrefixPreserved && isSuffixPreserved;

          if (isValidChange) {
            let seperatorIndex = data.indexOf(':');
            let sparkProperties: string[] = [];
            sparkProperties[0] = valueKey;
            sparkProperties[1] = data.substring(seperatorIndex + 1);
            data = sparkProperties[0] + ':' + sparkProperties[1];
          }
        }
      }
      labelEdit[dataNumber] = data;
    });
    if (keyValue === 'key' && section === 'metastore') {
      let finalErrorIndexes: number[] = [];

      const consistencyCheck = checkAllMetastoreKeysForConsistency(labelEdit);
      finalErrorIndexes = consistencyCheck.inconsistentIndexes;
      
      let updatedValidationArray = metastoreKeyValidation.filter((item: number) => 
          !labelEdit[item].startsWith('spark.sql.catalog.')
      );

      updatedValidationArray = [...updatedValidationArray, ...finalErrorIndexes];

      // Remove duplicates and update state
      setMetastoreKeyValidation([...new Set(updatedValidationArray)]);
    }
    setLabelDetailUpdated(labelEdit);
  };
  
  const getCategoryName = (key: string): string | null => {
    const match = key.match(/^spark\.sql\.catalog\.([a-z][a-z0-9_]*)/);
    return match ? match[1] : null; 
  };

  const checkAllMetastoreKeysForConsistency = (labelEdit: string[]): { isConsistent: boolean, inconsistentIndexes: number[] } => {
    const catalogEntries = labelEdit
      .map((data, index) => ({
        index,
        key: data.split(':')[0].trim(),
      }))
      .filter(entry => entry.key.startsWith('spark.sql.catalog.'));

    if (catalogEntries.length === 0) {
      return { isConsistent: true, inconsistentIndexes: [] };
    }

    const firstEntry = catalogEntries[0];
    let requiredCategoryName = getCategoryName(firstEntry.key);

    if (!requiredCategoryName) {
      return { isConsistent: false, inconsistentIndexes: catalogEntries.map(e => e.index) };
    }

    const inconsistentIndexes: number[] = [];
    let isConsistent = true;

    for (const entry of catalogEntries) {
      const currentCategoryName = getCategoryName(entry.key);
      
      if (currentCategoryName !== requiredCategoryName) {
        isConsistent = false;
        inconsistentIndexes.push(entry.index);
      }
    }

    return { isConsistent, inconsistentIndexes };
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
            const originalKey = labelDetail[index].split(':')[0].trim(); // Get the original key

            let requiredSuffix = '';
            const baseKeyPattern = /^spark\.sql\.catalog\.([a-z][a-z0-9_]*)$/i;
            
            if (originalKey.startsWith('spark.sql.catalog.')) {
                if (!originalKey.match(baseKeyPattern)) {
                    const suffixMatch = originalKey.match(/(\.[a-z][a-z0-9_]*)$/i);
                    requiredSuffix = suffixMatch ? suffixMatch[0] : '';
                }
            }
            
            const dynamicPattern = `spark.sql.catalog.<catalog_name>${requiredSuffix}`;
            return (
              <div key={label}>
                <div className="job-label-edit-row">
                  <div className="key-message-wrapper">
                    <div
                      className="select-text-overlay-label"
                      title={labelDetailUpdated[index] ? labelDetailUpdated[index].substring(0,labelDetailUpdated[index].indexOf(':')) : ''}
                    >
                      <Input
                        sx={{ margin: 0 }}
                        className={`edit-input-style`}
                        disabled={ sparkSection !== 'metastore'}
                        onBlur={() => handleEditLabelSwitch()}
                        onChange={e =>
                          handleEditLabel(sparkSection,e.target.value, index, 'key')
                        }
                        inputProps={{ pattern: '^[a-zA-Z0-9_]*$' }}
                        Label={`Key ${index + 1}*`}
                        value={labelDetailUpdated[index] ? labelDetailUpdated[index].substring(0,labelDetailUpdated[index].indexOf(':')) : ''}
                      />
                    </div>
                    {metastoreKeyValidation?.includes(index) && (
                      <div className="error-key-parent">
                        <iconError.react
                          tag="div"
                          className="logo-alignment-style"
                        />
                        <div className="error-key-missing">
                          The key name should match this pattern : {dynamicPattern}
                          <br />
                          ** catalog_name must be identical across all Metastore properties.
                        </div>
                      </div>
                    )}
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
                            handleEditLabel(sparkSection,e.target.value, index, 'value')
                          }
                          disabled={
                            labelSplit[0] === 'spark.dataproc.executor.compute.tier' ||
                            (sparkSection === 'metastore' && index === 2)
                          }
                          value={labelDetailUpdated[index] ? labelDetailUpdated[index].substring(labelDetailUpdated[index].indexOf(':') + 1) : ''}
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
