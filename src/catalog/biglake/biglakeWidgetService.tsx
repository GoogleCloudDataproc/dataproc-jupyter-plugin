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

export class BigLakeWidgetService {
  static listCatalogAPIService = async (
    settingRegistry: ISettingRegistry,
    setCatalogNames: (value: string[]) => void,
    setCatalogResponse: any,
    projectId: string,
    setIsIconLoading: (value: boolean) => void,
    setIsLoading: (value: boolean) => void
  ) => {
    console.log('list catalog in service file is called');
    // This is where the API call to list catalogs would go.
    // For now, we will use mock data.
    const mockData = [
      {
        id: 'catalog1',
        name: 'catalog1',
        children: [],
        isNodeOpen: false
      },
      {
        id: 'catalog2',
        name: 'catalog2',
        children: [],
        isNodeOpen: false
      }
    ];
    const catalogNames = mockData.map(c => c.name);
    setCatalogResponse(mockData);
    setCatalogNames(catalogNames);
    setIsIconLoading(false);
    setIsLoading(false);
  };
}
