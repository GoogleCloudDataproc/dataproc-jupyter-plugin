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
  ClusterStatus,
  ClusterStatusState,
  POLLING_TIME_LIMIT
} from '../utils/const';
import {
  authApi,
  toastifyCustomStyle,
  getProjectId,
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
        transformClusterListData = formattedResponse.map((data: any) => {
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
        });
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
      if (formattedResponse?.error) {
        if (!toast.isActive('clusterListingError')) {
          toast.error(formattedResponse?.error, {
            ...toastifyCustomStyle,
            toastId: 'clusterListingError'
          });
        }
      }
    } catch (error) {
      setIsLoading(false);
      DataprocLoggingService.log('Error listing clusters', LOG_LEVEL.ERROR);
      if (!toast.isActive('clusterListingError')) {
        toast.error(`Failed to fetch clusters : ${error}`, {
          ...toastifyCustomStyle,
          toastId: 'clusterListingError'
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
    if (credentials) {
      setProjectName(credentials.project_id || '');

      try {
        const serviceURL = `clusterDetail?cluster=${clusterSelected}`;

        let responseResult: any = await requestAPI(serviceURL);
        responseResult.status.state =
          ClusterStatusState[responseResult.status.state.toString()];
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
          `Failed to fetch cluster details ${clusterSelected} : ${err}`,
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
      const serviceURL = `clusterDetail?cluster=${selectedCluster}`;

      let formattedResponse: any = await requestAPI(serviceURL);
      formattedResponse.status.state =
        ClusterStatusState[formattedResponse.status.state.toString()];

      if (formattedResponse.status.state === ClusterStatus.STATUS_STOPPED) {
        ClusterService.startClusterApi(selectedCluster);
        clearInterval(timer.current);
      }
      if (formattedResponse?.error) {
        toast.error(formattedResponse?.error, toastifyCustomStyle);
      }
      listClustersAPI();
    } catch (error) {
      DataprocLoggingService.log('Error fetching status', LOG_LEVEL.ERROR);
      toast.error(
        `Failed to fetch the status ${selectedCluster} : ${error}`,
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
      const serviceURL = `stopCluster?cluster=${selectedCluster}`;

      let formattedResponse: any = await requestAPI(serviceURL, {
        method: 'POST'
      });

      listClustersAPI();
      timer.current = setInterval(() => {
        statusApi(selectedCluster);
      }, POLLING_TIME_LIMIT);
      if (formattedResponse?.error) {
        toast.error(formattedResponse?.error, toastifyCustomStyle);
      }
      // This is an artifact of the refactoring
      listClustersAPI();

      setRestartEnabled(false);
    } catch (error) {
      DataprocLoggingService.log('Error restarting cluster', LOG_LEVEL.ERROR);
      toast.error(
        `Failed to restart the cluster ${selectedCluster} : ${error}`,
        toastifyCustomStyle
      );
    }
  };

  static deleteClusterApi = async (selectedcluster: string) => {
    try {
      const serviceURL = `deleteCluster?cluster=${selectedcluster}`;

      let formattedResponse: any = await requestAPI(serviceURL, {
        method: 'DELETE'
      });
      
      if (formattedResponse?.error) {
        toast.error(formattedResponse?.error, toastifyCustomStyle);
      } else {
        toast.success(
          `Cluster ${selectedcluster} deleted successfully`,
          toastifyCustomStyle
        );
      }

    } catch (error) {
      DataprocLoggingService.log('Error deleting cluster', LOG_LEVEL.ERROR);
      toast.error(
        `Error deleting cluster ${selectedcluster} : ${error}`,
        toastifyCustomStyle
      );
    }
  };

  static startStopAPI = async (
    selectedcluster: string,
    operation: 'start' | 'stop'
  ) => {
    try {
      const serviceURL =
        operation === 'stop'
          ? `stopCluster?cluster=${selectedcluster}`
          : `startCluster?cluster=${selectedcluster}`;

      let formattedResponse: any = await requestAPI(serviceURL, {
        method: 'POST'
      });

      if (formattedResponse?.error) {
        toast.error(formattedResponse?.error, toastifyCustomStyle);
      }
    } catch (err) {
      DataprocLoggingService.log(`Error ${operation} cluster`, LOG_LEVEL.ERROR);
      toast.error(
        `Failed to ${operation} the cluster ${selectedcluster} : ${err}`,
        toastifyCustomStyle
      );
    }
  };

  static startClusterApi = async (selectedcluster: string) => {
    this.startStopAPI(selectedcluster, 'start');
  };
  static stopClusterApi = async (selectedcluster: string) => {
    this.startStopAPI(selectedcluster, 'stop');
  };
}
