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

import { RuntimeProfileService } from './runtimeProfileService';
import { authenticatedFetch, loggedFetch, authApi } from '../utils/utils';
import { HTTP_METHOD } from '../utils/const';

jest.mock('../utils/utils', () => ({
  ...jest.requireActual('../utils/utils'),
  authenticatedFetch: jest.fn(),
  loggedFetch: jest.fn(),
  authApi: jest.fn()
}));

describe('RuntimeProfileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchRuntimeProfiles', () => {
    it('fetches profiles successfully via authenticatedFetch to sessionTemplates', async () => {
      const mockData = {
        sessionTemplates: [{ name: 'template1', jupyterSession: {} }],
        nextPageToken: 'next-token'
      };
      (authenticatedFetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData)
      });

      const result = await RuntimeProfileService.fetchRuntimeProfiles('page-1');

      expect(authenticatedFetch).toHaveBeenCalledTimes(1);
      expect(authenticatedFetch).toHaveBeenCalledWith({
        uri: 'sessionTemplates',
        method: HTTP_METHOD.GET,
        regionIdentifier: 'locations',
        queryParams: new URLSearchParams({ pageSize: '50', pageToken: 'page-1' })
      });
      expect(result).toEqual({
        templates: mockData.sessionTemplates,
        nextPageToken: 'next-token'
      });
    });

    it('skips blank pages containing no jupyterSession items and stops immediately once a non-empty page is found', async () => {
      const blankPage = {
        sessionTemplates: [{ name: 'non-jupyter-1' }],
        nextPageToken: 'token-2'
      };
      const validPage = {
        sessionTemplates: [{ name: 'valid-template', jupyterSession: {} }],
        nextPageToken: 'token-3'
      };

      (authenticatedFetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(blankPage)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(validPage)
        });

      const result = await RuntimeProfileService.fetchRuntimeProfiles('token-1');

      expect(authenticatedFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        templates: validPage.sessionTemplates,
        nextPageToken: 'token-3'
      });
    });

    it('caps empty-page skipping at 10 hops when pages contain only non-Jupyter templates', async () => {
      (authenticatedFetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          sessionTemplates: [{ name: 'non-jupyter' }],
          nextPageToken: 'still-more-tokens'
        })
      });

      const result = await RuntimeProfileService.fetchRuntimeProfiles('token-1');

      expect(authenticatedFetch).toHaveBeenCalledTimes(10);
      expect(result).toEqual({
        templates: [],
        nextPageToken: 'still-more-tokens'
      });
    });

    it('returns empty array if sessionTemplates is missing', async () => {
      (authenticatedFetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      const result = await RuntimeProfileService.fetchRuntimeProfiles();

      expect(authenticatedFetch).toHaveBeenCalledWith({
        uri: 'sessionTemplates',
        method: HTTP_METHOD.GET,
        regionIdentifier: 'locations',
        queryParams: new URLSearchParams({ pageSize: '50', pageToken: '' })
      });
      expect(result).toEqual({
        templates: [],
        nextPageToken: undefined
      });
    });

    it('throws error if response is not ok or contains error payload', async () => {
      (authenticatedFetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Forbidden',
        json: jest.fn().mockResolvedValue({ error: { message: 'Permission denied' } })
      });

      await expect(RuntimeProfileService.fetchRuntimeProfiles()).rejects.toThrow('Permission denied');
    });

    it('throws statusText error if response is not ok and body is non-JSON', async () => {
      (authenticatedFetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Bad Gateway',
        json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token < in JSON'))
      });

      await expect(RuntimeProfileService.fetchRuntimeProfiles()).rejects.toThrow(
        'Failed to fetch runtime profiles: Bad Gateway'
      );
    });

    it('throws error if authenticatedFetch fails', async () => {
      (authenticatedFetch as jest.Mock).mockRejectedValue(new Error('API error'));

      await expect(RuntimeProfileService.fetchRuntimeProfiles()).rejects.toThrow('API error');
    });
  });

  describe('deleteRuntimeProfile', () => {
    it('deletes profile successfully via loggedFetch', async () => {
      (authApi as jest.Mock).mockResolvedValue({ access_token: 'test-token' });
      (loggedFetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      await RuntimeProfileService.deleteRuntimeProfile('profile1', 'Profile 1');

      expect(loggedFetch).toHaveBeenCalledWith(
        expect.stringContaining('profile1'),
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('succeeds when delete response is ok with empty non-JSON body', async () => {
      (authApi as jest.Mock).mockResolvedValue({ access_token: 'test-token' });
      (loggedFetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected end of input'))
      });

      await expect(
        RuntimeProfileService.deleteRuntimeProfile('profile1', 'Profile 1')
      ).resolves.toBeUndefined();
    });

    it('throws error if delete fails', async () => {
      (authApi as jest.Mock).mockResolvedValue({ access_token: 'test-token' });
      (loggedFetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: { message: 'Delete error' } })
      });

      await expect(RuntimeProfileService.deleteRuntimeProfile('profile1')).rejects.toThrow('Delete error');
    });
  });
});
