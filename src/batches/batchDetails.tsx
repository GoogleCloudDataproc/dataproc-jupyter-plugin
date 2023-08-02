/**
 * @license
 * Copyright 2023 Google LLC
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

import React, { useState, useEffect } from 'react';
import { LabIcon } from '@jupyterlab/ui-components';
import LeftArrowIcon from '../../style/icons/left_arrow_icon.svg';
import CloneJobIcon from '../../style/icons/clone_job_icon.svg';
import ViewLogs from '../utils/viewLogs';
import DeleteClusterIcon from '../../style/icons/delete_cluster_icon.svg';

import { ClipLoader } from 'react-spinners';
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  BASE_URL
} from '../utils/const';
import {
  BatchTypeValue,
  authApi,
  convertToDCUHours,
  convertToGBMonths,
  elapsedTime,
  jobTimeFormat,
  statusMessageBatch
} from '../utils/utils';
import DeletePopup from '../utils/deletePopup';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { deleteBatchAPI } from '../utils/batchService';
import { statusDisplay } from '../utils/statusDisplay';

const iconLeftArrow = new LabIcon({
  name: 'launcher:left-arrow-icon',
  svgstr: LeftArrowIcon
});
const iconCloneJob = new LabIcon({
  name: 'launcher:clone-job-icon',
  svgstr: CloneJobIcon
});
const iconDeleteCluster = new LabIcon({
  name: 'launcher:delete-cluster-icon',
  svgstr: DeleteClusterIcon
});

type BatchDetailsProps = {
  batchSelected: string;
  setDetailedBatchView: (flag: boolean) => void;
};

function BatchDetails({
  batchSelected,
  setDetailedBatchView
}: BatchDetailsProps) {
  const [batchInfoResponse, setBatchInfoResponse] = useState({
    uuid: '',
    state: '',
    createTime: '',
    runtimeInfo: {
      approximateUsage: { milliDcuSeconds: '', shuffleStorageGbSeconds: '' }
    },
    creator: '',
    runtimeConfig: {
      version: '',
      properties: {
        'spark:spark.executor.instances': '',
        'spark:spark.driver.cores': '',
        'spark:spark.driver.memory': '',
        'spark:spark.executor.cores': '',
        'spark:spark.executor.memory': '',
        'spark:spark.dynamicAllocation.executorAllocationRatio': '',
        'spark:spark.app.name': ''
      }
    },
    sparkBatch: {
      mainJarFileUri: '',
      mainClass: ''
    },
    pysparkBatch: {
      mainPythonFileUri: ''
    },
    sparkRBatch: {
      mainRFileUri: ''
    },
    sparkSqlBatch: {
      queryFileUri: ''
    },
    environmentConfig: {
      executionConfig: {
        serviceAccount: '',
        subnetworkUri: ''
      }
    },
    stateHistory: [{ state: '', stateStartTime: '' }],
    stateTime: ''
  });
  const [regionName, setRegionName] = useState('');
  const [labelDetail, setLabelDetail] = useState(['']);
  const [isLoading, setIsLoading] = useState(true);
  const [deletePopupOpen, setDeletePopupOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState('');

  const handleDetailedBatchView = () => {
    setDetailedBatchView(false);
  };

  useEffect(() => {
    getBatchDetails();
  }, []);
  const getBatchDetails = async () => {
    const credentials = await authApi();
    if (credentials) {
      setRegionName(credentials.region_id || '');
      fetch(
        `${BASE_URL}/projects/${credentials.project_id}/locations/${credentials.region_id}/batches/${batchSelected}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      )
        .then((response: Response) => {
          response
            .json()
            .then((responseResult: any) => {
              setBatchInfoResponse(responseResult);
              if (responseResult.labels) {
                const labelValue = Object.entries(responseResult.labels).map(
                  ([key, value]) => `${key}:${value}`
                );
                setLabelDetail(labelValue);
              }
              setIsLoading(false);
            })
            .catch((e: Error) => {
              console.log(e);
              setIsLoading(false);
            });
        })
        .catch((err: Error) => {
          setIsLoading(false);
          console.error('Error in getting Batch details', err);
          toast.error('Failed to fetch Batch details');
        });
    }
  };

  const statusMsg = statusMessageBatch(batchInfoResponse);
  const startTime = jobTimeFormat(batchInfoResponse.createTime);
  const startTimeElapsed = new Date(batchInfoResponse.createTime);
  const endTime = batchInfoResponse.stateTime;
  let jobStartTime;
  let runTimeString = '';
  if (batchInfoResponse.stateHistory) {
    jobStartTime = new Date(
      batchInfoResponse.stateHistory[
        batchInfoResponse.stateHistory.length - 1
      ].stateStartTime
    );
    runTimeString = elapsedTime(endTime, jobStartTime);
  }
  const batch = BatchTypeValue(batchInfoResponse);

  const elapsedTimeString = elapsedTime(
    batchInfoResponse.stateTime,
    startTimeElapsed
  );

  const handleDeleteBatch = (batchSelected: string) => {
    setSelectedBatch(batchSelected);
    setDeletePopupOpen(true);
  };
  const handleCancelDelete = () => {
    setDeletePopupOpen(false);
  };

  const handleDelete = async () => {
    await deleteBatchAPI(selectedBatch);
    handleDetailedBatchView();
    setDeletePopupOpen(false);
  };

  return (
    <div>
      <ToastContainer />
      {batchInfoResponse.uuid === '' && (
        <div className="loader-full-style">
          {isLoading && (
            <div>
              <ClipLoader
                color="#8A8A8A"
                loading={true}
                size={20}
                aria-label="Loading Spinner"
                data-testid="loader"
              />
              Loading Batch Details
            </div>
          )}
        </div>
      )}
      {deletePopupOpen && (
        <DeletePopup
          onCancel={() => handleCancelDelete()}
          onDelete={() => handleDelete()}
          deletePopupOpen={deletePopupOpen}
          DeleteMsg={
            'This will delete ' + selectedBatch + ' and cannot be undone.'
          }
        />
      )}
      {batchInfoResponse.uuid !== '' && (
        <div className="scroll-comp">
          <div className="cluster-details-header">
            <div
              className="back-arrow-icon"
              onClick={() => handleDetailedBatchView()}
            >
              <iconLeftArrow.react tag="div" />
            </div>
            <div className="cluster-details-title">{batchSelected}</div>
            <div className="action-disabled action-cluster-section">
              <div className="action-cluster-icon">
                <iconCloneJob.react tag="div" />
              </div>
              <div className="action-cluster-text">CLONE</div>
            </div>

            <div
              className="action-cluster-section"
              onClick={() => handleDeleteBatch(batchSelected)}
            >
              <div className="action-cluster-icon">
                <iconDeleteCluster.react tag="div" />
              </div>
              <div className="action-cluster-text">DELETE</div>
            </div>
            <ViewLogs batchInfoResponse={batchInfoResponse}/>
          </div>

          <div className="batch-details-container-top">
            <div className="row-details"></div>
            <div className="row-details">
              <div className="details-label">Batch ID</div>
              <div className="details-value">{batchSelected}</div>
            </div>
            <div className="row-details">
              <div className="details-label">Batch UUID</div>
              <div className="details-value">{batchInfoResponse.uuid}</div>
            </div>
            <div className="row-details">
              <div className="details-label">Resource type</div>
              <div className="details-value">Batch</div>
            </div>
            <div className="row-details">
              <div className="details-label">Status</div>
              {statusDisplay(statusMsg)}
            </div>
          </div>
          <div className="cluster-details-header">
            <div className="cluster-details-title">Details</div>
          </div>
          <div className="batch-details-container">
            <div className="row-details">
              <div className="details-label">Start time</div>
              <div className="details-value">{startTime}</div>
            </div>
            <div className="row-details">
              <div className="details-label">Elapsed time</div>
              <div className="details-value">{elapsedTimeString}</div>
            </div>
            {runTimeString !== '' && (
            <div className="row-details">
              <div className="details-label">Run time</div>
              <div className="details-value">{runTimeString}</div>
            </div>
            )}
            {batchInfoResponse.runtimeInfo.approximateUsage &&
              batchInfoResponse.runtimeInfo.approximateUsage
                .milliDcuSeconds && (
                <div className="row-details">
                  <div className="details-label">Approximate DCU usage</div>
                  <div className="details-value">
                    {convertToDCUHours(
                      batchInfoResponse.runtimeInfo.approximateUsage
                        .milliDcuSeconds
                    )}
                  </div>
                </div>
              )}
            {batchInfoResponse.runtimeInfo.approximateUsage &&
              batchInfoResponse.runtimeInfo.approximateUsage
                .shuffleStorageGbSeconds && (
                <div className="row-details">
                  <div className="details-label">
                    Approximate shuffle storage usage
                  </div>
                  <div className="details-value">
                    {convertToGBMonths(
                      batchInfoResponse.runtimeInfo.approximateUsage
                        .shuffleStorageGbSeconds
                    )}
                  </div>
                </div>
              )}
            <div className="row-details">
              <div className="details-label">Creator</div>
              <div className="details-value">{batchInfoResponse.creator}</div>
            </div>
            <div className="row-details">
              <div className="details-label">Version</div>
              <div className="details-value">
                {batchInfoResponse.runtimeConfig.version}
              </div>
            </div>
            <div className="row-details">
              <div className="details-label">Region</div>
              <div className="details-value">{regionName}</div>
            </div>
            <div className="row-details">
              <div className="details-label">Batch type</div>
              <div className="details-value">{batch}</div>
            </div>
            {batch === 'Spark' && batchInfoResponse.sparkBatch.mainJarFileUri && (
              <div className="row-details">
                <div className="details-label">Main jar</div>
                <div className="details-value">
                  {batchInfoResponse.sparkBatch.mainJarFileUri}
                </div>
              </div>
            )}
            {batch === 'Spark' && batchInfoResponse.sparkBatch.mainClass && (
              <div className="row-details">
                <div className="details-label">Main Class</div>
                <div className="details-value">
                  {batchInfoResponse.sparkBatch.mainClass}
                </div>
              </div>
            )}
            {batch === 'PySpark' && (
              <div className="row-details">
                <div className="details-label">Main python file</div>
                <div className="details-value">
                  {batchInfoResponse.pysparkBatch.mainPythonFileUri}
                </div>
              </div>
            )}
            {batch === 'SparkR' && (
              <div className="row-details">
                <div className="details-label">Main R file</div>
                <div className="details-value">
                  {batchInfoResponse.sparkRBatch.mainRFileUri}
                </div>
              </div>
            )}
            {batch === 'SparkSQL' && (
              <div className="row-details">
                <div className="details-label">Query file</div>
                <div className="details-value">
                  {batchInfoResponse.sparkSqlBatch.queryFileUri}
                </div>
              </div>
            )}
            <div className="row-details">
              <div className="details-label">Properties</div>
              <div className="details-value"></div>
            </div>
            {Object.entries(batchInfoResponse.runtimeConfig.properties).map(
              ([key, value]) => (
                <div className="row-details" key={key}>
                  <div className="batch-details-label-level-one">{key}</div>
                  <div className="details-value">{value}</div>
                </div>
              )
            )}
            <div className="row-details">
              <div className="details-label">Environment config</div>
              <div className="details-value"></div>
            </div>
            <div className="row-details">
              <div className="batch-details-label-level-one">
                Execution config
              </div>
              <div className="details-value"></div>
            </div>
            <div className="row-details">
              <div className="batch-details-label-level-two">
                Service account
              </div>
              <div className="details-value">
                {
                  batchInfoResponse.environmentConfig.executionConfig
                    .serviceAccount
                }
              </div>
            </div>
            <div className="row-details">
              <div className="batch-details-label-level-two">Sub network</div>
              <div className="details-value">
                {
                  batchInfoResponse.environmentConfig.executionConfig
                    .subnetworkUri
                }
              </div>
            </div>

            <div className="row-details">
              <div className="details-label">Encryption type</div>
              <div className="details-value">Google-managed key</div>
            </div>
            <div className="batch-details-row-label">
              <div className="details-label">Labels</div>
              <div className="details-value">
                <div className="job-label-style-parent">
                  {labelDetail.length > 0
                    ? labelDetail.map(label => {
                        const labelParts = label.split(':');
                        return (
                          <div key={label} className="job-label-style">
                            {labelParts[0]} : {labelParts[1]}
                          </div>
                        );
                      })
                    : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BatchDetails;
