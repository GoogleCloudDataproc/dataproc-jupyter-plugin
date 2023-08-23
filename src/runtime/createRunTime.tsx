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
import 'semantic-ui-css/semantic.min.css';
import 'react-toastify/dist/ReactToastify.css';
import { Input, Select } from 'semantic-ui-react';
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  BASE_URL,
  BASE_URL_META,
  BASE_URL_NETWORKS,
  PROJECT_LIST_URL,
  REGION_URL,
  STATUS_RUNNING,
  USER_INFO_URL
} from '../utils/const';
import TagsInput from 'react-tagsinput';
import 'react-tagsinput/react-tagsinput.css';
import LabelProperties from '../jobs/labelProperties';
import { authApi } from '../utils/utils';
import { ClipLoader } from 'react-spinners';
import ErrorPopup from '../utils/errorPopup';
import errorIcon from '../../style/icons/error_icon.svg';
import { toast } from 'react-toastify';

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
  selfLink: string;
  network: string;
  subnetworks: string;
};

type Service = {
  name: string;
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
  selectedRuntimeClone
}: {
  setOpenCreateTemplate: (value: boolean) => void;
  selectedRuntimeClone: any;
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
  const [servicesList, setServicesList] = useState<
    Array<{ key: string; value: string; text: string }>
  >([]);
  const [servicesSelected, setServicesSelected] = useState('');
  const [clusterSelected, setClusterSelected] = useState('');
  const [projectId, setProjectId] = useState('None');
  const [region, setRegion] = useState('');
  const [projectList, setProjectList] = useState([{}]);
  const [regionList, setRegionList] = useState<
    { value: string; key: string; text: string }[]
  >([]);
  const [networkList, setNetworklist] = useState([{}]);
  const [subNetworkList, setSubNetworklist] = useState<
    { key: string; value: string; text: string }[]
  >([]);
  const [isLoadingRegion, setIsLoadingRegion] = useState(false);
  const [networkSelected, setNetworkSelected] = useState('default');
  const [subNetworkSelected, setSubNetworkSelected] = useState('default');
  const [isLoadingService, setIsLoadingService] = useState(false);
  const [error, setError] = useState({ isOpen: false, message: '' });
  const [clustersList, setClustersList] = useState<
    Array<{ key: string; value: string; text: string }>
  >([]);
  const [runTimeValidation, setRuntimeValidation] = useState(false);
  const [descriptionValidation, setDescriptionValidation] = useState(false);
  const [displayNameValidation, setDisplayNameValidation] = useState(false);
  const [versionValidation, setVersionValidation] = useState(false);
  const [idleValidation, setIdleValidation] = useState(false);
  const [autoValidation, setAutoValidation] = useState(false);
  const [defaultValue, setDefaultValue] = useState('default');
  const [idleTimeSelected, setIdleTimeSelected] = useState('');
  const [timeSelected, setTimeSelected] = useState('');
  const [autoTimeSelected, setAutoTimeSelected] = useState('');
  const [autoSelected, setAutoSelected] = useState('');
  const [timeList, setTimeList] = useState([{}]);
  const [createTime, setCreateTime] = useState('');
  const [runtimeUpdated, setRuntimeUpdated] = useState(false);
  const [userInfo, setUserInfo] = useState('');

  useEffect(() => {
    const timeData = [
      { key: 'h', value: 'h', text: 'hour' },
      { key: 'm', value: 'm', text: 'min' },
      { key: 's', value: 's', text: 'sec' }
    ];
    setTimeList(timeData);
    updateLogic();
    
    projectListAPI();
    listClustersAPI();
    listNetworksAPI();
  }, [selectedRuntimeClone, clusterSelected, defaultValue]);

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
  const displayUserInfo = async () => {
    const credentials = await authApi();
    if (credentials) {
      fetch(USER_INFO_URL, {
        method: 'GET',
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token
        }
      })
        .then((response: Response) => {
          response
            .json()
            .then((responseResult: any) => {
              setUserInfo(responseResult.email);
            })
            .catch((e: Error) => console.log(e));
        })
        .catch((err: Error) => {
          console.error('Error displaying user info', err);
          toast.error('Failed to fetch user information');
        });
    }
  };
  const updateLogic = () => {
    if (selectedRuntimeClone !== undefined) {
      setRuntimeUpdated(true);
      const {
        jupyterSession,
        name,
        description,
        runtimeConfig,
        creator,
        createTime,
        environmentConfig
      } = selectedRuntimeClone;

      setDisplayNameSelected(jupyterSession.displayName);
      setRunTimeSelected(name.split('/')[5]);
      setDescriptionSelected(description);
      setVersionSelected(runtimeConfig.version);
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
          setSubNetworkSelected(executionConfig.subnetworkUri);
          if (executionConfig.hasOwnProperty('idleTtl')) {
            const idleTtlUnit = executionConfig.idleTtl.slice(-1); // Extracting the last character 's'

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
          setClusterSelected(dataprocCluster.split('/')[5]);
        }
      }
    } else {
      displayUserInfo();
      setCreateTime(new Date().toISOString());
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
                    projectId: data.projectId
                  };
                }
              );
              const keyLabelStructure = transformedProjectList.map(obj => ({
                key: obj.projectId,
                value: obj.projectId,
                text: obj.projectId
              }));
              const noneOption = { key: 'None', value: 'None', text: 'None' };
              setProjectList([noneOption, ...keyLabelStructure]);
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

  const handleServiceSelected = (event: any, data: any) => {
    setServicesSelected(data.value);
  };
  const handleIdleSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;
    const numericRegex = /^[0-9]*$/;

    if (numericRegex.test(inputValue) || inputValue === '') {
      setIdleValidation(false);
    } else {
      setIdleValidation(true);
    }

    setIdleTimeSelected(inputValue);
  };
  const handletimeSelected = (event: any, data: any) => {
    setTimeSelected(data.value);
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
  const handleAutoSelected = (event: any, data: any) => {
    setAutoSelected(data.value);
  };
  const handleProjectIdChange = (event: any, data: any) => {
    regionListAPI(data.value);
    setProjectId(data.value);
    data.value === 'None' && setRegion('');
    data.value === 'None' && setServicesSelected('');
    data.value === 'None' && setRegionList([]);
    data.value === 'None' && setServicesList([]);
  };
  const handleRegionChange = (event: any, data: any) => {
    setRegion(data.value);
    listMetaStoreAPI(data.value);
  };
  const handleNetworkChange = (event: any, data: any) => {
    setNetworkSelected(data.value);
    setSubNetworkSelected(defaultValue);
    listSubNetworksAPI(data.value);
  };
  const handleSubNetworkChange = (event: any, data: any) => {
    setSubNetworkSelected(data.value);
  };
  const handleCancelButton = () => {
    setOpenCreateTemplate(false);
    // const content = new AuthLogin();
    // const widget = new MainAreaWidget<AuthLogin>({ content });
    // widget.title.label = 'Config Setup';
    // //widget.title.icon = iconCluster;
    // app.shell.add(widget, 'main');
  };

  const handleClusterSelected = (event: any, data: any) => {
    setClusterSelected(data.value);
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
      autoValidation
    );
  }
  const createRuntimeApi = async (payload: any) => {
    const credentials = await authApi();
    if (credentials) {
      fetch(
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
            toast.success(
              `RuntimeTemplate ${displayNameSelected} successfully submitted`
            );
            console.log(responseResult);
          } else {
            const errorResponse = await response.json();
            console.log(errorResponse);
            setError({ isOpen: true, message: errorResponse.error.message });
          }
        })
        .catch((err: Error) => {
          console.error('Error Creating template', err);
          toast.error('Failed to create the template');
        });
    }
  };
  const updateRuntimeApi = async (payload: any) => {
    const credentials = await authApi();
    if (credentials) {
      fetch(
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
              `RuntimeTemplate ${displayNameSelected} successfully updated`
            );
            console.log(responseResult);
          } else {
            const errorResponse = await response.json();
            console.log(errorResponse);
            setError({ isOpen: true, message: errorResponse.error.message });
          }
        })
        .catch((err: Error) => {
          console.error('Error updating template', err);
          toast.error('Failed to update the template');
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
            // ...(networkSelected && {networkUri:networkSelected}),
            ...(subNetworkSelected && { subnetworkUri: subNetworkSelected }),

            ...(idleTimeSelected && {
              idleTtl: idleTimeSelected + timeSelected
            }),
            ...(autoTimeSelected && {
              ttl: autoTimeSelected + autoSelected
            })
          },
          peripheralsConfig: {
            ...(servicesSelected !== 'None' && {
              metastoreService: servicesSelected
            }),
            ...(clusterSelected !== '' && {
              sparkHistoryServerConfig: {
                dataprocCluster: `projects/${credentials.project_id}/locations/${credentials.region_id}/clusters/${clusterSelected}`
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
      <div className="scroll-comp">
        <div className="cluster-details-header">
          <div className="cluster-details-title">Basics</div>
        </div>
        <div className="submit-job-container">
          <form>
            <div className="create-batches-message">Display name*</div>
            <Input
              className="create-batch-style "
              value={displayNameSelected}
              onChange={e => handleDisplayNameChange(e)}
              type="text"
            />
            {displayNameValidation && (
              <div className="error-key-parent">
                <iconError.react tag="div" />
                <div className="error-key-missing">Name is required</div>
              </div>
            )}

            <div className="create-batches-message">Runtime ID*</div>

            <Input
              className="create-batch-style "
              value={runTimeSelected}
              onChange={e => handleInputChange(e)}
              type="text"
              disabled={selectedRuntimeClone !== undefined}
            />
            {runTimeValidation && (
              <div className="error-key-parent">
                <iconError.react tag="div" />
                <div className="error-key-missing">ID is required</div>
              </div>
            )}

            <div className="create-batches-message">Description*</div>
            <Input
              className="create-batch-style "
              value={desciptionSelected}
              onChange={e => handleDescriptionChange(e)}
              type="text"
            />
            {descriptionValidation && (
              <div className="error-key-parent">
                <iconError.react tag="div" />
                <div className="error-key-missing">Description is required</div>
              </div>
            )}

            <div className="create-batches-message">Runtime version*</div>

            <Input
              className="create-batch-style "
              value={versionSelected}
              onChange={e => handleVersionChange(e)}
              type="text"
            />
            {versionValidation && (
              <div className="error-key-parent">
                <iconError.react tag="div" />
                <div className="error-key-missing">Version is required</div>
              </div>
            )}
            <div className="submit-job-label-header">Network Configuration</div>
            <div className="create-batches-message">
              Establishes connectivity for the VM instances in this cluster.
            </div>
            <div className="create-batches-message">
              Networks in this project
            </div>
            <div className="create-batch-network">
              <div className="create-batch-network-message">
                Primary network
              </div>
              <div className="create-batch-network-message">Subnetwork</div>
            </div>
            <div>
              <div className="create-batch-network">
                <Select
                  search
                  className="select-primary-network-style"
                  value={networkSelected}
                  onChange={handleNetworkChange}
                  type="text"
                  options={networkList}
                />

                <Select
                  search
                  className="select-sub-network-style"
                  value={subNetworkSelected}
                  onChange={handleSubNetworkChange}
                  type="text"
                  options={subNetworkList}
                  placeholder={defaultValue}
                />
              </div>
            </div>
            <div className="create-batches-message">Network tags</div>
            <TagsInput
              className="select-job-style"
              onChange={e => setNetworkTagSelected(e)}
              addOnBlur={true}
              value={networkTagSelected}
              inputProps={{ placeholder: '' }}
            />

            <div className="create-messagelist">
              Network tags are text attributes you can add to make firewall
              rules and routes applicable to specific VM instances.
            </div>

            <div className="submit-job-label-header">Metastore</div>
            <div className="create-batches-message">Metastore project</div>
            <Select
              className="select-job-style"
              search
              selection
              placeholder={projectId}
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
                className="select-job-style"
                search
                selection
                placeholder={region}
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
                search
                selection
                value={servicesSelected}
                type="text"
                options={servicesList}
                onChange={handleServiceSelected}
                placeholder={servicesSelected}
              />
            )}
            <div className="single-line">
              <div className="create-batches-subMessage">Max idle time</div>
            </div>
            <div className="single-line">
              <Input
                className="runtimetemplate-max-idle"
                value={idleTimeSelected}
                onChange={e => handleIdleSelected(e)}
                type="text"
              />

              <Select
                className="runtimetemplate-max-idle-select"
                value={timeSelected}
                onChange={handletimeSelected}
                type="text"
                options={timeList}
              />
            </div>
            <div className="create-messagelist">
              Max notebook idle time before the session is auto-terminated 10
              mins to 330 hours.
            </div>
            {idleValidation && (
              <div className="error-key-parent">
                <iconError.react tag="div" />
                <div className="error-key-missing">Only Numeric is allowed</div>
              </div>
            )}
            <div className="single-line">
              <div className="create-batches-subMessage">Max session time</div>
            </div>
            <div className="single-line">
              <Input
                className="runtimetemplate-max-idle"
                value={autoTimeSelected}
                onChange={e => handleAutoTimeSelected(e)}
                type="text"
              />

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
                <iconError.react tag="div" />
                <div className="error-key-missing">Only Numeric is allowed</div>
              </div>
            )}

            <div className="create-batches-message">
              Python packages repository
            </div>
            <Input
              className="create-batch-style "
              value={pythonRepositorySelected}
              onChange={e => setPythonRepositorySelected(e.target.value)}
              type="text"
            />
            <div className="create-messagelist">
              Enter the URI for the repository to install Python packages. By
              default packages are installed to PyPI mirror on GCP.
            </div>

            <div className="submit-job-label-header">
              Persistent Spark History Server
            </div>
            <div className="create-batches-message">
              Choose a history server cluster to store logs in.{' '}
            </div>

            <Select
              className="select-job-style"
              search
              clearable
              value={clusterSelected}
              onChange={handleClusterSelected}
              options={clustersList}
              placeholder="History server cluster"
            />
            <div className="submit-job-label-header">Spark Properties</div>
            <LabelProperties
              labelDetail={propertyDetail}
              setLabelDetail={setPropertyDetail}
              labelDetailUpdated={propertyDetailUpdated}
              setLabelDetailUpdated={setPropertyDetailUpdated}
              runtimeUpdated={runtimeUpdated}
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
              runtimeUpdated={runtimeUpdated}
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
                  isSaveDisabled()
                    ? 'submit-button-disable-style'
                    : 'submit-button-style'
                }
                aria-label="submit Batch"
              >
                <div
                  onClick={() => {
                    if (!isSaveDisabled()) {
                      handleSave();
                    }
                  }}
                >
                  SAVE
                </div>
              </div>
              <div
                className="job-cancel-button-style"
                aria-label="cancel Batch"
              >
                <div onClick={handleCancelButton}>CANCEL</div>
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

export default CreateRunTime;
