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
    setPreviewDataList: any
  ) => {
    try {
      const data: any = await requestAPI(
        `bigQueryPreview?dataset_id=${dataSetId}&table_id=${tableId}`
      );
      let transformRowInfoList: any = [];
      data.rows.forEach((rowInfo: any) => {
        let transformRowInfo: any = {};
        rowInfo['f'].forEach((fieldInfo: any, index: number) => {
          transformRowInfo[columns[index].Header] = fieldInfo['v'];
        });
        transformRowInfoList.push(transformRowInfo);
      });
      setPreviewDataList(transformRowInfoList);
      setIsLoading(false);
    } catch (reason) {
      console.error(`Error on GET credentials.\n${reason}`);
    }
  };

  static getBigQueryColumnDetailsAPIService = async (
    name: string,
    setColumnResponse: any,
    setIsLoading: (value: boolean) => void
  ) => {
    try {
      const data: any = await requestAPI(`bigQuerySchema?entry_name=${name}`);
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
    setDatabaseDetails: any,
    setDatabaseNames: (value: string[]) => void,
    setTotalDatabases: (value: number) => void,
    setApiError: (value: boolean) => void,
    setSchemaError: (value: boolean) => void,
    setEntries: (value: string[]) => void,
    setTableDescription: any,
    setTotalTables: (value: number) => void
  ) => {
    if (notebookValue) {
      try {
        const data: any = await requestAPI(`bigQueryDataset`);

        const filteredEntries = data.entries.filter(
          (entry: { entryType: string }) =>
            entry.entryType.includes('bigquery-dataset')
        );
        const databaseNames: string[] = [];
        const updatedDatabaseDetails: { [key: string]: string } = {};
        filteredEntries.forEach(
          (entry: {
            entrySource: { description: string; displayName: string };
          }) => {
            databaseNames.push(entry.entrySource.displayName);
            const description = entry.entrySource.description || 'None';
            updatedDatabaseDetails[entry.entrySource.displayName] = description;
          }
        );
        setDatabaseDetails(updatedDatabaseDetails);
        setDatabaseNames(databaseNames);
        setTotalDatabases(databaseNames.length);
        setApiError(false);
        setSchemaError(false);

        const filteredTableEntries = data.entries.filter(
          (entry: { entryType: string }) =>
            entry.entryType.includes('bigquery-table')
        );
        const tableNames: string[] = [];
        const entryNames: string[] = [];
        const updatedTableDetails: { [key: string]: string } = {};
        filteredTableEntries.forEach(
          (entry: {
            entrySource: {
              displayName: string;
              resource: string;
            };
            description: string;
          }) => {
            tableNames.push(entry.entrySource.displayName);
            entryNames.push(entry.entrySource.resource.split('//')[1]);
            const description = entry.description || 'None';
            updatedTableDetails[entry.entrySource.displayName] = description;
          }
        );
        setEntries(entryNames);
        setTableDescription(updatedTableDetails);
        setTotalTables(tableNames.length);
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
      tableInfoTemp['Created'] = new Date(Number(data.creationTime)).toString();
      tableInfoTemp['Last modified'] = new Date(
        Number(data.lastModifiedTime)
      ).toString();
      tableInfoTemp['Table expiration'] = new Date(
        Number(data.expirationTime)
      ).toString();
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
}
