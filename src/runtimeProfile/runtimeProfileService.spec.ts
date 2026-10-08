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
import { mapRuntimeProfileToSessionTemplate } from './runtimeProfileMapper';
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
        queryParams: new URLSearchParams({
          pageSize: '50',
          pageToken: 'page-1'
        })
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

      const result = await RuntimeProfileService.fetchRuntimeProfiles(
        'token-1'
      );

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

      const result = await RuntimeProfileService.fetchRuntimeProfiles(
        'token-1'
      );

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
        json: jest
          .fn()
          .mockResolvedValue({ error: { message: 'Permission denied' } })
      });

      await expect(
        RuntimeProfileService.fetchRuntimeProfiles()
      ).rejects.toThrow('Permission denied');
    });

    it('throws statusText error if response is not ok and body is non-JSON', async () => {
      (authenticatedFetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Bad Gateway',
        json: jest
          .fn()
          .mockRejectedValue(new SyntaxError('Unexpected token < in JSON'))
      });

      await expect(
        RuntimeProfileService.fetchRuntimeProfiles()
      ).rejects.toThrow('Failed to fetch runtime profiles: Bad Gateway');
    });

    it('throws error if authenticatedFetch fails', async () => {
      (authenticatedFetch as jest.Mock).mockRejectedValue(
        new Error('API error')
      );

      await expect(
        RuntimeProfileService.fetchRuntimeProfiles()
      ).rejects.toThrow('API error');
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
        json: jest
          .fn()
          .mockRejectedValue(new SyntaxError('Unexpected end of input'))
      });

      await expect(
        RuntimeProfileService.deleteRuntimeProfile('profile1', 'Profile 1')
      ).resolves.toBeUndefined();
    });

    it('throws error if delete fails', async () => {
      (authApi as jest.Mock).mockResolvedValue({ access_token: 'test-token' });
      (loggedFetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest
          .fn()
          .mockResolvedValue({ error: { message: 'Delete error' } })
      });

      await expect(
        RuntimeProfileService.deleteRuntimeProfile('profile1')
      ).rejects.toThrow('Delete error');
    });
  });

  describe('getRegions', () => {
    it('returns regions from the API in live mode', async () => {
      (authApi as jest.Mock).mockResolvedValue({
        access_token: 'live-token',
        project_id: 'my-project'
      });
      (loggedFetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          items: [{ name: 'asia-east1' }, { name: 'us-central1' }]
        })
      });

      const regions = await new RuntimeProfileService(false).getRegions();

      expect((loggedFetch as jest.Mock).mock.calls[0][0]).toContain(
        '/my-project/regions'
      );
      expect(regions).toEqual([
        { name: 'asia-east1', displayName: 'asia-east1' },
        { name: 'us-central1', displayName: 'us-central1' }
      ]);
    });

    it('throws the API error instead of falling back to mock regions', async () => {
      (authApi as jest.Mock).mockResolvedValue({
        access_token: 'live-token',
        project_id: 'my-project'
      });
      (loggedFetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest
          .fn()
          .mockResolvedValue({ error: { message: 'Permission denied' } })
      });

      await expect(
        new RuntimeProfileService(false).getRegions()
      ).rejects.toThrow('Permission denied');
    });

    it('returns an empty list when no project ID is available', async () => {
      (authApi as jest.Mock).mockResolvedValue({ access_token: 'live-token' });

      const regions = await new RuntimeProfileService(false).getRegions();

      expect(regions).toEqual([]);
      expect(loggedFetch).not.toHaveBeenCalled();
    });
  });

  describe('createRuntimeProfile', () => {
    it('persists executorAndDriverConfig, derives tier from executorAndDriverConfig, and stores additional config in mock mode', async () => {
      const service = new RuntimeProfileService(true);
      const profile = await service.createRuntimeProfile(
        {
          displayName: 'runtime-00001234abcd',
          region: 'us-central1',
          description: 'Test profile',
          executorAndDriverConfig: {
            tier: 'Premium',
            driverMachineType: 'Standard-8',
            driverDisk: 'standard persistent disk',
            executorType: 'highmem-4',
            executorDisk: 'Standard persistent disk (HDD), 200 GB'
          },
          runtimeEnvironmentConfig: {
            runtimeProfileId: 'runtime-00001234abcd',
            runtimeVersion: '2.3'
          },
          autoscalingConfig: {
            autoscalingEnabled: true,
            initialExecutors: 2,
            minExecutors: 2,
            maxExecutors: 10
          }
        },
        'my-project',
        'us-central1'
      );

      expect(profile.tier).toBe('Premium');
      expect(profile.executorAndDriverConfig).toEqual({
        tier: 'Premium',
        driverMachineType: 'Standard-8',
        driverDisk: 'standard persistent disk',
        executorType: 'highmem-4',
        executorDisk: 'Standard persistent disk (HDD), 200 GB'
      });
      expect(profile.runtimeEnvironmentConfig?.runtimeProfileId).toBe(
        'runtime-00001234abcd'
      );
      expect(profile.autoscalingConfig?.maxExecutors).toBe(10);
    });

    it('maps payload to SessionTemplate schema and sends it via loggedFetch in live mode', async () => {
      const service = new RuntimeProfileService(false);
      const payload = {
        displayName: 'runtime-live',
        region: 'us-east1',
        executorAndDriverConfig: {
          tier: 'Standard',
          driverMachineType: 'Standard-4',
          driverDisk: 'standard persistent disk',
          executorType: 'standard',
          executorDisk: 'Standard persistent disk (HDD), 100 GB'
        }
      };

      (authApi as jest.Mock).mockResolvedValue({
        access_token: 'live-token',
        project_id: 'live-project'
      });
      (loggedFetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          name: 'projects/live-project/locations/us-east1/sessionTemplates/runtime-live',
          ...payload
        })
      });

      const result = await service.createRuntimeProfile(payload);

      expect(loggedFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          'projects/live-project/locations/us-east1/sessionTemplates'
        ),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(
            mapRuntimeProfileToSessionTemplate(
              payload,
              'live-project',
              'us-east1'
            )
          )
        })
      );
      expect(result.executorAndDriverConfig).toEqual(
        payload.executorAndDriverConfig
      );
    });

    it('throws API error message when live create response is not ok', async () => {
      const service = new RuntimeProfileService(false);
      (authApi as jest.Mock).mockResolvedValue({
        access_token: 'live-token',
        project_id: 'live-project'
      });
      (loggedFetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest
          .fn()
          .mockResolvedValue({ error: { message: 'Invalid session template' } })
      });

      await expect(
        service.createRuntimeProfile({
          displayName: 'runtime-live',
          region: 'us-east1'
        })
      ).rejects.toThrow('Invalid session template');
    });

    it('throws a readable error when the live create response is not JSON', async () => {
      const service = new RuntimeProfileService(false);
      (authApi as jest.Mock).mockResolvedValue({
        access_token: 'live-token',
        project_id: 'live-project'
      });
      (loggedFetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: jest
          .fn()
          .mockRejectedValue(new SyntaxError("Unexpected token '<'"))
      });

      await expect(
        service.createRuntimeProfile({
          displayName: 'runtime-live',
          region: 'us-east1'
        })
      ).rejects.toThrow('Failed to create runtime profile (502: Bad Gateway)');
    });

    it('throws when no project ID is available in live mode', async () => {
      const service = new RuntimeProfileService(false);
      (authApi as jest.Mock).mockResolvedValue({ access_token: 'live-token' });

      await expect(
        service.createRuntimeProfile({
          displayName: 'runtime-live',
          region: 'us-east1'
        })
      ).rejects.toThrow('GCP Project ID is required');
      expect(loggedFetch).not.toHaveBeenCalled();
    });
  });
});
