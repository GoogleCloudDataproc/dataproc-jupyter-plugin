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
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import restartIcon from '../../style/icons/restart_icon.svg';
import restartDisableIcon from '../../style/icons/restart_icon_disable.svg';
import startIcon from '../../style/icons/start_icon.svg';
import startDisableIcon from '../../style/icons/start_icon_disable.svg';
import stopIcon from '../../style/icons/stop_icon.svg';
import stopDisableIcon from '../../style/icons/stop_icon_disable.svg';
import JobComponent from '../jobs/jobs';
import { startClusterApi, stopClusterApi } from '../utils/clusterServices';
import {
  ClusterStatus,
  HTTP_METHOD,
  LOGIN_STATE,
  POLLING_TIME_LIMIT
} from '../utils/const';
import PollingTimer from '../utils/pollingTimer';
import {
  authenticatedFetch,
  checkConfig,
  getProjectId,
  statusValue,
  toastifyCustomStyle
} from '../utils/utils';
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
  const listClustersAPI = async (
    nextPageToken?: string,
    previousClustersList?: object
  ) => {
    const pageToken = nextPageToken ?? '';

    try {
      const projectId = await getProjectId();
      setProjectId(projectId);

      const queryParams = new URLSearchParams();
      queryParams.append('pageSize', '50');
      queryParams.append('pageToken', pageToken);

      const response = await authenticatedFetch({
        uri: 'clusters',
        regionIdentifier: 'regions',
        method: HTTP_METHOD.GET,
        queryParams: queryParams
      });
      const formattedResponse = await response.json();
      let transformClusterListData = [];
      if (formattedResponse && formattedResponse.clusters) {
        setClusterResponse(formattedResponse);
        transformClusterListData = formattedResponse.clusters.map(
          (data: any) => {
            const statusVal = statusValue(data);
            // Extracting zone from zoneUri
            // Example: "projects/{project}/zones/{zone}"

            const zoneUri = data.config.gceClusterConfig.zoneUri.split('/');

            return {
              clusterUuid: data.clusterUuid,
              status: statusVal,
              clusterName: data.clusterName,
              clusterImage: data.config.softwareConfig.imageVersion,
              region: data.labels['goog-dataproc-location'],
              zone: zoneUri[zoneUri.length - 1],
              totalWorkersNode: data.config.workerConfig
                ? data.config.workerConfig.numInstances
                : 0,
              schedulesDeletion: data.config.lifecycleConfig ? 'On' : 'Off',
              actions: renderActions(data)
            };
          }
        );
      }
      const existingClusterData = previousClustersList ?? [];
      //setStateAction never type issue
      const allClustersData: any = [
        ...(existingClusterData as []),
        ...transformClusterListData
      ];

      if (formattedResponse.nextPageToken) {
        listClustersAPI(formattedResponse.nextPageToken, allClustersData);
      } else {
        setclustersList(allClustersData);
        setIsLoading(false);
        setLoggedIn(true);
      }
    } catch (error) {
      setIsLoading(false);
      console.error('Error listing clusters', error);
      toast.error('Failed to fetch clusters', toastifyCustomStyle);
    }
  };

  const handleClusterDetails = (selectedName: string) => {
    pollingClusters(listClustersAPI, true);
    setClusterSelected(selectedName);
    setDetailedView(true);
  };

  const statusApi = async (selectedCluster: string) => {
    try {
      const response = await authenticatedFetch({
        uri: `clusters/${selectedCluster}`,
        method: HTTP_METHOD.GET,
        regionIdentifier: 'regions'
      });
      const formattedResponse = await response.json();

      if (formattedResponse.status.state === ClusterStatus.STATUS_STOPPED) {
        startClusterApi(selectedCluster);
        clearInterval(timer.current);
      }
      listClustersAPI();
    } catch (error) {
      console.error('Error fetching status', error);
      toast.error(
        `Failed to fetch the status ${selectedCluster}`,
        toastifyCustomStyle
      );
    }
  };

  const restartClusterApi = async (selectedCluster: string) => {
    setRestartEnabled(true);

    try {
      const response = await authenticatedFetch({
        uri: `clusters/${selectedCluster}:stop`,
        method: HTTP_METHOD.POST,
        regionIdentifier: 'regions'
      });
      const formattedResponse = await response.json();
      console.log(formattedResponse);
      listClustersAPI();
      timer.current = setInterval(() => {
        statusApi(selectedCluster);
      }, POLLING_TIME_LIMIT);

      // This is an artifact of the refactoring
      listClustersAPI();

      setRestartEnabled(false);
    } catch (error) {
      console.error('Error restarting cluster', error);
      toast.error(
        `Failed to restart the cluster ${selectedCluster}`,
        toastifyCustomStyle
      );
    }
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
            ? () => startClusterApi(data.clusterName)
            : undefined
        }
      >
        {data.status.state === ClusterStatus.STATUS_STOPPED &&
        !restartEnabled ? (
          <iconStart.react tag="div" className="logo-alignment-style" />
        ) : (
          <iconStartDisable.react tag="div" className="logo-alignment-style" />
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
            ? () => stopClusterApi(data.clusterName)
            : undefined
        }
      >
        {data.status.state === ClusterStatus.STATUS_RUNNING ? (
          <iconStop.react tag="div" className="logo-alignment-style" />
        ) : (
          <iconStopDisable.react tag="div" className="logo-alignment-style" />
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
          <iconRestart.react tag="div" className="logo-alignment-style" />
        ) : (
          <iconRestartDisable.react
            tag="div"
            className="logo-alignment-style"
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
    listClustersAPI();

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
