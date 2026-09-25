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

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

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

jest.mock('@jupyterlab/apputils', () => ({
  ...jest.requireActual('@jupyterlab/apputils'),
  Notification: {
    emit: jest.fn()
  }
}));

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { CreateRuntimeProfileComponent } from './createRuntimeProfile';
import { RuntimeProfileService } from './runtimeProfileService';

describe('CreateRuntimeProfileComponent UI & Service', () => {
  let mockService: RuntimeProfileService;
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    mockService = new RuntimeProfileService(true);
    jest.spyOn(mockService, 'getRegions').mockResolvedValue([
      { name: 'us-central1', displayName: 'us-central1 (Iowa)' },
      { name: 'us-east1', displayName: 'us-east1 (South Carolina)' }
    ]);

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders Additional configuration expanded by default with all 7 SectionDetail sections', async () => {
    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });

    const header = container.querySelector(
      '.additional-config-header-container'
    );
    expect(header).not.toBeNull();
    expect(header?.getAttribute('aria-expanded')).toBe('true');

    const sectionTitles = Array.from(
      container.querySelectorAll('.section-detail-title')
    ).map(el => el.textContent);

    expect(sectionTitles).toEqual([
      'Runtime configuration',
      'Executor and driver configuration',
      'Autoscaling',
      'Metastore configuration',
      'Network and security',
      'Session lifecycle',
      'Other customizations'
    ]);

    const editButtons = container.querySelectorAll(
      '.section-detail-edit-button'
    );
    expect(editButtons).toHaveLength(7);
    editButtons.forEach(btn => {
      expect(btn.getAttribute('aria-disabled')).toBe('true');
    });
  });

  it('collapses and re-expands Additional configuration on click and keyboard Enter/Space', async () => {
    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });

    const header = container.querySelector(
      '.additional-config-header-container'
    ) as HTMLDivElement;
    expect(
      container.querySelector('.additional-config-content')
    ).not.toBeNull();

    // Click to collapse
    await act(async () => {
      header.click();
    });
    expect(header.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('.additional-config-content')).toBeNull();

    // Press Enter to expand
    await act(async () => {
      header.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
    });
    expect(header.getAttribute('aria-expanded')).toBe('true');
    expect(
      container.querySelector('.additional-config-content')
    ).not.toBeNull();

    // Press Space to collapse
    await act(async () => {
      header.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true })
      );
    });
    expect(header.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('.additional-config-content')).toBeNull();
  });

  it('renders custom initial configuration values and mapped display labels in the UI', async () => {
    await act(async () => {
      root.render(
        <CreateRuntimeProfileComponent
          service={mockService}
          initialRuntimeEnvironmentConfig={{
            runtimeProfileId: 'custom-runtime-id',
            runtimeVersion: '2.2 LTS',
            customSparkImage: 'gcr.io/my-project/spark:latest',
            stagingBucket: 'gs://my-staging-bucket',
            pythonPackageRepository: 'https://pypi.org/simple'
          }}
          initialExecutorAndDriverConfig={{
            tier: 'Premium',
            driverMachineType: 'highmem-8',
            driverDisk: 'SSD 200 GB',
            executorType: 'highmem-4',
            executorDisk: 'SSD 400 GB'
          }}
          initialAutoscalingConfig={{
            autoscalingEnabled: false,
            initialExecutors: 4,
            minExecutors: 2,
            maxExecutors: 50
          }}
          initialMetastoreConfig={{
            metastore: 'projects/p/locations/l/services/my-metastore',
            hiveEndpointEnabled: true
          }}
          initialNetworkAndSecurityConfig={{
            executionIdentity: 'user_account',
            networkInThisProject: 'custom-vpc',
            encryption: 'customer_managed_key'
          }}
          initialSessionLifecycleConfig={{
            maxIdleTime: '120 minutes',
            maxSessionTime: '7 days'
          }}
          initialSparkProperties={{
            'spark.driver.memory': '8g',
            'spark.executor.cores': '4'
          }}
          initialLabels={{
            env: 'staging',
            team: 'analytics'
          }}
        />
      );
    });

    const renderedText = container.textContent || '';
    expect(renderedText).toContain('custom-runtime-id');
    expect(renderedText).toContain('gcr.io/my-project/spark:latest');
    expect(renderedText).toContain('gs://my-staging-bucket');
    expect(renderedText).toContain('Premium');
    expect(renderedText).toContain('highmem-8');
    expect(renderedText).toContain('Disabled');
    expect(renderedText).toContain('50');
    expect(renderedText).toContain(
      'projects/p/locations/l/services/my-metastore'
    );
    expect(renderedText).toContain('Enabled');
    expect(renderedText).toContain('User account');
    expect(renderedText).toContain('custom-vpc');
    expect(renderedText).toContain('Customer-managed key');
    expect(renderedText).toContain('120 minutes');
    expect(renderedText).toContain('7 days');
    expect(renderedText).toContain(
      'spark.driver.memory: 8g, spark.executor.cores: 4'
    );
    expect(renderedText).toContain('env: staging, team: analytics');
  });

  it('invokes onBack when clicking Back arrow, pressing Enter on Back arrow, or clicking Cancel', async () => {
    const onBackMock = jest.fn();

    await act(async () => {
      root.render(
        <CreateRuntimeProfileComponent
          service={mockService}
          onBack={onBackMock}
        />
      );
    });

    const backBtn = container.querySelector(
      '.back-arrow-icon'
    ) as HTMLDivElement;
    const cancelBtn = container.querySelector(
      '.job-cancel-button-style'
    ) as HTMLButtonElement;

    await act(async () => {
      backBtn.click();
    });
    expect(onBackMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      backBtn.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
    });
    expect(onBackMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      cancelBtn.click();
    });
    expect(onBackMock).toHaveBeenCalledTimes(3);
  });

  it('persists executorAndDriverConfig, derived tier, and additional configuration sections in createRuntimeProfile', async () => {
    const profile = await mockService.createRuntimeProfile(
      {
        displayName: 'configured-profile',
        region: 'us-east1',
        description: 'Profile with full configuration payload',
        executorAndDriverConfig: {
          tier: 'Premium',
          driverMachineType: 'Standard-8',
          driverDisk: 'standard persistent disk',
          executorType: 'highmem-4',
          executorDisk: 'Standard persistent disk (HDD), 200 GB'
        },
        runtimeEnvironmentConfig: {
          runtimeProfileId: 'configured-profile',
          runtimeVersion: '2.3 LTS (Spark 3.5.1, Python 3.12)'
        },
        autoscalingConfig: {
          autoscalingEnabled: true,
          initialExecutors: 4,
          minExecutors: 2,
          maxExecutors: 20
        },
        metastoreConfig: {
          metastore: 'Lakehouse runtime catalog',
          hiveEndpointEnabled: true
        },
        networkAndSecurityConfig: {
          executionIdentity: 'service_account',
          networkInThisProject: 'custom-subnet',
          encryption: 'google_managed'
        },
        sessionLifecycleConfig: {
          maxIdleTime: '90 minutes',
          maxSessionTime: '5 days'
        },
        sparkProperties: { 'spark.sql.shuffle.partitions': '200' },
        labels: { cost_center: 'ds' }
      },
      'test-project',
      'us-east1'
    );

    expect(profile.name).toBe(
      'projects/test-project/locations/us-east1/runtimeProfiles/configured-profile'
    );
    expect(profile.tier).toBe('Premium');
    expect(profile.executorAndDriverConfig?.executorType).toBe('highmem-4');
    expect(profile.autoscalingConfig?.maxExecutors).toBe(20);
    expect(profile.metastoreConfig?.hiveEndpointEnabled).toBe(true);
    expect(profile.networkAndSecurityConfig?.networkInThisProject).toBe(
      'custom-subnet'
    );
    expect(profile.sessionLifecycleConfig?.maxIdleTime).toBe('90 minutes');
    expect(profile.sparkProperties).toEqual({
      'spark.sql.shuffle.partitions': '200'
    });
    expect(profile.labels).toEqual({ cost_center: 'ds' });
  });
});
