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
import { JupyterLab } from '@jupyterlab/application';
import { requestAPI } from '../../handler/handler';
import { DataprocLoggingService, LOG_LEVEL } from '../../utils/loggingService';
import { toastifyCustomStyle } from '../../utils/utils';

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

export class VertexServices {
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
            DataprocLoggingService.log(
                'Error listing machine type',
                LOG_LEVEL.ERROR
            );
            setMachineTypeLoading(false)
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
            if (formattedResponse.length === 0) {
                // Handle the case where the list is empty
                toast.error(
                    'No cloud storage buckets',
                    toastifyCustomStyle
                );
            } else {
                // console.log(formattedResponse)
                // let cloudStorageList: string[] = [];
                // formattedResponse.forEach((data: { name: string; }) => {
                //     cloudStorageList.push(data.name);
                // });
                // const cloudStorageList = formattedResponse['items'].map((bucket: { name: any; }) => (
                //     bucket.name
                // ));
                // cloudStorageList.sort();
                // setCloudStorageList(cloudStorageList);
                setCloudStorageList(formattedResponse)
            }
            setCloudStorageLoading(false)
        } catch (error) {
            DataprocLoggingService.log(
                'Error listing cloud storage bucket',
                LOG_LEVEL.ERROR
            );
            toast.error(
                `Failed to fetch cloud storage bucket`,
                toastifyCustomStyle
            );
            setCloudStorageLoading(false)
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
            DataprocLoggingService.log(
                'Error listing service accounts',
                LOG_LEVEL.ERROR
            );
            toast.error(
                `Failed to fetch service accounts list`,
                toastifyCustomStyle
            );
            setServiceAccountLoading(false)
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
                // Handle the case where the list is empty
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
            DataprocLoggingService.log(
                'Error listing primary network',
                LOG_LEVEL.ERROR
            );
            toast.error(
                `Failed to fetch primary network list`,
                toastifyCustomStyle
            );
            setPrimaryNetworkLoading(false)
        }
    };

    static subNetworkAPIService = async (
        region: string,
        setSubNetworkList: (value: { name: string; link: string }[]) => void,
        setSubNetworkLoading: (value: boolean) => void
    ) => {
        try {
            setSubNetworkLoading(true)
            const formattedResponse: any = await requestAPI(`api/compute/subNetwork?region_id=${region}`);
            if (formattedResponse.length === 0) {
                // Handle the case where the list is empty
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
            DataprocLoggingService.log(
                'Error listing sub networks',
                LOG_LEVEL.ERROR
            );
            toast.error(
                `Failed to fetch sub networks list`,
                toastifyCustomStyle
            );
            setSubNetworkLoading(false)
        }
    };

    static sharedNetworkAPIService = async (
        setSharedNetworkList: (value: string[]) => void,
        setSharedNetworkLoading: (value: boolean) => void
    ) => {
        try {
            setSharedNetworkLoading(true)
            const formattedResponse: any = await requestAPI(`api/compute/sharedNetwork`);
            if (formattedResponse.length === 0) {
                // Handle the case where the list is empty
                toast.error(
                    'No shared networks',
                    toastifyCustomStyle
                );
            } else {
                let sharedNetworkList: string[] = [];
                formattedResponse.forEach((data: { subnetwork: string }) => {
                    sharedNetworkList.push(data.subnetwork);
                });
                sharedNetworkList.sort();
                setSharedNetworkList(sharedNetworkList);
            }
            setSharedNetworkLoading(false)
        } catch (error) {
            DataprocLoggingService.log(
                'Error listing shared networks',
                LOG_LEVEL.ERROR
            );
            toast.error(
                `Failed to fetch shared networks list`,
                toastifyCustomStyle
            );
            setSharedNetworkLoading(false)
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
                        `Job scheduler successfully updated`,
                        toastifyCustomStyle
                    );
                } else {
                    toast.success(
                        `Job scheduler successfully created`,
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
            DataprocLoggingService.log(
                'Error listing vertex schedules',
                LOG_LEVEL.ERROR
            );
            // setTimeout(() => {
            //     toast.error(
            //         `Failed to fetch vertex schedules list`,
            //         toastifyCustomStyle
            //     );
            // }, 10000);

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
                DataprocLoggingService.log('Error in pausing schedule', LOG_LEVEL.ERROR);
                toast.error('Failed to pause schedule');
            }
        } catch (error) {
            DataprocLoggingService.log('Error in pausing schedule', LOG_LEVEL.ERROR);
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
                DataprocLoggingService.log('Error in resuming schedule', LOG_LEVEL.ERROR);
                toast.error('Failed to resume schedule');
            }
        } catch (error) {
            DataprocLoggingService.log('Error in resuming shedule', LOG_LEVEL.ERROR);
            toast.error(`Failed to resume shedule : ${error}`, toastifyCustomStyle);
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


}
