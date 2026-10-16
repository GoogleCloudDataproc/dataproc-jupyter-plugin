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

import { runtimeProfileListMapper } from './runtimeProfileListMapper';

describe('runtimeProfileListMapper', () => {

  it('should map all fields properly and fallback when optional fields are missing', () => {
    const templates = [
      {
        name: 'projects/test-proj/locations/europe-west1/sessionTemplates/full-profile',
        description: 'Full description',
        jupyterSession: { displayName: 'Display Profile' },
        runtimeConfig: {
          version: '2.2',
          properties: {
            'dataproc.tier': 'premium',
            'spark.dataproc.engine': 'lightningEngine'
          }
        },
        creator: 'alice@google.com',
        updateTime: '2024-03-10T12:00:00Z'
      },
      {
        // Minimal template without displayName, description, or @ in creator
        name: 'short-name',
        jupyterSession: {},
        creator: 'system-service',
        updateTime: ''
      },
      {
        // Template on runtime 3.1 without explicit dataproc.tier property defaults to Premium
        name: 'projects/test-proj/locations/us-east4/sessionTemplates/v31-profile',
        jupyterSession: { displayName: 'V31 Profile' },
        runtimeConfig: {
          version: '3.1'
        }
      }
    ];

    const result = runtimeProfileListMapper(templates);

    expect(result[0]).toEqual({
      id: 'projects/test-proj/locations/europe-west1/sessionTemplates/full-profile',
      name: 'Display Profile',
      region: 'europe-west1',
      runtimeVersion: '2.2',
      tier: 'Premium',
      engine: 'Lightning Engine',
      lastUsed: 'Mar 10, 2024',
      creator: 'alice',
      description: 'Full description'
    });

    expect(result[1]).toEqual({
      id: 'short-name',
      name: 'short-name',
      region: '',
      runtimeVersion: '',
      tier: 'Standard',
      engine: 'Default',
      lastUsed: '',
      creator: 'system-service',
      description: ''
    });

    expect(result[2]).toEqual({
      id: 'projects/test-proj/locations/us-east4/sessionTemplates/v31-profile',
      name: 'V31 Profile',
      region: 'us-east4',
      runtimeVersion: '3.1',
      tier: 'Premium',
      engine: 'Default',
      lastUsed: '',
      creator: '',
      description: ''
    });
  });

  describe('formatLastUsed date formatting branches', () => {
    const fixedNow = new Date('2026-06-15T14:30:00Z');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(fixedNow);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return empty string for invalid or empty dates', () => {
      const result = runtimeProfileListMapper([
        {
          name: 'projects/test-proj/locations/us-central1/sessionTemplates/t1',
          jupyterSession: {},
          updateTime: 'invalid-date-string'
        }
      ]);
      expect(result[0].lastUsed).toBe('');
    });

    it('should format dates from today within 1 minute as "1 min ago"', () => {
      const thirtySecsAgo = new Date(fixedNow.getTime() - 30 * 1000).toISOString();
      const result = runtimeProfileListMapper([
        {
          name: 'projects/test-proj/locations/us-central1/sessionTemplates/t1',
          jupyterSession: {},
          updateTime: thirtySecsAgo
        }
      ]);
      expect(result[0].lastUsed).toBe('1 min ago');
    });

    it('should format dates from today multiple minutes ago as "<N> mins ago"', () => {
      const fifteenMinsAgo = new Date(fixedNow.getTime() - 15 * 60 * 1000).toISOString();
      const result = runtimeProfileListMapper([
        {
          name: 'projects/test-proj/locations/us-central1/sessionTemplates/t1',
          jupyterSession: {},
          updateTime: fifteenMinsAgo
        }
      ]);
      expect(result[0].lastUsed).toBe('15 mins ago');
    });

    it('should format dates from today 1 hour ago as "1 hour ago"', () => {
      const oneHourAgo = new Date(fixedNow.getTime() - 65 * 60 * 1000).toISOString();
      const result = runtimeProfileListMapper([
        {
          name: 'projects/test-proj/locations/us-central1/sessionTemplates/t1',
          jupyterSession: {},
          updateTime: oneHourAgo
        }
      ]);
      expect(result[0].lastUsed).toBe('1 hour ago');
    });

    it('should format dates from today multiple hours ago as "<N> hours ago"', () => {
      const threeHoursAgo = new Date(fixedNow.getTime() - 3 * 60 * 60 * 1000).toISOString();
      const result = runtimeProfileListMapper([
        {
          name: 'projects/test-proj/locations/us-central1/sessionTemplates/t1',
          jupyterSession: {},
          updateTime: threeHoursAgo
        }
      ]);
      expect(result[0].lastUsed).toBe('3 hours ago');
    });

    it('should format dates from yesterday as "yesterday"', () => {
      const yesterday = new Date('2026-06-14T10:00:00Z').toISOString();
      const result = runtimeProfileListMapper([
        {
          name: 'projects/test-proj/locations/us-central1/sessionTemplates/t1',
          jupyterSession: {},
          updateTime: yesterday
        }
      ]);
      expect(result[0].lastUsed).toBe('yesterday');
    });

    it('should format older dates as "Mon DD, YYYY"', () => {
      const olderDate = new Date('2025-11-05T10:00:00Z').toISOString();
      const result = runtimeProfileListMapper([
        {
          name: 'projects/test-proj/locations/us-central1/sessionTemplates/t1',
          jupyterSession: {},
          updateTime: olderDate
        }
      ]);
      expect(result[0].lastUsed).toBe('Nov 5, 2025');
    });
  });
});
