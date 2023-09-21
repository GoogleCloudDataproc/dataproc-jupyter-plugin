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

import React, { useState, useEffect, useRef } from 'react';
import { LabIcon } from '@jupyterlab/ui-components';
import LeftArrowIcon from '../../style/icons/left_arrow_icon.svg';
import CloneJobIcon from '../../style/icons/clone_job_icon.svg';
import ViewLogs from '../utils/viewLogs';
import DeleteClusterIcon from '../../style/icons/delete_cluster_icon.svg';
import { ClipLoader } from 'react-spinners';
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  BASE_URL,
  DATAPROC_CLUSTER_KEY,
  DATAPROC_CLUSTER_LABEL,
  BATCH_FIELDS_EXCLUDED,
  METASTORE_SERVICE_KEY,
  METASTORE_SERVICE_LABEL,
  NETWORK_KEY,
  NETWORK_LABEL,
  NETWORK_TAGS_KEY,
  NETWORK_TAGS_LABEL,
  SERVICE_ACCOUNT_KEY,
  SERVICE_ACCOUNT_LABEL,
  SPARK_HISTORY_SERVER,
  SPARK_HISTORY_SERVER_KEY,
  SUBNETWORK_KEY,
  SUBNETWORK_LABEL
} from '../utils/const';
import {
  BatchTypeValue,
  IBatchInfoResponse,
  authApi,
  batchDetailsOptionalDisplay,
  convertToDCUHours,
  convertToGBMonths,
  elapsedTime,
  jobTimeFormat,
  statusMessageBatch,
  toastifyCustomStyle
} from '../utils/utils';
import DeletePopup from '../utils/deletePopup';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { deleteBatchAPI } from '../utils/batchService';
import { statusDisplay } from '../utils/statusDisplay';
import PollingTimer from '../utils/pollingTimer';
import CreateBatch from './createBatch';

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
  setCreateBatchView: (flag: boolean) => void;
};

function BatchDetails({
  batchSelected,
  setDetailedBatchView,
  setCreateBatchView
}: BatchDetailsProps) {
  const [batchInfoResponse, setBatchInfoResponse] = useState({
    uuid: '',
    state: '',
    createTime: '',
    runtimeInfo: {
      endpoints: {},
      approximateUsage: { milliDcuSeconds: '', shuffleStorageGbSeconds: '' }
    },
    creator: '',
    runtimeConfig: {
      version: '',
      containerImage: '',
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
      mainClass: '',
      jarFileUris: ''
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
        subnetworkUri: '',
        networkTags: [],
        kmsKey: ''
      },
      peripheralsConfig: {
        metastoreService: '',
        sparkHistoryServerConfig: {
          dataprocCluster: ''
        }
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
  const [projectName, setProjectName] = useState('');
  const [createBatch, setCreateBatch] = useState(false);

  const timer = useRef<NodeJS.Timeout | undefined>(undefined);

  const pollingBatchDetails = async (
    pollingFunction: () => void,
    pollingDisable: boolean
  ) => {
    timer.current = PollingTimer(
      pollingFunction,
      pollingDisable,
      timer.current
    );
  };

  const handleDetailedBatchView = () => {
    pollingBatchDetails(getBatchDetails, true);
    setDetailedBatchView(false);
  };

  useEffect(() => {
    getBatchDetails();
    pollingBatchDetails(getBatchDetails, false);

    return () => {
      pollingBatchDetails(getBatchDetails, true);
    };
  }, []);
  interface IBatchDetailsResponse {
    uuid: '',
    state: '',
    createTime: '',
    runtimeInfo: {
      endpoints: {},
      approximateUsage: { milliDcuSeconds: '', shuffleStorageGbSeconds: '' }
    },
    creator: '',
    runtimeConfig: {
      version: '',
      containerImage: '',
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
      mainClass: '',
      jarFileUris: ''
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
        subnetworkUri: '',
        networkTags: [],
        kmsKey: ''
      },
      peripheralsConfig: {
        metastoreService: '',
        sparkHistoryServerConfig: {
          dataprocCluster: ''
        }
      }
    },
    stateHistory: [{ state: '', stateStartTime: '' }],
    stateTime: '',
    labels:{}
    }
    
  
  const getBatchDetails = async () => {
    const credentials = await authApi();
    if (credentials) {
      setRegionName(credentials.region_id || '');
      setProjectName(credentials.project_id || '');
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
            .then((responseResult: IBatchDetailsResponse) => {
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
          toast.error(
            `Failed to fetch batch details ${batchSelected}`,
            toastifyCustomStyle
          );
        });
    }
  };

  const statusMsg = statusMessageBatch(batchInfoResponse);
  const startTime = jobTimeFormat(batchInfoResponse.createTime);
  const startTimeElapsed = new Date(batchInfoResponse.createTime);

  const endTime = new Date(batchInfoResponse.stateTime);

  let jobStartTime: Date;
  let runTimeString = '';

  if (batchInfoResponse.stateHistory) {
    const lastStateHistory =
      batchInfoResponse.stateHistory[batchInfoResponse.stateHistory.length - 1];
    jobStartTime = new Date(lastStateHistory.stateStartTime);
    runTimeString = elapsedTime(endTime, jobStartTime);
  }

  const batch = BatchTypeValue(batchInfoResponse);
  const batchConcat = Object.keys(batchInfoResponse).filter(key =>
    key.endsWith('Batch')
  );
  const elapsedTimeString = elapsedTime(
    new Date(batchInfoResponse.stateTime),
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
  const handleCloneBatch = async (batchInfoResponse: IBatchInfoResponse) => {
    setCreateBatch(true);
  };
  
  return (
    <div>
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
      {createBatch && (
        <CreateBatch
          setCreateBatch={setCreateBatch}
          regionName={regionName}
          projectName={projectName}
          batchInfoResponse={batchInfoResponse}
          createBatch={createBatch}
        />
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

      {!createBatch && batchInfoResponse.uuid !== '' && (
        <div className="scroll-comp-batchdetails">
          <div className="cluster-details-header scroll-fix-header">
            <div
              role="button"
              className="back-arrow-icon"
              onClick={() => handleDetailedBatchView()}
            >
              <iconLeftArrow.react tag="div" className="logo-alignment-style" />
            </div>
            <div className="cluster-details-title">{batchSelected}</div>
            <div
              role="button"
              className="action-cluster-section"
              onClick={() => handleCloneBatch(batchInfoResponse)}
            >
              <div className="action-cluster-icon">
                <iconCloneJob.react
                  tag="div"
                  className="logo-alignment-style"
                />
              </div>
              <div className="action-cluster-text">CLONE</div>
            </div>

            <div
              role="button"
              className="action-cluster-section"
              onClick={() => handleDeleteBatch(batchSelected)}
            >
              <div className="action-cluster-icon">
                <iconDeleteCluster.react
                  tag="div"
                  className="logo-alignment-style"
                />
              </div>
              <div className="action-cluster-text">DELETE</div>
            </div>
            <ViewLogs batchInfoResponse={batchInfoResponse} />
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

            {
              //@ts-ignore string used as index
              Object.keys(batchInfoResponse[batchConcat]).map(
                (titleData: string) => {
                  //@ts-ignore string used as index
                  const valueData = batchInfoResponse[batchConcat][titleData];
                  return (
                    !BATCH_FIELDS_EXCLUDED.includes(titleData) && (
                      <>
                        <div className="row-details">
                          <div className="details-label">
                            {batchDetailsOptionalDisplay(titleData)}
                          </div>
                          {typeof valueData === 'string' ? (
                            <div className="details-value">{valueData}</div>
                          ) : (
                            valueData.length > 0 &&
                            !BATCH_FIELDS_EXCLUDED.includes(titleData) && (
                              <div className="details-value">
                                {valueData.map((item: string) => {
                                  return <div>{item}</div>;
                                })}
                              </div>
                            )
                          )}
                        </div>
                        {titleData === 'queryVariables' &&
                          //@ts-ignore string used as index
                          batchInfoResponse[batchConcat] &&
                          //@ts-ignore string used as index
                          batchInfoResponse[batchConcat][titleData] &&
                          Object.entries(
                            //@ts-ignore string used as index
                            batchInfoResponse[batchConcat][titleData]
                          ).map(([key, value]) => (
                            <div className="row-details" key={key}>
                              <div className="batch-details-label-level-one">
                                {key}
                              </div>
                              <div className="details-value">
                                {value as string}
                              </div>
                            </div>
                          ))}
                      </>
                    )
                  );
                }
              )
            }
            {batchInfoResponse.runtimeConfig.containerImage && (
              <div className="row-details">
                <div className="details-label">Image</div>
                <div className="details-value">
                  {batchInfoResponse.runtimeConfig.containerImage}
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
            {batchInfoResponse &&
              batchInfoResponse?.runtimeInfo?.endpoints &&
              //@ts-ignore string used as index
              batchInfoResponse?.runtimeInfo?.endpoints[
                SPARK_HISTORY_SERVER
              ] && (
                <div>
                  <div className="row-details">
                    <div className="details-label">End Points</div>
                    <div className="details-value"></div>
                  </div>
                  <div className="row-details">
                    <div className="batch-details-label-level-one">
                      {SPARK_HISTORY_SERVER}
                    </div>
                    <div className="details-value">
                      {
                        //@ts-ignore string used as index
                        batchInfoResponse.runtimeInfo.endpoints[
                          SPARK_HISTORY_SERVER
                        ]
                      }
                    </div>
                  </div>
                </div>
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
            {Object.entries(
              batchInfoResponse.environmentConfig.executionConfig
            ).map(([key, value]) => {
              let label;
              if (key === SERVICE_ACCOUNT_KEY) {
                label = SERVICE_ACCOUNT_LABEL;
              } else if (key === NETWORK_KEY) {
                label = NETWORK_LABEL;
              } else if (key === SUBNETWORK_KEY) {
                label = SUBNETWORK_LABEL;
              } else if (key === NETWORK_TAGS_KEY) {
                label = NETWORK_TAGS_LABEL;
              } else {
                label = '';
              }
              if (
                key === SERVICE_ACCOUNT_KEY ||
                key === NETWORK_KEY ||
                key === SUBNETWORK_KEY
              ) {
                return (
                  <div className="row-details" key={key}>
                    <div className="batch-details-label-level-two">{label}</div>
                    <div className="details-value">{value}</div>
                  </div>
                );
              } else if (key === NETWORK_TAGS_KEY) {
                return (
                  <div className="row-details" key={key}>
                    <div className="batch-details-label-level-two">{label}</div>
                    <div className="details-value">
                      {
                        //@ts-ignore value type issue
                        value.map((item: string) => {
                          return <div>{item}</div>;
                        })
                      }
                    </div>
                  </div>
                );
              }
            })}

            {(batchInfoResponse?.environmentConfig?.peripheralsConfig
              ?.metastoreService ||
              batchInfoResponse?.environmentConfig?.peripheralsConfig
                ?.sparkHistoryServerConfig?.dataprocCluster) && (
              <div className="row-details">
                <div className="batch-details-label-level-one">
                  Peripherals config
                </div>
                <div className="details-value"></div>
              </div>
            )}
            {Object.entries(
              batchInfoResponse.environmentConfig.peripheralsConfig
            ).map(([key, value]) => {
              let label;
              if (key === METASTORE_SERVICE_KEY) {
                label = METASTORE_SERVICE_LABEL;
              } else if (key === SPARK_HISTORY_SERVER_KEY) {
                label = SPARK_HISTORY_SERVER;
              } else {
                label = '';
              }
              <div className="row-details">
                <div className="batch-details-label-level-one">
                  Peripherals config
                </div>
                <div className="details-value"></div>
              </div>;
              if (key === METASTORE_SERVICE_KEY) {
                return (
                  <div className="row-details" key={key}>
                    <div className="batch-details-label-level-two">{label}</div>
                    <div className="details-value">
                      {
                        batchInfoResponse.environmentConfig.peripheralsConfig[
                          METASTORE_SERVICE_KEY
                        ]
                      }
                    </div>
                  </div>
                );
              } else if (
                key === SPARK_HISTORY_SERVER_KEY &&
                batchInfoResponse?.environmentConfig?.peripheralsConfig
                  ?.sparkHistoryServerConfig?.dataprocCluster
              ) {
                return (
                  <div>
                    <div className="row-details" key={key}>
                      <div className="batch-details-label-level-two">
                        {label}
                      </div>
                    </div>
                    <div className="row-details" key={DATAPROC_CLUSTER_KEY}>
                      <div className="batch-details-label-level-three">
                        {DATAPROC_CLUSTER_LABEL}
                      </div>
                      <div className="details-value">
                        {
                          batchInfoResponse.environmentConfig.peripheralsConfig
                            .sparkHistoryServerConfig[DATAPROC_CLUSTER_KEY]
                        }
                      </div>
                    </div>
                  </div>
                );
              }
            })}

            <div className="row-details">
              <div className="details-label">Encryption type</div>
              <div className="details-value">
                {batchInfoResponse?.environmentConfig?.executionConfig?.kmsKey
                  ? 'Customer-managed'
                  : 'Google-managed'}
              </div>
            </div>
            {batchInfoResponse?.environmentConfig?.executionConfig?.kmsKey && (
              <div className="row-details">
                <div className="details-label">Encryption key</div>
                <div className="details-value">
                  {batchInfoResponse.environmentConfig.executionConfig.kmsKey}
                </div>
              </div>
            )}
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
