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
import { DEFAULT_LABEL_DETAIL } from '../utils/const';
import { Input } from '../controls/MuiWrappedInput';

const iconError = new LabIcon({
  name: 'launcher:error-icon',
  svgstr: errorIcon
});

function SparkProperties({
  labelDetail,
  setLabelDetail,
  labelDetailUpdated,
  setLabelDetailUpdated,
  // selectedJobClone,
  buttonText,
  keyValidation,
  setKeyValidation,
  valueValidation,
  setValueValidation,
  duplicateKeyError,
  setDuplicateKeyError
}: // labelEditMode,
// selectedRuntimeClone,
// batchInfoResponse,
// createBatch,
// fromPage,
// defaultValueAdded
any) {
  /*
  labelDetail used to store the permanent label details when onblur
  labelDetailUpdated used to store the temporay label details when onchange
  */

  const handleEditLabelSwitch = () => {
    if (duplicateKeyError === -1) {
      setLabelDetail(labelDetailUpdated);
    }
  };
  const handleEditLabel = (value: string, index: number, keyValue: string) => {
    const labelEdit = [...labelDetail];

    labelEdit.forEach((data, dataNumber: number) => {
      if (index === dataNumber) {
        /*
          allowed aplhanumeric and spaces and underscores
        */
        const regexp = /^[a-z0-9-_]+$/;
        if (keyValue === 'key') {
          if (
            (value.search(regexp) === -1 ||
              value.charAt(0) !== value.charAt(0).toLowerCase()) &&
            buttonText === 'ADD LABEL'
          ) {
            setKeyValidation(index);
          } else {
            setKeyValidation(-1);
          }

          // Check for duplicate key when editing
          const newKey = value;
          const duplicateIndex = labelEdit.findIndex(
            (label, i) => i !== index && label.split(':')[0] === newKey
          );
          if (duplicateIndex !== -1 && buttonText === 'ADD LABEL') {
            setDuplicateKeyError(index);
          } else {
            setDuplicateKeyError(-1);
          }

          data = data.replace(data.split(':')[0], value);
        } else {
          if (value.search(regexp) === -1 && buttonText === 'ADD LABEL') {
            setValueValidation(index);
          } else {
            setValueValidation(-1);
          }
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
                    <div className="select-text-overlay-label">
                      <Input
                        sx={{ margin: 0 }}
                        className={`edit-input-style ${
                          labelSplit[0] === '' ||
                          buttonText !== 'ADD LABEL' ||
                          duplicateKeyError !== -1
                            ? ''
                            : ' disable-text'
                        }`}
                        disabled={true}
                        onBlur={() => handleEditLabelSwitch()}
                        onChange={e =>
                          handleEditLabel(e.target.value, index, 'key')
                        }
                        defaultValue={labelSplit[0]}
                        Label={`Key ${index + 1}*`}
                      />
                    </div>

                    {labelDetailUpdated[index].split(':')[0] === '' &&
                    labelDetailUpdated[index] !== '' &&
                    duplicateKeyError !== index ? (
                      <div role="alert" className="error-key-parent">
                        <iconError.react
                          tag="div"
                          className="logo-alignment-style"
                        />
                        <div className="error-key-missing">key is required</div>
                      </div>
                    ) : (
                      keyValidation === index &&
                      buttonText === 'ADD LABEL' && (
                        <div className="error-key-parent">
                          <iconError.react
                            tag="div"
                            className="logo-alignment-style"
                          />
                          <div className="error-key-missing">
                            Only hyphens (-), underscores (_), lowercase
                            characters, and numbers are allowed. Keys must start
                            with a lowercase character. International characters
                            are allowed.
                          </div>
                        </div>
                      )
                    )}
                    {duplicateKeyError === index &&
                      buttonText === 'ADD LABEL' && (
                        <div className="error-key-parent">
                          <iconError.react
                            tag="div"
                            className="logo-alignment-style"
                          />
                          <div className="error-key-missing">
                            The key is already present
                          </div>
                        </div>
                      )}
                  </div>
                  <div className="key-message-wrapper">
                    <div className="select-text-overlay-label">
                      <Input
                        sx={{ margin: 0 }}
                        className={`edit-input-style ${
                          label === DEFAULT_LABEL_DETAIL &&
                          buttonText === 'ADD LABEL'
                            ? ' disable-text'
                            : ''
                        }`}
                        onBlur={() => handleEditLabelSwitch()}
                        onChange={e =>
                          handleEditLabel(e.target.value, index, 'value')
                        }
                        disabled={
                          label === DEFAULT_LABEL_DETAIL &&
                          buttonText === 'ADD LABEL'
                        }
                        defaultValue={
                          labelSplit.length > 2
                            ? labelSplit[1] + ':' + labelSplit[2]
                            : labelSplit[1]
                        }
                        Label={`Value ${index + 1}`}
                      />
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
