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

import {
  CreateRuntimeProfile,
  CreateRuntimeProfileComponent
} from './createRuntimeProfile';
import { RuntimeProfileService } from './runtimeProfileService';

describe('CreateRuntimeProfile Component & Service', () => {
  let mockService: RuntimeProfileService;

  beforeEach(() => {
    mockService = new RuntimeProfileService(true);
  });

  it('should export CreateRuntimeProfileComponent, CreateRuntimeProfile, and RuntimeProfileService', () => {
    expect(CreateRuntimeProfileComponent).toBeDefined();
    expect(typeof CreateRuntimeProfileComponent).toBe('function');
    expect(CreateRuntimeProfile).toBeDefined();
    expect(typeof CreateRuntimeProfile).toBe('function');
    expect(mockService).toBeDefined();
  });

  it('should load regions from service', async () => {
    const regions = await mockService.getRegions();
    expect(regions.length).toBeGreaterThan(0);
    expect(regions.some(r => r.name === 'us-central1')).toBe(true);
    expect(regions.find(r => r.name === 'us-central1')?.displayName).toBe(
      'us-central1 (Iowa)'
    );
  });

  it('should allow creating a profile in mock mode', async () => {
    const profile = await mockService.createRuntimeProfile({
      displayName: 'test-profile',
      region: 'us-central1',
      description: 'Test runtime profile description'
    });

    expect(profile.displayName).toBe('test-profile');
    expect(profile.region).toBe('us-central1');
    expect(profile.description).toBe('Test runtime profile description');
    expect(profile.state).toBe('ACTIVE');
  });

  it('should create profile with custom region and project', async () => {
    const service = new RuntimeProfileService(true);
    const profile = await service.createRuntimeProfile(
      {
        displayName: 'custom-profile',
        region: 'us-east1',
        description: 'Profile with custom region'
      },
      'test-project',
      'us-east1'
    );
    expect(profile.displayName).toBe('custom-profile');
    expect(profile.region).toBe('us-east1');
    expect(profile.name).toBe(
      'projects/test-project/locations/us-east1/runtimeProfiles/custom-profile'
    );
  });
});
