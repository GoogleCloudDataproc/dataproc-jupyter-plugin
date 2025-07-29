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
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  ClusterStatus,
  HTTP_METHOD,
  POLLING_TIME_LIMIT,
  gcpServiceUrls
} from '../utils/const';
import {
  authApi,
  loggedFetch,
  getProjectId,
  authenticatedFetch,
  statusValue,
  handleApiError
} from '../utils/utils';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';
import { Notification } from '@jupyterlab/apputils';

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
      const credentials = await authApi();
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

      if (formattedResponse.nextPageToken) {
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

      if (
        formattedResponse?.error?.code &&
        !credentials?.login_error &&
        !credentials?.config_error
      ) {
        const credentials = await authApi();

        handleApiError(
          formattedResponse,
          credentials,
          setApiDialogOpen,
          setEnableLink,
          setPollingDisable,
          'clusters'
        );
      }
    } catch (error) {
      setIsLoading(false);
      DataprocLoggingService.log('Error listing clusters', LOG_LEVEL.ERROR);
      const credentials = await authApi();
      if (!credentials?.login_error && !credentials?.config_error) {
        Notification.emit(`Failed to fetch clusters list : ${error}`, 'error', {
          autoClose: 5000
        });
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
    const { DATAPROC } = await gcpServiceUrls;
    if (credentials) {
      setProjectName(credentials.project_id || '');
      loggedFetch(
        `${DATAPROC}/projects/${credentials.project_id}/regions/${credentials.region_id}/clusters/${clusterSelected}`,
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
            .then((responseResult: IClusterDetailsResponse) => {
              if (responseResult.error && responseResult.error.code === 404) {
                setErrorView(true);
              }
              if (responseResult?.error?.code) {
                Notification.emit(
                  `Failed to fetch cluster details : ${responseResult?.error?.message}`,
                  'error',
                  {
                    autoClose: 5000
                  }
                );
              }
              setClusterInfo(responseResult);
              setIsLoading(false);
            })
            .catch((e: Error) => {
              console.log(e);
              setIsLoading(false);
            });
        })
        .catch((err: Error) => {
          setIsLoading(false);
          DataprocLoggingService.log(
            'Error listing clusters Details',
            LOG_LEVEL.ERROR
          );
          Notification.emit(
            `Failed to fetch cluster details : ${err}`,
            'error',
            {
              autoClose: 5000
            }
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
      const response = await authenticatedFetch({
        uri: `clusters/${selectedCluster}`,
        method: HTTP_METHOD.GET,
        regionIdentifier: 'regions'
      });
      const formattedResponse = await response.json();

      if (formattedResponse.status.state === ClusterStatus.STATUS_STOPPED) {
        ClusterService.startClusterApi(selectedCluster);
        clearInterval(timer.current);
      }
      if (formattedResponse?.error?.code) {
        Notification.emit(
          `Failed to fetch status for cluster ${selectedCluster} : ${formattedResponse?.error?.message}`,
          'error',
          {
            autoClose: 5000
          }
        );
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
      if (formattedResponse?.error?.code) {
        Notification.emit(
          `Failed to restart cluster ${selectedCluster} : ${formattedResponse?.error?.message}`,
          'error',
          {
            autoClose: 5000
          }
        );
      }
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
    const { DATAPROC } = await gcpServiceUrls;
    if (credentials) {
      loggedFetch(
        `${DATAPROC}/projects/${credentials.project_id}/regions/${credentials.region_id}/clusters/${selectedcluster}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      )
        .then((response: Response) => {
          response
            .json()
            .then(async (responseResult: Response) => {
              console.log(responseResult);
              const formattedResponse = await responseResult.json();
              if (formattedResponse?.error?.code) {
                Notification.emit(
                  `Error deleting cluster : ${formattedResponse?.error?.message}`,
                  'error',
                  {
                    autoClose: 5000
                  }
                );
              } else {
                Notification.emit(
                  `Cluster ${selectedcluster} deleted successfully`,
                  'success',
                  {
                    autoClose: 5000
                  }
                );
              }
            })
            .catch((e: Error) => console.log(e));
        })
        .catch((err: Error) => {
          DataprocLoggingService.log('Error deleting cluster', LOG_LEVEL.ERROR);

          Notification.emit(`Error deleting cluster : ${err}`, 'error', {
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
    const { DATAPROC } = await gcpServiceUrls;
    if (credentials) {
      loggedFetch(
        `${DATAPROC}/projects/${credentials.project_id}/regions/${credentials.region_id}/clusters/${selectedcluster}:${operation}`,
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
            .then(async (responseResult: Response) => {
              console.log(responseResult);
              const formattedResponse = await responseResult.json();
              if (formattedResponse?.error?.code) {
                Notification.emit(formattedResponse?.error?.message, 'error', {
                  autoClose: 5000
                });
              }
            })
            .catch((e: Error) => console.log(e));
        })
        .catch((err: Error) => {
          DataprocLoggingService.log(
            `Error ${operation} cluster`,
            LOG_LEVEL.ERROR
          );

          Notification.emit(`Error ${operation} cluster : ${err}`, 'error', {
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
