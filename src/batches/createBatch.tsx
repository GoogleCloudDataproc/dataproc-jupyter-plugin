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

import React, { useEffect, useState } from 'react';
import { LabIcon } from '@jupyterlab/ui-components';
import LeftArrowIcon from '../../style/icons/left_arrow_icon.svg';
import 'semantic-ui-css/semantic.min.css';
import 'react-toastify/dist/ReactToastify.css';
import { Input, Radio, Select, Dropdown } from 'semantic-ui-react';
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  ARCHIVE_FILES_MESSAGE,
  ARGUMENTS_MESSAGE,
  ARTIFACT_REGISTERY,
  BASE_URL,
  BASE_URL_META,
  BASE_URL_NETWORKS,
  CONTAINER_REGISTERY,
  CUSTOM_CONTAINERS,
  CUSTOM_CONTAINER_MESSAGE,
  FILES_MESSAGE,
  JAR_FILE_MESSAGE,
  METASTORE_MESSAGE,
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
import { authApi } from '../utils/utils';
import { ClipLoader } from 'react-spinners';
import { toast } from 'react-toastify';
import ErrorPopup from '../utils/errorPopup';
import errorIcon from '../../style/icons/error_icon.svg';

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
  setCreateBatchView: (value: boolean) => void;
  regionName: string;
  projectName: string;
}
let jarFileUris: string[] = [];
let fileUris: string[] = [];
let archiveFileUris: string[] = [];
let argumentsUris: string[] = [];
let networkUris: string[] = [];
let key: string[] | (() => string[]) = [];
let value: string[] | (() => string[]) = [];
let pythonFileUris: string[] = [];

function CreateBatch({
  setCreateBatchView,
  regionName,
  projectName
}: ICreateBatchProps) {
  const [batchTypeList, setBatchTypeList] = useState([{}]);
  const [generationCompleted, setGenerationCompleted] = useState(false);
  const [hexNumber, setHexNumber] = useState('');
  const [batchIdSelected, setBatchIdSelected] = useState('');
  const [batchTypeSelected, setBatchTypeSelected] = useState('spark');
  const [versionSelected, setVersionSelected] = useState('2.1');
  const [selectedRadio, setSelectedRadio] = useState('mainClass');
  const [mainClassSelected, setMainClassSelected] = useState('');
  const [mainJarSelected, setMainJarSelected] = useState('');
  const [mainRSelected, setMainRSelected] = useState('');
  const [containerImageSelected, setContainerImageSelected] = useState('');
  const [jarFilesSelected, setJarFilesSelected] = useState([...jarFileUris]);
  const [filesSelected, setFilesSelected] = useState([...fileUris]);
  const [queryFileSelected, setQueryFileSelected] = useState('');
  const [ArchiveFilesSelected, setArchiveFileSelected] = useState([
    ...archiveFileUris
  ]);
  const [argumentsSelected, setArgumentsSelected] = useState([
    ...argumentsUris
  ]);
  const [serviceAccountSelected, setServiceAccountSelected] = useState('');
  const [networkTagSelected, setNetworkTagSelected] = useState([
    ...networkUris
  ]);
  const [propertyDetail, setPropertyDetail] = useState(['']);
  const [selectedEncryptionRadio, setSelectedEncryptionRadio] =
    useState('googleManaged');
  const [propertyDetailUpdated, setPropertyDetailUpdated] = useState(['']);
  const [keyValidation, setKeyValidation] = useState(-1);
  const [valueValidation, setvalueValidation] = useState(-1);
  const [duplicateKeyError, setDuplicateKeyError] = useState(-1);
  const [labelDetail, setLabelDetail] = useState(key);
  const [labelDetailUpdated, setLabelDetailUpdated] = useState(value);
  const [servicesList, setServicesList] = useState<
    Array<{ key: string; value: string; text: string }>
  >([]);
  const [servicesSelected, setServicesSelected] = useState('None');

  const [clusterSelected, setClusterSelected] = useState('');
  const [projectId, setProjectId] = useState('');
  const [region, setRegion] = useState('');
  const [projectList, setProjectList] = useState([{}]);
  const [regionList, setRegionList] = useState<
    { value: string; key: string; text: string }[]
  >([]);
  const [networkList, setNetworklist] = useState([{}]);
  const [subNetworkList, setSubNetworklist] = useState<{ key: string; value: string; text: string }[]>([]);
  const [isLoadingRegion, setIsLoadingRegion] = useState(false);
  const [networkSelected, setNetworkSelected] = useState('default');
  const [subNetworkSelected, setSubNetworkSelected] = useState('default');
  const [isLoadingService, setIsLoadingService] = useState(false);
  const [error, setError] = useState({ isOpen: false, message: '' });
  const [parameterDetail, setParameterDetail] = useState(['']);
  const [parameterDetailUpdated, setParameterDetailUpdated] = useState(['']);
  const [additionalPythonFileSelected, setAdditionalPythonFileSelected] =
    useState([...pythonFileUris]);
  const [mainPythonSelected, setMainPythonSelected] = useState('');
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
  const [defaultValue, setDefaultValue] = useState('default');

  const handleCreateBatchBackView = () => {
    setCreateBatchView(false);
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
  }, [clusterSelected,defaultValue]);

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
    duplicateKeyError
  ]);

  function isSubmitDisabled() {
    const commonConditions = batchIdSelected === '' || regionName === '';

    switch (batchTypeSelected) {
      case 'spark':
        return (
          commonConditions ||
          (selectedRadio === 'mainClass' && mainClassSelected === '') ||
          (selectedRadio === 'mainJarURI' && mainJarSelected === '') ||
          !mainJarValidation ||
          !fileValidation ||
          !archieveFileValidation
        );
      case 'sparkR':
        return (
          commonConditions ||
          mainRSelected === '' ||
          !mainRValidation ||
          !fileValidation ||
          !archieveFileValidation
        );
      case 'pySpark':
        return (
          commonConditions ||
          mainPythonSelected === '' ||
          !mainPythonValidation ||
          !additionalPythonFileValidation ||
          !fileValidation ||
          !archieveFileValidation
        );
      case 'sparkSql':
        return (
          commonConditions ||
          queryFileSelected === '' ||
          !queryFileValidation ||
          !jarFileValidation
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
            .then((responseResult:  {subnetworks: string[]}) => {
              let transformedSubNetworkList = [];
              /*
         Extracting  subnetworks from Network
         Example: "https://www.googleapis.com/compute/v1/projects/{projectName}/global/networks/subnetwork",
      */

              transformedSubNetworkList = responseResult.subnetworks.map(
                (data: string) => {
                  return {
                    subnetworks: data.split(`${credentials.region_id}/subnetworks/`)[1]
                  };
                }
              );
              const keyLabelStructureSubNetwork = transformedSubNetworkList
                .filter(
                  (obj: SubnetworkData) => obj.subnetworks !== undefined
                )
                .map((obj: SubnetworkData) => ({
                  key: obj.subnetworks,
                  value: obj.subnetworks,
                  text: obj.subnetworks
                }));
              setSubNetworklist(keyLabelStructureSubNetwork);
              setDefaultValue(keyLabelStructureSubNetwork[0].value);
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
    queryFileSelected: string
  ): Payload => {
    const payload: Payload = {};

    if (batchTypeSelected === 'spark') {
      payload.sparkBatch = {
        ...(mainJarSelected !== '' && { mainJarFileUri: mainJarSelected }),
        ...(mainClassSelected !== '' && { mainClass: mainClassSelected })
      };
    }
    if (batchTypeSelected === 'sparkR') {
      payload.sparkRBatch = {
        ...(mainRSelected !== '' && { mainRFileUri: mainRSelected })
      };
    }
    if (batchTypeSelected === 'pySpark') {
      payload.pysparkBatch = {
        ...(additionalPythonFileSelected.length > 0 && {
          pythonFileUris: additionalPythonFileSelected
        }),
        ...(mainPythonSelected !== '' && {
          mainPythonFileUri: mainPythonSelected
        })
      };
    }
    if (batchTypeSelected === 'sparkSql') {
      payload.sparkSqlBatch = {
        ...(queryFileSelected !== '' && { queryFileUri: queryFileSelected }),
        ...(parameterObject && { queryVariables: { query: parameterObject } })
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
        subnetworkUri: networkSelected,
        ...(networkTagSelected.length > 0 && {
          networkTags: networkTagSelected
        })
      } as ExecutionConfig
    };

    if (servicesSelected !== 'None' || clusterSelected !== '') {
      payload.peripheralsConfig = {
        ...(servicesSelected !== 'None' && {
          metastoreService: servicesSelected
        }),
        ...(clusterSelected !== '' && {
          sparkHistoryServerConfig: {
            dataprocCluster: `projects/${projectName}/locations/${regionName}/clusters/${clusterSelected}`
          } as SparkHistoryServerConfig
        })
      };
    }

    payload.archiveUris =
      ArchiveFilesSelected.length > 0 ? ArchiveFilesSelected : undefined;
    payload.fileUris = filesSelected.length > 0 ? filesSelected : undefined;
    payload.jarFileUris =
      jarFilesSelected.length > 0 ? jarFilesSelected : undefined;
    payload.args = argumentsSelected.length > 0 ? argumentsSelected : undefined;

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
            setCreateBatchView(false);
          } else {
            const errorResponse = await response.json();
            console.log(errorResponse);
            setError({ isOpen: true, message: errorResponse.error.message });
          }
        })
        .catch((err: Error) => {
          console.error('Error submitting Batch', err);
          toast.error('Failed to submit the Batch');
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
    //setSubNetworkSelected(data.value);
    listSubNetworksAPI(data.value);
  };
  const handleSubNetworkChange = (event: any, data: any) => {
    setSubNetworkSelected(data.value);
  };

  const handleClusterSelected = (event: any, data: any) => {
    setClusterSelected(data.value);
  };

  return (
    <div>
      <div className="scroll-comp">
        <div className="cluster-details-header">
          <div
            className="back-arrow-icon"
            onClick={() => handleCreateBatchBackView()}
          >
            <iconLeftArrow.react tag="div" />
          </div>
          <div className="cluster-details-title">Create batch</div>
        </div>
        <div className="submit-job-container">
          <form onSubmit={handleSubmit}>
            <div className="submit-job-label-header">Batch info</div>
            <div className="create-batches-message">Batch ID*</div>
            <Input
              className="create-batch-style "
              value={hexNumber}
              onChange={e => handleInputChange(e)}
              type="text"
            />
            {batchIdValidation && (
              <div className="error-key-parent">
                <iconError.react tag="div" />
                <div className="error-key-missing">ID is required</div>
              </div>
            )}
            <div className="create-batches-message">Region*</div>
            <Select
              className="select-job-style"
              value={regionName}
              type="text"
              disabled={true}
              options={[]}
              placeholder={regionName}
            />
            <div className="submit-job-label-header">Container</div>
            <div className="create-batches-message">Batch type*</div>
            <Select
              className="select-job-style"
              value={batchTypeSelected}
              type="text"
              options={batchTypeList}
              onChange={handleBatchTypeSelected}
            />
            <div className="create-batches-message">Runtime version*</div>

            <Input
              className="create-batch-style "
              value={versionSelected}
              onChange={e => setVersionSelected(e.target.value)}
              type="text"
            />
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
                    <div className="create-batch-message">Main class*</div>
                    <Input
                      className="create-batch-style "
                      value={mainClassSelected}
                      onChange={e => setMainClassSelected(e.target.value)}
                      type="text"
                    />
                    {selectedRadio === 'mainClass' &&
                      mainClassSelected === '' && (
                        <div className="error-key-parent">
                          <iconError.react tag="div" />
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
                    <div className="create-batch-message">Main jar*</div>
                    <Input
                      className="create-batch-style "
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
                    {selectedRadio === 'mainJarURI' &&
                      mainJarSelected === '' && (
                        <div className="error-key-parent">
                          <iconError.react tag="div" />
                          <div className="error-key-missing">
                            Main jar is required
                          </div>
                        </div>
                      )}
                    {!mainJarValidation && (
                      <div className="error-key-parent">
                        <iconError.react tag="div" />
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
                <div className="create-batch-message">Main R file*</div>
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
                {!mainRValidation && (
                  <div className="error-key-parent">
                    <iconError.react tag="div" />
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
                <div className="create-batch-message">Main python file*</div>
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
                {!mainPythonValidation && (
                  <div className="error-key-parent">
                    <iconError.react tag="div" />
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
                <div className="create-batches-message">
                  Additional python files
                </div>
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
                {!additionalPythonFileValidation && (
                  <div className="error-key-parent">
                    <iconError.react tag="div" />
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
                <div className="create-batch-message">Query file*</div>
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
                {!queryFileValidation && (
                  <div className="error-key-parent">
                    <iconError.react tag="div" />
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
            <div className="create-batches-message">Custom container image</div>
            <Input
              className="create-batch-style "
              value={containerImageSelected}
              onChange={e => setContainerImageSelected(e.target.value)}
              type="text"
              placeholder=""
            />
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
                {' or '}
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
            {batchTypeSelected === 'spark' ||
              (batchTypeSelected === 'sparkSql' && (
                <>
                  <div className="create-batches-message">Jar files</div>
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
                  {!jarFileValidation && (
                    <div className="error-key-parent">
                      <iconError.react tag="div" />
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
              ))}
            {batchTypeSelected !== 'sparkSql' && (
              <>
                <div className="create-batches-message">Files</div>
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
                {!fileValidation && (
                  <div className="error-key-parent">
                    <iconError.react tag="div" />
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
                <div className="create-batches-message">Archive files</div>
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
                {!archieveFileValidation && (
                  <div className="error-key-parent">
                    <iconError.react tag="div" />
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
                <div className="create-batches-message">Arguments</div>
                <TagsInput
                  className="select-job-style"
                  onChange={e => setArgumentsSelected(e)}
                  addOnBlur={true}
                  value={argumentsSelected}
                  inputProps={{ placeholder: '' }}
                />
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
                  setvalueValidation={setvalueValidation}
                  duplicateKeyError={duplicateKeyError}
                  setDuplicateKeyError={setDuplicateKeyError}
                />
              </>
            )}
            <div className="submit-job-label-header">
              Execution Configuration
            </div>
            <div className="create-batches-message">Service account</div>
            <Input
              className="create-batch-style "
              value={serviceAccountSelected}
              onChange={e => setServiceAccountSelected(e.target.value)}
              type="text"
              placeholder=""
            />
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
            <div className="create-batches-message">
              Establishes connectivity for the VM instances in this cluster.
            </div>
            <div className="create-batches-message">
              Networks in this project
            </div>
            <div className="create-batch-network">
              <div className="create-batch-network-message">
                Primary network*
              </div>
              <div className="create-batch-network-message">Subnetwork</div>
            </div>
            <div>
              <div className="create-batch-network">
                <Select
                  className="select-primary-network-style"
                  value={networkSelected}
                  onChange={handleNetworkChange}
                  type="text"
                  options={networkList}
                />

                <Select
                  className="select-sub-network-style"
                  value={subNetworkSelected}
                  onChange={handleSubNetworkChange}
                  type="text"
                  options={subNetworkList}
                  placeholder={defaultValue}
                />
              </div>
            </div>
            <div className="create-batches-message">Network tags*</div>
            <TagsInput
              className="select-job-style"
              onChange={e => setNetworkTagSelected(e)}
              addOnBlur={true}
              value={networkTagSelected}
              inputProps={{ placeholder: '' }}
            />
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
                  <div className="create-batch-input">
                    <Dropdown
                      className="select-job-style"
                      search
                      selection
                      value={clusterSelected}
                      onChange={handleClusterSelected}
                      options={clustersList}
                      placeholder="Search..."
                    />
                  </div>
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
            <div className="create-batches-message">Metastore project</div>
            <Select
              placeholder={projectId}
              className="select-job-style"
              value={projectId}
              onChange={handleProjectIdChange}
              options={projectList}
            />
            <div className="create-batches-message">Metastore region</div>
            {isLoadingRegion ? (
              <ClipLoader
                loading={true}
                size={25}
                aria-label="Loading Spinner"
                data-testid="loader"
              />
            ) : (
              <Select
                placeholder={region}
                className="select-job-style"
                value={region}
                onChange={handleRegionChange}
                options={regionList}
              />
            )}

            <div className="create-batches-message">Metastore service</div>
            {isLoadingService ? (
              <ClipLoader
                loading={true}
                size={25}
                aria-label="Loading Spinner"
                data-testid="loader"
              />
            ) : (
              <Select
                className="select-job-style"
                value={servicesSelected}
                type="text"
                options={servicesList}
                onChange={handleServiceSelected}
                placeholder="None"
              />
            )}

            <div className="submit-job-label-header">
              History server cluster
            </div>
            <div className="create-batches-message">
              Choose a history server cluster to store logs in.{' '}
            </div>
            <div className="create-batches-message">History server cluster</div>

            <Dropdown
              className="select-job-style"
              search
              selection
              value={clusterSelected}
              onChange={handleClusterSelected}
              options={clustersList}
              placeholder="Search..."
            />
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
              setvalueValidation={setvalueValidation}
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
              setvalueValidation={setvalueValidation}
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
