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
import {
  DATAPROC_TIER_DOC,
  LIGHTNING_ENGINE_DOC,
  TIER_SECTION_TITLE,
  TIER_SECTION_SUBTITLE,
  TIER_PREMIUM_TITLE,
  TIER_PREMIUM_DESC,
  TIER_STANDARD_TITLE,
  TIER_STANDARD_DESC,
  TIER_STANDARD_INFO_BANNER,
  LIGHTNING_ENGINE_CHECKBOX_LABEL,
  LIGHTNING_ENGINE_CHECKBOX_DESC
} from '../utils/const';

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

  const getFieldValue = (label: string): string | undefined => {
    const rows = Array.from(container.querySelectorAll('.section-detail-row'));
    const matchingRow = rows.find(
      row =>
        row.querySelector('.section-detail-label')?.textContent?.trim() ===
        label
    );
    return matchingRow
      ?.querySelector('.section-detail-value')
      ?.textContent?.trim();
  };

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

    const displayNameInput = container.querySelector(
      '#runtime-profile-display-name'
    ) as HTMLInputElement;
    expect(displayNameInput?.value).toMatch(/^runtime-[0-9a-f]{12}$/);
    expect(getFieldValue('Runtime Profile ID')).toBe(displayNameInput?.value);
    expect(getFieldValue('Dataproc Runtime Version')).toBe(
      '2.3 LTS (Spark 3.5.1, Python 3.12)'
    );
    expect(getFieldValue('Custom spark image')).toBe('None');
    expect(getFieldValue('Cloud Storage Staging bucket')).toBe('Auto');
    expect(getFieldValue('Python package repository')).toBe(
      'Google Managed PyPI pull through cache'
    );
    expect(getFieldValue('Autoscaling')).toBe('Enabled');
    expect(getFieldValue('Metastore')).toBe('Lakehouse runtime catalog');
    expect(getFieldValue('Hive endpoint')).toBe('Disabled');
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

    expect(getFieldValue('Runtime Profile ID')).toBe('custom-runtime-id');
    expect(getFieldValue('Dataproc Runtime Version')).toBe('2.2 LTS');
    expect(getFieldValue('Custom spark image')).toBe(
      'gcr.io/my-project/spark:latest'
    );
    expect(getFieldValue('Cloud Storage Staging bucket')).toBe(
      'gs://my-staging-bucket'
    );
    expect(getFieldValue('Python package repository')).toBe(
      'https://pypi.org/simple'
    );
    expect(getFieldValue('Tier')).toBe('Premium');
    expect(getFieldValue('Driver machine type')).toBe('highmem-8');
    expect(getFieldValue('Driver disk')).toBe('SSD 200 GB');
    expect(getFieldValue('Executor type')).toBe('highmem-4');
    expect(getFieldValue('Executor disk')).toBe('SSD 400 GB');
    expect(getFieldValue('Autoscaling')).toBe('Disabled');
    expect(getFieldValue('Initial executors')).toBe('4');
    expect(getFieldValue('Minimum executors')).toBe('2');
    expect(getFieldValue('Maximum executors')).toBe('50');
    expect(getFieldValue('Metastore')).toBe(
      'projects/p/locations/l/services/my-metastore'
    );
    expect(getFieldValue('Hive endpoint')).toBe('Enabled');
    expect(getFieldValue('Execution identity')).toBe('User account');
    expect(getFieldValue('Network in this project')).toBe('custom-vpc');
    expect(getFieldValue('Encryption')).toBe('Customer-managed key');
    expect(getFieldValue('Maximum idle time')).toBe('120 minutes');
    expect(getFieldValue('Maximum session time')).toBe('7 days');
    expect(getFieldValue('Spark properties')).toBe(
      'spark.driver.memory: 8g, spark.executor.cores: 4'
    );
    expect(getFieldValue('Labels')).toBe('env: staging, team: analytics');
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

  it('should export valid tier documentation URLs and constants', () => {
    expect(DATAPROC_TIER_DOC).toBe(
      'https://cloud.google.com/dataproc-serverless/docs/concepts/pricing'
    );
    expect(LIGHTNING_ENGINE_DOC).toBe(
      'https://cloud.google.com/dataproc-serverless/docs/guides/lightning-engine'
    );
    expect(TIER_SECTION_TITLE).toBe('Tier');
    expect(TIER_SECTION_SUBTITLE).toBeDefined();
    expect(TIER_PREMIUM_TITLE).toBe('Premium');
    expect(TIER_PREMIUM_DESC).toBeDefined();
    expect(TIER_STANDARD_TITLE).toBe('Standard');
    expect(TIER_STANDARD_DESC).toBeDefined();
    expect(TIER_STANDARD_INFO_BANNER).toBe(
      'Standard tier will only affect batch execution. Interactive sessions always execute on premium tier.'
    );
    expect(LIGHTNING_ENGINE_CHECKBOX_LABEL).toBe(
      'Enable Lightning Engine to accelerate performance'
    );
    expect(LIGHTNING_ENGINE_CHECKBOX_DESC).toBeDefined();
  });

  it('renders Tier cards, Display name * label, and allows toggling between tiers', async () => {
    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });

    const displayNameLabel = container.querySelector(
      'label[for="runtime-profile-display-name"]'
    );
    expect(displayNameLabel?.textContent).toContain('Display name *');

    const tierCards = container.querySelectorAll('.node-config-card');
    expect(tierCards).toHaveLength(2);

    const premiumCard = tierCards[0] as HTMLDivElement;
    const standardCard = tierCards[1] as HTMLDivElement;

    expect(premiumCard.textContent).toContain('Premium');
    expect(standardCard.textContent).toContain('Standard');
    expect(premiumCard.classList.contains('selected')).toBe(true);
    expect(standardCard.classList.contains('selected')).toBe(false);

    // Switch to Standard tier
    await act(async () => {
      standardCard.click();
    });
    expect(standardCard.classList.contains('selected')).toBe(true);
    expect(premiumCard.classList.contains('selected')).toBe(false);
    expect(
      container.querySelector('.runtime-profile-tier-info-banner')
    ).not.toBeNull();

    // Switch back to Premium via keyboard Enter
    await act(async () => {
      premiumCard.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
    });
    expect(premiumCard.classList.contains('selected')).toBe(true);
    expect(
      container.querySelector('.runtime-profile-checkbox-section')
    ).not.toBeNull();
  });

  it('renders Lightning Engine checkbox and opens documentation links', async () => {
    const originalOpen = window.open;
    window.open = jest.fn();

    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });

    const learnMoreLinks = container.querySelectorAll(
      '.runtime-profile-learn-more'
    );
    expect(learnMoreLinks.length).toBeGreaterThanOrEqual(2);

    // Click Tier subtitle learn more link
    await act(async () => {
      (learnMoreLinks[0] as HTMLElement).click();
    });
    expect(window.open).toHaveBeenCalledWith(DATAPROC_TIER_DOC, '_blank');

    // Click Lightning Engine learn more link
    await act(async () => {
      (learnMoreLinks[1] as HTMLElement).click();
    });
    expect(window.open).toHaveBeenCalledWith(LIGHTNING_ENGINE_DOC, '_blank');

    window.open = originalOpen;
  });

  it('should create a runtime profile with tier and lightningEngineEnabled', async () => {
    const premiumProfile = await mockService.createRuntimeProfile({
      displayName: 'premium-tier-profile',
      region: 'us-central1',
      description: 'Profile with Premium tier and Lightning Engine',
      tier: 'Premium',
      lightningEngineEnabled: true
    });

    expect(premiumProfile.displayName).toBe('premium-tier-profile');
    expect(premiumProfile.tier).toBe('Premium');
    expect(premiumProfile.lightningEngineEnabled).toBe(true);

    const standardProfile = await mockService.createRuntimeProfile({
      displayName: 'standard-tier-profile',
      region: 'us-central1',
      description: 'Profile with Standard tier',
      tier: 'Standard',
      lightningEngineEnabled: false
    });

    expect(standardProfile.displayName).toBe('standard-tier-profile');
    expect(standardProfile.tier).toBe('Standard');
    expect(standardProfile.lightningEngineEnabled).toBe(false);
  });

  it('should instantiate CreateRuntimeProfileComponent with initial tier and lightningEngineEnabled props', () => {
    const element = React.createElement(CreateRuntimeProfileComponent, {
      initialTier: 'Premium',
      initialLightningEngineEnabled: true
    });

    expect(element).toBeDefined();
    expect(element.type).toBe(CreateRuntimeProfileComponent);
    expect(element.props.initialTier).toBe('Premium');
    expect(element.props.initialLightningEngineEnabled).toBe(true);

    const standardElement = React.createElement(CreateRuntimeProfileComponent, {
      initialTier: 'Standard',
      initialLightningEngineEnabled: false
    });
    expect(standardElement.props.initialTier).toBe('Standard');
    expect(standardElement.props.initialLightningEngineEnabled).toBe(false);
  });
});
