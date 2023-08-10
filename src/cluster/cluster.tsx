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
import JobComponent from '../jobs/jobs';
import ClusterDetails from './clusterDetails';
import { authApi, checkConfig, statusValue } from '../utils/utils';
import { LabIcon } from '@jupyterlab/ui-components';
import startIcon from '../../style/icons/start_icon.svg';
import stopIcon from '../../style/icons/stop_icon.svg';
import restartIcon from '../../style/icons/restart_icon.svg';
import startDisableIcon from '../../style/icons/start_icon_disable.svg';
import stopDisableIcon from '../../style/icons/stop_icon_disable.svg';
import restartDisableIcon from '../../style/icons/restart_icon_disable.svg';
import {
  API_HEADER_CONTENT_TYPE,
  BASE_URL,
  POLLING_TIME_LIMIT,
  // STATUS_RUNNING,
  // STATUS_STOPPED,
  API_HEADER_BEARER,
  LOGIN_STATE,
  ClusterStatus
} from '../utils/const';
import ListCluster from './listCluster';
import { ClipLoader } from 'react-spinners';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { startClusterApi, stopClusterApi } from '../utils/clusterServices';

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
  const [clusterResponse, setClusterResponse] = useState([]);
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
  const [timer, setTimer] = useState<NodeJS.Timer | undefined>(undefined);
  const [selectedJobClone, setSelectedJobClone] = useState({});

  const pollingClusters = async (
    pollingFunction: () => void,
    pollingDisable: boolean
  ) => {
    if (pollingDisable) {
      clearInterval(timer);
    } else {
      setTimer(setInterval(pollingFunction, POLLING_TIME_LIMIT));
    }
  };

  const selectedModeChange = (mode: Mode) => {
    if (mode === 'Jobs') {
      pollingClusters(listClustersAPI, true);
    } else {
      pollingClusters(listClustersAPI, pollingDisable);
    }
    setSelectedMode(mode);
  };
  const listClustersAPI = async (
    nextPageToken?: string,
    previousClustersList?: object
  ) => {
    const credentials = await authApi();
    const pageToken = nextPageToken ?? '';
    if (credentials) {
      setProjectId(credentials.project_id || '');
      fetch(
        `${BASE_URL}/projects/${credentials.project_id}/regions/${credentials.region_id}/clusters?pageSize=50&pageToken=${pageToken}`,
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
              let transformClusterListData = [];
              if (responseResult && responseResult.clusters) {
              setClusterResponse(responseResult);
              transformClusterListData = responseResult.clusters.map(
                (data: any) => {
                  const statusVal = statusValue(data);
                   /*
                     Extracting zone from zoneUri
                      Example: "projects/{project}/zones/{zone}"
                  */
                  const zoneUri = data.config.gceClusterConfig.zoneUri.split('/');
                 
                
                  return {
                    clusterUuid: data.clusterUuid,
                    status: statusVal,
                    clusterName: data.clusterName,
                    clusterImage: data.config.softwareConfig.imageVersion,
                    region: data.labels['goog-dataproc-location'],
                    zone: zoneUri[
                      zoneUri.length - 1
                    ],
                    totalWorkersNode: data.config.workerConfig
                      ? data.config.workerConfig.numInstances
                      : 0,
                    schedulesDeletion: data.config.lifecycleConfig
                      ? 'On'
                      : 'Off',
                    actions: renderActions(data)
                  };
                }
              );
              const existingClusterData = previousClustersList ?? [];
              //setStateAction never type issue
              let allClustersData: any = [
                ...(existingClusterData as []),
                ...transformClusterListData
              ];

              if (responseResult.nextPageToken) {
                listClustersAPI(responseResult.nextPageToken, allClustersData);
              } else {
                setclustersList(allClustersData);
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
          console.error('Error listing clusters', err);
          toast.error('Failed to fetch Clusters ');
        });
    }
  };
  const handleClusterDetails = (selectedName: string) => {
    pollingClusters(listClustersAPI, true);
    setClusterSelected(selectedName);
    setDetailedView(true);
  };

  const statusApi = async (selectedcluster: string) => {
    const credentials = await authApi();
    if (credentials) {
      await fetch(
        `${BASE_URL}/projects/${credentials.project_id}/regions/${credentials.region_id}/clusters/${selectedcluster}`,
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
            .then(
              (responseResult: {
                status: { state: ClusterStatus };
                clusterName: string;
              }) => {
                if (
                  responseResult.status.state === ClusterStatus.STATUS_STOPPED
                ) {
                  startClusterApi(selectedcluster);
                  clearInterval(timer);
                }
              }
            )
            .catch((e: Error) => console.log(e));
        })
        .catch((err: Error) => {
          console.error('Error fetching status', err);
          toast.error('Failed to Fetch the Status');
        });

      listClustersAPI();
    }
  };

  const restartClusterApi = async (selectedcluster: string) => {
    setRestartEnabled(true);
    const credentials = await authApi();
    if (credentials) {
      fetch(
        `${BASE_URL}/projects/${credentials.project_id}/regions/${credentials.region_id}/clusters/${selectedcluster}:stop`,
        {
          method: 'POST',
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      )
        .then((response: Response) => {
          response
            .json()
            .then((responseResult: Response) => {
              console.log(responseResult);
              listClustersAPI();
              setTimer(
                setInterval(() => {
                  statusApi(selectedcluster);
                }, POLLING_TIME_LIMIT)
              );
            })
            .catch((e: Error) => console.log(e));
        })
        .catch((err: Error) => {
          console.error('Error restarting cluster', err);
          toast.error('Failed to Restart the Cluster');
        });

      listClustersAPI();
      setRestartEnabled(false);
    }
  };

  function startButton(data: {
    status: { state: ClusterStatus };
    clusterName: string;
  }) {
    return (
      <div
        className={
          data.status.state === ClusterStatus.STATUS_STOPPED &&
          restartEnabled !== true
            ? 'icon-buttons-style'
            : 'icon-buttons-style-disable'
        }
        title="Start Cluster"
        onClick={
          data.status.state === ClusterStatus.STATUS_STOPPED
            ? () => startClusterApi(data.clusterName)
            : undefined
        }
      >
        {data.status.state === ClusterStatus.STATUS_STOPPED ? (
          <iconStart.react tag="div" />
        ) : (
          <iconStartDisable.react tag="div" />
        )}
      </div>
    );
  }

  function stopButton(data: {
    status: { state: ClusterStatus };
    clusterName: string;
  }) {
    return (
      <div
        className={
          data.status.state === ClusterStatus.STATUS_RUNNING
            ? 'icon-buttons-style'
            : 'icon-buttons-style-disable'
        }
        title="Stop Cluster"
        onClick={
          data.status.state === ClusterStatus.STATUS_RUNNING
            ? () => stopClusterApi(data.clusterName)
            : undefined
        }
      >
        {data.status.state === ClusterStatus.STATUS_RUNNING ? (
          <iconStop.react tag="div" />
        ) : (
          <iconStopDisable.react tag="div" />
        )}
      </div>
    );
  }

  function restartButton(data: {
    status: { state: ClusterStatus };
    clusterName: string;
  }) {
    return (
      <div
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
          <iconRestart.react tag="div" />
        ) : (
          <iconRestartDisable.react tag="div" />
        )}
      </div>
    );
  }
  function renderActions(data: {
    status: { state: ClusterStatus };
    clusterName: string;
  }) {
    return (
      <div className="actions-icon">
        {startButton(data)}
        {stopButton(data)}
        {restartButton(data)}
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
    listClustersAPI();
    if (!detailedView && selectedMode === 'Clusters') {
      pollingClusters(listClustersAPI, pollingDisable);
    }

    return () => {
      pollingClusters(listClustersAPI, true);
    };
  }, [pollingDisable, detailedView, selectedMode]);

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
              clusterResponse={clusterResponse}
              selectedJobClone={selectedJobClone}
              setSelectedJobClone={setSelectedJobClone}
              setSubmitJobView={setSubmitJobView}
            />
          )}
          {!detailedView && (
            <div className="clusters-list-component">
              {!detailedJobView && !submitJobView && (
                <div className="clusters-list-overlay">
                  <div
                    className={toggleStyleSelection('Clusters')}
                    onClick={() => selectedModeChange('Clusters')}
                  >
                    Clusters
                  </div>
                  <div
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
                    clustersList={clustersList}
                    detailedJobView={detailedJobView}
                    setDetailedJobView={setDetailedJobView}
                    submitJobView={submitJobView}
                    setSubmitJobView={setSubmitJobView}
                    setDetailedView={setDetailedView}
                    clusterResponse={clusterResponse}
                    selectedJobClone={selectedJobClone}
                    setSelectedJobClone={setSelectedJobClone}
                  />
                ) : (
                  <ListCluster
                    clustersList={clustersList}
                    isLoading={isLoading}
                    setPollingDisable={setPollingDisable}
                    listClustersAPI={listClustersAPI}
                    handleClusterDetails={handleClusterDetails}
                    project_id={projectId}
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

export class Cluster extends ReactWidget {
  constructor() {
    super();
    this.addClass('jp-ReactWidget');
  }

  render(): React.JSX.Element {
    return <ClusterComponent />;
  }
}
