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

import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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
  toastifyCustomStyle,
  loggedFetch,
  getProjectId,
  authenticatedFetch,
  statusValue
} from '../utils/utils';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';
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
    nextPageToken?: string,
    previousClustersList?: object
  ) => {
    const pageToken = nextPageToken ?? '';
    try {
      const projectId = await getProjectId();
      setProjectId(projectId);

      const serviceURL = `clusterList?pageSize=50&pageToken=${pageToken}`;

      const formattedResponse: any = await requestAPI(serviceURL);
      let transformClusterListData = [];
      if (formattedResponse) {
        transformClusterListData = formattedResponse.map(
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
          formattedResponse.nextPageToken,
          allClustersData
        );
      } else {
        setClustersList(allClustersData);
        setIsLoading(false);
        setLoggedIn(true);
      }
      if (formattedResponse?.error?.code) {
        toast.error(formattedResponse?.error?.message, toastifyCustomStyle);
      }
    } catch (error) {
      setIsLoading(false);
      DataprocLoggingService.log('Error listing clusters', LOG_LEVEL.ERROR);
      console.error('Error listing clusters', error);
      toast.error('Failed to fetch clusters', toastifyCustomStyle);
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

      try {
        const serviceURL = `clusterDetail?clusterSelected=${clusterSelected}`;

        const responseResult: any = await requestAPI(serviceURL);
        if (responseResult) {
          if (responseResult.error && responseResult.error.code === 404) {
            setErrorView(true);
          }
          if (responseResult?.error?.code) {
            toast.error(responseResult?.error?.message, toastifyCustomStyle);
          }
          setClusterInfo(responseResult);
          setIsLoading(false);
        }
      } catch (err) {
        setIsLoading(false);
        console.error('Error listing clusters Details', err);
        DataprocLoggingService.log(
          'Error listing clusters Details',
          LOG_LEVEL.ERROR
        );
        toast.error(
          `Failed to fetch cluster details ${clusterSelected}`,
          toastifyCustomStyle
        );
      }
    }
  };

  static statusApiService = async (
    selectedCluster: string,
    listClustersAPI: () => void,
    timer: any
  ) => {
    try {
      const serviceURL = `clusterDetail?clusterSelected=${selectedCluster}`;

      const formattedResponse: any = await requestAPI(serviceURL);

      if (formattedResponse.status.state === ClusterStatus.STATUS_STOPPED) {
        ClusterService.startClusterApi(selectedCluster);
        clearInterval(timer.current);
      }
      if (formattedResponse?.error?.code) {
        toast.error(formattedResponse?.error?.message, toastifyCustomStyle);
      }
      listClustersAPI();
    } catch (error) {
      console.error('Error fetching status', error);
      DataprocLoggingService.log('Error fetching status', LOG_LEVEL.ERROR);
      toast.error(
        `Failed to fetch the status ${selectedCluster}`,
        toastifyCustomStyle
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
        toast.error(formattedResponse?.error?.message, toastifyCustomStyle);
      }
      // This is an artifact of the refactoring
      listClustersAPI();

      setRestartEnabled(false);
    } catch (error) {
      console.error('Error restarting cluster', error);
      DataprocLoggingService.log('Error restarting cluster', LOG_LEVEL.ERROR);
      toast.error(
        `Failed to restart the cluster ${selectedCluster}`,
        toastifyCustomStyle
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
                toast.error(
                  formattedResponse?.error?.message,
                  toastifyCustomStyle
                );
              } else {
                toast.success(
                  `Cluster ${selectedcluster} deleted successfully`,
                  toastifyCustomStyle
                );
              }
            })
            .catch((e: Error) => console.log(e));
        })
        .catch((err: Error) => {
          console.error('Error deleting cluster', err);
          DataprocLoggingService.log('Error deleting cluster', LOG_LEVEL.ERROR);
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
                toast.error(
                  formattedResponse?.error?.message,
                  toastifyCustomStyle
                );
              }
            })
            .catch((e: Error) => console.log(e));
        })
        .catch((err: Error) => {
          console.error(`Error ${operation} cluster`, err);
          DataprocLoggingService.log(
            `Error ${operation} cluster`,
            LOG_LEVEL.ERROR
          );
          toast.error(
            `Failed to ${operation} the cluster ${selectedcluster}`,
            toastifyCustomStyle
          );
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
