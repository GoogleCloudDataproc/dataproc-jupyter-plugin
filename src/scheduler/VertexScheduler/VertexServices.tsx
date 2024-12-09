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
import { requestAPI } from '../../handler/handler';
import { DataprocLoggingService, LOG_LEVEL } from '../../utils/loggingService';
import { toastifyCustomStyle } from '../../utils/utils';
 
interface IDagList {
    displayName: string;
    schedule: string;
    status: string;
}

interface IUpdateSchedulerAPIResponse {
    status: number;
    error: string;
}

export class VertexServices {
    static machineTypeAPIService = async (
        region: string,
        setMachineTypeList: (value: string[]) => void,
    ) => {
        try {
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
        } catch (error) {
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
        // setIsLoading?: (value: boolean) => void
    ) => {
        try {
            const formattedResponse: any = await requestAPI(`api/storage/listBucket`);
            if (formattedResponse.length === 0) {
                // Handle the case where the list is empty
                toast.error(
                    'No cloud storage buckets',
                    toastifyCustomStyle
                );
                // if (setIsLoading) {
                //     setIsLoading(false);
                // }
            } else {
                console.log(formattedResponse)
                //   let cloudStorageList: string[] = [];
                // formattedResponse.forEach((data: IComposerAPIResponse) => {
                //   cloudStorageList.push(data.name);
                // });
                // cloudStorageList.sort();
                // setCloudStorageList(cloudStorageList);
            }
        } catch (error) {
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
        setServiceAccountList: (value: string[]) => void,
    ) => {
        try {
            const formattedResponse: any = await requestAPI(`api/iam/listServiceAccount`);
            if (formattedResponse.length === 0) {
                // Handle the case where the list is empty
                toast.error(
                    'No service accounts',
                    toastifyCustomStyle
                );
            } else {
                let serviceAccountList: string[] = [];
                formattedResponse.forEach((data: { name: string; }) => {
                    serviceAccountList.push(data.name);
                });
                serviceAccountList.sort();
                setServiceAccountList(serviceAccountList);
            }
        } catch (error) {
            DataprocLoggingService.log(
                'Error listing service accounts',
                LOG_LEVEL.ERROR
            );
            // toast.error(
            //     `Failed to fetch service accounts list`,
            //     toastifyCustomStyle
            // );
        }
    };

    static primaryNetworkAPIService = async (
        setPrimaryNetworkList: (value: string[]) => void,
    ) => {
        try {
            const formattedResponse: any = await requestAPI(`api/compute/network`);
            if (formattedResponse.length === 0) {
                // Handle the case where the list is empty
                toast.error(
                    'No primary networks',
                    toastifyCustomStyle
                );
            } else {
                let primaryList: string[] = [];
                formattedResponse.forEach((data: { name: string; }) => {
                    primaryList.push(data.name);
                });
                primaryList.sort();
                setPrimaryNetworkList(primaryList);
            }
        } catch (error) {
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
        setSubNetworkList: (value: string[]) => void,
    ) => {
        try {
            const formattedResponse: any = await requestAPI(`api/compute/subNetwork?region_id=${region}`);
            if (formattedResponse.length === 0) {
                // Handle the case where the list is empty
                toast.error(
                    'No sub networks',
                    toastifyCustomStyle
                );
            } else {
                let subNetworkList: string[] = [];
                formattedResponse.forEach((data: { name: string }) => {
                    subNetworkList.push(data.name);
                });
                subNetworkList.sort();
                setSubNetworkList(subNetworkList);
            }
        } catch (error) {
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
        setSharedNetworkList: (value: string[]) => void,
    ) => {
        try {
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
        } catch (error) {
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

    static listVertexSchedules = async (
        setDagList: (value: IDagList[]) => void,
        region: string,
        setIsLoading: (value: boolean) => void,
        setNextPageFlag: (value: string) => void,
    ) => {
        try {
            const serviceURL = 'api/vertex/listSchedules';
            const formattedResponse: any = await requestAPI(serviceURL + `?region_id=${region}`);
            if(Object.keys(formattedResponse).length !== 0) {
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
            }
        } catch (error) {
            DataprocLoggingService.log('Error in Update api', LOG_LEVEL.ERROR);
            toast.error(`Failed to fetch Update api : ${error}`, toastifyCustomStyle);
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
            }
        } catch (error) {
            DataprocLoggingService.log('Error in Update api', LOG_LEVEL.ERROR);
            toast.error(`Failed to fetch Update api : ${error}`, toastifyCustomStyle);
        }
    };

    static triggerSchedule = async (
        region: string,
        scheduleId: string,
        displayName: string
      ) => {
        try {
            const serviceURL = 'api/vertex/triggerSchedule';
          const data: any = await requestAPI(
            serviceURL + `?region_id=${region}&schedule_id=${scheduleId}`
          );
          if (data) {
           toast.success(`${displayName} triggered successfully `, toastifyCustomStyle);
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
          const deleteResponse: IUpdateSchedulerAPIResponse = await requestAPI(
            serviceURL + `?region_id=${region}&schedule_id=${scheduleId}`, { method: 'DELETE' }
          );
          if (Object.keys(deleteResponse).length !== 0) {
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


}
