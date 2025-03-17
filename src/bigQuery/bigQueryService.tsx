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
import { requestAPI } from '../handler/handler';
import { toast } from 'react-toastify';
import { toastifyCustomStyle } from '../utils/utils';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { PLUGIN_ID } from '../utils/const';

interface IPreviewColumn {
  Header: string;
  accessor: string;
}

export class BigQueryService {
  static bigQueryPreviewAPIService = async (
    columns: IPreviewColumn[],
    tableId: string,
    dataSetId: string,
    setIsLoading: (value: boolean) => void,
    projectId: string,
    maxResults: number,
    pageIndex: number,
    setTotalRowSize: (value: string) => void,
    setPreviewDataList: any
  ) => {
    setIsLoading(true);
    try {
      const startIndex = pageIndex * maxResults;
      const data: any = await requestAPI(
        `bigQueryPreview?project_id=${projectId}&dataset_id=${dataSetId}&table_id=${tableId}&max_results=${maxResults}&start_index=${startIndex}`
      );

      if (data.error) {
        toast.error(data.error, toastifyCustomStyle);
        setIsLoading(false);
      } else if (data.totalRows == 0) {
        setIsLoading(false);
      } else {
        let transformRowInfoList: any = [];
        data.rows.forEach((rowInfo: any) => {
          let transformRowInfo: any = {};
          rowInfo['f'].forEach((fieldInfo: any, index: number) => {
            transformRowInfo[columns[index].Header] =
              typeof fieldInfo['v'] === 'object'
                ? JSON.stringify(fieldInfo['v'])
                : fieldInfo['v'];
          });
          transformRowInfoList.push(transformRowInfo);
        });
        setPreviewDataList(transformRowInfoList);
        setIsLoading(false);
        setTotalRowSize(data.totalRows);
      }
    } catch (reason) {
      toast.error(
        `Error in calling BigQuery Preview API : ${reason}`,
        toastifyCustomStyle
      );
    }
  };

  static getBigQueryColumnDetailsAPIService = async (
    datasetId: string,
    tableId: string,
    projectId: string,
    setIsIconLoading: (value: boolean) => void,
    setSchemaResponse: any
  ) => {
    try {
      const data: any = await requestAPI(
        `bigQueryTableInfo?project_id=${projectId}&dataset_id=${datasetId}&table_id=${tableId}`
      );
      setSchemaResponse(data);
      setIsIconLoading(false);
    } catch (reason) {
      toast.error(
        `Failed to fetch big query schema : ${reason}`,
        toastifyCustomStyle
      );
      setIsIconLoading(false);
    }
  };

  static getBigQuerySchemaInfoAPIService = async (
    datasetId: string,
    tableId: string,
    projectId: string,
    setSchemaInfoResponse: any
  ) => {
    try {
      const data: any = await requestAPI(
        `bigQueryTableInfo?project_id=${projectId}&dataset_id=${datasetId}&table_id=${tableId}`
      );
      if (data.schema && data.schema.fields) {
        setSchemaInfoResponse(data.schema.fields);
      } else {
        setSchemaInfoResponse([]);
      }
    } catch (reason) {
      toast.error(
        `Failed to fetch big query schema : ${reason}`,
        toastifyCustomStyle
      );
    }
  };

  static getBigQueryDatasetsAPIService = async (
    notebookValue: string,
    settingRegistry: ISettingRegistry,
    setDatabaseNames: (value: string[]) => void,
    setDataSetResponse: any,
    projectId: string,
    setIsIconLoading: (value: boolean) => void,
    setIsLoading: (value: boolean) => void,
    nextPageToken?: string,
    previousDatasetList?: object
  ) => {
    if (notebookValue) {
      const pageToken = nextPageToken ?? '';
      try {
        const data: any = await requestAPI(
          `bigQueryDataset?project_id=${projectId}&pageToken=${pageToken}`
        );

        if (data.datasets) {
          const existingDatasetList = previousDatasetList ?? [];
          //setStateAction never type issue
          const allDatasetList: any = [
            ...(existingDatasetList as []),
            ...data.datasets
          ];

          if (data.nextPageToken) {
            this.getBigQueryDatasetsAPIService(
              notebookValue,
              settingRegistry,
              setDatabaseNames,
              setDataSetResponse,
              projectId,
              setIsIconLoading,
              setIsLoading,
              data.nextPageToken,
              allDatasetList
            );
          } else {
            const settings = await settingRegistry.load(PLUGIN_ID);

            let filterDatasetByLocation = allDatasetList;
            filterDatasetByLocation = filterDatasetByLocation.filter(
              (dataset: any) =>
                dataset.location === settings.get('bqRegion')['composite']
            );

            if (filterDatasetByLocation.length > 0) {
              const databaseNames: string[] = [];
              const updatedDatabaseDetails: { [key: string]: string } = {};
              filterDatasetByLocation.forEach(
                (data: {
                  datasetReference: { description: string; datasetId: string };
                }) => {
                  databaseNames.push(data.datasetReference.datasetId);
                  const description =
                    data.datasetReference.description || 'None';
                  updatedDatabaseDetails[data.datasetReference.datasetId] =
                    description;
                }
              );
              setDataSetResponse(filterDatasetByLocation);
              setDatabaseNames(databaseNames);
              setIsIconLoading(false);
            } else {
              setDataSetResponse([]);
              setDatabaseNames([]);
              setIsLoading(false);
              setIsIconLoading(false);
            }
          }
        } else {
          setDataSetResponse([]);
          setDatabaseNames([]);
          setIsLoading(false);
          setIsIconLoading(false);
        }
      } catch (reason) {
        toast.error(
          `Failed to fetch datasets : ${reason}`,
          toastifyCustomStyle
        );
        setIsLoading(false);
        setIsIconLoading(false);
      }
    }
  };

  static getBigQueryTableAPIService = async (
    notebookValue: string,
    datasetId: string,
    setDatabaseNames: (value: string[]) => void,
    setTableResponse: any,
    projectId: string,
    setIsIconLoading: (value: boolean) => void,
    nextPageToken?: string,
    previousDatasetList?: object
  ) => {
    if (notebookValue) {
      const pageToken = nextPageToken ?? '';
      try {
        const data: any = await requestAPI(
          `bigQueryTable?project_id=${projectId}&dataset_id=${datasetId}&pageToken=${pageToken}`
        );

        if (data.tables) {
          const existingDatasetList = previousDatasetList ?? [];
          //setStateAction never type issue
          const allDatasetList: any = [
            ...(existingDatasetList as []),
            ...data.tables
          ];

          if (data.nextPageToken) {
            this.getBigQueryTableAPIService(
              notebookValue,
              datasetId,
              setDatabaseNames,
              setTableResponse,
              projectId,
              setIsIconLoading,
              data.nextPageToken,
              allDatasetList
            );
          } else {
            const tableNames: string[] = [];
            const entryNames: string[] = [];
            const updatedTableDetails: { [key: string]: string } = {};
            const datasetTableMapping: { [key: string]: string } = {};
            allDatasetList.forEach(
              (entry: {
                tableReference: {
                  description: string;
                  datasetId: string;
                  tableId: string;
                };
              }) => {
                tableNames.push(entry.tableReference.tableId);
                entryNames.push(entry.tableReference.tableId);
                const description = entry.tableReference.description || 'None';
                updatedTableDetails[entry.tableReference.tableId] = description;
                datasetTableMapping[entry.tableReference.tableId] =
                  entry.tableReference.datasetId;
              }
            );
            setTableResponse(allDatasetList);
            setIsIconLoading(false);
          }
        } else {
          setTableResponse(datasetId);
          setIsIconLoading(false);
        }
      } catch (reason) {
        if (!toast.isActive('datasetError')) {
          setIsIconLoading(false);
          toast.error(`Failed to fetch datasets : ${reason}`, {
            ...toastifyCustomStyle,
            toastId: 'datasetError'
          });
        }
      }
    }
  };

  static getBigQueryDatasetInfoAPIService = async (
    dataset: string,
    projectId: string,
    setDatasetInfo: any
  ) => {
    try {
      const data: any = await requestAPI(
        `bigQueryDatasetInfo?project_id=${projectId}&dataset_id=${dataset}`
      );
      let datasetInfoTemp: any = {};
      datasetInfoTemp['Case insensitive'] = data.isCaseInsensitive;
      setDatasetInfo(datasetInfoTemp);
    } catch (reason) {
      toast.error(
        `Error in calling BigQurey Dataset API : ${reason}`,
        toastifyCustomStyle
      );
    }
  };

  static getBigQueryTableInfoAPIService = async (
    title: string,
    dataset: string,
    setTableInfo: any,
    datasetInfo: any,
    projectId: string,
    setIsLoading: (value: boolean) => void
  ) => {
    try {
      const data: any = await requestAPI(
        `bigQueryTableInfo?project_id=${projectId}&dataset_id=${dataset}&table_id=${title}`
      );

      let tableInfoTemp: any = {};
      tableInfoTemp['Table ID'] = data.id;
      tableInfoTemp['Created'] = data.creationTime
        ? new Date(Number(data.creationTime)).toString()
        : '';
      tableInfoTemp['Last modified'] = data.lastModifiedTime
        ? new Date(Number(data.lastModifiedTime)).toString()
        : '';
      tableInfoTemp['Table expiration'] = data.expirationTime
        ? new Date(Number(data.expirationTime)).toString()
        : '';
      tableInfoTemp['Data location'] = data.location;
      tableInfoTemp['Default collation'] = data.defaultCollation;
      tableInfoTemp['Default rounding mode'] = data.defaultRoundingMode;
      tableInfoTemp['Description'] = data.description;
      tableInfoTemp['Case insensitive'] = datasetInfo['Case insensitive']
        ? datasetInfo['Case insensitive'].toString()
        : '';
      setTableInfo(tableInfoTemp);
      setIsLoading(false);
    } catch (reason) {
      toast.error(
        `Error in calling BigQurey Table API : ${reason}`,
        toastifyCustomStyle
      );
    }
  };

  static getBigQueryDatasetDetailsAPIService = async (
    dataset: string,
    setDatasetInfo: any,
    projectId: string,
    setIsLoading: (value: boolean) => void
  ) => {
    try {
      const data: any = await requestAPI(
        `bigQueryDatasetInfo?project_id=${projectId}&dataset_id=${dataset}`
      );
      let datasetInfoTemp: any = {};
      datasetInfoTemp['Dataset ID'] = data.id;
      datasetInfoTemp['Created'] = data.creationTime
        ? new Date(Number(data.creationTime)).toString()
        : '';
      datasetInfoTemp['Default table expiration'] =
        data.defaultTableExpirationMs
          ? data.defaultTableExpirationMs / (1000 * 60 * 60 * 24) + ' days'
          : '';
      datasetInfoTemp['Last modified'] = data.lastModifiedTime
        ? new Date(Number(data.lastModifiedTime)).toString()
        : '';
      datasetInfoTemp['Data location'] = data.location;
      datasetInfoTemp['Description'] = data.description;
      datasetInfoTemp['Default collation'] = data.defaultCollation;
      datasetInfoTemp['Default rounding mode'] = data.defaultRoundingMode;
      datasetInfoTemp['Time travel window'] = data.maxTimeTravelHours
        ? data.maxTimeTravelHours / 24 + ' days'
        : '';
      datasetInfoTemp['Storage billing model'] = data.storageBillingModel;
      datasetInfoTemp['Case insensitive'] = data.isCaseInsensitive
        ? data.isCaseInsensitive.toString()
        : '';
      setDatasetInfo(datasetInfoTemp);
      setIsLoading(false);
    } catch (reason) {
      toast.error(
        `Error in calling BigQurey Dataset Details API : ${reason}`,
        toastifyCustomStyle
      );
    }
  };

  static getBigQueryProjectsListAPIService = async (
    setProjectNameInfo: any
  ) => {
    try {
      const data: any = await requestAPI(`bigQueryProjectsList`);
      setProjectNameInfo(data);
    } catch (reason) {
      toast.error(`Error on GET credentials.\n${reason}`, toastifyCustomStyle);
    }
  };

  static getBigQuerySearchAPIService = async (
    searchTerm: string,
    setSearchLoading: (value: boolean) => void,
    setSearchResponse: any
  ) => {
    setSearchLoading(true);
    try {
      const data: any = await requestAPI(
        `bigQuerySearch?search_string=${searchTerm}&type=(table|dataset)&system=bigquery`,
        {
          method: 'POST'
        }
      );
      setSearchResponse(data);
    } catch (reason) {
      toast.error(
        `Error in calling BigQurey Project List API : ${reason}`,
        toastifyCustomStyle
      );
    }
  };

  static checkBigQueryDatasetsAPIService = async () => {
    try {
      const data: any = await requestAPI(`bigQueryApiEnabled`, {
        method: 'POST'
      });
      return data;
    } catch (reason) {
      return reason;
    }
  };

  static getBigQuerySearchCatalogAPIService = async () => {
    try {
      const data: any = await requestAPI(
        `bigQuerySearch?search_string=''&type=(table|dataset)&system=bigquery`,
        {
          method: 'POST'
        }
      );
      return data;
    } catch (reason) {
      return reason;
    }
  };
}
