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
  requestAPI: jest.fn().mockResolvedValue({
    dataproc_url: 'https://dataproc.googleapis.com/',
    compute_url: 'https://compute.googleapis.com/compute',
    metastore_url: 'https://metastore.googleapis.com/',
    cloudkms_url: 'https://cloudkms.googleapis.com/',
    cloudresourcemanager_url: 'https://cloudresourcemanager.googleapis.com/',
    datacatalog_url: 'https://datacatalog.googleapis.com/',
    storage_url: 'https://storage.googleapis.com/'
  })
}));

jest.mock('./utils', () => ({
  authApi: jest.fn(),
  loggedFetch: jest.fn()
}));

jest.mock('@jupyterlab/apputils', () => ({
  ...jest.requireActual('@jupyterlab/apputils'),
  Notification: { emit: jest.fn() }
}));

import { Notification } from '@jupyterlab/apputils';
import { extractCatalogId, listBigLakeCatalogsAPI } from './biglakeService';
import { authApi, loggedFetch } from './utils';

const mockAuth = authApi as jest.Mock;
const mockFetch = loggedFetch as jest.Mock;

const jsonResponse = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  statusText: ok ? 'OK' : 'Forbidden',
  json: async () => body
});

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
      extractCatalogId(
        'projects/my-project/locations/us-central1/catalogs/iceberg_catalog_01'
      )
    ).toBe('iceberg_catalog_01');
    expect(extractCatalogId('short_catalog_id')).toBe('short_catalog_id');
    expect(extractCatalogId('')).toBe('');
  });

  it('lists the catalog IDs of a project and region', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        catalogs: [
          { name: 'projects/p/locations/r/catalogs/one' },
          { name: 'projects/p/locations/r/catalogs/two' }
        ]
      })
    );

    await expect(
      listBigLakeCatalogsAPI('my-project', 'europe-west1')
    ).resolves.toEqual(['one', 'two']);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://biglake.googleapis.com/v1/projects/my-project/locations/europe-west1/catalogs',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: expect.stringContaining('token')
        })
      })
    );
  });

  it('falls back to the signed-in project and region', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));

    await expect(listBigLakeCatalogsAPI('', '')).resolves.toEqual([]);
    expect(mockFetch.mock.calls[0][0]).toContain(
      '/projects/signed-in-project/locations/us-east1/catalogs'
    );
  });

  it('returns no catalogs when signed out', async () => {
    mockAuth.mockResolvedValueOnce(undefined);

    await expect(
      listBigLakeCatalogsAPI('my-project', 'us-central1')
    ).resolves.toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows the API error and returns no catalogs when the request fails', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        {
          error: {
            code: 403,
            message: 'BigLake API has not been used in project',
            status: 'PERMISSION_DENIED'
          }
        },
        false,
        403
      )
    );

    await expect(
      listBigLakeCatalogsAPI('my-project', 'us-central1')
    ).resolves.toEqual([]);
    expect(Notification.emit).toHaveBeenCalledWith(
      'BigLake API has not been used in project',
      'error',
      { autoClose: 5000 }
    );
  });

  it('shows an error and returns no catalogs when the request throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('offline'));

    await expect(
      listBigLakeCatalogsAPI('my-project', 'us-central1')
    ).resolves.toEqual([]);
    expect(Notification.emit).toHaveBeenCalledWith(
      expect.stringContaining('offline'),
      'error',
      { autoClose: 5000 }
    );
  });
});
