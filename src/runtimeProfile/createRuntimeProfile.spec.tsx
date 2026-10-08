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

jest.mock('../utils/utils', () => ({
  ...jest.requireActual('../utils/utils'),
  authApi: jest.fn().mockResolvedValue(undefined)
}));

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  CreateRuntimeProfileComponent,
  renderGroupedMachineOptions
} from './createRuntimeProfile';
import { RuntimeProfileService } from './runtimeProfileService';
import { Notification } from '@jupyterlab/apputils';
import { authApi } from '../utils/utils';
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
  LIGHTNING_ENGINE_CHECKBOX_DESC,
  EXECUTOR_CONFIG_SECTION_TITLE,
  EXECUTOR_CONFIG_SECTION_SUBTITLE,
  EXECUTOR_CATEGORY_GENERAL_TITLE,
  EXECUTOR_CATEGORY_GENERAL_SUB1,
  EXECUTOR_CATEGORY_GENERAL_SUB2,
  EXECUTOR_CATEGORY_ACCELERATED_TITLE,
  EXECUTOR_CATEGORY_ACCELERATED_SUB1,
  EXECUTOR_CATEGORY_ACCELERATED_SUB2,
  EXECUTOR_CATEGORY_ACCELERATED_SUB3,
  EXECUTOR_SHAPES_SUBHEADING,
  EXECUTOR_ACCELERATED_SHAPES_SUBHEADING
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
    // Executor type always reflects the shape selected in the dropdown
    expect(getFieldValue('Executor type')).toBe('highmem-4 (4 vCPU, 32 GB)');
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
      'https://docs.cloud.google.com/managed-spark/docs/tiers'
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

    const cardContainers = container.querySelectorAll(
      '.node-config-cards-container'
    );
    const tierCards = cardContainers[0].querySelectorAll('.node-config-card');
    expect(tierCards).toHaveLength(2);

    const premiumCard = tierCards[0] as HTMLDivElement;
    const standardCard = tierCards[1] as HTMLDivElement;

    expect(premiumCard.textContent).toContain('Premium');
    expect(standardCard.textContent).toContain('Standard');
    expect(premiumCard.classList.contains('selected')).toBe(true);
    expect(standardCard.classList.contains('selected')).toBe(false);
    expect(getFieldValue('Tier')).toBe('Premium');

    // Switch to Standard tier
    await act(async () => {
      standardCard.click();
    });
    expect(standardCard.classList.contains('selected')).toBe(true);
    expect(premiumCard.classList.contains('selected')).toBe(false);
    expect(getFieldValue('Tier')).toBe('Standard');
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
    expect(getFieldValue('Tier')).toBe('Premium');
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

  it('groups machine types under prefix subheaders with an Other fallback', () => {
    const general = renderGroupedMachineOptions(
      [
        {
          name: 'standard-4',
          label: 's4',
          vCPUs: 4,
          memory: '16g',
          category: 'general'
        },
        {
          name: 'highmem-4',
          label: 'h4',
          vCPUs: 4,
          memory: '32g',
          category: 'general'
        },
        {
          name: 'custom-8',
          label: 'c8',
          vCPUs: 8,
          memory: '32g',
          category: 'general'
        }
      ],
      'general'
    );
    expect(general.map(e => e.key)).toEqual([
      'header-standard',
      'standard-4',
      'header-highmem',
      'highmem-4',
      'header-other',
      'custom-8'
    ]);

    const accelerated = renderGroupedMachineOptions(
      [
        {
          name: 'a100-40',
          label: 'a',
          vCPUs: 12,
          memory: '78040m',
          category: 'accelerated'
        },
        {
          name: 'l4-4',
          label: 'l',
          vCPUs: 4,
          memory: '13384m',
          category: 'accelerated'
        }
      ],
      'accelerated'
    );
    expect(accelerated.map(e => e.key)).toEqual([
      'header-l4',
      'l4-4',
      'header-a100',
      'a100-40'
    ]);
  });

  it('should export executor configuration section constants', () => {
    expect(EXECUTOR_CONFIG_SECTION_TITLE).toBe('Executor configuration');
    expect(EXECUTOR_CONFIG_SECTION_SUBTITLE).toBeDefined();
    expect(EXECUTOR_CATEGORY_GENERAL_TITLE).toBe('General');
    expect(EXECUTOR_CATEGORY_GENERAL_SUB1).toBe('CPU only');
    expect(EXECUTOR_CATEGORY_GENERAL_SUB2).toBe(
      'Suited for most ETL workloads'
    );
    expect(EXECUTOR_CATEGORY_ACCELERATED_TITLE).toBe('Accelerated');
    expect(EXECUTOR_CATEGORY_ACCELERATED_SUB1).toBe('Includes GPUs');
    expect(EXECUTOR_CATEGORY_ACCELERATED_SUB2).toBe(
      'Best for data science and AI/ML workloads'
    );
    expect(EXECUTOR_CATEGORY_ACCELERATED_SUB3).toBe(
      'Available with premium tier only'
    );
    expect(EXECUTOR_SHAPES_SUBHEADING).toBe(
      'Shapes for common workloads, optimized for cost and flexibility'
    );
    expect(EXECUTOR_ACCELERATED_SHAPES_SUBHEADING).toBe(
      'Shapes with GPUs attached, for training and inference workloads'
    );
  });

  it('renders Executor category cards and machine type dropdown', async () => {
    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });

    const cardContainers = container.querySelectorAll(
      '.node-config-cards-container'
    );
    expect(cardContainers).toHaveLength(2);

    const executorCards =
      cardContainers[1].querySelectorAll('.node-config-card');
    expect(executorCards).toHaveLength(2);

    const generalCard = executorCards[0] as HTMLDivElement;
    const acceleratedCard = executorCards[1] as HTMLDivElement;

    expect(generalCard.textContent).toContain('General');
    expect(generalCard.textContent).toContain('CPU only');
    expect(acceleratedCard.textContent).toContain('Accelerated');
    expect(acceleratedCard.textContent).toContain('Includes GPUs');

    expect(generalCard.classList.contains('selected')).toBe(true);
    expect(acceleratedCard.classList.contains('selected')).toBe(false);

    // Subheading for general category
    const subheading = container.querySelector('.machine-type-subheading');
    expect(subheading?.textContent).toBe(EXECUTOR_SHAPES_SUBHEADING);

    // Switch to Accelerated category
    await act(async () => {
      acceleratedCard.click();
    });
    expect(acceleratedCard.classList.contains('selected')).toBe(true);
    expect(generalCard.classList.contains('selected')).toBe(false);
    expect(subheading?.textContent).toBe(
      EXECUTOR_ACCELERATED_SHAPES_SUBHEADING
    );

    // Switch back to General category via keyboard Space
    await act(async () => {
      generalCard.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true })
      );
    });
    expect(generalCard.classList.contains('selected')).toBe(true);
    expect(acceleratedCard.classList.contains('selected')).toBe(false);
  });

  it('disables Accelerated category when Standard tier is selected and resets to General', async () => {
    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });

    const cardContainers = container.querySelectorAll(
      '.node-config-cards-container'
    );
    const tierCards = cardContainers[0].querySelectorAll('.node-config-card');
    const executorCards =
      cardContainers[1].querySelectorAll('.node-config-card');

    const standardTierCard = tierCards[1] as HTMLDivElement;
    const generalExecutorCard = executorCards[0] as HTMLDivElement;
    const acceleratedExecutorCard = executorCards[1] as HTMLDivElement;

    // First select Accelerated category while in Premium tier
    await act(async () => {
      acceleratedExecutorCard.click();
    });
    expect(acceleratedExecutorCard.classList.contains('selected')).toBe(true);

    // Now switch tier to Standard
    await act(async () => {
      standardTierCard.click();
    });
    expect(standardTierCard.classList.contains('selected')).toBe(true);

    // Accelerated card should be disabled and selection reset to General
    expect(acceleratedExecutorCard.classList.contains('disabled')).toBe(true);
    expect(acceleratedExecutorCard.getAttribute('aria-disabled')).toBe('true');
    expect(generalExecutorCard.classList.contains('selected')).toBe(true);

    // Clicking disabled accelerated card should do nothing
    await act(async () => {
      acceleratedExecutorCard.click();
    });
    expect(generalExecutorCard.classList.contains('selected')).toBe(true);
  });

  // Opens the MUI executor type Select and picks the option with the given value
  const selectExecutorType = async (machineName: string) => {
    const selectTrigger = container.querySelector(
      '.machine-type-select-wrapper [aria-haspopup="listbox"]'
    ) as HTMLElement;
    expect(selectTrigger).not.toBeNull();
    await act(async () => {
      selectTrigger.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, button: 0 })
      );
    });
    const option = document.body.querySelector(
      `li[role="option"][data-value="${machineName}"]`
    ) as HTMLElement;
    expect(option).not.toBeNull();
    await act(async () => {
      option.click();
    });
  };

  it('switches a highmem executor to standard-4 when Standard tier is selected', async () => {
    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });

    expect(getFieldValue('Executor type')).toBe('highmem-4 (4 vCPU, 32 GB)');

    const standardTierCard = container
      .querySelectorAll('.node-config-cards-container')[0]
      .querySelectorAll('.node-config-card')[1] as HTMLDivElement;
    await act(async () => {
      standardTierCard.click();
    });

    expect(getFieldValue('Executor type')).toBe('standard-4 (4 vCPU, 16 GB)');

    // Re-selecting the General card on Standard tier keeps the Standard default
    const generalExecutorCard = container
      .querySelectorAll('.node-config-cards-container')[1]
      .querySelectorAll('.node-config-card')[0] as HTMLDivElement;
    await act(async () => {
      generalExecutorCard.click();
    });

    expect(getFieldValue('Executor type')).toBe('standard-4 (4 vCPU, 16 GB)');
  });

  it('submits the form payload to the service and notifies on success', async () => {
    const createSpy = jest
      .spyOn(mockService, 'createRuntimeProfile')
      .mockResolvedValue({ displayName: 'created', region: 'us-central1' });
    const onSuccess = jest.fn();

    await act(async () => {
      root.render(
        <CreateRuntimeProfileComponent
          service={mockService}
          onSuccess={onSuccess}
        />
      );
    });

    const submitButton = container.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(false);

    await act(async () => {
      submitButton.click();
    });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        region: 'us-central1',
        tier: 'Premium',
        executorConfig: { executorType: 'general', machineType: 'highmem-4' }
      }),
      undefined,
      'us-central1'
    );
    expect(Notification.emit).toHaveBeenCalledWith(
      expect.stringContaining('created successfully'),
      'success',
      expect.anything()
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it('pre-selects the region saved in Settings when it is in the list', async () => {
    (authApi as jest.Mock).mockResolvedValueOnce({ region_id: 'us-east1' });
    const createSpy = jest
      .spyOn(mockService, 'createRuntimeProfile')
      .mockResolvedValue({ displayName: 'created', region: 'us-east1' });

    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });
    await act(async () => {
      (
        container.querySelector('button[type="submit"]') as HTMLButtonElement
      ).click();
    });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ region: 'us-east1' }),
      undefined,
      'us-east1'
    );
  });

  it('shows an error notification when regions fail to load', async () => {
    jest
      .spyOn(mockService, 'getRegions')
      .mockRejectedValue(new Error('Permission denied'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });

    expect(Notification.emit).toHaveBeenCalledWith(
      'Permission denied',
      'error',
      { autoClose: 5000 }
    );
    consoleSpy.mockRestore();
  });

  it('keeps the selected machine type when re-clicking the already selected category', async () => {
    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });

    await selectExecutorType('highmem-16');
    expect(getFieldValue('Executor type')).toContain('highmem-16');

    const generalCard = container
      .querySelectorAll('.node-config-cards-container')[1]
      .querySelectorAll('.node-config-card')[0] as HTMLDivElement;

    // Re-click via mouse and keyboard; selection must not reset to highmem-4
    await act(async () => {
      generalCard.click();
    });
    await act(async () => {
      generalCard.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
    });

    expect(generalCard.classList.contains('selected')).toBe(true);
    expect(getFieldValue('Executor type')).toContain('highmem-16');
  });

  it('submits executorConfig from the UI selection to the service', async () => {
    const createSpy = jest
      .spyOn(mockService, 'createRuntimeProfile')
      .mockResolvedValue({} as any);
    const onSuccess = jest.fn();

    await act(async () => {
      root.render(
        <CreateRuntimeProfileComponent
          service={mockService}
          onSuccess={onSuccess}
        />
      );
    });

    const acceleratedCard = container
      .querySelectorAll('.node-config-cards-container')[1]
      .querySelectorAll('.node-config-card')[1] as HTMLDivElement;
    await act(async () => {
      acceleratedCard.click();
    });
    await selectExecutorType('l4-8');

    const submitButton = container.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;
    await act(async () => {
      submitButton.click();
    });

    expect(createSpy).toHaveBeenCalledTimes(1);
    const [payload, , region] = createSpy.mock.calls[0];
    expect(region).toBe('us-central1');
    expect(payload.tier).toBe('Premium');
    expect(payload.executorConfig).toEqual({
      executorType: 'accelerated',
      machineType: 'l4-8'
    });
    // API payload must carry the raw machine id, not the display label
    expect(payload.executorAndDriverConfig?.executorType).toBe('l4-8');
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('should instantiate CreateRuntimeProfileComponent with initial executor props', () => {
    const element = React.createElement(CreateRuntimeProfileComponent, {
      initialTier: 'Premium',
      initialLightningEngineEnabled: true,
      initialExecutorCategory: 'accelerated',
      initialExecutorType: 'l4-8'
    });

    expect(element).toBeDefined();
    expect(element.type).toBe(CreateRuntimeProfileComponent);
    expect(element.props.initialExecutorCategory).toBe('accelerated');
    expect(element.props.initialExecutorType).toBe('l4-8');
  });

  it('updates Executor type in the summary when switching executor category', async () => {
    await act(async () => {
      root.render(
        <CreateRuntimeProfileComponent
          service={mockService}
          initialExecutorAndDriverConfig={{ executorType: 'stale-value' }}
        />
      );
    });

    expect(getFieldValue('Executor type')).toBe('highmem-4 (4 vCPU, 32 GB)');

    const executorCards = container
      .querySelectorAll('.node-config-cards-container')[1]
      .querySelectorAll('.node-config-card');
    await act(async () => {
      (executorCards[1] as HTMLDivElement).click();
    });

    expect(getFieldValue('Executor type')).toBe('L4 (4 cores)');
  });

  it('initializes executor category and type from a valid initial config machine id', async () => {
    await act(async () => {
      root.render(
        <CreateRuntimeProfileComponent
          service={mockService}
          initialExecutorAndDriverConfig={{ executorType: 'l4-8' }}
        />
      );
    });

    const executorCards = container
      .querySelectorAll('.node-config-cards-container')[1]
      .querySelectorAll('.node-config-card');
    expect(executorCards[1].classList.contains('selected')).toBe(true);
    expect(getFieldValue('Executor type')).toBe('L4 (8 cores)');
  });
});
