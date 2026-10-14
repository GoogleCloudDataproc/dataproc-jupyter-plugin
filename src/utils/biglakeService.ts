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
import { API_HEADER_BEARER, API_HEADER_CONTENT_TYPE } from './const';
import { authApi, loggedFetch } from './utils';

const BIGLAKE_API_URL = 'https://biglake.googleapis.com';

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
  buildPath: (encodedProjectId: string) => string,
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

    // The project ID can be typed by the user, so encode it for the path.
    const url = BIGLAKE_API_URL + buildPath(encodeURIComponent(targetProject));

    const resp = await loggedFetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': API_HEADER_CONTENT_TYPE,
        Authorization: API_HEADER_BEARER + credentials.access_token
      }
    });

    const data = (await resp.json()) as T;

    if (!resp.ok || data?.error) {
      const errorMsg =
        data?.error?.message ||
        `Failed to fetch ${label} catalogs (${resp.status}: ${resp.statusText})`;
      Notification.emit(errorMsg, 'error', { autoClose: 5000 });
      return [];
    }

    return (readCatalogs(data) ?? [])
      .map(catalog => extractCatalogId(catalog.name))
      .filter(catalogId => catalogId !== '');
  } catch (error) {
    Notification.emit(`Error fetching ${label} catalogs: ${error}`, 'error', {
      autoClose: 5000
    });
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
    project =>
      `/iceberg/v1/restcatalog/extensions/projects/${project}/catalogs`,
    data => data['iceberg-catalogs']
  );

/** Lists the Hive catalogs of a project, for the Hive endpoint. */
export const listHiveCatalogsAPI = (projectId: string): Promise<string[]> =>
  listLakehouseCatalogIds<IHiveCatalogsResponse>(
    projectId,
    'Hive',
    project => `/hive/v1/projects/${project}/catalogs`,
    data => data.catalogs
  );
