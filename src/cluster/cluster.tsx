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

import { LabIcon } from '@jupyterlab/ui-components';
import React, { useEffect, useRef, useState } from 'react';
import { ClipLoader } from 'react-spinners';
import restartIcon from '../../style/icons/restart_icon.svg';
import restartDisableIcon from '../../style/icons/restart_icon_disable.svg';
import startIcon from '../../style/icons/start_icon.svg';
import startDisableIcon from '../../style/icons/start_icon_disable.svg';
import stopIcon from '../../style/icons/stop_icon.svg';
import stopDisableIcon from '../../style/icons/stop_icon_disable.svg';
import JobComponent from '../jobs/jobs';
import { ClusterService } from './clusterServices';
import { ClusterStatus, LOGIN_STATE } from '../utils/const';
import PollingTimer from '../utils/pollingTimer';
import { checkConfig } from '../utils/utils';
import ClusterDetails from './clusterDetails';
import ListCluster from './listCluster';
import { DataprocWidget } from '../controls/DataprocWidget';

const iconStart = new LabIcon({
  name: 'launcher:start-icon',
  svgstr: startIcon
});
const iconStop = new LabIcon({
  name: 'launcher:stop-icon',
  svgstr: stopIcon
});
const iconRestart = new LabIcon({
  name: 'launcher:restart-icon',
  svgstr: restartIcon
});

const iconStartDisable = new LabIcon({
  name: 'launcher:start-disable-icon',
  svgstr: startDisableIcon
});
const iconStopDisable = new LabIcon({
  name: 'launcher:stop-disable-icon',
  svgstr: stopDisableIcon
});
const iconRestartDisable = new LabIcon({
  name: 'launcher:restart-disable-icon',
  svgstr: restartDisableIcon
});

const ClusterComponent = (): React.JSX.Element => {
  type Mode = 'Clusters' | 'Serverless' | 'Jobs';
  const [clustersList, setclustersList] = useState([]);
  const [detailedJobView, setDetailedJobView] = useState(false);
  const [submitJobView, setSubmitJobView] = useState(false);
  const [restartEnabled, setRestartEnabled] = useState(false);
  const [selectedMode, setSelectedMode] = useState<Mode>('Clusters');
  const [isLoading, setIsLoading] = useState(true);
  const [clusterSelected, setClusterSelected] = useState<string>('');
  const [pollingDisable, setPollingDisable] = useState(false);
  const [detailedView, setDetailedView] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [configError, setConfigError] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [projectId, setProjectId] = useState('');
  const timer = useRef<NodeJS.Timeout | undefined>(undefined);
  const [selectedJobClone, setSelectedJobClone] = useState({});

  const pollingClusters = async (
    pollingFunction: () => void,
    pollingDisable: boolean
  ) => {
    timer.current = PollingTimer(
      pollingFunction,
      pollingDisable,
      timer.current
    );
  };

  const selectedModeChange = (mode: Mode) => {
    setSelectedMode(mode);
  };
  const listClustersAPI = async () => {
    await ClusterService.listClustersAPIService(
      setProjectId,
      renderActions,
      setclustersList,
      setIsLoading,
      setLoggedIn
    );
  };

  const handleClusterDetails = (selectedName: string) => {
    pollingClusters(listClustersAPI, true);
    setClusterSelected(selectedName);
    setDetailedView(true);
  };

  const statusApi = async (selectedCluster: string) => {
    await ClusterService.statusApiService(
      selectedCluster,
      listClustersAPI,
      timer
    );
  };

  const restartClusterApi = async (selectedCluster: string) => {
    await ClusterService.restartClusterApiService(
      selectedCluster,
      setRestartEnabled,
      listClustersAPI,
      timer,
      statusApi
    );
  };

  const startButton = (data: {
    status: { state: ClusterStatus };
    clusterName: string;
  }) => {
    return (
      <div
        role="button"
        aria-disabled={
          data.status.state !== ClusterStatus.STATUS_STOPPED &&
          restartEnabled !== true
        }
        className={
          data.status.state === ClusterStatus.STATUS_STOPPED &&
          restartEnabled !== true
            ? 'icon-buttons-style'
            : 'icon-buttons-style-disable'
        }
        title="Start Cluster"
        onClick={
          data.status.state === ClusterStatus.STATUS_STOPPED && !restartEnabled
            ? () => ClusterService.startClusterApi(data.clusterName)
            : undefined
        }
      >
        {data.status.state === ClusterStatus.STATUS_STOPPED &&
        !restartEnabled ? (
          <iconStart.react
            tag="div"
            className="icon-white logo-alignment-style"
          />
        ) : (
          <iconStartDisable.react
            tag="div"
            className="icon-white logo-alignment-style"
          />
        )}
      </div>
    );
  };

  const stopButton = (data: {
    status: { state: ClusterStatus };
    clusterName: string;
  }) => {
    return (
      <div
        role="button"
        aria-disabled={data.status.state !== ClusterStatus.STATUS_RUNNING}
        className={
          data.status.state === ClusterStatus.STATUS_RUNNING
            ? 'icon-buttons-style'
            : 'icon-buttons-style-disable'
        }
        title="Stop Cluster"
        onClick={
          data.status.state === ClusterStatus.STATUS_RUNNING
            ? () => ClusterService.stopClusterApi(data.clusterName)
            : undefined
        }
      >
        {data.status.state === ClusterStatus.STATUS_RUNNING ? (
          <iconStop.react
            tag="div"
            className="icon-white logo-alignment-style"
          />
        ) : (
          <iconStopDisable.react
            tag="div"
            className="icon-white logo-alignment-style"
          />
        )}
      </div>
    );
  };

  const restartButton = (data: {
    status: { state: ClusterStatus };
    clusterName: string;
  }) => {
    return (
      <div
        role="button"
        aria-disabled={data.status.state !== ClusterStatus.STATUS_RUNNING}
        className={
          data.status.state === ClusterStatus.STATUS_RUNNING
            ? 'icon-buttons-style'
            : 'icon-buttons-style-disable'
        }
        title="Restart Cluster"
        onClick={
          data.status.state === ClusterStatus.STATUS_RUNNING
            ? () => restartClusterApi(data.clusterName)
            : undefined
        }
      >
        {data.status.state === ClusterStatus.STATUS_RUNNING ? (
          <iconRestart.react
            tag="div"
            className="icon-white logo-alignment-style"
          />
        ) : (
          <iconRestartDisable.react
            tag="div"
            className="icon-white logo-alignment-style"
          />
        )}
      </div>
    );
  };
  const renderActions = (data: {
    status: { state: ClusterStatus };
    clusterName: string;
  }) => {
    return (
      <div className="actions-icon">
        {startButton(data)}
        {stopButton(data)}
        {restartButton(data)}
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
    if (!pollingDisable) {
      listClustersAPI();
    }

    return () => {
      pollingClusters(listClustersAPI, true);
    };
  }, [pollingDisable, detailedView, selectedMode]);
  useEffect(() => {
    if (!detailedView && selectedMode === 'Clusters' && !isLoading) {
      pollingClusters(listClustersAPI, pollingDisable);
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
          Loading Clusters
        </div>
      )}
      {loggedIn && !configError ? (
        <>
          {detailedView && (
            <ClusterDetails
              clusterSelected={clusterSelected}
              setDetailedView={setDetailedView}
              detailedJobView={detailedJobView}
              setDetailedJobView={setDetailedJobView}
              submitJobView={submitJobView}
              clusterResponse={clustersList}
              selectedJobClone={selectedJobClone}
              setSelectedJobClone={setSelectedJobClone}
              setSubmitJobView={setSubmitJobView}
            />
          )}
          {!detailedView && (
            <div className="clusters-list-component" role="tablist">
              {!detailedJobView && !submitJobView && (
                <div className="clusters-list-overlay" role="tab">
                  <div
                    role="tabpanel"
                    className={toggleStyleSelection('Clusters')}
                    onClick={() => selectedModeChange('Clusters')}
                  >
                    Clusters
                  </div>
                  <div
                    role="tabpanel"
                    className={toggleStyleSelection('Jobs')}
                    onClick={() => selectedModeChange('Jobs')}
                  >
                    Jobs
                  </div>
                </div>
              )}
              <div>
                {selectedMode === 'Jobs' ? (
                  <JobComponent
                    fromPage="clusters"
                    detailedJobView={detailedJobView}
                    setDetailedJobView={setDetailedJobView}
                    submitJobView={submitJobView}
                    setSubmitJobView={setSubmitJobView}
                    setDetailedView={setDetailedView}
                    selectedJobClone={selectedJobClone}
                    setSelectedJobClone={setSelectedJobClone}
                  />
                ) : (
                  <ListCluster
                    clustersList={clustersList}
                    isLoading={isLoading}
                    setPollingDisable={setPollingDisable}
                    handleClusterDetails={handleClusterDetails}
                    project_id={projectId}
                  />
                )}
              </div>
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
          Please configure gcloud with account, project-id and region
        </div>
      )}
    </div>
  );
};

export class Cluster extends DataprocWidget {
  renderInternal(): React.JSX.Element {
    return <ClusterComponent />;
  }
}
