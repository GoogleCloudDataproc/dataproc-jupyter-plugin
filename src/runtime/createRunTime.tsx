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
import { IThemeManager, Notification } from '@jupyterlab/apputils';
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  ARTIFACT_REGISTERY,
  gcpServiceUrls,
  CONTAINER_REGISTERY,
  CUSTOM_CONTAINERS,
  CUSTOM_CONTAINER_MESSAGE,
  CUSTOM_CONTAINER_MESSAGE_PART,
  SHARED_VPC,
  SERVICE_ACCOUNT,
  SPARK_GPU_INFO_URL,
  SPARK_RESOURCE_ALLOCATION_INFO_URL,
  SPARK_AUTOSCALING_INFO_URL,
  RESOURCE_ALLOCATION_DEFAULT,
  AUTO_SCALING_DEFAULT,
  META_STORE_DEFAULT,
  GPU_DEFAULT,
  SECURITY_KEY,
  KEY_MESSAGE,
  META_STORE_TYPES,
  SPARK_META_STORE_INFO_URL
} from '../utils/const';
import LabelProperties from '../jobs/labelProperties';
import {
  authApi,
  iconDisplay,
  loggedFetch,
  checkConfig,
  handleApiError
} from '../utils/utils';
import ErrorPopup from '../utils/errorPopup';
import errorIcon from '../../style/icons/error_icon.svg';
import LeftArrowIcon from '../../style/icons/left_arrow_icon.svg';
import { Input } from '../controls/MuiWrappedInput';
import { Select } from '../controls/MuiWrappedSelect';
import { JupyterLab } from '@jupyterlab/application';
import { KernelSpecAPI } from '@jupyterlab/services';
import { ILauncher } from '@jupyterlab/launcher';
import { DropdownProps } from 'semantic-ui-react';

import { DynamicDropdown } from '../controls/DynamicDropdown';
import { projectListAPI } from '../utils/projectService';
import {
  Autocomplete,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  FormGroup,
  Radio,
  TextField
} from '@mui/material';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';
import { MuiChipsInput } from 'mui-chips-input';
import { RunTimeSerive } from './runtimeService';
import expandLessIcon from '../../style/icons/expand_less.svg';
import expandMoreIcon from '../../style/icons/expand_more.svg';
import helpIcon from '../../style/icons/help_icon.svg';
import helpIconDark from '../../style/icons/help_icon_dark.svg';
import SparkProperties from './sparkProperties';
import ApiEnableDialog from '../utils/apiErrorPopup';
import LoginErrorComponent from '../utils/loginErrorComponent';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

const iconLeftArrow = new LabIcon({
  name: 'launcher:left-arrow-icon',
  svgstr: LeftArrowIcon
});
const iconError = new LabIcon({
  name: 'launcher:error-icon',
  svgstr: errorIcon
});
const iconExpandLess = new LabIcon({
  name: 'launcher:expand-less-icon',
  svgstr: expandLessIcon
});
const iconExpandMore = new LabIcon({
  name: 'launcher:expand-more-icon',
  svgstr: expandMoreIcon
});
const iconHelp = new LabIcon({
  name: 'launcher:help-spark-icon',
  svgstr: helpIcon
});
const iconHelpDark = new LabIcon({
  name: 'launcher:help-spark-dark-icon',
  svgstr: helpIconDark
})

let networkUris: string[] = [];
let key: string[] | (() => string[]) = [];
let value: string[] | (() => string[]) = [];
function CreateRunTime({
  setOpenCreateTemplate,
  selectedRuntimeClone,
  launcher,
  app,
  fromPage,
  settingRegistry,
  themeManager
}: {
  setOpenCreateTemplate: (value: boolean) => void;
  selectedRuntimeClone: any;
  launcher: ILauncher;
  app: JupyterLab;
  fromPage: string;
  settingRegistry: ISettingRegistry;
  themeManager: IThemeManager;
}) {
  const [generationCompleted, setGenerationCompleted] = useState(false);
  const [displayNameSelected, setDisplayNameSelected] = useState('');
  const [desciptionSelected, setDescriptionSelected] = useState('');
  const [runTimeSelected, setRunTimeSelected] = useState('');
  const [versionSelected, setVersionSelected] = useState('2.3');
  const [pythonRepositorySelected, setPythonRepositorySelected] = useState('');
  const [networkTagSelected, setNetworkTagSelected] = useState([
    ...networkUris
  ]);
  const [resourceAllocationDetail, setResourceAllocationDetail] = useState(
    RESOURCE_ALLOCATION_DEFAULT
  );
  const [resourceAllocationDetailUpdated, setResourceAllocationDetailUpdated] =
    useState(RESOURCE_ALLOCATION_DEFAULT);
  const [autoScalingDetail, setAutoScalingDetail] =
    useState(AUTO_SCALING_DEFAULT);
  const [autoScalingDetailUpdated, setAutoScalingDetailUpdated] =
    useState(AUTO_SCALING_DEFAULT);
  const [gpuDetail, setGpuDetail] = useState(['']);
  const [gpuDetailUpdated, setGpuDetailUpdated] = useState(['']);
  const [expandResourceAllocation, setExpandResourceAllocation] =
    useState(false);
  const [expandAutoScaling, setExpandAutoScaling] = useState(false);
  const [expandGpu, setExpandGpu] = useState(false);
  const [gpuChecked, setGpuChecked] = useState(false);
  const [propertyDetail, setPropertyDetail] = useState(['']);
  const [propertyDetailUpdated, setPropertyDetailUpdated] = useState(['']);
  const [keyValidation, setKeyValidation] = useState(-1);
  const [valueValidation, setValueValidation] = useState(-1);
  const [sparkValueValidation, setSparkValueValidation] = useState({
    resourceallocation: [],
    autoscaling: [],
    gpu: [],
    metastore: []
  });
  const [duplicateKeyError, setDuplicateKeyError] = useState(-1);
  const [labelDetail, setLabelDetail] = useState(key);
  const [labelDetailUpdated, setLabelDetailUpdated] = useState(value);
  const [servicesList, setServicesList] = useState<string[]>([]);
  const [servicesSelected, setServicesSelected] = useState('');
  const [clusterSelected, setClusterSelected] = useState('');
  const [projectId, setProjectId] = useState<string | null>('');
  const [region, setRegion] = useState('');
  const [containerImageSelected, setContainerImageSelected] = useState('');
  const [serviceAccountSelected, setServiceAccountSelected] = useState('');
  const [userAccountSelected, setUserAccountSelected] = useState('');
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
  const [idleValidation, setIdleValidation] = useState(false);
  const [autoValidation, setAutoValidation] = useState(false);
  const [versionBiglakeValidation, setVersionBiglakeValidation] = useState(false);
  const [idleTimeSelected, setIdleTimeSelected] = useState('');
  const [timeSelected, setTimeSelected] = useState('');
  const [autoTimeSelected, setAutoTimeSelected] = useState('');
  const [autoSelected, setAutoSelected] = useState('');
  const [timeList, setTimeList] = useState([{}]);
  const [createTime, setCreateTime] = useState('');
  const [userInfo, setUserInfo] = useState('');
  const [duplicateValidation, setDuplicateValidation] = useState(false);
  const [isloadingNetwork, setIsloadingNetwork] = useState(false);
  const [isloadingSubNetwork, setIsloadingSubNetwork] = useState(false);
  const [selectedNetworkRadio, setSelectedNetworkRadio] = useState<
    'sharedVpc' | 'projectNetwork'
  >('projectNetwork');
  const [selectedAccountRadio, setSelectedAccountRadio] = useState<
    'userAccount' | 'serviceAccount'
  >('serviceAccount');
  const [projectInfo, setProjectInfo] = useState('');
  const [configError, setConfigError] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);

  const [sharedSubNetworkList, setSharedSubNetworkList] = useState<string[]>(
    []
  );
  const [sharedvpcSelected, setSharedvpcSelected] = useState('');
  const [gpuDetailChangeDone, setGpuDetailChangeDone] = useState(false);

  const [metastoreType, setMetastoreType] = useState('none');
  const [dataWarehouseDir, setDataWarehouseDir] = useState('');
  const [metastoreDetail, setMetastoreDetail] = useState(META_STORE_DEFAULT);
  const [metastoreDetailUpdated, setMetastoreDetailUpdated] = useState(META_STORE_DEFAULT);
  const gcsUrlRegex = /^gs:\/\/([a-z0-9][a-z0-9_.-]{1,61}[a-z0-9])(\/.*[^\/])?$/;
  const [isValidDataWareHouseUrl, setIsValidDataWareHouseUrl] = useState(false);
  const [expandMetastore, setExpandMetastore] = useState(false);

  useEffect(() => {
    if (metastoreType === 'biglake') {
      const metaStorePropertiesList = metastoreDetail.length > 0 ? metastoreDetail : META_STORE_DEFAULT;
      const warehouseProperty = 'spark.sql.catalog.iceberg_catalog.warehouse:';
      const metaStoreProperties = metaStorePropertiesList.map(property => {
        if (property.startsWith(warehouseProperty)) {
          return warehouseProperty + dataWarehouseDir;
        }
        return property;
      });
      setMetastoreDetail(metaStoreProperties);
      setMetastoreDetailUpdated(metaStoreProperties);
    } else {
      setDataWarehouseDir('');
      setIsValidDataWareHouseUrl(false);
      setMetastoreDetail([]);
      setMetastoreDetailUpdated([]);
    }
  }, [metastoreType, dataWarehouseDir]);

  let keyType = '';
  let keyRing = '';
  let keys = '';
  const selectedKeyType = keyType ? 'customerManaged' : 'googleManaged';
  const [selectedEncryptionRadio, setSelectedEncryptionRadio] =
    useState(selectedKeyType);
  const [selectedRadioValue, setSelectedRadioValue] = useState('key');
  const [keyRingSelected, setKeyRingSelected] = useState(keyRing);
  const [keySelected, setKeySelected] = useState(keys);
  const [manualKeySelected, setManualKeySelected] = useState('');
  const [manualValidation, setManualValidation] = useState(true);
  const [keyRinglist, setKeyRinglist] = useState<string[]>([]);
  const [keylist, setKeylist] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [stagingBucket, setStagingBucket] = useState('');
  const [apiDialogOpen, setApiDialogOpen] = useState(false);
  const [enableLink, setEnableLink] = useState('');
  const runtimeOptions = [
    {
      value: '2.3',
      text: '2.3 LTS (Spark 3.5, Java 17, Scala 2.13)'
    },
    {
      value: '2.2',
      text: '2.2 LTS (Spark 3.5, Java 17, Scala 2.13)'
    },
    {
      value: '1.2',
      text: '1.2 LTS (Spark 3.5, Java 17, Scala 2.12)'
    },
    {
      value: '1.1',
      text: '1.1 LTS (Spark 3.3, Java 11, Scala 2.12)'
    }
  ];

  useEffect(() => {
    const initializeRuntime = async () => {
      try {
        await checkConfig(setLoggedIn, setConfigError, setLoginError);
        if (loggedIn && !configError && !loginError) {
          setConfigLoading(false);
          const timeData = [
            { key: 'h', value: 'h', text: 'hour' },
            { key: 'm', value: 'm', text: 'min' },
            { key: 's', value: 's', text: 'sec' }
          ];

          setTimeList(timeData);
          updateLogic();
          listClustersAPI();
          listNetworksAPI();
          listKeyRingsAPI();
          runtimeSharedProject();
        } else {
          setConfigLoading(false);
        }
      } catch (error) {
        console.error('Initialization error:', error);
        setConfigLoading(false);
        setLoginError(true);
      }
    };

    initializeRuntime();
  }, [loggedIn, configError, loginError]);

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
    idleValidation,
    autoValidation,
    descriptionValidation,
    runTimeValidation,
    projectId,
    region,
    servicesSelected
  ]);

  useEffect(() => {
    if (loggedIn && !configError && !loginError) {
      if (networkSelected !== '') {
        listSubNetworksAPI(networkSelected);
      }
    }
  }, [networkSelected]);

  const modifyResourceAllocation = () => {
    let resourceAllocationModify = [...resourceAllocationDetailUpdated];
    gpuDetailUpdated.forEach(item => {
      const [key, value] = item.split(':');
      if (key === 'spark.dataproc.executor.resource.accelerator.type') {
        if (value === 'l4') {
          resourceAllocationModify = resourceAllocationModify
            .map((item: string) => {
              if (item.includes('spark.dataproc.executor.disk.size')) {
                // To remove the property if GPU checkbox is checked and 'spark.dataproc.executor.resource.accelerator.type:l4'.
                return null;
              } else if (item === 'spark.executor.cores:12') {
                return 'spark.executor.cores:4';
              }
              return item;
            })
            .filter((item): item is string => item !== null); // To filter out null values.'
          setResourceAllocationDetail(resourceAllocationModify);
          setResourceAllocationDetailUpdated(resourceAllocationModify);

          let gpuDetailModify = [...gpuDetailUpdated];
          resourceAllocationModify.forEach(item => {
            const [key] = item.split(':');
            if (key === 'spark.executor.cores') {
              gpuDetailModify = gpuDetailModify.map(gpuItem => {
                const [gpuKey, value] = gpuItem.split(':');
                if (gpuKey === 'spark.task.resource.gpu.amount') {
                  return `spark.task.resource.gpu.amount:${value}`;
                }
                return gpuItem;
              });
            }
          });
          setGpuDetail(gpuDetailModify);
          setGpuDetailUpdated(gpuDetailModify);
          setGpuDetailChangeDone(true);
        } else {
          resourceAllocationModify = resourceAllocationModify
            .map((item: string) => {
              if (item === 'spark.executor.cores:4') {
                return 'spark.executor.cores:12';
              }
              return item;
            })
            .filter((item): item is string => item !== null); // To filter out null values.
          setResourceAllocationDetail(resourceAllocationModify);
          setResourceAllocationDetailUpdated(resourceAllocationModify);

          if (
            resourceAllocationModify.filter(property =>
              property.includes('spark.dataproc.executor.disk.size')
            ).length === 0
          ) {
            // To add the spark.dataproc.executor.disk.size:750g at index 9.
            resourceAllocationModify.splice(
              8,
              0,
              'spark.dataproc.executor.disk.size:750g'
            );
            const updatedArray = [...resourceAllocationModify];
            setResourceAllocationDetail(updatedArray);
            setResourceAllocationDetailUpdated(updatedArray);
          }

          let gpuDetailModify = [...gpuDetailUpdated];
          resourceAllocationModify.forEach(item => {
            const [key] = item.split(':');
            if (key === 'spark.executor.cores') {
              gpuDetailModify = gpuDetailModify.map(gpuItem => {
                const [gpuKey, value] = gpuItem.split(':');
                if (gpuKey === 'spark.task.resource.gpu.amount') {
                  return `spark.task.resource.gpu.amount:${value}`;
                }
                return gpuItem;
              });
            }
          });
          setGpuDetail(gpuDetailModify);
          setGpuDetailUpdated(gpuDetailModify);
          setGpuDetailChangeDone(true);
        }
      }
    });
    setResourceAllocationDetail(resourceAllocationModify);
    setResourceAllocationDetailUpdated(resourceAllocationModify);
  };
  useEffect(() => {
    if (
      !gpuDetailChangeDone &&
      (!selectedRuntimeClone ||
        selectedRuntimeClone.runtimeConfig.properties[
          'spark.dataproc.executor.resource.accelerator.type'
        ] === 'l4' ||
        gpuDetailUpdated.includes(
          'spark.dataproc.executor.resource.accelerator.type:l4'
        ) ||
        resourceAllocationDetailUpdated.length === 9)
    ) {
      modifyResourceAllocation();
    }
  }, [gpuDetailUpdated, gpuDetailChangeDone]);

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

  const handleMetastoreTypeAndVersionChange = (metastore: string, version: string) => {
    setVersionSelected(version);
    setMetastoreType(metastore);
    setVersionBiglakeValidation(metastore === 'biglake' && version !== '2.3');
  };

  const renderLoadingLabel = (label: string, isLoading: boolean) => {
    return isLoading ? (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {label} <CircularProgress size={16} style={{ marginLeft: '8px' }} />
      </div>
    ) : (
      label
    );
  };

  useEffect(() => {
    if (loggedIn && !configError && !loginError) {
      if (keyRingSelected !== '') {
        listKeysAPI(keyRingSelected);
      }
    }
  }, [keyRingSelected]);

  useEffect(() => {
    // filtering the 'spark.dynamicAllocation.enabled' property in the updated state
    const dynamicAllocationState = autoScalingDetailUpdated.find(prop =>
      prop.startsWith('spark.dynamicAllocation.enabled:')
    );
    
    if (dynamicAllocationState) {
      const isEnabled = dynamicAllocationState.endsWith('true');
      let updatedProperties;

      if (!isEnabled && autoScalingDetailUpdated.length !== 2) {
        let filteredProperties = [dynamicAllocationState];

        const shuffleEnabledState = autoScalingDetailUpdated.find(
          (prop) => prop.startsWith('spark.reducer.fetchMigratedShuffle.enabled:')
        );

        if (shuffleEnabledState) {
          filteredProperties.push(shuffleEnabledState);
        }
        updatedProperties = filteredProperties;
      }
      
      if (isEnabled && autoScalingDetailUpdated.length == 2) {
        updatedProperties = AUTO_SCALING_DEFAULT;
      }
      
      if (updatedProperties && JSON.stringify(autoScalingDetailUpdated) !== JSON.stringify(updatedProperties)) {
        setAutoScalingDetail(updatedProperties);
        setAutoScalingDetailUpdated(updatedProperties);
         setSparkValueValidation(prev => ({
          ...prev,
          autoscaling: []
        }));
      }
    }
  }, [autoScalingDetailUpdated]);

  const displayUserInfo = async () => {
    await RunTimeSerive.displayUserInfoService(setUserInfo);
  };

  const runtimeSharedProject = async () => {
    await RunTimeSerive.runtimeSharedProjectService(
      setProjectInfo,
      setSharedSubNetworkList
    );
  };

  const handleDataWareHouseUrlChange = (url: string) => {
    setDataWarehouseDir(url);
    setIsValidDataWareHouseUrl(url === '' ? false : gcsUrlRegex.test(url));
  };

  const handleMetastoreExpand = () => {
    setExpandMetastore(prevState => !prevState);
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
        : '2.2';
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
            let resourceAllocationDetailList: string[] = [];
            let autoScalingDetailList: string[] = [];
            let gpuDetailList: string[] = [];
            let metaStoreDetailList: string[] = [];
            let otherDetailList: string[] = [];
            updatedPropertyDetail.forEach(property => {
              if (
                RESOURCE_ALLOCATION_DEFAULT.some(item => {
                  const [itemKey] = item.split(':');
                  return itemKey === property.split(':')[0];
                })
              ) {
                resourceAllocationDetailList.push(property);
              } else if (
                AUTO_SCALING_DEFAULT.some(item => {
                  const [itemKey] = item.split(':');
                  return itemKey === property.split(':')[0];
                })
              ) {
                autoScalingDetailList.push(property);
              } else if (
                GPU_DEFAULT.some(item => {
                  const [itemKey] = item.split(':');
                  return itemKey === property.split(':')[0];
                })
              ) {
                gpuDetailList.push(property);
              } else if (
                META_STORE_DEFAULT.some(item => {
                  const [itemKey] = item.split(':');
                  return itemKey === property.split(':')[0];
                })
              ) {
                metaStoreDetailList.push(property);
              } else {
                otherDetailList.push(property);
              }
            });

            setResourceAllocationDetail(resourceAllocationDetailList);
            setResourceAllocationDetailUpdated(resourceAllocationDetailList);
            setAutoScalingDetail(autoScalingDetailList);
            setAutoScalingDetailUpdated(autoScalingDetailList);
            setMetastoreDetail(metaStoreDetailList);
            setMetastoreDetailUpdated(metaStoreDetailList);
            if (metaStoreDetailList.length > 0) {
              setMetastoreType('biglake');
              const warehouseProperty = metaStoreDetailList.find(property =>
                property.startsWith('spark.sql.catalog.iceberg_catalog.warehouse:')
              );
              if (warehouseProperty) {
                const firstColonIndex = warehouseProperty.indexOf(':');
                const warehouseUrl = warehouseProperty.substring(firstColonIndex + 1);
                setDataWarehouseDir(warehouseUrl);
                setIsValidDataWareHouseUrl(gcsUrlRegex.test(warehouseUrl));
              }
              setExpandMetastore(false);
            } else {
              setMetastoreType('none');
            }
            if (gpuDetailList.length > 0) {
              setGpuChecked(true);
              setExpandGpu(true);
            }
            if (gpuChecked || gpuDetailList.length > 0) {
              setGpuDetail(gpuDetailList);
              setGpuDetailUpdated(gpuDetailList);
              setGpuDetailChangeDone(false);
            } else {
              setGpuDetail(['']);
              setGpuDetailUpdated(['']);
              setGpuDetailChangeDone(false);
            }

            setPropertyDetail(prevPropertyDetail => {
              if (
                prevPropertyDetail.length === 1 &&
                prevPropertyDetail[0] === ''
              ) {
                return otherDetailList;
              } else {
                return [...prevPropertyDetail, ...otherDetailList];
              }
            });
            setPropertyDetailUpdated(prevPropertyDetailUpdated => {
              if (
                prevPropertyDetailUpdated.length === 1 &&
                prevPropertyDetailUpdated[0] === ''
              ) {
                return otherDetailList;
              } else {
                return [...prevPropertyDetailUpdated, ...otherDetailList];
              }
            });
          }
        }
      }

      if (environmentConfig) {
        const executionConfig = environmentConfig.executionConfig;
        const peripheralsConfig = environmentConfig.peripheralsConfig;
        if (
          executionConfig?.authenticationConfig
            ?.userWorkloadAuthenticationType === 'END_USER_CREDENTIALS'
        ) {
          // User account case
          setSelectedAccountRadio('userAccount');
          setServiceAccountSelected(executionConfig?.serviceAccount || '');
        } else {
          // Service account case (either direct serviceAccount or no auth config)
          setSelectedAccountRadio('serviceAccount');
          setServiceAccountSelected(executionConfig?.serviceAccount || '');
        }
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
          if (executionConfig.kmsKey) {
            setSelectedEncryptionRadio('customerManaged');
            keyType = environmentConfig?.executionConfig?.kmsKey || '';
            const keyringValues = keyType.split('/');
            // splitting keyrings and key form projects/projectName/locations/regionName/keyRings/keyRing/cryptoKeys/key
            if (keyringValues) {
              keyRing = keyringValues[5] ? keyringValues[5] : '';
              setKeyRingSelected(keyRing);
              keys = keyringValues[7] ? keyringValues[7] : '';
              setKeySelected(keys);
            } else {
              setManualKeySelected(executionConfig.kmsKey);
            }
          }
          if (executionConfig.stagingBucket) {
            setStagingBucket(executionConfig.stagingBucket);
          }
        }

        if (
          peripheralsConfig &&
          peripheralsConfig.metastoreService !== undefined
        ) {
          setMetastoreType('dataproc');
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

  const listNetworksFromSubNetworkAPI = async (subnetwork: string) => {
    await RunTimeSerive.listNetworksFromSubNetworkAPIService(
      subnetwork,
      setIsloadingNetwork,
      setNetworkSelected,
      setSubNetworkSelected,
      setIsloadingSubNetwork
    );
  };
  const listClustersAPI = async () => {
    await RunTimeSerive.listClustersAPIService(setClustersList);
  };

  const listNetworksAPI = async () => {
    await RunTimeSerive.listNetworksAPIService(
      setNetworklist,
      setNetworkSelected,
      selectedRuntimeClone,
      setIsloadingNetwork,
      setIsloadingSubNetwork
    );
  };

  const listSubNetworksAPI = async (network: string) => {
    await RunTimeSerive.listSubNetworksAPIService(
      network,
      setSubNetworklist,
      setSubNetworkSelected,
      selectedRuntimeClone,
      setIsloadingSubNetwork
    );

  };

  const regionListAPI = async (
    projectId: string,
    network: string | undefined
  ) => {
    await RunTimeSerive.regionListAPIService(
      projectId,
      network,
      setIsLoadingService,
      setServicesList
    );
  };

  const listKeyRingsAPI = async () => {
    await RunTimeSerive.listKeyRingsAPIService(setKeyRinglist);
  };

  const listKeysAPI = async (keyRing: string) => {
    await RunTimeSerive.listKeysAPIService(keyRing, setKeylist, setKeySelected);
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
  const handleServiceSelected = (data: string | null) => {
    if (data !== null) {
      setServicesSelected(data!.toString());
    }
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
    regionListAPI(data, network);
  };

  const handleNetworkChange = async (data: DropdownProps | null) => {
    if (data !== null) {
      setNetworkSelected(data!.toString());
      setIsloadingSubNetwork(true);
      setSubNetworkSelected('');
      await handleProjectIdChange(projectId, data!.toString());
    }
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
  const handleServiceAccountRadioChange = (e: any) => {
    setSelectedAccountRadio('serviceAccount');
    setUserAccountSelected('');
    setServiceAccountSelected(e.target.value);
  };
  const handleUserAccountRadioChange = (e: any) => {
    setSelectedAccountRadio('userAccount');
    setServiceAccountSelected('');
    setUserAccountSelected(e.target.value);
  };
  const handleSubNetworkChange = (data: string | null) => {
    if (data !== null) {
      setSubNetworkSelected(data!.toString());
    }
  };
  const handleSharedSubNetwork = async (data: string | null) => {
    if (data !== null) {
      setSharedvpcSelected(data!.toString());
      await handleProjectIdChange(projectId, data!.toString());
    }
  };
  const handleCancelButton = async () => {
    setOpenCreateTemplate(false);
    if (fromPage === 'launcher') {
      app.shell.activeWidget?.close();
    }
  };

  const renderHelpIcon = (themeManager: IThemeManager) => {
    if (themeManager.theme && themeManager.isLight(themeManager.theme)) {
      return (
        <iconHelp.react
          tag="div"
          className="logo-alignment-style"
        />
      );
    }
    return (
      <iconHelpDark.react
        tag="div"
        className="logo-alignment-style"
      />
    );
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
      sparkValueValidation.resourceallocation.length !== 0 ||
      sparkValueValidation.autoscaling.length !== 0 ||
      sparkValueValidation.gpu.length !== 0 ||
      displayNameSelected === '' ||
      runTimeSelected === '' ||
      desciptionSelected === '' ||
      versionSelected === '' ||
      displayNameValidation ||
      descriptionValidation ||
      idleValidation ||
      runTimeValidation ||
      autoValidation ||
      duplicateValidation ||
      versionBiglakeValidation ||
      (selectedNetworkRadio === 'sharedVpc' &&
        sharedSubNetworkList.length === 0) ||
      (selectedNetworkRadio === 'sharedVpc' && sharedvpcSelected === '') ||
      (selectedNetworkRadio === 'projectNetwork' &&
        networkList.length !== 0 &&
        subNetworkList.length === 0) ||
      (metastoreType === 'biglake' && ( dataWarehouseDir === '' || !isValidDataWareHouseUrl))
    );
  }
  const createRuntimeApi = async (payload: any) => {
    const credentials = await authApi();
    const { DATAPROC } = await gcpServiceUrls;
    if (credentials) {
      loggedFetch(
        `${DATAPROC}/projects/${credentials.project_id}/locations/${credentials.region_id}/sessionTemplates`,
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
            Notification.emit(
              `Runtime Template ${displayNameSelected} successfully created`,
              'success',
              {
                autoClose: 5000
              }
            );
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
                    icon: () => iconDisplay(kernelsData, themeManager),
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
                    category: 'Dataproc Serverless Spark',
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
                    icon: () => iconDisplay(kernelsData, themeManager),
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
            console.info(responseResult);
          } else {
            const errorResponse = await response.json();
            if (errorResponse?.error?.code !== 403) {
              setError({ isOpen: true, message: errorResponse.error.message });
            }
            if (errorResponse?.error?.code) {
              handleApiError(
                errorResponse,
                credentials,
                setApiDialogOpen,
                setEnableLink,
                () => {},
                'createRuntimeTemplates'
              );
            }
          }
        })
        .catch((err: Error) => {
          console.error('Error Creating template', err);
          DataprocLoggingService.log(
            'Error Creating template',
            LOG_LEVEL.ERROR
          );

          Notification.emit(`Failed to create the template : ${err}`, 'error', {
            autoClose: 5000
          });
        });
    }
  };
  const updateRuntimeApi = async (payload: any) => {
    await RunTimeSerive.updateRuntimeApiService(
      payload,
      app,
      fromPage,
      runTimeSelected,
      displayNameSelected,
      setError,
      setOpenCreateTemplate
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
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
        resourceAllocationDetailUpdated.forEach((label: string) => {
          const labelSplit = label.split(':');
          const key = labelSplit[0];
          const value = labelSplit[1];
          propertyObject[key] = value;
        });
        autoScalingDetailUpdated.forEach((label: string) => {
          const labelSplit = label.split(':');
          const key = labelSplit[0];
          const value = labelSplit[1];
          propertyObject[key] = value;
        });
        gpuDetailUpdated.forEach((label: string) => {
          const labelSplit = label.split(':');
          const key = labelSplit[0];
          const value = labelSplit[1];
          propertyObject[key] = value;
        });
        metastoreType === 'biglake' &&
        metastoreDetailUpdated.forEach((label: string) => {
          const firstColonIndex = label.indexOf(':');
          const key = label.substring(0, firstColonIndex);
          const value = label.substring(firstColonIndex + 1);
          propertyObject[key] = value;
        });
        propertyDetailUpdated.forEach((label: string) => {
          const labelSplit = label.split(/:(.+)/);
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
              ...(serviceAccountSelected !== '' && {
                serviceAccount: serviceAccountSelected
              }),
              ...(networkTagSelected.length > 0 && {
                networkTags: networkTagSelected
              }),

              ...(keySelected !== '' &&
                selectedRadioValue === 'key' &&
                keySelected !== undefined && {
                  kmsKey: `projects/${credentials.project_id}/locations/${credentials.region_id}/keyRings/${keyRingSelected}/cryptoKeys/${keySelected}`
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
                }),

              ...(selectedAccountRadio === 'userAccount' && {
                authentication_config: {
                  user_workload_authentication_type: 'END_USER_CREDENTIALS'
                }
              }),
              ...(stagingBucket && { stagingBucket: stagingBucket })
            },
            peripheralsConfig: {
              ...(metastoreType && {
                metastoreService: metastoreType === 'none' ? '' : servicesSelected
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
    } catch (error) {
      console.error('Error saving runtime:', error);
    } finally {
      setIsSaving(false); // Stop loading regardless of success/failure
    }
  };

  const handleResourceAllocationExpand = () => {
    let resourceAllocationMode = !expandResourceAllocation;
    setExpandResourceAllocation(resourceAllocationMode);
  };

  const handleAutoScalingExpand = () => {
    let autoScalingMode = !expandAutoScaling;
    setExpandAutoScaling(autoScalingMode);
  };

  const handleGpuExpand = () => {
    let gpuMode = !expandGpu;
    setExpandGpu(gpuMode);
  };

  const handleGpuCheckbox = (event: React.ChangeEvent<HTMLInputElement>) => {
    setGpuChecked(event.target.checked);
    let gpuDetailModify = [...GPU_DEFAULT];
    if (event.target.checked) {
      let resourceAllocationModify = [...resourceAllocationDetailUpdated];
      resourceAllocationModify = resourceAllocationModify
        .map((item: string) => {
          if (item === 'spark.dataproc.executor.disk.tier:standard') {
            return 'spark.dataproc.executor.disk.tier:premium';
          } else if (item === 'spark.executor.memoryOverhead:1220m') {
            // To remove the property if GPU checkbox is checked.
            return null;
          }
          return item;
        })
        .filter((item): item is string => item !== null); // To filter out null values.
      setResourceAllocationDetail(resourceAllocationModify);
      setResourceAllocationDetailUpdated(resourceAllocationModify);
      setExpandGpu(true);
      resourceAllocationModify.forEach(item => {
        const [key, value] = item.split(':');
        if (key === 'spark.executor.cores') {
          const cores = Number(value);
          const gpuValue = (1 / cores).toFixed(2);
          gpuDetailModify = gpuDetailModify.map(gpuItem => {
            const [gpuKey] = gpuItem.split(':');
            if (gpuKey === 'spark.task.resource.gpu.amount') {
              return `spark.task.resource.gpu.amount:${gpuValue}`;
            }
            return gpuItem;
          });
        }
      });
      setGpuDetail(gpuDetailModify);
      setGpuDetailUpdated(gpuDetailModify);
      setGpuDetailChangeDone(false);
    } else {
      let resourceAllocationModify = [...resourceAllocationDetailUpdated];
      resourceAllocationModify = resourceAllocationModify.map(
        (item: string) => {
          if (item === 'spark.dataproc.executor.disk.tier:premium') {
            return 'spark.dataproc.executor.disk.tier:standard';
          } else if (item.includes('spark.executor.cores')) {
            return 'spark.executor.cores:4';
          }
          return item;
        }
      );
      if (
        !resourceAllocationModify.includes(
          'spark.executor.memoryOverhead:1220m'
        )
      ) {
        // To add the spark.executor.memoryOverhead:1220m at index 8.
        resourceAllocationModify.splice(
          7,
          0,
          'spark.executor.memoryOverhead:1220m'
        );
      }
      if (
        resourceAllocationModify.filter(property =>
          property.includes('spark.dataproc.executor.disk.size')
        ).length === 0
      ) {
        // To add the spark.dataproc.executor.disk.size:400g at index 9 when GPU is unchecked
        resourceAllocationModify.splice(
          8,
          0,
          'spark.dataproc.executor.disk.size:400g'
        );
      } else {
        resourceAllocationModify = resourceAllocationModify.map(
          (item: string) => {
            if (item.includes('spark.dataproc.executor.disk.size')) {
              return 'spark.dataproc.executor.disk.size:400g';
            }
            return item;
          }
        );
      }

      setResourceAllocationDetail(resourceAllocationModify);
      setResourceAllocationDetailUpdated(resourceAllocationModify);
      setExpandGpu(false);
      setGpuDetail(['']);
      setGpuDetailUpdated(['']);
      setGpuDetailChangeDone(false);
    }
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
  return (
    <div>
      {configLoading && !loggedIn && !configError && !loginError && (
        <div className="spin-loader-main">
          <CircularProgress
            className="spin-loader-custom-style"
            size={18}
            aria-label="Loading Spinner"
            data-testid="loader"
          />
          Loading Runtime
        </div>
      )}

      {loggedIn && !configError ? (
        <>
          <div className="cluster-details-header">
            <div className="back-arrow-icon" onClick={handleCancelButton}>
              <iconLeftArrow.react
                tag="div"
                className="icon-white logo-alignment-style"
              />
            </div>
            <div className="cluster-details-title">
              Serverless Runtime Template
            </div>
          </div>
          <div className="runtime-container">
            <form>
              <div className="submit-job-label-header">Template Info</div>
              <div className="select-text-overlay">
                <Input
                  className="create-runtime-style "
                  value={displayNameSelected}
                  onChange={e => handleDisplayNameChange(e)}
                  type="text"
                  Label="Display name*"
                />
              </div>
              {displayNameValidation && (
                <div className="error-key-parent">
                  <iconError.react tag="div" className="logo-alignment-style" />
                  <div className="error-key-missing">Name is required</div>
                </div>
              )}

              <div className="select-text-overlay">
                <Input
                  className={`create-runtime-style ${
                    selectedRuntimeClone !== undefined ? ' disable-text' : ''
                  }`}
                  value={runTimeSelected}
                  onChange={e => handleInputChange(e)}
                  type="text"
                  disabled={selectedRuntimeClone !== undefined}
                  Label="Runtime ID*"
                />
              </div>

              {runTimeValidation && (
                <div className="error-key-parent">
                  <iconError.react tag="div" className="logo-alignment-style" />
                  <div className="error-key-missing">ID is required</div>
                </div>
              )}

              <div className="select-text-overlay">
                <Input
                  className="create-runtime-style "
                  value={desciptionSelected}
                  onChange={e => handleDescriptionChange(e)}
                  type="text"
                  Label="Description*"
                />
              </div>

              {descriptionValidation && (
                <div className="error-key-parent">
                  <iconError.react tag="div" className="logo-alignment-style" />
                  <div className="error-key-missing">
                    Description is required
                  </div>
                </div>
              )}
              <div className="submit-job-label-header">
                Execution Configuration
              </div>

              <div>
                <div className="runtime-message">Execute notebooks with: </div>
                <div className="create-runtime-radio">
                  <Radio
                    className="select-runtime-radio-style"
                    value={serviceAccountSelected}
                    checked={selectedAccountRadio === 'serviceAccount'}
                    onChange={e => handleServiceAccountRadioChange(e)}
                  />
                  <div className="create-batch-message-acc">
                    Service Account
                  </div>
                  <Radio
                    className="select-runtime-radio-style"
                    value={userAccountSelected}
                    checked={selectedAccountRadio === 'userAccount'}
                    onChange={e => handleUserAccountRadioChange(e)}
                  />
                  <div className="create-batch-message">User Account</div>
                </div>
                {selectedAccountRadio === 'serviceAccount' && (
                  <>
                    <div className="select-text-overlay-textbox">
                      <Input
                        className="create-batch-style"
                        value={serviceAccountSelected}
                        onChange={e =>
                          setServiceAccountSelected(e.target.value)
                        }
                        type="text"
                        placeholder=""
                        Label="Service account"
                      />
                    </div>
                    <div className="create-custom-messagelist">
                      If not provided, the default GCE service account will be
                      used.
                      <div
                        className="submit-job-learn-more"
                        onClick={() => {
                          window.open(`${SERVICE_ACCOUNT}`, '_blank');
                        }}
                      >
                        Learn more
                      </div>
                    </div>
                  </>
                )}
                {selectedAccountRadio === 'userAccount' && (
                  <>
                    <div className="select-text-overlay-textbox">
                      <Input
                        className="create-batch-style"
                        value={serviceAccountSelected}
                        onChange={e =>
                          setServiceAccountSelected(e.target.value)
                        }
                        type="text"
                        placeholder=""
                        Label="Service account for system operations"
                      />
                    </div>
                    <div className="create-custom-messagelist">
                      If not provided, the default GCE service account will be
                      used.
                      <div
                        className="submit-job-learn-more"
                        onClick={() => {
                          window.open(`${SERVICE_ACCOUNT}`, '_blank');
                        }}
                      >
                        Learn more
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="select-text-overlay">
                <Autocomplete
                  className="create-runtime-style"
                  value={
                    runtimeOptions.find(
                      option => option.value === versionSelected
                    ) || null
                  }
                  onChange={(event, newValue) => {
                    handleMetastoreTypeAndVersionChange(metastoreType, newValue?.value || '');
                  }}
                  options={runtimeOptions}
                  getOptionLabel={option => option.text}
                  renderInput={params => (
                    <TextField {...params} label="Runtime version*" />
                  )}
                />
              </div>
              {versionBiglakeValidation && (
                <div className="error-key-parent">
                  <iconError.react tag="div" className="logo-alignment-style" />
                  <div className="error-key-missing">To use BigLake Metastore, select runtime version 2.3 or higher.</div>
                </div>
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
              <div className="select-text-overlay">
                <Input
                  className="create-runtime-style "
                  value={stagingBucket}
                  onChange={e => setStagingBucket(e.target.value)}
                  type="text"
                  Label="Staging Bucket"
                />
              </div>
              <div className="select-text-overlay">
                <Input
                  className="create-runtime-style "
                  value={pythonRepositorySelected}
                  onChange={e => setPythonRepositorySelected(e.target.value)}
                  type="text"
                  Label="Python packages repository"
                />
              </div>
              <div className="create-messagelist">
                Enter the URI for the repository to install Python packages. By
                default packages are installed to PyPI pull-through cache on
                GCP.
              </div>
              <div>
                <div>
                  <div className="submit-job-label-header">Encryption</div>
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
                      className="submit-job-learn-more"
                      onClick={() => {
                        window.open(
                          `${SECURITY_KEY}?
                          `,
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
                              onChange={(_event, val) =>
                                handleKeyRingChange(val)
                              }
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
                            <div className="error-key-missing">
                              {KEY_MESSAGE}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="submit-job-label-header">
                Network Configuration
              </div>
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
                    Networks shared from host project:
                  </div>
                </div>
                <div className="create-runtime-sub-message-network">
                  Choose a shared VPC network from project that is different
                  from this cluster's project.{' '}
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
                    <>
                      <div className="select-text-overlay">
                        <Autocomplete
                          options={networkList}
                          value={networkSelected}
                          onChange={(_event, val) => handleNetworkChange(val)}
                          renderInput={params => (
                            <TextField
                              {...params}
                              label={renderLoadingLabel('Primary network*', isloadingNetwork)}
                              disabled={isloadingNetwork}
                            />
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
                            <TextField
                              {...params}
                              label={renderLoadingLabel('Subnetwork*', isloadingSubNetwork)}
                              disabled={isloadingSubNetwork}
                            />
                          )}
                        />
                      </div>
                    </>
                  </div>
                )}
                {selectedNetworkRadio === 'projectNetwork' &&
                  networkList.length === 0 && (
                    <div className="error-key-parent">
                      <iconError.react
                        tag="div"
                        className="logo-alignment-style"
                      />
                      <div className="error-key-missing">
                        No local networks are available.
                      </div>
                    </div>
                  )}
                {!isloadingNetwork && !isloadingSubNetwork &&
                  selectedNetworkRadio === 'projectNetwork' &&
                  networkSelected !== '' &&
                  subNetworkSelected === '' && (
                    <div className="error-key-parent">
                      <iconError.react
                        tag="div"
                        className="logo-alignment-style"
                      />
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
                      <iconError.react
                        tag="div"
                        className="logo-alignment-style"
                      />
                      <div className="error-key-missing">
                        No shared subnetworks are available in this region.
                      </div>
                    </div>
                  )}
              </div>

              <div className="select-text-overlay">
                <MuiChipsInput
                  className="select-runtime-style"
                  onChange={e => handleNetworkTags(setDuplicateValidation, e)}
                  addOnBlur={true}
                  value={networkTagSelected}
                  inputProps={{ placeholder: '' }}
                  label="Network tags"
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
              <div className="submit-job-label-header">
                Session Configuration
              </div>
              <div className="single-line">
                <div className="select-text-overlay">
                  <Input
                    className="runtimetemplate-max-idle"
                    value={idleTimeSelected}
                    onChange={e => handleIdleSelected(e)}
                    type="text"
                    Label="Max idle time"
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
                  <div className="error-key-missing">
                    Only Numeric is allowed
                  </div>
                </div>
              )}

              <div className="single-line">
                <div className="select-text-overlay">
                  <Input
                    className="runtimetemplate-max-idle"
                    value={autoTimeSelected}
                    onChange={e => handleAutoTimeSelected(e)}
                    type="text"
                    Label="Max session time"
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
                  <div className="error-key-missing">
                    Only Numeric is allowed
                  </div>
                </div>
              )}

              <div className="submit-job-label-header">Metastore</div>

              <div className="select-text-overlay">
                <Autocomplete
                  className="create-runtime-style"
                  options={META_STORE_TYPES}
                  value={META_STORE_TYPES.find(option => option.value === metastoreType) || null}
                  getOptionLabel={option => option.label}
                  onChange={(event, newValue) => {
                    handleMetastoreTypeAndVersionChange(newValue?.value || '', versionSelected);
                  }}
                  renderInput={params => (
                    <TextField {...params} label="Metastore" />
                  )}
                />
              </div>

              {metastoreType === 'dataproc' && (
                <>
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
                          <TextField {...params} label="Metastore service" />
                        )}
                      />
                    )}
                  </div>
                </>
              )}

              {metastoreType === 'biglake' && (
                <>
                  <div className="select-text-overlay">
                    <Input
                      className={`create-runtime-style ${!isValidDataWareHouseUrl && dataWarehouseDir ? 'input-error' : ''}`}
                      value={dataWarehouseDir}
                      onChange={e => handleDataWareHouseUrlChange(e.target.value)}
                      type="text"
                      Label="Data warehousing directory*"
                      placeholder="e.g, gs://<bucket-name>"
                    />
                  </div>
                  {!isValidDataWareHouseUrl && (
                    <div className="error-key-parent">
                      <iconError.react tag="div" className="logo-alignment-style" />
                      <div className="error-key-missing">Input does not match pattern : gs://bucket-name</div>
                    </div>
                  )}
                </>
              )}

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
                  noOptionsText="No history server clusters available"
                  renderInput={params => (
                    <TextField {...params} label="History server cluster" />
                  )}
                />
              </div>
              <div className="submit-job-label-header">Spark Properties</div>
              <div className="spark-properties-sub-header-parent">
                <div className="spark-properties-title">
                  <div className="spark-properties-sub-header">
                    Resource Allocation
                  </div>
                  <div
                    className="expand-icon"
                    onClick={() =>
                      window.open(
                        `${SPARK_RESOURCE_ALLOCATION_INFO_URL}`,
                        '_blank'
                      )
                    }
                  >
                    {renderHelpIcon(themeManager)}
                  </div>
                </div>
                <div
                  className="expand-icon"
                  onClick={() => handleResourceAllocationExpand()}
                >
                  {expandResourceAllocation ? (
                    <iconExpandLess.react
                      tag="div"
                      className="logo-alignment-style"
                    />
                  ) : (
                    <iconExpandMore.react
                      tag="div"
                      className="logo-alignment-style"
                    />
                  )}
                </div>
              </div>
              {expandResourceAllocation && (
                <SparkProperties
                  labelDetail={resourceAllocationDetail}
                  setLabelDetail={setResourceAllocationDetail}
                  labelDetailUpdated={resourceAllocationDetailUpdated}
                  setLabelDetailUpdated={setResourceAllocationDetailUpdated}
                  buttonText="ADD PROPERTY"
                  sparkValueValidation={sparkValueValidation}
                  setSparkValueValidation={setSparkValueValidation}
                  sparkSection="resourceallocation"
                  setGpuDetailChangeDone={setGpuDetailChangeDone}
                />
              )}
              <div className="spark-properties-sub-header-parent">
                <div className="spark-properties-title">
                  <div className="spark-properties-sub-header">Autoscaling</div>
                  <div
                    className="expand-icon"
                    onClick={() =>
                      window.open(`${SPARK_AUTOSCALING_INFO_URL}`, '_blank')
                    }
                  >
                    {renderHelpIcon(themeManager)}
                  </div>
                </div>
                <div
                  className="expand-icon"
                  onClick={() => handleAutoScalingExpand()}
                >
                  {expandAutoScaling ? (
                    <iconExpandLess.react
                      tag="div"
                      className="logo-alignment-style"
                    />
                  ) : (
                    <iconExpandMore.react
                      tag="div"
                      className="logo-alignment-style"
                    />
                  )}
                </div>
              </div>
              {expandAutoScaling && (
                <SparkProperties
                  labelDetail={autoScalingDetail}
                  setLabelDetail={setAutoScalingDetail}
                  labelDetailUpdated={autoScalingDetailUpdated}
                  setLabelDetailUpdated={setAutoScalingDetailUpdated}
                  buttonText="ADD PROPERTY"
                  sparkValueValidation={sparkValueValidation}
                  setSparkValueValidation={setSparkValueValidation}
                  sparkSection="autoscaling"
                  setGpuDetailChangeDone={setGpuDetailChangeDone}
                />
              )}
              <div className="spark-properties-sub-header-parent">
                <div className="spark-properties-title">
                  <FormGroup row={false}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={gpuChecked}
                          onChange={handleGpuCheckbox}
                        />
                      }
                      className="create-scheduler-label-style"
                      label="GPU"
                    />
                  </FormGroup>
                  <div
                    className="expand-icon"
                    onClick={() =>
                      window.open(`${SPARK_GPU_INFO_URL}`, '_blank')
                    }
                  >
                    {renderHelpIcon(themeManager)}
                  </div>
                </div>
                <div className="expand-icon" onClick={() => handleGpuExpand()}>
                  {expandGpu ? (
                    <iconExpandLess.react
                      tag="div"
                      className="logo-alignment-style"
                    />
                  ) : (
                    <iconExpandMore.react
                      tag="div"
                      className="logo-alignment-style"
                    />
                  )}
                </div>
              </div>
              {expandGpu && gpuChecked && (
                <SparkProperties
                  labelDetail={gpuDetail}
                  setLabelDetail={setGpuDetail}
                  labelDetailUpdated={gpuDetailUpdated}
                  setLabelDetailUpdated={setGpuDetailUpdated}
                  buttonText="ADD PROPERTY"
                  sparkValueValidation={sparkValueValidation}
                  setSparkValueValidation={setSparkValueValidation}
                  sparkSection="gpu"
                  setGpuDetailChangeDone={setGpuDetailChangeDone}
                />
              )}
              {metastoreType === 'biglake' && (
                <>
                  <div className="spark-properties-sub-header-parent">
                    <div className="spark-properties-title">
                      <div className="spark-properties-sub-header">Metastore</div>
                      <div
                        className="expand-icon"
                        onClick={() =>
                          window.open(`${SPARK_META_STORE_INFO_URL}`, '_blank')
                        }
                        >
                          {renderHelpIcon(themeManager)}
                      </div>
                    </div>
                    <div
                      className="expand-icon"
                      onClick={() => handleMetastoreExpand()}
                    >
                      {expandMetastore ? (
                        <iconExpandLess.react
                          tag="div"
                          className="logo-alignment-style"
                        />
                      ) : (
                        <iconExpandMore.react
                          tag="div"
                          className="logo-alignment-style"
                        />
                      )}
                    </div>
                  </div>
                  {expandMetastore && (
                    <SparkProperties
                      labelDetail={metastoreDetail}
                      setLabelDetail={setMetastoreDetail}
                      labelDetailUpdated={metastoreDetailUpdated}
                      setLabelDetailUpdated={setMetastoreDetailUpdated}
                      buttonText="ADD PROPERTY"
                      sparkValueValidation={sparkValueValidation}
                      setSparkValueValidation={setSparkValueValidation}
                      sparkSection="metastore"
                      setGpuDetailChangeDone={setGpuDetailChangeDone}
                    />
                  )}
                </>
              )}
              <div className="spark-properties-sub-header">Others</div>
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
                    if (!isSaveDisabled() && !isSaving) {
                      handleSave();
                    }
                  }}
                  className={
                    isSaveDisabled() || isSaving
                      ? 'submit-button-disable-style'
                      : 'submit-button-style'
                  }
                  aria-label="submit Batch"
                >
                  <div>{isSaving ? 'SAVING...' : 'SAVE'}</div>
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
        </>
      ) : (
        (loginError || configError) && (
          <div className="login-error-parent">
            <LoginErrorComponent
              setLoginError={setLoginError}
              loginError={loginError}
              configError={configError}
              setConfigError={setConfigError}
              settingRegistry={settingRegistry}
              app={app}
            />
          </div>
        )
      )}
      {apiDialogOpen && (
        <ApiEnableDialog
          open={apiDialogOpen}
          onCancel={() => setApiDialogOpen(false)}
          onEnable={() => setApiDialogOpen(false)}
          enableLink={enableLink}
        />
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
