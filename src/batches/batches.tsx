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

import { ReactWidget } from '@jupyterlab/apputils';
import React, { useState, useEffect } from 'react';
import {
  authApi,
  checkConfig,
  elapsedTime,
  jobTimeFormat,
  jobTypeDisplay
} from '../utils/utils';
import {
  API_HEADER_CONTENT_TYPE,
  BASE_URL,
  POLLING_TIME_LIMIT,
  API_HEADER_BEARER,
  LOGIN_STATE
} from '../utils/const';
import ListBatches from './listBatches';
import { LabIcon } from '@jupyterlab/ui-components';
import deleteIcon from '../../style/icons/delete_icon.svg';
import BatchDetails from './batchDetails';
import ListSessions from '../sessions/listSessions';
import { ClipLoader } from 'react-spinners';
import DeletePopup from '../utils/deletePopup';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { deleteBatchAPI } from '../utils/batchService';

const iconDelete = new LabIcon({
  name: 'launcher:delete-icon',
  svgstr: deleteIcon
});

const ServerlessComponent = (): React.JSX.Element => {
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
  const [timer, setTimer] = useState<NodeJS.Timer | undefined>(undefined);
  const pollingBatches = async (
    pollingFunction: () => void,
    pollingDisable: boolean
  ) => {
    if (pollingDisable) {
      clearInterval(timer);
    } else {
      setTimer(setInterval(pollingFunction, POLLING_TIME_LIMIT));
    }
  };

  const selectedModeChange = (mode: 'Sessions' | 'Batches') => {
    if (mode === 'Sessions') {
      pollingBatches(listBatchAPI, true);
    } else {
      pollingBatches(listBatchAPI, pollingDisable);
    }
    setSelectedMode(mode);
  };

  const listBatchAPI = async () => {
    const credentials = await authApi();
    if (credentials) {
      fetch(
        `${BASE_URL}/projects/${credentials.project_id}/locations/${credentials.region_id}/batches?orderBy=create_time desc&&pageSize=1000`,
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
            .then((responseResult: any) => {
              let transformBatchListData = [];
              transformBatchListData = responseResult.batches.map(
                (data: any) => {
                  const startTimeDisplay = jobTimeFormat(data.createTime);
                  const startTime = new Date(data.createTime);
                  const elapsedTimeString = elapsedTime(
                    data.stateTime,
                    startTime
                  );
                  const batchType = Object.keys(data).filter(key =>
                    key.endsWith('Batch')
                  );
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
              setBatchesList(transformBatchListData);
              setIsLoading(false);
              setLoggedIn(true);
            })
            .catch((e: Error) => {
              console.log(e);
              setIsLoading(false);
            });
        })
        .catch((err: Error) => {
          setIsLoading(false);
          console.error('Error listing batches', err);
          toast.error('Failed to fetch Batches');
        });
    }
  };
  const handleBatchDetails = (selectedName: string) => {
    pollingBatches(listBatchAPI, true);
    setBatchSelected(selectedName);
    setDetailedBatchView(true);
  };

  const handleDeleteBatch = (batch: string) => {
    setSelectedBatch(batch);
    setDeletePopupOpen(true);
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

  function renderActions(data: { name: string }) {
    return (
      <div className="actions-icon" role="button" aria-label="Delete Job">
        <div
          className="icon-buttons-style"
          title="Delete Batch"
          onClick={() => handleDeleteBatch(data.name.split('/')[5])}
        >
          <iconDelete.react tag="div" />
        </div>
      </div>
    );
  }

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
    if (!detailedBatchView && selectedMode === 'Batches') {
      pollingBatches(listBatchAPI, pollingDisable);
    }

    return () => {
      pollingBatches(listBatchAPI, true);
    };
  }, [pollingDisable, detailedBatchView, selectedMode]);

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
      {loggedIn ? (
        <>
          {detailedBatchView ? (
            <BatchDetails
              batchSelected={batchSelected}
              setDetailedBatchView={setDetailedBatchView}
            />
          ) : (
            <div className="clusters-list-component">
              {
                <div className="clusters-list-overlay" role="tab">
                  <div
                    className={toggleStyleSelection('Batches')}
                    onClick={() => selectedModeChange('Batches')}
                  >
                    Batches
                  </div>
                  <div
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
                  />
                )}
              </div>
              <ToastContainer />
            </div>
          )}
        </>
      ) : (
        loginError && (
          <div className="login-error">Please login to continue</div>
        )
      )}
      {configError && (
        <div className="login-error">
          Please Configure Gcloud with Account, Project ID and Region
        </div>
      )}
    </div>
  );
};

export class Serverless extends ReactWidget {
  constructor() {
    super();
    this.addClass('jp-ReactWidget');
  }

  render(): React.JSX.Element {
    return <ServerlessComponent />;
  }
}
