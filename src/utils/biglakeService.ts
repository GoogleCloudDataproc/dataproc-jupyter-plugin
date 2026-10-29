/**
 * @license
 * Copyright 2026 Google LLC
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

import { Notification } from '@jupyterlab/apputils';
import { requestAPI } from '../handler/handler';
import { authApi } from './utils';

/**
 * A Lakehouse runtime catalog. Catalogs are project-scoped, so the name looks
 * like 'projects/my-project/catalogs/my_catalog'.
 */
export interface ILakehouseCatalog {
  name: string;
}

export interface ILakehouseErrorResponse {
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

/** Iceberg REST catalogs list response. The array key is kebab-case. */
export interface IIcebergCatalogsResponse extends ILakehouseErrorResponse {
  'iceberg-catalogs'?: ILakehouseCatalog[];
}

/** Hive catalogs list response. */
export interface IHiveCatalogsResponse extends ILakehouseErrorResponse {
  catalogs?: ILakehouseCatalog[];
}

/** Lakehouse runtime catalog endpoints listed by the `biglakeCatalogs` route. */
type LakehouseCatalogEndpoint = 'iceberg' | 'hive';

/**
 * Extracts short catalog ID from full resource name
 * e.g., 'projects/test-proj/catalogs/iceberg_catalog_01' -> 'iceberg_catalog_01'
 */
export const extractCatalogId = (catalogResourceName: string): string => {
  if (!catalogResourceName) {
    return '';
  }
  const parts = catalogResourceName.split('/');
  return parts[parts.length - 1] || catalogResourceName;
};

/**
 * Lists the catalog IDs of a project from a Lakehouse runtime catalog
 * endpoint, defaulting to the signed-in project.
 * Emits error notification if API is not enabled or request fails (no fallback).
 */
const listLakehouseCatalogIds = async <T extends ILakehouseErrorResponse>(
  projectId: string,
  label: string,
  endpoint: LakehouseCatalogEndpoint,
  readCatalogs: (data: T) => ILakehouseCatalog[] | undefined
): Promise<string[]> => {
  try {
    const credentials = await authApi();
    if (!credentials) {
      return [];
    }

    const targetProject = projectId || credentials.project_id;
    if (!targetProject) {
      return [];
    }

    // These BigLake endpoints don't answer CORS preflight requests, so the
    // browser can't call them; the Jupyter server makes the request instead.
    // Errors come back with an error status, so requestAPI throws with their
    // message, such as BigLake's own.
    const params = new URLSearchParams({ endpoint, project_id: targetProject });
    const data = await requestAPI<T>(`biglakeCatalogs?${params.toString()}`);

    return (readCatalogs(data) ?? [])
      .map(catalog => extractCatalogId(catalog.name))
      .filter(catalogId => catalogId !== '');
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    Notification.emit(
      reason
        ? `Failed to fetch ${label} catalogs: ${reason}`
        : `Failed to fetch ${label} catalogs`,
      'error',
      { autoClose: 5000 }
    );
    return [];
  }
};

/**
 * Lists the Iceberg REST catalogs of a project, for the Iceberg REST endpoint.
 */
export const listIcebergCatalogsAPI = (projectId: string): Promise<string[]> =>
  listLakehouseCatalogIds<IIcebergCatalogsResponse>(
    projectId,
    'Iceberg REST',
    'iceberg',
    data => data['iceberg-catalogs']
  );

/** Lists the Hive catalogs of a project, for the Hive endpoint. */
export const listHiveCatalogsAPI = (projectId: string): Promise<string[]> =>
  listLakehouseCatalogIds<IHiveCatalogsResponse>(
    projectId,
    'Hive',
    'hive',
    data => data.catalogs
  );
