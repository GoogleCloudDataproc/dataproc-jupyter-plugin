/**
 * @license
 * Copyright 2024 Google LLC
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

export class ComputeServices {
    static getParentProjectAPIService = async (
        setHostProject: (value: string) => void,
    ) => {
        try {
            const formattedResponse: any = await requestAPI(`api/compute/getXpnHost`);
            if (formattedResponse.length > 0) {
                if (formattedResponse) {
                    setHostProject(formattedResponse);
                }
            } else {
                setHostProject('')
            }
        } catch (error) {
            DataprocLoggingService.log(
                'Error fetching host project',
                LOG_LEVEL.ERROR
            );
            setHostProject('')
            toast.error(`Failed to fetch host project`);
        }
    };
    static primaryNetworkAPIService = async (
        setPrimaryNetworkList: (value: { name: string; link: string }[]) => void,
        setPrimaryNetworkLoading: (value: boolean) => void
    ) => {
        try {
            setPrimaryNetworkLoading(true)
            const formattedResponse: any = await requestAPI(`api/compute/network`);
            if (formattedResponse.length > 0) {
                const primaryNetworkList = formattedResponse.map((network: any) => ({
                    name: network.name,
                    link: network.selfLink
                }));
                primaryNetworkList.sort();
                setPrimaryNetworkList(primaryNetworkList);
            } else {
                setPrimaryNetworkList([])
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
        primaryNetworkSelected: string | undefined,
        setSubNetworkList: (value: { name: string; link: string }[]) => void,
        setSubNetworkLoading: (value: boolean) => void
    ) => {
        try {
            setSubNetworkLoading(true)
            const formattedResponse: any = await requestAPI(`api/compute/subNetwork?region_id=${region}&network_id=${primaryNetworkSelected}`);
            if (formattedResponse.length > 0) {
                const subNetworkList = formattedResponse.map((network: any) => ({
                    name: network.name,
                    link: network.selfLink
                }));
                subNetworkList.sort();
                setSubNetworkList(subNetworkList);
            } else {
                setSubNetworkList([])
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
            if (formattedResponse.length > 0) {
                const sharedNetworkList = formattedResponse.map((network: any) => ({
                    name: network.network.split('/').pop(),
                    network: network.network,
                    subnetwork: network.subnetwork
                }));
                sharedNetworkList.sort();
                setSharedNetworkList(sharedNetworkList);
            } else {
                setSharedNetworkList([])
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

}