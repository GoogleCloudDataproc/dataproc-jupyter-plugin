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
// import { Dayjs } from 'dayjs';

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
    setComposerList: (value: string[]) => void,
    setIsLoading?: (value: boolean) => void
  ) => {
    try {
      const formattedResponse: any = await requestAPI('composer');
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
        let composerEnvironmentList: string[] = [];
        formattedResponse.forEach((data: any) => {
          composerEnvironmentList.push(data.name);
        });
        composerEnvironmentList.sort();
        setComposerList(composerEnvironmentList);
      }
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
      // app.shell.activeWidget?.close();
      console.log(data);
    } catch (reason) {
      setCreatingScheduler(false);
      console.error(`Error on POST {dataToSend}.\n${reason}`);
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
      const formattedResponse: any = await requestAPI(serviceURL);
      setInputNotebookFilePath(formattedResponse.input_filename);
      setEditNotebookLoading('');
    } catch (reason) {
      console.error(`Error on POST {dataToSend}.\n${reason}`);
      setEditNotebookLoading('');
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
    setScheduleMode?: (value: string) => void,
    setScheduleValue?: (value: string) => void,

    setInputFileSelected?: (value: string) => void,
    setParameterDetail?: (value: string[]) => void,
    setParameterDetailUpdated?: (value: string[]) => void,
    setSelectedMode?: (value: string) => void,
    setClusterSelected?: (value: string) => void,
    setServerlessSelected?: (value: string) => void,
    setServerlessDataSelected?: (value: any) => void,
    serverlessDataList?: any,
    setServerlessDataList?: (value: any) => void,
    setServerlessList?: (value: string[]) => void,
    setRetryCount?: (value: number) => void,
    setRetryDelay?: (value: number) => void,
    setEmailOnFailure?: (value: boolean) => void,
    setEmailonRetry?: (value: boolean) => void,
    setEmailOnSuccess?: (value: boolean) => void,
    setEmailList?: (value: string[]) => void,
    setStopCluster?: (value: boolean) => void,
    setTimeZoneSelected?: (value: string) => void,
    setEditMode?: (value: boolean) => void
  ) => {
    setEditDagLoading(dagId);
    try {
      const serviceURL = `editJobScheduler?&dag_id=${dagId}&bucket_name=${bucketName}`;
      const formattedResponse: any = await requestAPI(serviceURL);
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
            setServerlessList
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
      console.error(`Error on POST {dataToSend}.\n${reason}`);
      setEditDagLoading('');
    }
  };

  static listDagRunsListService = async (
    composerName: string,
    dagId: string,
    startDate: string,
    endDate: string,
    // selectedDate: Dayjs | null,
    setDagRunsList: (value: any) => void,
    setDagRunId: (value: string) => void,
    setIsLoading: (value: boolean) => void,

    setBlueListDates: (value: string[]) => void,
    setGreyListDates: (value: string[]) => void,
    setOrangeListDates: (value: string[]) => void,
    setRedListDates: (value: string[]) => void,
    setGreenListDates: (value: string[]) => void,
    setDarkGreenListDates: (value: string[]) => void
  ) => {
    setIsLoading(true);
    let start_date = startDate;
    let end_date = endDate;
    // if (selectedDate !== null) {
    //   start_date = new Date(selectedDate.toDate()).toISOString();
    //   const nextDate = new Date(selectedDate.toDate());
    //   nextDate.setDate(selectedDate.toDate().getDate() + 1);
    //   end_date = nextDate.toISOString();
    // }

    try {
      const data: any = await requestAPI(
        `dagRun?composer=${composerName}&dag_id=${dagId}&start_date=${start_date}&end_date=${end_date}`
      );
      let transformDagRunListData = [];

      if (data.dag_runs.length > 0) {
        transformDagRunListData = data.dag_runs.map((dagRun: any) => {
          return {
            dagRunId: dagRun.dag_run_id,
            filteredDate: new Date(dagRun.start_date)
              .toDateString()
              .split(' ')[2],
            state: dagRun.state,
            date: new Date(dagRun.start_date).toDateString(),
            time: new Date(dagRun.start_date).toTimeString().split(' ')[0]
          };
        });

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

        // if (selectedDate === null) {
        setBlueListDates(blueList);
        setGreyListDates(greyList);
        setOrangeListDates(orangeList);
        setRedListDates(redList);
        setGreenListDates(greenList);
        setDarkGreenListDates(darkGreenList);
        // }

        setDagRunsList(transformDagRunListData);
        setDagRunId(
          transformDagRunListData[transformDagRunListData.length - 1].dagRunId
        );
      } else {
        setDagRunsList([]);
        setDagRunId('');
        // if (selectedDate === null) {
        setBlueListDates([]);
        setGreyListDates([]);
        setOrangeListDates([]);
        setRedListDates([]);
        setGreenListDates([]);
        setDarkGreenListDates([]);
        // }
      }
      setIsLoading(false);
    } catch (reason) {
      console.error(`Error on GET credentials.\n${reason}`);
    }
  };
  static listDagInfoAPIService = async (
    setDagList: (value: string[]) => void,
    setIsLoading: (value: boolean) => void,
    setBucketName: (value: string) => void,
    composerSelected: string
  ) => {
    // setIsLoading(true);
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
      console.error('Error listing dag Scheduler list', error);
      toast.error('Failed to fetch dag Scheduler list', toastifyCustomStyle);
    }
  };
  static handleDownloadSchedulerAPIService = async (
    composerSelected: string,
    jobid: string,
    bucketName: string
  ) => {
    try {
      const serviceURL = `download?composer=${composerSelected}&dag_id=${jobid}&bucket_name=${bucketName}`;
      const formattedResponse: any = await requestAPI(serviceURL);
      if (formattedResponse.status === 0) {
        toast.success(`${jobid} downloaded successfully`, toastifyCustomStyle);
      } else {
        toast.error(`Failed to download the ${jobid}`, toastifyCustomStyle);
      }
    } catch (error) {
      DataprocLoggingService.log('Error in Download api', LOG_LEVEL.ERROR);
      console.error('Error in Download api', error);
    }
  };
  static handleDeleteSchedulerAPIService = async (
    composerSelected: string,
    dag_id: string,
    setDagList: (value: string[]) => void,
    setIsLoading: (value: boolean) => void,
    setBucketName: (value: string) => void
  ) => {
    try {
      const serviceURL = `delete?composer=${composerSelected}&dag_id=${dag_id}`;
      const deleteResponse: IUpdateSchedulerAPIResponse = await requestAPI(
        serviceURL
      );
      if (deleteResponse) {
        await SchedulerService.listDagInfoAPIService(
          setDagList,
          setIsLoading,
          setBucketName,
          composerSelected
        );
        toast.success(
          `Scheduler ${dag_id} deleted successfully`,
          toastifyCustomStyle
        );
      }
    } catch (error) {
      DataprocLoggingService.log('Error in Delete api', LOG_LEVEL.ERROR);
      console.error('Error in Delete api', error);
      toast.error(`Failed to delete the ${dag_id}`, toastifyCustomStyle);
    }
  };
  static handleUpdateSchedulerAPIService = async (
    composerSelected: string,
    dag_id: string,
    is_status_paused: boolean,
    setDagList: (value: string[]) => void,
    setIsLoading: (value: boolean) => void,
    setBucketName: (value: string) => void
  ) => {
    try {
      const serviceURL = `update?composer=${composerSelected}&dag_id=${dag_id}&status=${is_status_paused}`;
      const formattedResponse: IUpdateSchedulerAPIResponse = await requestAPI(
        serviceURL
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
      console.error('Error in Update api', error);
      toast.error('Failed to fetch Update api', toastifyCustomStyle);
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
      console.error(`Error on GET credentials.\n${reason}`);
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
      console.error(`Error on GET credentials.\n${reason}`);
    }
  };
}
