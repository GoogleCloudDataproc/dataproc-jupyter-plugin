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
import { requestAPI } from '../handler/handler';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';
import { toastifyCustomStyle } from '../utils/utils';
import { JupyterLab } from '@jupyterlab/application';

interface IPayload {
  input_filename: string;
  composer_environment_name: string;
  output_formats: string[];
  parameters: string[];
  cluster_name: string;
  serverless_name: {};
  mode_selected: string;
  retry_count: number | undefined;
  retry_delay: number | undefined;
  email_failure: boolean;
  email_delay: boolean;
  email: string[];
  name: string;
  schedule_value: string;
  stop_cluster: boolean;
  time_zone: string;
  dag_id: string;
}

export class SchedulerService {
  static listClustersAPIService = async (
    setClusterList: (value: string[]) => void,
    nextPageToken?: string,
    previousClustersList?: object
  ) => {
    const pageToken = nextPageToken ?? '';
    try {
      const serviceURL = `clusterList?pageSize=50&pageToken=${pageToken}`;

      const formattedResponse: any = await requestAPI(serviceURL);
      let transformClusterListData = [];
      if (formattedResponse && formattedResponse.clusters) {
        transformClusterListData = formattedResponse.clusters.map(
          (data: any) => {
            return {
              clusterName: data.clusterName
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
        this.listClustersAPIService(
          setClusterList,
          formattedResponse.nextPageToken,
          allClustersData
        );
      } else {
        let transformClusterListData = allClustersData;

        const keyLabelStructure = transformClusterListData.map(
          (obj: { clusterName: string }) => obj.clusterName
        );

        setClusterList(keyLabelStructure);
      }
      if (formattedResponse?.error?.code) {
        toast.error(formattedResponse?.error?.message, toastifyCustomStyle);
      }
    } catch (error) {
      DataprocLoggingService.log('Error listing clusters', LOG_LEVEL.ERROR);
      console.error('Error listing clusters', error);
      toast.error('Failed to fetch clusters', toastifyCustomStyle);
    }
  };
  static listSessionTemplatesAPIService = async (
    setServerlessDataList: (value: string[]) => void,
    setServerlessList: (value: string[]) => void,
    nextPageToken?: string,
    previousSessionTemplatesList?: object
  ) => {
    const pageToken = nextPageToken ?? '';
    try {
      const serviceURL = `runtimeList?pageSize=50&pageToken=${pageToken}`;

      const formattedResponse: any = await requestAPI(serviceURL);
      let transformSessionTemplateListData = [];
      if (formattedResponse && formattedResponse.sessionTemplates) {
        transformSessionTemplateListData =
          formattedResponse.sessionTemplates.map((data: any) => {
            return {
              serverlessName: data.jupyterSession.displayName,
              serverlessData: data
            };
          });
      }
      const existingSessionTemplateData = previousSessionTemplatesList ?? [];
      //setStateAction never type issue
      const allSessionTemplatesData: any = [
        ...(existingSessionTemplateData as []),
        ...transformSessionTemplateListData
      ];

      if (formattedResponse.nextPageToken) {
        this.listSessionTemplatesAPIService(
          setServerlessDataList,
          setServerlessList,
          formattedResponse.nextPageToken,
          allSessionTemplatesData
        );
      } else {
        let transformSessionTemplateListData = allSessionTemplatesData;

        const keyLabelStructure = transformSessionTemplateListData.map(
          (obj: { serverlessName: string }) => obj.serverlessName
        );

        setServerlessDataList(transformSessionTemplateListData);
        setServerlessList(keyLabelStructure);
      }
      if (formattedResponse?.error?.code) {
        toast.error(formattedResponse?.error?.message, toastifyCustomStyle);
      }
    } catch (error) {
      DataprocLoggingService.log(
        'Error listing session templates',
        LOG_LEVEL.ERROR
      );
      console.error('Error listing session templates', error);
      toast.error('Failed to fetch session templates', toastifyCustomStyle);
    }
  };
  static listComposersAPIService = async (
    setComposerList: (value: string[]) => void
  ) => {
    try {
      const formattedResponse: any = await requestAPI('composer');
      let composerEnvironmentList: string[] = [];
      formattedResponse.forEach((data: any) => {
        composerEnvironmentList.push(data.name);
      });

      setComposerList(composerEnvironmentList);
    } catch (error) {
      DataprocLoggingService.log(
        'Error listing composer environment list',
        LOG_LEVEL.ERROR
      );
      console.error('Error listing composer environment list', error);
      toast.error(
        'Failed to fetch composer environment list',
        toastifyCustomStyle
      );
    }
  };
  static createJobSchedulerService = async (
    payload: IPayload,
    app: JupyterLab
  ) => {
    try {
      const data = await requestAPI('createJobScheduler', {
        body: JSON.stringify(payload),
        method: 'POST'
      });
      app.shell.activeWidget?.close();
      console.log(data);
    } catch (reason) {
      console.error(`Error on POST {dataToSend}.\n${reason}`);
    }
  };
  static listDagRunsListService = async (
    composerName: string,
    dagId: string,
    setDagRunsList: (value: any) => void,
    setIsLoading: (value: boolean) => void
  ) => {
    try {
      const data: any = await requestAPI(
        `dagRun?composer=${composerName}&dag_id=${dagId}`
      );
      console.log(data);
      let transformDagRunListData = [];
      transformDagRunListData = data.dag_runs.map((dagRun: any) => {
        return {
          state: dagRun.state,
          date: new Date(dagRun.execution_date).toDateString(),
          time: new Date(dagRun.execution_date).toTimeString().split(' ')[0]
        };
      });
      setDagRunsList(transformDagRunListData);
      setIsLoading(false);
    } catch (reason) {
      console.error(`Error on GET credentials.\n${reason}`);
    }
  };
}
