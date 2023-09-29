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
import LabelProperties from './labelProperties';
import { authApi, toastifyCustomStyle } from '../utils/utils';

import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  ARCHIVE_FILES_MESSAGE,
  ARGUMENTS_MESSAGE,
  BASE_URL,
  FILES_MESSAGE,
  JAR_FILE_MESSAGE,
  MAIN_CLASS_MESSAGE,
  MAX_RESTART_MESSAGE,
  QUERY_FILE_MESSAGE,
  RESTART_JOB_URL,
  STATUS_RUNNING
} from '../utils/const';
import errorIcon from '../../style/icons/error_icon.svg';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Input } from '../controls/MuiWrappedInput';
import { Select } from '../controls/MuiWrappedSelect';
import { TagsInput } from '../controls/MuiWrappedTagsInput';
import { DropdownProps } from 'semantic-ui-react';
import { Autocomplete, TextField } from '@mui/material';

const iconLeftArrow = new LabIcon({
  name: 'launcher:left-arrow-icon',
  svgstr: LeftArrowIcon
});
const iconError = new LabIcon({
  name: 'launcher:error-icon',
  svgstr: errorIcon
});

function jobKey(selectedJobClone: any) {
  const jobKeys: string[] = [];

  for (const key in selectedJobClone) {
    if (key.endsWith('Job')) {
      jobKeys.push(key);
    }
  }
  return jobKeys;
}
function jobTypeFunction(jobKey: string) {
  let jobType = 'spark';
  switch (jobKey) {
    case 'sparkRJob':
      jobType = 'sparkR';
      return jobType;
    case 'pysparkJob':
      jobType = 'pySpark';
      return jobType;
    case 'sparkSqlJob':
      jobType = 'sparkSql';
      return jobType;
    default:
      return jobType;
  }
}
const handleOptionalFields = (selectedJobClone: any, jobTypeKey: string) => {
  let args: string[] = [];
  let jarFileUris: string[] = [];
  let archiveUris: string[] = [];
  let fileUris: string[] = [];
  let maxFailuresPerHour = '';
  let pythonFileUris: string[] = [];
  if (selectedJobClone[jobTypeKey].hasOwnProperty('fileUris')) {
    fileUris = [selectedJobClone[jobTypeKey].fileUris];
  }

  if (selectedJobClone[jobTypeKey].hasOwnProperty('jarFileUris')) {
    jarFileUris = [selectedJobClone[jobTypeKey].jarFileUris];
  }

  if (selectedJobClone[jobTypeKey].hasOwnProperty('args')) {
    args = [selectedJobClone[jobTypeKey].args];
  }

  if (selectedJobClone[jobTypeKey].hasOwnProperty('archiveUris')) {
    archiveUris = [selectedJobClone[jobTypeKey].archiveUris];
  }

  if (selectedJobClone[jobTypeKey].hasOwnProperty('pythonFileUris')) {
    pythonFileUris = [selectedJobClone[jobTypeKey].pythonFileUris];
  }

  if (selectedJobClone.hasOwnProperty('scheduling')) {
    maxFailuresPerHour = selectedJobClone.scheduling.maxFailuresPerHour;
  }
  return {
    fileUris,
    jarFileUris,
    args,
    archiveUris,
    pythonFileUris,
    maxFailuresPerHour
  };
};
function SubmitJob({
  setSubmitJobView,
  selectedJobClone,
  clusterResponse
}: any) {
  const [clusterList, setClusterList] = useState([{}]);
  const [jobTypeList, setJobTypeList] = useState([{}]);
  const [querySourceTypeList, setQuerySourceTypeList] = useState([{}]);
  const [clusterSelected, setClusterSelected] = useState('');
  const [jobIdSelected, setJobIdSelected] = useState('');
  const [propertyDetail, setPropertyDetail] = useState(['']);
  const [propertyDetailUpdated, setPropertyDetailUpdated] = useState(['']);
  const [parameterDetail, setParameterDetail] = useState(['']);
  const [parameterDetailUpdated, setParameterDetailUpdated] = useState(['']);
  const [hexNumber, setHexNumber] = useState('');
  const [submitDisabled, setSubmitDisabled] = useState(true);
  let mainJarFileUri = '';
  let args: string[] = [];
  let jarFileUris: string[] = [];
  let archiveUris: string[] = [];
  let fileUris: string[] = [];
  let pythonFileUris: string[] = [];
  let maxFailuresPerHour = '';
  let mainRFileUri = '';
  let jobType = 'spark';
  let mainPythonFileUri = '';
  let queryFileUri = '';
  let queryType = '';
  let queryList = '';
  let mainClass = '';
  let key: string[] | (() => string[]) = [];
  let value: string[] | (() => string[]) = [];
  let jobKeys: string[] = [];
  if (Object.keys(selectedJobClone).length !== 0) {
    jobKeys = jobKey(selectedJobClone);
    const jobTypeKey = jobKeys[0];
    jobType = jobTypeFunction(jobKeys[0]);

    if (selectedJobClone[jobTypeKey].hasOwnProperty('queryFileUri')) {
      queryFileUri = selectedJobClone[jobTypeKey].queryFileUri;
      queryType = 'queryFile';
    }
    if (selectedJobClone[jobTypeKey].hasOwnProperty('queryList')) {
      queryList = selectedJobClone[jobTypeKey].queryList.queries[0];
      queryType = 'queryText';
    }
    mainJarFileUri = selectedJobClone[jobKeys[0]].mainJarFileUri;
    mainClass = selectedJobClone[jobKeys[0]].mainClass;
    mainRFileUri = selectedJobClone[jobKeys[0]].mainRFileUri;
    mainPythonFileUri = selectedJobClone[jobKeys[0]].mainPythonFileUri;
    ({
      fileUris,
      jarFileUris,
      args,
      archiveUris,
      pythonFileUris,
      maxFailuresPerHour
    } = handleOptionalFields(selectedJobClone, jobTypeKey));
  }
  const initialMainClassSelected =
    mainJarFileUri && mainJarFileUri !== '' ? mainJarFileUri : mainClass;
  const [mainClassSelected, setMainClassSelected] = useState(
    initialMainClassSelected
  );
  const [mainRSelected, setMainRSelected] = useState(mainRFileUri);
  const [mainPythonSelected, setMainPythonSelected] =
    useState(mainPythonFileUri);
  const [jarFileSelected, setJarFileSelected] = useState([...jarFileUris]);
  const [fileSelected, setFileSelected] = useState([...fileUris]);
  const [archieveFileSelected, setArchieveFileSelected] = useState([
    ...archiveUris
  ]);
  const [argumentSelected, setArgumentSelected] = useState([...args]);
  const [maxRestartSelected, setMaxRestartSelected] =
    useState(maxFailuresPerHour);
  const [jobTypeSelected, setJobTypeSelected] = useState(jobType);
  const [additionalPythonFileSelected, setAdditionalPythonFileSelected] =
    useState([...pythonFileUris]);
  const [queryFileSelected, setQueryFileSelected] = useState(queryFileUri);
  const [querySourceSelected, setQuerySourceSelected] = useState(queryType);
  const [queryTextSelected, setQueryTextSelected] = useState(queryList);
  const [labelDetail, setLabelDetail] = useState(key);
  const [labelDetailUpdated, setLabelDetailUpdated] = useState(value);

  const [additionalPythonFileValidation, setAdditionalPythonFileValidation] =
    useState(true);
  const [jarFileValidation, setJarFileValidation] = useState(true);
  const [fileValidation, setFileValidation] = useState(true);
  const [archieveFileValidation, setArchieveFileValidation] = useState(true);
  const [mainPythonValidation, setMainPythonValidation] = useState(true);
  const [queryFileValidation, setQueryFileValidation] = useState(true);
  const [mainRValidation, setMainRValidation] = useState(true);
  const [mainClassValidation, setMainClassValidation] = useState(true);
  const [generationCompleted, setGenerationCompleted] = useState(false);
  const [keyValidation, setKeyValidation] = useState(-1);
  const [valueValidation, setValueValidation] = useState(-1);
  const [jobIdValidation, setjobIdValidation] = useState(true);
  const [jobIdSpecialValidation, setjobIdSpecialValidation] = useState(false);
  const [duplicateKeyError, setDuplicateKeyError] = useState(-1);
  const [mainClassActive, setMainClassActive] = useState(false);
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

  const handleCancelJobButton = () => {
    setSubmitJobView(false);
  };
  const handleSubmitJobView = () => {
    if (!submitDisabled) {
      submitJob();
      setSubmitJobView(false);
    }
  };

  const handleSubmitJobBackView = () => {
    setSubmitJobView(false);
  };

  const handleClusterSelected = (
    data: DropdownProps|null
  ) => {
    setClusterSelected(data!.toString());
  };

  const handleJobTypeSelected = (
    event: React.SyntheticEvent<HTMLElement, Event>,
    data: DropdownProps
  ) => {
    setJobTypeSelected(data.value!.toString());
    setFileSelected([]);
    setJarFileSelected([]);
    setAdditionalPythonFileSelected([]);
    setArchieveFileSelected([]);
    setArgumentSelected([]);
    setMainPythonSelected('');
    setMainRSelected('');
    setQueryTextSelected('');
    setQueryFileSelected('');
    setMainClassSelected('');
  };

  const handleQuerySourceTypeSelected = (
    event: React.SyntheticEvent<HTMLElement, Event>,
    data: DropdownProps
  ) => {
    setQuerySourceSelected(data.value!.toString());
  };
  interface IClusterData {
    clusterName: string;
    status: { state: string };
  }

  useEffect(() => {
    let transformClusterListData = [];
    transformClusterListData = clusterResponse.clusters.filter(
      (data: IClusterData) => {
        if (data.status.state === STATUS_RUNNING) {
            return data.clusterName
        }
      }
    );

    const keyLabelStructure = transformClusterListData.map(
      (obj: { clusterName: string }) => 
         obj.clusterName
    );

    setClusterList(keyLabelStructure);
    const jobTypeData = [
      { key: 'spark', value: 'spark', text: 'Spark' },
      { key: 'sparkR', value: 'sparkR', text: 'SparkR' },
      { key: 'sparkSql', value: 'sparkSql', text: 'SparkSql' },
      { key: 'pySpark', value: 'pySpark', text: 'PySpark' }
    ];
    const querySourceData = [
      { key: 'queryFile', value: 'queryFile', text: 'Query file' },
      { key: 'queryText', value: 'queryText', text: 'Query text' }
    ];
    setJobTypeList(jobTypeData);
    setQuerySourceTypeList(querySourceData);
  }, []);
  useEffect(() => {
    disableSubmitButtonIfInvalid();
    generateRandomHex();
  }, [
    clusterSelected,
    jobIdSelected,
    mainClassSelected,
    mainRSelected,
    mainPythonSelected,
    queryFileSelected,
    queryTextSelected,
    mainClassValidation,
    jarFileValidation,
    archieveFileValidation,
    mainRValidation,
    fileValidation,
    mainPythonValidation,
    queryFileValidation,
    keyValidation,
    valueValidation,
    jobIdValidation,
    jobIdSpecialValidation,
    duplicateKeyError,
    jarFileDuplicateValidation,
    additionalPythonFileDuplicateValidation,
    fileDuplicateValidation,
    argumentsDuplicateValidation,
    archiveDuplicateValidation
  ]);
  const disableSubmitButtonIfInvalid = () => {
    const isSparkJob = jobTypeSelected === 'spark';
    const isSparkRJob = jobTypeSelected === 'sparkR';
    const isPySparkJob = jobTypeSelected === 'pySpark';
    const isSparkSqlJob = jobTypeSelected === 'sparkSql';
    if (
      clusterSelected !== '' &&
      jobIdSelected !== '' &&
      ((isSparkJob &&
        mainClassSelected.length !== 0 &&
        jarFileValidation &&
        fileValidation &&
        archieveFileValidation &&
        keyValidation === -1 &&
        valueValidation === -1 &&
        jobIdValidation &&
        !jobIdSpecialValidation &&
        duplicateKeyError === -1 &&
        !fileDuplicateValidation &&
        !archiveDuplicateValidation &&
        !argumentsDuplicateValidation &&
        !jarFileDuplicateValidation) ||
        (isSparkRJob &&
          mainRSelected !== '' &&
          mainRValidation &&
          fileValidation &&
          keyValidation === -1 &&
          valueValidation === -1 &&
          jobIdValidation &&
          !jobIdSpecialValidation &&
          duplicateKeyError === -1! &&
          !fileDuplicateValidation &&
          !argumentsDuplicateValidation) ||
        (isPySparkJob &&
          mainPythonSelected !== '' &&
          mainPythonValidation &&
          additionalPythonFileValidation &&
          jarFileValidation &&
          fileValidation &&
          archieveFileValidation &&
          keyValidation === -1 &&
          valueValidation === -1 &&
          jobIdValidation &&
          !jobIdSpecialValidation &&
          duplicateKeyError === -1 &&
          !additionalPythonFileDuplicateValidation &&
          !fileDuplicateValidation &&
          !archiveDuplicateValidation &&
          !argumentsDuplicateValidation &&
          !jarFileDuplicateValidation) ||
        (isSparkSqlJob &&
          queryFileSelected !== '' &&
          querySourceSelected === 'queryFile' &&
          queryFileValidation &&
          jarFileValidation &&
          keyValidation === -1 &&
          valueValidation === -1 &&
          jobIdValidation &&
          !jobIdSpecialValidation &&
          duplicateKeyError === -1 &&
          !jarFileDuplicateValidation) ||
        (isSparkSqlJob &&
          queryTextSelected !== '' &&
          querySourceSelected === 'queryText' &&
          jarFileValidation &&
          keyValidation === -1 &&
          valueValidation === -1 &&
          jobIdValidation &&
          !jobIdSpecialValidation &&
          duplicateKeyError === -1 &&
          !jarFileDuplicateValidation))
    ) {
      setSubmitDisabled(false);
    } else {
      setSubmitDisabled(true);
    }
  };

  useEffect(() => {
    let jobKeys: string[] = [];
    if (Object.keys(selectedJobClone).length !== 0) {
      if (selectedJobClone.hasOwnProperty('labels')) {
        const updatedLabelDetail = Object.entries(selectedJobClone.labels).map(
          ([k, v]) => `${k}:${v}`
        );
        setLabelDetail(prevLabelDetail => [
          ...prevLabelDetail,
          ...updatedLabelDetail
        ]);
        setLabelDetailUpdated(prevLabelDetailUpdated => [
          ...prevLabelDetailUpdated,
          ...updatedLabelDetail
        ]);
        for (const key in selectedJobClone) {
          if (key.endsWith('Job')) {
            jobKeys.push(key);
          }
        }
        jobKeys = jobKey(selectedJobClone);
        if (selectedJobClone[jobKeys[0]].hasOwnProperty('properties')) {
          const updatedPropertyDetail = Object.entries(
            selectedJobClone[jobKeys[0]].properties
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
  }, []);

  const generateRandomHex = () => {
    if (!generationCompleted) {
      const crypto = window.crypto || window.Crypto;
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      const hex = array[0].toString(16);
      const paddedHex = hex.padStart(8, '0');
      setHexNumber('job-' + paddedHex);
      setJobIdSelected('job-' + paddedHex);
      setGenerationCompleted(true);
    }
  };

  const createPySparkPayload = (
    mainPythonSelected: string,
    propertyObject: { [key: string]: string },
    jarFileSelected: string[] | string,
    fileSelected: string[] | string,
    archieveFileSelected: string[] | string,
    argumentSelected: string[] | string,
    additionalPythonFileSelected: string[] | string
  ) => {
    return {
      pysparkJob: {
        mainPythonFileUri: mainPythonSelected,
        ...(propertyObject && {
          properties: propertyObject
        }),
        ...(jarFileSelected !== '' && {
          jarFileUris: jarFileSelected
        }),
        ...(fileSelected !== '' && {
          fileUris: fileSelected
        }),
        ...(archieveFileSelected !== '' && {
          archiveUris: archieveFileSelected
        }),
        ...(argumentSelected !== '' && {
          args: [argumentSelected]
        }),
        ...(additionalPythonFileSelected !== '' && {
          pythonFileUris: [additionalPythonFileSelected]
        })
      }
    };
  };

  const createSparkPayload = (
    mainClassSelected: string,
    propertyObject: { [key: string]: string },
    archieveFileSelected: string[] | string,
    fileSelected: string[] | string,
    jarFileSelected: string[] | string,
    argumentSelected: string[] | string
  ) => {
    return {
      sparkJob: {
        mainJarFileUri: mainClassSelected,
        ...(propertyObject && {
          properties: propertyObject
        }),
        ...(archieveFileSelected !== '' && {
          archiveUris: archieveFileSelected
        }),
        ...(fileSelected !== '' && {
          fileUris: [fileSelected]
        }),
        ...(jarFileSelected !== '' && {
          jarFileUris: jarFileSelected
        }),
        ...(argumentSelected !== '' && {
          args: [argumentSelected]
        })
      }
    };
  };

  const createSparkRPayload = (
    mainRSelected: string,
    propertyObject: { [key: string]: string },
    fileSelected: string[] | string,
    argumentSelected: string[] | string
  ) => {
    return {
      sparkRJob: {
        mainRFileUri: mainRSelected,
        ...(propertyObject && {
          properties: propertyObject
        }),
        ...(fileSelected !== '' && {
          fileUris: [fileSelected]
        }),
        ...(argumentSelected !== '' && {
          args: [argumentSelected]
        })
      }
    };
  };

  const createSparkSqlPayload = (
    propertyObject: { [key: string]: string },
    jarFileSelected: string[] | string,
    querySourceSelected: string,
    queryFileSelected: string,
    queryTextSelected: string
  ) => {
    return {
      sparkSqlJob: {
        ...(propertyObject && {
          properties: propertyObject
        }),
        ...(jarFileSelected !== '' && {
          jarFileUris: [jarFileSelected]
        }),
        scriptVariables: {},
        ...(querySourceSelected === 'queryFile' && {
          queryFileUri: queryFileSelected
        }),
        ...(querySourceSelected === 'queryText' && {
          queryList: { queries: [queryTextSelected] }
        })
      }
    };
  };

  const submitJob = async () => {
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
      const payload = {
        projectId: credentials.project_id,
        region: credentials.region_id,
        job: {
          placement: { clusterName: clusterSelected },
          statusHistory: [],
          reference: { jobId: jobIdSelected, projectId: '' },
          ...(maxRestartSelected !== '' && {
            scheduling: { maxFailuresPerHour: maxRestartSelected }
          }),
          ...(labelObject && {
            labels: labelObject
          }),
          ...(jobTypeSelected === 'pySpark' &&
            createPySparkPayload(
              mainPythonSelected,
              propertyObject,
              jarFileSelected,
              fileSelected,
              archieveFileSelected,
              argumentSelected,
              additionalPythonFileSelected
            )),
          ...(jobTypeSelected === 'spark' &&
            createSparkPayload(
              mainClassSelected,
              propertyObject,
              archieveFileSelected,
              fileSelected,
              jarFileSelected,
              argumentSelected
            )),
          ...(jobTypeSelected === 'sparkR' &&
            createSparkRPayload(
              mainRSelected,
              propertyObject,
              fileSelected,
              argumentSelected
            )),
          ...(jobTypeSelected === 'sparkSql' &&
            createSparkSqlPayload(
              propertyObject,
              jarFileSelected,
              querySourceSelected,
              queryFileSelected,
              queryTextSelected
            ))
        }
      };
      fetch(
        `${BASE_URL}/projects/${credentials.project_id}/regions/${credentials.region_id}/jobs:submit`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      )
        .then((response: Response) => {
          if (response.status === 200) {
            response
              .json()
              .then((responseResult: unknown) => {
                console.log(responseResult);
                toast.success(
                  `Job ${jobIdSelected} successfully submitted`,
                  toastifyCustomStyle
                );
              })
              .catch((e: Error) => {
                console.log(e);
              });
          } else {
            throw new Error(`API failed with status: ${response.status}`);
          }
        })
        .catch((err: Error) => {
          console.error('Error submitting job', err);
          toast.error('Failed to submit the job', toastifyCustomStyle);
        });
    }
  };
  const handleJobIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.target.value.length > 0
      ? setjobIdValidation(true)
      : setjobIdValidation(false);

    const regexp = /^[a-zA-Z0-9-_]+$/;
    event.target.value.search(regexp)
      ? setjobIdSpecialValidation(true)
      : setjobIdSpecialValidation(false);
    setHexNumber(event.target.value);
    const newJobId = event.target.value;
    setJobIdSelected(newJobId);
  };

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
  const handleArgumentsSelection = (
    setDuplicateValidation: (value: boolean) => void,
    listOfFiles: string[]
  ) => {
    setArgumentSelected(listOfFiles);
    handleDuplicateValidation(setDuplicateValidation, listOfFiles);
  };

  return (
    <div>
      <div className="scroll-comp">
        <div className="cluster-details-header">
          <div
            role="button"
            className="back-arrow-icon"
            onClick={() => handleSubmitJobBackView()}
          >
            <iconLeftArrow.react tag="div" className="logo-alignment-style" />
          </div>
          <div className="cluster-details-title">Submit a job</div>
        </div>
        <div className="submit-job-container">
          <div className="submit-job-label-header">Cluster</div>
          <div>Choose a cluster to run your job in.</div>

          {clusterList.length === 0 ? (
            <Input
              className="input-style"
              value="No clusters running"
              readOnly
            />
          ) : (
            <div className="select-text-overlay">
              <Autocomplete
                options={clusterList}
                value={clusterSelected}
                onChange={(_event, val) => handleClusterSelected(val)}
                renderInput={params => (
                  <TextField {...params} label="Cluster*" />
                )}
              />
            </div>
          )}
          <div className="submit-job-label-header">Job</div>
          <div className="select-text-overlay">
            <label className="select-title-text" htmlFor="job-id">
              Job ID*
            </label>
            <Input
              className="submit-job-input-style"
              onChange={e => handleJobIdChange(e)}
              type="text"
              value={hexNumber}
            />
          </div>

          {!jobIdValidation && (
            <div className="error-key-parent">
              <iconError.react tag="div" className="logo-alignment-style" />
              <div className="error-key-missing">ID is required</div>
            </div>
          )}
          {jobIdSpecialValidation && jobIdValidation && (
            <div className="error-key-parent">
              <iconError.react tag="div" className="logo-alignment-style" />
              <div className="error-key-missing">
                ID must contain only letters, numbers, hyphens, and underscores
              </div>
            </div>
          )}

          <div className="select-text-overlay">
            <label className="select-title-text" htmlFor="metastore-project">
              Job type*
            </label>
            <Select
              className="project-region-select"
              search
              onChange={handleJobTypeSelected}
              options={jobTypeList}
              value={jobTypeSelected}
            />
          </div>

          {jobTypeSelected === 'sparkSql' && (
            <>
              <div className="select-text-overlay">
                <label
                  className="select-title-text"
                  htmlFor="metastore-project"
                >
                  Query source type*
                </label>
                <Select
                  className="project-region-select"
                  search
                  onChange={handleQuerySourceTypeSelected}
                  options={querySourceTypeList}
                  value={querySourceSelected}
                />
              </div>
            </>
          )}
          {querySourceSelected === 'queryFile' &&
            jobTypeSelected === 'sparkSql' && (
              <>
                <div className="select-text-overlay">
                  <label className="select-title-text" htmlFor="query-file">
                    Query file*
                  </label>
                  <Input
                    className="submit-job-input-style"
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
                  <div className="submit-job-message-input">
                    {QUERY_FILE_MESSAGE}
                  </div>
                )}
              </>
            )}
          {querySourceSelected === 'queryText' &&
            jobTypeSelected === 'sparkSql' && (
              <>
                <div className="select-text-overlay">
                  <label className="select-title-text" htmlFor="query-text">
                    Query text*
                  </label>
                  <Input
                    className="submit-job-input-style"
                    onChange={e => setQueryTextSelected(e.target.value)}
                    value={queryTextSelected}
                  />
                </div>

                <div className="submit-job-message-input">
                  The query to execute
                </div>
              </>
            )}
          {jobTypeSelected === 'spark' && (
            <>
              <div className="select-text-overlay">
                <label
                  className="select-title-text"
                  htmlFor="main-class-or-jar"
                >
                  Main class or jar*
                </label>
                <Input
                  className="submit-job-input-style"
                  onChange={e =>
                    handleValidationFiles(
                      e.target.value,
                      setMainClassSelected,
                      setMainClassValidation
                    )
                  }
                  onBlur={() => setMainClassActive(true)}
                  addOnBlur={true}
                  value={mainClassSelected}
                />
              </div>

              {mainClassSelected === '' && mainClassActive && (
                <div className="error-key-parent">
                  <iconError.react tag="div" className="logo-alignment-style" />
                  <div className="error-key-missing">
                    Main class or jar is required
                  </div>
                </div>
              )}
              {(mainClassSelected !== '' || !mainClassActive) && (
                <div className="submit-job-message-input">
                  {MAIN_CLASS_MESSAGE}
                </div>
              )}
            </>
          )}
          {jobTypeSelected === 'sparkR' && (
            <>
              <div className="select-text-overlay">
                <label className="select-title-text" htmlFor="main-r-file">
                  Main R file*
                </label>
                <Input
                  className="submit-job-input-style"
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
          {jobTypeSelected === 'pySpark' && (
            <>
              <div className="select-text-overlay">
                <label className="select-title-text" htmlFor="main-python-file">
                  Main Python file*
                </label>
                <Input
                  className="submit-job-input-style"
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
          {jobTypeSelected === 'pySpark' && (
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
                      setAdditionalPythonFileValidation,
                      setAdditionalPythonFileDuplicateValidation
                    )
                  }
                  addOnBlur={true}
                  value={additionalPythonFileSelected}
                  inputProps={{ placeholder: '' }}
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
          {jobTypeSelected !== 'sparkR' && (
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
                      setJarFileSelected,
                      setJarFileValidation,
                      setJarFileDuplicateValidation
                    )
                  }
                  addOnBlur={true}
                  value={jarFileSelected}
                  inputProps={{ placeholder: '' }}
                />
              </div>
              {jarFileDuplicateValidation && (
                <div className="error-key-parent">
                  <iconError.react tag="div" className="logo-alignment-style" />
                  <div className="error-key-missing">
                    Duplicate paths are not allowed
                  </div>
                </div>
              )}
              {!jarFileValidation && (
                <div className="error-key-parent">
                  <iconError.react tag="div" className="logo-alignment-style" />
                  <div className="error-key-missing">
                    All files must include a valid scheme prefix: 'file://',
                    'gs://', or 'hdfs://'
                  </div>
                </div>
              )}
              {jarFileValidation && !jarFileDuplicateValidation && (
                <div className="submit-job-message">{JAR_FILE_MESSAGE}</div>
              )}
            </>
          )}
          {jobTypeSelected !== 'sparkSql' && (
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
                      setFileSelected,
                      setFileValidation,
                      setFileDuplicateValidation
                    )
                  }
                  addOnBlur={true}
                  value={fileSelected}
                  inputProps={{ placeholder: '' }}
                />
              </div>
              {fileDuplicateValidation && (
                <div className="error-key-parent">
                  <iconError.react tag="div" className="logo-alignment-style" />
                  <div className="error-key-missing">
                    Duplicate paths are not allowed
                  </div>
                </div>
              )}
              {!fileValidation && (
                <div className="error-key-parent">
                  <iconError.react tag="div" className="logo-alignment-style" />
                  <div className="error-key-missing">
                    All files must include a valid scheme prefix: 'file://',
                    'gs://', or 'hdfs://'
                  </div>
                </div>
              )}
              {fileValidation && !fileDuplicateValidation && (
                <div className="submit-job-message">{FILES_MESSAGE}</div>
              )}
            </>
          )}
          {(jobTypeSelected === 'spark' || jobTypeSelected === 'pySpark') && (
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
                      setArchieveFileSelected,
                      setArchieveFileValidation,
                      setArchiveDuplicateValidation
                    )
                  }
                  addOnBlur={true}
                  value={archieveFileSelected}
                  inputProps={{ placeholder: '' }}
                />
              </div>
              {archiveDuplicateValidation && (
                <div className="error-key-parent">
                  <iconError.react tag="div" className="logo-alignment-style" />
                  <div className="error-key-missing">
                    Duplicate paths are not allowed
                  </div>
                </div>
              )}
              {!archieveFileValidation && (
                <div className="error-key-parent">
                  <iconError.react tag="div" className="logo-alignment-style" />
                  <div className="error-key-missing">
                    All files must include a valid scheme prefix: 'file://',
                    'gs://', or 'hdfs://'
                  </div>
                </div>
              )}
              {archieveFileValidation && !archiveDuplicateValidation && (
                <div className="submit-job-message">
                  {ARCHIVE_FILES_MESSAGE}
                </div>
              )}
            </>
          )}
          {jobTypeSelected !== 'sparkSql' && (
            <>
              <div className="select-text-overlay">
                <label className="select-title-text" htmlFor="arguments">
                  Arguments
                </label>
                <TagsInput
                  className="select-job-style"
                  onChange={e =>
                    handleArgumentsSelection(setArgumentsDuplicateValidation, e)
                  }
                  value={argumentSelected}
                  inputProps={{ placeholder: '' }}
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
                <div className="submit-job-message">{ARGUMENTS_MESSAGE}</div>
              )}
            </>
          )}
          {querySourceSelected === 'queryFile' &&
            jobTypeSelected === 'sparkSql' && (
              <>
                <div className="submit-job-label-header">Query parameters</div>
                <LabelProperties
                  labelDetail={parameterDetail}
                  setLabelDetail={setParameterDetail}
                  labelDetailUpdated={parameterDetailUpdated}
                  setLabelDetailUpdated={setParameterDetailUpdated}
                  selectedJobClone={selectedJobClone ? true : false}
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
          <div className="select-text-overlay">
            <label
              className="select-title-text"
              htmlFor="max-restarts-per-hour"
            >
              Max restarts per hour
            </label>
            <Input
              className="submit-job-input-style"
              onChange={e => setMaxRestartSelected(e.target.value)}
              value={maxRestartSelected}
            />
          </div>

          <div className="submit-job-message-with-link">
            {MAX_RESTART_MESSAGE}
            <div
              className="submit-job-learn-more"
              onClick={() => {
                window.open(`${RESTART_JOB_URL}`, '_blank');
              }}
            >
              Learn more
            </div>
          </div>

          <div className="submit-job-label-header">Properties</div>
          <LabelProperties
            labelDetail={propertyDetail}
            setLabelDetail={setPropertyDetail}
            labelDetailUpdated={propertyDetailUpdated}
            setLabelDetailUpdated={setPropertyDetailUpdated}
            selectedJobClone={selectedJobClone ? true : false}
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
            selectedJobClone={selectedJobClone ? true : false}
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
                submitDisabled
                  ? 'submit-button-disable-style'
                  : 'submit-button-style'
              }
            >
              <div
                role="button"
                onClick={() => {
                  handleSubmitJobView();
                }}
              >
                SUBMIT
              </div>
            </div>
            <div className="job-cancel-button-style">
              <div
                role="button"
                onClick={() => {
                  handleCancelJobButton();
                }}
              >
                CANCEL
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SubmitJob;
