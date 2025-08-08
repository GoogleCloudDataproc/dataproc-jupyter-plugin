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
  BatchStatus,
  HTTP_METHOD,
  STATUS_RUNNING,
  gcpServiceUrls,
  PAGE_SIZE
} from '../utils/const';
import {
  authApi,
  loggedFetch,
  jobTimeFormat,
  elapsedTime,
  jobTypeDisplay,
  authenticatedFetch,
  IAuthCredentials,
  handleApiError
} from '../utils/utils';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';
import { Notification } from '@jupyterlab/apputils';

interface IBatchDetailsResponse {
  error: {
    code: number;
    message: string;
  };
  uuid: '';
  state: '';
  createTime: '';
  runtimeInfo: {
    endpoints: {};
    approximateUsage: { milliDcuSeconds: ''; shuffleStorageGbSeconds: '' };
  };
  creator: '';
  runtimeConfig: {
    version: '';
    containerImage: '';
    properties: {
      'spark:spark.executor.instances': '';
      'spark:spark.driver.cores': '';
      'spark:spark.driver.memory': '';
      'spark:spark.executor.cores': '';
      'spark:spark.executor.memory': '';
      'spark:spark.dynamicAllocation.executorAllocationRatio': '';
      'spark:spark.app.name': '';
    };
  };
  sparkBatch: {
    mainJarFileUri: '';
    mainClass: '';
    jarFileUris: '';
  };
  pysparkBatch: {
    mainPythonFileUri: '';
  };
  sparkRBatch: {
    mainRFileUri: '';
  };
  sparkSqlBatch: {
    queryFileUri: '';
  };
  environmentConfig: {
    executionConfig: {
      serviceAccount: '';
      subnetworkUri: '';
      networkTags: [];
      kmsKey: '';
    };
    peripheralsConfig: {
      metastoreService: '';
      sparkHistoryServerConfig: {
        dataprocCluster: '';
      };
    };
  };
  stateHistory: [{ state: ''; stateStartTime: '' }];
  stateTime: '';
  labels: {};
}

interface IBatchesList {
  batchID: string;
  status: string;
  location: string;
  creationTime: string;
  type: string | undefined;
  elapsedTime: string;
  actions: React.JSX.Element;
}

interface IBatchData {
  name: string;
  state: BatchStatus;
  createTime: string;
  stateTime: Date;
}
interface IBatchListResponse {
  error: {
    code: number;
    message: string;
  };
  batches: IBatchData[];
  nextPageToken?: string;
}
interface IApiResponse {
  name: string;
  error: {
    message: string;
    code: number;
  };
}

interface INetworkResponse {
  network: string;
  error: {
    message: string;
    code: number;
  };
}

type Network = {
  selfLink: string;
  network: string;
  subnetworks: string;
};

type IKeyRings = {
  keyRings: Array<{
    name: string;
  }>;
  error: {
    message: string;
    code: number;
  };
};

interface IKey {
  primary: {
    state: string;
  };
  name: string;
}
interface IKeyListResponse {
  cryptoKeys: IKey[];
  error: {
    message: string;
    code: number;
  };
}

type Region = {
  name: string;
};

export class BatchService {
  static deleteBatchAPIService = async (selectedBatch: string) => {
    const credentials = await authApi();
    const { DATAPROC } = await gcpServiceUrls;
    if (credentials) {
      loggedFetch(
        `${DATAPROC}/projects/${credentials.project_id}/locations/${credentials.region_id}/batches/${selectedBatch}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      )
        .then((response: Response) => {
          response
            .json()
            .then(async (responseResult: Response) => {
              console.log(responseResult);
              Notification.emit(
                `Batch ${selectedBatch} deleted successfully`,
                'success',
                {
                  autoClose: 5000
                }
              );
            })
            .catch((e: Error) => console.log(e));
        })
        .catch((err: Error) => {
          DataprocLoggingService.log('Error deleting batches', LOG_LEVEL.ERROR);
          Notification.emit(
            `Failed to delete the batch ${selectedBatch} : ${err}`,
            'error',
            {
              autoClose: 5000
            }
          );
        });
    }
  };

  static getBatchDetailsService = async (
    setRegionName: (value: string) => void,
    setProjectName: (value: string) => void,
    batchSelected: string,
    setBatchInfoResponse: (value: IBatchDetailsResponse) => void,
    setLabelDetail: (value: string[]) => void,
    setIsLoading: (value: boolean) => void,
    setErrorView: (value: boolean) => void
  ) => {
    const credentials = await authApi();
    const { DATAPROC } = await gcpServiceUrls;
    if (credentials) {
      setRegionName(credentials.region_id || '');
      setProjectName(credentials.project_id || '');
      loggedFetch(
        `${DATAPROC}/projects/${credentials.project_id}/locations/${credentials.region_id}/batches/${batchSelected}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      )
        .then((response: Response) => {
          response
            .json()
            .then((responseResult: IBatchDetailsResponse) => {
              if (responseResult.error && responseResult.error.code === 404) {
                setErrorView(true);
              }
              setBatchInfoResponse(responseResult);
              if (responseResult.labels) {
                const labelValue = Object.entries(responseResult.labels).map(
                  ([key, value]) => `${key}:${value}`
                );
                setLabelDetail(labelValue);
              }
              setIsLoading(false);
              if (responseResult?.error?.code) {
                Notification.emit(responseResult?.error?.message, 'error', {
                  autoClose: 5000
                });
              }
            })
            .catch((e: Error) => {
              console.log(e);
              setIsLoading(false);
            });
        })
        .catch((err: Error) => {
          setIsLoading(false);
          DataprocLoggingService.log(
            'Error in getting Batch details',
            LOG_LEVEL.ERROR
          );

          Notification.emit(
            `Failed to fetch batch details ${batchSelected} : ${err}`,
            'error',
            {
              autoClose: 5000
            }
          );
        });
    }
  };

  static listBatchAPIService = async (
    setRegionName: (value: string) => void,
    setProjectName: (value: string) => void,
    renderActions: (value: IBatchData) => React.JSX.Element,
    setBatchesList: (value: IBatchesList[]) => void,
    setIsLoading: (value: boolean) => void,
    setLoggedIn: (value: boolean) => void,
    setApiDialogOpen: (open: boolean) => void,
    setPollingDisable: (value: boolean) => void,
    setEnableLink: (link: string) => void,
    nextPageTokens: string[],
    setNextPageTokens: (value: string[]) => void,
    previousBatchesList?: object,
    shouldUpdatePagination: boolean = true
  ) => {
    const credentials = await authApi();
    const { DATAPROC } = await gcpServiceUrls;
    const pageToken =
      nextPageTokens.length > 0
        ? nextPageTokens[nextPageTokens.length - 1]
        : '';
    if (credentials) {
      setRegionName(credentials.region_id || '');
      setProjectName(credentials.project_id || '');
      loggedFetch(
        `${DATAPROC}/projects/${credentials.project_id}/locations/${credentials.region_id}/batches?orderBy=create_time desc&&pageSize=${PAGE_SIZE}&pageToken=${pageToken}`,
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
            .then((responseResult: IBatchListResponse) => {
              let transformBatchListData: IBatchesList[] = [];
              if (responseResult && responseResult.batches) {
                transformBatchListData = responseResult.batches.map(
                  (data: IBatchData) => {
                    const startTimeDisplay = jobTimeFormat(data.createTime);
                    const startTime = new Date(data.createTime);
                    const elapsedTimeString = elapsedTime(
                      data.stateTime,
                      startTime
                    );
                    const batchType = Object.keys(data).filter(key =>
                      key.endsWith('Batch')
                    );
                    /*
                   Extracting batchID, location from batchInfo.name
                    Example: "projects/{project}/locations/{location}/batches/{batchID}"
                  */
                    const batchTypeDisplay = jobTypeDisplay(
                      batchType[0].split('Batch')[0]
                    );
                    return {
                      batchID: data.name.split('/')[5],
                      status: data.state,
                      location: data.name.split('/')[3],
                      creationTime: startTimeDisplay,
                      type: batchTypeDisplay,
                      elapsedTime: elapsedTimeString,
                      actions: renderActions(data)
                    };
                  }
                );
              }
              if (
                responseResult?.error?.code &&
                !credentials?.login_error &&
                !credentials?.config_error
              ) {
                handleApiError(
                  responseResult,
                  credentials,
                  setApiDialogOpen,
                  setEnableLink,
                  setPollingDisable,
                  'batches'
                );
              }
              const existingBatchData = previousBatchesList ?? [];

              let allBatchesData: IBatchesList[] = [
                ...(existingBatchData as []),
                ...transformBatchListData
              ];
              // Only update pagination tokens if shouldUpdatePagination is true
              if (shouldUpdatePagination) {
                if (responseResult?.nextPageToken) {
                  setBatchesList(allBatchesData);
                  setNextPageTokens([
                    ...nextPageTokens,
                    responseResult.nextPageToken
                  ]);
                  setIsLoading(false);
                  setLoggedIn(true);
                } else {
                  setBatchesList(allBatchesData);
                  setNextPageTokens([]);
                  setIsLoading(false);
                  setLoggedIn(true);
                }
              }
            })
            .catch((e: Error) => {
              console.log(e);
              setIsLoading(false);
            });
        })
        .catch((err: Error) => {
          setIsLoading(false);
          DataprocLoggingService.log('Error listing batches', LOG_LEVEL.ERROR);

          Notification.emit(`Failed to fetch batches : ${err}`, 'error', {
            autoClose: 5000
          });
        });
    }
  };

  static listSharedVPC = async (
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
        Notification.emit(responseResult?.error?.message, 'error', {
          autoClose: 5000
        });
      }
    } catch (err) {
      Notification.emit(
        `Failed to fetch sharedVPC subNetwork : ${err}`,
        'error',
        {
          autoClose: 5000
        }
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
              this.listSharedVPC(responseResult.name, setSharedSubNetworkList);
              if (responseResult?.error?.code) {
                Notification.emit(responseResult?.error?.message, 'error', {
                  autoClose: 5000
                });
              }
            })
            .catch((e: Error) => console.log(e));
        })
        .catch((err: Error) => {
          Notification.emit(
            `Failed to fetch user information : ${err}`,
            'error',
            {
              autoClose: 5000
            }
          );
          DataprocLoggingService.log(
            'Error displaying user info',
            LOG_LEVEL.ERROR
          );
        });
    }
  };

  static listNetworksFromSubNetworkAPIService = async (
    subNetwork: string,
    setIsloadingNetwork: (value: boolean) => void,
    setNetworkSelected: (value: string) => void
  ) => {
    setIsloadingNetwork(true);
    const credentials = await authApi();
    const { COMPUTE } = await gcpServiceUrls;
    if (credentials) {
      loggedFetch(
        `${COMPUTE}/projects/${credentials.project_id}/regions/${credentials.region_id}/subnetworks/${subNetwork}`,
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
            .then((responseResult: INetworkResponse) => {
              let transformedNetworkSelected = '';
              /*
             Extracting network from items
             Example: "https://www.googleapis.com/compute/v1/projects/{projectName}/global/subnetworks/",
            */

              transformedNetworkSelected = responseResult.network.split('/')[9];

              setNetworkSelected(transformedNetworkSelected);
              if (responseResult?.error?.code) {
                Notification.emit(responseResult?.error?.message, 'error', {
                  autoClose: 5000
                });
              }
            })
            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          DataprocLoggingService.log(
            'Error selecting Network',
            LOG_LEVEL.ERROR
          );
          Notification.emit(`Error selecting Network : ${err}`, 'error', {
            autoClose: 5000
          });
        });
    }
  };

  static listNetworksAPIService = async (
    setNetworklist: (value: string[]) => void,
    setNetworkSelected: (value: string) => void,
    batchInfoResponse: any,
    setIsloadingNetwork: (value: boolean) => void
  ) => {
    setIsloadingNetwork(true);
    const credentials = await authApi();
    const { COMPUTE } = await gcpServiceUrls;
    if (credentials) {
      loggedFetch(
        `${COMPUTE}/projects/${credentials.project_id}/global/networks`,
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
                items: Network[];
                error: {
                  message: string;
                  code: number;
                };
              }) => {
                let transformedNetworkList = [];
                /*
       Extracting network from items
       Example: "https://www.googleapis.com/compute/v1/projects/{projectName}/global/networks/",
    */

                transformedNetworkList = responseResult.items.map(
                  (data: Network) => {
                    return data.selfLink.split('/')[9];
                  }
                );
                setNetworklist(transformedNetworkList);
                if (batchInfoResponse === undefined) {
                  setNetworkSelected(transformedNetworkList[0]);
                }
                if (responseResult?.error?.code) {
                  Notification.emit(responseResult?.error?.message, 'error', {
                    autoClose: 5000
                  });
                }
              }
            )

            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          DataprocLoggingService.log('Error listing Networks', LOG_LEVEL.ERROR);
          Notification.emit(`Error listing Networks : ${err}`, 'error', {
            autoClose: 5000
          });
        });
    }
  };

  static listKeyRingsAPIService = async (
    setKeyRinglist: (value: string[]) => void
  ) => {
    const credentials = await authApi();
    const { CLOUD_KMS } = await gcpServiceUrls;
    if (credentials) {
      loggedFetch(
        `${CLOUD_KMS}/projects/${credentials.project_id}/locations/${credentials.region_id}/keyRings`,
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
            .then((responseResult: IKeyRings) => {
              let transformedKeyList = [];
              /*
       Extracting network from items
       Example: "https://www.googleapis.com/compute/v1/projects/{projectName}/global/networks/",
    */

              transformedKeyList = responseResult.keyRings.map(
                (data: { name: string }) => {
                  return data.name.split('/')[5];
                }
              );
              setKeyRinglist(transformedKeyList);
              if (responseResult?.error?.code) {
                Notification.emit(responseResult?.error?.message, 'error', {
                  autoClose: 5000
                });
              }
            })

            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          DataprocLoggingService.log('Error listing Networks', LOG_LEVEL.ERROR);
          Notification.emit(`Error listing Networks : ${err}`, 'error', {
            autoClose: 5000
          });
        });
    }
  };

  static listKeysAPIService = async (
    keyRing: string,
    setKeylist: (value: string[]) => void,
    setKeySelected: (value: string) => void
  ) => {
    const credentials = await authApi();
    const { CLOUD_KMS } = await gcpServiceUrls;
    if (credentials) {
      loggedFetch(
        `${CLOUD_KMS}/projects/${credentials.project_id}/locations/${credentials.region_id}/keyRings/${keyRing}/cryptoKeys`,
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
            .then((responseResult: IKeyListResponse) => {
              let transformedKeyList = [];
              /*
       Extracting network from items
       Example: "https://www.googleapis.com/compute/v1/projects/{projectName}/global/networks/",
    */

              transformedKeyList = responseResult.cryptoKeys
                .filter(
                  (data: IKey) =>
                    data.primary && data.primary.state === 'ENABLED'
                )
                .map((data: { name: string }) => data.name.split('/')[7]);
              setKeylist(transformedKeyList);
              setKeySelected(transformedKeyList[0]);
              if (responseResult?.error?.code) {
                Notification.emit(responseResult?.error?.message, 'error', {
                  autoClose: 5000
                });
              }
            })

            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          DataprocLoggingService.log('Error listing Networks', LOG_LEVEL.ERROR);
          Notification.emit(`Error listing Networks : ${err}`, 'error', {
            autoClose: 5000
          });
        });
    }
  };

  static listSubNetworksAPIService = async (
    network: string,
    setSubNetworklist: (value: string[]) => void,
    setSubNetworkSelected: (value: string) => void,
    batchInfoResponse: any,
    setIsloadingNetwork: (value: boolean) => void
  ) => {
    setIsloadingNetwork(true);
    setSubNetworklist([]);
    setSubNetworkSelected('');
    const credentials = await authApi();
    const { COMPUTE } = await gcpServiceUrls;
    if (!credentials) {
      setIsloadingNetwork(false);
      return;
    }
    try {
      const response = await loggedFetch(
        `${COMPUTE}/projects/${credentials.project_id}/regions/${credentials.region_id}/subnetworks`,
        {
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      );
      const responseResult = await response.json();
      if (responseResult?.error?.code) {
        Notification.emit(responseResult.error.message, 'error', {
          autoClose: 5000
        });
        setIsloadingNetwork(false);
        return;
      }
      if (!responseResult.items || responseResult.items.length === 0) {
        const errorMessage = `No subnetworks found for network "${network}"`;
        Notification.emit(errorMessage, 'error', { autoClose: 5000 });
        DataprocLoggingService.log(errorMessage, LOG_LEVEL.ERROR);
        setIsloadingNetwork(false);
        return;
      }
      const networkSubnets = responseResult.items.filter(
        (item: { network: string }) => item.network.split('/')[9] === network
      );
      if (networkSubnets.length === 0) {
        const errorMessage = `No subnetworks found for network "${network}"`;
        Notification.emit(errorMessage, 'error', { autoClose: 5000 });
        DataprocLoggingService.log(errorMessage, LOG_LEVEL.ERROR);
        setIsloadingNetwork(false);
        return;
      }
      const filteredServices = networkSubnets.filter(
        (item: { privateIpGoogleAccess: boolean }) =>
          item.privateIpGoogleAccess === true
      );
      const transformedServiceList = filteredServices.map(
        (data: { name: string }) => data.name
      );
      setSubNetworklist(transformedServiceList);
      if (batchInfoResponse === undefined) {
        if (transformedServiceList.length > 0) {
          setSubNetworkSelected(transformedServiceList[0]);
        } else {
          const errorMessage = `There are no subnetworks with Google Private Access enabled for network "${network}"`;
          Notification.emit(errorMessage, 'error', { autoClose: 5000 });
          DataprocLoggingService.log(errorMessage, LOG_LEVEL.ERROR);
        }
      }
      setIsloadingNetwork(false);
    } catch (err) {
      console.error('Error listing subNetworks:', err);
      DataprocLoggingService.log('Error listing subNetworks', LOG_LEVEL.ERROR);
      setIsloadingNetwork(false);
      const errorMessage =
        err instanceof Error
          ? `Error listing subNetworks: ${err.message}`
          : 'Error listing subNetworks';
      Notification.emit(errorMessage, 'error', { autoClose: 5000 });
    }
  };

  static listMetaStoreAPIService = async (
    projectId: string,
    location: string,
    network: string | undefined,
    filteredServicesArray: any, // Pass the array as a parameter
    setIsLoadingService: (value: boolean) => void,
    regionName: string,
    setServicesList: (value: string[]) => void
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
                        location == regionName &&
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
                  Notification.emit(responseResult?.error?.message, 'error', {
                    autoClose: 5000
                  });
                }
              }
            )
            .catch((e: Error) => {
              console.log(e);
              setIsLoadingService(false);
            });
        })
        .catch((err: Error) => {
          setIsLoadingService(false);
          DataprocLoggingService.log('Error listing services', LOG_LEVEL.ERROR);
          Notification.emit(`Error listing services : ${err}`, 'error', {
            autoClose: 5000
          });
        });
    }
  };

  static regionListAPIService = async (
    projectId: string,
    network: string | undefined,
    setIsLoadingService: (value: boolean) => void,
    regionName: string,
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
                let transformedRegionList = responseResult.items.map(
                  (data: Region) => {
                    return data.name;
                  }
                );

                const filteredServicesArray: never[] = [];
                // Use Promise.all to fetch services from all locations concurrently
                const servicePromises = transformedRegionList.map(location => {
                  return this.listMetaStoreAPIService(
                    projectId,
                    location,
                    network,
                    filteredServicesArray,
                    setIsLoadingService,
                    regionName,
                    setServicesList
                  );
                });

                // Wait for all servicePromises to complete
                Promise.all(servicePromises)
                  .then(() => {
                    if (responseResult?.error?.code) {
                      Notification.emit(
                        responseResult?.error?.message,
                        'error',
                        {
                          autoClose: 5000
                        }
                      );
                    }
                  })
                  .catch(e => {
                    console.log(e);
                  });
              }
            )
            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          DataprocLoggingService.log('Error listing regions', LOG_LEVEL.ERROR);
          Notification.emit(`Failed to fetch regions : ${err}`, 'error', {
            autoClose: 5000
          });
        });
    }
  };

  static creatBatchSubmitService = async (
    credentials: IAuthCredentials,
    payload: any,
    batchIdSelected: string,
    setCreateBatchView: any,
    setCreateBatch: any,
    setError: any,
    error: any,
    setApiDialogOpen: (open: boolean) => void,
    setEnableLink: (link: string) => void
  ) => {
    const { DATAPROC } = await gcpServiceUrls;
    loggedFetch(
      `${DATAPROC}/projects/${credentials.project_id}/locations/${credentials.region_id}/batches?batchId=${batchIdSelected}`,
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
          console.log(responseResult);
          if (setCreateBatchView) {
            setCreateBatchView(false);
          }
          if (setCreateBatch) {
            setCreateBatch(false);
          }

          Notification.emit(
            `Batch ${batchIdSelected} successfully submitted`,
            'success',
            {
              autoClose: 5000
            }
          );
        } else {
          const errorResponse = await response.json();
          if (errorResponse?.error?.code !== 403) {
            setError({ isOpen: true, message: errorResponse.error.message });
          }
          if (errorResponse?.error?.code === 403) {
            handleApiError(
              errorResponse,
              credentials,
              setApiDialogOpen,
              setEnableLink,
              () => {},

              'batches'
            );
          }
          console.error('Failed to submit batch, API response:', errorResponse);
        }
      })
      .catch((err: Error) => {
        Notification.emit(`Failed to submit the Batch : ${err}`, 'error', {
          autoClose: 5000
        });
        DataprocLoggingService.log('Error submitting Batch', LOG_LEVEL.ERROR);
      });
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
      Notification.emit(`Failed to list the clusters : ${error}`, 'error', {
        autoClose: 5000
      });
    }
  };
}
