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
import { toastifyCustomStyle, showToast } from '../utils/utils';
import { JupyterLab } from '@jupyterlab/application';
import { scheduleMode } from '../utils/const';

interface IPayload {
  input_filename: string;
  composer_environment_name: string;
  output_formats: string[];
  parameters: string[];
  cluster_name?: string;
  serverless_name?: {} | undefined;
  mode_selected: string;
  retry_count: number | undefined;
  retry_delay: number | undefined;
  email_failure: boolean;
  email_delay: boolean;
  email: string[];
  name: string;
  schedule_value: string;
  stop_cluster: boolean;
  time_zone?: string;
  dag_id: string;
}

interface IUpdateSchedulerAPIResponse {
  status: number;
  error: string;
}

interface ISchedulerDagData {
  dag_id: string;
  timetable_description: string;
  is_paused: string;
  schedule_interval: null | {
    value: string;
  };
}
interface IDagList {
  jobid: string;
  notebookname: string;
  schedule: string;
  scheduleInterval: string;
}

interface IClusterAPIResponse {
  clusterName: string;
  clusterUuid: string;
  config: {};
  labels: {};
  metrics: {};
  projectId: string;
  status: {};
  statusHistory: [];
}

interface IComposerAPIResponse {
  name: string;
  label: string;
  description: string;
  file_extensions: [];
  metadata: {};
}

interface IDagRunList {
  dagRunId: string;
  filteredDate: Date;
  state: string;
  date: Date;
  time: string;
}
export class SchedulerService {
  static listClustersAPIService = async (
    setClusterList: (value: string[]) => void,
    setIsLoadingKernelDetail: (value: boolean) => void,
    nextPageToken?: string,
    previousClustersList?: (value: string[]) => void
  ) => {
    const pageToken = nextPageToken ?? '';
    setIsLoadingKernelDetail(true);
    try {
      const serviceURL = `clusterList?pageSize=500&pageToken=${pageToken}`;

      const formattedResponse: any = await requestAPI(serviceURL);
      let transformClusterListData = [];
      if (formattedResponse && formattedResponse.clusters) {
        transformClusterListData = formattedResponse.clusters.map(
          (data: IClusterAPIResponse) => {
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
        setIsLoadingKernelDetail(false);
      }
      if (formattedResponse?.error?.code) {
        if (!toast.isActive('clusterError')) {
          toast.error(formattedResponse?.error?.message, {
            ...toastifyCustomStyle,
            toastId: 'clusterError'
          });
        }
      }
    } catch (error) {
      DataprocLoggingService.log('Error listing clusters', LOG_LEVEL.ERROR);
      if (!toast.isActive('clusterError')) {
        toast.error(`Failed to fetch clusters : ${error}`, {
          ...toastifyCustomStyle,
          toastId: 'clusterError'
        });
      }
    }
  };
  static listSessionTemplatesAPIService = async (
    setServerlessDataList: (value: string[]) => void,
    setServerlessList: (value: string[]) => void,
    setIsLoadingKernelDetail?: (value: boolean) => void,
    nextPageToken?: string,
    previousSessionTemplatesList?: object
  ) => {
    const pageToken = nextPageToken ?? '';
    if (setIsLoadingKernelDetail) {
      setIsLoadingKernelDetail(true);
    }
    try {
      const serviceURL = `runtimeList?pageSize=500&pageToken=${pageToken}`;

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
        if (setIsLoadingKernelDetail) {
          setIsLoadingKernelDetail(false);
        }
      }
      if (formattedResponse?.error?.code) {
        if (!toast.isActive('sessionTemplateError')) {
          toast.error(formattedResponse?.error?.message, {
            ...toastifyCustomStyle,
            toastId: 'sessionTemplateError'
          });
        }
      }
    } catch (error) {
      DataprocLoggingService.log(
        'Error listing session templates',
        LOG_LEVEL.ERROR
      );
      if (!toast.isActive('sessionTemplateError')) {
        toast.error(`Failed to fetch session templates : ${error}`, {
          ...toastifyCustomStyle,
          toastId: 'sessionTemplateError'
        });
      }
    }
  };
  static listComposersAPIService = async (
    setComposerList: (value: string[]) => void,
    setIsApiError: (value: boolean) => void,
    setApiError: (value: string) => void,
    setIsLoading?: (value: boolean) => void
  ) => {
    try {
      const formattedResponse: any = await requestAPI('composerList');
      if (formattedResponse.length === 0) {
        // Handle the case where the list is empty
        toast.error(
          'No composer environment in this project and region',
          toastifyCustomStyle
        );
        if (setIsLoading) {
          setIsLoading(false);
        }
      } else {
        if (formattedResponse.length === undefined) {
          try {
            const errorObject = JSON.parse(
              formattedResponse['Error fetching environments list'].slice(
                formattedResponse['Error fetching environments list'].indexOf(
                  '{'
                )
              )
            );
            if (errorObject.error.code === 403) {
              setIsApiError(true);
              setApiError(
                'Cloud Composer API is not enabled in the project. Click here to enable the API.'
              );
              if (setIsLoading) {
                setIsLoading(false);
              }
            }
          } catch (error) {
            console.error('Error parsing error message:', error);
            showToast(
              'Error fetching environments list. Please try again later.',
              'error-featching-env-list'
            );
          }
        } else {
          setIsApiError(false);
          setApiError('');
          let composerEnvironmentList: string[] = [];
          formattedResponse.forEach((data: IComposerAPIResponse) => {
            composerEnvironmentList.push(data.name);
          });
          composerEnvironmentList.sort();
          setComposerList(composerEnvironmentList);
        }
      }
    } catch (error) {
      DataprocLoggingService.log(
        'Error listing composer environment list',
        LOG_LEVEL.ERROR
      );
      toast.error(
        `Failed to fetch composer environment list : ${error}`,
        toastifyCustomStyle
      );
    }
  };
  static createJobSchedulerService = async (
    payload: IPayload,
    app: JupyterLab,
    setCreateCompleted: (value: boolean) => void,
    setCreatingScheduler: (value: boolean) => void,
    editMode: boolean
  ) => {
    setCreatingScheduler(true);
    try {
      const data: any = await requestAPI('createJobScheduler', {
        body: JSON.stringify(payload),
        method: 'POST'
      });
      if (data.error) {
        toast.error(data.error, toastifyCustomStyle);
        setCreatingScheduler(false);
      } else {
        if (editMode) {
          toast.success(
            `Job scheduler successfully updated`,
            toastifyCustomStyle
          );
        } else {
          toast.success(
            `Job scheduler successfully created`,
            toastifyCustomStyle
          );
        }
        setCreatingScheduler(false);
        setCreateCompleted(true);
      }
    } catch (reason) {
      setCreatingScheduler(false);
      toast.error(
        `Error on POST {dataToSend}.\n${reason}`,
        toastifyCustomStyle
      );
    }
  };

  static editNotebookSchedulerService = async (
    bucketName: string,
    dagId: string,
    setInputNotebookFilePath: (value: string) => void,
    setEditNotebookLoading: (value: string) => void
  ) => {
    setEditNotebookLoading(dagId);
    try {
      const serviceURL = `editJobScheduler?&dag_id=${dagId}&bucket_name=${bucketName}`;
      const formattedResponse: any = await requestAPI(serviceURL, {
        method: 'POST'
      });
      setInputNotebookFilePath(formattedResponse.input_filename);
    } catch (reason) {
      setEditNotebookLoading('');
      toast.error(
        `Error on POST {dataToSend}.\n${reason}`,
        toastifyCustomStyle
      );
    }
  };

  static editJobSchedulerService = async (
    bucketName: string,
    dagId: string,
    composerSelectedList: string,
    setEditDagLoading: (value: string) => void,
    setCreateCompleted?: (value: boolean) => void,
    setJobNameSelected?: (value: string) => void,
    setComposerSelected?: (value: string) => void,
    setScheduleMode?: (value: scheduleMode) => void,
    setScheduleValue?: (value: string) => void,

    setInputFileSelected?: (value: string) => void,
    setParameterDetail?: (value: string[]) => void,
    setParameterDetailUpdated?: (value: string[]) => void,
    setSelectedMode?: (value: string) => void,
    setClusterSelected?: (value: string) => void,
    setServerlessSelected?: (value: string) => void,
    setServerlessDataSelected?: (value: {}) => void,
    serverlessDataList?: string[],
    setServerlessDataList?: (value: string[]) => void,
    setServerlessList?: (value: string[]) => void,
    setRetryCount?: (value: number) => void,
    setRetryDelay?: (value: number) => void,
    setEmailOnFailure?: (value: boolean) => void,
    setEmailonRetry?: (value: boolean) => void,
    setEmailOnSuccess?: (value: boolean) => void,
    setEmailList?: (value: string[]) => void,
    setStopCluster?: (value: boolean) => void,
    setTimeZoneSelected?: (value: string) => void,
    setEditMode?: (value: boolean) => void,
    setIsLoadingKernelDetail?: (value: boolean) => void
  ) => {
    setEditDagLoading(dagId);
    try {
      const serviceURL = `editJobScheduler?&dag_id=${dagId}&bucket_name=${bucketName}`;
      const formattedResponse: any = await requestAPI(serviceURL, {
        method: 'POST'
      });
      if (
        setCreateCompleted &&
        setJobNameSelected &&
        setComposerSelected &&
        setScheduleMode &&
        setScheduleValue &&
        setInputFileSelected &&
        setParameterDetail &&
        setParameterDetailUpdated &&
        setSelectedMode &&
        setClusterSelected &&
        setServerlessSelected &&
        setServerlessDataSelected &&
        serverlessDataList &&
        setServerlessDataList &&
        setServerlessList &&
        setRetryCount &&
        setRetryDelay &&
        setEmailOnFailure &&
        setEmailonRetry &&
        setEmailOnSuccess &&
        setEmailList &&
        setStopCluster &&
        setTimeZoneSelected &&
        setEditMode &&
        dagId !== null
      ) {
        setJobNameSelected(dagId);
        setComposerSelected(composerSelectedList);
        setInputFileSelected(formattedResponse.input_filename);
        setParameterDetail(formattedResponse.parameters);
        setParameterDetailUpdated(formattedResponse.parameters);
        setSelectedMode(formattedResponse.mode_selected);
        setClusterSelected(formattedResponse.cluster_name);
        setServerlessSelected(formattedResponse.serverless_name);
        if (formattedResponse.mode_selected === 'serverless') {
          await this.listSessionTemplatesAPIService(
            setServerlessDataList,
            setServerlessList,
            setIsLoadingKernelDetail
          );
          if (serverlessDataList.length > 0) {
            const selectedData: any = serverlessDataList.filter(
              (serverless: any) => {
                return (
                  serverless.serverlessName ===
                  formattedResponse.serverless_name
                );
              }
            );
            setServerlessDataSelected(selectedData[0].serverlessData);
          }
        }
        setRetryCount(formattedResponse.retry_count);
        setRetryDelay(formattedResponse.retry_delay);
        formattedResponse.email_failure.toLowerCase() === 'true'
          ? setEmailOnFailure(true)
          : setEmailOnFailure(false);
        formattedResponse.email_delay.toLowerCase() === 'true'
          ? setEmailonRetry(true)
          : setEmailonRetry(false);
        formattedResponse.email_success.toLowerCase() === 'true'
          ? setEmailOnSuccess(true)
          : setEmailOnSuccess(false);
        setEmailList(formattedResponse.email);
        formattedResponse.stop_cluster.toLowerCase() === 'true'
          ? setStopCluster(true)
          : setStopCluster(false);
        if (formattedResponse.time_zone === '') {
          setTimeZoneSelected(Intl.DateTimeFormat().resolvedOptions().timeZone);
        } else {
          setTimeZoneSelected(formattedResponse.time_zone);
        }
        setEditMode(true);
        setCreateCompleted(false);
        if (formattedResponse.schedule_value === '@once') {
          setScheduleMode('runNow');
          setScheduleValue('');
        } else if (formattedResponse.schedule_value !== '@once') {
          setScheduleMode('runSchedule');
          setScheduleValue(formattedResponse.schedule_value);
        }
      }
      setEditDagLoading('');
    } catch (reason) {
      setEditDagLoading('');
      toast.error(
        `Error on POST {dataToSend}.\n${reason}`,
        toastifyCustomStyle
      );
    }
  };

  static listDagRunsListService = async (
    composerName: string,
    dagId: string,
    startDate: string,
    endDate: string,
    setDagRunsList: (value: IDagRunList[]) => void,
    setDagRunId: (value: string) => void,
    setIsLoading: (value: boolean) => void,

    setBlueListDates: (value: string[]) => void,
    setGreyListDates: (value: string[]) => void,
    setOrangeListDates: (value: string[]) => void,
    setRedListDates: (value: string[]) => void,
    setGreenListDates: (value: string[]) => void,
    setDarkGreenListDates: (value: string[]) => void,
    currentOffsetValue?: number,
    previousDagRunDataList?: object
  ) => {
    let offset = currentOffsetValue ?? 0;
    setIsLoading(true);
    let start_date = startDate;
    let end_date = endDate;
    setBlueListDates([]);
    setGreyListDates([]);
    setOrangeListDates([]);
    setRedListDates([]);
    setGreenListDates([]);
    setDarkGreenListDates([]);
    try {
      const data: any = await requestAPI(
        `dagRun?composer=${composerName}&dag_id=${dagId}&start_date=${start_date}&end_date=${end_date}&offset=${offset}`
      );

      let transformDagRunListDataCurrent = [];
      if (data && data.dag_runs.length > 0) {
        transformDagRunListDataCurrent = data.dag_runs.map((dagRun: any) => {
          if (dagRun.start_date !== null) {
            return {
              dagRunId: dagRun.dag_run_id,
              filteredDate: new Date(dagRun.start_date)
                .toDateString()
                .split(' ')[2],
              state: dagRun.state,
              date: new Date(dagRun.start_date).toDateString(),
              time: new Date(dagRun.start_date).toTimeString().split(' ')[0]
            };
          }
        });
      }
      transformDagRunListDataCurrent = transformDagRunListDataCurrent.filter(
        (dagRunData: any) => {
          if (dagRunData) {
            return dagRunData;
          }
        }
      );
      const existingDagRunsListData = previousDagRunDataList ?? [];
      //setStateAction never type issue
      const allDagRunsListData: any = [
        ...(existingDagRunsListData as []),
        ...transformDagRunListDataCurrent
      ];

      if (data.dag_runs.length + offset !== data.total_entries) {
        this.listDagRunsListService(
          composerName,
          dagId,
          startDate,
          endDate,
          setDagRunsList,
          setDagRunId,
          setIsLoading,

          setBlueListDates,
          setGreyListDates,
          setOrangeListDates,
          setRedListDates,
          setGreenListDates,
          setDarkGreenListDates,
          data.dag_runs.length + offset,
          allDagRunsListData
        );
      } else {
        let transformDagRunListData = allDagRunsListData;

        if (transformDagRunListData.length > 0) {
          // Group by date first, then by status
          const groupedDataByDateStatus = transformDagRunListData.reduce(
            (result: any, item: any) => {
              const date = item.filteredDate;
              const status = item.state;

              if (!result[date]) {
                result[date] = {};
              }

              if (!result[date][status]) {
                result[date][status] = [];
              }

              result[date][status].push(item);

              return result;
            },
            {}
          );

          let blueList: string[] = [];
          let greyList: string[] = [];
          let orangeList: string[] = [];
          let redList: string[] = [];
          let greenList: string[] = [];
          let darkGreenList: string[] = [];

          Object.keys(groupedDataByDateStatus).forEach(dateValue => {
            if (groupedDataByDateStatus[dateValue].running) {
              blueList.push(dateValue);
            } else if (groupedDataByDateStatus[dateValue].queued) {
              greyList.push(dateValue);
            } else if (
              groupedDataByDateStatus[dateValue].failed &&
              groupedDataByDateStatus[dateValue].success
            ) {
              orangeList.push(dateValue);
            } else if (groupedDataByDateStatus[dateValue].failed) {
              redList.push(dateValue);
            } else if (
              groupedDataByDateStatus[dateValue].success &&
              groupedDataByDateStatus[dateValue].success.length === 1
            ) {
              greenList.push(dateValue);
            } else {
              darkGreenList.push(dateValue);
            }
          });

          setBlueListDates(blueList);
          setGreyListDates(greyList);
          setOrangeListDates(orangeList);
          setRedListDates(redList);
          setGreenListDates(greenList);
          setDarkGreenListDates(darkGreenList);

          setDagRunsList(transformDagRunListData);
        } else {
          setDagRunsList([]);
          setBlueListDates([]);
          setGreyListDates([]);
          setOrangeListDates([]);
          setRedListDates([]);
          setGreenListDates([]);
          setDarkGreenListDates([]);
        }
        setIsLoading(false);
      }
    } catch (reason) {
      if (!toast.isActive('credentialsError')) {
        toast.error(`Error on GET credentials..\n${reason}`, {
          ...toastifyCustomStyle,
          toastId: 'credentialsError'
        });
      }
    }
  };
  static listDagInfoAPIService = async (
    setDagList: (value: IDagList[]) => void,
    setIsLoading: (value: boolean) => void,
    setBucketName: (value: string) => void,
    composerSelected: string
  ) => {
    try {
      const serviceURL = `dagList?composer=${composerSelected}`;
      const formattedResponse: any = await requestAPI(serviceURL);
      let transformDagListData = [];
      if (formattedResponse && formattedResponse[0].dags) {
        transformDagListData = formattedResponse[0].dags.map(
          (dag: ISchedulerDagData) => {
            return {
              jobid: dag.dag_id,
              notebookname: dag.dag_id,
              schedule: dag.timetable_description,
              status: dag.is_paused ? 'Paused' : 'Active',
              scheduleInterval: dag.schedule_interval?.value
            };
          }
        );
      }
      setDagList(transformDagListData);
      setIsLoading(false);
      setBucketName(formattedResponse[1]);
    } catch (error) {
      setIsLoading(false);
      DataprocLoggingService.log(
        'Error listing dag Scheduler list',
        LOG_LEVEL.ERROR
      );
      if (!toast.isActive('dagListError')) {
        toast.error(`Failed to fetch clusters : ${error}`, {
          ...toastifyCustomStyle,
          toastId: 'clusterError'
        });
      }
    }
  };
  static listDagInfoAPIServiceForCreateNotebook = async (
    setDagList: (value: IDagList[]) => void,
    composerSelected: string
  ) => {
    try {
      const serviceURL = `dagList?composer=${composerSelected}`;
      const formattedResponse: any = await requestAPI(serviceURL);
      let transformDagListData = [];
      if (formattedResponse && formattedResponse[0].dags) {
        transformDagListData = formattedResponse[0].dags.map(
          (dag: ISchedulerDagData) => {
            return {
              jobid: dag.dag_id,
              notebookname: dag.dag_id,
              schedule: dag.timetable_description,
              status: dag.is_paused ? 'Paused' : 'Active',
              scheduleInterval: dag.schedule_interval?.value
            };
          }
        );
      }
      setDagList(transformDagListData);
    } catch (error) {
      DataprocLoggingService.log(
        'Error listing dag Scheduler list',
        LOG_LEVEL.ERROR
      );
      if (!toast.isActive('dagListError')) {
        toast.error(`Failed to fetch clusters : ${error}`, {
          ...toastifyCustomStyle,
          toastId: 'clusterError'
        });
      }
    }
  };
  static handleDownloadOutputNotebookAPIService = async (
    composerName: string,
    dagRunId: string,
    bucketName: string,
    dagId: string,
    setDownloadOutputDagRunId: (value: string) => void
  ) => {
    setDownloadOutputDagRunId(dagRunId);
    try {
      dagRunId = encodeURIComponent(dagRunId);
      const serviceURL = `downloadOutput?composer=${composerName}&bucket_name=${bucketName}&dag_id=${dagId}&dag_run_id=${dagRunId}`;
      const formattedResponse: any = await requestAPI(serviceURL, {
        method: 'POST'
      });
      dagRunId = decodeURIComponent(dagRunId);
      if (formattedResponse.status === 0) {
        toast.success(
          `${dagId}_${dagRunId} downloaded successfully`,
          toastifyCustomStyle
        );
      } else {
        toast.error(
          `Failed to download the ${dagId}_${dagRunId}`,
          toastifyCustomStyle
        );
      }
      setDownloadOutputDagRunId('');
    } catch (error) {
      DataprocLoggingService.log('Error in Download api', LOG_LEVEL.ERROR);
      toast.error(`Error in Download api : ${error}`, toastifyCustomStyle);
      setDownloadOutputDagRunId('');
    }
  };
  static handleDeleteSchedulerAPIService = async (
    composerSelected: string,
    dag_id: string,
    setDagList: (value: IDagList[]) => void,
    setIsLoading: (value: boolean) => void,
    setBucketName: (value: string) => void,
    fromPage?: string | undefined
  ) => {
    try {
      const serviceURL = `dagDelete?composer=${composerSelected}&dag_id=${dag_id}&from_page=${fromPage}`;
      const deleteResponse: IUpdateSchedulerAPIResponse = await requestAPI(
        serviceURL,
        { method: 'DELETE' }
      );
      if (deleteResponse.status === 0) {
        await SchedulerService.listDagInfoAPIService(
          setDagList,
          setIsLoading,
          setBucketName,
          composerSelected
        );
        toast.success(
          `Deleted job ${dag_id}. It might take a few minutes to for it to be deleted from the list of jobs.`,
          toastifyCustomStyle
        );
      } else {
        toast.error(`Failed to delete the ${dag_id}`, toastifyCustomStyle);
      }
    } catch (error) {
      DataprocLoggingService.log('Error in Delete api', LOG_LEVEL.ERROR);
      toast.error(
        `Failed to delete the ${dag_id} : ${error}`,
        toastifyCustomStyle
      );
    }
  };
  static handleUpdateSchedulerAPIService = async (
    composerSelected: string,
    dag_id: string,
    is_status_paused: boolean,
    setDagList: (value: IDagList[]) => void,
    setIsLoading: (value: boolean) => void,
    setBucketName: (value: string) => void
  ) => {
    try {
      const serviceURL = `dagUpdate?composer=${composerSelected}&dag_id=${dag_id}&status=${is_status_paused}`;
      const formattedResponse: IUpdateSchedulerAPIResponse = await requestAPI(
        serviceURL,
        { method: 'POST' }
      );
      if (formattedResponse && formattedResponse.status === 0) {
        toast.success(
          `scheduler ${dag_id} updated successfully`,
          toastifyCustomStyle
        );
        await SchedulerService.listDagInfoAPIService(
          setDagList,
          setIsLoading,
          setBucketName,
          composerSelected
        );
      }
    } catch (error) {
      DataprocLoggingService.log('Error in Update api', LOG_LEVEL.ERROR);
      toast.error(`Failed to fetch Update api : ${error}`, toastifyCustomStyle);
    }
  };
  static listDagTaskInstancesListService = async (
    composerName: string,
    dagId: string,
    dagRunId: string,
    setDagTaskInstancesList: (value: any) => void,
    setIsLoading: (value: boolean) => void
  ) => {
    setDagTaskInstancesList([]);
    setIsLoading(true);
    try {
      dagRunId = encodeURIComponent(dagRunId);
      const data: any = await requestAPI(
        `dagRunTask?composer=${composerName}&dag_id=${dagId}&dag_run_id=${dagRunId}`
      );
      data.task_instances.sort(
        (a: any, b: any) =>
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );
      let transformDagRunTaskInstanceListData = [];
      transformDagRunTaskInstanceListData = data.task_instances.map(
        (dagRunTask: any) => {
          return {
            tryNumber: dagRunTask.try_number,
            taskId: dagRunTask.task_id,
            duration: dagRunTask.duration,
            state: dagRunTask.state,
            date: new Date(dagRunTask.start_date).toDateString(),
            time: new Date(dagRunTask.start_date).toTimeString().split(' ')[0]
          };
        }
      );
      setDagTaskInstancesList(transformDagRunTaskInstanceListData);
      setIsLoading(false);
    } catch (reason) {
      if (!toast.isActive('credentialsError')) {
        toast.error(`Error on GET credentials..\n${reason}`, {
          ...toastifyCustomStyle,
          toastId: 'credentialsError'
        });
      }
    }
  };
  static listDagTaskLogsListService = async (
    composerName: string,
    dagId: string,
    dagRunId: string,
    taskId: string,
    tryNumber: number,
    setLogList: (value: string) => void,
    setIsLoadingLogs: (value: boolean) => void
  ) => {
    try {
      setIsLoadingLogs(true);
      dagRunId = encodeURIComponent(dagRunId);
      const data: any = await requestAPI(
        `dagRunTaskLogs?composer=${composerName}&dag_id=${dagId}&dag_run_id=${dagRunId}&task_id=${taskId}&task_try_number=${tryNumber}`
      );
      setLogList(data.content);
      setIsLoadingLogs(false);
    } catch (reason) {
      if (!toast.isActive('credentialsError')) {
        toast.error(`Error on GET credentials..\n${reason}`, {
          ...toastifyCustomStyle,
          toastId: 'credentialsError'
        });
      }
    }
  };
  static handleImportErrordataService = async (
    composerSelectedList: string,
    setImportErrorData: (value: string[]) => void,
    setImportErrorEntries: (value: number) => void
  ) => {
    try {
      const data: any = await requestAPI(
        `importErrorsList?composer=${composerSelectedList}`
      );
      setImportErrorData(data.import_errors);
      setImportErrorEntries(data.total_entries);
    } catch (reason) {
      if (!toast.isActive('credentialsError')) {
        toast.error(`Error on GET credentials..\n${reason}`, {
          ...toastifyCustomStyle,
          toastId: 'credentialsError'
        });
      }
    }
  };

  static triggerDagService = async (
    dagId: string,
    composerSelectedList: string
  ) => {
    try {
      const data: any = await requestAPI(
        `triggerDag?dag_id=${dagId}&composer=${composerSelectedList}`,
        { method: 'POST' }
      );
      if (data) {
        toast.success(`${dagId} triggered successfully `, toastifyCustomStyle);
      }
    } catch (reason) {
      toast.error(
        `Failed to Trigger ${dagId} : ${reason}`,
        toastifyCustomStyle
      );
    }
  };

  static listComposersAPICheckService = async () => {
    try {
      const formattedResponse: any = await requestAPI('composerList');
      return formattedResponse;
    } catch (error) {
      return error;
    }
  };
}
