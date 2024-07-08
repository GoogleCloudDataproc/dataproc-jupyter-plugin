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
import 'react-toastify/dist/ReactToastify.css';
import {
  ARCHIVE_FILES_MESSAGE,
  ARGUMENTS_MESSAGE,
  ARTIFACT_REGISTERY,
  CONTAINER_REGISTERY,
  CUSTOM_CONTAINERS,
  CUSTOM_CONTAINER_MESSAGE,
  CUSTOM_CONTAINER_MESSAGE_PART,
  FILES_MESSAGE,
  JAR_FILE_MESSAGE,
  KEY_MESSAGE,
  METASTORE_MESSAGE,
  NETWORK_TAG_MESSAGE,
  QUERY_FILE_MESSAGE,
  SECURITY_KEY,
  SELF_MANAGED_CLUSTER,
  SERVICE_ACCOUNT,
  SHARED_VPC
} from '../utils/const';
import LabelProperties from '../jobs/labelProperties';
import { authApi } from '../utils/utils';
import ErrorPopup from '../utils/errorPopup';
import errorIcon from '../../style/icons/error_icon.svg';
import { Input } from '../controls/MuiWrappedInput';
import {
  Autocomplete,
  CircularProgress,
  Radio,
  TextField
} from '@mui/material';
import { DropdownProps } from 'semantic-ui-react';
import { DynamicDropdown } from '../controls/DynamicDropdown';
import { projectListAPI } from '../utils/projectService';
import { BatchService } from './batchService';
import { MuiChipsInput } from 'mui-chips-input';

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

function batchTypeFunction(batchKey: string) {
  let batchType = 'Spark';
  switch (batchKey) {
    case 'sparkRBatch':
      batchType = 'SparkR';
      return batchType;
    case 'pysparkBatch':
      batchType = 'PySpark';
      return batchType;
    case 'sparkSqlBatch':
      batchType = 'SparkSql';
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
  let batchType = 'Spark';
  let mainClass = '';
  let mainJarFileUri = '';
  let mainRFileUri = '';
  let mainPythonFileUri = '';
  let queryFileUri = '';
  let serviceAccount = '';
  let subNetwork = '';
  let network = '';
  let historyServer = '';
  let historyServerValue = '';
  let metastoreService = '';
  let metaProject = '';
  let containerImage = '';
  let jarFileUris: string[] = [];
  let fileUris: string[] = [];
  let archiveFileUris: string[] = [];
  let argumentsUris: string[] = [];
  let networkUris: string[] | '' = [];
  let key: string[] | (() => string[]) = [];
  let value: string[] | (() => string[]) = [];
  let pythonFileUris: string[] = [];
  let keyType = '';
  let keyRing = '';
  let keys = '';
  if (batchInfoResponse !== undefined) {
    if (Object.keys(batchInfoResponse).length !== 0) {
      for (const key in batchInfoResponse) {
        if (batchInfoResponse.hasOwnProperty(key) && key.endsWith('Batch')) {
          batchKeys.push(key);
        }
      }
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
        jarFileUris = batchInfoResponse[batchKeys[0]].jarFileUris;
      }
      if (batchInfoResponse[batchTypeKey].hasOwnProperty('fileUris')) {
        fileUris = batchInfoResponse[batchKeys[0]].fileUris;
      }
      if (batchInfoResponse[batchTypeKey].hasOwnProperty('archiveUris')) {
        archiveFileUris = batchInfoResponse[batchKeys[0]].archiveUris;
      }
      if (batchInfoResponse[batchTypeKey].hasOwnProperty('args')) {
        argumentsUris = batchInfoResponse[batchKeys[0]].args;
      }
      if (batchInfoResponse[batchTypeKey].hasOwnProperty('pythonFileUris')) {
        pythonFileUris = batchInfoResponse[batchKeys[0]].pythonFileUris;
      }
      serviceAccount =
        batchInfoResponse?.environmentConfig?.executionConfig?.serviceAccount ||
        '';
      networkUris =
        batchInfoResponse?.environmentConfig?.executionConfig?.networkTags ||
        '';
      subNetwork =
        batchInfoResponse?.environmentConfig?.executionConfig?.subnetworkUri ||
        '';

      keyType =
        batchInfoResponse?.environmentConfig?.executionConfig?.kmsKey || '';
      const keyringValues = keyType.split('/'); // splitting keyrings and key form projects/projectName/locations/regionName/keyRings/keyRing/cryptoKeys/key
      keyRing = keyringValues[5] ? keyringValues[5] : '';
      keys = keyringValues[7] ? keyringValues[7] : '';
      historyServerValue =
        batchInfoResponse?.environmentConfig?.peripheralsConfig
          ?.sparkHistoryServerConfig?.dataprocCluster || '';
      if (historyServerValue !== '') {
        const parts = historyServerValue.split('/'); //splitting to take cluster name from project/projectName/region/regionName/cluster/clusterName
        historyServer = parts[parts.length - 1];
      }
      metastoreService =
        batchInfoResponse?.environmentConfig?.peripheralsConfig
          ?.metastoreService || 'None';
      containerImage = batchInfoResponse?.runtimeConfig?.containerImage || '';
      if (metastoreService != 'None') {
        const metastoreDetails = metastoreService.split('/');
        metaProject = metastoreDetails[1];
      }
    }
  }

  const selectedRadioInitialValue = mainJarFileUri ? 'mainJarURI' : 'mainClass';
  const selectedKeyType = keyType ? 'customerManaged' : 'googleManaged';
  const [batchTypeList, setBatchTypeList] = useState([{}]);
  const [generationCompleted, setGenerationCompleted] = useState(false);
  const [hexNumber, setHexNumber] = useState('');
  const [batchIdSelected, setBatchIdSelected] = useState('');
  const [batchTypeSelected, setBatchTypeSelected] = useState(batchType);
  const [versionSelected, setVersionSelected] = useState('2.2');
  const [selectedRadio, setSelectedRadio] = useState(selectedRadioInitialValue);
  const [mainClassSelected, setMainClassSelected] = useState(mainClass);
  const [mainClassUpdated, setMainClassUpdated] = useState(false);
  const [mainJarSelected, setMainJarSelected] = useState(mainJarFileUri);
  const [mainJarUpdated, setMainJarUpdated] = useState(false);

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
    useState(selectedKeyType);
  const [propertyDetailUpdated, setPropertyDetailUpdated] = useState(['']);
  const [keyValidation, setKeyValidation] = useState(-1);
  const [valueValidation, setValueValidation] = useState(-1);
  const [duplicateKeyError, setDuplicateKeyError] = useState(-1);
  const [labelDetail, setLabelDetail] = useState(key);
  const [labelDetailUpdated, setLabelDetailUpdated] = useState(value);
  const [servicesList, setServicesList] = useState<string[]>([]);
  const [servicesSelected, setServicesSelected] = useState(metastoreService);

  const [clusterSelected, setClusterSelected] = useState(historyServer);
  const [projectId, setProjectId] = useState(metaProject);
  const [networkList, setNetworklist] = useState([{}]);
  const [keyRinglist, setKeyRinglist] = useState<string[]>([]);
  const [subNetworkList, setSubNetworklist] = useState<string[]>([]);
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
  const [clustersList, setClustersList] = useState<string[]>([]);
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
  const [keyRingSelected, setKeyRingSelected] = useState(keyRing);
  const [keySelected, setKeySelected] = useState(keys);
  const [manualKeySelected, setManualKeySelected] = useState('');
  const [manualValidation, setManualValidation] = useState(true);
  const [
    additionalPythonFileDuplicateValidation,
    setAdditionalPythonFileDuplicateValidation
  ] = useState(false);
  const [jarFileDuplicateValidation, setJarFileDuplicateValidation] =
    useState(false);
  const [fileDuplicateValidation, setFileDuplicateValidation] = useState(false);
  const [archiveDuplicateValidation, setArchiveDuplicateValidation] =
    useState(false);
  const [argumentsDuplicateValidation, setArgumentsDuplicateValidation] =
    useState(false);
  const [networkTagsDuplicateValidation, setNetworkTagsDuplicateValidation] =
    useState(false);
  const [keylist, setKeylist] = useState<string[]>([]);
  const [isloadingNetwork, setIsloadingNetwork] = useState(false);
  const [selectedNetworkRadio, setSelectedNetworkRadio] = useState<
    'sharedVpc' | 'projectNetwork'
  >('projectNetwork');
  const [sharedSubNetworkList, setSharedSubNetworkList] = useState<string[]>(
    []
  );
  const [sharedvpcSelected, setSharedvpcSelected] = useState('');
  const [projectInfo, setProjectInfo] = useState('');
  const handleCreateBatchBackView = () => {
    if (setCreateBatchView) {
      setCreateBatchView(false);
    }
    if (setCreateBatch) {
      setCreateBatch(false);
    }
  };

  const handlekeyRingRadio = () => {
    setSelectedRadioValue('key');
    setManualKeySelected('');
    setManualValidation(true);
  };

  const handleGoogleManagedRadio = () => {
    setSelectedEncryptionRadio('googleManaged');
    setKeyRingSelected('');
    setKeySelected('');
    setManualKeySelected('');
  };
  const handlekeyManuallyRadio = () => {
    setSelectedRadioValue('manually');
    setKeyRingSelected('');
    setKeySelected('');
  };
  useEffect(() => {
    if (keyRingSelected !== '') {
      listKeysAPI(keyRingSelected);
    }
  }, [keyRingSelected]);

  useEffect(() => {
    if (
      batchInfoResponse === undefined ||
      batchInfoResponse?.environmentConfig?.executionConfig?.subnetworkUri
    ) {
      if (networkSelected !== '') {
        listSubNetworksAPI(networkSelected);
      }
    } else {
      listSubNetworksAPI(networkSelected);
    }
  }, [networkSelected]);
  useEffect(() => {
    const batchTypeData = ['Spark', 'SparkR', 'SparkSql', 'PySpark'];
    setBatchTypeList(batchTypeData);

    listClustersAPI();
    listNetworksAPI();
    listKeyRingsAPI();
    runtimeSharedProject();
  }, [clusterSelected]);

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
    manualValidation,
    mainJarSelected,
    jarFilesSelected,
    keyRingSelected,
    keySelected,
    manualKeySelected
  ]);
  useEffect(() => {
    let batchKeys: string[] = [];

    if (batchInfoResponse) {
      const { environmentConfig } = batchInfoResponse;
      if (environmentConfig) {
        const executionConfig = environmentConfig.executionConfig;

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
        }
      }

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
          for (const key in batchInfoResponse) {
            if (
              batchInfoResponse.hasOwnProperty(key) &&
              key.endsWith('Batch')
            ) {
              batchKeys.push(key);
            }
          }

          if (batchInfoResponse.runtimeConfig.hasOwnProperty('properties')) {
            const updatedPropertyDetail = Object.entries(
              batchInfoResponse.runtimeConfig.properties
            ).map(([k, v]) => `${k.substring(6)}:${v}`); // spark:spark.app.name , spark:spark.driver.cores - every property is appended with 'spark:' therefore getting the porperty key value after 'spark:'
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

  const runtimeSharedProject = async () => {
    await BatchService.runtimeSharedProjectService(
      setProjectInfo,
      setSharedSubNetworkList
    );
  };

  const handleMainClassRadio = () => {
    setSelectedRadio('mainClass');
    setMainJarSelected('');
    setMainClassSelected('');
    setMainJarValidation(true);
  };

  const handleMainJarRadio = () => {
    setSelectedRadio('mainJarURI');
    setMainClassSelected('');
    setMainJarSelected('');
    setMainJarValidation(true);
  };

  const listNetworksFromSubNetworkAPI = async (subNetwork: string) => {
    await BatchService.listNetworksFromSubNetworkAPIService(
      subNetwork,
      setIsloadingNetwork,
      setNetworkSelected
    );
  };

  function isSubmitDisabled() {
    const commonConditions =
      batchIdSelected === '' ||
      regionName === '' ||
      batchIdValidation ||
      (selectedNetworkRadio === 'sharedVpc' &&
        sharedSubNetworkList.length === 0) ||
      (selectedNetworkRadio === 'sharedVpc' && sharedvpcSelected === '') ||
      (selectedEncryptionRadio === 'customerManaged' &&
        selectedRadioValue === 'key' &&
        keyRingSelected === '' &&
        keySelected === '') ||
      (selectedEncryptionRadio === 'customerManaged' &&
        selectedRadioValue === 'manually' &&
        manualKeySelected === '') ||
      (selectedNetworkRadio === 'projectNetwork' &&
        networkList.length !== 0 &&
        subNetworkList.length === 0);
    switch (batchTypeSelected) {
      case 'Spark':
        return (
          commonConditions ||
          (selectedRadio === 'mainClass' && mainClassSelected === '') ||
          (selectedRadio === 'mainJarURI' && mainJarSelected === '') ||
          !mainJarValidation ||
          !fileValidation ||
          !archieveFileValidation ||
          !manualValidation ||
          !jarFileValidation ||
          fileDuplicateValidation ||
          archiveDuplicateValidation ||
          argumentsDuplicateValidation ||
          networkTagsDuplicateValidation ||
          jarFileDuplicateValidation
        );
      case 'SparkR':
        return (
          commonConditions ||
          mainRSelected === '' ||
          !mainRValidation ||
          !fileValidation ||
          !archieveFileValidation ||
          !manualValidation ||
          fileDuplicateValidation ||
          archiveDuplicateValidation ||
          argumentsDuplicateValidation ||
          networkTagsDuplicateValidation
        );
      case 'PySpark':
        return (
          commonConditions ||
          mainPythonSelected === '' ||
          !mainPythonValidation ||
          !additionalPythonFileValidation ||
          !fileValidation ||
          !archieveFileValidation ||
          !manualValidation ||
          !jarFileValidation ||
          additionalPythonFileDuplicateValidation ||
          fileDuplicateValidation ||
          archiveDuplicateValidation ||
          argumentsDuplicateValidation ||
          networkTagsDuplicateValidation ||
          jarFileDuplicateValidation
        );
      case 'SparkSql':
        return (
          commonConditions ||
          queryFileSelected === '' ||
          !queryFileValidation ||
          !jarFileValidation ||
          !manualValidation ||
          networkTagsDuplicateValidation ||
          jarFileDuplicateValidation
        );
      default:
        return false;
    }
  }

  const handleValidationFiles = (
    listOfFiles: string | string[],
    setValuesPart: any,
    setValidationPart: (value: boolean) => void,
    setDuplicateValidation?: (value: boolean) => void
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
        listOfFiles.forEach((fileName: string) => {
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
      handleDuplicateValidation(setDuplicateValidation, listOfFiles);
      setValuesPart(listOfFiles);
    }
  };
  const handleDuplicateValidation = (
    setDuplicateValidation: ((value: boolean) => void) | undefined,
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
        setDuplicateValidation!(true);
      } else {
        setDuplicateValidation!(false);
      }
    }
  };
  const handleArguments = (
    setDuplicateValidation: (value: boolean) => void,
    listOfFiles: string[]
  ) => {
    setArgumentsSelected(listOfFiles);
    handleDuplicateValidation(setDuplicateValidation, listOfFiles);
  };
  const handleNetworkTags = (
    setDuplicateValidation: (value: boolean) => void,
    listOfFiles: string[]
  ) => {
    setNetworkTagSelected(listOfFiles);
    handleDuplicateValidation(setDuplicateValidation, listOfFiles);
  };

  const listClustersAPI = async () => {
    await BatchService.listClustersAPIService(setClustersList);
  };
  const listNetworksAPI = async () => {
    await BatchService.listNetworksAPIService(
      setNetworklist,
      setNetworkSelected,
      batchInfoResponse,
      setIsloadingNetwork
    );
  };

  const listKeyRingsAPI = async () => {
    await BatchService.listKeyRingsAPIService(setKeyRinglist);
  };

  const listKeysAPI = async (keyRing: string) => {
    await BatchService.listKeysAPIService(keyRing, setKeylist, setKeySelected);
  };

  const listSubNetworksAPI = async (subnetwork: string) => {
    await BatchService.listSubNetworksAPIService(
      subnetwork,
      setSubNetworklist,
      setSubNetworkSelected,
      batchInfoResponse,
      setIsloadingNetwork
    );
  };

  const regionListAPI = async (
    projectId: string,
    network: string | undefined
  ) => {
    await BatchService.regionListAPIService(
      projectId,
      network,
      setIsLoadingService,
      regionName,
      setServicesList
    );
  };

  const handleSharedSubNetwork = async (data: string | null) => {
    if (data !== null) {
      setSharedvpcSelected(data!.toString());
      await handleProjectIdChange(projectId, data!.toString());
    }
  };

  type Payload = {
    [key: string]: unknown;
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

    if (batchTypeSelected === 'Spark') {
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
    if (batchTypeSelected === 'SparkR') {
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
    if (batchTypeSelected === 'PySpark') {
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
    if (batchTypeSelected === 'SparkSql') {
      payload.sparkSqlBatch = {
        ...(queryFileSelected !== '' && { queryFileUri: queryFileSelected }),
        ...(parameterObject && { queryVariables: parameterObject }),
        ...(jarFilesSelected.length > 0 && { jarFileUris: jarFilesSelected })
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
        ...(sharedvpcSelected &&
          selectedNetworkRadio === 'sharedVpc' && {
            subnetworkUri: `projects/${projectInfo}/regions/${regionName}/subnetworks/${sharedvpcSelected}`
          }),
        ...(keySelected !== '' &&
          selectedRadioValue === 'key' &&
          keySelected !== undefined && {
            kmsKey: `projects/${projectName}/locations/${regionName}/keyRings/${keyRingSelected}/cryptoKeys/${keySelected}`
          }),
        ...(manualKeySelected !== '' &&
          selectedRadioValue === 'manually' && {
            kmsKey: manualKeySelected
          }),
        ...(subNetworkSelected &&
          selectedNetworkRadio === 'projectNetwork' && {
            subnetworkUri: subNetworkSelected
          }),
        ...(sharedvpcSelected &&
          selectedNetworkRadio === 'sharedVpc' && {
            subnetworkUri: `projects/${projectInfo}/regions/${regionName}/subnetworks/${sharedvpcSelected}`
          }),
        // networkUri:networkSelected,
        ...(networkTagSelected.length > 0 && {
          networkTags: networkTagSelected
        })
      } as ExecutionConfig,
      peripheralsConfig: {
        ...(servicesSelected !== 'None' && {
          metastoreService: servicesSelected
        }),
        ...(clusterSelected !== '' && {
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
        const value =
          labelSplit.length > 2
            ? labelSplit[1] + ':' + labelSplit[2]
            : labelSplit[1];
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
      await BatchService.creatBatchSubmitService(
        credentials,
        payload,
        batchIdSelected,
        setCreateBatchView,
        setCreateBatch,
        setError,
        error
      );
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

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setHexNumber(event.target.value);
    event.target.value.length > 0
      ? setBatchIdValidation(false)
      : setBatchIdValidation(true);
    const newBatchId = event.target.value;
    setBatchIdSelected(newBatchId);
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

  const handleBatchTypeSelected = (data: DropdownProps | null) => {
    if (data !== null) {
      setBatchTypeSelected(data!.toString());
    }
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

  const handleServiceSelected = (data: string | null) => {
    if (data !== null) {
      setServicesSelected(data!.toString());
    }
  };

  const handleProjectIdChange = (data: any, network: string | undefined) => {
    setProjectId(data ?? '');
    setServicesList([]);
    setServicesSelected('');
    regionListAPI(data, network);
  };
  const handleNetworkChange = async (data: DropdownProps | null) => {
    if (data !== null) {
      setNetworkSelected(data!.toString());
      await listSubNetworksAPI(data!.toString());
      await handleProjectIdChange(projectId, data!.toString());
    }
  };
  const handleSubNetworkChange = (data: string | null) => {
    if (data !== null) {
      setSubNetworkSelected(data!.toString());
    }
  };
  const handleKeyRingChange = (data: string | null) => {
    if (data !== null) {
      setKeyRingSelected(data!.toString());
      listKeysAPI(data!.toString());
    }
  };
  const handlekeyChange = (data: string | null) => {
    if (data !== null) {
      setKeySelected(data!.toString());
    }
  };
  const handleMainClassSelected = (value: string) => {
    setMainClassUpdated(true);
    setMainClassSelected(value);
  };
  const handleMainJarSelected = (value: string) => {
    setMainJarUpdated(true);
    handleValidationFiles(value, setMainJarSelected, setMainJarValidation);
  };

  const handleClusterSelected = (data: string | null) => {
    setClusterSelected(data ?? '');
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
      <div className="cluster-details-header">
        <div
          className="back-arrow-icon"
          onClick={() => handleCreateBatchBackView()}
        >
          <iconLeftArrow.react
            tag="div"
            className="icon-white logo-alignment-style"
          />
        </div>
        <div className="cluster-details-title">Create batch</div>
      </div>
      <div className="submit-job-container">
        <form onSubmit={handleSubmit}>
          <div className="submit-job-label-header">Batch info</div>
          <div className="select-text-overlay">
            <Input
              className="create-batch-style"
              value={hexNumber}
              onChange={e => handleInputChange(e)}
              type="text"
              Label="Batch ID*"
            />
          </div>
          {batchIdValidation && (
            <div className="error-key-parent">
              <iconError.react tag="div" className="logo-alignment-style" />
              <div className="error-key-missing">ID is required</div>
            </div>
          )}
          <div className="select-text-overlay">
            <Input
              className="create-batch-style region-disable"
              value={regionName}
              type="text"
              disabled={true}
              Label="Region*"
            />
          </div>
          <div className="submit-job-label-header">Container</div>
          <div className="select-text-overlay">
            <Autocomplete
              className="project-region-select"
              value={batchTypeSelected}
              options={batchTypeList}
              onChange={(_event, val) => handleBatchTypeSelected(val)}
              renderInput={params => (
                <TextField {...params} label=" Batch type*" />
              )}
            />
          </div>
          <div className="select-text-overlay">
            <Input
              className="create-batch-style "
              value={versionSelected}
              onChange={e => setVersionSelected(e.target.value)}
              type="text"
              Label="Runtime version*"
            />
          </div>
          {batchTypeSelected === 'Spark' && (
            <div>
              <div>
                <div className="create-batch-radio">
                  <Radio
                    size="small"
                    className="select-batch-radio-style"
                    value="mainClass"
                    checked={selectedRadio === 'mainClass'}
                    onChange={handleMainClassRadio}
                  />
                  <div className="create-batch-message">Main class</div>
                </div>
                <div className="create-batch-sub-message">
                  The fully qualified name of a class in a provided or standard
                  jar file, for example, com.example.wordcount.
                </div>
              </div>
              {selectedRadio === 'mainClass' && (
                <div className="create-batch-input">
                  <div className="select-text-overlay">
                    <Input
                      className="create-batch-style-mini"
                      value={mainClassSelected}
                      onChange={e => handleMainClassSelected(e.target.value)}
                      type="text"
                      Label="Main class*"
                    />
                  </div>

                  {selectedRadio === 'mainClass' &&
                    mainClassSelected === '' &&
                    mainClassUpdated && (
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
          {batchTypeSelected === 'Spark' && (
            <div>
              <div>
                <div className="create-batch-radio">
                  <Radio
                    size="small"
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
                    <Input
                      className="create-batch-style-mini"
                      value={mainJarSelected}
                      onChange={e => handleMainJarSelected(e.target.value)}
                      type="text"
                      Label="Main jar*"
                    />
                  </div>

                  {selectedRadio === 'mainJarURI' &&
                    mainJarSelected === '' &&
                    mainJarUpdated &&
                    mainJarValidation && (
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
                  {!mainJarValidation && mainJarSelected !== '' && (
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
          {batchTypeSelected === 'SparkR' && (
            <>
              <div className="select-text-overlay">
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
                  Label="Main R file*"
                />
              </div>

              {!mainRValidation && (
                <div className="error-key-parent">
                  <iconError.react tag="div" className="logo-alignment-style" />
                  <div className="error-key-missing">
                    File must include a valid scheme prefix: 'file://', 'gs://',
                    or 'hdfs://'
                  </div>
                </div>
              )}
              {mainRValidation && (
                <div className="submit-job-message-input">
                  {QUERY_FILE_MESSAGE}
                </div>
              )}
            </>
          )}
          {batchTypeSelected === 'PySpark' && (
            <>
              <div className="select-text-overlay">
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
                  Label=" Main python file*"
                />
              </div>
              {!mainPythonValidation && (
                <div className="error-key-parent">
                  <iconError.react tag="div" className="logo-alignment-style" />
                  <div className="error-key-missing">
                    File must include a valid scheme prefix: 'file://', 'gs://',
                    or 'hdfs://'
                  </div>
                </div>
              )}
              {mainPythonValidation && (
                <div className="submit-job-message-input">
                  {QUERY_FILE_MESSAGE}
                </div>
              )}
            </>
          )}
          {batchTypeSelected === 'PySpark' && (
            <>
              <div className="select-text-overlay">
                <MuiChipsInput
                  className="select-job-style"
                  onChange={e =>
                    handleValidationFiles(
                      e,
                      setAdditionalPythonFileSelected,
                      setAdditionalPythonFileValidation,
                      setAdditionalPythonFileDuplicateValidation
                    )
                  }
                  addOnBlur={true}
                  value={additionalPythonFileSelected}
                  inputProps={{ placeholder: '' }}
                  label="Additional python files"
                />
              </div>
              {!additionalPythonFileValidation && (
                <div className="error-key-parent">
                  <iconError.react tag="div" className="logo-alignment-style" />
                  <div className="error-key-missing">
                    All files must include a valid scheme prefix: 'file://',
                    'gs://', or 'hdfs://'
                  </div>
                </div>
              )}
              {additionalPythonFileDuplicateValidation && (
                <div className="error-key-parent">
                  <iconError.react tag="div" className="logo-alignment-style" />
                  <div className="error-key-missing">
                    Duplicate paths are not allowed
                  </div>
                </div>
              )}
            </>
          )}
          {batchTypeSelected === 'SparkSql' && (
            <>
              <div className="select-text-overlay">
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
                  Label="Query file*"
                />
              </div>

              {!queryFileValidation && (
                <div className="error-key-parent">
                  <iconError.react tag="div" className="logo-alignment-style" />
                  <div className="error-key-missing">
                    File must include a valid scheme prefix: 'file://', 'gs://',
                    or 'hdfs://'
                  </div>
                </div>
              )}
              {queryFileValidation && (
                <div className="create-messagelist">{QUERY_FILE_MESSAGE}</div>
              )}
            </>
          )}
          <div className="select-text-overlay">
            <Input
              className="create-batch-style "
              value={containerImageSelected}
              onChange={e => setContainerImageSelected(e.target.value)}
              type="text"
              placeholder="Enter URI, for example, gcr.io/my-project-id/my-image:1.0.1"
              Label="Custom container image"
            />
          </div>
          <div className="create-custom-messagelist">
            {CUSTOM_CONTAINER_MESSAGE}{' '}
          </div>{' '}
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
            &nbsp;
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
          {
            batchTypeSelected !== 'SparkR' && (
              <>
                <div className="select-text-overlay">
                  <MuiChipsInput
                    className="select-job-style"
                    onChange={e =>
                      handleValidationFiles(
                        e,
                        setJarFilesSelected,
                        setJarFileValidation,
                        setJarFileDuplicateValidation
                      )
                    }
                    addOnBlur={true}
                    value={jarFilesSelected}
                    inputProps={{ placeholder: '' }}
                    label="Jar files"
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
                {jarFileDuplicateValidation && (
                  <div className="error-key-parent">
                    <iconError.react
                      tag="div"
                      className="logo-alignment-style"
                    />
                    <div className="error-key-missing">
                      Duplicate paths are not allowed
                    </div>
                  </div>
                )}
                {jarFileValidation && !jarFileDuplicateValidation && (
                  <div className="create-messagelist">{JAR_FILE_MESSAGE}</div>
                )}
              </>
            )
            //) )
          }
          {batchTypeSelected !== 'SparkSql' && (
            <>
              <div className="select-text-overlay">
                <MuiChipsInput
                  className="select-job-style"
                  onChange={e =>
                    handleValidationFiles(
                      e,
                      setFilesSelected,
                      setFileValidation,
                      setFileDuplicateValidation
                    )
                  }
                  addOnBlur={true}
                  value={filesSelected}
                  inputProps={{ placeholder: '' }}
                  label="Files"
                />
              </div>
              {!fileValidation && (
                <div className="error-key-parent">
                  <iconError.react tag="div" className="logo-alignment-style" />
                  <div className="error-key-missing">
                    All files must include a valid scheme prefix: 'file://',
                    'gs://', or 'hdfs://'
                  </div>
                </div>
              )}
              {fileDuplicateValidation && (
                <div className="error-key-parent">
                  <iconError.react tag="div" className="logo-alignment-style" />
                  <div className="error-key-missing">
                    Duplicate paths are not allowed
                  </div>
                </div>
              )}
              {fileValidation && !fileDuplicateValidation && (
                <div className="create-messagelist">{FILES_MESSAGE}</div>
              )}
            </>
          )}
          {batchTypeSelected !== 'SparkSql' && (
            <>
              <div className="select-text-overlay">
                <MuiChipsInput
                  className="select-job-style"
                  onChange={e =>
                    handleValidationFiles(
                      e,
                      setArchiveFileSelected,
                      setArchieveFileValidation,
                      setArchiveDuplicateValidation
                    )
                  }
                  addOnBlur={true}
                  value={ArchiveFilesSelected}
                  inputProps={{ placeholder: '' }}
                  label="Archive files"
                />
              </div>
              {!archieveFileValidation && (
                <div className="error-key-parent">
                  <iconError.react tag="div" className="logo-alignment-style" />
                  <div className="error-key-missing">
                    All files must include a valid scheme prefix: 'file://',
                    'gs://', or 'hdfs://'
                  </div>
                </div>
              )}
              {archiveDuplicateValidation && (
                <div className="error-key-parent">
                  <iconError.react tag="div" className="logo-alignment-style" />
                  <div className="error-key-missing">
                    Duplicate paths are not allowed
                  </div>
                </div>
              )}
              {archieveFileValidation && !archiveDuplicateValidation && (
                <div className="create-messagelist">
                  {ARCHIVE_FILES_MESSAGE}
                </div>
              )}
            </>
          )}
          {batchTypeSelected !== 'SparkSql' && (
            <>
              <div className="select-text-overlay">
                <MuiChipsInput
                  className="select-job-style"
                  onChange={e =>
                    handleArguments(setArgumentsDuplicateValidation, e)
                  }
                  addOnBlur={true}
                  value={argumentsSelected}
                  inputProps={{ placeholder: '' }}
                  label="Arguments"
                />
              </div>
              {argumentsDuplicateValidation && (
                <div className="error-key-parent">
                  <iconError.react tag="div" className="logo-alignment-style" />
                  <div className="error-key-missing">
                    Duplicate paths are not allowed
                  </div>
                </div>
              )}
              {!argumentsDuplicateValidation && (
                <div className="create-messagelist">{ARGUMENTS_MESSAGE}</div>
              )}
            </>
          )}
          {batchTypeSelected === 'SparkSql' && (
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
          <div className="submit-job-label-header">Execution Configuration</div>
          <div className="select-text-overlay">
            <Input
              className="create-batch-style "
              value={serviceAccountSelected}
              onChange={e => setServiceAccountSelected(e.target.value)}
              type="text"
              placeholder=""
              Label="Service account"
            />
          </div>
          <div className="create-custom-messagelist">
            If not provided, the default GCE service account will be used.
            <div
              className="submit-job-learn-more"
              onClick={() => {
                window.open(`${SERVICE_ACCOUNT}`, '_blank');
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
                    <CircularProgress
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
                        onChange={(_event, val) => handleSubNetworkChange(val)}
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
                <div className="error-key-parent">
                  <iconError.react tag="div" className="logo-alignment-style" />
                  <div className="error-key-missing">
                    No local networks are available.
                  </div>
                </div>
              )}
            {!isloadingNetwork &&
              selectedNetworkRadio === 'projectNetwork' &&
              networkList.length !== 0 &&
              subNetworkList.length === 0 && (
                <div className="error-key-parent">
                  <iconError.react tag="div" className="logo-alignment-style" />
                  <div className="error-key-missing">
                    Please select a valid network and subnetwork.
                  </div>
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
                <div className="error-key-parent">
                  <iconError.react tag="div" className="logo-alignment-style" />
                  <div className="error-key-missing">
                    No shared subnetworks are available in this region.
                  </div>
                </div>
              )}
          </div>
          <div className="select-text-overlay">
            <MuiChipsInput
              className="select-job-style"
              onChange={e =>
                handleNetworkTags(setNetworkTagsDuplicateValidation, e)
              }
              addOnBlur={true}
              value={networkTagSelected}
              inputProps={{ placeholder: '' }}
              label="Network tags"
            />
          </div>
          {networkTagsDuplicateValidation && (
            <div className="error-key-parent">
              <iconError.react tag="div" className="logo-alignment-style" />
              <div className="error-key-missing">
                Duplicate paths are not allowed
              </div>
            </div>
          )}
          {!networkTagsDuplicateValidation && (
            <div className="create-messagelist">{NETWORK_TAG_MESSAGE}</div>
          )}
          <div>
            <div className="submit-job-label-header">Encryption</div>
            <div>
              <div className="create-batch-radio">
                <Radio
                  size="small"
                  className="select-batch-radio-style"
                  value="googleManaged"
                  checked={selectedEncryptionRadio === 'googleManaged'}
                  onChange={handleGoogleManagedRadio}
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
                  size="small"
                  className="select-batch-radio-style"
                  value="googleManaged"
                  checked={selectedEncryptionRadio === 'customerManaged'}
                  onChange={() => setSelectedEncryptionRadio('customerManaged')}
                />
                <div className="create-batch-message">
                  Customer-managed encryption key (CMEK)
                </div>
              </div>
              <div className="create-batch-sub-message">
                Manage via{' '}
                <div
                  className="submit-job-learn-more"
                  onClick={() => {
                    window.open(
                      `${SECURITY_KEY}?project=${projectName}`,
                      '_blank'
                    );
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
                        size="small"
                        className="select-batch-encrypt-radio-style"
                        value="mainClass"
                        checked={selectedRadioValue === 'key'}
                        onChange={handlekeyRingRadio}
                      />
                      <div className="select-text-overlay">
                        <Autocomplete
                          disabled={
                            selectedRadioValue === 'manually' ? true : false
                          }
                          options={keyRinglist}
                          value={keyRingSelected}
                          onChange={(_event, val) => handleKeyRingChange(val)}
                          renderInput={params => (
                            <TextField {...params} label="Key rings" />
                          )}
                        />
                      </div>
                      <div className="select-text-overlay subnetwork-style">
                        <Autocomplete
                          disabled={
                            selectedRadioValue === 'manually' ? true : false
                          }
                          options={keylist}
                          value={keySelected}
                          onChange={(_event, val) => handlekeyChange(val)}
                          renderInput={params => (
                            <TextField {...params} label="Keys" />
                          )}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="manual-input">
                    <div className="encrypt">
                      <Radio
                        size="small"
                        className="select-batch-encrypt-radio-style "
                        value="mainClass"
                        checked={selectedRadioValue === 'manually'}
                        onChange={handlekeyManuallyRadio}
                      />
                      <div className="select-text-overlay">
                        <Input
                          className={
                            selectedRadioValue === 'key'
                              ? 'disable-text create-batch-key manual-key'
                              : 'create-batch-style manual-key'
                          }
                          value={manualKeySelected}
                          type="text"
                          disabled={selectedRadioValue === 'key'}
                          onChange={handleManualKeySelected}
                          Label="Enter key manually"
                        />
                      </div>
                    </div>
                    {!manualValidation && (
                      <div className="error-key-parent-manual">
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
            Configure Dataproc to use Dataproc Metastore as its Hive metastore.
            <div
              className="submit-job-learn-more"
              onClick={() => {
                window.open(`${SELF_MANAGED_CLUSTER}`, '_blank');
              }}
            >
              Learn more
            </div>
          </div>
          <div className="create-messagelist">{METASTORE_MESSAGE}</div>
          <div className="select-text-overlay">
            <DynamicDropdown
              value={projectId}
              onChange={(_, projectId) =>
                handleProjectIdChange(projectId, networkSelected)
              }
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
                <CircularProgress
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
          <div className="submit-job-label-header">History server cluster</div>
          <div className="create-batches-message">
            Choose a history server cluster to store logs in.{' '}
          </div>
          <div className="select-text-overlay">
            <Autocomplete
              options={clustersList}
              value={clusterSelected}
              onChange={(_event, val) => handleClusterSelected(val)}
              noOptionsText="No history server clusters available"
              renderInput={params => (
                <TextField {...params} label="History server cluster" />
              )}
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
            batchInfoResponse={batchInfoResponse}
            createBatch={createBatch}
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
            <div className="job-cancel-button-style" aria-label="cancel Batch">
              <div onClick={() => handleCreateBatchBackView()}>CANCEL</div>
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
  );
}

export default CreateBatch;
