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
import {
  authApi,
  checkConfig,
  elapsedTime,
  jobTimeFormat,
  jobTypeDisplay,
  toastifyCustomStyle
} from '../utils/utils';
import {
  API_HEADER_CONTENT_TYPE,
  BASE_URL,
  API_HEADER_BEARER,
  LOGIN_STATE,
  BatchStatus
} from '../utils/const';
import ListBatches from './listBatches';
import { LabIcon } from '@jupyterlab/ui-components';
import deleteIcon from '../../style/icons/delete_icon.svg';
import BatchDetails from './batchDetails';
import ListSessions from '../sessions/listSessions';
import { ClipLoader } from 'react-spinners';
import DeletePopup from '../utils/deletePopup';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { deleteBatchAPI } from '../utils/batchService';
import CreateBatch from './createBatch';
import PollingTimer from '../utils/pollingTimer';
import { DataprocWidget } from '../controls/DataprocWidget';

const iconDelete = new LabIcon({
  name: 'launcher:delete-icon',
  svgstr: deleteIcon
});

const BatchesComponent = (): React.JSX.Element => {
  const [batchesList, setBatchesList] = useState([]);
  const [selectedMode, setSelectedMode] = useState('Batches');
  const [isLoading, setIsLoading] = useState(true);
  const [batchSelected, setBatchSelected] = useState('');
  const [pollingDisable, setPollingDisable] = useState(false);
  const [detailedBatchView, setDetailedBatchView] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [configError, setConfigError] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);

  const [deletePopupOpen, setDeletePopupOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [regionName, setRegionName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [createBatchView, setCreateBatchView] = useState(false);
  const timer = useRef<NodeJS.Timeout | undefined>(undefined);
  const pollingBatches = async (
    pollingFunction: () => void,
    pollingDisable: boolean
  ) => {
    timer.current = PollingTimer(
      pollingFunction,
      pollingDisable,
      timer.current
    );
  };

  const selectedModeChange = (mode: 'Sessions' | 'Batches') => {
    setSelectedMode(mode);
  };
  interface IBatchData {
    name: string;
    state: BatchStatus;
    createTime: string;
    stateTime: Date;
  }
  interface IBatchListResponse {
    batches: IBatchData[];
    nextPageToken?: string;
  }

  const listBatchAPI = async (
    nextPageToken?: string,
    previousBatchesList?: object
  ) => {
    const credentials = await authApi();
    const pageToken = nextPageToken ?? '';
    if (credentials) {
      setRegionName(credentials.region_id || '');
      setProjectName(credentials.project_id || '');
      fetch(
        `${BASE_URL}/projects/${credentials.project_id}/locations/${credentials.region_id}/batches?orderBy=create_time desc&&pageSize=50&pageToken=${pageToken}`,
        {
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      )
        .then((response: Response) => {
          response
            .json()
            .then((responseResult: IBatchListResponse) => {
              let transformBatchListData: {
                batchID: string;
                status: string;
                location: string;
                creationTime: string;
                type: string | undefined;
                elapsedTime: string;
                actions: React.JSX.Element;
              }[] = [];
              if (responseResult && responseResult.batches) {
                transformBatchListData = responseResult.batches.map(
                  (data: IBatchData) => {
                    const startTimeDisplay = jobTimeFormat(data.createTime);
                    const startTime = new Date(data.createTime);
                    const elapsedTimeString = elapsedTime(
                      data.stateTime,
                      startTime
                    );
                    const batchType = Object.keys(data).filter(key =>
                      key.endsWith('Batch')
                    );
                    /*
                     Extracting batchID, location from batchInfo.name
                      Example: "projects/{project}/locations/{location}/batches/{batchID}"
                    */
                    const batchTypeDisplay = jobTypeDisplay(
                      batchType[0].split('Batch')[0]
                    );
                    return {
                      batchID: data.name.split('/')[5],
                      status: data.state,
                      location: data.name.split('/')[3],
                      creationTime: startTimeDisplay,
                      type: batchTypeDisplay,
                      elapsedTime: elapsedTimeString,
                      actions: renderActions(data)
                    };
                  }
                );
              }

              const existingBatchData = previousBatchesList ?? [];
             
              
              let allBatchesData: any = [
                ...(existingBatchData as []),
                ...transformBatchListData
              ];

              if (responseResult.nextPageToken) {
                listBatchAPI(responseResult.nextPageToken, allBatchesData);
              } else {
                setBatchesList(allBatchesData);
                setIsLoading(false);
                setLoggedIn(true);
              }
            })
            .catch((e: Error) => {
              console.log(e);
              setIsLoading(false);
            });
        })
        .catch((err: Error) => {
          setIsLoading(false);
          console.error('Error listing batches', err);
          toast.error('Failed to fetch batches', toastifyCustomStyle);
        });
    }
  };
  const handleBatchDetails = (selectedName: string) => {
    pollingBatches(listBatchAPI, true);
    setBatchSelected(selectedName);
    setDetailedBatchView(true);
  };
  const handleDeleteBatch = (data: IBatchData) => {
    if (data.state !== BatchStatus.STATUS_PENDING) {
      /*
      Extracting project id  
      Example: "projects/{project}/locations/{location}/batches/{batch_id}"
      */
      setSelectedBatch(data.name.split('/')[5]);
      setDeletePopupOpen(true);
    }
  };
  const handleCancelDelete = () => {
    setDeletePopupOpen(false);
  };

  const handleDelete = async () => {
    await deleteBatchAPI(selectedBatch);
    listBatchAPI();
    setDetailedBatchView(false);
    setDeletePopupOpen(false);
  };

  const renderActions = (data: IBatchData) => {
    return (
      <div
        className="actions-icon"
        role="button"
        aria-label="Delete Job"
        aria-disabled={data.state === BatchStatus.STATUS_PENDING}
      >
        <div
          className={
            data.state === BatchStatus.STATUS_PENDING
              ? 'icon-buttons-style-delete-batch-disable'
              : 'icon-buttons-style-delete-batch'
          }
          title="Delete Batch"
          onClick={() => handleDeleteBatch(data)}
        >
          {data.state === BatchStatus.STATUS_PENDING ? (
            <iconDelete.react
              tag="div"
              className="logo-alignment-style icon-delete"
            />
          ) : (
            <iconDelete.react tag="div" className="logo-alignment-style" />
          )}
        </div>
      </div>
    );
  };

  const toggleStyleSelection = (toggleItem: string) => {
    if (selectedMode === toggleItem) {
      return 'selected-header';
    } else {
      return 'unselected-header';
    }
  };

  useEffect(() => {
    checkConfig(setLoggedIn, setConfigError, setLoginError);
    const localstorageGetInformation = localStorage.getItem('loginState');
    setLoggedIn(localstorageGetInformation === LOGIN_STATE);
    if (loggedIn) {
      setConfigLoading(false);
    }
    listBatchAPI();

    return () => {
      pollingBatches(listBatchAPI, true);
    };
  }, [pollingDisable, detailedBatchView, selectedMode]);
  useEffect(() => {
    if (!detailedBatchView && selectedMode === 'Batches' && !isLoading) {
      pollingBatches(listBatchAPI, pollingDisable);
    }
  }, [isLoading]);
  return (
    <div className="component-level">
      {configLoading && !loggedIn && !configError && !loginError && (
        <div className="spin-loaderMain">
          <ClipLoader
            color="#8A8A8A"
            loading={true}
            size={18}
            aria-label="Loading Spinner"
            data-testid="loader"
          />
          Loading Batches
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
      {loggedIn && !configError ? (
        <>
          {detailedBatchView && (
            <BatchDetails
              batchSelected={batchSelected}
              setDetailedBatchView={setDetailedBatchView}
              setCreateBatchView={setCreateBatchView}
            />
          )}
          {createBatchView && (
            <CreateBatch
              setCreateBatchView={setCreateBatchView}
              regionName={regionName}
              projectName={projectName}
            />
          )}

          {!detailedBatchView && !createBatchView && (
            <div className="clusters-list-component" role="tablist">
              {
                <div className="clusters-list-overlay" role="tab">
                  <div
                    role="tabpanel"
                    className={toggleStyleSelection('Batches')}
                    onClick={() => selectedModeChange('Batches')}
                  >
                    Batches
                  </div>
                  <div
                    role="tabpanel"
                    className={toggleStyleSelection('Sessions')}
                    onClick={() => selectedModeChange('Sessions')}
                  >
                    Sessions
                  </div>
                </div>
              }
              <div>
                {selectedMode === 'Sessions' ? (
                  <ListSessions />
                ) : (
                  <ListBatches
                    batchesList={batchesList}
                    isLoading={isLoading}
                    setPollingDisable={setPollingDisable}
                    listBatchAPI={listBatchAPI}
                    handleBatchDetails={handleBatchDetails}
                    setCreateBatchView={setCreateBatchView}
                    createBatchView={createBatchView}
                  />
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        loginError && (
          <div role="alert" className="login-error">
            Please login to continue
          </div>
        )
      )}
      {configError && (
        <div role="alert" className="login-error">
          Please configure gcloud with account, project-id and region
        </div>
      )}
    </div>
  );
};

export class Batches extends DataprocWidget {
  renderInternal(): React.JSX.Element {
    return <BatchesComponent />;
  }
}
