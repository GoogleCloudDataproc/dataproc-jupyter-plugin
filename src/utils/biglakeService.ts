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

export interface IBigLakeCatalog {
  name: string;
  createTime?: string;
  updateTime?: string;
  deleteTime?: string;
  expireTime?: string;
}

export interface IBigLakeCatalogsResponse {
  catalogs?: IBigLakeCatalog[];
  nextPageToken?: string;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

/**
 * Extracts short catalog ID from full resource name
 * e.g., 'projects/test-proj/locations/us-central1/catalogs/iceberg_catalog_01' -> 'iceberg_catalog_01'
 */
export const extractCatalogId = (catalogResourceName: string): string => {
  if (!catalogResourceName) {
    return '';
  }
  const parts = catalogResourceName.split('/');
  return parts[parts.length - 1] || catalogResourceName;
};

/**
 * Fetches BigLake / Iceberg catalogs from the BigLake REST API.
 * Emits error notification if API is not enabled or request fails (no fallback).
 */
export const listBigLakeCatalogsAPI = async (
  projectId: string,
  region: string
): Promise<string[]> => {
  try {
    const credentials = await authApi();
    if (!credentials) {
      return [];
    }

    const targetProject = projectId || credentials.project_id;
    const targetRegion = region || credentials.region_id;

    if (!targetProject || !targetRegion) {
      return [];
    }

    const url = `https://biglake.googleapis.com/v1/projects/${targetProject}/locations/${targetRegion}/catalogs`;

    const resp = await loggedFetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': API_HEADER_CONTENT_TYPE,
        Authorization: API_HEADER_BEARER + credentials.access_token
      }
    });

    const data = (await resp.json()) as IBigLakeCatalogsResponse;

    if (!resp.ok || data?.error) {
      const errorMsg =
        data?.error?.message ||
        `Failed to fetch BigLake catalogs (${resp.status}: ${resp.statusText})`;
      Notification.emit(errorMsg, 'error', { autoClose: 5000 });
      return [];
    }

    const catalogs = data.catalogs || [];
    return catalogs.map(c => extractCatalogId(c.name));
  } catch (error) {
    Notification.emit(`Error fetching BigLake catalogs: ${error}`, 'error', {
      autoClose: 5000
    });
    return [];
  }
};
