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
import { checkConfig } from '../utils/utils';
import { LOGIN_STATE, BatchStatus } from '../utils/const';
import ListBatches from './listBatches';
import { LabIcon } from '@jupyterlab/ui-components';
import deleteIcon from '../../style/icons/delete_icon.svg';
import BatchDetails from './batchDetails';
import ListSessions from '../sessions/listSessions';
import { ClipLoader } from 'react-spinners';
import DeletePopup from '../utils/deletePopup';
import 'react-toastify/dist/ReactToastify.css';
import { BatchService } from './batchService';
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

  const listBatchAPI = async () => {
    await BatchService.listBatchAPIService(
      setRegionName,
      setProjectName,
      renderActions,
      setBatchesList,
      setIsLoading,
      setLoggedIn
    );
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
    await BatchService.deleteBatchAPIService(selectedBatch);
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
              className="icon-white logo-alignment-style icon-delete"
            />
          ) : (
            <iconDelete.react
              tag="div"
              className="icon-white logo-alignment-style"
            />
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
              color="#3367d6"
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
