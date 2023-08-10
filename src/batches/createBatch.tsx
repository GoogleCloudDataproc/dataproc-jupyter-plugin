import React, { useEffect, useState } from 'react';
import { LabIcon } from '@jupyterlab/ui-components';
import LeftArrowIcon from '../../style/icons/left_arrow_icon.svg';
import 'semantic-ui-css/semantic.min.css';
import 'react-toastify/dist/ReactToastify.css';
import { Input, Radio, Select, Dropdown } from 'semantic-ui-react';
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  ARCHIVEFILESMESSAGE,
  ARGUMENTSMESSAGE,
  BASE_URL,
  BASE_URL_META,
  FILESMESSAGE,
  JARFILEMESSAGE,
  PROJECT_LIST_URL,
  QUERYFILEMESSAGE,
  REGION_URL,
  STATUS_RUNNING
} from '../utils/const';
import TagsInput from 'react-tagsinput';
import 'react-tagsinput/react-tagsinput.css';
import LabelProperties from '../jobs/labelProperties';
import { authApi } from '../utils/utils';
import { ClipLoader } from 'react-spinners';
import { toast } from 'react-toastify';
import ErrorPopup from '../utils/errorPopup';

const iconLeftArrow = new LabIcon({
  name: 'launcher:left-arrow-icon',
  svgstr: LeftArrowIcon
});

interface ICreateBatchProps {
  setCreateBatchView: (value: boolean) => void;
  regionName: string;
  projectName: string;
}
let jarFileUris: any[] = [];
let fileUris: any[] = [];
let archiveFileUris: any[] = [];
let argumentsUris: any[] = [];
let networkUris: any[] = [];
let key: any[] | (() => any[]) = [];
let value: any[] | (() => any[]) = [];
let pythonFileUris: any[] = [];

function CreateBatch({
  setCreateBatchView,
  regionName,
  projectName
}: ICreateBatchProps) {
  const [batchTypeList, setBatchTypeList] = useState([{}]);
  const [versionList, setVersionList] = useState([{}]);
  const [generationCompleted, setGenerationCompleted] = useState(false);
  const [hexNumber, setHexNumber] = useState('');
  const [batchIdSelected, setBatchIdSelected] = useState('');
  const [batchTypeSelected, setBatchTypeSelected] = useState('spark');
  const [versionSelected, setVersionSelected] = useState('2.1');
  const [selectedRadio, setSelectedRadio] = useState('mainClass');
  const [selectedEncryptionRadio, setSelectedEncryptionRadio] =
    useState('googleManaged');
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
  const [regionList, setRegionList] = useState([]);
  const [isLoadingRegion, setIsLoadingRegion] = useState(false);
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
  const [initialClustersList, setInitialClustersList] = useState<
    Array<{ key: string; value: string; text: string }>
  >([]);

  const handleCreateBatchBackView = () => {
    setCreateBatchView(false);
  };
  useEffect(() => {
    const batchTypeData = [
      { key: 'spark', value: 'spark', text: 'Spark' },
      { key: 'sparkR', value: 'sparkR', text: 'SparkR' },
      { key: 'sparkSql', value: 'sparkSql', text: 'SparkSql' },
      { key: 'pySpark', value: 'pySpark', text: 'PySpark' }
    ];

    const versionData = [
      {
        key: '2.1',
        value: '2.1',
        text: '2.1 (Spark 3.4, Java 17, Scala 2.13)'
      },
      {
        key: '2.0',
        value: '2.0',
        text: '2.0 (Spark 3.3, Java 17, Scala 2.13)'
      },
      {
        key: '1.1',
        value: '1.1',
        text: '1.1 (Spark 3.3, Java 11, Scala 2.12)'
      }
    ];
    setVersionList(versionData);
    setBatchTypeList(batchTypeData);
    generateRandomHex();
    projectListAPI();
    listClustersAPI();
    setInitialClustersList([...clustersList]);
  }, [clusterSelected]);

  function isSubmitDisabled() {
    const commonConditions = batchIdSelected === '' || regionName === '';

    switch (batchTypeSelected) {
      case 'spark':
        return (
          commonConditions ||
          (selectedRadio === 'mainClass' && mainClassSelected === '') ||
          (selectedRadio === 'mainJarURI' && mainJarSelected === '')
        );
      case 'sparkR':
        return commonConditions || mainRSelected === '';
      case 'pySpark':
        return commonConditions || mainPythonSelected === '';
      default:
        // Handle other cases or conditions if needed
        return false;
    }
  }

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
            .then((responseResult: any) => {
              let transformClusterListData = [];

              transformClusterListData = responseResult.clusters.filter(
                (data: any) => {
                  if (data.status.state === STATUS_RUNNING) {
                    return {
                      clusterName: data.clusterName
                    };
                  }
                }
              );

              const keyLabelStructure = transformClusterListData.map(
                (obj: any) => ({
                  key: obj.clusterName,
                  value: obj.clusterName,
                  text: obj.clusterName
                })
              );
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
            .then((responseResult: any) => {
              let transformClusterListData = [];

              transformClusterListData = responseResult.services.filter(
                (data: any) => {
                  return {
                    name: data.name
                  };
                }
              );

              const keyLabelStructure = transformClusterListData.map(
                (obj: any) => ({
                  key: obj.name,
                  value: obj.name,
                  text: obj.name
                })
              );
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
            .then((responseResult: any) => {
              let transformedProjectList = [];
              transformedProjectList = responseResult.projects.map(
                (data: any) => {
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

  const regionListAPI = async (projectId: any) => {
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
            .then((responseResult: any) => {
              let transformedRegionList = [];
              transformedRegionList = responseResult.items.map((data: any) => {
                return {
                  value: data.name,
                  key: data.name,
                  text: data.name
                };
              });
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


  const createPayload = (
    batchTypeSelected: string,
    mainJarSelected: string,
    mainClassSelected: string,
    propertyObject: any,
    ArchiveFilesSelected: any,
    filesSelected: any,
    jarFilesSelected: any,
    argumentsSelected: any,
    networkTagSelected: any,
    labelObject: any,
    projectName: any,
    regionName: any,
    clusterSelected: any,
    batchIdSelected: any,
    parameterObject: any,
    mainRSelected: any,
    additionalPythonFileSelected: any,
    mainPythonSelected: any,
    queryFileSelected: any
  ) => {
    const payload: any = {};
  
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
      ...(additionalPythonFileSelected.length > 0 && { pythonFileUris: additionalPythonFileSelected }),
      ...(mainPythonSelected !== '' && { mainPythonFileUri: mainPythonSelected })
    };
  }
  if (batchTypeSelected === 'sparkSql') {
    payload.sparkSqlBatch = {
      ...(queryFileSelected !== '' && { queryFileUri: queryFileSelected }),
      ...(parameterObject && { queryVariables: { query: parameterObject } })
    };}
  
    payload.labels = labelObject;
  
    payload.name = `projects/${projectName}/locations/${regionName}/batches/${batchIdSelected}`;
  
    payload.runtimeConfig = {
      version: versionSelected,
      ...(containerImageSelected !== '' && { containerImage: containerImageSelected }),
      ...(propertyObject && { properties: propertyObject })
    };
  
    payload.environmentConfig = {
      executionConfig: {
        ...(serviceAccountSelected !== '' && { serviceAccount: serviceAccountSelected }),
        subnetworkUri: 'default',
        ...(networkTagSelected.length > 0 && { networkTags: networkTagSelected })
      }
    };
  
    if (servicesSelected !== 'None' || clusterSelected !== '') {
      payload.peripheralsConfig = {
        ...(servicesSelected !== 'None' && { metastoreService: servicesSelected }),
        ...(clusterSelected !== '' && {
          sparkHistoryServerConfig: {
            dataprocCluster: `projects/${projectName}/locations/${regionName}/clusters/${clusterSelected}`
          }
        })
      };
    }
  
    payload.archiveUris = ArchiveFilesSelected.length > 0 ? ArchiveFilesSelected : undefined;
    payload.fileUris = filesSelected.length > 0 ? [filesSelected] : undefined;
    payload.jarFileUris = jarFilesSelected.length > 0 ? jarFilesSelected : undefined;
    payload.args = argumentsSelected.length > 0 ? [argumentsSelected] : undefined;
  
    return payload;
  };
  

  const handleSubmit = async () => {
    const credentials = await authApi();
    if (credentials) {
      const labelObject: { [key: string]: string } = {};
      labelDetailUpdated.forEach((label: string) => {
        const key = label.split(':')[0];
        const value = label.split(':')[1];
        labelObject[key] = value;
      });
      const propertyObject: { [key: string]: string } = {};
      propertyDetailUpdated.forEach((label: string) => {
        const key = label.split(':')[0];
        const value = label.split(':')[1];
        propertyObject[key] = value;
      });
      const parameterObject: { [key: string]: string } = {};
      parameterDetailUpdated.forEach((label: string) => {
        const key = label.split(':')[0];
        const value = label.split(':')[1];
        parameterObject[key] = value;
      });
      const payload = 
      createPayload(
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
          )
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
        .then(async (response: any) => {
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
        .catch((err: any) => {
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
    const newBatchId = event.target.value;
    setBatchIdSelected(newBatchId);
  };
  const handleBatchTypeSelected = (event: any, data: any) => {
    setBatchTypeSelected(data.value);
  };
  const handleVersionSelected = (event: any, data: any) => {
    setVersionSelected(data.value);
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

  const handleClusterSelected = (event: any, data: any) => {
    setClusterSelected(data.value);
  };

  const handleSearchChange = (event: any, data: { searchQuery: string }) => {
    const { searchQuery } = data;

    const filteredOptions = initialClustersList.filter(option =>
      option.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setClustersList(filteredOptions);
  };

  const handleSearchClear = () => {
    setClustersList(clustersList);
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
            <div className="create-batches-message">Region*</div>
            <Select
              className="create-batch-style "
              value={regionName}
              type="text"
              disabled={true}
              options={[]}
              placeholder={regionName}
            />
            <div className="submit-job-label-header">Container</div>
            <div className="create-batches-message">Batch type*</div>
            <Select
              className="create-batch-style "
              value={batchTypeSelected}
              type="text"
              options={batchTypeList}
              onChange={handleBatchTypeSelected}
            />
            <div className="create-batches-message">Runtime version*</div>
            <Select
              className="create-batch-style "
              value={versionSelected}
              type="text"
              options={versionList}
              onChange={handleVersionSelected}
            />
            {batchTypeSelected === 'spark' && (
              <div>
                <div>
                  <div className="create-batch-radio">
                    <Radio
                      className="select-batch-radio-style"
                      value="mainClass"
                      checked={selectedRadio === 'mainClass'}
                      onChange={() => setSelectedRadio('mainClass')}
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
                      onChange={() => setSelectedRadio('mainJarURI')}
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
                      onChange={e => setMainJarSelected(e.target.value)}
                      type="text"
                    />
                  </div>
                )}
              </div>
            )}

            {batchTypeSelected === 'sparkR' && (
              <>
                <div className="create-batch-message">Main R file*</div>
                <Input
                  //placeholder="Main R file*"
                  className="create-batch-style"
                  onChange={e => setMainRSelected(e.target.value)}
                  addOnBlur={true}
                  value={mainRSelected}
                />
              </>
            )}
            {batchTypeSelected === 'pySpark' && (
              <>
                <div className="create-batch-message">Main python file*</div>
                <Input
                  //placeholder="Main R file*"
                  className="create-batch-style"
                  onChange={e => setMainPythonSelected(e.target.value)}
                  addOnBlur={true}
                  value={mainPythonSelected}
                />
                <div className="submit-job-message">{QUERYFILEMESSAGE}</div>
              </>
            )}
            {batchTypeSelected === 'pySpark' && (
              <>
                <div className="create-batches-message">
                  Additional python files
                </div>
                <TagsInput
                  className="create-batch-style"
                  onChange={e => setAdditionalPythonFileSelected(e)}
                  addOnBlur={true}
                  value={additionalPythonFileSelected}
                  inputProps={{ placeholder: '' }}
                />
              </>
            )}
            {batchTypeSelected === 'sparkSql' && (
              <>
                <div className="create-batch-message">Query file*</div>
                <Input
                  //placeholder="Main R file*"
                  className="create-batch-style"
                  onChange={e => setQueryFileSelected(e.target.value)}
                  addOnBlur={true}
                  value={queryFileSelected}
                />
                <div className="submit-job-message">{QUERYFILEMESSAGE}</div>
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
            <div className="create-messagelist">
              Specify a custom container image to add Java or Python
              dependencies not provided by the default container image. You must
              host your custom container on Container Registry or Artifact
              Registry . Learn more{' '}
            </div>
            {batchTypeSelected === 'spark' ||
              (batchTypeSelected === 'sparkSql' && (
                <>
                  <div className="create-batches-message">Jar files</div>
                  <TagsInput
                    className="create-batch-style"
                    onChange={e => setJarFilesSelected(e)}
                    addOnBlur={true}
                    value={jarFilesSelected}
                    inputProps={{ placeholder: '' }}
                  />
                  <div className="create-messagelist">{JARFILEMESSAGE}</div>
                </>
              ))}
            {batchTypeSelected !== 'sparkSql' && (
              <>
                <div className="create-batches-message">Files</div>
                <TagsInput
                  className="create-batch-style"
                  onChange={e => setFilesSelected(e)}
                  addOnBlur={true}
                  value={filesSelected}
                  inputProps={{ placeholder: '' }}
                />
                <div className="create-messagelist">{FILESMESSAGE}</div>
              </>
            )}
            {batchTypeSelected !== 'sparkSql' && (
              <>
                <div className="create-batches-message">Archive files</div>
                <TagsInput
                  className="create-batch-style"
                  onChange={e => setArchiveFileSelected(e)}
                  addOnBlur={true}
                  value={ArchiveFilesSelected}
                  inputProps={{ placeholder: '' }}
                />
                <div className="create-messagelist">{ARCHIVEFILESMESSAGE}</div>
              </>
            )}
            {batchTypeSelected !== 'sparkSql' && (
              <>
                <div className="create-batches-message">Arguments</div>
                <TagsInput
                  className="create-batch-style"
                  onChange={e => setArgumentsSelected(e)}
                  addOnBlur={true}
                  value={argumentsSelected}
                  inputProps={{ placeholder: '' }}
                />
                <div className="create-messagelist">{ARGUMENTSMESSAGE}</div>
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
              Learn more
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
                  value={versionSelected}
                  type="text"
                  options={[]}
                />

                <Select
                  className="select-sub-network-style"
                  value={versionSelected}
                  type="text"
                  options={[]}
                />
              </div>
            </div>
            <div className="create-batches-message">Network tags*</div>
            <TagsInput
              className="create-batch-style"
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
                  Manage via Google Cloud Key Management Service
                </div>
                {selectedEncryptionRadio === 'customerManaged' && (
                  <div className="create-batch-input">
                    <Dropdown
                      className="create-batch-style"
                      placeholder="Select an option"
                      search
                      selection
                      options={versionList}
                      value={versionSelected}
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
              metastore.{' '}
            </div>
            <div className="create-messagelist">
              We recommend this option to persist table metadata when the batch
              finishes processing. A metastore can be shared across many
              serverless batches in different projects and GCP regions.
            </div>
            <div className="create-batches-message">Metastore project</div>
            <Select
              placeholder={projectId}
              className="create-batch-style "
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
                className="create-batch-style "
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
                className="create-batch-style "
                value={servicesSelected}
                type="text"
                options={servicesList}
                onChange={handleServiceSelected}
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
              className="create-batch-style"
              search
              selection
              value={clusterSelected}
              onSearchChange={handleSearchChange}
              onClear={handleSearchClear}
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
              <div className="job-cancel-button-style">
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
