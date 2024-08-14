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

import React, { SyntheticEvent, useEffect, useState } from 'react';
import { LabIcon } from '@jupyterlab/ui-components';
import LeftArrowIcon from '../../style/icons/left_arrow_icon.svg';
import LabelProperties from './labelProperties';
import { authApi } from '../utils/utils';

import {
  ARCHIVE_FILES_MESSAGE,
  ARGUMENTS_MESSAGE,
  FILES_MESSAGE,
  JAR_FILE_MESSAGE,
  MAIN_CLASS_MESSAGE,
  MAX_RESTART_MESSAGE,
  QUERY_FILE_MESSAGE,
  RESTART_JOB_URL,
  STATUS_RUNNING
} from '../utils/const';
import errorIcon from '../../style/icons/error_icon.svg';
import { Input } from '../controls/MuiWrappedInput';
import { DropdownProps } from 'semantic-ui-react';
import { Autocomplete, TextField } from '@mui/material';
import { MuiChipsInput } from 'mui-chips-input';
import { JobService } from './jobServices';

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
  let jobType = 'Spark';
  switch (jobKey) {
    case 'sparkRJob':
      jobType = 'SparkR';
      return jobType;
    case 'pysparkJob':
      jobType = 'PySpark';
      return jobType;
    case 'sparkSqlJob':
      jobType = 'SparkSql';
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
    fileUris = selectedJobClone[jobTypeKey].fileUris;
  }

  if (selectedJobClone[jobTypeKey].hasOwnProperty('jarFileUris')) {
    jarFileUris = selectedJobClone[jobTypeKey].jarFileUris;
  }

  if (selectedJobClone[jobTypeKey].hasOwnProperty('args')) {
    args = selectedJobClone[jobTypeKey].args;
  }

  if (selectedJobClone[jobTypeKey].hasOwnProperty('archiveUris')) {
    archiveUris = selectedJobClone[jobTypeKey].archiveUris;
  }

  if (selectedJobClone[jobTypeKey].hasOwnProperty('pythonFileUris')) {
    pythonFileUris = selectedJobClone[jobTypeKey].pythonFileUris;
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
  let jobType = 'Spark';
  let mainPythonFileUri = '';
  let queryFileUri = '';
  let queryType = '';
  let queryList = '';
  let mainClass = '';
  let clusterSelectedValue = '';
  let key: string[] | (() => string[]) = [];
  let value: string[] | (() => string[]) = [];
  let jobKeys: string[] = [];
  if (Object.keys(selectedJobClone).length !== 0) {
    jobKeys = jobKey(selectedJobClone);
    const jobTypeKey = jobKeys[0];
    jobType = jobTypeFunction(jobKeys[0]);

    if (selectedJobClone[jobTypeKey].hasOwnProperty('queryFileUri')) {
      queryFileUri = selectedJobClone[jobTypeKey].queryFileUri;
      queryType = 'Query file';
    }
    if (selectedJobClone[jobTypeKey].hasOwnProperty('queryList')) {
      queryList = selectedJobClone[jobTypeKey].queryList.queries[0];
      queryType = 'Query text';
    }
    mainJarFileUri = selectedJobClone[jobKeys[0]].mainJarFileUri;
    mainClass = selectedJobClone[jobKeys[0]].mainClass;
    mainRFileUri = selectedJobClone[jobKeys[0]].mainRFileUri;
    clusterSelectedValue = selectedJobClone.placement.clusterName;

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
  const [clusterSelected, setClusterSelected] = useState(clusterSelectedValue);
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

  const handleClusterSelected = (data: DropdownProps | null) => {
    if (data !== null) {
      setClusterSelected(data!.toString());
    }
  };

  const handleJobTypeSelected = (data: DropdownProps | null) => {
    if (data !== null) {
      setJobTypeSelected(data!.toString());
    }
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
    event: SyntheticEvent<Element, Event>,
    data: DropdownProps | null
  ) => {
    if (data !== null) {
      setQuerySourceSelected(data!.toString());
    }
  };
  interface IClusterData {
    clusterName: string;
    status: string;
  }

  useEffect(() => {
    let transformClusterListData = [];
    transformClusterListData = clusterResponse.filter((data: IClusterData) => {
      if (data.status === STATUS_RUNNING) {
        return data.clusterName;
      }
    });

    const keyLabelStructure = transformClusterListData.map(
      (obj: { clusterName: string }) => obj.clusterName
    );
    setClusterList(keyLabelStructure);
    const jobTypeData = ['Spark', 'SparkR', 'SparkSql', 'PySpark'];

    setJobTypeList(jobTypeData);
    const querySourceData = ['Query file', 'Query text'];
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
    const isSparkJob = jobTypeSelected === 'Spark';
    const isSparkRJob = jobTypeSelected === 'SparkR';
    const isPySparkJob = jobTypeSelected === 'PySpark';
    const isSparkSqlJob = jobTypeSelected === 'SparkSql';
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
          querySourceSelected === 'Query file' &&
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
          querySourceSelected === 'Query text' &&
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
          args: argumentSelected
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
    const isJar = mainClassSelected.includes('.jar');
    return {
      sparkJob: {
        ...(isJar ? { mainJarFileUri: mainClassSelected } : { mainClass: mainClassSelected }),
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
          args: argumentSelected
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
          args: argumentSelected
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
        ...(querySourceSelected === 'Query file' && {
          queryFileUri: queryFileSelected
        }),
        ...(querySourceSelected === 'Query text' && {
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
          ...(jobTypeSelected === 'PySpark' &&
            createPySparkPayload(
              mainPythonSelected,
              propertyObject,
              jarFileSelected,
              fileSelected,
              archieveFileSelected,
              argumentSelected,
              additionalPythonFileSelected
            )),
          ...(jobTypeSelected === 'Spark' &&
            createSparkPayload(
              mainClassSelected,
              propertyObject,
              archieveFileSelected,
              fileSelected,
              jarFileSelected,
              argumentSelected
            )),
          ...(jobTypeSelected === 'SparkR' &&
            createSparkRPayload(
              mainRSelected,
              propertyObject,
              fileSelected,
              argumentSelected
            )),
          ...(jobTypeSelected === 'SparkSql' &&
            createSparkSqlPayload(
              propertyObject,
              jarFileSelected,
              querySourceSelected,
              queryFileSelected,
              queryTextSelected
            ))
        }
      };
      await JobService.submitJobService(payload, jobIdSelected, credentials);
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
      <div className="cluster-details-header">
        <div
          role="button"
          className="back-arrow-icon"
          onClick={() => handleSubmitJobBackView()}
        >
          <iconLeftArrow.react
            tag="div"
            className="icon-white logo-alignment-style"
          />
        </div>
        <div className="cluster-details-title">Submit a job</div>
      </div>
      <div className="submit-job-container">
        <div className="submit-job-label-header">Cluster</div>
        <div>Choose a cluster to run your job in.</div>

        {clusterList.length === 0 ? (
          <Input className="input-style" value="No clusters running" readOnly />
        ) : (
          <div className="select-text-overlay">
            <Autocomplete
              options={clusterList}
              value={clusterSelected}
              onChange={(_event, val) => handleClusterSelected(val)}
              renderInput={params => <TextField {...params} label="Cluster*" />}
            />
          </div>
        )}
        <div className="submit-job-label-header">Job</div>
        <div className="select-text-overlay">
          <Input
            className="submit-job-input-style"
            onChange={e => handleJobIdChange(e)}
            type="text"
            value={hexNumber}
            Label="Job ID*"
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
          <Autocomplete
            className="project-region-select"
            onChange={(_event, val) => handleJobTypeSelected(val)}
            options={jobTypeList}
            value={jobTypeSelected}
            renderInput={params => <TextField {...params} label=" Job type*" />}
          />
        </div>

        {jobTypeSelected === 'SparkSql' && (
          <>
            <div className="select-text-overlay">
              <Autocomplete
                className="project-region-select"
                onChange={(_event, val) =>
                  handleQuerySourceTypeSelected(_event, val)
                }
                options={querySourceTypeList}
                value={querySourceSelected}
                renderInput={params => (
                  <TextField {...params} label="Query source type*" />
                )}
              />
            </div>
          </>
        )}
        {querySourceSelected === 'Query file' &&
          jobTypeSelected === 'SparkSql' && (
            <>
              <div className="select-text-overlay">
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
                <div className="submit-job-message-input">
                  {QUERY_FILE_MESSAGE}
                </div>
              )}
            </>
          )}
        {querySourceSelected === 'Query text' &&
          jobTypeSelected === 'SparkSql' && (
            <>
              <div className="select-text-overlay">
                <Input
                  className="submit-job-input-style"
                  onChange={e => setQueryTextSelected(e.target.value)}
                  value={queryTextSelected}
                  Label=" Query text*"
                />
              </div>

              <div className="submit-job-message-input">
                The query to execute
              </div>
            </>
          )}
        {jobTypeSelected === 'Spark' && (
          <>
            <div className="select-text-overlay">
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
                Label="Main class or jar*"
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
        {jobTypeSelected === 'SparkR' && (
          <>
            <div className="select-text-overlay">
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
        {jobTypeSelected === 'PySpark' && (
          <>
            <div className="select-text-overlay">
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
                Label="Main Python file*"
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
        {jobTypeSelected === 'PySpark' && (
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
        {jobTypeSelected !== 'SparkR' && (
          <>
            <div className="select-text-overlay">
              <MuiChipsInput
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
                label="Jar files"
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
        {jobTypeSelected !== 'SparkSql' && (
          <>
            <div className="select-text-overlay">
              <MuiChipsInput
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
                label="Files"
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
        {(jobTypeSelected === 'Spark' || jobTypeSelected === 'PySpark') && (
          <>
            <div className="select-text-overlay">
              <MuiChipsInput
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
                label="Archive files"
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
              <div className="submit-job-message">{ARCHIVE_FILES_MESSAGE}</div>
            )}
          </>
        )}
        {jobTypeSelected !== 'SparkSql' && (
          <>
            <div className="select-text-overlay">
              <MuiChipsInput
                className="select-job-style"
                onChange={e =>
                  handleArgumentsSelection(setArgumentsDuplicateValidation, e)
                }
                value={argumentSelected}
                addOnBlur={true}
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
              <div className="submit-job-message">{ARGUMENTS_MESSAGE}</div>
            )}
          </>
        )}
        {querySourceSelected === 'Query file' &&
          jobTypeSelected === 'SparkSql' && (
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
          <Input
            className="submit-job-input-style"
            onChange={e => setMaxRestartSelected(e.target.value)}
            value={maxRestartSelected}
            Label="Max restarts per hour"
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
  );
}

export default SubmitJob;
