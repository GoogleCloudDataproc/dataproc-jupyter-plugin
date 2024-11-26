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

export class VertexServices {
    static machineTypeAPIService = async (
        region: string,
        setMachineTypeList: (value: string[]) => void,
        setIsLoading?: (value: boolean) => void
    ) => {
        try {
            const formattedResponse: any = await requestAPI(`api/vertex/uiConfig?region_id=${region}`);
            if (formattedResponse.length === 0) {
                // Handle the case where the list is empty
                toast.error(
                    'No machine type in this region',
                    toastifyCustomStyle
                );
                if (setIsLoading) {
                    setIsLoading(false);
                }
            } else {
                if (formattedResponse) {
                    setMachineTypeList(formattedResponse);
                }
                //   let machineTypeList: string[] = [];
                // formattedResponse.forEach((data: IMachineType) => {
                //   machineTypeList.push(data);
                // });
                // machineTypeList.sort();
            }
        } catch (error) {
            DataprocLoggingService.log(
                'Error listing machine type',
                LOG_LEVEL.ERROR
            );
            toast.error(
                `Failed to fetch machine type list : ${error}`,
                toastifyCustomStyle
            );
        }
    };

    static cloudStorageAPIService = async (
        setCloudStorageList: (value: string[]) => void,
        setIsLoading?: (value: boolean) => void
    ) => {
        try {
            const formattedResponse: any = await requestAPI(`api/storage/listBucket`);
            if (formattedResponse.length === 0) {
                // Handle the case where the list is empty
                toast.error(
                    'No cloud storage buckets',
                    toastifyCustomStyle
                );
                if (setIsLoading) {
                    setIsLoading(false);
                }
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
                `Failed to fetch cloud storage bucket : ${error}`,
                toastifyCustomStyle
            );
        }
    };

    static primaryNetworkAPIService = async (
        setPrimaryNetworkList: (value: string[]) => void,
        setIsLoading?: (value: boolean) => void
    ) => {
        try {
            const formattedResponse: any = await requestAPI(`api/compute/network`);
            if (formattedResponse.length === 0) {
                // Handle the case where the list is empty
                toast.error(
                    'No primary networks',
                    toastifyCustomStyle
                );
                if (setIsLoading) {
                    setIsLoading(false);
                }
            } else {
                // console.log('primary netwwork', formattedResponse)
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
                `Failed to fetch primary network list : ${error}`,
                toastifyCustomStyle
            );
        }
    };

    static subNetworkAPIService = async (
        setSubNetworkList: (value: string[]) => void,
        setIsLoading?: (value: boolean) => void
    ) => {
        try {
            const formattedResponse: any = await requestAPI(`api/compute/subNetwork`);
            if (formattedResponse.length === 0) {
                // Handle the case where the list is empty
                toast.error(
                    'No sub networks',
                    toastifyCustomStyle
                );
                if (setIsLoading) {
                    setIsLoading(false);
                }
            } else {
                // console.log('sub netwwork', formattedResponse)
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
                `Failed to fetch sub networks list : ${error}`,
                toastifyCustomStyle
            );
        }
    };

    static sharedNetworkAPIService = async (
        setSharedNetworkList: (value: string[]) => void,
        setIsLoading?: (value: boolean) => void
    ) => {
        try {
            const formattedResponse: any = await requestAPI(`api/compute/sharedNetwork`);
            if (formattedResponse.length === 0) {
                // Handle the case where the list is empty
                toast.error(
                    'No shared networks',
                    toastifyCustomStyle
                );
                if (setIsLoading) {
                    setIsLoading(false);
                }
            } else {
                // console.log('shared netwwork', formattedResponse)
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
                `Failed to fetch shared networks list : ${error}`,
                toastifyCustomStyle
            );
        }
    };
}
