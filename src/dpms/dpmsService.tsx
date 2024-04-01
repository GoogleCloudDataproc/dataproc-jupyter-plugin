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

import 'react-toastify/dist/ReactToastify.css';
import { requestAPI } from '../handler/handler';
import { toast } from 'react-toastify';
import { toastifyCustomStyle } from '../utils/utils';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

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

export class DpmsService {
  static bigQueryPreviewAPIService = async (
    columns: any,
    tableId: string,
    dataSetId: string,
    setIsLoading: (value: boolean) => void,
    setPreviewDataList: any,
    nextPageToken?: string,
    previousDatasetList?: object
  ) => {
    try {
      const pageToken = nextPageToken ?? '';
      const data: any = await requestAPI(
        `bigQueryPreview?dataset_id=${dataSetId}&table_id=${tableId}&pageToken=${pageToken}`
      );
      const existingDatasetList = previousDatasetList ?? [];
      //setStateAction never type issue
      const allDatasetList: any = [
        ...(existingDatasetList as []),
        ...data.rows
      ];

      if (data.pageToken) {
        this.bigQueryPreviewAPIService(
          columns,
          tableId,
          dataSetId,
          setIsLoading,
          setPreviewDataList,
          data.pageToken,
          allDatasetList
        );
      } else {
        let transformRowInfoList: any = [];
        allDatasetList.forEach((rowInfo: any) => {
          let transformRowInfo: any = {};
          rowInfo['f'].forEach((fieldInfo: any, index: number) => {
            transformRowInfo[columns[index].Header] = fieldInfo['v'];
          });
          transformRowInfoList.push(transformRowInfo);
        });
        setPreviewDataList(transformRowInfoList);
        setIsLoading(false);
      }
    } catch (reason) {
      console.error(`Error on GET credentials.\n${reason}`);
    }
  };

  static getBigQueryColumnDetailsAPIService = async (
    datasetId: string,
    tableId: string,
    setColumnResponse: any,
    setIsLoading: (value: boolean) => void
  ) => {
    try {
      const data: any = await requestAPI(
        `bigQueryTableInfo?dataset_id=${datasetId}&table_id=${tableId}`
      );
      setColumnResponse((prevResponse: IColumn[]) => [...prevResponse, data]);
      if (data) {
        setIsLoading(false);
      }
    } catch (reason) {
      console.error(`Error in fetching big query schema.\n${reason}`);
      toast.error(`Failed to fetch big query schema`, toastifyCustomStyle);
    }
  };

  static getBigQueryDatasetsAPIService = async (
    notebookValue: string,
    settingRegistry: ISettingRegistry,
    setDatabaseDetails: any,
    setDatabaseNames: (value: string[]) => void,
    setTotalDatabases: (value: number) => void,
    setSchemaError: (value: boolean) => void,
    setEntries: (value: string[]) => void,
    setTableDescription: any,
    nextPageToken?: string,
    previousDatasetList?: object
  ) => {
    if (notebookValue) {
      const pageToken = nextPageToken ?? '';
      try {
        const data: any = await requestAPI(
          `bigQueryDataset?pageToken=${pageToken}`
        );

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
            setDatabaseDetails,
            setDatabaseNames,
            setTotalDatabases,
            setSchemaError,
            setEntries,
            setTableDescription,
            data.nextPageToken,
            allDatasetList
          );
        } else {
          const PLUGIN_ID = 'dataproc_jupyter_plugin:plugin';
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
                const description = data.datasetReference.description || 'None';
                updatedDatabaseDetails[data.datasetReference.datasetId] =
                  description;
              }
            );
            setDatabaseDetails(updatedDatabaseDetails);
            setDatabaseNames(databaseNames);
            setTotalDatabases(databaseNames.length);
            setSchemaError(false);
          } else {
            toast.error(
              `No Dataset available in this region`,
              toastifyCustomStyle
            );
          }
        }
      } catch (reason) {
        console.error(`Error in fetching datasets.\n${reason}`);
        toast.error(`Failed to fetch datasets`, toastifyCustomStyle);
      }
    }
  };

  static getBigQueryTableAPIService = async (
    notebookValue: string,
    datasetId: string,
    setDatabaseDetails: any,
    setDatabaseNames: (value: string[]) => void,
    setEmptyDatabaseNames: any,
    setTotalDatabases: (value: number) => void,
    setTotalTables: (value: number) => void,
    setSchemaError: (value: boolean) => void,
    setEntries: (value: string[]) => void,
    setTableDescription: any,
    setDatasetTableMappingDetails: any,
    nextPageToken?: string,
    previousDatasetList?: object
  ) => {
    if (notebookValue) {
      const pageToken = nextPageToken ?? '';
      try {
        const data: any = await requestAPI(
          `bigQueryTable?dataset_id=${datasetId}&pageToken=${pageToken}`
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
              setDatabaseDetails,
              setDatabaseNames,
              setEmptyDatabaseNames,
              setTotalDatabases,
              setTotalTables,
              setSchemaError,
              setEntries,
              setTableDescription,
              setDatasetTableMappingDetails,
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
            setEntries(entryNames);
            setTableDescription(updatedTableDetails);
            setDatasetTableMappingDetails(datasetTableMapping);
            setTotalTables(tableNames.length);
          }
        } else {
          setEmptyDatabaseNames((prevResponse: string[]) => [
            ...prevResponse,
            datasetId
          ]);
        }
      } catch (reason) {
        console.error(`Error in fetching datasets.\n${reason}`);
        toast.error(`Failed to fetch datasets`, toastifyCustomStyle);
      }
    }
  };

  static getBigQueryDatasetInfoAPIService = async (
    database: string,
    setTableInfo: any
  ) => {
    try {
      const data: any = await requestAPI(
        `bigQueryDatasetInfo?dataset_id=${database}`
      );
      let tableInfoTemp: any = {};
      tableInfoTemp['Case insensitive'] = data.isCaseInsensitive;
      setTableInfo(tableInfoTemp);
    } catch (reason) {
      console.error(`Error on GET credentials.\n${reason}`);
    }
  };

  static getBigQueryTableInfoAPIService = async (
    title: string,
    database: string,
    setTableInfo: any,
    tableInfo: any,
    setIsLoading: (value: boolean) => void
  ) => {
    try {
      const data: any = await requestAPI(
        `bigQueryTableInfo?dataset_id=${database}&table_id=${title}`
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
      tableInfoTemp['Case insensitive'] =
        tableInfo['Case insensitive'].toString();
      setTableInfo(tableInfoTemp);
      setIsLoading(false);
    } catch (reason) {
      console.error(`Error on GET credentials.\n${reason}`);
    }
  };

  static getBigQueryDatasetDetailsAPIService = async (
    database: string,
    setDatasetInfo: any,
    setIsLoading: (value: boolean) => void
  ) => {
    try {
      const data: any = await requestAPI(
        `bigQueryDatasetInfo?dataset_id=${database}`
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
      datasetInfoTemp['Case insensitive'] = data.isCaseInsensitive.toString();
      setDatasetInfo(datasetInfoTemp);
      setIsLoading(false);
    } catch (reason) {
      console.error(`Error on GET credentials.\n${reason}`);
    }
  };
}
