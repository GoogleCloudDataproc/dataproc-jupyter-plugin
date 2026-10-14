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
import { listProjectsWithDetailsAPI } from './projectService';
import { authApi, loggedFetch } from './utils';

const mockAuth = authApi as jest.Mock;
const mockFetch = loggedFetch as jest.Mock;

const jsonResponse = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  statusText: ok ? 'OK' : 'Forbidden',
  json: async () => body
});

const PROJECT = { projectId: 'alpha', name: 'Alpha', projectNumber: '1' };

describe('listProjectsWithDetailsAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ project_id: 'p', access_token: 'token' });
  });

  it('lists projects with details, filtered by name prefix', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ projects: [PROJECT] }));

    await expect(listProjectsWithDetailsAPI('al')).resolves.toEqual([PROJECT]);
    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe(
      'https://cloudresourcemanager.googleapis.com/v1/projects'
    );
    expect(url.searchParams.get('filter')).toBe('name:al*');
    expect(url.searchParams.get('pageSize')).toBe('200');
  });

  it('lists all projects when no prefix is given', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));

    await expect(listProjectsWithDetailsAPI()).resolves.toEqual([]);
    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.searchParams.get('filter')).toBeNull();
  });

  it('returns no projects when signed out', async () => {
    mockAuth.mockResolvedValueOnce(undefined);

    await expect(listProjectsWithDetailsAPI()).resolves.toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows the API error and returns no projects when the request fails', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: { message: 'Permission denied' } }, false, 403)
    );

    await expect(listProjectsWithDetailsAPI()).resolves.toEqual([]);
    expect(Notification.emit).toHaveBeenCalledWith(
      'Permission denied',
      'error',
      { autoClose: 5000 }
    );
  });

  it('shows an error and returns no projects when the request throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('offline'));

    await expect(listProjectsWithDetailsAPI()).resolves.toEqual([]);
    expect(Notification.emit).toHaveBeenCalledWith(
      expect.stringContaining('offline'),
      'error',
      { autoClose: 5000 }
    );
  });
});
