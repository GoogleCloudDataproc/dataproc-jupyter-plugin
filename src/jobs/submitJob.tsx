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
import { Input, Select } from 'semantic-ui-react';
import 'semantic-ui-css/semantic.min.css';
import LabelProperties from './labelProperties';
import { authApi } from '../utils/utils';
import TagsInput from 'react-tagsinput';
import 'react-tagsinput/react-tagsinput.css';
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
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
const handleOptionalFields = (selectedJobClone: any, jobTypeKey: any) => {
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
function SubmitJob(
  this: any,
  { setSubmitJobView, selectedJobClone, clusterResponse }: any
) {
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
  const [duplicateKeyError, setDuplicateKeyError] = useState(-1);
  const [mainClassActive, setMainClassActive] = useState(false);

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

  const handleClusterSelected = (event: any, data: any) => {
    setClusterSelected(data.value);
  };

  const handleJobTypeSelected = (event: any, data: any) => {
    setJobTypeSelected(data.value);
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
  const handleQuerySourceTypeSelected = (event: any, data: any) => {
    setQuerySourceSelected(data.value);
  };

  useEffect(() => {
    let transformClusterListData = [];
    transformClusterListData = clusterResponse.clusters.filter((data: any) => {
      if (data.status.state === STATUS_RUNNING) {
        return {
          clusterName: data.clusterName
        };
      }
    });

    const keyLabelStructure = transformClusterListData.map((obj: any) => ({
      key: obj.clusterName,
      value: obj.clusterName,
      text: obj.clusterName
    }));

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
    duplicateKeyError
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
        duplicateKeyError === -1) ||
        (isSparkRJob &&
          mainRSelected !== '' &&
          mainRValidation &&
          fileValidation &&
          keyValidation === -1 &&
          valueValidation === -1 &&
          jobIdValidation &&
          duplicateKeyError === -1) ||
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
          duplicateKeyError === -1) ||
        (isSparkSqlJob &&
          queryFileSelected !== '' &&
          querySourceSelected === 'queryFile' &&
          queryFileValidation &&
          jarFileValidation &&
          keyValidation === -1 &&
          valueValidation === -1 &&
          jobIdValidation &&
          duplicateKeyError === -1) ||
        (isSparkSqlJob &&
          queryTextSelected !== '' &&
          querySourceSelected === 'queryText' &&
          jarFileValidation &&
          keyValidation === -1 &&
          valueValidation === -1 &&
          jobIdValidation &&
          duplicateKeyError === -1))
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
    mainPythonSelected: any,
    propertyObject: any,
    jarFileSelected: any,
    fileSelected: any,
    archieveFileSelected: any,
    argumentSelected: any,
    additionalPythonFileSelected: any
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
    mainClassSelected: any,
    propertyObject: any,
    archieveFileSelected: any,
    fileSelected: any,
    jarFileSelected: any,
    argumentSelected: any
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
    mainRSelected: any,
    propertyObject: any,
    fileSelected: any,
    argumentSelected: any
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
    propertyObject: any,
    jarFileSelected: any,
    querySourceSelected: string,
    queryFileSelected: any,
    queryTextSelected: any
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
        .then((response: any) => {
          if (response.status === 200) {
            response
              .json()
              .then((responseResult: any) => {
                console.log(responseResult);
                toast.success(`Job ${jobIdSelected} successfully submitted`);
              })
              .catch((e: any) => {
                console.log(e);
              });
          } else {
            throw new Error(`API failed with status: ${response.status}`);
          }
        })
        .catch((err: any) => {
          console.error('Error submitting job', err);
          toast.error('Failed to submit the job');
        });
    }
  };
  const handleInputChange = (event: any) => {
    event.target.value.length > 0
      ? setjobIdValidation(true)
      : setjobIdValidation(false);
    setHexNumber(event.target.value);
    const newJobId = event.target.value;
    setJobIdSelected(newJobId);
  };

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

  return (
    <div>
      <div className="scroll-comp">
        <div className="cluster-details-header">
          <div
            role="button"
            className="back-arrow-icon"
            onClick={() => handleSubmitJobBackView()}
          >
            <iconLeftArrow.react tag="div" />
          </div>
          <div className="cluster-details-title">Submit a job</div>
        </div>
        <div className="submit-job-container">
          <div className="submit-job-label-header">Cluster</div>
          <div className="submit-job-cluster-message">
            Choose a cluster to run your job in.
          </div>
          {clusterList.length === 0 ? (
            <Input
              className="input-style"
              value="No clusters running"
              readOnly
            />
          ) : (
            <Select
              search
              placeholder="Cluster*"
              onChange={handleClusterSelected}
              className="select-job-style"
              options={clusterList}
              value={clusterSelected}
            />
          )}
          <div className="submit-job-label-header">Job</div>
          <div className="submit-job-cluster-message">Job ID*</div>
          <Input
            className="input-style"
            onChange={e => handleInputChange(e)}
            type="text"
            value={hexNumber}
          />
          {!jobIdValidation && (
            <div className="error-key-parent">
              <iconError.react tag="div" />
              <div className="error-key-missing">ID is required</div>
            </div>
          )}
          <div className="submit-job-cluster-message">Job type*</div>

          <Select
            search
            onChange={handleJobTypeSelected}
            className="select-job-style"
            options={jobTypeList}
            value={jobTypeSelected}
          />

          {jobTypeSelected === 'sparkSql' && (
            <>
              <div className="submit-job-cluster-message">
                Query source type*
              </div>
              <Select
                search
                onChange={handleQuerySourceTypeSelected}
                className="select-job-style"
                options={querySourceTypeList}
                value={querySourceSelected}
              />
            </>
          )}
          {querySourceSelected === 'queryFile' &&
            jobTypeSelected === 'sparkSql' && (
              <>
                <div className="submit-job-cluster-message">Query file*</div>
                <Input
                  className="input-style"
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
                  <div className="submit-job-message">{QUERY_FILE_MESSAGE}</div>
                )}
              </>
            )}
          {querySourceSelected === 'queryText' &&
            jobTypeSelected === 'sparkSql' && (
              <>
                <div className="submit-job-cluster-message">Query text*</div>
                <Input
                  className="input-style"
                  onChange={e => setQueryTextSelected(e.target.value)}
                  value={queryTextSelected}
                />
                <div className="submit-job-message">The query to execute</div>
              </>
            )}
          {jobTypeSelected === 'spark' && (
            <>
              <div className="submit-job-cluster-message">
                Main class or jar*
              </div>
              <Input
                className="input-style"
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
              {mainClassSelected === '' && mainClassActive && (
                <div className="error-key-parent">
                  <iconError.react tag="div" />
                  <div className="error-key-missing">
                    Main class or jar is required
                  </div>
                </div>
              )}
              {(mainClassSelected !== '' || !mainClassActive) && (
                <div className="submit-job-message">{MAIN_CLASS_MESSAGE}</div>
              )}
            </>
          )}
          {jobTypeSelected === 'sparkR' && (
            <>
              <div className="submit-job-cluster-message">Main R file*</div>
              <Input
                className="input-style"
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
                    File must include a valid scheme prefix: 'file://', 'gs://',
                    or 'hdfs://'
                  </div>
                </div>
              )}
              {mainRValidation && (
                <div className="submit-job-message">{QUERY_FILE_MESSAGE}</div>
              )}
            </>
          )}
          {jobTypeSelected === 'pySpark' && (
            <>
              <div className="submit-job-cluster-message">
                Main Python file*
              </div>
              <Input
                className="input-style"
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
                    File must include a valid scheme prefix: 'file://', 'gs://',
                    or 'hdfs://'
                  </div>
                </div>
              )}
              {mainPythonValidation && (
                <div className="submit-job-message">{QUERY_FILE_MESSAGE}</div>
              )}
            </>
          )}
          {jobTypeSelected === 'pySpark' && (
            <>
              <div className="submit-job-cluster-message">
                Additional python files
              </div>
              <TagsInput
                className="input-style"
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
          {jobTypeSelected !== 'sparkR' && (
            <>
              <div className="submit-job-cluster-message">Jar files</div>
              <TagsInput
                className="select-job-style"
                onChange={e =>
                  handleValidationFiles(
                    e,
                    setJarFileSelected,
                    setJarFileValidation
                  )
                }
                addOnBlur={true}
                value={jarFileSelected}
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
                <div className="submit-job-message">{JAR_FILE_MESSAGE}</div>
              )}
            </>
          )}
          {jobTypeSelected !== 'sparkSql' && (
            <>
              <div className="submit-job-cluster-message">Files</div>
              <TagsInput
                className="select-job-style"
                onChange={e =>
                  handleValidationFiles(e, setFileSelected, setFileValidation)
                }
                addOnBlur={true}
                value={fileSelected}
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
                <div className="submit-job-message">{FILES_MESSAGE}</div>
              )}
            </>
          )}
          {(jobTypeSelected === 'spark' || jobTypeSelected === 'pySpark') && (
            <>
              <div className="submit-job-cluster-message">Archive files</div>
              <TagsInput
                className="select-job-style"
                onChange={e =>
                  handleValidationFiles(
                    e,
                    setArchieveFileSelected,
                    setArchieveFileValidation
                  )
                }
                addOnBlur={true}
                value={archieveFileSelected}
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
                <div className="submit-job-message">
                  {ARCHIVE_FILES_MESSAGE}
                </div>
              )}
            </>
          )}
          {jobTypeSelected !== 'sparkSql' && (
            <>
              <div className="submit-job-cluster-message">Arguments</div>
              <TagsInput
                className="select-job-style"
                onChange={e => setArgumentSelected(e)}
                value={argumentSelected}
                inputProps={{ placeholder: '' }}
              />
              <div className="submit-job-message">{ARGUMENTS_MESSAGE}</div>
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
          <div className="submit-job-cluster-message">
            Max restarts per hour
          </div>
          <Input
            className="input-style"
            onChange={e => setMaxRestartSelected(e.target.value)}
            value={maxRestartSelected}
          />
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
          <ToastContainer />
        </div>
      </div>
    </div>
  );
}

export default SubmitJob;
