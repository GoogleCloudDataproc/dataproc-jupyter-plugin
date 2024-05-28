/**
 * @license
 * Copyright 2024 Google LLC
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

import 'react-toastify/dist/ReactToastify.css';
import { authApi, loggedFetch, toastifyCustomStyle } from '../utils/utils';
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  QUERY_DATABASE,
  QUERY_TABLE,
  gcpServiceUrls
} from '../utils/const';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';
import { toast } from 'react-toastify';

interface IColumn {
  name: string;
  schema: {
    columns: {
      column: string;
      type: string;
      mode: string;
      description: string;
    }[];
  };
  fullyQualifiedName: string;
  displayName: string;
  column: string;
  type: string;
  mode: string;
  description: string;
}

interface ITableResponse {
  results: Array<{
    displayName: string;
    relativeResourceName: string;
    description: string;
  }>;
}

interface IDatabaseResponse {
  results?: Array<{
    displayName: string;
    description: string;
  }>;
  error?: {
    message: string;
    code: string;
  };
}

interface IClusterDetailsResponse {
  error: {
    code: number;
    message: string;
  };
  config?: {
    metastoreConfig?: {
      dataprocMetastoreService?: string;
    };
  };
}

interface ISessionDetailsResponse {
  error: {
    code: number;
    message: string;
  };
  environmentConfig?: {
    peripheralsConfig?: {
      metastoreService?: string;
    };
  };
}

export class DpmsService {
  static getColumnDetailsAPIService = async (
    name: string,
    notebookValue: string,
    setColumnResponse: any,
    setIsLoading: (value: boolean) => void,
    data: any
  ) => {
    const credentials = await authApi();
    const { COLUMN } = await gcpServiceUrls;
    if (credentials && notebookValue) {
      loggedFetch(`${COLUMN}${name}`, {
        method: 'GET',
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token,
          'X-Goog-User-Project': credentials.project_id || ''
        }
      })
        .then((response: Response) => {
          response
            .json()
            .then(async (responseResult: IColumn) => {
              setColumnResponse((prevResponse: IColumn[]) => [
                ...prevResponse,
                responseResult
              ]);
              if (data) {
                setIsLoading(false);
              }
            })
            .catch((e: Error) => {
              console.error(e);
            });
        })
        .catch((err: Error) => {
          DataprocLoggingService.log(
            'Error getting column details',
            LOG_LEVEL.ERROR
          );
          toast.error(
            `Error getting column details : ${err}`,
            toastifyCustomStyle
          );
        });
    }
  };
  static getTableDetailsAPIService = async (
    database: string,
    notebookValue: string,
    dataprocMetastoreServices: string,
    totalDatabases: number,
    setTotalTables: (value: number) => void,
    setTotalDatabases: (value: number) => void,
    setEntries: (value: string[]) => void,
    setTableDescription: (value: Record<string, string>) => void
  ) => {
    const credentials = await authApi();
    const { CATALOG } = await gcpServiceUrls;
    if (credentials && notebookValue) {
      const requestBody = {
        query: `${QUERY_TABLE}${credentials.project_id}.${credentials.region_id}.${dataprocMetastoreServices}.${database}`,
        scope: {
          includeProjectIds: [credentials.project_id]
        }
      };
      loggedFetch(`${CATALOG}`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token,
          'X-Goog-User-Project': credentials.project_id || ''
        }
      })
        .then((response: Response) => {
          response
            .json()
            .then((responseResult: ITableResponse) => {
              const filteredEntries =
                responseResult &&
                responseResult.results &&
                responseResult.results.filter(
                  (entry: { displayName: string }) => entry.displayName
                );
              const tableNames: string[] = [];
              const entryNames: string[] = [];
              const updatedTableDetails: { [key: string]: string } = {};
              if (filteredEntries !== undefined) {
                filteredEntries &&
                  filteredEntries.forEach(
                    (entry: {
                      displayName: string;
                      relativeResourceName: string;
                      description: string;
                    }) => {
                      tableNames.push(entry.displayName);
                      entryNames.push(entry.relativeResourceName);
                      const description = entry.description || 'None';
                      updatedTableDetails[entry.displayName] = description;
                    }
                  );
              } else {
                setTotalDatabases(totalDatabases - 1 || 0);
              }
              setEntries(entryNames);
              setTableDescription(updatedTableDetails);
              setTotalTables(tableNames.length);
            })
            .catch((e: Error) => {
              console.error(e);
              if (totalDatabases !== undefined) {
                setTotalDatabases(totalDatabases - 1 || 0);
              }
            });
        })
        .catch((err: Error) => {
          DataprocLoggingService.log(
            'Error getting table details',
            LOG_LEVEL.ERROR
          );
          toast.error(
            `Error getting table details : ${err}`,
            toastifyCustomStyle
          );
        });
    }
  };
  static getDatabaseDetailsAPIService = async (
    notebookValue: string,
    dataprocMetastoreServices: string,
    setDatabaseDetails: (value: Record<string, string>) => void,
    setDatabaseNames: (value: string[]) => void,
    setTotalDatabases: (value: number) => void,
    setApiError: (value: boolean) => void,
    setSchemaError: (value: boolean) => void,
    setNoDpmsInstance: (value: boolean) => void,
    setIsLoading: (value: boolean) => void,
    setApiMessage: (value: string) => void
  ) => {
    const credentials = await authApi();
    const { CATALOG } = await gcpServiceUrls;
    if (credentials && notebookValue) {
      const requestBody = {
        query: `${QUERY_DATABASE}${credentials.project_id}.${credentials.region_id}.${dataprocMetastoreServices}`,
        scope: {
          includeProjectIds: [credentials.project_id]
        }
      };
      loggedFetch(`${CATALOG}`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token,
          'X-Goog-User-Project': credentials.project_id || ''
        }
      })
        .then((response: Response) => {
          response
            .json()
            .then(async (responseResult: IDatabaseResponse) => {
              if (responseResult?.results) {
                const filteredEntries = responseResult.results.filter(
                  (entry: { displayName: string }) => entry.displayName
                );
                const databaseNames: string[] = [];
                const updatedDatabaseDetails: { [key: string]: string } = {};
                filteredEntries.forEach(
                  (entry: { description: string; displayName: string }) => {
                    databaseNames.push(entry.displayName);
                    const description = entry.description || 'None';
                    updatedDatabaseDetails[entry.displayName] = description;
                  }
                );
                setDatabaseDetails(updatedDatabaseDetails);
                setDatabaseNames(databaseNames);
                setTotalDatabases(databaseNames.length);
                setApiError(false);
                setSchemaError(false);
              } else {
                if (responseResult?.error?.code) {
                  setApiError(true);
                  setApiMessage(responseResult?.error?.message);
                  setSchemaError(false);
                } else {
                  setSchemaError(true);
                  setApiError(false);
                }
                setNoDpmsInstance(true);
                setIsLoading(false);
              }
            })
            .catch((e: Error) => {
              console.error(e);
            });
        })
        .catch((err: Error) => {
          DataprocLoggingService.log(
            'Error getting database details',
            LOG_LEVEL.ERROR
          );
          toast.error(
            `Error getting database details : ${err}`,
            toastifyCustomStyle
          );
        });
    }
  };
  static getClusterDetailsAPIService = async (
    notebookValue: string,
    setIsLoading: (value: boolean) => void,
    setCluster: (value: boolean) => void,
    setNoDpmsInstance: (value: boolean) => void,
    setDataprocMetastoreServices: (value: string) => void
  ) => {
    const credentials = await authApi();
    const { DATAPROC } = await gcpServiceUrls;
    if (credentials && notebookValue) {
      loggedFetch(
        `${DATAPROC}/projects/${credentials.project_id}/regions/${credentials.region_id}/clusters/${notebookValue}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      )
        .then((response: Response) => {
          response
            .json()
            .then(async (responseResult: IClusterDetailsResponse) => {
              const metastoreServices =
                responseResult.config?.metastoreConfig
                  ?.dataprocMetastoreService;
              if (metastoreServices) {
                const lastIndex = metastoreServices.lastIndexOf('/');
                const instanceName =
                  lastIndex !== -1
                    ? metastoreServices.substring(lastIndex + 1)
                    : '';
                setDataprocMetastoreServices(instanceName);
                setNoDpmsInstance(false);
                setCluster(false);
              } else {
                setNoDpmsInstance(true);
                setCluster(true);
                if (responseResult?.error?.code) {
                  toast.error(
                    responseResult?.error?.message,
                    toastifyCustomStyle
                  );
                }
              }
            })
            .catch((e: Error) => {
              console.error(e);
            });
        })
        .catch((err: Error) => {
          setIsLoading(false);
          DataprocLoggingService.log(
            'Error listing session details',
            LOG_LEVEL.ERROR
          );
          toast.error(
            `Failed to fetch session details : ${err}`,
            toastifyCustomStyle
          );
        });
    }
  };
  static getSessionDetailsAPIService = async (
    notebookValue: string,
    setIsLoading: (value: boolean) => void,
    setSession: (value: boolean) => void,
    setNoDpmsInstance: (value: boolean) => void,
    setDataprocMetastoreServices: (value: string) => void
  ) => {
    const credentials = await authApi();
    const { DATAPROC } = await gcpServiceUrls;
    if (credentials && notebookValue) {
      loggedFetch(
        `${DATAPROC}/projects/${credentials.project_id}/locations/${credentials.region_id}/sessionTemplates/${notebookValue}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      )
        .then((response: Response) => {
          response
            .json()
            .then(async (responseResult: ISessionDetailsResponse) => {
              const metastoreServices =
                responseResult.environmentConfig?.peripheralsConfig
                  ?.metastoreService;
              if (metastoreServices) {
                const lastIndex = metastoreServices.lastIndexOf('/');
                const instanceName =
                  lastIndex !== -1
                    ? metastoreServices.substring(lastIndex + 1)
                    : '';
                setDataprocMetastoreServices(instanceName);
                setNoDpmsInstance(false);
                setSession(false);
              } else {
                setNoDpmsInstance(true);
                setSession(true);
                if (responseResult?.error?.code) {
                  toast.error(
                    responseResult?.error?.message,
                    toastifyCustomStyle
                  );
                }
              }
            })
            .catch((e: Error) => {
              console.error(e);
            });
        })
        .catch((err: Error) => {
          setIsLoading(false);
          DataprocLoggingService.log(
            'Error listing clusters details',
            LOG_LEVEL.ERROR
          );
          toast.error(
            `Failed to fetch cluster details : ${err}`,
            toastifyCustomStyle
          );
        });
    }
  };
}
