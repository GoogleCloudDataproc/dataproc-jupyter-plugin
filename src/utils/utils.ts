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

import { LabIcon } from '@jupyterlab/ui-components';
import pysparkLogo from '../../third_party/icons/pyspark_logo.svg';
import pythonLogo from '../../third_party/icons/python_logo.svg';
import scalaLogo from '../../third_party/icons/scala_logo.svg';
import sparkrLogo from '../../third_party/icons/sparkr_logo.svg';
import { requestAPI } from '../handler/handler';
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  BASE_URL,
  DCU_HOURS,
  GB_MONTHS,
  HTTP_METHOD,
  PYSPARK,
  SPARK,
  SPARKR,
  SPARKSQL,
  STATUS_CREATING,
  STATUS_DONE,
  STATUS_ERROR,
  STATUS_FAIL,
  STATUS_PROVISIONING,
  STATUS_SETUP_DONE,
  STATUS_STARTING,
  STATUS_SUCCESS
} from './const';
import { ToastOptions, toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import { KernelSpecAPI } from '@jupyterlab/services';
export interface IAuthCredentials {
  access_token?: string;
  project_id?: string;
  region_id?: string;
  config_error?: number;
  login_error?: number;
}

export const authApi = async (): Promise<IAuthCredentials | undefined> => {
  try {
    const data = await requestAPI('credentials');
    if (typeof data === 'object' && data !== null) {
      const credentials: IAuthCredentials = {
        access_token: (data as { access_token: string }).access_token,
        project_id: (data as { project_id: string }).project_id,
        region_id: (data as { region_id: string }).region_id,
        config_error: (data as { config_error: number }).config_error,
        login_error: (data as { login_error: number }).login_error
      };
      return credentials;
    } else {
      console.error('Invalid data format.');
    }
  } catch (reason) {
    console.error(`Error on GET credentials.\n${reason}`);
  }
};

/**
 * Wraps a fetch call with initial authentication to pass credentials to the request
 *
 * @param uri the endpoint to call e.g. "/clusters"
 * @param method the HTTP method used for the request
 * @param regionIdentifier option param to define what region identifier (location, region) to use
 * @param queryParams
 * @returns a promise of the fetch result
 */
export const authenticatedFetch = async (config: {
  baseUrl?: string;
  uri: string;
  method: HTTP_METHOD;
  regionIdentifier?: 'regions' | 'locations' | 'global';
  queryParams?: URLSearchParams;
}) => {
  const { baseUrl, uri, method, regionIdentifier, queryParams } = config;
  const credentials = await authApi();
  // If there is an issue with getting credentials, there is no point continuing the request.
  if (!credentials) {
    throw new Error('Error during authentication');
  }

  const requestOptions = {
    method: method,
    headers: {
      'Content-Type': API_HEADER_CONTENT_TYPE,
      Authorization: API_HEADER_BEARER + credentials.access_token
    }
  };

  const serializedQueryParams = queryParams?.toString();
  const base = baseUrl ?? BASE_URL;
  let requestUrl = `${base}/projects/${credentials.project_id}`;

  if (regionIdentifier) {
    switch (regionIdentifier) {
      case 'regions':
        requestUrl = `${requestUrl}/regions/${credentials.region_id}`;
        break;
      case 'locations':
        requestUrl = `${requestUrl}/locations/${credentials.region_id}`;
        break;
      case 'global':
        requestUrl = `${requestUrl}/global`;
        break;
      default:
        assumeNeverHit(regionIdentifier);
    }
  }

  requestUrl = `${requestUrl}/${uri}`;
  if (serializedQueryParams) {
    requestUrl = `${requestUrl}?${serializedQueryParams}`;
  }

  return fetch(requestUrl, requestOptions);
};

/**
 * Makes a request to the auth api to get the current project ID
 *
 * @returns the project id if it exists otherwise an empty string
 */
export const getProjectId = async (): Promise<string> => {
  const credentials = await authApi();
  return credentials?.project_id ?? '';
};

export const jobTimeFormat = (startTime: string) => {
  const date = new Date(startTime);

  const formattedDate = date.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true
  });

  return formattedDate;
};
interface IJobData {
  [key: string]: any;
}

export const jobTypeValue = (data: IJobData): string | undefined => {
  const result = Object.keys(data).filter(key => key.endsWith('Job'));
  const jobTypeName = result[0].split('Job')[0];
  switch (jobTypeName) {
    case 'spark':
      return SPARK;
    case 'sparkR':
      return SPARKR;
    case 'sparkSql':
      return SPARKSQL;
    case 'pyspark':
      return PYSPARK;
    default:
      return jobTypeName;
  }
};
export const jobTypeValueArguments = (data: IJobData): string => {
  const result = Object.keys(data).filter(key => key.endsWith('Job'));
  return result[0].split('Job')[0];
};

export const BatchTypeValue = (data: IJobData): string | undefined => {
  const result = Object.keys(data).filter(key => key.endsWith('Batch'));
  const batchTypeName = result[0].split('Batch')[0];
  switch (batchTypeName) {
    case 'spark':
      return SPARK;
    case 'sparkR':
      return SPARKR;
    case 'sparkSql':
      return SPARKSQL;
    case 'pyspark':
      return PYSPARK;
    default:
      return batchTypeName;
  }
};

export const jobTypeDisplay = (data: string | undefined) => {
  switch (data) {
    case 'spark':
      return 'Spark';
    case 'sparkR':
      return 'SparkR';
    case 'sparkSql':
      return 'Spark SQL';
    case 'pyspark':
      return 'PySpark';
    case 'hive':
      return 'Hive';
    default:
      return data;
  }
};

export const elapsedTime = (endTime: Date, jobStartTime: Date): string => {
  const jobEndTime = new Date(endTime);
  const elapsedMilliseconds = jobEndTime.getTime() - jobStartTime.getTime();
  const elapsedSeconds = Math.round(elapsedMilliseconds / 1000) % 60;
  const elapsedMinutes = Math.floor(elapsedMilliseconds / (1000 * 60)) % 60;
  const elapsedHours = Math.floor(elapsedMilliseconds / (1000 * 60 * 60));
  let elapsedTimeString = '';
  if (elapsedHours > 0) {
    elapsedTimeString += `${elapsedHours} hr `;
  }

  if (elapsedMinutes > 0) {
    elapsedTimeString += `${elapsedMinutes} min `;
  }
  if (elapsedSeconds > 0) {
    elapsedTimeString += `${elapsedSeconds} sec `;
  }
  return elapsedTimeString;
};

export const statusMessage = (data: { status: { state: string } }) => {
  if (data.status.state === STATUS_DONE) {
    return STATUS_SUCCESS;
  } else if (data.status.state === STATUS_ERROR) {
    return STATUS_FAIL;
  } else if (data.status.state === STATUS_SETUP_DONE) {
    return STATUS_STARTING;
  } else {
    return data.status.state;
  }
};

export const statusValue = (data: { status: { state: string } }) => {
  if (data.status.state === STATUS_CREATING) {
    return STATUS_PROVISIONING;
  } else {
    return data.status.state;
  }
};

export const checkConfig = async (
  setLoginState: React.Dispatch<React.SetStateAction<boolean>>,
  setConfigError: React.Dispatch<React.SetStateAction<boolean>>,
  setLoginError: React.Dispatch<React.SetStateAction<boolean>>
): Promise<void> => {
  const credentials = await authApi();
  if (credentials) {
    if (credentials.access_token === '') {
      localStorage.removeItem('loginState');
      if (credentials.config_error === 1) {
        setConfigError(true);
      }
      if (credentials.login_error === 1) {
        setLoginError(true);
      }
    } else {
      setLoginState(true);
    }
  }
};
export const statusMessageBatch = (data: { state: string }) => {
  if (data.state === STATUS_DONE) {
    return STATUS_SUCCESS;
  } else if (data.state === STATUS_ERROR) {
    return STATUS_FAIL;
  } else if (data.state === STATUS_SETUP_DONE) {
    return STATUS_STARTING;
  } else {
    return data.state;
  }
};

export const convertToDCUHours = (milliDcu: string) => {
  return `~ ${(Number(milliDcu) / DCU_HOURS).toFixed(3)} DCU-hours`;
};

export const convertToGBMonths = (milliDcu: string) => {
  return `~ ${(Number(milliDcu) / GB_MONTHS).toFixed(3)} GB-months`;
};

const iconPysparkLogo = new LabIcon({
  name: 'launcher:pyspark-logo-icon',
  svgstr: pysparkLogo
});
const iconPythonLogo = new LabIcon({
  name: 'launcher:python-logo-icon',
  svgstr: pythonLogo
});
const iconSparkRLogo = new LabIcon({
  name: 'launcher:sparkr-logo-icon',
  svgstr: sparkrLogo
});
const iconScalaLogo = new LabIcon({
  name: 'launcher:scala-logo-icon',
  svgstr: scalaLogo
});

export const iconDisplay = (kernelType: KernelSpecAPI.ISpecModel) => {
  if (
    kernelType?.name.includes('spylon') ||
    kernelType?.name.includes('apache')
  ) {
    return iconScalaLogo;
  } else if (kernelType?.name.includes('ir')) {
    return iconSparkRLogo;
  } else if (
    kernelType?.name.includes('pyspark') ||
    kernelType?.resources.endpointParentResource.includes('/sessions')
  ) {
    return iconPysparkLogo;
  } else {
    return iconPythonLogo;
  }
};

export interface ICellProps {
  getCellProps: () => React.TdHTMLAttributes<HTMLTableDataCellElement>;
  value: string |any;
  column: {
    Header: string;
  };
  row: {
    original: {
      status: string;
    };
  };
  render: (value: string) => React.ReactNode;
}

export const detailsPageOptionalDisplay = (data: string) => {
  switch (data) {
    case 'fileUris':
      return 'Files';
    case 'jarFileUris':
      return 'Jar files';
    case 'mainPythonFileUri':
      return 'Main python file';
    case 'queryFileUri':
      return 'Query file';
    default:
      return data;
  }
};

export const jobDetailsOptionalDisplay = (data: string) => {
  switch (data) {
    case 'mainJarFileUri':
      return 'Main class or jar';
    case 'archiveUris':
      return 'Archive uris';
    case 'pythonFileUris':
      return 'Additional python files';
    case 'mainClass':
      return 'Main class or jar';
    case 'mainRFileUri':
      return 'Spark R files';
    default:
      return detailsPageOptionalDisplay(data);
  }
};

export const batchDetailsOptionalDisplay = (data: string) => {
  switch (data) {
    case 'args':
      return 'Arguments';
    case 'queryVariables':
      return 'Script variables';
    case 'mainJarFileUri':
      return 'Main jar';
    case 'archiveUris':
      return 'Archives';
    case 'pythonFileUris':
      return 'Python files';
    case 'mainClass':
      return 'Main class';
    case 'mainRFileUri':
      return 'Main R file';
    default:
      return detailsPageOptionalDisplay(data);
  }
};

export const lastModifiedFormat = (lastModifiedDate: Date) => {
  const elapsedMilliseconds = new Date().getTime() - lastModifiedDate.getTime();
  let seconds = Math.floor(elapsedMilliseconds / 1000);

  let interval = seconds / 31536000;

  if (interval > 1) {
    return Math.floor(interval) + ' years ago';
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + ' months ago';
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + ' days ago';
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + ' hours ago';
  }
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + ' minutes ago';
  }
  return Math.floor(seconds) + ' seconds ago';
};

export const toastifyCustomStyle: ToastOptions<{}> = {
  hideProgressBar: true,
  autoClose: false,
  theme: 'dark',
  position: toast.POSITION.BOTTOM_CENTER,
  toastId: uuidv4()
};
export function assumeNeverHit(_: never): void {}
export interface IBatchInfoResponse {
  uuid: string;
  state: string;
  createTime: string;
  runtimeInfo: {
    endpoints: Record<string, string>;
    approximateUsage: {
      milliDcuSeconds: string;
      shuffleStorageGbSeconds: string;
    };
  };
  creator: string;
  runtimeConfig: {
    version: string;
    containerImage: string;
    properties: Record<string, string>;
  };
  sparkBatch: {
    mainJarFileUri: string;
    mainClass: string;
    jarFileUris: string;
  };
  pysparkBatch: {
    mainPythonFileUri: string;
  };
  sparkRBatch: {
    mainRFileUri: string;
  };
  sparkSqlBatch: {
    queryFileUri: string;
  };
  environmentConfig: {
    executionConfig: {
      serviceAccount: string;
      subnetworkUri: string;
      networkTags: string[];
      kmsKey: string;
    };
    peripheralsConfig: {
      metastoreService: string;
      sparkHistoryServerConfig: {
        dataprocCluster: string;
      };
    };
  };
  stateHistory: {
    state: string;
    stateStartTime: string;
  }[];
  stateTime: string;
}
