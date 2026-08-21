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

import {
  ClusterStatus,
  POLLING_TIME_LIMIT
} from '../utils/const';
import {
  authApi,
  getProjectId,
  statusValue,
  handleApiError
} from '../utils/utils';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';
import { Notification } from '@jupyterlab/apputils';
import { requestAPI } from '../handler/handler';

interface IClusterRenderData {
  status: { state: ClusterStatus };
  clusterName: string;
}

interface IClusterDetailsResponse {
  error: {
    message: string;
    code: number;
  };
  status: {
    state: string;
  };
  clusterName: string;
  clusterUuid: string;
  projectId?: string;
  regionId?: string;
}

interface ICluster {
  clusterName: string;
  status: string;
  clusterImage: string;
  region: string;
  zone: string;
  totalWorkersNode: string;
  schedulesDeletion: string;
  actions: React.ReactNode;
}

export class ClusterService {
  static listClustersAPIService = async (
    setProjectId: (value: string) => void,
    renderActions: (value: IClusterRenderData) => React.JSX.Element,
    setClustersList: (value: ICluster[]) => void,
    setIsLoading: (value: boolean) => void,
    setLoggedIn: (value: boolean) => void,
    setApiDialogOpen: (open: boolean) => void,
    setPollingDisable: (value: boolean) => void,
    setEnableLink: (link: string) => void,
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

      const formattedResponse: any = await requestAPI(`listClusters?${queryParams.toString()}`);
      let transformClusterListData = [];
      if (formattedResponse && formattedResponse.clusters) {
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
      const allClustersData: ICluster[] = [
        ...(existingClusterData as []),
        ...transformClusterListData
      ];

      if (formattedResponse?.nextPageToken) {
        this.listClustersAPIService(
          setProjectId,
          renderActions,
          setClustersList,
          setIsLoading,
          setLoggedIn,
          setApiDialogOpen,
          setPollingDisable,
          setEnableLink,
          formattedResponse.nextPageToken,
          allClustersData
        );
      } else {
        setClustersList(allClustersData);
        setIsLoading(false);
        setLoggedIn(true);
      }
    } catch (error: any) {
      setIsLoading(false);
      DataprocLoggingService.log('Error listing clusters', LOG_LEVEL.ERROR);
      const credentials = await authApi();
      if (!credentials?.login_error && !credentials?.config_error) {
        handleApiError(
          { error: { code: error.response?.status || 500, message: error.message || error } },
          credentials,
          setApiDialogOpen,
          setEnableLink,
          setPollingDisable,
          'clusters'
        );
      }
    }
  };

  static getClusterDetailsService = async (
    setProjectName: (value: string) => void,
    clusterSelected: string,
    setErrorView: (value: boolean) => void,
    setIsLoading: (value: boolean) => void,
    setClusterInfo: (value: IClusterDetailsResponse) => void
  ) => {
    const credentials = await authApi();
    if (credentials) {
      setProjectName(credentials.project_id || '');
      requestAPI(`clusterDetail?cluster=${clusterSelected}`)
        .then((responseResult: any) => {
          setClusterInfo(responseResult);
          setIsLoading(false);
        })
        .catch((err: any) => {
          console.log(err);
          setIsLoading(false);
          if (err.response && err.response.status === 404) {
            setErrorView(true);
          }
          DataprocLoggingService.log(
            'Error listing clusters Details',
            LOG_LEVEL.ERROR
          );
          Notification.emit(
            `Failed to fetch cluster details : ${err.message || err}`,
            'error',
            { autoClose: 5000 }
          );
        });
    }
  };

  static statusApiService = async (
    selectedCluster: string,
    listClustersAPI: () => void,
    timer: any
  ) => {
    try {
      const formattedResponse: any = await requestAPI(`clusterDetail?cluster=${selectedCluster}`);

      if (formattedResponse.status.state === ClusterStatus.STATUS_STOPPED) {
        ClusterService.startClusterApi(selectedCluster);
        clearInterval(timer.current);
      }
      listClustersAPI();
    } catch (error) {
      DataprocLoggingService.log('Error fetching status', LOG_LEVEL.ERROR);
      Notification.emit(
        `Failed to fetch status for cluster ${selectedCluster} : ${error}`,
        'error',
        {
          autoClose: 5000
        }
      );
    }
  };

  static restartClusterApiService = async (
    selectedCluster: string,
    setRestartEnabled: (value: boolean) => void,
    listClustersAPI: () => void,
    timer: any,
    statusApi: (value: string) => void
  ) => {
    setRestartEnabled(true);

    try {
      const formattedResponse: any = await requestAPI(`stopCluster?cluster=${selectedCluster}`, { method: 'POST' });
      console.log(formattedResponse);
      listClustersAPI();
      timer.current = setInterval(() => {
        statusApi(selectedCluster);
      }, POLLING_TIME_LIMIT);
      
      // This is an artifact of the refactoring
      listClustersAPI();

      setRestartEnabled(false);
    } catch (error) {
      DataprocLoggingService.log('Error restarting cluster', LOG_LEVEL.ERROR);
      Notification.emit(
        `Failed to restart cluster ${selectedCluster} : ${error}`,
        'error',
        {
          autoClose: 5000
        }
      );
    }
  };

  static deleteClusterApi = async (selectedcluster: string) => {
    const credentials = await authApi();
    if (credentials) {
      requestAPI(`deleteCluster?cluster=${selectedcluster}`, { method: 'DELETE' })
        .then(() => {
          Notification.emit(
            `Cluster ${selectedcluster} deleted successfully`,
            'success',
            { autoClose: 5000 }
          );
        })
        .catch((err: any) => {
          DataprocLoggingService.log('Error deleting cluster', LOG_LEVEL.ERROR);
          Notification.emit(`Error deleting cluster : ${err.message || err}`, 'error', {
            autoClose: 5000
          });
        });
    }
  };

  static startStopAPI = async (
    selectedcluster: string,
    operation: 'start' | 'stop'
  ) => {
    const credentials = await authApi();
    if (credentials) {
      requestAPI(`${operation}Cluster?cluster=${selectedcluster}`, { method: 'POST' })
        .then(() => {})
        .catch((err: any) => {
          DataprocLoggingService.log(
            `Error ${operation} cluster`,
            LOG_LEVEL.ERROR
          );
          Notification.emit(`Error ${operation} cluster : ${err.message || err}`, 'error', {
            autoClose: 5000
          });
        });
    }
  };

  static startClusterApi = async (selectedcluster: string) => {
    this.startStopAPI(selectedcluster, 'start');
  };
  static stopClusterApi = async (selectedcluster: string) => {
    this.startStopAPI(selectedcluster, 'stop');
  };
}
