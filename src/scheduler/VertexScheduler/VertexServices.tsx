import { toast } from 'react-toastify';
import { JupyterLab } from '@jupyterlab/application';
import { requestAPI } from '../../handler/handler';
import { DataprocLoggingService, LOG_LEVEL } from '../../utils/loggingService';
import { toastifyCustomStyle } from '../../utils/utils';
import { Dayjs } from 'dayjs';

interface IPayload {
    input_filename: string;
    display_name: string;
    machine_type: null;
    accelerator_type?: null;
    accelerator_count?: number | null;
    kernel_name: null;
    schedule_value: string | undefined;
    time_zone?: string;
    max_run_count: string | number;
    region: string;
    cloud_storage_bucket: string | null;
    parameters: string[];
    service_account: string | undefined,
    network: string | undefined;
    subnetwork: string | undefined;
    start_time: null | undefined;
    end_time: null | undefined;
}

interface IDagList {
    displayName: string;
    schedule: string;
    status: string;
}

interface IUpdateSchedulerAPIResponse {
    status: number;
    error: string;
}

interface DeleteSchedulerAPIResponse {
    done: boolean;
    metadata: object;
    name: string;
    response: object;
}

interface TriggerSchedule {
    metedata: object;
    name: string;
}

interface IDagRunList {
    dagRunId: string;
    startDate: string;
    endDate: string;
    gcsUrl: string;
    state: string;
    date: Date;
    time: string;
}

export class VertexServices {
    static getParentProjectAPIService = async (
        setHostProject: (value: string) => void,
    ) => {
        try {
            const formattedResponse: any = await requestAPI(`api/compute/getXpnHost`);
            if (formattedResponse.length === 0) {
                // Handle the case where the list is empty
                toast.error(
                    'No machine type in this region',
                    toastifyCustomStyle
                );
                setHostProject('')
            } else {
                if (formattedResponse) {
                    setHostProject(formattedResponse);
                }
            }
        } catch (error) {
            DataprocLoggingService.log(
                'Error listing machine type',
                LOG_LEVEL.ERROR
            );
            setHostProject('')
            // toast.error(
            //     `Failed to fetch machine type list`,
            //     toastifyCustomStyle
            // );
        }
    };
    static machineTypeAPIService = async (
        region: string,
        setMachineTypeList: (value: string[]) => void,
        setMachineTypeLoading: (value: boolean) => void,
    ) => {
        try {
            setMachineTypeLoading(true)
            const formattedResponse: any = await requestAPI(`api/vertex/uiConfig?region_id=${region}`);
            if (formattedResponse.length === 0) {
                // Handle the case where the list is empty
                setMachineTypeList([])
                toast.error(
                    'No machine type in this region',
                    toastifyCustomStyle
                );
            } else {
                if (formattedResponse) {
                    setMachineTypeList(formattedResponse);
                }
            }
            setMachineTypeLoading(false)
        } catch (error) {
            setMachineTypeList([])
            setMachineTypeLoading(false)
            DataprocLoggingService.log(
                'Error listing machine type',
                LOG_LEVEL.ERROR
            );
            toast.error(
                `Failed to fetch machine type list`,
                toastifyCustomStyle
            );
        }
    };

    static cloudStorageAPIService = async (
        setCloudStorageList: (value: string[]) => void,
        setCloudStorageLoading: (value: boolean) => void
    ) => {
        try {
            setCloudStorageLoading(true)
            const formattedResponse: any = await requestAPI(`api/storage/listBucket`);
            if (formattedResponse.length > 0) {
                setCloudStorageList(formattedResponse)
            } else {
                setCloudStorageList([])
                toast.error(
                    'No cloud storage buckets',
                    toastifyCustomStyle
                );
            }
            setCloudStorageLoading(false)
        } catch (error) {
            setCloudStorageList([])
            setCloudStorageLoading(false)
            DataprocLoggingService.log(
                'Error listing cloud storage bucket',
                LOG_LEVEL.ERROR
            );
            toast.error(
                `Failed to fetch cloud storage bucket`,
                toastifyCustomStyle
            );
        }
    };

    static serviceAccountAPIService = async (
        setServiceAccountList: (
            value: { displayName: string; email: string }[]
        ) => void,
        setServiceAccountLoading: (value: boolean) => void
    ) => {
        try {
            setServiceAccountLoading(true)
            const formattedResponse: any = await requestAPI(`api/iam/listServiceAccount`);
            if (formattedResponse.length === 0) {
                // Handle the case where the list is empty
                toast.error(
                    'No service accounts',
                    toastifyCustomStyle
                );
                setServiceAccountList([])
            } else {
                const serviceAccountList = formattedResponse.map((account: any) => ({
                    displayName: account.displayName,
                    email: account.email
                }));
                serviceAccountList.sort();
                setServiceAccountList(serviceAccountList);
            }
            setServiceAccountLoading(false)
        } catch (error) {
            setServiceAccountList([])
            setServiceAccountLoading(false)
            DataprocLoggingService.log(
                'Error listing service accounts',
                LOG_LEVEL.ERROR
            );
            toast.error(
                `Failed to fetch service accounts list`,
                toastifyCustomStyle
            );
        }
    };

    static primaryNetworkAPIService = async (
        setPrimaryNetworkList: (value: { name: string; link: string }[]) => void,
        setPrimaryNetworkLoading: (value: boolean) => void
    ) => {
        try {
            setPrimaryNetworkLoading(true)
            const formattedResponse: any = await requestAPI(`api/compute/network`);
            if (formattedResponse.length === 0) {
                setPrimaryNetworkList([])
                toast.error(
                    'No primary networks',
                    toastifyCustomStyle
                );
            } else {
                const primaryNetworkList = formattedResponse.map((network: any) => ({
                    name: network.name,
                    link: network.selfLink
                }));
                // let primaryList: string[] = [];
                // formattedResponse.forEach((data: { name: string; }) => {
                //     primaryList.push(data.name);
                // });
                primaryNetworkList.sort();
                setPrimaryNetworkList(primaryNetworkList);
            }
            setPrimaryNetworkLoading(false)
        } catch (error) {
            setPrimaryNetworkList([])
            setPrimaryNetworkLoading(false)
            DataprocLoggingService.log(
                'Error listing primary network',
                LOG_LEVEL.ERROR
            );
            toast.error(
                `Failed to fetch primary network list`,
                toastifyCustomStyle
            );
        }
    };

    static subNetworkAPIService = async (
        region: string,
        primaryNetworkSelected: string,
        setSubNetworkList: (value: { name: string; link: string }[]) => void,
        setSubNetworkLoading: (value: boolean) => void
    ) => {
        try {
            setSubNetworkLoading(true)
            const formattedResponse: any = await requestAPI(`api/compute/subNetwork?region_id=${region}&network_id=${primaryNetworkSelected}`);
            if (formattedResponse.length === 0) {
                setSubNetworkList([])
                toast.error(
                    'No sub networks',
                    toastifyCustomStyle
                );
            } else {
                // let subNetworkList: string[] = [];
                // formattedResponse.forEach((data: { name: string }) => {
                //     subNetworkList.push(data.name);
                // });
                const subNetworkList = formattedResponse.map((network: any) => ({
                    name: network.name,
                    link: network.selfLink
                }));
                subNetworkList.sort();
                setSubNetworkList(subNetworkList);
            }
            setSubNetworkLoading(false)
        } catch (error) {
            setSubNetworkList([])
            setSubNetworkLoading(false)
            DataprocLoggingService.log(
                'Error listing sub networks',
                LOG_LEVEL.ERROR
            );
            toast.error(
                `Failed to fetch sub networks list`,
                toastifyCustomStyle
            );
        }
    };

    static sharedNetworkAPIService = async (
        setSharedNetworkList: (value: { name: string; network: string, subnetwork: string }[]) => void,
        setSharedNetworkLoading: (value: boolean) => void
    ) => {
        try {
            setSharedNetworkLoading(true)
            const formattedResponse: any = await requestAPI(`api/compute/sharedNetwork`);
            if (formattedResponse.length === 0) {
                setSharedNetworkList([])
                toast.error(
                    'No shared networks',
                    toastifyCustomStyle
                );
            } else {
                const sharedNetworkList = formattedResponse.map((network: any) => ({
                    name: network.network.split('/').pop(),
                    network: network.network,
                    subnetwork: network.subnetwork
                }));
                sharedNetworkList.sort();
                setSharedNetworkList(sharedNetworkList);
            }
            setSharedNetworkLoading(false)
        } catch (error) {
            setSharedNetworkList([])
            setSharedNetworkLoading(false)
            DataprocLoggingService.log(
                'Error listing shared networks',
                LOG_LEVEL.ERROR
            );
            toast.error(
                `Failed to fetch shared networks list`,
                toastifyCustomStyle
            );
        }
    };

    static createVertexSchedulerService = async (
        payload: IPayload,
        app: JupyterLab,
        setCreateCompleted: (value: boolean) => void,
        setCreatingVertexScheduler: (value: boolean) => void,
        editMode: boolean
    ) => {
        setCreatingVertexScheduler(true);
        try {
            const data: any = await requestAPI('api/vertex/createJobScheduler', {
                body: JSON.stringify(payload),
                method: 'POST'
            });
            if (data.error) {
                toast.error(data.error, toastifyCustomStyle);
                setCreatingVertexScheduler(false);
            } else {
                if (editMode) {
                    toast.success(
                        `Job ${payload.display_name} successfully updated`,
                        toastifyCustomStyle
                    );
                } else {
                    toast.success(
                        `Job ${payload.display_name} successfully created`,
                        toastifyCustomStyle
                    );
                }
                setCreatingVertexScheduler(false);
                setCreateCompleted(true);
            }
        } catch (reason) {
            setCreatingVertexScheduler(false);
            toast.error(
                `Error on POST {dataToSend}.\n${reason}`,
                toastifyCustomStyle
            );
        }
    };

    static listVertexSchedules = async (
        setDagList: (value: IDagList[]) => void,
        region: string,
        setIsLoading: (value: boolean) => void,
        setNextPageFlag: (value: string) => void,
    ) => {
        try {
            const serviceURL = 'api/vertex/listSchedules';
            const formattedResponse: any = await requestAPI(serviceURL + `?region_id=${region}`);
            if (Object.keys(formattedResponse).length !== 0) {
                if (formattedResponse.schedules.length > 0) {
                    setDagList(formattedResponse.schedules);
                    setIsLoading(false);
                    setNextPageFlag(formattedResponse?.nextPageToken)
                }
            } else {
                setDagList([]);
                setIsLoading(false);
            }
        } catch (error) {
            setDagList([]);
            DataprocLoggingService.log(
                'Error listing vertex schedules',
                LOG_LEVEL.ERROR
            );

        }
    }

    static handleUpdateSchedulerPauseAPIService = async (
        scheduleId: string,
        region: string,
        setDagList: (value: IDagList[]) => void,
        setIsLoading: (value: boolean) => void,
        setNextPageFlag: (value: string) => void,
        displayName: string
    ) => {
        try {
            const serviceURL = 'api/vertex/pauseSchedule';
            const formattedResponse: IUpdateSchedulerAPIResponse = await requestAPI(
                serviceURL + `?region_id=${region}&&schedule_id=${scheduleId}`,
            );
            if (Object.keys(formattedResponse).length === 0) {
                toast.success(
                    `Schedule ${displayName} updated successfully`,
                    toastifyCustomStyle
                );
                await VertexServices.listVertexSchedules(
                    setDagList,
                    region,
                    setIsLoading,
                    setNextPageFlag
                );
            } else {
                DataprocLoggingService.log('Error in pause schedule', LOG_LEVEL.ERROR);
                toast.error('Failed to pause schedule');
            }
        } catch (error) {
            DataprocLoggingService.log('Error in pause schedule', LOG_LEVEL.ERROR);
            toast.error(`Failed to pause schedule : ${error}`, toastifyCustomStyle);
        }
    };

    static handleUpdateSchedulerResumeAPIService = async (
        region: string,
        scheduleId: string,
        setDagList: (value: IDagList[]) => void,
        setIsLoading: (value: boolean) => void,
        setNextPageFlag: (value: string) => void,
        displayName: string
    ) => {
        try {
            const serviceURL = 'api/vertex/resumeSchedule';
            const formattedResponse: IUpdateSchedulerAPIResponse = await requestAPI(
                serviceURL + `?region_id=${region}&schedule_id=${scheduleId}`,
            );
            if (Object.keys(formattedResponse).length === 0) {
                toast.success(
                    `Schedule ${displayName} updated successfully`,
                    toastifyCustomStyle
                );
                await VertexServices.listVertexSchedules(
                    setDagList,
                    region,
                    setIsLoading,
                    setNextPageFlag
                );
            } else {
                DataprocLoggingService.log('Error in resume schedule', LOG_LEVEL.ERROR);
                toast.error('Failed to resume schedule');
            }
        } catch (error) {
            DataprocLoggingService.log('Error in resume schedule', LOG_LEVEL.ERROR);
            toast.error(`Failed to resume schedule : ${error}`, toastifyCustomStyle);
        }
    };

    static triggerSchedule = async (
        region: string,
        scheduleId: string,
        displayName: string
    ) => {
        try {
            const serviceURL = 'api/vertex/triggerSchedule';
            const data: TriggerSchedule = await requestAPI(
                serviceURL + `?region_id=${region}&schedule_id=${scheduleId}`
            );
            if (data.name) {
                toast.success(`${displayName} triggered successfully `, toastifyCustomStyle);
            }
            else {
                toast.error(
                    `Failed to Trigger ${displayName}`,
                    toastifyCustomStyle
                );
            }
        } catch (reason) {
            toast.error(
                `Failed to Trigger ${displayName} : ${reason}`,
                toastifyCustomStyle
            );
        }
    };

    static handleDeleteSchedulerAPIService = async (
        region: string,
        scheduleId: string,
        displayName: string,
        setDagList: (value: IDagList[]) => void,
        setIsLoading: (value: boolean) => void,
        setNextPageFlag: (value: string) => void,
    ) => {
        try {
            const serviceURL = `api/vertex/deleteSchedule`;
            const deleteResponse: DeleteSchedulerAPIResponse = await requestAPI(
                serviceURL + `?region_id=${region}&schedule_id=${scheduleId}`, { method: 'DELETE' }
            );
            if (deleteResponse.done) {
                await VertexServices.listVertexSchedules(
                    setDagList,
                    region,
                    setIsLoading,
                    setNextPageFlag
                );
                toast.success(
                    `Deleted job ${displayName}. It might take a few minutes to for it to be deleted from the list of jobs.`,
                    toastifyCustomStyle
                );
            } else {
                toast.error(`Failed to delete the ${displayName}`, toastifyCustomStyle);
            }
        } catch (error) {
            DataprocLoggingService.log('Error in Delete api', LOG_LEVEL.ERROR);
            toast.error(
                `Failed to delete the ${displayName} : ${error}`,
                toastifyCustomStyle
            );
        }
    };

    static editVertexSchedulerService = async (
        scheduleId: string,
        region: string,
        setInputNotebookFilePath: (value: string) => void,
        setEditNotebookLoading: (value: string) => void,
    ) => {
        setEditNotebookLoading(scheduleId);
        try {
            const serviceURL = `api/vertex/getSchedule`;
            const formattedResponse: any = await requestAPI(serviceURL + `?region_id=${region}&schedule_id=${scheduleId}`
            );
            if (formattedResponse.createNotebookExecutionJobRequest.notebookExecutionJob.hasOwnProperty("gcsNotebookSource")) {
                setInputNotebookFilePath(formattedResponse.createNotebookExecutionJobRequest.notebookExecutionJob.gcsNotebookSource.uri);
            } else {
                setEditNotebookLoading('');
                toast.error(
                    `File path not found`,
                    toastifyCustomStyle
                );
            }

        } catch (reason) {
            setEditNotebookLoading('');
            toast.error(
                `Error in updating notebook.\n${reason}`,
                toastifyCustomStyle
            );
        }
    };

    static executionHistoryServiceList = async (
        region: string,
        schedulerData: any,
        selectedMonth: Dayjs | null,
        setIsLoading: (value: boolean) => void,
        setDagRunsList: (value: IDagRunList[]) => void,
        setBlueListDates: (value: string[]) => void,
        setGreyListDates: (value: string[]) => void,
        setOrangeListDates: (value: string[]) => void,
        setRedListDates: (value: string[]) => void,
        setGreenListDates: (value: string[]) => void,
        setDarkGreenListDates: (value: string[]) => void,
    ) => {
        setIsLoading(true)
        let selected_month = selectedMonth && selectedMonth.toISOString()
        let schedule_id = schedulerData.name.split('/').pop()
        const serviceURL = `api/vertex/listNotebookExecutionJobs`;
        // const formattedResponse: any = await requestAPI(serviceURL + `?region_id=${region}&schedule_id=${scheduleId}&start_date=2024-12-12T00:00:00.000Z`
        const formattedResponse: any = await requestAPI(serviceURL + `?region_id=${region}&schedule_id=${schedule_id}&start_date=${selected_month}`
        );
        try {
            let transformDagRunListDataCurrent = [];
            if (formattedResponse && formattedResponse.length > 0) {
                transformDagRunListDataCurrent = formattedResponse.map((dagRun: any) => {
                    const createTime = new Date(dagRun.createTime);
                    const updateTime = new Date(dagRun.updateTime);
                    const timeDifferenceMilliseconds = updateTime.getTime() - createTime.getTime(); // Difference in milliseconds
                    const totalSeconds = Math.floor(timeDifferenceMilliseconds / 1000); // Convert to seconds
                    const minutes = Math.floor(totalSeconds / 60);
                    const seconds = totalSeconds % 60;
                    return {
                        dagRunId: dagRun.name.split('/').pop(),
                        startDate: dagRun.createTime,
                        endDate: dagRun.updateTime,
                        gcsUrl: dagRun.gcsOutputUri,
                        state: dagRun.jobState.split('_')[2].toLowerCase(),
                        date: new Date(dagRun.createTime).toDateString(),
                        time: `${minutes} min ${seconds} sec`
                    };
                });
            }
            // Group data by date and state
            const groupedDataByDateStatus = transformDagRunListDataCurrent.reduce((result: any, item: any) => {
                const date = item.date; // Group by date
                const status = item.state; // Group by state

                if (!result[date]) {
                    result[date] = {};
                }

                if (!result[date][status]) {
                    result[date][status] = [];
                }

                result[date][status].push(item);

                return result;
            }, {});

            // Initialize grouping lists
            let blueList: string[] = [];
            let greyList: string[] = [];
            let orangeList: string[] = [];
            let redList: string[] = [];
            let greenList: string[] = [];
            let darkGreenList: string[] = [];

            // Process grouped data
            Object.keys(groupedDataByDateStatus).forEach((dateValue) => {
                if (groupedDataByDateStatus[dateValue].running) {
                    blueList.push(dateValue);
                } else if (groupedDataByDateStatus[dateValue].queued) {
                    greyList.push(dateValue);
                } else if (
                    groupedDataByDateStatus[dateValue].failed &&
                    groupedDataByDateStatus[dateValue].succeeded
                ) {
                    orangeList.push(dateValue);
                } else if (groupedDataByDateStatus[dateValue].failed) {
                    redList.push(dateValue);
                } else if (
                    groupedDataByDateStatus[dateValue].succeeded &&
                    groupedDataByDateStatus[dateValue].succeeded.length === 1
                ) {
                    greenList.push(dateValue);
                } else {
                    darkGreenList.push(dateValue);
                }
            });
            // Update state lists with their respective transformations
            setBlueListDates(blueList);
            setGreyListDates(greyList);
            setOrangeListDates(orangeList);
            setRedListDates(redList);
            setGreenListDates(greenList);
            setDarkGreenListDates(darkGreenList);
            console.log(transformDagRunListDataCurrent.length)
            setDagRunsList(transformDagRunListDataCurrent)
        } catch (error) {
            toast.error(
                `Error in fetching the execution history`,
                toastifyCustomStyle
            );
        }
        setIsLoading(false)
    };

    static vertexJobTaskLogsListService = async (
        dagRunId: string,
        jobRunsData: IDagRunList | undefined,
        setDagTaskInstancesList: (value: any) => void,
        setIsLoading: (value: boolean) => void
    ) => {
        setDagTaskInstancesList([]);
        setIsLoading(true);
        const start_date = encodeURIComponent(jobRunsData?.startDate || '');
        const end_date = encodeURIComponent(jobRunsData?.endDate || '');
        try {
            const data: any = await requestAPI(
                `api/logEntries/listEntries?filter_query=timestamp >= \"${start_date}" AND timestamp <= \"${end_date}" AND SEARCH(\"${dagRunId}\")`
            );
            let transformDagRunTaskInstanceListData = [];
            transformDagRunTaskInstanceListData = data.entries.map(
                (dagRunTask: any) => {
                    return {
                        severity: dagRunTask.severity,
                        textPayload: dagRunTask.textPayload && dagRunTask.textPayload ? dagRunTask.textPayload : '',
                        date: new Date(dagRunTask.timestamp).toDateString(),
                        time: new Date(dagRunTask.timestamp).toTimeString().split(' ')[0],
                        fullData: dagRunTask,
                    };
                }
            );
            setDagTaskInstancesList(transformDagRunTaskInstanceListData);
            setIsLoading(false);
        } catch (reason) {
            setIsLoading(false);
            setDagTaskInstancesList([]);
        }
    };
}
