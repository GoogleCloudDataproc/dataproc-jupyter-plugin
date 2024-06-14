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
import { Select } from '../controls/MuiWrappedSelect';

const iconError = new LabIcon({
  name: 'launcher:error-icon',
  svgstr: errorIcon
});

function SparkProperties({
  labelDetail,
  setLabelDetail,
  labelDetailUpdated,
  setLabelDetailUpdated,
  valueValidation,
  setValueValidation,
  sparkSection
}: any) {
  /*
  labelDetail used to store the permanent label details when onblur
  labelDetailUpdated used to store the temporay label details when onchange
  */

  const selectFields = [
    'spark.dataproc.driver.disk.tier',
    'spark.dataproc.executor.disk.tier',
    'spark.dynamicAllocation.enabled',
    'spark.reducer.fetchMigratedShuffle.enabled'
  ];
  const booleanSelectOptions = [
    { key: 'true', value: 'true', text: 'true' },
    { key: 'false', value: 'false', text: 'false' }
  ];
  const tierSelectOptions = [
    { key: 'standard', value: 'standard', text: 'standard' },
    { key: 'premium', value: 'premium', text: 'premium' }
  ];

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
  const handleEditLabel = (value: string, index: number, keyValue: string) => {
    const labelEdit = [...labelDetail];

    labelEdit.forEach((data, dataNumber: number) => {
      if (index === dataNumber) {
        /*
          allowed aplhanumeric and spaces and underscores
        */
        // const regexp = /^[a-z0-9-_]+$/;

        // if (value.search(regexp) === -1) {
        //   setValueValidation(index);
        // } else {
        //   setValueValidation(-1);
        // }
        /*
          value is split from labels
          Example:"client:dataproc_jupyter_plugin"
          */
        if (data.split(':')[1] === '') {
          data = data + value;
        } else {
          data = data.replace(data.split(':')[1], value);
        }
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
                      {selectFields.includes(labelSplit[0]) &&
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
                              ? booleanSelectOptions
                              : tierSelectOptions
                          }
                        />
                      ) : (
                        <Input
                          sx={{ margin: 0 }}
                          className={`edit-input-style`}
                          onBlur={() => handleEditLabelSwitch()}
                          onChange={e =>
                            handleEditLabel(e.target.value, index, 'value')
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
                    {valueValidation === index && (
                      <div className="error-key-parent">
                        <iconError.react
                          tag="div"
                          className="logo-alignment-style"
                        />
                        <div className="error-key-missing">
                          Only hyphens (-), underscores (_), lowercase
                          characters, and numbers are allowed. International
                          characters are allowed.
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
