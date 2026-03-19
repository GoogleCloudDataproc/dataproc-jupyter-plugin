/**
 * @license
 * Copyright 2025 Google LLC
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
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { Notification } from '@jupyterlab/apputils';
import { requestAPI } from 'handler/handler';
import { PLUGIN_ID } from 'utils/const'; // Make sure to import this!

export class BigLakeWidgetService {
  static listCatalogAPIService = async (
    settingRegistry: ISettingRegistry,
    setCatalogNames: (value: string[]) => void,
    setCatalogResponse: any,
    projectId: string,
    setIsIconLoading: (value: boolean) => void,
    setIsLoading: (value: boolean) => void
  ) => {
    try {
      // 1. Get the region from the JupyterLab settings
      const settings = await settingRegistry.load(PLUGIN_ID);
      const location = settings.get('bqRegion')?.['composite'] || 'US';

      // 2. Make the HTTP GET request to our local Python backend
      const data: any = await requestAPI(
        `bigLakeListCatalogs?project_id=${projectId}&location=${location}`
            );

      if (data && data.catalogs) {
        const catalogNames = data.catalogs.map((c: any) => c.displayName);
        setCatalogResponse(data.catalogs);
        setCatalogNames(catalogNames);
      } else {
        setCatalogResponse([]);
        setCatalogNames([]);
      }
    } catch (reason) {
      Notification.emit(`Failed to fetch BigLake catalogs: ${reason}`, 'error', {
        autoClose: 5000
      });
    } finally {
      setIsIconLoading(false);
      setIsLoading(false);
    }
  };
  static listNamespaceAPIService = async (
    settingRegistry: ISettingRegistry,
    catalogId: string,
    setNamespaceResponse: any,
    projectId: string,
    setIsIconLoading: (value: boolean) => void
  ) => {
    try {
      // 1. Ensure we have the full catalog path for the SDK
      // If catalogId is just "acc-biglake-catalog", this builds the full string.
      // If it already is the full string, it leaves it alone.
      const fullCatalogName = catalogId.includes('projects/') 
        ? catalogId 
        : `projects/${projectId}/catalogs/${catalogId}`;

      // 2. Encode the slashes so they don't break the URL routing
      const encodedCatalogName = encodeURIComponent(fullCatalogName);

      // 3. Make the request using ONLY the catalog_name parameter expected by the backend
      const data: any = await requestAPI(
        `bigLakeListNamespaces?catalog_name=${encodedCatalogName}`
      );

      if (data && data.namespaces) {
        setNamespaceResponse({ catalogId, namespaces: data.namespaces });
      } else {
        setNamespaceResponse({ catalogId, namespaces: [] });
      }
    } catch (reason) {
      Notification.emit(`Failed to fetch BigLake namespaces: ${reason}`, 'error', {
        autoClose: 5000
      });
    } finally {
      setIsIconLoading(false);
    }
  };
  // static listNamespaceAPIService = async (
  //   settingRegistry: ISettingRegistry,
  //   catalogId: string,
  //   setNamespaceResponse: any,
  //   projectId: string,
  //   setIsIconLoading: (value: boolean) => void
  // ) => {
  //   try {
  //     const settings = await settingRegistry.load(PLUGIN_ID);
  //     const location = settings.get('bqRegion')?.['composite'] || 'US';
  //     const data: any = await requestAPI(
  //       `bigLakeListNamespaces?project_id=${projectId}&location=${location}&catalog_id=${catalogId}`
  //     );
  //     if (data && data.namespaces) {
  //       setNamespaceResponse({ catalogId, namespaces: data.namespaces });
  //     } else {
  //       setNamespaceResponse({ catalogId, namespaces: [] });
  //     }
  //   } catch (reason) {
  //     Notification.emit(`Failed to fetch BigLake namespaces: ${reason}`, 'error', {
  //       autoClose: 5000
  //     });
  //   } finally {
  //     setIsIconLoading(false);
  //   }
  //   };
  static listTablesAPIService = async (
    namespaceId: string,
    setBigLakeTableResponse: any,
    setIsIconLoading: (value: boolean) => void
  ) => {
    console.log('list tables in service file is called');
    const mockData = (namespaceId === 'namespace1-1')
        ? [
            { tableReference: { tableId: 'table1-1-1' } },
            { tableReference: { tableId: 'table1-1-2' } }
        ]
        : [
            { tableReference: { tableId: 'table_other_1' } },
            { tableReference: { tableId: 'table_other_2' } }
        ];

    setBigLakeTableResponse({namespaceId, tables: mockData});
    setIsIconLoading(false);
  };
}
