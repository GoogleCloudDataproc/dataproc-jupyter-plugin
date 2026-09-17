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

import { runtimeProfileListMapper } from './runtimeProfileListMapper';

describe('runtimeProfileListMapper', () => {
  const realDate = Date;

  afterEach(() => {
    global.Date = realDate;
  });

  it('should filter out templates without jupyterSession', () => {
    const templates = [
      {
        name: 'projects/p1/locations/us-central1/sessionTemplates/t1',
        jupyterSession: { displayName: 'Jupyter Profile' }
      },
      {
        name: 'projects/p1/locations/us-central1/sessionTemplates/t2',
        sparkStandaloneSession: {}
      }
    ];

    const result = runtimeProfileListMapper(templates);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Jupyter Profile');
  });

  it('should map all fields properly and fallback when optional fields are missing', () => {
    const templates = [
      {
        name: 'projects/test-proj/locations/europe-west1/sessionTemplates/full-profile',
        description: 'Full description',
        jupyterSession: { displayName: 'Display Profile' },
        runtimeConfig: {
          version: '2.2',
          properties: {
            machineType: 'n1-standard-4'
          }
        },
        creator: 'alice@google.com',
        updateTime: '2024-03-10T12:00:00Z'
      },
      {
        // Minimal template without displayName, description, properties, or @ in creator
        name: 'short-name',
        jupyterSession: {},
        creator: 'system-service',
        updateTime: ''
      }
    ];

    const result = runtimeProfileListMapper(templates);

    expect(result[0]).toEqual({
      id: 'projects/test-proj/locations/europe-west1/sessionTemplates/full-profile',
      name: 'Display Profile',
      region: 'europe-west1',
      description: 'Full description',
      machineType: 'n1-standard-4',
      runtimeVersion: '2.2',
      creator: 'alice',
      lastUsed: 'Mar 10, 2024'
    });

    expect(result[1]).toEqual({
      id: 'short-name',
      name: 'short-name',
      region: '',
      description: '',
      machineType: '',
      runtimeVersion: '',
      creator: 'system-service',
      lastUsed: ''
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
          name: 'p/1/l/us-central1/s/t1',
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
          name: 'p/1/l/us-central1/s/t1',
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
          name: 'p/1/l/us-central1/s/t1',
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
          name: 'p/1/l/us-central1/s/t1',
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
          name: 'p/1/l/us-central1/s/t1',
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
          name: 'p/1/l/us-central1/s/t1',
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
          name: 'p/1/l/us-central1/s/t1',
          jupyterSession: {},
          updateTime: olderDate
        }
      ]);
      expect(result[0].lastUsed).toBe('Nov 5, 2025');
    });
  });
});
