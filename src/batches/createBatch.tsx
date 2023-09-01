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
import LeftArrowIcon from '../../style/icons/left_arrow_icon.svg';
import 'semantic-ui-css/semantic.min.css';
import 'react-toastify/dist/ReactToastify.css';
import { Input, Radio, Select } from 'semantic-ui-react';
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  ARCHIVE_FILES_MESSAGE,
  ARGUMENTS_MESSAGE,
  ARTIFACT_REGISTERY,
  BASE_URL,
  BASE_URL_KEY,
  BASE_URL_META,
  BASE_URL_NETWORKS,
  CONTAINER_REGISTERY,
  CUSTOM_CONTAINERS,
  CUSTOM_CONTAINER_MESSAGE,
  FILES_MESSAGE,
  JAR_FILE_MESSAGE,
  KEY_MESSAGE,
  METASTORE_MESSAGE,
  NETWORK_TAG_MESSAGE,
  PROJECT_LIST_URL,
  QUERY_FILE_MESSAGE,
  REGION_URL,
  SECURITY_KEY,
  SELF_MANAGED_CLUSTER,
  SERVICE_ACCOUNT,
  STATUS_RUNNING
} from '../utils/const';
import TagsInput from 'react-tagsinput';
import 'react-tagsinput/react-tagsinput.css';
import LabelProperties from '../jobs/labelProperties';
import { authApi, toastifyCustomStyle } from '../utils/utils';
import { ClipLoader } from 'react-spinners';
import { toast } from 'react-toastify';
import ErrorPopup from '../utils/errorPopup';
import errorIcon from '../../style/icons/error_icon.svg';
// import { set } from 'lib0/encoding';

type Project = {
  projectId: string;
};

type Cluster = {
  clusterName: string;
  status: {
    state: string;
  };
};

type Network = {
  selfLink: any;
  network: string;
  subnetworks: string;
};

type Service = {
  name: string;
};

const iconLeftArrow = new LabIcon({
  name: 'launcher:left-arrow-icon',
  svgstr: LeftArrowIcon
});

const iconError = new LabIcon({
  name: 'launcher:error-icon',
  svgstr: errorIcon
});

interface ICreateBatchProps {
  setCreateBatchView?: (value: boolean) => void;
  regionName: string;
  projectName: string;
  batchInfoResponse?: any;
  createBatch?: boolean;
  setCreateBatch?: (value: boolean) => void;
}
let jarFileUris: string[] = [];
let fileUris: string[] = [];
let archiveFileUris: string[] = [];
let argumentsUris: string[] = [];
let networkUris: string[] = [];
let key: string[] | (() => string[]) = [];
let value: string[] | (() => string[]) = [];
let pythonFileUris: string[] = [];
function batchKey(batchSelected: any) {
  const batchKeys: string[] = [];

  for (const key in batchSelected) {
    if (key.endsWith('Batch')) {
      batchKeys.push(key);
    }
  }
  return batchKeys;
}
function batchTypeFunction(batchKey: string) {
  let batchType = 'spark';
  switch (batchKey) {
    case 'sparkRBatch':
      batchType = 'sparkR';
      return batchType;
    case 'pysparkBatch':
      batchType = 'pySpark';
      return batchType;
    case 'sparkSqlBatch':
      batchType = 'sparkSql';
      return batchType;
    default:
      return batchType;
  }
}

function CreateBatch({
  setCreateBatchView,
  regionName,
  projectName,
  batchInfoResponse,
  setCreateBatch,
  createBatch
}: ICreateBatchProps) {
  let batchKeys: string[] = [];
  let batchType = 'spark';
  let mainClass = '';
  let mainJarFileUri = '';
  let mainRFileUri = '';
  let mainPythonFileUri = '';
  let queryFileUri = '';
  let serviceAccount = '';
  let subNetwork = 'default';
  let network = 'default';
  let historyServer = 'None';
  let historyServerValue = 'None';
  let metastoreService = '';
  let metaProject = 'None';
  let metaRegion = '';
  let containerImage = '';
  if (batchInfoResponse !== undefined) {
    if (Object.keys(batchInfoResponse).length !== 0) {
      batchKeys = batchKey(batchInfoResponse);
      batchType = batchTypeFunction(batchKeys[0]);
      const batchTypeKey = batchKeys[0];
      if (batchInfoResponse[batchKeys[0]].hasOwnProperty('queryFileUri')) {
        queryFileUri = batchInfoResponse[batchKeys[0]].queryFileUri;
      }
      mainJarFileUri = batchInfoResponse[batchKeys[0]].mainJarFileUri;
      mainClass = batchInfoResponse[batchKeys[0]].mainClass;
      mainRFileUri = batchInfoResponse[batchKeys[0]].mainRFileUri;
      mainPythonFileUri = batchInfoResponse[batchKeys[0]].mainPythonFileUri;
      if (batchInfoResponse[batchTypeKey].hasOwnProperty('jarFileUris')) {
        jarFileUris = [batchInfoResponse[batchKeys[0]].jarFileUris];
      }
      if (batchInfoResponse[batchTypeKey].hasOwnProperty('fileUris')) {
        fileUris = [batchInfoResponse[batchKeys[0]].fileUris];
      }
      if (batchInfoResponse[batchTypeKey].hasOwnProperty('archiveUris')) {
        archiveFileUris = [batchInfoResponse[batchKeys[0]].archiveUris];
      }
      if (batchInfoResponse[batchTypeKey].hasOwnProperty('args')) {
        argumentsUris = [batchInfoResponse[batchKeys[0]].args];
      }
      if (batchInfoResponse[batchTypeKey].hasOwnProperty('pythonFileUris')) {
        pythonFileUris = [batchInfoResponse[batchKeys[0]].pythonFileUris];
      }
      serviceAccount = batchInfoResponse?.environmentConfig?.executionConfig?.serviceAccount || '';
      networkUris = batchInfoResponse?.environmentConfig?.executionConfig?.networkTags || '';
      subNetwork = batchInfoResponse?.environmentConfig?.executionConfig?.subnetworkUri || 'default';
      historyServerValue = batchInfoResponse?.environmentConfig?.peripheralsConfig?.sparkHistoryServerConfig?.dataprocCluster || 'None';
      if (historyServerValue !== 'None') {
        const parts = historyServerValue.split('/'); //splitting to take cluster name from project/projectName/region/regionName/cluster/clusterName
        historyServer = parts[parts.length - 1];
      }
      batchInfoResponse?.environmentConfig?.peripheralsConfig
        ?.sparkHistoryServerConfig?.dataprocCluster;
      metastoreService =
        batchInfoResponse?.environmentConfig?.peripheralsConfig
          ?.metastoreService || 'None';
      containerImage = batchInfoResponse?.runtimeConfig?.containerImage || '';
      if (metastoreService != 'None') {
        const metastoreDetails = metastoreService.split('/');
        metaProject = metastoreDetails[1];
        metaRegion = metastoreDetails[3];
      }
    }


  }


  const selectedRadioInitialValue = mainClass ? 'mainClass' : 'mainJarURI';
  const [batchTypeList, setBatchTypeList] = useState([{}]);
  const [generationCompleted, setGenerationCompleted] = useState(false);
  const [hexNumber, setHexNumber] = useState('');
  const [batchIdSelected, setBatchIdSelected] = useState('');
  const [batchTypeSelected, setBatchTypeSelected] = useState(batchType);
  const [versionSelected, setVersionSelected] = useState('2.1');
  const [selectedRadio, setSelectedRadio] = useState(selectedRadioInitialValue);
  const [mainClassSelected, setMainClassSelected] = useState(mainClass);
  const [mainJarSelected, setMainJarSelected] = useState(mainJarFileUri);
  const [mainRSelected, setMainRSelected] = useState(mainRFileUri);
  const [selectedRadioValue, setSelectedRadioValue] = useState('key');
  const [containerImageSelected, setContainerImageSelected] =
    useState(containerImage);
  const [jarFilesSelected, setJarFilesSelected] = useState([...jarFileUris]);
  const [filesSelected, setFilesSelected] = useState([...fileUris]);
  const [queryFileSelected, setQueryFileSelected] = useState(queryFileUri);
  const [ArchiveFilesSelected, setArchiveFileSelected] = useState([
    ...archiveFileUris
  ]);
  const [argumentsSelected, setArgumentsSelected] = useState([
    ...argumentsUris
  ]);
  const [serviceAccountSelected, setServiceAccountSelected] =
    useState(serviceAccount);
  const [networkTagSelected, setNetworkTagSelected] = useState([
    ...networkUris
  ]);
  const [propertyDetail, setPropertyDetail] = useState(['']);
  const [selectedEncryptionRadio, setSelectedEncryptionRadio] =
    useState('googleManaged');
  const [propertyDetailUpdated, setPropertyDetailUpdated] = useState(['']);
  const [keyValidation, setKeyValidation] = useState(-1);
  const [valueValidation, setValueValidation] = useState(-1);
  const [duplicateKeyError, setDuplicateKeyError] = useState(-1);
  const [labelDetail, setLabelDetail] = useState(key);
  const [labelDetailUpdated, setLabelDetailUpdated] = useState(value);
  const [servicesList, setServicesList] = useState<
    Array<{ key: string; value: string; text: string }>
  >([]);
  const [servicesSelected, setServicesSelected] = useState(metastoreService);

  const [clusterSelected, setClusterSelected] = useState(historyServer);
  const [projectId, setProjectId] = useState(metaProject);
  const [region, setRegion] = useState(metaRegion);
  const [projectList, setProjectList] = useState([{}]);
  const [regionList, setRegionList] = useState<
    { value: string; key: string; text: string }[]
  >([]);
  const [networkList, setNetworklist] = useState([{}]);
  const [keyRinglist, setKeyRinglist] = useState([{}]);
  const [subNetworkList, setSubNetworklist] = useState<
    { key: string; value: string; text: string }[]
  >([]);
  const [isLoadingRegion, setIsLoadingRegion] = useState(false);
  const [networkSelected, setNetworkSelected] = useState(network);
  const [subNetworkSelected, setSubNetworkSelected] = useState(subNetwork);
  const [isLoadingService, setIsLoadingService] = useState(false);
  const [error, setError] = useState({ isOpen: false, message: '' });
  const [parameterDetail, setParameterDetail] = useState(['']);
  const [parameterDetailUpdated, setParameterDetailUpdated] = useState(['']);
  const [additionalPythonFileSelected, setAdditionalPythonFileSelected] =
    useState([...pythonFileUris]);
  const [mainPythonSelected, setMainPythonSelected] =
    useState(mainPythonFileUri);
  const [clustersList, setClustersList] = useState<
    Array<{ key: string; value: string; text: string }>
  >([]);
  const [additionalPythonFileValidation, setAdditionalPythonFileValidation] =
    useState(true);
  const [jarFileValidation, setJarFileValidation] = useState(true);
  const [fileValidation, setFileValidation] = useState(true);
  const [archieveFileValidation, setArchieveFileValidation] = useState(true);
  const [mainPythonValidation, setMainPythonValidation] = useState(true);
  const [queryFileValidation, setQueryFileValidation] = useState(true);
  const [mainRValidation, setMainRValidation] = useState(true);
  const [batchIdValidation, setBatchIdValidation] = useState(false);
  const [mainJarValidation, setMainJarValidation] = useState(true);
  const [defaultValue, setDefaultValue] = useState(subNetwork);
  const [keyRingSelected, setKeyRingSelected] = useState('');
  const [keySelected, setKeySelected] = useState('');
  const [manualKeySelected, setManualKeySelected] = useState('');
  const [manualValidation, setManualValidation] = useState(true);
  const [keylist, setKeylist] = useState<
    { key: string; value: string; text: string }[]
  >([]);
  const handleCreateBatchBackView = () => {
    if (setCreateBatchView) {
      setCreateBatchView(false);
    }
    if (setCreateBatch) {
      setCreateBatch(false);
    }
  };
  const handleMainClassRadio = () => {
    setSelectedRadio('mainClass');
    setMainJarSelected('');
    setMainClassSelected('');
  };


  const handleMainJarRadio = () => {
    setSelectedRadio('mainJarURI');
    setMainClassSelected('');
    setMainJarSelected('');
  };
  const handlekeyRingRadio = () => {
    setSelectedRadioValue('key');
    setManualKeySelected('');
  };
  const handlekeyManuallyRadio = () => {
    setSelectedRadioValue('manually');
    setKeyRingSelected('');
    setKeySelected('');
  };
  useEffect(() => {
    const batchTypeData = [
      { key: 'spark', value: 'spark', text: 'Spark' },
      { key: 'sparkR', value: 'sparkR', text: 'SparkR' },
      { key: 'sparkSql', value: 'sparkSql', text: 'SparkSql' },
      { key: 'pySpark', value: 'pySpark', text: 'PySpark' }
    ];

    setBatchTypeList(batchTypeData);
    projectListAPI();
    listClustersAPI();
    listNetworksAPI();
    listKeyRingsAPI();
  }, [clusterSelected, defaultValue]);

  useEffect(() => {
    generateRandomHex();
  }, [
    batchIdSelected,
    mainClassSelected,
    mainRSelected,
    mainPythonSelected,
    queryFileSelected,
    jarFileValidation,
    mainJarValidation,
    archieveFileValidation,
    mainRValidation,
    fileValidation,
    mainPythonValidation,
    queryFileValidation,
    keyValidation,
    valueValidation,
    batchIdValidation,
    duplicateKeyError,
    manualValidation
  ]);
  useEffect(() => {
    let batchKeys: string[] = [];
    if (batchInfoResponse) {
      if (Object.keys(batchInfoResponse).length !== 0) {
        if (batchInfoResponse.hasOwnProperty('labels')) {
          const updatedLabelDetail = Object.entries(
            batchInfoResponse.labels
          ).map(([k, v]) => `${k}:${v}`);
          setLabelDetail(prevLabelDetail => [
            ...prevLabelDetail,
            ...updatedLabelDetail
          ]);
          setLabelDetailUpdated(prevLabelDetailUpdated => [
            ...prevLabelDetailUpdated,
            ...updatedLabelDetail
          ]);
          for (const key in batchInfoResponse) {
            if (key.endsWith('Batch')) {
              batchKeys.push(key);
            }
          }
          batchKeys = batchKey(batchInfoResponse);
          if (batchInfoResponse.runtimeConfig.hasOwnProperty('properties')) {
            const updatedPropertyDetail = Object.entries(
              batchInfoResponse.runtimeConfig.properties
            ).map(([k, v]) => `${k.substring(6)}: ${v}`);

            setPropertyDetail(prevPropertyDetail => [
              ...prevPropertyDetail,
              ...updatedPropertyDetail
            ]);
            setPropertyDetailUpdated(prevPropertyDetailUpdated => [
              ...prevPropertyDetailUpdated,
              ...updatedPropertyDetail
            ]);
          }
          if (
            batchInfoResponse[batchKeys[0]].hasOwnProperty('queryVariables')
          ) {
            const updatedParamDetail = Object.entries(
              batchInfoResponse[batchKeys[0]].queryVariables
            ).map(([k, v]) => `${k}:${v}`);
            setPropertyDetail(prevParameterDetail => [
              ...prevParameterDetail,
              ...updatedParamDetail
            ]);
            setPropertyDetailUpdated(prevParameterDetailUpdated => [
              ...prevParameterDetailUpdated,
              ...updatedParamDetail
            ]);
          }
        }
      }
      listNetworksFromSubNetworkAPI(subNetwork);
    }
  }, []);
  const listNetworksFromSubNetworkAPI = async (subNetwork: any) => {
    const credentials = await authApi();
    if (credentials) {
      fetch(
        `${BASE_URL_NETWORKS}/projects/${credentials.project_id}/regions/${credentials.region_id}/subnetworks/${subNetwork}`,
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
            .then((responseResult: any) => {
              let transformedNetworkSelected = '';

              transformedNetworkSelected = responseResult.network.split('/')[9];

              setNetworkSelected(transformedNetworkSelected);


            })

            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          console.error('Error selecting Network', err);
        });
    }
  };
  function isSubmitDisabled() {
    const commonConditions =
      batchIdSelected === '' || regionName === '' || batchIdValidation;
    switch (batchTypeSelected) {
      case 'spark':
        return (
          commonConditions ||
          (selectedRadio === 'mainClass' && mainClassSelected === '') ||
          (selectedRadio === 'mainJarURI' && mainJarSelected === '') ||
          !mainJarValidation ||
          !fileValidation ||
          !archieveFileValidation ||
          !manualValidation
        );
      case 'sparkR':
        return (
          commonConditions ||
          mainRSelected === '' ||
          !mainRValidation ||
          !fileValidation ||
          !archieveFileValidation ||
          !manualValidation
        );
      case 'pySpark':
        return (
          commonConditions ||
          mainPythonSelected === '' ||
          !mainPythonValidation ||
          !additionalPythonFileValidation ||
          !fileValidation ||
          !archieveFileValidation ||
          !manualValidation
        );
      case 'sparkSql':
        return (
          commonConditions ||
          queryFileSelected === '' ||
          !queryFileValidation ||
          !jarFileValidation ||
          !manualValidation
        );
      default:
        return false;
    }
  }

  const handleValidationFiles = (
    listOfFiles: any,
    setValuesPart: any,
    setValidationPart: any
  ) => {
    if (typeof listOfFiles === 'string') {
      if (
        listOfFiles.startsWith('file://') ||
        listOfFiles.startsWith('gs://') ||
        listOfFiles.startsWith('hdfs://')
      ) {
        setValidationPart(true);
      } else {
        setValidationPart(false);
      }
      setValuesPart(listOfFiles);
    } else {
      if (listOfFiles.length === 0) {
        setValidationPart(true);
      } else {
        listOfFiles.forEach((fileName: any) => {
          if (
            fileName.startsWith('file://') ||
            fileName.startsWith('gs://') ||
            fileName.startsWith('hdfs://')
          ) {
            setValidationPart(true);
          } else {
            setValidationPart(false);
          }
        });
      }
      setValuesPart(listOfFiles);
    }
  };

  const listClustersAPI = async () => {
    const credentials = await authApi();
    if (credentials) {
      fetch(
        `${BASE_URL}/projects/${credentials.project_id}/regions/${credentials.region_id}/clusters?pageSize=100`,
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
            .then((responseResult: { clusters: Cluster[] }) => {
              let transformClusterListData = [];

              transformClusterListData = responseResult.clusters.filter(
                (data: Cluster) => {
                  if (data.status.state === STATUS_RUNNING) {
                    return {
                      clusterName: data.clusterName
                    };
                  }
                }
              );

              const keyLabelStructure = transformClusterListData.map(obj => ({
                key: obj.clusterName,
                value: obj.clusterName,
                text: obj.clusterName
              }));
              setClustersList(keyLabelStructure);
            })
            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          console.error('Error listing clusters', err);
        });
    }
  };
  const listNetworksAPI = async () => {
    const credentials = await authApi();
    if (credentials) {
      fetch(
        `${BASE_URL_NETWORKS}/projects/${credentials.project_id}/global/networks`,
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
            .then((responseResult: { items: Network[] }) => {
              let transformedNetworkList = [];
              /*
         Extracting network from items
         Example: "https://www.googleapis.com/compute/v1/projects/{projectName}/global/networks/",
      */

              transformedNetworkList = responseResult.items.map(
                (data: Network) => {
                  return {
                    network: data.selfLink.split('/')[9]
                  };
                }
              );
              const keyLabelStructureNetwork = transformedNetworkList.map(
                obj => ({
                  key: obj.network,
                  value: obj.network,
                  text: obj.network
                })
              );
              setNetworklist(keyLabelStructureNetwork);
            })

            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          console.error('Error listing Networks', err);
        });
    }
  };
  const listKeyRingsAPI = async () => {
    const credentials = await authApi();
    if (credentials) {
      fetch(
        `${BASE_URL_KEY}/projects/${credentials.project_id}/locations/${credentials.region_id}/keyRings`,
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
            .then((responseResult: any) => {
              let transformedKeyList = [];
              /*
         Extracting network from items
         Example: "https://www.googleapis.com/compute/v1/projects/{projectName}/global/networks/",
      */

              transformedKeyList = responseResult.keyRings.map((data: any) => {
                return {
                  name: data.name.split('/')[5]
                };
              });
              const keyLabelStructureKeyRing = transformedKeyList.map(
                (obj: { name: any }) => ({
                  key: obj.name,
                  value: obj.name,
                  text: obj.name
                })
              );
              setKeyRinglist(keyLabelStructureKeyRing);
            })

            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          console.error('Error listing Networks', err);
        });
    }
  };
  const listKeysAPI = async (keyRing: any) => {
    const credentials = await authApi();
    if (credentials) {
      fetch(
        `${BASE_URL_KEY}/projects/${credentials.project_id}/locations/${credentials.region_id}/keyRings/${keyRing}/cryptoKeys`,
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
            .then((responseResult: any) => {
              let transformedKeyList = [];
              /*
         Extracting network from items
         Example: "https://www.googleapis.com/compute/v1/projects/{projectName}/global/networks/",
      */

              transformedKeyList = responseResult.cryptoKeys.map(
                (data: any) => {
                  return {
                    name: data.name.split('/')[7]
                  };
                }
              );
              const keyLabelStructureKeyRing = transformedKeyList.map(
                (obj: { name: any }) => ({
                  key: obj.name,
                  value: obj.name,
                  text: obj.name
                })
              );
              setKeylist(keyLabelStructureKeyRing);
              setKeySelected(keyLabelStructureKeyRing[0].value);
            })

            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          console.error('Error listing Networks', err);
        });
    }
  };
  type SubnetworkData = {
    subnetworks: string;
  };
  const listSubNetworksAPI = async (subnetwork: string) => {
    const credentials = await authApi();
    if (credentials) {
      fetch(
        `${BASE_URL_NETWORKS}/projects/${credentials.project_id}/global/networks/${subnetwork}`,
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
            .then((responseResult: { subnetworks: string[] }) => {
              let transformedSubNetworkList = [];
              /*
         Extracting  subnetworks from Network
         Example: "https://www.googleapis.com/compute/v1/projects/{projectName}/global/networks/subnetwork",
      */

              transformedSubNetworkList = responseResult.subnetworks.map(
                (data: string) => {
                  return {
                    subnetworks: data.split(
                      `${credentials.region_id}/subnetworks/`
                    )[1]
                  };
                }
              );
              const keyLabelStructureSubNetwork = transformedSubNetworkList
                .filter((obj: SubnetworkData) => obj.subnetworks !== undefined)
                .map((obj: SubnetworkData) => ({
                  key: obj.subnetworks,
                  value: obj.subnetworks,
                  text: obj.subnetworks
                }));
              setSubNetworklist(keyLabelStructureSubNetwork);
              setDefaultValue(keyLabelStructureSubNetwork[0].value);
              setSubNetworkSelected(keyLabelStructureSubNetwork[0].value);
            })

            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          console.error('Error listing Networks', err);
        });
    }
  };
  const listMetaStoreAPI = async (data: undefined) => {
    setIsLoadingService(true);
    const credentials = await authApi();
    if (credentials) {
      fetch(
        `${BASE_URL_META}/projects/${projectId}/locations/${data}/services`,
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
            .then((responseResult: { services: Service[] }) => {
              let transformClusterListData = [];

              transformClusterListData = responseResult.services.filter(
                (data: Service) => {
                  return {
                    name: data.name
                  };
                }
              );

              const keyLabelStructure = transformClusterListData.map(obj => ({
                key: obj.name,
                value: obj.name,
                text: obj.name
              }));
              const noneOption = { key: 'None', value: 'None', text: 'None' };
              setServicesList([noneOption, ...keyLabelStructure]);
              setIsLoadingService(false);
            })
            .catch((e: Error) => {
              console.log(e);
              setIsLoadingService(false);
            });
        })
        .catch((err: Error) => {
          console.error('Error listing services', err);
          setIsLoadingService(false);
        });
    }
  };
  const projectListAPI = async () => {
    const credentials = await authApi();
    if (credentials) {
      fetch(PROJECT_LIST_URL, {
        method: 'GET',
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token
        }
      })
        .then((response: Response) => {
          response
            .json()
            .then((responseResult: { projects: Project[] }) => {
              let transformedProjectList = [];
              transformedProjectList = responseResult.projects.map(
                (data: Project) => {
                  return {
                    value: data.projectId,
                    key: data.projectId,
                    text: data.projectId
                  };
                }
              );
              setProjectList(transformedProjectList);
            })
            .catch((e: Error) => console.log(e));
        })
        .catch((err: Error) => {
          console.error('Error fetching project list', err);
        });
    }
  };

  type Region = {
    name: string;
  };

  const regionListAPI = async (projectId: string) => {
    setIsLoadingRegion(true);
    const credentials = await authApi();
    if (credentials) {
      fetch(`${REGION_URL}${projectId}/regions`, {
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token
        }
      })
        .then((response: Response) => {
          response
            .json()
            .then((responseResult: { items: Region[] }) => {
              let transformedRegionList = [];
              transformedRegionList = responseResult.items.map(
                (data: Region) => {
                  return {
                    value: data.name,
                    key: data.name,
                    text: data.name
                  };
                }
              );
              setRegionList(transformedRegionList);
              setIsLoadingRegion(false);
            })
            .catch((e: Error) => {
              console.log(e);
              setIsLoadingRegion(false);
            });
        })
        .catch((err: Error) => {
          console.error('Error listing regions', err);
          setIsLoadingRegion(false);
        });
    }
  };

  type Payload = {
    [key: string]: any;
  };

  type RuntimeConfig = {
    version: string;
    containerImage?: string;
    properties?: object;
  };

  type ExecutionConfig = {
    serviceAccount?: string;
    subnetworkUri: string;
    networkTags?: string[];
  };

  type SparkHistoryServerConfig = {
    dataprocCluster: string;
  };

  const createPayload = (
    batchTypeSelected: string,
    mainJarSelected: string,
    mainClassSelected: string,
    propertyObject: object,
    ArchiveFilesSelected: string[],
    filesSelected: string[],
    jarFilesSelected: string[],
    argumentsSelected: string[],
    networkTagSelected: string[],
    labelObject: object,
    projectName: string,
    regionName: string,
    clusterSelected: string,
    batchIdSelected: string,
    parameterObject: object,
    mainRSelected: string,
    additionalPythonFileSelected: string[],
    mainPythonSelected: string,
    queryFileSelected: string,

  ): Payload => {
    const payload: Payload = {};

    if (batchTypeSelected === 'spark') {
      payload.sparkBatch = {
        ...(mainJarSelected !== '' && { mainJarFileUri: mainJarSelected }),
        ...(mainClassSelected !== '' && { mainClass: mainClassSelected }),
        ...(ArchiveFilesSelected.length > 0 && {
          archiveUris: ArchiveFilesSelected
        }),
        ...(filesSelected.length > 0 && {
          fileUris: filesSelected
        }),
        ...(jarFilesSelected.length > 0 && { jarFileUris: jarFilesSelected }),
        ...(argumentsSelected.length > 0 && { args: argumentsSelected })
      };
    }
    if (batchTypeSelected === 'sparkR') {
      payload.sparkRBatch = {
        ...(mainRSelected !== '' && { mainRFileUri: mainRSelected }),
        ...(ArchiveFilesSelected.length > 0 && {
          archiveUris: ArchiveFilesSelected
        }),
        ...(filesSelected.length > 0 && {
          fileUris: filesSelected
        }),
        ...(argumentsSelected.length > 0 && { args: argumentsSelected })
      };
    }
    if (batchTypeSelected === 'pySpark') {
      payload.pysparkBatch = {
        ...(additionalPythonFileSelected.length > 0 && {
          pythonFileUris: additionalPythonFileSelected
        }),
        ...(mainPythonSelected !== '' && {
          mainPythonFileUri: mainPythonSelected
        }),
        ...(ArchiveFilesSelected.length > 0 && {
          archiveUris: ArchiveFilesSelected
        }),
        ...(filesSelected.length > 0 && {
          fileUris: filesSelected
        }),
        ...(jarFilesSelected.length > 0 && { jarFileUris: jarFilesSelected }),
        ...(argumentsSelected.length > 0 && { args: argumentsSelected })
      };
    }
    if (batchTypeSelected === 'sparkSql') {
      payload.sparkSqlBatch = {
        ...(queryFileSelected !== '' && { queryFileUri: queryFileSelected }),
        ...(parameterObject && { queryVariables: parameterObject }),
        ...(jarFilesSelected.length > 0 && { jarFileUris: jarFilesSelected }),
      };
    }

    payload.labels = labelObject;

    payload.name = `projects/${projectName}/locations/${regionName}/batches/${batchIdSelected}`;

    payload.runtimeConfig = {
      version: versionSelected,
      ...(containerImageSelected !== '' && {
        containerImage: containerImageSelected
      }),
      ...(propertyObject && { properties: propertyObject })
    } as RuntimeConfig;

    payload.environmentConfig = {
      executionConfig: {
        ...(serviceAccountSelected !== '' && {
          serviceAccount: serviceAccountSelected
        }),
        ...(keySelected !== '' &&
          selectedRadioValue === 'key' && {
          kmsKey: `projects/${projectName}/locations/${regionName}/keyRings/${keyRingSelected}/cryptoKeys/${keySelected}`
        }),
        ...(manualKeySelected !== '' &&
          selectedRadioValue === 'manually' && {
          kmsKey: manualKeySelected
        }),
        subnetworkUri: subNetworkSelected,
        // networkUri:networkSelected,
        ...(networkTagSelected.length > 0 && {
          networkTags: networkTagSelected
        })
      } as ExecutionConfig,
      peripheralsConfig: {
        ...(servicesSelected !== 'None' && {
          metastoreService: servicesSelected
        }),
        ...(clusterSelected !== '' && clusterSelected !== 'None' && {
          sparkHistoryServerConfig: {
            dataprocCluster: `projects/${projectName}/regions/${regionName}/clusters/${clusterSelected}`
          } as SparkHistoryServerConfig
        })
      }
    };

    return payload;
  };

  const handleSubmit = async () => {
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
      const parameterObject: { [key: string]: string } = {};
      parameterDetailUpdated.forEach((label: string) => {
        const labelSplit = label.split(':');
        const key = labelSplit[0];
        const value = labelSplit[1];
        parameterObject[key] = value;
      });
      const payload = createPayload(
        batchTypeSelected,
        mainJarSelected,
        mainClassSelected,
        propertyObject,
        ArchiveFilesSelected,
        filesSelected,
        jarFilesSelected,
        argumentsSelected,
        networkTagSelected,
        labelObject,
        projectName,
        regionName,
        clusterSelected,
        batchIdSelected,
        parameterObject,
        mainRSelected,
        additionalPythonFileSelected,
        mainPythonSelected,
        queryFileSelected
      );
      fetch(
        `${BASE_URL}/projects/${credentials.project_id}/locations/${credentials.region_id}/batches?batchId=${batchIdSelected}`,
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
            toast.error(`Batch ${batchIdSelected} created successfully`, toastifyCustomStyle);
          } else {
            const errorResponse = await response.json();
            setError({ isOpen: true, message: errorResponse.error.message });
          }
        })
        .catch((err: Error) => {
          console.error('Error submitting Batch', err);
          toast.error('Failed to submit the Batch', toastifyCustomStyle);
        });
    }
  };
  const generateRandomHex = () => {
    if (!generationCompleted) {
      const crypto = window.crypto || window.Crypto;
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      const hex = array[0].toString(16);
      const paddedHex = hex.padStart(6, '0');
      setHexNumber('batch-' + paddedHex);
      setBatchIdSelected('batch-' + paddedHex);
      setGenerationCompleted(true);
    }
  };

  const handleInputChange = (event: any) => {
    setHexNumber(event.target.value);
    event.target.value.length > 0
      ? setBatchIdValidation(false)
      : setBatchIdValidation(true);
    const newBatchId = event.target.value;
    setBatchIdSelected(newBatchId);
  };
  const handleBatchTypeSelected = (event: any, data: any) => {
    setBatchTypeSelected(data.value);
    setFilesSelected([]);
    setJarFilesSelected([]);
    setAdditionalPythonFileSelected([]);
    setArchiveFileSelected([]);
    setArgumentsSelected([]);
    setMainPythonSelected('');
    setMainRSelected('');
    setQueryFileSelected('');
    setMainClassSelected('');
  };

  const handleServiceSelected = (event: any, data: any) => {
    setServicesSelected(data.value);
  };
  const handleProjectIdChange = (event: any, data: any) => {
    regionListAPI(data.value);
    setProjectId(data.value);
  };
  const handleRegionChange = (event: any, data: any) => {
    setRegion(data.value);
    listMetaStoreAPI(data.value);
  };
  const handleNetworkChange = (event: any, data: any) => {
    setNetworkSelected(data.value);
    listSubNetworksAPI(data.value);
  };
  const handleSubNetworkChange = (event: any, data: any) => {
    setSubNetworkSelected(data.value);
  };
  const handleKeyRingChange = (event: any, data: any) => {
    setKeyRingSelected(data.value);
    listKeysAPI(data.value);
  };
  const handlekeyChange = (event: any, data: any) => {
    setKeySelected(data.value);
  };

  const handleClusterSelected = (event: any, data: any) => {
    setClusterSelected(data.value);
  };
  const handleManualKeySelected = (event: ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;
    const numericRegex =
      /^projects\/[^/]+\/locations\/[^/]+\/keyRings\/[^/]+\/cryptoKeys\/[^/]+$/;

    if (numericRegex.test(inputValue) || inputValue === '') {
      setManualValidation(true);
    } else {
      setManualValidation(false);
    }

    setManualKeySelected(inputValue);
  };

  return (
    <div>
      <div className="scroll-comp">
        <div className="cluster-details-header">
          <div
            className="back-arrow-icon"
            onClick={() => handleCreateBatchBackView()}
          >
            <iconLeftArrow.react tag="div" className="logo-alignment-style" />
          </div>
          <div className="cluster-details-title">Create batch</div>
        </div>
        <div className="submit-job-container">
          <form onSubmit={handleSubmit}>
            <div className="submit-job-label-header">Batch info</div>
            <div className="select-text-overlay">
              <label className="select-title-text" htmlFor="batch-id">
                Batch ID*
              </label>
              <Input
                className="create-batch-style "
                value={hexNumber}
                onChange={e => handleInputChange(e)}
                type="text"
              />
            </div>
            {batchIdValidation && (
              <div className="error-key-parent">
                <iconError.react tag="div" className="logo-alignment-style" />
                <div className="error-key-missing">ID is required</div>
              </div>
            )}
            <div className="select-text-overlay">
              <label className="select-title-text region-disable" htmlFor="region">
                Region*
              </label>
              <Select
                search
                className="project-region-select"
                value={regionName}
                type="text"
                disabled={true}
                options={[]}
                placeholder={regionName}
              />
            </div>
            <div className="submit-job-label-header">Container</div>
            <div className="select-text-overlay">
              <label className="select-title-text" htmlFor="batch-type">
                Batch type*
              </label>
              <Select
                search
                className="project-region-select"
                value={batchTypeSelected}
                type="text"
                options={batchTypeList}
                onChange={handleBatchTypeSelected}
              />
            </div>
            <div className="select-text-overlay">
              <label className="select-title-text" htmlFor="runtime-version">
                Runtime version*
              </label>
              <Input
                className="create-batch-style "
                value={versionSelected}
                onChange={e => setVersionSelected(e.target.value)}
                type="text"
              />
            </div>
            {batchTypeSelected === 'spark' && (
              <div>
                <div>
                  <div className="create-batch-radio">
                    <Radio
                      className="select-batch-radio-style"
                      value="mainClass"
                      checked={selectedRadio === 'mainClass'}
                      onChange={handleMainClassRadio}
                    />
                    <div className="create-batch-message">Main class</div>
                  </div>
                  <div className="create-batch-sub-message">
                    The fully qualified name of a class in a provided or
                    standard jar file, for example, com.example.wordcount.
                  </div>
                </div>
                {selectedRadio === 'mainClass' && (
                  <div className="create-batch-input">
                    <div className="select-text-overlay">
                      <label className="select-title-text" htmlFor="main-class">
                        Main class*
                      </label>
                      <Input
                        className="create-batch-style-mini"
                        value={mainClassSelected}
                        onChange={e => setMainClassSelected(e.target.value)}
                        type="text"
                      />
                    </div>

                    {selectedRadio === 'mainClass' &&
                      mainClassSelected === '' && (
                        <div className="error-key-parent">
                          <iconError.react
                            tag="div"
                            className="logo-alignment-style"
                          />
                          <div className="error-key-missing">
                            Main class is required
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </div>
            )}
            {batchTypeSelected === 'spark' && (
              <div>
                <div>
                  <div className="create-batch-radio">
                    <Radio
                      className="select-batch-radio-style"
                      value="mainJarURI"
                      checked={selectedRadio === 'mainJarURI'}
                      onChange={handleMainJarRadio}
                    />
                    <div className="create-batch-message">Main jar URI</div>
                  </div>
                  <div className="create-batch-sub-message">
                    A provided jar file to use the main class of that jar file.
                  </div>
                </div>
                {selectedRadio === 'mainJarURI' && (
                  <div className="create-batch-input">
                    <div className="select-text-overlay">
                      <label className="select-title-text" htmlFor="main-jar">
                        Main jar*
                      </label>
                      <Input
                        className="create-batch-style-mini"
                        value={mainJarSelected}
                        onChange={e =>
                          handleValidationFiles(
                            e.target.value,
                            setMainJarSelected,
                            setMainJarValidation
                          )
                        }
                        type="text"
                      />
                    </div>

                    {selectedRadio === 'mainJarURI' &&
                      mainJarSelected === '' && (
                        <div className="error-key-parent">
                          <iconError.react
                            tag="div"
                            className="logo-alignment-style"
                          />
                          <div className="error-key-missing">
                            Main jar is required
                          </div>
                        </div>
                      )}
                    {!mainJarValidation && (
                      <div className="error-key-parent">
                        <iconError.react
                          tag="div"
                          className="logo-alignment-style"
                        />
                        <div className="error-key-missing">
                          File must include a valid scheme prefix: 'file://',
                          'gs://', or 'hdfs://'
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {batchTypeSelected === 'sparkR' && (
              <>
                <div className="select-text-overlay">
                  <label className="select-title-text" htmlFor="main-r-file">
                    Main R file*
                  </label>
                  <Input
                    className="create-batch-style"
                    onChange={e =>
                      handleValidationFiles(
                        e.target.value,
                        setMainRSelected,
                        setMainRValidation
                      )
                    }
                    addOnBlur={true}
                    value={mainRSelected}
                  />
                </div>

                {!mainRValidation && (
                  <div className="error-key-parent">
                    <iconError.react
                      tag="div"
                      className="logo-alignment-style"
                    />
                    <div className="error-key-missing">
                      File must include a valid scheme prefix: 'file://',
                      'gs://', or 'hdfs://'
                    </div>
                  </div>
                )}
                {mainRValidation && (
                  <div className="submit-job-message">{QUERY_FILE_MESSAGE}</div>
                )}
              </>
            )}
            {batchTypeSelected === 'pySpark' && (
              <>
                <div className="select-text-overlay">
                  <label
                    className="select-title-text"
                    htmlFor="main-python-file"
                  >
                    Main python file*
                  </label>
                  <Input
                    //placeholder="Main R file*"
                    className="create-batch-style"
                    onChange={e =>
                      handleValidationFiles(
                        e.target.value,
                        setMainPythonSelected,
                        setMainPythonValidation
                      )
                    }
                    addOnBlur={true}
                    value={mainPythonSelected}
                  />
                </div>
                {!mainPythonValidation && (
                  <div className="error-key-parent">
                    <iconError.react
                      tag="div"
                      className="logo-alignment-style"
                    />
                    <div className="error-key-missing">
                      File must include a valid scheme prefix: 'file://',
                      'gs://', or 'hdfs://'
                    </div>
                  </div>
                )}
                {mainPythonValidation && (
                  <div className="submit-job-message">{QUERY_FILE_MESSAGE}</div>
                )}
              </>
            )}
            {batchTypeSelected === 'pySpark' && (
              <>
                <div className="select-text-overlay">
                  <label
                    className="select-title-text"
                    htmlFor="additional-python-files"
                  >
                    Additional python files
                  </label>
                  <TagsInput
                    className="select-job-style"
                    onChange={e =>
                      handleValidationFiles(
                        e,
                        setAdditionalPythonFileSelected,
                        setAdditionalPythonFileValidation
                      )
                    }
                    addOnBlur={true}
                    value={additionalPythonFileSelected}
                    inputProps={{ placeholder: '' }}
                  />
                </div>
                {!additionalPythonFileValidation && (
                  <div className="error-key-parent">
                    <iconError.react
                      tag="div"
                      className="logo-alignment-style"
                    />
                    <div className="error-key-missing">
                      All files must include a valid scheme prefix: 'file://',
                      'gs://', or 'hdfs://'
                    </div>
                  </div>
                )}
              </>
            )}
            {batchTypeSelected === 'sparkSql' && (
              <>
                <div className="select-text-overlay">
                  <label className="select-title-text" htmlFor="query-file">
                    Query file*
                  </label>
                  <Input
                    //placeholder="Main R file*"
                    className="create-batch-style"
                    onChange={e =>
                      handleValidationFiles(
                        e.target.value,
                        setQueryFileSelected,
                        setQueryFileValidation
                      )
                    }
                    addOnBlur={true}
                    value={queryFileSelected}
                  />
                </div>

                {!queryFileValidation && (
                  <div className="error-key-parent">
                    <iconError.react
                      tag="div"
                      className="logo-alignment-style"
                    />
                    <div className="error-key-missing">
                      File must include a valid scheme prefix: 'file://',
                      'gs://', or 'hdfs://'
                    </div>
                  </div>
                )}
                {queryFileValidation && (
                  <div className="create-messagelist">{QUERY_FILE_MESSAGE}</div>
                )}
              </>
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
                placeholder=""
              />
            </div>
            <div className="create-custom-messagelist">
              {CUSTOM_CONTAINER_MESSAGE}
              <div className="create-container-message">
                <div
                  className="create-batch-learn-more"
                  onClick={() => {
                    window.open(`${CONTAINER_REGISTERY}`, '_blank');
                  }}
                >
                  Container Registry
                </div>
                {'  or '}
                <div
                  className="create-batch-learn-more"
                  onClick={() => {
                    window.open(`${ARTIFACT_REGISTERY}`, '_blank');
                  }}
                >
                  Artifact Registry
                </div>
                {' . '}
                <div
                  className="submit-job-learn-more"
                  onClick={() => {
                    window.open(`${CUSTOM_CONTAINERS}`, '_blank');
                  }}
                >
                  Learn more
                </div>
              </div>
            </div>
            {
              batchTypeSelected !== 'sparkR' && (
                <>
                  <div className="select-text-overlay">
                    <label className="select-title-text" htmlFor="jar-files">
                      Jar files
                    </label>
                    <TagsInput
                      className="select-job-style"
                      onChange={e =>
                        handleValidationFiles(
                          e,
                          setJarFilesSelected,
                          setJarFileValidation
                        )
                      }
                      addOnBlur={true}
                      value={jarFilesSelected}
                      inputProps={{ placeholder: '' }}
                    />
                  </div>

                  {!jarFileValidation && (
                    <div className="error-key-parent">
                      <iconError.react
                        tag="div"
                        className="logo-alignment-style"
                      />
                      <div className="error-key-missing">
                        All files must include a valid scheme prefix: 'file://',
                        'gs://', or 'hdfs://'
                      </div>
                    </div>
                  )}
                  {jarFileValidation && (
                    <div className="create-messagelist">{JAR_FILE_MESSAGE}</div>
                  )}
                </>
              )
              //) )
            }
            {batchTypeSelected !== 'sparkSql' && (
              <>
                <div className="select-text-overlay">
                  <label className="select-title-text" htmlFor="files">
                    Files
                  </label>
                  <TagsInput
                    className="select-job-style"
                    onChange={e =>
                      handleValidationFiles(
                        e,
                        setFilesSelected,
                        setFileValidation
                      )
                    }
                    addOnBlur={true}
                    value={filesSelected}
                    inputProps={{ placeholder: '' }}
                  />
                </div>
                {!fileValidation && (
                  <div className="error-key-parent">
                    <iconError.react
                      tag="div"
                      className="logo-alignment-style"
                    />
                    <div className="error-key-missing">
                      All files must include a valid scheme prefix: 'file://',
                      'gs://', or 'hdfs://'
                    </div>
                  </div>
                )}
                {fileValidation && (
                  <div className="create-messagelist">{FILES_MESSAGE}</div>
                )}
              </>
            )}
            {batchTypeSelected !== 'sparkSql' && (
              <>
                <div className="select-text-overlay">
                  <label className="select-title-text" htmlFor="archive-files">
                    Archive files
                  </label>
                  <TagsInput
                    className="select-job-style"
                    onChange={e =>
                      handleValidationFiles(
                        e,
                        setArchiveFileSelected,
                        setArchieveFileValidation
                      )
                    }
                    addOnBlur={true}
                    value={ArchiveFilesSelected}
                    inputProps={{ placeholder: '' }}
                  />
                </div>
                {!archieveFileValidation && (
                  <div className="error-key-parent">
                    <iconError.react
                      tag="div"
                      className="logo-alignment-style"
                    />
                    <div className="error-key-missing">
                      All files must include a valid scheme prefix: 'file://',
                      'gs://', or 'hdfs://'
                    </div>
                  </div>
                )}
                {archieveFileValidation && (
                  <div className="create-messagelist">
                    {ARCHIVE_FILES_MESSAGE}
                  </div>
                )}
              </>
            )}
            {batchTypeSelected !== 'sparkSql' && (
              <>
                <div className="select-text-overlay">
                  <label className="select-title-text" htmlFor="arguments">
                    Arguments
                  </label>
                  <TagsInput
                    className="select-job-style"
                    onChange={e => setArgumentsSelected(e)}
                    addOnBlur={true}
                    value={argumentsSelected}
                    inputProps={{ placeholder: '' }}
                  />
                </div>
                <div className="create-messagelist">{ARGUMENTS_MESSAGE}</div>
              </>
            )}
            {batchTypeSelected === 'sparkSql' && (
              <>
                <div className="submit-job-label-header">Query parameters</div>
                <LabelProperties
                  labelDetail={parameterDetail}
                  setLabelDetail={setParameterDetail}
                  labelDetailUpdated={parameterDetailUpdated}
                  setLabelDetailUpdated={setParameterDetailUpdated}
                  buttonText="ADD PARAMETER"
                  keyValidation={keyValidation}
                  setKeyValidation={setKeyValidation}
                  valueValidation={valueValidation}
                  setValueValidation={setValueValidation}
                  duplicateKeyError={duplicateKeyError}
                  setDuplicateKeyError={setDuplicateKeyError}
                />
              </>
            )}
            <div className="submit-job-label-header">
              Execution Configuration
            </div>
            <div className="select-text-overlay">
              <label className="select-title-text" htmlFor="service-account">
                Service account
              </label>
              <Input
                className="create-batch-style "
                value={serviceAccountSelected}
                onChange={e => setServiceAccountSelected(e.target.value)}
                type="text"
                placeholder=""
              />
            </div>
            <div className="create-messagelist">
              If not provided, the default GCE service account will be used.
              <div
                className="create-batch-learn-more"
                onClick={() => {
                  window.open(`${SERVICE_ACCOUNT}`, '_blank');
                }}
              >
                Learn more
              </div>
            </div>
            <div className="submit-job-label-header">Network Configuration</div>
            <div className="runtime-message ">
              Establishes connectivity for the VM instances in this cluster.
            </div>
            <div className="runtime-message ">Networks in this project</div>
            <div>
              <div className="create-batch-network">
                <div className="select-text-overlay">
                  <label
                    className="select-title-text"
                    htmlFor="primary-network"
                  >
                    Primary network*
                  </label>
                  <Select
                    search
                    className="project-region-select"
                    value={networkSelected}
                    onChange={handleNetworkChange}
                    type="text"
                    options={networkList}
                  />
                </div>
                <div className="select-text-overlay subnetwork-style">
                  <label className="select-title-text" htmlFor="subnetwork">
                    subnetwork
                  </label>

                  <Select
                    search
                    className="project-region-select"
                    value={subNetworkSelected}
                    onChange={handleSubNetworkChange}
                    type="text"
                    options={subNetworkList}
                    placeholder={defaultValue}
                  />
                </div>
              </div>
            </div>
            <div className="select-text-overlay">
              <label className="select-title-text" htmlFor="network-tags">
                Network tags
              </label>
              <TagsInput
                className="select-job-style"
                onChange={e => setNetworkTagSelected(e)}
                addOnBlur={true}
                value={networkTagSelected}
                inputProps={{ placeholder: '' }}
              />
            </div>
            <div className="create-messagelist">
              {NETWORK_TAG_MESSAGE}
            </div>
            <div>
              <div className="submit-job-label-header">Encryption</div>
              <div>
                <div className="create-batch-radio">
                  <Radio
                    className="select-batch-radio-style"
                    value="googleManaged"
                    checked={selectedEncryptionRadio === 'googleManaged'}
                    onChange={() => setSelectedEncryptionRadio('googleManaged')}
                  />
                  <div className="create-batch-message">
                    Google-managed encryption key
                  </div>
                </div>
                <div className="create-batch-sub-message">
                  No configuration required
                </div>
              </div>
              <div>
                <div className="create-batch-radio">
                  <Radio
                    className="select-batch-radio-style"
                    value="googleManaged"
                    checked={selectedEncryptionRadio === 'customerManaged'}
                    onChange={() =>
                      setSelectedEncryptionRadio('customerManaged')
                    }
                  />
                  <div className="create-batch-message">
                    Customer-managed encryption key (CMEK)
                  </div>
                </div>
                <div className="create-batch-sub-message">
                  Manage via{' '}
                  <div
                    className="create-batch-learn-more"
                    onClick={() => {
                      window.open(`${SECURITY_KEY}`, '_blank');
                    }}
                  >
                    Google Cloud Key Management Service
                  </div>
                </div>
                {selectedEncryptionRadio === 'customerManaged' && (
                  <>
                    <div>
                      <div className="create-batch-encrypt">
                        <Radio
                          className="select-batch-encrypt-radio-style"
                          value="mainClass"
                          checked={selectedRadioValue === 'key'}
                          onChange={handlekeyRingRadio}
                        />
                        <div className="select-text-overlay">
                          <label
                            className="select-title-text"
                            htmlFor="key-rings"
                          >
                            Key rings
                          </label>

                          <Select
                            search
                            className="project-region-select"
                            value={keyRingSelected}
                            type="text"
                            disabled={selectedRadioValue === 'manually'}
                            onChange={handleKeyRingChange}
                            options={keyRinglist}
                          />
                        </div>
                        <div className="select-text-overlay subnetwork-style">
                          <label className="select-title-text" htmlFor="keys">
                            Keys
                          </label>

                          <Select
                            search
                            className="project-region-select"
                            value={keySelected}
                            disabled={selectedRadioValue === 'manually'}
                            onChange={handlekeyChange}
                            type="text"
                            options={keylist}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="manual-input">
                      <div className="encrypt">
                        <Radio
                          className="select-batch-encrypt-radio-style "
                          value="mainClass"
                          checked={selectedRadioValue === 'manually'}
                          onChange={handlekeyManuallyRadio}
                        />
                        <div className="select-text-overlay">
                          <label
                            className="select-title-text"
                            htmlFor="enter-key-manually"
                          >
                            Enter key manually
                          </label>
                          <Input
                            className="create-batch-style manual-key"
                            value={manualKeySelected}
                            type="text"
                            disabled={selectedRadioValue === 'key'}
                            onChange={handleManualKeySelected}
                          />
                        </div>
                      </div>
                      {!manualValidation && (
                        <div className="error-key-parent">
                          <iconError.react
                            tag="div"
                            className="logo-alignment-style"
                          />
                          <div className="error-key-missing">{KEY_MESSAGE}</div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="submit-job-label-header">
              Peripheral Configuration
            </div>
            <div className="create-batches-message">
              Configure Dataproc to use Dataproc Metastore as its Hive
              metastore.
              <div
                className="create-batch-learn-more"
                onClick={() => {
                  window.open(`${SELF_MANAGED_CLUSTER}`, '_blank');
                }}
              >
                Learn more
              </div>
            </div>
            <div className="create-messagelist">{METASTORE_MESSAGE}</div>
            <div className="select-text-overlay">
              <label className="select-title-text" htmlFor="meta-project">
                Metastore project
              </label>
              <Select
                search
                placeholder={projectId}
                className="project-region-select"
                value={projectId}
                onChange={handleProjectIdChange}
                options={projectList}
              />
            </div>
            <div className="select-text-overlay">
              <label className="select-title-text" htmlFor="meta-region">
                Metastore region
              </label>

              {isLoadingRegion ? (
                <div className='metastore-loader'>
                  <ClipLoader
                    loading={true}
                    size={25}
                    aria-label="Loading Spinner"
                    data-testid="loader"
                  />
                </div>
              )
                : (
                  <Select
                    search
                    placeholder={region}
                    className="project-region-select"
                    value={region}
                    onChange={handleRegionChange}
                    options={regionList}
                  />
                )}
            </div>
            <div className="select-text-overlay">
              <label className="select-title-text" htmlFor="meta-service">
                Metastore service
              </label>
              {isLoadingService ? (
                <div className='metastore-loader'>
                  <ClipLoader
                    loading={true}
                    size={25}
                    aria-label="Loading Spinner"
                    data-testid="loader"
                  />
                </div>
              ) : (
                <Select
                  search
                  className="project-region-select"
                  value={servicesSelected}
                  type="text"
                  options={servicesList}
                  onChange={handleServiceSelected}
                  placeholder={servicesSelected}
                />
              )}
            </div>
            <div className="submit-job-label-header">
              History server cluster
            </div>
            <div className="create-batches-message">
              Choose a history server cluster to store logs in.{' '}
            </div>
            <div className="select-text-overlay">
              <label
                className="select-title-text"
                htmlFor="history-server-cluster"
              >
                History server cluster
              </label>
              <Select
                className="project-region-select"
                search
                selection
                value={clusterSelected}
                onChange={handleClusterSelected}
                options={clustersList}
                placeholder=""
              />
            </div>

            <div className="submit-job-label-header">Properties</div>
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
            />
            <div className="submit-job-label-header">Labels</div>
            <LabelProperties
              labelDetail={labelDetail}
              setLabelDetail={setLabelDetail}
              labelDetailUpdated={labelDetailUpdated}
              setLabelDetailUpdated={setLabelDetailUpdated}
              buttonText="ADD LABEL"
              keyValidation={keyValidation}
              setKeyValidation={setKeyValidation}
              valueValidation={valueValidation}
              setValueValidation={setValueValidation}
              duplicateKeyError={duplicateKeyError}
              setDuplicateKeyError={setDuplicateKeyError}
            />
            <div className="job-button-style-parent">
              <div
                className={
                  isSubmitDisabled()
                    ? 'submit-button-disable-style'
                    : 'submit-button-style'
                }
                aria-label="submit Batch"
              >
                <div
                  onClick={() => {
                    if (!isSubmitDisabled()) {
                      handleSubmit();
                    }
                  }}
                >
                  SUBMIT
                </div>
              </div>
              <div
                className="job-cancel-button-style"
                aria-label="cancel Batch"
              >
                <div onClick={() => handleCreateBatchBackView()}>CANCEL</div>
              </div>
              {error.isOpen && (
                <ErrorPopup
                  onCancel={() => setError({ isOpen: false, message: '' })}
                  errorPopupOpen={error.isOpen}
                  DeleteMsg={error.message}
                />
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateBatch;
