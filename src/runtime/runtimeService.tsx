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

import {
  API_HEADER_CONTENT_TYPE,
  API_HEADER_BEARER,
  HTTP_METHOD,
  USER_INFO_URL,
  gcpServiceUrls,
  STATUS_RUNNING
} from '../utils/const';
import {
  authApi,
  toastifyCustomStyle,
  loggedFetch,
  authenticatedFetch,
  jobTimeFormat,
  showToast
} from '../utils/utils';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';
import {
  ISessionTemplate,
  ISessionTemplateDisplay,
  ISessionTemplateRoot
} from '../utils/listRuntimeTemplateInterface';
import { JupyterLab } from '@jupyterlab/application';

interface IUserInfoResponse {
  email: string;
  picture: string;
  error: {
    message: string;
    code: number;
  };
}
interface IApiResponse {
  name: string;
  error: {
    message: string;
    code: number;
  };
}
interface INetworkAPI {
  network: string;
  error: {
    message: string;
    code: number;
  };
}

interface Network {
  selfLink: string;
  network: string;
  subnetworks: string;
}
interface Region {
  name: string;
}
export class RunTimeSerive {
  static deleteRuntimeTemplateAPI = async (
    selectedRuntimeTemplate: string,
    selectedRuntimeTemplateDisplayName: string
  ) => {
    const credentials = await authApi();
    const { DATAPROC } = await gcpServiceUrls;
    if (credentials) {
      loggedFetch(`${DATAPROC}/${selectedRuntimeTemplate}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token
        }
      })
        .then(async (response: Response) => {
          const formattedResponse = await response.json();
          if (formattedResponse?.error?.code) {
            toast.error(formattedResponse?.error?.message, toastifyCustomStyle);
          } else {
            toast.success(
              `${selectedRuntimeTemplateDisplayName} is deleted successfully`,
              toastifyCustomStyle
            );
            console.log(response);
          }
        })
        .catch((err: Error) => {
          DataprocLoggingService.log('Error deleting session', LOG_LEVEL.ERROR);
          toast.error(
            `Failed to delete the session ${selectedRuntimeTemplateDisplayName} : ${err}`,
            toastifyCustomStyle
          );
        });
    }
  };
  static listRuntimeTemplatesAPIService = async (
    renderActions: (value: ISessionTemplate) => React.JSX.Element,
    setIsLoading: (value: boolean) => void,
    setRuntimeTemplateslist: (value: ISessionTemplateDisplay[]) => void,
    setRunTimeTemplateAllList: (value: ISessionTemplate[]) => void,
    nextPageToken?: string,
    previousRuntimeTemplatesList?: object,
    previousRuntimeTemplatesAllList?: object
  ) => {
    try {
      const pageToken = nextPageToken ?? '';
      const queryParams = new URLSearchParams({
        pageSize: '50',
        pageToken: pageToken
      });

      const response = await authenticatedFetch({
        uri: 'sessionTemplates',
        method: HTTP_METHOD.GET,
        regionIdentifier: 'locations',
        queryParams: queryParams
      });
      const formattedResponse: ISessionTemplateRoot = await response.json();
      let transformRuntimeTemplatesListData: ISessionTemplateDisplay[] = [];
      if (formattedResponse && formattedResponse.sessionTemplates) {
        let runtimeTemplatesListNew = formattedResponse.sessionTemplates;
        runtimeTemplatesListNew.sort(
          (a: { updateTime: string }, b: { updateTime: string }) => {
            const dateA = new Date(a.updateTime);
            const dateB = new Date(b.updateTime);
            return Number(dateB) - Number(dateA);
          }
        );
        transformRuntimeTemplatesListData = runtimeTemplatesListNew.map(
          (data: ISessionTemplate) => {
            const startTimeDisplay = data.updateTime
              ? jobTimeFormat(data.updateTime)
              : '';

            let displayName = '';

            if (data.jupyterSession && data.jupyterSession.displayName) {
              displayName = data.jupyterSession.displayName;
            }

            // Extracting runtimeId from name
            // Example: "projects/{projectName}/locations/{region}/sessionTemplates/{runtimeid}",

            return {
              name: displayName,
              owner: data.creator,
              description: data.description,
              lastModified: startTimeDisplay,
              actions: renderActions(data),
              id: data.name.split('/')[5]
            };
          }
        );
        const existingRuntimeTemplatesAllData =
          previousRuntimeTemplatesAllList ?? [];
        //setStateAction never type issue
        let allRuntimeTemplatesAllData: ISessionTemplate[] = [
          ...(existingRuntimeTemplatesAllData as []),
          ...formattedResponse.sessionTemplates
        ];

        const existingRuntimeTemplatesData = previousRuntimeTemplatesList ?? [];
        //setStateAction never type issue
        let allRuntimeTemplatesData: ISessionTemplateDisplay[] = [
          ...(existingRuntimeTemplatesData as []),
          ...transformRuntimeTemplatesListData
        ];

        if (formattedResponse.nextPageToken) {
          this.listRuntimeTemplatesAPIService(
            renderActions,
            setIsLoading,
            setRuntimeTemplateslist,
            setRunTimeTemplateAllList,
            formattedResponse.nextPageToken,
            allRuntimeTemplatesData,
            allRuntimeTemplatesAllData
          );
        } else {
          setRunTimeTemplateAllList(allRuntimeTemplatesAllData);
          setRuntimeTemplateslist(allRuntimeTemplatesData);
          setIsLoading(false);
        }
      } else {
        setRunTimeTemplateAllList([]);
        setRuntimeTemplateslist([]);
        setIsLoading(false);
      }
      if (formattedResponse?.error?.code) {
        if (!toast.isActive('runtimeTemplateError')) {
          toast.error(formattedResponse?.error?.message, {
            ...toastifyCustomStyle,
            toastId: 'runtimeTemplateError'
          });
        }
      }
    } catch (error) {
      setIsLoading(false);
      DataprocLoggingService.log(
        'Error listing runtime templates',
        LOG_LEVEL.ERROR
      );
      if (!toast.isActive('runtimeTemplateError')) {
        toast.error('Failed to fetch runtime templates', {
          ...toastifyCustomStyle,
          toastId: 'runtimeTemplateError'
        });
      }
    }
  };
  static displayUserInfoService = async (
    setUserInfo: (value: string) => void
  ) => {
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
                toast.error(
                  responseResult?.error?.message,
                  toastifyCustomStyle
                );
              }
            })
            .catch((e: Error) => console.error(e));
        })
        .catch((err: Error) => {
          DataprocLoggingService.log(
            'Error displaying user info',
            LOG_LEVEL.ERROR
          );
          toast.error(
            `Failed to fetch user information : ${err}`,
            toastifyCustomStyle
          );
        });
    }
  };
  static listSharedVPCService = async (
    projectName: string,
    setSharedSubNetworkList: (value: string[]) => void
  ) => {
    try {
      const credentials = await authApi();
      const { REGION_URL } = await gcpServiceUrls;
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
        ?.map((data: { subnetwork: string }) => {
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
      DataprocLoggingService.log(
        'Error displaying sharedVPC subNetwork',
        LOG_LEVEL.ERROR
      );
      toast.error(
        `Failed to fetch  sharedVPC subNetwork : ${err}`,
        toastifyCustomStyle
      );
    }
  };
  static runtimeSharedProjectService = async (
    setProjectInfo: (value: string) => void,
    setSharedSubNetworkList: (value: string[]) => void
  ) => {
    const credentials = await authApi();
    const { REGION_URL } = await gcpServiceUrls;
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
              this.listSharedVPCService(
                responseResult.name,
                setSharedSubNetworkList
              );
              if (responseResult?.error?.code) {
                toast.error(
                  responseResult?.error?.message,
                  toastifyCustomStyle
                );
              }
            })
            .catch((e: Error) => console.error(e));
        })
        .catch((err: Error) => {
          DataprocLoggingService.log(
            'Error displaying user info',
            LOG_LEVEL.ERROR
          );
          toast.error(
            `Failed to fetch user information : ${err}`,
            toastifyCustomStyle
          );
        });
    }
  };
  static listNetworksFromSubNetworkAPIService = async (
    subnetwork: string,
    setIsloadingNetwork: (value: boolean) => void,
    setNetworkSelected: (value: string) => void,
    setSubNetworkSelected: (value: string) => void,
    setDefaultValue: (value: string) => void
  ) => {
    setIsloadingNetwork(true);
    const credentials = await authApi();
    const { COMPUTE } = await gcpServiceUrls;
    if (credentials) {
      loggedFetch(
        `${COMPUTE}/projects/${credentials.project_id}/regions/${credentials.region_id}/subnetworks/${subnetwork}`,
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
              if (responseResult?.error?.code) {
                toast.error(
                  responseResult?.error?.message,
                  toastifyCustomStyle
                );
              }
            })

            .catch((e: Error) => {
              console.error(e);
            });
        })
        .catch((err: Error) => {
          DataprocLoggingService.log(
            'Error selecting Network',
            LOG_LEVEL.ERROR
          );
          toast.error(`Error selecting Network : ${err}`, toastifyCustomStyle);
        });
    }
  };
  static listClustersAPIService = async (
    setClustersList: (value: string[]) => void
  ) => {
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
      if (formattedResponse.clusters) {
        transformClusterListData = formattedResponse.clusters
          .filter(
            (data: { clusterName: string; status: { state: string } }) => {
              return data.status.state === STATUS_RUNNING;
            }
          )
          .map((data: { clusterName: string }) => data.clusterName);
        setClustersList(transformClusterListData);
      } else {
        setClustersList([]);
      }
    } catch (error) {
      DataprocLoggingService.log('Error listing clusters', LOG_LEVEL.ERROR);
      toast.error(
        `Failed to list the clusters : ${error}`,
        toastifyCustomStyle
      );
    }
  };
  static listClustersDataprocAPIService = async () => {
    try {
      const queryParams = new URLSearchParams({ pageSize: '100' });
      const response = await authenticatedFetch({
        uri: 'clusters',
        method: HTTP_METHOD.GET,
        regionIdentifier: 'regions',
        queryParams: queryParams
      });
      const formattedResponse = await response.json();
      return formattedResponse;
    } catch (error) {
      return error;
    }
  };
  static listNetworksAPIService = async (
    setNetworklist: (value: string[]) => void,
    setNetworkSelected: (value: string) => void,
    selectedRuntimeClone: any,
    setIsloadingNetwork: (value: boolean) => void
  ) => {
    setIsloadingNetwork(true);
    const { COMPUTE } = await gcpServiceUrls;
    try {
      const response = await authenticatedFetch({
        baseUrl: COMPUTE,
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
      if (selectedRuntimeClone === undefined) {
        if (transformedNetworkList.length > 0) {
          setNetworkSelected(transformedNetworkList[0]);
        } else {
          DataprocLoggingService.log(
            'No networks found. Account may lack access to list networks',
            LOG_LEVEL.ERROR
          );
          toast.error(
            `No networks found. Account may lack access to list networks.`,
            toastifyCustomStyle
          );
        }
      }
    } catch (error) {
      DataprocLoggingService.log('Error listing Networks', LOG_LEVEL.ERROR);
      toast.error(`Error listing Networks : ${error}`, toastifyCustomStyle);
    }
  };
  static listMetaStoreAPIService = async (
    setIsLoadingService: (value: boolean) => void,
    setServicesList: (value: string[]) => void,
    projectId: string,
    location: string,
    network: string | undefined,
    filteredServicesArray: any // Pass the array as a parameter
  ) => {
    setIsLoadingService(true);
    const credentials = await authApi();
    const { METASTORE } = await gcpServiceUrls;
    if (credentials) {
      loggedFetch(
        `${METASTORE}/projects/${projectId}/locations/${location}/services`,
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
                const filteredServices = responseResult.services.filter(
                  service => {
                    return (
                      service.hiveMetastoreConfig.endpointProtocol === 'GRPC' ||
                      (service.hiveMetastoreConfig.endpointProtocol ===
                        'THRIFT' &&
                        location == credentials.region_id &&
                        service.network.split('/')[4] === network)
                    );
                  }
                );
                // Push filtered services into the array
                filteredServicesArray.push(...filteredServices);
                const transformedServiceList = filteredServicesArray.map(
                  (data: { name: string }) => data.name
                );
                setServicesList(transformedServiceList);

                setIsLoadingService(false);
                if (responseResult?.error?.code) {
                  toast.error(
                    responseResult?.error?.message,
                    toastifyCustomStyle
                  );
                }
              }
            )
            .catch((e: Error) => {
              console.error(e);
              setIsLoadingService(false);
            });
        })
        .catch((err: Error) => {
          DataprocLoggingService.log('Error listing services', LOG_LEVEL.ERROR);
          setIsLoadingService(false);
          toast.error(`Error listing services : ${err}`, toastifyCustomStyle);
        });
    }
  };
  static regionListAPIService = async (
    projectId: string,
    network: string | undefined,
    setIsLoadingService: (value: boolean) => void,
    setServicesList: (value: string[]) => void
  ) => {
    const credentials = await authApi();
    const { REGION_URL } = await gcpServiceUrls;
    if (credentials) {
      loggedFetch(`${REGION_URL}/${projectId}/regions`, {
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token
        }
      })
        .then((response: Response) => {
          response
            .json()
            .then(
              (responseResult: {
                items: Region[];
                error: {
                  code: number;
                  message: string;
                };
              }) => {
                let transformedRegionList = responseResult.items?.map(
                  (data: Region) => {
                    return data.name;
                  }
                );

                const filteredServicesArray: never[] = []; // Create an array to store filtered services

                // Use Promise.all to fetch services from all locations concurrently
                const servicePromises = transformedRegionList?.map(location => {
                  return this.listMetaStoreAPIService(
                    setIsLoadingService,
                    setServicesList,
                    projectId,
                    location,
                    network,
                    filteredServicesArray
                  );
                });

                // Wait for all servicePromises to complete
                Promise.all(servicePromises)
                  .then(() => {
                    // All services have been fetched, and filtered services are in filteredServicesArray
                    if (responseResult?.error?.code) {
                      toast.error(
                        responseResult?.error?.message,
                        toastifyCustomStyle
                      );
                    }
                    console.log(filteredServicesArray);
                  })

                  .catch(e => {
                    console.error(e);
                  });
              }
            )
            .catch((e: Error) => {
              console.error(e);
            });
        })
        .catch((err: Error) => {
          DataprocLoggingService.log('Error listing regions', LOG_LEVEL.ERROR);
          toast.error(`Error listing regions : ${err}`, toastifyCustomStyle);
        });
    }
  };
  static listSubNetworksAPIService = async (
    subnetwork: string,
    setSubNetworklist: (value: string[]) => void,
    setSubNetworkSelected: (value: string) => void,
    selectedRuntimeClone: any,
    setIsloadingNetwork: (value: boolean) => void
  ) => {
    setIsloadingNetwork(true);
    const credentials = await authApi();
    const { COMPUTE } = await gcpServiceUrls;
    if (credentials) {
      loggedFetch(
        `${COMPUTE}/projects/${credentials.project_id}/regions/${credentials.region_id}/subnetworks`,
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
                const filteredServices = responseResult?.items?.filter(
                  (item: { network: string; privateIpGoogleAccess: boolean }) =>
                    item.network.split('/')[9] === subnetwork &&
                    item.privateIpGoogleAccess === true
                );
                if (filteredServices) {
                  const transformedServiceList = filteredServices.map(
                    (data: { name: string }) => data.name
                  );
                  setSubNetworklist(transformedServiceList);
                  if (selectedRuntimeClone === undefined) {
                    if (transformedServiceList.length > 0) {
                      setSubNetworkSelected(transformedServiceList[0]);
                    } else {
                      const errorMessage = `There are no subnetworks with Google Private Access enabled for network "${subnetwork}"`;
                      showToast(errorMessage, 'no-subnetworks-google-access');
                      DataprocLoggingService.log(errorMessage, LOG_LEVEL.ERROR);
                    }
                  }
                } else {
                  const errorMessage = `No subNetworks found  for network ${subnetwork}`;
                  showToast(errorMessage, 'no-subnetworks');
                  DataprocLoggingService.log(errorMessage, LOG_LEVEL.ERROR);
                }
                setIsloadingNetwork(false);
                if (responseResult?.error?.code) {
                  toast.error(
                    responseResult?.error?.message,
                    toastifyCustomStyle
                  );
                }
              }
            )
            .catch((e: Error) => {
              console.error(e);
            });
        })
        .catch((err: Error) => {
          DataprocLoggingService.log(
            'Error listing subNetworks',
            LOG_LEVEL.ERROR
          );
          setIsloadingNetwork(false);
          toast.error(
            `Error listing subNetworks : ${err}`,
            toastifyCustomStyle
          );
        });
    }
  };
  static updateRuntimeApiService = async (
    payload: any,
    app: JupyterLab,
    fromPage: string,
    runTimeSelected: string,
    displayNameSelected: string,
    setError: any,
    setOpenCreateTemplate: (value: boolean) => void
  ) => {
    const credentials = await authApi();
    const { DATAPROC } = await gcpServiceUrls;
    if (credentials) {
      loggedFetch(
        `${DATAPROC}/projects/${credentials.project_id}/locations/${credentials.region_id}/sessionTemplates/${runTimeSelected}`,
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
          DataprocLoggingService.log(
            'Error updating template',
            LOG_LEVEL.ERROR
          );
          toast.error(
            `Failed to update the template : ${err}`,
            toastifyCustomStyle
          );
        });
    }
  };
}
