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
    console.log('list namespace in service file is called');
    // This is where the API call to list namespaces would go.
    // For now, we will use mock data based on the catalogId.
    const mockData =
      catalogId === 'catalog1'
        ? [
            {
              id: 'namespace1-1',
              name: 'namespace1-1',
              children: [],
              isNodeOpen: false
            },
            {
              id: 'namespace1-2',
              name: 'namespace1-2',
              children: [],
              isNodeOpen: false
            }
          ]
        : [
            {
              id: 'namespace2-1',
              name: 'namespace2-1',
              children: [],
              isNodeOpen: false
            },
            {
              id: 'namespace2-2',
              name: 'namespace2-2',
              children: [],
              isNodeOpen: false
            }
          ];
    setNamespaceResponse({ catalogId, namespaces: mockData });
    setIsIconLoading(false);
  };
}
