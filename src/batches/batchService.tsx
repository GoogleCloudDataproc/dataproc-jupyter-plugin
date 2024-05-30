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
  gcpServiceUrls
} from '../utils/const';
import {
  authApi,
  toastifyCustomStyle,
  loggedFetch,
  jobTimeFormat,
  elapsedTime,
  jobTypeDisplay,
  authenticatedFetch,
  IAuthCredentials
} from '../utils/utils';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';

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

              toast.success(
                `Batch ${selectedBatch} deleted successfully`,
                toastifyCustomStyle
              );
            })
            .catch((e: Error) => console.log(e));
        })
        .catch((err: Error) => {
          DataprocLoggingService.log('Error deleting batches', LOG_LEVEL.ERROR);
          toast.error(
            `Failed to delete the batch ${selectedBatch} : ${err}`,
            toastifyCustomStyle
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
                toast.error(
                  responseResult?.error?.message,
                  toastifyCustomStyle
                );
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
          toast.error(
            `Failed to fetch batch details ${batchSelected} : ${err}`,
            toastifyCustomStyle
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
    nextPageToken?: string,
    previousBatchesList?: object
  ) => {
    const credentials = await authApi();
    const { DATAPROC } = await gcpServiceUrls;
    const pageToken = nextPageToken ?? '';
    if (credentials) {
      setRegionName(credentials.region_id || '');
      setProjectName(credentials.project_id || '');
      loggedFetch(
        `${DATAPROC}/projects/${credentials.project_id}/locations/${credentials.region_id}/batches?orderBy=create_time desc&&pageSize=500&pageToken=${pageToken}`,
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
              if (responseResult?.error?.code) {
                if (!toast.isActive('batchListingError')) {
                  toast.error(responseResult?.error?.message, {
                    ...toastifyCustomStyle,
                    toastId: 'batchListingError'
                  });
                }
              }
              const existingBatchData = previousBatchesList ?? [];

              let allBatchesData: IBatchesList[] = [
                ...(existingBatchData as []),
                ...transformBatchListData
              ];

              if (responseResult.nextPageToken) {
                this.listBatchAPIService(
                  setRegionName,
                  setProjectName,
                  renderActions,
                  setBatchesList,
                  setIsLoading,
                  setLoggedIn,
                  responseResult.nextPageToken,
                  allBatchesData
                );
              } else {
                setBatchesList(allBatchesData);
                setIsLoading(false);
                setLoggedIn(true);
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
          if (!toast.isActive('batchListingError')) {
            toast.error(`Failed to fetch batches : ${err}`, {
              ...toastifyCustomStyle,
              toastId: 'batchListingError'
            });
          }
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
        toast.error(responseResult?.error?.message, toastifyCustomStyle);
      }
    } catch (err) {
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
              this.listSharedVPC(responseResult.name, setSharedSubNetworkList);
              if (responseResult?.error?.code) {
                toast.error(
                  responseResult?.error?.message,
                  toastifyCustomStyle
                );
              }
            })
            .catch((e: Error) => console.log(e));
        })
        .catch((err: Error) => {
          toast.error(
            `Failed to fetch user information : ${err}`,
            toastifyCustomStyle
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
                toast.error(
                  responseResult?.error?.message,
                  toastifyCustomStyle
                );
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
          toast.error(`Error selecting Network : ${err}`, toastifyCustomStyle);
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
                  toast.error(
                    responseResult?.error?.message,
                    toastifyCustomStyle
                  );
                }
              }
            )

            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          DataprocLoggingService.log('Error listing Networks', LOG_LEVEL.ERROR);
          toast.error(`Error listing Networks : ${err}`), toastifyCustomStyle;
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
                toast.error(
                  responseResult?.error?.message,
                  toastifyCustomStyle
                );
              }
            })

            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          DataprocLoggingService.log('Error listing Networks', LOG_LEVEL.ERROR);
          toast.error(`Error listing Networks : ${err}`, toastifyCustomStyle);
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
                toast.error(
                  responseResult?.error?.message,
                  toastifyCustomStyle
                );
              }
            })

            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          DataprocLoggingService.log('Error listing Networks', LOG_LEVEL.ERROR);
          toast.error(`Error listing Networks : ${err}`), toastifyCustomStyle;
        });
    }
  };

  static listSubNetworksAPIService = async (
    subnetwork: string,
    setSubNetworklist: (value: string[]) => void,
    setSubNetworkSelected: (value: string) => void,
    batchInfoResponse: any,
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
                const filteredServices = responseResult.items.filter(
                  (item: { network: string; privateIpGoogleAccess: boolean }) =>
                    item.network.split('/')[9] === subnetwork &&
                    item.privateIpGoogleAccess === true
                );
                const transformedServiceList = filteredServices.map(
                  (data: { name: string }) => data.name
                );
                setSubNetworklist(transformedServiceList);
                if (batchInfoResponse === undefined) {
                  setSubNetworkSelected(transformedServiceList[0]);
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
              console.log(e);
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
                  toast.error(
                    responseResult?.error?.message,
                    toastifyCustomStyle
                  );
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
          toast.error(`Error listing services : ${err}`, toastifyCustomStyle);
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
                      toast.error(
                        responseResult?.error?.message,
                        toastifyCustomStyle
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
          toast.error(`Error listing regions : ${err}`, toastifyCustomStyle);
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
    error: any
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
          toast.success(
            `Batch ${batchIdSelected} successfully submitted`,
            toastifyCustomStyle
          );
        } else {
          const errorResponse = await response.json();
          toast.error(errorResponse?.error?.message, toastifyCustomStyle);
          setError({ isOpen: true, message: errorResponse.error.message });
          console.log(error);
        }
      })
      .catch((err: Error) => {
        toast.error(`Failed to submit the Batch : ${err}`, toastifyCustomStyle);
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
      toast.error(
        `Failed to list the clusters : ${error}`,
        toastifyCustomStyle
      );
    }
  };
}
