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

jest.mock('../handler/handler', () => ({
  requestAPI: jest.fn()
}));

jest.mock('./utils', () => ({
  authApi: jest.fn()
}));

jest.mock('@jupyterlab/apputils', () => ({
  ...jest.requireActual('@jupyterlab/apputils'),
  Notification: { emit: jest.fn() }
}));

import { Notification } from '@jupyterlab/apputils';
import { requestAPI } from '../handler/handler';
import {
  extractCatalogId,
  listHiveCatalogsAPI,
  listIcebergCatalogsAPI
} from './biglakeService';
import { authApi } from './utils';

const mockAuth = authApi as jest.Mock;
const mockRequest = requestAPI as jest.Mock;

describe('biglakeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({
      project_id: 'signed-in-project',
      region_id: 'us-east1',
      access_token: 'token'
    });
  });

  it('extracts the catalog ID from a resource name', () => {
    expect(
      extractCatalogId('projects/my-project/catalogs/iceberg_catalog_01')
    ).toBe('iceberg_catalog_01');
    expect(extractCatalogId('short_catalog_id')).toBe('short_catalog_id');
    expect(extractCatalogId('')).toBe('');
  });

  it('lists the Iceberg REST catalogs of a project through the Jupyter server', async () => {
    mockRequest.mockResolvedValueOnce({
      'iceberg-catalogs': [
        { name: 'projects/my-project/catalogs/one' },
        { name: 'projects/my-project/catalogs/two' }
      ]
    });

    await expect(listIcebergCatalogsAPI('my-project')).resolves.toEqual([
      'one',
      'two'
    ]);
    expect(mockRequest).toHaveBeenCalledWith(
      'biglakeCatalogs?endpoint=iceberg&project_id=my-project'
    );
  });

  it('reads Iceberg REST catalogs only from the iceberg-catalogs key', async () => {
    mockRequest.mockResolvedValueOnce({
      catalogs: [{ name: 'projects/my-project/catalogs/one' }]
    });

    await expect(listIcebergCatalogsAPI('my-project')).resolves.toEqual([]);
  });

  it('skips catalogs without a name', async () => {
    mockRequest.mockResolvedValueOnce({
      'iceberg-catalogs': [{ name: 'projects/my-project/catalogs/one' }, {}]
    });

    await expect(listIcebergCatalogsAPI('my-project')).resolves.toEqual([
      'one'
    ]);
  });

  it('lists the Hive catalogs of a project through the Jupyter server', async () => {
    mockRequest.mockResolvedValueOnce({
      catalogs: [
        { name: 'projects/my-project/catalogs/hive_one' },
        { name: 'projects/my-project/catalogs/hive_two' }
      ]
    });

    await expect(listHiveCatalogsAPI('my-project')).resolves.toEqual([
      'hive_one',
      'hive_two'
    ]);
    expect(mockRequest).toHaveBeenCalledWith(
      'biglakeCatalogs?endpoint=hive&project_id=my-project'
    );
  });

  const listers: Array<[string, (projectId: string) => Promise<string[]>]> = [
    ['Iceberg REST', listIcebergCatalogsAPI],
    ['Hive', listHiveCatalogsAPI]
  ];

  describe.each(listers)('%s catalogs', (label, listCatalogs) => {
    it('falls back to the signed-in project', async () => {
      mockRequest.mockResolvedValueOnce({});

      await expect(listCatalogs('')).resolves.toEqual([]);
      expect(mockRequest.mock.calls[0][0]).toContain(
        'project_id=signed-in-project'
      );
    });

    it('encodes the project ID in the query', async () => {
      mockRequest.mockResolvedValueOnce({});

      await listCatalogs('a/../b?x#y');
      expect(mockRequest.mock.calls[0][0]).toContain(
        'project_id=a%2F..%2Fb%3Fx%23y'
      );
    });

    it('returns no catalogs when signed out', async () => {
      mockAuth.mockResolvedValueOnce(undefined);

      await expect(listCatalogs('my-project')).resolves.toEqual([]);
      expect(mockRequest).not.toHaveBeenCalled();
    });

    it('shows the API error and returns no catalogs when the request fails', async () => {
      mockRequest.mockResolvedValueOnce({
        error: {
          code: 403,
          message: 'BigLake API has not been used in project',
          status: 'PERMISSION_DENIED'
        }
      });

      await expect(listCatalogs('my-project')).resolves.toEqual([]);
      expect(Notification.emit).toHaveBeenCalledWith(
        'BigLake API has not been used in project',
        'error',
        { autoClose: 5000 }
      );
    });

    it('names the endpoint when a failed request has no error message', async () => {
      mockRequest.mockResolvedValueOnce({
        error: { code: 403, message: '', status: '' }
      });

      await expect(listCatalogs('my-project')).resolves.toEqual([]);
      expect(Notification.emit).toHaveBeenCalledWith(
        `Failed to fetch ${label} catalogs`,
        'error',
        { autoClose: 5000 }
      );
    });

    it('shows an error and returns no catalogs when the request throws', async () => {
      mockRequest.mockRejectedValueOnce(new Error('offline'));

      await expect(listCatalogs('my-project')).resolves.toEqual([]);
      expect(Notification.emit).toHaveBeenCalledWith(
        `Error fetching ${label} catalogs: Error: offline`,
        'error',
        { autoClose: 5000 }
      );
    });
  });
});
