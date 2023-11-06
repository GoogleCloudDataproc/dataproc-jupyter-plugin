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

import React, { ChangeEvent, useEffect, useState } from 'react';
import { LabIcon } from '@jupyterlab/ui-components';
import 'react-toastify/dist/ReactToastify.css';
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  ARTIFACT_REGISTERY,
  BASE_URL,
  BASE_URL_META,
  BASE_URL_NETWORKS,
  CONTAINER_REGISTERY,
  CUSTOM_CONTAINERS,
  CUSTOM_CONTAINER_MESSAGE,
  CUSTOM_CONTAINER_MESSAGE_PART,
  HTTP_METHOD,
  LOGIN_STATE,
  REGION_URL,
  SHARED_VPC,
  STATUS_RUNNING,
  USER_INFO_URL
} from '../utils/const';
import LabelProperties from '../jobs/labelProperties';
import {
  authApi,
  toastifyCustomStyle,
  authenticatedFetch,
  iconDisplay,
  loggedFetch,
  checkConfig
} from '../utils/utils';
import { ClipLoader } from 'react-spinners';
import ErrorPopup from '../utils/errorPopup';
import errorIcon from '../../style/icons/error_icon.svg';
import { toast } from 'react-toastify';
import LeftArrowIcon from '../../style/icons/left_arrow_icon.svg';
import { Input } from '../controls/MuiWrappedInput';
import { Select } from '../controls/MuiWrappedSelect';
import { TagsInput } from '../controls/MuiWrappedTagsInput';
import { JupyterLab } from '@jupyterlab/application';
import { KernelSpecAPI } from '@jupyterlab/services';
import { ILauncher } from '@jupyterlab/launcher';
import { DropdownProps } from 'semantic-ui-react';

import { DynamicDropdown } from '../controls/DynamicDropdown';
import { projectListAPI } from '../utils/projectService';
import { Autocomplete, Radio, TextField } from '@mui/material';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';

const iconLeftArrow = new LabIcon({
  name: 'launcher:left-arrow-icon',
  svgstr: LeftArrowIcon
});

type Network = {
  selfLink: string;
  network: string;
  subnetworks: string;
};

const iconError = new LabIcon({
  name: 'launcher:error-icon',
  svgstr: errorIcon
});

let networkUris: string[] = [];
let key: string[] | (() => string[]) = [];
let value: string[] | (() => string[]) = [];

function CreateRunTime({
  setOpenCreateTemplate,
  selectedRuntimeClone,
  launcher,
  app,
  fromPage
}: {
  setOpenCreateTemplate: (value: boolean) => void;
  selectedRuntimeClone: any;
  launcher: ILauncher;
  app: JupyterLab;
  fromPage: string;
}) {
  const [generationCompleted, setGenerationCompleted] = useState(false);
  const [displayNameSelected, setDisplayNameSelected] = useState('');
  const [desciptionSelected, setDescriptionSelected] = useState('');
  const [runTimeSelected, setRunTimeSelected] = useState('');
  const [versionSelected, setVersionSelected] = useState('2.1');
  const [pythonRepositorySelected, setPythonRepositorySelected] = useState('');
  const [networkTagSelected, setNetworkTagSelected] = useState([
    ...networkUris
  ]);
  const [propertyDetail, setPropertyDetail] = useState(['']);
  const [propertyDetailUpdated, setPropertyDetailUpdated] = useState(['']);
  const [keyValidation, setKeyValidation] = useState(-1);
  const [valueValidation, setValueValidation] = useState(-1);
  const [duplicateKeyError, setDuplicateKeyError] = useState(-1);
  const [labelDetail, setLabelDetail] = useState(key);
  const [labelDetailUpdated, setLabelDetailUpdated] = useState(value);
  const [servicesList, setServicesList] = useState<string[]>([]);
  const [servicesSelected, setServicesSelected] = useState('');
  const [clusterSelected, setClusterSelected] = useState('');
  const [projectId, setProjectId] = useState<string | null>('');
  const [region, setRegion] = useState('');
  const [containerImageSelected, setContainerImageSelected] = useState('');
  const [networkList, setNetworklist] = useState([{}]);
  const [subNetworkList, setSubNetworklist] = useState<string[]>([]);
  const [networkSelected, setNetworkSelected] = useState('');
  const [subNetworkSelected, setSubNetworkSelected] = useState('');
  const [isLoadingService, setIsLoadingService] = useState(false);
  const [error, setError] = useState({ isOpen: false, message: '' });
  const [clustersList, setClustersList] = useState<string[]>([]);
  const [runTimeValidation, setRuntimeValidation] = useState(false);
  const [descriptionValidation, setDescriptionValidation] = useState(false);
  const [displayNameValidation, setDisplayNameValidation] = useState(false);
  const [versionValidation, setVersionValidation] = useState(false);
  const [idleValidation, setIdleValidation] = useState(false);
  const [autoValidation, setAutoValidation] = useState(false);
  const [defaultValue, setDefaultValue] = useState('');
  const [idleTimeSelected, setIdleTimeSelected] = useState('');
  const [timeSelected, setTimeSelected] = useState('');
  const [autoTimeSelected, setAutoTimeSelected] = useState('');
  const [autoSelected, setAutoSelected] = useState('');
  const [timeList, setTimeList] = useState([{}]);
  const [createTime, setCreateTime] = useState('');
  const [userInfo, setUserInfo] = useState('');
  const [duplicateValidation, setDuplicateValidation] = useState(false);
  const [isloadingNetwork, setIsloadingNetwork] = useState(false);
  const [selectedNetworkRadio, setSelectedNetworkRadio] = useState<
    'sharedVpc' | 'projectNetwork'
  >('projectNetwork');
  const [projectInfo, setProjectInfo] = useState('');
  const [configError, setConfigError] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);

  const [sharedSubNetworkList, setSharedSubNetworkList] = useState<string[]>(
    []
  );
  const [sharedvpcSelected, setSharedvpcSelected] = useState('');
  useEffect(() => {
    checkConfig(setLoggedIn, setConfigError, setLoginError);
    const localstorageGetInformation = localStorage.getItem('loginState');
    setLoggedIn(localstorageGetInformation === LOGIN_STATE);
    if (loggedIn) {
      setConfigLoading(false);
    }
    const timeData = [
      { key: 'h', value: 'h', text: 'hour' },
      { key: 'm', value: 'm', text: 'min' },
      { key: 's', value: 's', text: 'sec' }
    ];

    setTimeList(timeData);
    updateLogic();
    listClustersAPI();
    listNetworksAPI();
    runtimeSharedProject();
  }, []);

  useEffect(() => {

    if (selectedRuntimeClone === undefined) {
      generateRandomHex();
    }
  }, [
    runTimeSelected,
    keyValidation,
    valueValidation,
    duplicateKeyError,
    displayNameValidation,
    versionValidation,
    idleValidation,
    autoValidation,
    descriptionValidation,
    runTimeValidation,
    projectId,
    region,
    servicesSelected
  ]);
  useEffect(() => {
    listSubNetworksAPI(networkSelected);
  }, [networkSelected]);
  interface IUserInfoResponse {
    email: string;
    picture: string;
    error: {
      message: string;
      code: number;
    };
  }
  const displayUserInfo = async () => {
    const credentials = await authApi();
    if (credentials) {
      loggedFetch(USER_INFO_URL, {
        method: 'GET',
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token
        }
      })
        .then((response: Response) => {
          response
            .json()
            .then((responseResult: IUserInfoResponse) => {
              setUserInfo(responseResult.email);
              if (responseResult?.error?.code) {
                toast.error(responseResult?.error?.message, toastifyCustomStyle);
              }
            })
            .catch((e: Error) => console.log(e));
        })
        .catch((err: Error) => {
          console.error('Error displaying user info', err);
          DataprocLoggingService.log('Error displaying user info', LOG_LEVEL.ERROR);
          toast.error('Failed to fetch user information', toastifyCustomStyle);
        });
    }
  };
  interface IApiResponse {
    name: string;
    error: {
      message: string;
      code: number;
    };
  }

  const runtimeSharedProject = async () => {
    const credentials = await authApi();
    if (credentials) {
      let apiURL = `${REGION_URL}/${credentials.project_id}/getXpnHost`;
      loggedFetch(apiURL, {
        method: 'GET',
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token
        }
      })
        .then((response: Response) => {
          response
            .json()
            .then((responseResult: IApiResponse) => {
              setProjectInfo(responseResult.name);
              listSharedVPC(responseResult.name);
              if (responseResult?.error?.code) {
                toast.error(responseResult?.error?.message, toastifyCustomStyle);
              }
            })
            .catch((e: Error) => console.log(e));
        })
        .catch((err: Error) => {
          console.error('Error displaying user info', err);
          DataprocLoggingService.log('Error displaying user info', LOG_LEVEL.ERROR);
          toast.error('Failed to fetch user information', toastifyCustomStyle);
        });
    }
  };

  const listSharedVPC = async (projectName: string) => {
    try {
      const credentials = await authApi();
      if (!credentials) {
        return false;
      }
      const apiURL = `${REGION_URL}/${projectName}/aggregated/subnetworks/listUsable`;
      const response = await loggedFetch(apiURL, {
        method: 'GET',
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token
        }
      });
      const responseResult = await response.json();
      /*
              Extracting subNetwork from items
              Example: "https://www.googleapis.com/compute/v1/projects/{projectName}/aggregated/subnetworks/listUsable",
            */

      const transformedSharedvpcSubNetworkList: string[] = responseResult.items
        .map((data: { subnetwork: string }) => {
          // Extract region and subnet from the subnet URI.
          const matches =
            /\/compute\/v1\/projects\/(?<project>[\w\-]+)\/regions\/(?<region>[\w\-]+)\/subnetworks\/(?<subnetwork>[\w\-]+)/.exec(
              data.subnetwork
            )?.groups;
          if (matches?.['region'] != credentials.region_id) {
            // If region doesn't match the current region, set it to undefined and let
            // it be filtered out below.
            return undefined;
          }
          return matches?.['subnetwork'];
        })
        // Filter out empty values
        .filter((subNetwork: string) => subNetwork);

      setSharedSubNetworkList(transformedSharedvpcSubNetworkList);
      if (responseResult?.error?.code) {
        toast.error(responseResult?.error?.message, toastifyCustomStyle);
      }
    } catch (err) {
      console.error('Error displaying sharedVPC subNetwork', err);
      DataprocLoggingService.log('Error displaying sharedVPC subNetwork', LOG_LEVEL.ERROR);
      toast.error('Failed to fetch  sharedVPC subNetwork', toastifyCustomStyle);
    }
  };

  const updateLogic = () => {
    if (selectedRuntimeClone !== undefined) {
      const {
        jupyterSession,
        name,
        description,
        runtimeConfig,
        creator,
        createTime,
        environmentConfig
      } = selectedRuntimeClone;
      const displayName = jupyterSession?.displayName
        ? jupyterSession.displayName
        : '';
      const runTimeID = name.split('/')[5] ? name.split('/')[5] : '';
      const descriptionDetail = description ? description : '';
      const versionDetail = runtimeConfig?.version
        ? runtimeConfig.version
        : '2.1';
      const containerImage = runtimeConfig?.containerImage
        ? runtimeConfig.containerImage
        : '';

      let pythonRepositorySelected = '';

      if (
        runtimeConfig?.repositoryConfig?.pypiRepositoryConfig?.pypiRepository
      ) {
        pythonRepositorySelected =
          runtimeConfig.repositoryConfig.pypiRepositoryConfig.pypiRepository;
        setPythonRepositorySelected(pythonRepositorySelected);
      }

      setDisplayNameSelected(displayName);
      /*
         Extracting runtimeId from name
         Example: "projects/{projectName}/locations/{region}/sessionTemplates/{runtimeid}",
      */
      setRunTimeSelected(runTimeID);
      setDescriptionSelected(descriptionDetail);
      setVersionSelected(versionDetail);
      setContainerImageSelected(containerImage);
      setUserInfo(creator);
      setCreateTime(createTime);

      let runtimeKeys: string[] = [];
      if (Object.keys(selectedRuntimeClone).length !== 0) {
        if (selectedRuntimeClone.hasOwnProperty('labels')) {
          const updatedLabelDetail = Object.entries(
            selectedRuntimeClone.labels
          ).map(([k, v]) => `${k}:${v}`);
          setLabelDetail(prevLabelDetail => [
            ...prevLabelDetail,
            ...updatedLabelDetail
          ]);
          setLabelDetailUpdated(prevLabelDetailUpdated => [
            ...prevLabelDetailUpdated,
            ...updatedLabelDetail
          ]);
          for (const key in selectedRuntimeClone) {
            runtimeKeys.push(key);
          }

          if (selectedRuntimeClone.runtimeConfig.hasOwnProperty('properties')) {
            const updatedPropertyDetail = Object.entries(
              selectedRuntimeClone.runtimeConfig.properties
            ).map(([k, v]) => `${k}:${v}`);
            setPropertyDetail(prevPropertyDetail => [
              ...prevPropertyDetail,
              ...updatedPropertyDetail
            ]);
            setPropertyDetailUpdated(prevPropertyDetailUpdated => [
              ...prevPropertyDetailUpdated,
              ...updatedPropertyDetail
            ]);
          }
        }
      }

      if (environmentConfig) {
        const executionConfig = environmentConfig.executionConfig;
        const peripheralsConfig = environmentConfig.peripheralsConfig;

        if (executionConfig) {
          const sharedVpcMatches =
            /projects\/(?<project>[\w\-]+)\/regions\/(?<region>[\w\-]+)\/subnetworks\/(?<subnetwork>[\w\-]+)/.exec(
              executionConfig.subnetworkUri
            );
          // Is this a shared VPC?
          if (sharedVpcMatches?.groups?.['subnetwork']) {
            setSharedvpcSelected(sharedVpcMatches?.groups?.['subnetwork']);
            setSelectedNetworkRadio('sharedVpc');
          } else {
            setSubNetworkSelected(executionConfig.subnetworkUri);
            setSelectedNetworkRadio('projectNetwork');
          }

          if (executionConfig.hasOwnProperty('idleTtl')) {
            const idleTtlUnit = executionConfig.idleTtl.slice(-1);

            setTimeSelected(idleTtlUnit);

            const idleTtlInSecondsWithoutUnit = executionConfig.idleTtl
              .toString()
              .slice(0, -1);
            setIdleTimeSelected(idleTtlInSecondsWithoutUnit);
          }

          if (executionConfig.hasOwnProperty('ttl')) {
            const ttlUnit = executionConfig.idleTtl.slice(-1); // Extracting the last character 's'

            setAutoSelected(ttlUnit);

            const ttlInSecondsWithoutUnit = executionConfig.ttl
              .toString()
              .slice(0, -1);
            setAutoTimeSelected(ttlInSecondsWithoutUnit);
          }
          setNetworkTagSelected(
            executionConfig.hasOwnProperty('networkTags')
              ? executionConfig.networkTags
              : []
          );
        }

        if (
          peripheralsConfig &&
          peripheralsConfig.metastoreService !== undefined
        ) {
          setServicesSelected(peripheralsConfig.metastoreService);
          const metastoreDetails =
            peripheralsConfig?.metastoreService?.split('/');
          const metaProject = peripheralsConfig?.metastoreService?.split('/')
            ? metastoreDetails[1]
            : '';
          const metaRegion = peripheralsConfig?.metastoreService?.split('/')
            ? metastoreDetails[3]
            : '';
          setProjectId(metaProject);
          setRegion(metaRegion);
        }

        if (
          peripheralsConfig &&
          peripheralsConfig.sparkHistoryServerConfig &&
          peripheralsConfig.sparkHistoryServerConfig.hasOwnProperty(
            'dataprocCluster'
          )
        ) {
          const dataprocCluster =
            peripheralsConfig.sparkHistoryServerConfig.dataprocCluster;
          /*
         Extracting clusterName from dataprocCluster
         Example: "projects/{projectName}/locations/{region}/sessionTemplates/{dataprocCluster}",
      */
          setClusterSelected(dataprocCluster.split('/')[5]);
        }
        listNetworksFromSubNetworkAPI(executionConfig.subnetworkUri);
      }
    } else {
      displayUserInfo();
      setCreateTime(new Date().toISOString());
    }
  };
  interface INetworkAPI {
    network: string;
    error: {
      message: string;
      code: number;
    };
  }
  const listNetworksFromSubNetworkAPI = async (subnetwork: string) => {
    setIsloadingNetwork(true);
    const credentials = await authApi();
    if (credentials) {
      loggedFetch(
        `${BASE_URL_NETWORKS}/projects/${credentials.project_id}/regions/${credentials.region_id}/subnetworks/${subnetwork}`,
        {
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      )
        .then((response: Response) => {
          response
            .json()
            .then((responseResult: INetworkAPI) => {
              let transformedNetworkSelected = '';
              /*
         Extracting network from items
         Example: "https://www.googleapis.com/compute/v1/projects/{projectName}/global/subnetworks/",
      */
              transformedNetworkSelected = responseResult.network.split('/')[9];

              setNetworkSelected(transformedNetworkSelected);
              setSubNetworkSelected(subnetwork);
              setDefaultValue(subnetwork);
              setIsloadingNetwork(false);
              if (responseResult?.error?.code) {
                toast.error(responseResult?.error?.message, toastifyCustomStyle);
              }
            })

            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          setIsloadingNetwork(false);
          DataprocLoggingService.log('Error selecting Network', LOG_LEVEL.ERROR);
          console.error('Error selecting Network', err);
        });
    }
  };
  const listClustersAPI = async () => {
    try {
      const queryParams = new URLSearchParams({ pageSize: '100' });
      const response = await authenticatedFetch({
        uri: 'clusters',
        method: HTTP_METHOD.GET,
        regionIdentifier: 'regions',
        queryParams: queryParams
      });
      const formattedResponse = await response.json();
      let transformClusterListData: string[] = [];
      transformClusterListData = formattedResponse.clusters
        .filter((data: { clusterName: string; status: { state: string } }) => {
          return data.status.state === STATUS_RUNNING;
        })
        .map((data: { clusterName: string }) => data.clusterName);
      setClustersList(transformClusterListData);
    } catch (error) {
      console.error('Error listing clusters', error);
      DataprocLoggingService.log('Error listing clusters', LOG_LEVEL.ERROR);
      toast.error('Failed to list the clusters', toastifyCustomStyle);
    }
  };

  const listNetworksAPI = async () => {
    try {
      const response = await authenticatedFetch({
        baseUrl: BASE_URL_NETWORKS,
        uri: 'networks',
        method: HTTP_METHOD.GET,
        regionIdentifier: 'global'
      });
      const formattedResponse: { items: Network[] } = await response.json();
      let transformedNetworkList = [];
      /*
 Extracting network from items
 Example: "https://www.googleapis.com/compute/v1/projects/{projectName}/global/networks/",
*/

      transformedNetworkList = formattedResponse.items.map((data: Network) => {
        return data.selfLink.split('/')[9];
      });

      setNetworklist(transformedNetworkList);
      setNetworkSelected(transformedNetworkList[0]);
    } catch (error) {
      DataprocLoggingService.log('Error listing Networks', LOG_LEVEL.ERROR);
      console.error('Error listing Networks', error);
    }
  };

  const listSubNetworksAPI = async (subnetwork: string) => {
    const credentials = await authApi();
    if (credentials) {
      loggedFetch(
        `${BASE_URL_NETWORKS}/projects/${credentials.project_id}/regions/${credentials.region_id}/subnetworks`,
        {
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      )
        .then((response: Response) => {
          response
            .json()
            .then(
              (responseResult: {
                items: {
                  name: string;
                  network: string;
                  privateIpGoogleAccess: boolean;
                }[];
                error: {
                  message: string;
                  code: number;
                };
              }) => {
                const filteredServices = responseResult.items.filter(
                  (item: { network: string; privateIpGoogleAccess: boolean }) =>
                    item.network.split('/')[9] === subnetwork &&
                    item.privateIpGoogleAccess === true
                );
                const transformedServiceList = filteredServices.map(
                  (data: { name: string }) => data.name
                );
                setSubNetworklist(transformedServiceList);
                setSubNetworkSelected(transformedServiceList[0]);
                if (responseResult?.error?.code) {
                  toast.error(responseResult?.error?.message, toastifyCustomStyle);
                }
              }
            )
            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          console.error('Error listing subNetworks', err);
          DataprocLoggingService.log('Error listing subNetworks', LOG_LEVEL.ERROR);
        });
    }
  };

  type Region = {
    name: string;
  };

  const regionListAPI = async (projectId: string,  network: string | undefined) => {
    const credentials = await authApi();
    if (credentials) {
      loggedFetch(`${REGION_URL}/${projectId}/regions`, {
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token,
        },
      })
        .then((response: Response) => {
          response
            .json()
            .then((responseResult: { items: Region[],error: {
              code: number;
              message: string;
            }; }) => {
              let transformedRegionList = responseResult.items.map(
                (data: Region) => {
                  return data.name;
                }
                
              );
  
              const filteredServicesArray: never[] = []; // Create an array to store filtered services
  
              // Use Promise.all to fetch services from all locations concurrently
              const servicePromises = transformedRegionList.map((location) => {
                return listMetaStoreAPI(projectId, location, network, filteredServicesArray);
              });
  
              // Wait for all servicePromises to complete
              Promise.all(servicePromises)
                .then(() => {
                  // All services have been fetched, and filtered services are in filteredServicesArray
                  if (responseResult?.error?.code) {
                    toast.error(responseResult?.error?.message, toastifyCustomStyle);
                  }
                })
               
                .catch((e) => {
                  console.log(e);
                });
            })
            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          console.error('Error listing regions', err);
          DataprocLoggingService.log('Error listing regions', LOG_LEVEL.ERROR);
        });
    }
  };
  
  const listMetaStoreAPI = async (
    projectId: string,
    location: string,
    network: string | undefined,
    filteredServicesArray: any // Pass the array as a parameter
  ) => {
    setIsLoadingService(true);
    const credentials = await authApi();
    if (credentials) {
      loggedFetch(
        `${BASE_URL_META}/projects/${projectId}/locations/${location}/services`,
        {
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token,
          },
        }
      )
        .then((response: Response) => {
          response
            .json()
            .then(
              (responseResult: {
                services: {
                  name: string;
                  network: string;
                  hiveMetastoreConfig: { endpointProtocol: string };
                }[];
                error: {
                  message: string;
                  code: number;
                };
              }) => {
                // Filter based on endpointProtocol and network
                const filteredServices = responseResult.services.filter((service) => {
                  return (
                    service.hiveMetastoreConfig.endpointProtocol === 'GRPC' ||
                    (service.hiveMetastoreConfig.endpointProtocol === 'THRIFT'  && location ==credentials.region_id &&
                      service.network.split('/')[4] === network) 
                  );
                });
                // Push filtered services into the array
                filteredServicesArray.push(...filteredServices);
                const transformedServiceList = filteredServicesArray.map(
                  (data: { name: string }) => data.name
                );
                setServicesList(transformedServiceList);
  
                setIsLoadingService(false);
                if (responseResult?.error?.code) {
                  toast.error(responseResult?.error?.message, toastifyCustomStyle);
                }
              }
            )
            .catch((e: Error) => {
              console.log(e);
              setIsLoadingService(false);
            });
        })
        .catch((err: Error) => {
          console.error('Error listing services', err);
          DataprocLoggingService.log('Error listing services', LOG_LEVEL.ERROR);
          setIsLoadingService(false);
        });
    }
  };



  const generateRandomHex = () => {
    if (!generationCompleted) {
      const crypto = window.crypto || window.Crypto;
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      const hex = array[0].toString(16);
      const paddedHex = hex.padStart(12, '0');
      setRunTimeSelected('runtime-' + paddedHex);
      setGenerationCompleted(true);
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.target.value.length > 0
      ? setRuntimeValidation(false)
      : setRuntimeValidation(true);
    const newRunTime = event.target.value;
    setRunTimeSelected(newRunTime);
  };
  const handleDisplayNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.target.value.length > 0
      ? setDisplayNameValidation(false)
      : setDisplayNameValidation(true);
    const newDisplayName = event.target.value;
    setDisplayNameSelected(newDisplayName);
  };
  const handleDescriptionChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.target.value.length > 0
      ? setDescriptionValidation(false)
      : setDescriptionValidation(true);
    const newDescription = event.target.value;
    setDescriptionSelected(newDescription);
  };
  const handleVersionChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.target.value.length > 0
      ? setVersionValidation(false)
      : setVersionValidation(true);
    const newVersion = event.target.value;
    setVersionSelected(newVersion);
  };

  const handleServiceSelected = (data: string | null) => {
    setServicesSelected(data!.toString());
  };
  const handleIdleSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;
    const numericRegex = /^[0-9]*$/;

    if (numericRegex.test(inputValue) || inputValue === '') {
      setIdleValidation(false);
    } else {
      setIdleValidation(true);
    }
    setIdleTimeSelected(inputValue);
  };
  const handletimeSelected = (
    event: React.SyntheticEvent<HTMLElement, Event>,
    data: DropdownProps
  ) => {
    setTimeSelected(data.value!.toString());
  };
  const handleAutoTimeSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;
    const numericRegex = /^[0-9]*$/;

    if (numericRegex.test(inputValue) || inputValue === '') {
      setAutoValidation(false);
    } else {
      setAutoValidation(true);
    }

    setAutoTimeSelected(inputValue);
  };
  const handleAutoSelected = (
    event: React.SyntheticEvent<HTMLElement, Event>,
    data: DropdownProps
  ) => {
    setAutoSelected(data.value!.toString());
  };
  const handleProjectIdChange = (data: any, network: string | undefined) => {
    setProjectId(data ?? '');
    setServicesList([]);
    setServicesSelected('');
    regionListAPI(data,network);
  };


  const handleNetworkChange = async (data: DropdownProps | null) => {
    setNetworkSelected(data!.toString());
    setSubNetworkSelected(defaultValue);
    await listSubNetworksAPI(data!.toString());
    await handleProjectIdChange(projectId, data!.toString());
  };

  const handleNetworkSharedVpcRadioChange = () => {
    setSelectedNetworkRadio('sharedVpc');
    setSubNetworkSelected(subNetworkList[0]!.toString());
    setNetworkSelected(networkList[0]!.toString());
  };
  const handleSubNetworkRadioChange = () => {
    setSelectedNetworkRadio('projectNetwork');
    setSharedvpcSelected('');
  };
  const handleSubNetworkChange = (data: string | null) => {
    setSubNetworkSelected(data!.toString());
  };
  const handleSharedSubNetwork = async (data: string | null) => {
    setSharedvpcSelected(data!.toString());
    await handleProjectIdChange(projectId, data!.toString());
  };
  const handleCancelButton = async () => {
    setOpenCreateTemplate(false);
    if (fromPage === 'launcher') {
      app.shell.activeWidget?.close();
    }
  };

  const handleClusterSelected = (data: string | null) => {
    setClusterSelected(data ?? '');
  };
  const handleNetworkTags = (
    setDuplicateValidation: (value: boolean) => void,
    listOfFiles: string[]
  ) => {
    setNetworkTagSelected(listOfFiles);
    handleDuplicateValidation(setDuplicateValidation, listOfFiles);
  };
  const handleDuplicateValidation = (
    setDuplicateValidation: (value: boolean) => void,
    listOfFiles: string | string[]
  ) => {
    if (Array.isArray(listOfFiles)) {
      const fileNames = listOfFiles.map((fileName: string) =>
        fileName.toLowerCase()
      );
      const uniqueFileNames = new Set<string>();
      const duplicateFileNames = fileNames.filter((fileName: string) => {
        const isDuplicate = uniqueFileNames.has(fileName);
        uniqueFileNames.add(fileName);
        return isDuplicate;
      });
      if (duplicateFileNames.length > 0) {
        setDuplicateValidation(true);
      } else {
        setDuplicateValidation(false);
      }
    }
  };
  function isSaveDisabled() {
    return (
      displayNameSelected === '' ||
      runTimeSelected === '' ||
      desciptionSelected === '' ||
      versionSelected === '' ||
      displayNameValidation ||
      versionValidation ||
      descriptionValidation ||
      idleValidation ||
      runTimeValidation ||
      autoValidation ||
      duplicateValidation ||
      (selectedNetworkRadio === 'sharedVpc' &&
        sharedSubNetworkList.length === 0) ||
      (selectedNetworkRadio === 'sharedVpc' && sharedvpcSelected === '') ||
      (selectedNetworkRadio === 'projectNetwork' &&
        networkList.length !== 0 &&
        subNetworkList.length === 0)
    );
  }
  const createRuntimeApi = async (payload: any) => {
    const credentials = await authApi();
    if (credentials) {
      loggedFetch(
        `${BASE_URL}/projects/${credentials.project_id}/locations/${credentials.region_id}/sessionTemplates`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      )
        .then(async (response: Response) => {
          if (response.ok) {
            const responseResult = await response.json();
            setOpenCreateTemplate(false);
           

            const kernelSpecs = await KernelSpecAPI.getSpecs();
            const kernels = kernelSpecs.kernelspecs;

            const { commands } = app;

            if (launcher) {
              Object.values(kernels).forEach((kernelsData, index) => {
                const commandNameExist = `notebook:create-${kernelsData?.name}`;
                if (
                  kernelsData?.resources.endpointParentResource &&
                  kernelsData?.resources.endpointParentResource.includes(
                    '/sessions'
                  ) &&
                  // Check if the command is already registered
                  !commands.hasCommand(commandNameExist)
                ) {
                  const commandNotebook = `notebook:create-${kernelsData?.name}`;
                  commands.addCommand(commandNotebook, {
                    caption: kernelsData?.display_name,
                    label: kernelsData?.display_name,
                    icon: iconDisplay(kernelsData),
                    execute: async () => {
                      const model = await app.commands.execute(
                        'docmanager:new-untitled',
                        {
                          type: 'notebook',
                          path: '',
                          kernel: { name: kernelsData?.name }
                        }
                      );
                      await app.commands.execute('docmanager:open', {
                        kernel: { name: kernelsData?.name },
                        path: model.path,
                        factory: 'notebook'
                      });
                    }
                  });

                  launcher.add({
                    command: commandNotebook,
                    category: 'Dataproc Serverless Notebooks',
                    //@ts-ignore jupyter lab Launcher type issue
                    metadata: kernelsData?.metadata,
                    rank: index + 1,
                    //@ts-ignore jupyter lab Launcher type issue
                    args: kernelsData?.argv
                  });
                }
              });
              Object.values(kernels).forEach((kernelsData, index) => {
                const commandNameExist = `notebook:create-${kernelsData?.name}`;
                if (
                  kernelsData?.resources.endpointParentResource &&
                  !kernelsData?.resources.endpointParentResource.includes(
                    '/sessions'
                  ) &&
                  // Check if the command is already registered
                  !commands.hasCommand(commandNameExist)
                ) {
                  const commandNotebook = `notebook:create-${kernelsData?.name}`;
                  commands.addCommand(commandNotebook, {
                    caption: kernelsData?.display_name,
                    label: kernelsData?.display_name,
                    icon: iconDisplay(kernelsData),
                    execute: async () => {
                      const model = await app.commands.execute(
                        'docmanager:new-untitled',
                        {
                          type: 'notebook',
                          path: '',
                          kernel: { name: kernelsData?.name }
                        }
                      );
                      await app.commands.execute('docmanager:open', {
                        kernel: { name: kernelsData?.name },
                        path: model.path,
                        factory: 'notebook'
                      });
                    }
                  });

                  launcher.add({
                    command: commandNotebook,
                    category: 'Dataproc Cluster Notebooks',
                    //@ts-ignore jupyter lab Launcher type issue
                    metadata: kernelsData?.metadata,
                    rank: index + 1,
                    //@ts-ignore jupyter lab Launcher type issue
                    args: kernelsData?.argv
                  });
                }
              });
            }

            if (fromPage === 'launcher') {
              app.shell.activeWidget?.close();
            }
            console.log(responseResult);
          } else {
            const errorResponse = await response.json();
            console.log(errorResponse);
            setError({ isOpen: true, message: errorResponse.error.message });
            toast.error(errorResponse?.error?.message, toastifyCustomStyle);
          }
        
        })
        .catch((err: Error) => {
          console.error('Error Creating template', err);
          DataprocLoggingService.log('Error Creating template', LOG_LEVEL.ERROR);
          toast.error('Failed to create the template', toastifyCustomStyle);
        });
    }
  };
  const updateRuntimeApi = async (payload: any) => {
    const credentials = await authApi();
    if (credentials) {
      loggedFetch(
        `${BASE_URL}/projects/${credentials.project_id}/locations/${credentials.region_id}/sessionTemplates/${runTimeSelected}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      )
        .then(async (response: Response) => {
          if (response.ok) {
            const responseResult = await response.json();
            setOpenCreateTemplate(false);
            toast.success(
              `Runtime Template ${displayNameSelected} successfully updated`,
              toastifyCustomStyle
            );
            if (fromPage === 'launcher') {
              app.shell.activeWidget?.close();
            }
            console.log(responseResult);
          } else {
            const errorResponse = await response.json();
            console.log(errorResponse);
            setError({ isOpen: true, message: errorResponse.error.message });
            toast.error(errorResponse?.error?.message, toastifyCustomStyle);
          }
       
        })
        .catch((err: Error) => {
          console.error('Error updating template', err);
          DataprocLoggingService.log('Error updating template', LOG_LEVEL.ERROR);
          toast.error('Failed to update the template', toastifyCustomStyle);
        });
    }
  };

  const handleSave = async () => {
    const credentials = await authApi();
    if (credentials) {
      const labelObject: { [key: string]: string } = {};
      labelDetailUpdated.forEach((label: string) => {
        const labelSplit = label.split(':');
        const key = labelSplit[0];
        const value = labelSplit[1];
        labelObject[key] = value;
      });
      const propertyObject: { [key: string]: string } = {};
      propertyDetailUpdated.forEach((label: string) => {
        const labelSplit = label.split(':');
        const key = labelSplit[0];
        const value = labelSplit[1];
        propertyObject[key] = value;
      });
      const inputValueHour = Number(idleTimeSelected) * 3600;
      const inputValueMin = Number(idleTimeSelected) * 60;
      const inputValueHourAuto = Number(autoTimeSelected) * 3600;
      const inputValueMinAuto = Number(autoTimeSelected) * 60;

      const payload = {
        name: `projects/${credentials.project_id}/locations/${credentials.region_id}/sessionTemplates/${runTimeSelected}`,
        description: desciptionSelected,
        creator: userInfo,
        createTime: createTime,
        jupyterSession: {
          kernel: 'PYTHON',
          displayName: displayNameSelected
        },
        labels: labelObject,
        runtimeConfig: {
          ...(versionSelected && { version: versionSelected }),
          ...(containerImageSelected !== '' && {
            containerImage: containerImageSelected
          }),
          ...(propertyObject && { properties: propertyObject }),

          ...(pythonRepositorySelected && {
            repositoryConfig: {
              pypiRepositoryConfig: {
                pypiRepository: pythonRepositorySelected
              }
            }
          })
        },
        environmentConfig: {
          executionConfig: {
            ...(networkTagSelected.length > 0 && {
              networkTags: networkTagSelected
            }),

            ...(subNetworkSelected &&
              selectedNetworkRadio === 'projectNetwork' && {
                subnetworkUri: subNetworkSelected
              }),
            ...(sharedvpcSelected &&
              selectedNetworkRadio === 'sharedVpc' && {
                subnetworkUri: `projects/${projectInfo}/regions/${credentials.region_id}/subnetworks/${sharedvpcSelected}`
              }),
            ...(timeSelected === 'h' &&
              idleTimeSelected && {
                idleTtl: inputValueHour.toString() + 's'
              }),
            ...(timeSelected === 'm' &&
              idleTimeSelected && {
                idleTtl: inputValueMin.toString() + 's'
              }),
            ...(timeSelected === 's' &&
              idleTimeSelected && {
                idleTtl: idleTimeSelected + 's'
              }),

            ...(autoSelected === 'h' &&
              autoTimeSelected && {
                ttl: inputValueHourAuto.toString() + 's'
              }),
            ...(autoSelected === 'm' &&
              autoTimeSelected && {
                ttl: inputValueMinAuto.toString() + 's'
              }),

            ...(autoSelected === 's' &&
              autoTimeSelected && {
                ttl: autoTimeSelected + 's'
              })
          },
          peripheralsConfig: {
            ...(servicesSelected !== 'None' && {
              metastoreService: servicesSelected
            }),
            ...(clusterSelected !== '' && {
              sparkHistoryServerConfig: {
                dataprocCluster: `projects/${credentials.project_id}/regions/${credentials.region_id}/clusters/${clusterSelected}`
              }
            })
          }
        },

        updateTime: new Date().toISOString()
      };
      if (selectedRuntimeClone !== undefined) {
        updateRuntimeApi(payload);
      } else {
        createRuntimeApi(payload);
      }
    }
  };

  return (
    <div>
        {configLoading && !loggedIn && !configError && !loginError && (
        <div className="spin-loaderMain">
          <ClipLoader
              color="#3367d6"
            loading={true}
            size={18}
            aria-label="Loading Spinner"
            data-testid="loader"
          />
          Loading RunTime
        </div>
      )}
        {loggedIn && !configError ? (
      <div className="scroll-comp">
        <div className="cluster-details-header">
          <div
            role="button"
            className="back-arrow-icon"
            onClick={handleCancelButton}
          >
            <iconLeftArrow.react
              tag="div"
              className="icon-white logo-alignment-style"
            />
          </div>
          <div className="cluster-details-title">
            Serverless Runtime Template
          </div>
        </div>
        <div className="submit-job-container">
          <form>
            <div className="select-text-overlay">
              <label className="select-title-text" htmlFor="display-name">
                Display name*
              </label>
              <Input
                className="create-runtime-style "
                value={displayNameSelected}
                onChange={e => handleDisplayNameChange(e)}
                type="text"
              />
            </div>
            {displayNameValidation && (
              <div className="error-key-parent">
                <iconError.react tag="div" className="logo-alignment-style" />
                <div className="error-key-missing">Name is required</div>
              </div>
            )}

            <div className="select-text-overlay">
              <label
                className={`select-title-text${
                  selectedRuntimeClone !== undefined ? ' disable-text' : ''
                }`}
                htmlFor="runtime-id"
              >
                Runtime ID*
              </label>
              <Input
                className="create-runtime-style "
                value={runTimeSelected}
                onChange={e => handleInputChange(e)}
                type="text"
                disabled={selectedRuntimeClone !== undefined}
              />
            </div>

            {runTimeValidation && (
              <div className="error-key-parent">
                <iconError.react tag="div" className="logo-alignment-style" />
                <div className="error-key-missing">ID is required</div>
              </div>
            )}

            <div className="select-text-overlay">
              <label className="select-title-text" htmlFor="description">
                Description*
              </label>
              <Input
                className="create-runtime-style "
                value={desciptionSelected}
                onChange={e => handleDescriptionChange(e)}
                type="text"
              />
            </div>

            {descriptionValidation && (
              <div className="error-key-parent">
                <iconError.react tag="div" className="logo-alignment-style" />
                <div className="error-key-missing">Description is required</div>
              </div>
            )}

            <div className="select-text-overlay">
              <label className="select-title-text" htmlFor="runtime-version">
                Runtime version*
              </label>
              <Input
                className="create-runtime-style "
                value={versionSelected}
                onChange={e => handleVersionChange(e)}
                type="text"
              />
            </div>

            {versionValidation && (
              <div className="error-key-parent">
                <iconError.react tag="div" className="logo-alignment-style" />
                <div className="error-key-missing">Version is required</div>
              </div>
            )}
            <div className="select-text-overlay">
              <label
                className="select-title-text"
                htmlFor="custom-container-image"
              >
                Custom container image
              </label>
              <Input
                className="create-batch-style "
                value={containerImageSelected}
                onChange={e => setContainerImageSelected(e.target.value)}
                type="text"
                placeholder="Enter URI, for example, gcr.io/my-project-id/my-image:1.0.1"
              />
            </div>
            <div className="create-custom-messagelist">
              {CUSTOM_CONTAINER_MESSAGE}{' '}
            </div>
            <div className="create-container-message">
              <div className="create-container-image-message">
                {CUSTOM_CONTAINER_MESSAGE_PART}
              </div>
              <div
                className="learn-more-url"
                onClick={() => {
                  window.open(`${CONTAINER_REGISTERY}`, '_blank');
                }}
              >
                Container Registry
              </div>
              &nbsp; <div className="create-container-image-message">or</div>
              <div
                className="learn-more-url"
                onClick={() => {
                  window.open(`${ARTIFACT_REGISTERY}`, '_blank');
                }}
              >
                Artifact Registry
              </div>
              {' . '}
              <div
                className="learn-more-url"
                onClick={() => {
                  window.open(`${CUSTOM_CONTAINERS}`, '_blank');
                }}
              >
                Learn more
              </div>
            </div>
            <div className="submit-job-label-header">Network Configuration</div>
            <div className="runtime-message">
              Establishes connectivity for the VM instances in this cluster.
            </div>
            <div>
              <div className="create-runtime-radio">
                <Radio
                  size="small"
                  className="select-runtime-radio-style"
                  value="projectNetwork"
                  checked={selectedNetworkRadio === 'projectNetwork'}
                  onChange={() => handleSubNetworkRadioChange()}
                />
                <div className="create-batch-message">
                  Networks in this project
                </div>
              </div>
            </div>
            <div>
              <div className="create-runtime-radio">
                <Radio
                  size="small"
                  className="select-runtime-radio-style"
                  value="sharedVpc"
                  checked={selectedNetworkRadio === 'sharedVpc'}
                  onChange={() => handleNetworkSharedVpcRadioChange()}
                />
                <div className="create-batch-message">
                  Networks shared from host project: "{projectInfo}"
                </div>
              </div>
              <div className="create-runtime-sub-message-network">
                Choose a shared VPC network from project that is different from
                this cluster's project.{' '}
                <div
                  className="submit-job-learn-more"
                  onClick={() => {
                    window.open(`${SHARED_VPC}`, '_blank');
                  }}
                >
                  Learn more
                </div>
              </div>
            </div>

            <div>
              {selectedNetworkRadio === 'projectNetwork' && (
                <div className="create-batch-network">
                  {isloadingNetwork ? (
                    <div className="metastore-loader">
                      <ClipLoader
                        loading={true}
                        size={25}
                        aria-label="Loading Spinner"
                        data-testid="loader"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="select-text-overlay">
                        <Autocomplete
                          options={networkList}
                          value={networkSelected}
                          onChange={(_event, val) => handleNetworkChange(val)}
                          renderInput={params => (
                            <TextField {...params} label="Primary network*" />
                          )}
                        />
                      </div>
                      <div className="select-text-overlay subnetwork-style">
                        <Autocomplete
                          options={subNetworkList}
                          value={subNetworkSelected}
                          onChange={(_event, val) =>
                            handleSubNetworkChange(val)
                          }
                          renderInput={params => (
                            <TextField {...params} label="subnetwork" />
                          )}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
              {selectedNetworkRadio === 'projectNetwork' &&
                networkList.length === 0 && (
                  <div className="create-no-list-message">
                    No local networks are available.
                  </div>
                )}
              {selectedNetworkRadio === 'projectNetwork' &&
                networkList.length !== 0 &&
                subNetworkList.length === 0 && (
                  <div className="create-no-list-message">
                    Please select a valid network and subnetwork.
                  </div>
                )}
              {selectedNetworkRadio === 'sharedVpc' && (
                <div className="select-text-overlay">
                  <Autocomplete
                    options={sharedSubNetworkList}
                    value={sharedvpcSelected}
                    onChange={(_event, val) => handleSharedSubNetwork(val)}
                    renderInput={params => (
                      <TextField {...params} label="Shared subnetwork" />
                    )}
                  />
                </div>
              )}
              {selectedNetworkRadio === 'sharedVpc' &&
                sharedSubNetworkList.length === 0 && (
                  <div className="create-no-list-message">
                    No shared subnetworks are available in this region.
                  </div>
                )}
            </div>

            <div className="select-text-overlay">
              <label className="select-title-text" htmlFor="network-tags">
                Network tags
              </label>
              <TagsInput
                className="select-runtime-style"
                onChange={e => handleNetworkTags(setDuplicateValidation, e)}
                addOnBlur={true}
                value={networkTagSelected}
                inputProps={{ placeholder: '' }}
              />
            </div>
            {duplicateValidation && (
              <div className="error-key-parent">
                <iconError.react tag="div" className="logo-alignment-style" />
                <div className="error-key-missing">
                  Duplicate paths are not allowed
                </div>
              </div>
            )}

            {!duplicateValidation && (
              <div className="create-messagelist">
                Network tags are text attributes you can add to make firewall
                rules and routes applicable to specific VM instances.
              </div>
            )}

            <div className="submit-job-label-header">Metastore</div>

            <div className="select-text-overlay">
              <DynamicDropdown
                value={projectId}
                onChange={(_, projectId) => handleProjectIdChange(projectId,networkSelected)}
                fetchFunc={projectListAPI}
                label="Project ID"
                // Always show the clear indicator and hide the dropdown arrow
                // make it very clear that this is an autocomplete.
                sx={{
                  '& .MuiAutocomplete-clearIndicator': {
                    visibility: 'hidden'
                  }
                }}
                popupIcon={null}
              />
            </div>

          

            <div className="select-text-overlay">
              {isLoadingService ? (
                <div className="metastore-loader">
                  <ClipLoader
                    loading={true}
                    size={25}
                    aria-label="Loading Spinner"
                    data-testid="loader"
                  />
                </div>
              ) : (
                <Autocomplete
                  options={servicesList}
                  value={servicesSelected}
                  onChange={(_event, val) => handleServiceSelected(val)}
                  renderInput={params => (
                    <TextField {...params} label="Metastore services" />
                  )}
                />
              )}
            </div>

            <div className="single-line">
              <div className="select-text-overlay">
                <label className="select-title-text" htmlFor="max-idle-time">
                  Max idle time
                </label>
                <Input
                  className="runtimetemplate-max-idle"
                  value={idleTimeSelected}
                  onChange={e => handleIdleSelected(e)}
                  type="text"
                />
              </div>
              <Select
                className="runtimetemplate-max-idle-select"
                value={timeSelected}
                onChange={handletimeSelected}
                type="text"
                search
                selection
                options={timeList}
              />
            </div>
            <div className="create-messagelist">
              Max notebook idle time before the session is auto-terminated 10
              mins to 330 hours.
            </div>
            {idleValidation && (
              <div className="error-key-parent">
                <iconError.react tag="div" className="logo-alignment-style" />
                <div className="error-key-missing">Only Numeric is allowed</div>
              </div>
            )}

            <div className="single-line">
              <div className="select-text-overlay">
                <label className="select-title-text" htmlFor="max-session-time">
                  Max session time
                </label>
                <Input
                  className="runtimetemplate-max-idle"
                  value={autoTimeSelected}
                  onChange={e => handleAutoTimeSelected(e)}
                  type="text"
                />
              </div>

              <Select
                search
                selection
                className="runtimetemplate-max-idle-select"
                value={autoSelected}
                onChange={handleAutoSelected}
                type="text"
                options={timeList}
              />
            </div>
            <div className="create-messagelist">
              Max lifetime of a session. 10 mins and 330 hours.
            </div>
            {autoValidation && (
              <div className="error-key-parent">
                <iconError.react tag="div" className="logo-alignment-style" />
                <div className="error-key-missing">Only Numeric is allowed</div>
              </div>
            )}

            <div className="select-text-overlay">
              <label
                className="select-title-text"
                htmlFor="python-packages-repository"
              >
                Python packages repository
              </label>
              <Input
                className="create-runtime-style "
                value={pythonRepositorySelected}
                onChange={e => setPythonRepositorySelected(e.target.value)}
                type="text"
              />
            </div>
            <div className="create-messagelist">
              Enter the URI for the repository to install Python packages. By
              default packages are installed to PyPI pull-through cache on GCP.
            </div>

            <div className="submit-job-label-header">
              Persistent Spark History Server
            </div>

            <div className="create-batches-message">
              Choose a history server cluster to store logs in.{' '}
            </div>
            <div className="select-text-overlay">
              <Autocomplete
                options={clustersList}
                value={clusterSelected}
                onChange={(_event, val) => handleClusterSelected(val)}
                renderInput={params => (
                  <TextField {...params} label="History server cluster" />
                )}
              />
            </div>
            <div className="submit-job-label-header">Spark Properties</div>
            <LabelProperties
              labelDetail={propertyDetail}
              setLabelDetail={setPropertyDetail}
              labelDetailUpdated={propertyDetailUpdated}
              setLabelDetailUpdated={setPropertyDetailUpdated}
              buttonText="ADD PROPERTY"
              keyValidation={keyValidation}
              setKeyValidation={setKeyValidation}
              valueValidation={valueValidation}
              setValueValidation={setValueValidation}
              duplicateKeyError={duplicateKeyError}
              setDuplicateKeyError={setDuplicateKeyError}
              selectedRuntimeClone={selectedRuntimeClone ? true : false}
            />
            <div className="submit-job-label-header">Labels</div>
            <LabelProperties
              labelDetail={labelDetail}
              setLabelDetail={setLabelDetail}
              labelDetailUpdated={labelDetailUpdated}
              setLabelDetailUpdated={setLabelDetailUpdated}
              buttonText="ADD LABEL"
              selectedRuntimeClone={selectedRuntimeClone}
              keyValidation={keyValidation}
              setKeyValidation={setKeyValidation}
              valueValidation={valueValidation}
              setValueValidation={setValueValidation}
              duplicateKeyError={duplicateKeyError}
              setDuplicateKeyError={setDuplicateKeyError}
            />
            <div className="job-button-style-parent">
              <div
                onClick={() => {
                  if (!isSaveDisabled()) {
                    handleSave();
                  }
                }}
                className={
                  isSaveDisabled()
                    ? 'submit-button-disable-style'
                    : 'submit-button-style'
                }
                aria-label="submit Batch"
              >
                <div>SAVE</div>
              </div>
              <div
                className="job-cancel-button-style"
                aria-label="cancel Batch"
                onClick={handleCancelButton}
              >
                <div>CANCEL</div>
              </div>
              {error.isOpen && (
                <ErrorPopup
                  onCancel={() => setError({ isOpen: false, message: '' })}
                  errorPopupOpen={error.isOpen}
                  errorMsg={error.message}
                />
              )}
            </div>
          </form>
         
        </div>
      </div>
      ) : (
        loginError && (
          <div role="alert" className="login-error">
            Please login to continue
          </div>
        )
      )}
       {configError && (
        <div role="alert" className="login-error">
          Please configure gcloud with account, project-id and region
        </div>
      )}
    </div>
  );
}

export default CreateRunTime;
