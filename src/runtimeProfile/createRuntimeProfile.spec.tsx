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
import ReactDOMServer from 'react-dom/server';
import { ISectionProperty } from '../controls/SectionDetail';
import {
  CreateRuntimeProfileComponent,
  ExecutorAndDriverEditDrawer,
  RuntimeEnvironmentEditDrawer,
  MetastoreEditDrawer,
  DEFAULT_METASTORE_CONFIG,
  formatMetastoreProperties,
  AutoscalingEditDrawer,
  SessionLifecycleEditDrawer,
  OtherCustomizationEditDrawer,
  generateRandomHex,
  RuntimeProfileSummary,
  formatRuntimeProfileSummaryProperties,
  RuntimePricingEstimate,
  calculateRuntimePricingEstimate,
  calculateDcu,
  getShapeDcu,
  MACHINE_SHAPE_DCU,
  MACHINE_SHAPE_RESOURCES,
  renderGroupedMachineOptions
} from './createRuntimeProfile';
import {
  DISK_TIER_OPTIONS,
  HDD_DISK_SIZES,
  SSD_DISK_SIZES,
  isAcceleratedMachine,
  normalizeMachineTypeName,
  parseDiskTierAndSize
} from './runtimeProfileEditDrawers';
import {
  RUNTIME_PROFILE_UPDATED_EVENT,
  RuntimeProfileService
} from './runtimeProfileService';
import { IRuntimeProfileTemplate } from './runtimeProfileListMapper';
import { Notification } from '@jupyterlab/apputils';
import { authApi } from '../utils/utils';
import { eventEmitter } from '../utils/signalEmitter';
import {
  DATAPROC_ACCELERATED_MACHINE_TYPES,
  DATAPROC_STANDARD_MACHINE_TYPES,
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
  EXECUTOR_ACCELERATED_SHAPES_SUBHEADING,
  SETTINGS_COMMAND_ID,
  SETTINGS_WIDGET_TITLE
} from '../utils/const';
import { consumeRuntimeProfileListTabRequest } from './runtimeProfileNavigation';

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

  // Additional configuration is collapsed by default; open it so its
  // sections and Edit buttons are in the DOM.
  const expandAdditionalConfig = async () => {
    const header = container.querySelector(
      '.additional-config-header-container'
    ) as HTMLDivElement | null;
    if (header && header.getAttribute('aria-expanded') !== 'true') {
      await act(async () => {
        header.click();
      });
    }
  };

  it('renders Additional configuration collapsed by default and shows all 7 SectionDetail sections when expanded', async () => {
    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });

    const header = container.querySelector(
      '.additional-config-header-container'
    );
    expect(header).not.toBeNull();
    expect(header?.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('.additional-config-content')).toBeNull();

    await expandAdditionalConfig();
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
    // All 7 additional configuration sections are editable.
    Array.from(editButtons).forEach(btn => {
      expect(btn.getAttribute('aria-disabled')).toBe('false');
    });

    const displayNameInput = container.querySelector(
      '#runtime-profile-display-name'
    ) as HTMLInputElement;
    expect(displayNameInput?.value).toMatch(/^runtime-[0-9a-f]{12}$/);
    expect(getFieldValue('Runtime profile ID')).toBe(displayNameInput?.value);
    expect(getFieldValue('Spark runtime version')).toBe(
      '2.3 LTS (Spark 3.5, Java 17, Scala 2.13)'
    );
    expect(getFieldValue('Custom spark image')).toBe('None');
    expect(getFieldValue('Cloud storage staging bucket')).toBe('Auto');
    expect(getFieldValue('Python package repository')).toBe(
      'Google managed PyPI pull-through cache'
    );
    expect(getFieldValue('Autoscaling')).toBe('Enabled');
    expect(getFieldValue('Metastore')).toBe('Lakehouse runtime catalog');
    expect(getFieldValue('Hive endpoint')).toBe('Disabled');
    expect(getFieldValue('Maximum idle time')).toBe('None');
    expect(getFieldValue('Maximum session time')).toBe('None');
  });

  it('expands and collapses Additional configuration on click and keyboard Enter/Space', async () => {
    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });

    const header = container.querySelector(
      '.additional-config-header-container'
    ) as HTMLDivElement;
    expect(header.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('.additional-config-content')).toBeNull();

    // Click to expand
    await act(async () => {
      header.click();
    });
    expect(header.getAttribute('aria-expanded')).toBe('true');
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
    await expandAdditionalConfig();

    expect(getFieldValue('Runtime profile ID')).toBe('custom-runtime-id');
    expect(getFieldValue('Spark runtime version')).toBe('2.2 LTS');
    expect(getFieldValue('Custom spark image')).toBe(
      'gcr.io/my-project/spark:latest'
    );
    expect(getFieldValue('Cloud storage staging bucket')).toBe(
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
    await expandAdditionalConfig();

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
    await expandAdditionalConfig();

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
    await expandAdditionalConfig();

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
    await expandAdditionalConfig();

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
    await expandAdditionalConfig();

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
    await expandAdditionalConfig();

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
    await expandAdditionalConfig();

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

  it('lists only standard-* executor types on Standard tier and all general types on Premium', async () => {
    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });

    const openExecutorTypeMenu = async () => {
      const trigger = container.querySelector(
        '.machine-type-select-wrapper [aria-haspopup="listbox"]'
      ) as HTMLElement;
      await act(async () => {
        trigger.dispatchEvent(
          new MouseEvent('mousedown', { bubbles: true, button: 0 })
        );
      });
      return Array.from(
        document.body.querySelectorAll('li[role="option"][data-value]')
      ).map(option => option.getAttribute('data-value'));
    };
    const closeMenu = async () => {
      await act(async () => {
        document.body
          .querySelector('.MuiBackdrop-root')
          ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    };

    // Premium: standard and highmem shapes
    expect(await openExecutorTypeMenu()).toEqual([
      'standard-4',
      'standard-8',
      'standard-16',
      'highmem-4',
      'highmem-8',
      'highmem-16'
    ]);
    await closeMenu();

    // Standard tier: no highmem shapes
    const standardTierCard = container
      .querySelectorAll('.node-config-cards-container')[0]
      .querySelectorAll('.node-config-card')[1] as HTMLDivElement;
    await act(async () => {
      standardTierCard.click();
    });
    expect(await openExecutorTypeMenu()).toEqual([
      'standard-4',
      'standard-8',
      'standard-16'
    ]);
    const subheaders = Array.from(
      document.body.querySelectorAll('.machine-type-group-header')
    ).map(header => header.textContent);
    expect(subheaders).toEqual(['Standard']);
  });

  it('disables the Create button while the form has a validation error', async () => {
    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });

    const submitButton = container.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;
    const displayNameInput = container.querySelector(
      '#runtime-profile-display-name'
    ) as HTMLInputElement;
    const setValue = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    expect(submitButton.disabled).toBe(false);

    await act(async () => {
      setValue?.call(displayNameInput, '');
      displayNameInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container.textContent).toContain('Display name is required');
    expect(submitButton.disabled).toBe(true);
    expect(submitButton.classList.contains('submit-button-disable-style')).toBe(
      true
    );

    await act(async () => {
      setValue?.call(displayNameInput, 'valid-name');
      displayNameInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(submitButton.disabled).toBe(false);
    expect(submitButton.classList.contains('submit-button-style')).toBe(true);
  });

  it('returns to the Settings listing page after a profile is created', async () => {
    jest
      .spyOn(mockService, 'createRuntimeProfile')
      .mockResolvedValue({ displayName: 'created', region: 'us-central1' });

    const formWidget = { id: 'form-widget', close: jest.fn() };
    const settingsWidget = {
      id: 'settings-widget',
      title: { label: SETTINGS_WIDGET_TITLE },
      close: jest.fn()
    };
    const otherWidget = {
      id: 'other',
      title: { label: 'Notebook' },
      close: jest.fn()
    };
    const mockApp = {
      shell: {
        activeWidget: formWidget,
        widgets: jest.fn(() => [otherWidget, settingsWidget][Symbol.iterator]())
      },
      commands: { execute: jest.fn().mockResolvedValue(undefined) }
    } as any;

    await act(async () => {
      root.render(
        <CreateRuntimeProfileComponent app={mockApp} service={mockService} />
      );
    });
    await act(async () => {
      (
        container.querySelector('button[type="submit"]') as HTMLButtonElement
      ).click();
    });

    // The open Settings widget is replaced by a fresh one, so the listing
    // reloads with the new profile, and the form is closed
    expect(mockApp.shell.widgets).toHaveBeenCalledWith('main');
    expect(settingsWidget.close).toHaveBeenCalledTimes(1);
    expect(otherWidget.close).not.toHaveBeenCalled();
    expect(mockApp.commands.execute).toHaveBeenCalledWith(SETTINGS_COMMAND_ID);
    expect(formWidget.close).toHaveBeenCalledTimes(1);
    // ...and the fresh Settings layout is asked to start on the Spark tab
    expect(consumeRuntimeProfileListTabRequest()).toBe(true);

    // Without an open Settings widget, one is simply opened via its command
    mockApp.shell.widgets.mockImplementation(() =>
      [otherWidget][Symbol.iterator]()
    );
    mockApp.commands.execute.mockClear();
    await act(async () => {
      (
        container.querySelector('button[type="submit"]') as HTMLButtonElement
      ).click();
    });
    expect(settingsWidget.close).toHaveBeenCalledTimes(1);
    expect(otherWidget.close).not.toHaveBeenCalled();
    expect(mockApp.commands.execute).toHaveBeenCalledWith(SETTINGS_COMMAND_ID);
    expect(formWidget.close).toHaveBeenCalledTimes(2);
    expect(consumeRuntimeProfileListTabRequest()).toBe(true);
  });

  it('pre-selects the region saved in Settings when it is in the list', async () => {
    (authApi as jest.Mock).mockResolvedValueOnce({ region_id: 'us-east1' });
    const createSpy = jest
      .spyOn(mockService, 'createRuntimeProfile')
      .mockResolvedValue({ displayName: 'created', region: 'us-east1' });

    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });
    await expandAdditionalConfig();
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
    await expandAdditionalConfig();

    expect(Notification.emit).toHaveBeenCalledWith(
      'Permission denied',
      'error',
      { autoClose: 5000 }
    );
    consoleSpy.mockRestore();
  });

  it('clears the loading state and shows an error when authApi fails', async () => {
    (authApi as jest.Mock).mockRejectedValueOnce(new Error('Auth failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });
    await expandAdditionalConfig();

    expect(Notification.emit).toHaveBeenCalledWith('Auth failed', 'error', {
      autoClose: 5000
    });
    const regionSelect = container.querySelector('#runtime-profile-region');
    expect(regionSelect).not.toBeNull();
    expect(regionSelect?.getAttribute('aria-disabled')).not.toBe('true');
    consoleSpy.mockRestore();
  });

  it('keeps the selected machine type when re-clicking the already selected category', async () => {
    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });
    await expandAdditionalConfig();

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
    await expandAdditionalConfig();

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
    await expandAdditionalConfig();

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
    await expandAdditionalConfig();

    const executorCards = container
      .querySelectorAll('.node-config-cards-container')[1]
      .querySelectorAll('.node-config-card');
    expect(executorCards[1].classList.contains('selected')).toBe(true);
    expect(getFieldValue('Executor type')).toBe('L4 (8 cores)');
  });

  it('opens RuntimeEnvironmentEditDrawer and updates runtime configuration on save', async () => {
    expect(RuntimeEnvironmentEditDrawer).toBeDefined();
    const randomId = generateRandomHex();
    expect(randomId).toMatch(/^runtime-[0-9a-f]{12}$/);

    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });
    await expandAdditionalConfig();

    const editButtons = container.querySelectorAll(
      '.section-detail-edit-button'
    );
    await act(async () => {
      (editButtons[0] as HTMLButtonElement).click();
    });

    const profileIdInput = document.body.querySelector(
      '#edit-runtime-profile-id'
    ) as HTMLInputElement;
    expect(profileIdInput).not.toBeNull();
    expect(
      document.body.querySelector('#edit-runtime-profile-id-label')?.textContent
    ).toBe('Runtime profile ID *');
    expect(
      document.body.querySelector('#edit-dataproc-runtime-version-label')
        ?.textContent
    ).toBe('Spark runtime version *');
    expect(
      document.body.querySelector('.edit-drawer-section-heading')?.textContent
    ).toBe('Cloud storage staging bucket');
    expect(
      document.body.querySelector('#edit-cloud-storage-staging-bucket-label')
        ?.textContent
    ).toBe('Staging bucket');
    const pypiInput = document.body.querySelector(
      '#edit-python-package-repository'
    ) as HTMLInputElement;
    expect(pypiInput?.placeholder).toBe(
      'Google managed PyPI pull-through cache'
    );

    const saveBtn = document.body.querySelector(
      '.edit-drawer-footer .submit-button-style'
    ) as HTMLButtonElement;
    expect(saveBtn).not.toBeNull();

    await act(async () => {
      saveBtn.click();
    });
  });

  it('formats metastore summary labels for Lakehouse and Dataproc Metastore configs and exposes MetastoreEditDrawer', () => {
    expect(MetastoreEditDrawer).toBeDefined();

    // Default config
    const formatted = formatMetastoreProperties(DEFAULT_METASTORE_CONFIG);
    expect(formatted).toHaveLength(2);
    expect(formatted.find(p => p.label === 'Metastore')?.value).toBe(
      'Lakehouse runtime catalog'
    );
    expect(formatted.find(p => p.label === 'Hive endpoint')?.value).toBe(
      'Disabled'
    );

    // Lakehouse with specific project ID
    const formattedWithProject = formatMetastoreProperties({
      metastore: 'Lakehouse runtime catalog',
      metastoreType: 'lakehouse',
      projectId: 'frontrow-team',
      hiveEndpointEnabled: true
    });
    expect(formattedWithProject.find(p => p.label === 'Metastore')?.value).toBe(
      'Lakehouse runtime catalog (project: frontrow-team)'
    );
    expect(
      formattedWithProject.find(p => p.label === 'Hive endpoint')?.value
    ).toBe('Enabled');

    // Dataproc Metastore: Hive endpoint is Lakehouse-only, so no Hive row,
    // even if a stale hiveEndpointEnabled value is present.
    const formattedDpms = formatMetastoreProperties({
      metastoreType: 'dataproc',
      dataprocMetastoreService:
        'projects/test-proj/locations/us-central1/services/dpms-service',
      hiveEndpointEnabled: true
    });
    expect(formattedDpms).toEqual([
      {
        label: 'Metastore',
        value: 'projects/test-proj/locations/us-central1/services/dpms-service'
      }
    ]);

    expect(formatMetastoreProperties(undefined)).toEqual([]);
  });

  it("shows the metastore's project, falling back to the profile's project", () => {
    const metastoreValue = (
      config: Parameters<typeof formatMetastoreProperties>[0]
    ) =>
      formatMetastoreProperties(config, 'my-project').find(
        p => p.label === 'Metastore'
      )?.value;

    expect(metastoreValue(DEFAULT_METASTORE_CONFIG)).toBe(
      'Lakehouse runtime catalog (project: my-project)'
    );
    expect(
      metastoreValue({
        metastore: 'Lakehouse runtime catalog',
        metastoreType: 'lakehouse',
        projectId: 'other-project'
      })
    ).toBe('Lakehouse runtime catalog (project: other-project)');
    // Only the Hive endpoint: the metastore is in the Hive endpoint's project.
    expect(
      metastoreValue({
        metastore: 'Lakehouse runtime catalog',
        metastoreType: 'lakehouse',
        icebergRestEndpointEnabled: false,
        hiveEndpointEnabled: true,
        hiveProjectId: 'hive-project'
      })
    ).toBe('Lakehouse runtime catalog (project: hive-project)');
    // No endpoint: no metastore, so no project either.
    expect(
      metastoreValue({
        metastore: 'None',
        metastoreType: 'lakehouse',
        icebergRestEndpointEnabled: false,
        hiveEndpointEnabled: false
      })
    ).toBe('None');
  });

  it('shows the signed-in project in the Metastore value', async () => {
    (authApi as jest.Mock).mockResolvedValueOnce({ project_id: 'my-project' });

    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });

    expect(getFieldValue('Metastore')).toBe(
      'Lakehouse runtime catalog (project: my-project)'
    );
  });

  it('shows None for the metastore after saving with no endpoint enabled', async () => {
    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });

    // Metastore configuration is the 4th section.
    await act(async () => {
      (
        container.querySelectorAll(
          '.section-detail-edit-button'
        )[3] as HTMLButtonElement
      ).click();
    });
    const icebergCheckbox = Array.from(document.body.querySelectorAll('label'))
      .find(el => el.textContent?.trim() === 'Iceberg REST Endpoint')
      ?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await act(async () => {
      icebergCheckbox.click();
    });
    const saveButton = document.body.querySelector(
      '.edit-drawer-footer button'
    ) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
    await act(async () => {
      saveButton.click();
    });

    expect(getFieldValue('Metastore')).toBe('None');
    expect(getFieldValue('Hive endpoint')).toBe('Disabled');
    const summaryMetastore = Array.from(
      container.querySelectorAll('.runtime-summary-row')
    )
      .find(
        row =>
          row.querySelector('.runtime-summary-label')?.textContent ===
          'Metastore'
      )
      ?.querySelector('.runtime-summary-value')?.textContent;
    expect(summaryMetastore).toBe('None');
  });

  it('opens the Metastore drawer from the summary and uses the saved config', async () => {
    const createSpy = jest
      .spyOn(mockService, 'createRuntimeProfile')
      .mockResolvedValue({ displayName: 'created', region: 'us-central1' });

    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });
    await expandAdditionalConfig();

    // Metastore configuration is the 4th section.
    await act(async () => {
      (
        container.querySelectorAll(
          '.section-detail-edit-button'
        )[3] as HTMLButtonElement
      ).click();
    });
    const dataprocCard = Array.from(
      document.body.querySelectorAll('.node-config-card')
    ).find(card => card.textContent?.includes('Dataproc Metastore'));
    await act(async () => {
      (dataprocCard as HTMLElement).click();
    });
    await act(async () => {
      (
        document.body.querySelector(
          '.edit-drawer-footer button'
        ) as HTMLButtonElement
      ).click();
    });

    // The summary shows the saved Dataproc Metastore config, without a Hive row.
    expect(getFieldValue('Metastore')).toBe('None');
    expect(getFieldValue('Hive endpoint')).toBeUndefined();

    await act(async () => {
      (
        container.querySelector('button[type="submit"]') as HTMLButtonElement
      ).click();
    });
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        metastoreConfig: {
          metastore: 'Dataproc Metastore',
          metastoreType: 'dataproc',
          projectId: undefined,
          dataprocMetastoreService: undefined
        }
      }),
      undefined,
      'us-central1'
    );
  });

  it('supports browsing buckets, viewing bucket files, searching buckets, and opening create bucket placeholder drawer', async () => {
    jest
      .spyOn(mockService, 'getStorageBuckets')
      .mockResolvedValue(['bucket-alpha', 'bucket-beta']);
    jest
      .spyOn(mockService, 'getBucketObjects')
      .mockResolvedValue(['sample_notebook.ipynb', 'job.py']);

    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });
    await expandAdditionalConfig();

    // Open Runtime configuration edit drawer
    const editButtons = container.querySelectorAll(
      '.section-detail-edit-button'
    );
    await act(async () => {
      (editButtons[0] as HTMLButtonElement).click();
    });

    // Click Browse button next to staging bucket
    const browseBtn = document.body.querySelector(
      '.edit-drawer-browse-btn'
    ) as HTMLButtonElement;
    expect(browseBtn).not.toBeNull();
    await act(async () => {
      browseBtn.click();
    });

    // Verify Select bucket drawer is open and Select button is initially disabled
    const drawerTitles = Array.from(
      document.body.querySelectorAll('.edit-drawer-title')
    ).map(el => el.textContent);
    expect(drawerTitles).toContain('Select bucket');

    const bucketItems = document.body.querySelectorAll('.bucket-browser-item');
    expect(bucketItems).toHaveLength(2);

    // Resource hierarchy dropdown is disabled when on Buckets root view
    const initialHierarchyTrigger = document.body.querySelector(
      '#bucket-resource-hierarchy'
    );
    expect(initialHierarchyTrigger?.getAttribute('aria-disabled')).toBe('true');

    // 1. Click a bucket to select it -> Select button becomes enabled
    await act(async () => {
      (bucketItems[0] as HTMLElement).click();
    });
    const footerButtons = Array.from(
      document.body.querySelectorAll('.edit-drawer-footer button')
    ) as HTMLButtonElement[];
    const selectBtn = footerButtons.find(
      b => b.textContent?.trim() === 'Select'
    );
    expect(selectBtn?.disabled).toBe(false);

    // 2. Click open arrow (or selected bucket) to view files inside -> Resource hierarchy shows bucket name and Select is disabled
    const openBucketBtn = bucketItems[0].querySelector(
      '.bucket-browser-open-btn'
    ) as HTMLButtonElement;
    await act(async () => {
      openBucketBtn.click();
    });

    expect(mockService.getBucketObjects).toHaveBeenCalledWith('bucket-alpha');
    expect(selectBtn?.disabled).toBe(true);
    const hierarchyTrigger = document.body.querySelector(
      '#bucket-resource-hierarchy'
    );
    expect(hierarchyTrigger?.textContent).toContain('bucket-alpha');
    expect(hierarchyTrigger?.getAttribute('aria-disabled')).not.toBe('true');

    const fileNames = Array.from(
      document.body.querySelectorAll('.bucket-browser-item-name')
    ).map(el => el.textContent);
    expect(fileNames).toEqual(['sample_notebook.ipynb', 'job.py']);

    // Navigate back to Buckets using the back button
    const backBtn = document.body.querySelector(
      '#bucket-browser-back-btn'
    ) as HTMLButtonElement;
    await act(async () => {
      backBtn.click();
    });
    expect(selectBtn?.disabled).toBe(false);

    // 3. Click search icon -> replaces Resource hierarchy with search input and filters buckets
    const searchBtn = document.body.querySelector(
      '#bucket-browser-search-btn'
    ) as HTMLButtonElement;
    await act(async () => {
      searchBtn.click();
    });
    expect(
      document.body.querySelector('#bucket-resource-hierarchy')
    ).toBeNull();
    const searchInput = document.body.querySelector(
      '#bucket-search-input'
    ) as HTMLInputElement;
    expect(searchInput).not.toBeNull();

    // 4. Click create bucket icon -> opens Create a bucket drawer
    const createBucketBtn = document.body.querySelector(
      '#bucket-browser-create-btn'
    ) as HTMLButtonElement;
    await act(async () => {
      createBucketBtn.click();
    });
    const updatedTitles = Array.from(
      document.body.querySelectorAll('.edit-drawer-title')
    ).map(el => el.textContent);
    expect(updatedTitles).toContain('Create a bucket');
    expect(document.body.querySelector('.create-bucket-steps')).not.toBeNull();
    expect(
      document.body.querySelector('#create-bucket-name-input')
    ).not.toBeNull();
  });

  it('validates Runtime Profile ID and Cloud Storage Staging bucket in RuntimeEnvironmentEditDrawer', async () => {
    jest
      .spyOn(mockService, 'getStorageBuckets')
      .mockResolvedValue(['test_bucket']);

    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });
    await expandAdditionalConfig();

    const editButtons = container.querySelectorAll(
      '.section-detail-edit-button'
    );
    await act(async () => {
      (editButtons[0] as HTMLButtonElement).click();
    });

    const profileIdInput = document.body.querySelector(
      '#edit-runtime-profile-id'
    ) as HTMLInputElement;
    const stagingBucketInput = document.body.querySelector(
      '#edit-cloud-storage-staging-bucket'
    ) as HTMLInputElement;
    const getSaveBtn = () =>
      Array.from(
        document.body.querySelectorAll('.edit-drawer-footer button')
      ).find(b => b.textContent?.trim() === 'Save') as HTMLButtonElement;

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;

    // 1. Empty Runtime Profile ID -> required error & Save disabled
    await act(async () => {
      nativeInputValueSetter?.call(profileIdInput, '');
      profileIdInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(
      document.body.querySelector('#runtime-profile-id-error-text')?.textContent
    ).toBe('Runtime profile name is required.');
    expect(getSaveBtn()?.disabled).toBe(true);

    // 2. Invalid format Runtime Profile ID -> format error & Save disabled
    await act(async () => {
      nativeInputValueSetter?.call(profileIdInput, 'ytywteywqe***');
      profileIdInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(
      document.body.querySelector('#runtime-profile-id-error-text')?.textContent
    ).toBe(
      'A runtime profile name must start and end in a letter or a number, be between 4 and 63 characters long, and contain only lowercase letters, numbers, and hyphens.'
    );
    expect(getSaveBtn()?.disabled).toBe(true);

    // 3. Valid Runtime Profile ID -> clears error & Save enabled
    await act(async () => {
      nativeInputValueSetter?.call(profileIdInput, 'runtime-4d92');
      profileIdInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(
      document.body.querySelector('#runtime-profile-id-error-text')
    ).toBeNull();
    expect(getSaveBtn()?.disabled).toBe(false);

    // 4. Invalid / non-existing Staging bucket -> error message, red invalid bucket icon, Save disabled
    await act(async () => {
      nativeInputValueSetter?.call(stagingBucketInput, 'test123****');
      stagingBucketInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(
      document.body.querySelector('#staging-bucket-error-text')?.textContent
    ).toBe(
      'Enter the name of an existing bucket. Try browsing for the bucket instead.'
    );
    expect(
      document.body.querySelector('.bucket-input-adornment-icon.invalid')
    ).not.toBeNull();
    expect(getSaveBtn()?.disabled).toBe(true);

    // 5. Valid existing Staging bucket -> green valid bucket icon, helper text restored, Save enabled
    await act(async () => {
      nativeInputValueSetter?.call(stagingBucketInput, 'test_bucket');
      stagingBucketInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(
      document.body.querySelector('#staging-bucket-error-text')
    ).toBeNull();
    expect(
      document.body.querySelector('.bucket-input-adornment-icon.valid')
    ).not.toBeNull();
    expect(getSaveBtn()?.disabled).toBe(false);
  });

  it('should export ExecutorAndDriverEditDrawer and disk constants', () => {
    expect(ExecutorAndDriverEditDrawer).toBeDefined();
    expect(typeof ExecutorAndDriverEditDrawer).toBe('function');
    expect(DISK_TIER_OPTIONS).toEqual(['HDD (standard)', 'SSD (premium)']);
    expect(HDD_DISK_SIZES.length).toBe(14);
    expect(HDD_DISK_SIZES[0]).toBe('200 GiB');
    expect(HDD_DISK_SIZES[HDD_DISK_SIZES.length - 1]).toBe('1500 GiB');
    expect(SSD_DISK_SIZES.length).toBe(6);
    expect(SSD_DISK_SIZES[0]).toBe('375 GiB');
    expect(SSD_DISK_SIZES[SSD_DISK_SIZES.length - 1]).toBe('9000 GiB');
  });

  it('should parse disk tier and size correctly with parseDiskTierAndSize', () => {
    expect(parseDiskTierAndSize('HDD (standard), 200 GiB')).toEqual({
      tier: 'HDD (standard)',
      size: '200 GiB'
    });
    expect(parseDiskTierAndSize('SSD (premium), 375 GiB')).toEqual({
      tier: 'SSD (premium)',
      size: '375 GiB'
    });
    expect(parseDiskTierAndSize('SSD persistent disk, 750 GB')).toEqual({
      tier: 'SSD (premium)',
      size: '750 GiB'
    });
    expect(parseDiskTierAndSize('')).toEqual({
      tier: 'HDD (standard)',
      size: '200 GiB'
    });
    expect(parseDiskTierAndSize(undefined, 'SSD (premium)')).toEqual({
      tier: 'SSD (premium)',
      size: '375 GiB'
    });
  });

  it('should normalize machine type names correctly', () => {
    expect(normalizeMachineTypeName('highmem-4 (4 vCPU, 32 GB)')).toBe(
      'highmem-4'
    );
    expect(normalizeMachineTypeName('standard-4 (4 vCPU, 16 GB)')).toBe(
      'standard-4'
    );
    expect(normalizeMachineTypeName('L4 (4 cores)')).toBe('l4-4');
    expect(normalizeMachineTypeName('A100 (40 GB)')).toBe('a100-40');
    expect(normalizeMachineTypeName('highmem-4')).toBe('highmem-4');
    expect(normalizeMachineTypeName('')).toBe('highmem-4');
  });

  it('should detect accelerated machine shapes with isAcceleratedMachine', () => {
    expect(
      isAcceleratedMachine('l4-4', DATAPROC_ACCELERATED_MACHINE_TYPES)
    ).toBe(true);
    expect(
      isAcceleratedMachine('a100-40', DATAPROC_ACCELERATED_MACHINE_TYPES)
    ).toBe(true);
    expect(
      isAcceleratedMachine('h100-26', DATAPROC_ACCELERATED_MACHINE_TYPES)
    ).toBe(true);
    expect(
      isAcceleratedMachine('g2-standard-4', DATAPROC_ACCELERATED_MACHINE_TYPES)
    ).toBe(true);
    expect(
      isAcceleratedMachine('standard-4', DATAPROC_STANDARD_MACHINE_TYPES)
    ).toBe(false);
    expect(
      isAcceleratedMachine('highmem-4', DATAPROC_STANDARD_MACHINE_TYPES)
    ).toBe(false);
  });

  it('should instantiate ExecutorAndDriverEditDrawer with props and save updated configuration from UI', async () => {
    const onSaveMock = jest.fn();
    const onCloseMock = jest.fn();
    const element = React.createElement(ExecutorAndDriverEditDrawer, {
      open: true,
      config: {
        tier: 'Premium',
        lightningEngineEnabled: true,
        executorType: 'highmem-4 (4 vCPU, 32 GB)',
        executorDisk: 'HDD (standard), 200 GiB',
        driverMachineType: 'highmem-4 (4 vCPU, 32 GB)',
        driverDisk: 'HDD (standard), 200 GiB',
        useDifferentDriverConfig: false
      },
      onClose: onCloseMock,
      onSave: onSaveMock
    });

    expect(element).toBeDefined();
    expect(element.type).toBe(ExecutorAndDriverEditDrawer);
    expect(element.props.open).toBe(true);
    expect(element.props.config.tier).toBe('Premium');
    expect(element.props.config.useDifferentDriverConfig).toBe(false);

    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });
    await expandAdditionalConfig();

    const editButtons = container.querySelectorAll(
      '.section-detail-edit-button'
    );
    await act(async () => {
      (editButtons[1] as HTMLButtonElement).click();
    });

    const drawerTitle = Array.from(
      document.body.querySelectorAll('.edit-drawer-title')
    ).map(el => el.textContent);
    expect(drawerTitle).toContain('Executor and driver configuration');

    const saveBtn = Array.from(
      document.body.querySelectorAll('.edit-drawer-footer button')
    ).find(b => b.textContent?.trim() === 'Save') as HTMLButtonElement;
    expect(saveBtn).not.toBeNull();

    await act(async () => {
      saveBtn.click();
    });
  });

  it('maintains Lightning Engine checkbox state when toggling between Premium and Standard tier in ExecutorAndDriverEditDrawer', async () => {
    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });
    await expandAdditionalConfig();

    const editButtons = container.querySelectorAll(
      '.section-detail-edit-button'
    );
    await act(async () => {
      (editButtons[1] as HTMLButtonElement).click();
    });

    const drawerBody = document.body.querySelector('.edit-drawer-body');
    expect(drawerBody).not.toBeNull();

    const getDrawerCheckbox = () =>
      drawerBody?.querySelector(
        '.runtime-profile-checkbox-section input[type="checkbox"]'
      ) as HTMLInputElement;

    // Initially checked on Premium tier
    expect(getDrawerCheckbox()?.checked).toBe(true);

    // User unchecks Lightning Engine
    await act(async () => {
      getDrawerCheckbox().click();
    });
    expect(getDrawerCheckbox()?.checked).toBe(false);

    // User switches to Standard tier and back to Premium tier inside the drawer
    const tierCards = drawerBody?.querySelectorAll(
      '.node-config-card'
    ) as NodeListOf<HTMLDivElement>;
    await act(async () => {
      tierCards[1].click(); // Standard
    });
    expect(getDrawerCheckbox()).toBeNull();

    await act(async () => {
      tierCards[0].click(); // Premium
    });
    // Unchecked state must be preserved
    expect(getDrawerCheckbox()?.checked).toBe(false);
  });

  it('should format default runtime profile summary rows', () => {
    const rows: ISectionProperty[] = formatRuntimeProfileSummaryProperties({
      tier: 'Premium',
      lightningEngineEnabled: true,
      regionDisplayName: 'us-central1 (Iowa)',
      runtimeVersion: '2.3 LTS (Spark 3.5.1, Python 3.12)',
      executorMachineType: 'highmem-4',
      executorDisk: 'SSD (premium), 375 GiB',
      useDifferentDriverConfig: false,
      autoscalingEnabled: true,
      initialExecutors: 5,
      minExecutors: 2,
      maxExecutors: 300,
      metastore: 'Lakehouse runtime catalog',
      projectId: 'frontrow-team'
    });

    expect(rows).toHaveLength(7);
    expect(
      rows.find((r: ISectionProperty) => r.label === 'Profile tier')?.value
    ).toBe('Premium (Lightning Engine enabled)');
    expect(
      rows.find((r: ISectionProperty) => r.label === 'Region')?.value
    ).toBe('us-central1 (Iowa)');
    expect(
      rows.find((r: ISectionProperty) => r.label === 'Version')?.value
    ).toBe('2.3 LTS (Spark 3.5.1, Python 3.12)');
    expect(
      rows.find((r: ISectionProperty) => r.label === 'Executor node')?.value
    ).toBe('highmem-4 (4 vCPU, 32 GB), 375 GB SSD');
    expect(
      rows.find((r: ISectionProperty) => r.label === 'Driver node')?.value
    ).toBe('Same as executor');
    expect(
      rows.find((r: ISectionProperty) => r.label === 'Autoscaling')?.value
    ).toBe('Enabled (Min: 2, Max: 300)');
    expect(
      rows.find((r: ISectionProperty) => r.label === 'Metastore')?.value
    ).toBe('Lakehouse runtime catalog (frontrow-team)');
  });

  it('should render standalone RuntimeProfileSummary component with edit-drawer styling and inject it into CreateRuntimeProfileComponent by default when EditDrawer is closed', async () => {
    expect(RuntimeProfileSummary).toBeDefined();

    const summaryMarkup = ReactDOMServer.renderToStaticMarkup(
      <RuntimeProfileSummary
        summaryInput={{
          tier: 'Premium',
          lightningEngineEnabled: true,
          regionDisplayName: 'us-central1 (Iowa)',
          runtimeVersion: '2.3 LTS (Spark 3.5.1, Python 3.12)',
          executorMachineType: 'highmem-4',
          executorDisk: 'SSD (premium), 375 GiB',
          useDifferentDriverConfig: false,
          autoscalingEnabled: true,
          initialExecutors: 5,
          minExecutors: 2,
          maxExecutors: 300,
          metastore: 'Lakehouse runtime catalog',
          projectId: 'frontrow-team'
        }}
      />
    );
    expect(summaryMarkup).toContain('runtime-summary-section');
    expect(summaryMarkup).toContain('Summary');
    expect(summaryMarkup).toContain('Premium (Lightning Engine enabled)');
    expect(summaryMarkup).toContain('Same as executor');

    await act(async () => {
      root.render(
        <CreateRuntimeProfileComponent
          service={mockService}
          SummaryComponent={RuntimeProfileSummary}
        />
      );
    });
    await expandAdditionalConfig();
    expect(container.innerHTML).toContain(
      'data-testid="runtime-profile-summary-section"'
    );
    expect(container.innerHTML).toContain('Same as executor');
  });

  it('should handle Standard tier, disabled autoscaling, separate driver config, and empty fallbacks in summary', async () => {
    const customRows = formatRuntimeProfileSummaryProperties({
      tier: 'Standard',
      lightningEngineEnabled: false,
      regionDisplayName: 'us-east1 (South Carolina)',
      runtimeVersion: '2.3',
      executorMachineType: 'standard-8',
      executorDisk: 'Standard persistent disk (HDD), 400 GB',
      driverMachineType: 'standard-4',
      driverDisk: 'Standard persistent disk (HDD), 200 GB',
      useDifferentDriverConfig: true,
      autoscalingEnabled: false,
      initialExecutors: 4,
      metastore: 'None',
      projectId: 'frontrow-team'
    });

    expect(customRows.find(r => r.label === 'Profile tier')?.value).toBe(
      'Standard'
    );
    expect(customRows.find(r => r.label === 'Executor node')?.value).toBe(
      '4 x standard-8 (8 vCPU, 32 GB), 400 GB HDD'
    );
    expect(customRows.find(r => r.label === 'Driver node')?.value).toBe(
      'standard-4 (4 vCPU, 16 GB), 200 GB HDD'
    );
    expect(customRows.find(r => r.label === 'Autoscaling')?.value).toBe(
      'Disabled'
    );
    expect(customRows.find(r => r.label === 'Metastore')?.value).toBe('None');

    const acceleratedRows = formatRuntimeProfileSummaryProperties({
      tier: 'Premium',
      lightningEngineEnabled: true,
      executorMachineType: 'l4-4',
      executorDisk: 'SSD (premium), 375 GiB',
      useDifferentDriverConfig: false
    });
    expect(acceleratedRows.find(r => r.label === 'Executor node')?.value).toBe(
      'L4 (4 cores), 375 GB SSD'
    );

    const emptyRows = formatRuntimeProfileSummaryProperties({
      tier: 'Premium',
      lightningEngineEnabled: false,
      useDifferentDriverConfig: true
    });
    expect(emptyRows.find(r => r.label === 'Profile tier')?.value).toBe(
      'Premium'
    );
    expect(emptyRows.find(r => r.label === 'Region')?.value).toBe('—');
    expect(emptyRows.find(r => r.label === 'Version')?.value).toBe('—');
    expect(emptyRows.find(r => r.label === 'Executor node')?.value).toBe('—');
    expect(emptyRows.find(r => r.label === 'Driver node')?.value).toBe('—');
    expect(emptyRows.find(r => r.label === 'Metastore')?.value).toBe('—');
  });

  it('should display separate driver configuration in Summary when driver differs from executor in CreateRuntimeProfileComponent', async () => {
    await act(async () => {
      root.render(
        <CreateRuntimeProfileComponent
          service={mockService}
          initialExecutorType="highmem-4"
          initialExecutorAndDriverConfig={{
            tier: 'Premium',
            executorType: 'highmem-4',
            executorDisk: 'HDD (standard), 200 GiB',
            useDifferentDriverConfig: true,
            driverMachineType: 'standard-8',
            driverDisk: 'HDD (standard), 400 GiB'
          }}
        />
      );
    });
    await expandAdditionalConfig();

    const getSummaryRowValue = (label: string): string | undefined => {
      const rows = Array.from(
        container.querySelectorAll(
          '[data-testid="runtime-profile-summary-section"] .runtime-summary-row'
        )
      );
      const matched = rows.find(
        row =>
          row.querySelector('.runtime-summary-label')?.textContent?.trim() ===
          label
      );
      return matched
        ?.querySelector('.runtime-summary-value')
        ?.textContent?.trim();
    };

    expect(getSummaryRowValue('Executor node')).toBe(
      'highmem-4 (4 vCPU, 32 GB), 200 GB HDD'
    );
    expect(getSummaryRowValue('Driver node')).toBe(
      'standard-8 (8 vCPU, 32 GB), 400 GB HDD'
    );
  });

  it('should update Summary Profile tier row when toggling Lightning Engine checkbox on the form', async () => {
    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });
    await expandAdditionalConfig();

    const getProfileTierSummaryValue = (): string | undefined => {
      const rows = Array.from(
        container.querySelectorAll(
          '[data-testid="runtime-profile-summary-section"] .runtime-summary-row'
        )
      );
      const matched = rows.find(
        row =>
          row.querySelector('.runtime-summary-label')?.textContent?.trim() ===
          'Profile tier'
      );
      return matched
        ?.querySelector('.runtime-summary-value')
        ?.textContent?.trim();
    };

    expect(getProfileTierSummaryValue()).toBe(
      'Premium (Lightning Engine enabled)'
    );

    const lightningCheckbox = container.querySelector(
      '.runtime-profile-checkbox-section input[type="checkbox"]'
    ) as HTMLInputElement;
    expect(lightningCheckbox).not.toBeNull();
    expect(lightningCheckbox.checked).toBe(true);

    // Uncheck Lightning Engine
    await act(async () => {
      lightningCheckbox.click();
    });
    expect(lightningCheckbox.checked).toBe(false);
    expect(getProfileTierSummaryValue()).toBe('Premium');

    // Re-check Lightning Engine
    await act(async () => {
      lightningCheckbox.click();
    });
    expect(lightningCheckbox.checked).toBe(true);
    expect(getProfileTierSummaryValue()).toBe(
      'Premium (Lightning Engine enabled)'
    );
  });

  describe('edit mode', () => {
    const profileToEdit: IRuntimeProfileTemplate = {
      name: 'projects/test-project/locations/us-central1/sessionTemplates/sample_profile',
      description: 'Existing description',
      jupyterSession: { displayName: 'Sample Profile', kernel: 'PYTHON' },
      environmentConfig: {
        executionConfig: {
          subnetworkUri: 'default',
          kmsKey: 'projects/p/locations/l/keyRings/kr/cryptoKeys/k',
          idleTtl: '3600s',
          ttl: '259200s',
          authenticationConfig: {
            userWorkloadAuthenticationType: 'END_USER_CREDENTIALS'
          }
        },
        peripheralsConfig: {
          metastoreService: 'projects/p/locations/l/services/my-metastore'
        }
      },
      runtimeConfig: {
        version: '2.2',
        containerImage: 'gcr.io/my-project/spark:latest',
        properties: {
          'dataproc:dataproc.tier': 'premium',
          'spark:spark.dataproc.engine': 'lightningEngine',
          'spark:spark.executor.cores': '8',
          'spark:spark.executor.memory': '64g',
          'spark:spark.dynamicAllocation.maxExecutors': '20',
          'spark:spark.sql.shuffle.partitions': '200'
        }
      },
      labels: { env: 'dev' }
    };

    const renderEditForm = (onSuccess?: () => void) =>
      act(async () => {
        root.render(
          <CreateRuntimeProfileComponent
            service={mockService}
            mode="edit"
            profile={profileToEdit}
            onSuccess={onSuccess}
          />
        );
      });

    const clickSave = () =>
      act(async () => {
        (
          container.querySelector('button[type="submit"]') as HTMLButtonElement
        ).click();
      });

    it('shows the Edit heading and pre-fills every field from the selected profile', async () => {
      // The saved Settings region must not replace the profile's region
      (authApi as jest.Mock).mockResolvedValueOnce({ region_id: 'us-east1' });
      await renderEditForm();

      expect(
        container.querySelector('.cluster-details-title')?.textContent
      ).toBe('Edit Runtime Profile');
      expect(
        (
          container.querySelector(
            '#runtime-profile-display-name'
          ) as HTMLInputElement
        ).value
      ).toBe('Sample Profile');
      expect(
        (
          container.querySelector(
            '#runtime-profile-description'
          ) as HTMLInputElement
        ).value
      ).toBe('Existing description');

      const regionSelect = container.querySelector('#runtime-profile-region');
      expect(regionSelect?.textContent).toBe('us-central1');
      expect(regionSelect?.getAttribute('aria-disabled')).toBe('true');

      const premiumTierCard = container
        .querySelectorAll('.node-config-cards-container')[0]
        .querySelectorAll('.node-config-card')[0];
      expect(premiumTierCard.classList.contains('selected')).toBe(true);
      expect(
        (
          container.querySelector(
            'input[name="lightningEngine"]'
          ) as HTMLInputElement
        ).checked
      ).toBe(true);

      expect(getFieldValue('Runtime profile ID')).toBe('sample_profile');
      expect(getFieldValue('Spark runtime version')).toBe('2.2');
      expect(getFieldValue('Custom spark image')).toBe(
        'gcr.io/my-project/spark:latest'
      );
      expect(getFieldValue('Tier')).toBe('Premium');
      expect(getFieldValue('Executor type')).toBe('highmem-8 (8 vCPU, 64 GB)');
      expect(getFieldValue('Maximum executors')).toBe('20');
      expect(getFieldValue('Metastore')).toBe(
        'projects/p/locations/l/services/my-metastore'
      );
      expect(getFieldValue('Execution identity')).toBe('User account');
      expect(getFieldValue('Network in this project')).toBe('default');
      expect(getFieldValue('Encryption')).toBe('Customer-managed key');
      expect(getFieldValue('Maximum idle time')).toBe('1 hour');
      expect(getFieldValue('Maximum session time')).toBe('3 days');
      expect(getFieldValue('Spark properties')).toBe(
        'spark:spark.sql.shuffle.partitions: 200'
      );
      expect(getFieldValue('Labels')).toBe('env: dev');

      expect(
        container.querySelector('button[type="submit"]')?.textContent
      ).toBe('Save');
    });

    it('saves through updateRuntimeProfile and announces the saved profile', async () => {
      const savedProfile = { ...profileToEdit, description: 'Saved' };
      const updateSpy = jest
        .spyOn(mockService, 'updateRuntimeProfile')
        .mockResolvedValue(savedProfile);
      const createSpy = jest.spyOn(mockService, 'createRuntimeProfile');
      const onProfileUpdated = jest.fn();
      eventEmitter.on(RUNTIME_PROFILE_UPDATED_EVENT, onProfileUpdated);
      const onSuccess = jest.fn();
      (authApi as jest.Mock).mockResolvedValueOnce({ region_id: 'us-east1' });

      await renderEditForm(onSuccess);
      await clickSave();
      eventEmitter.off(RUNTIME_PROFILE_UPDATED_EVENT, onProfileUpdated);

      expect(createSpy).not.toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalledWith(
        profileToEdit,
        expect.objectContaining({
          displayName: 'Sample Profile',
          region: 'us-central1',
          description: 'Existing description',
          tier: 'Premium',
          lightningEngineEnabled: true,
          executorConfig: { executorType: 'general', machineType: 'highmem-8' },
          sparkProperties: { 'spark:spark.sql.shuffle.partitions': '200' },
          labels: { env: 'dev' }
        })
      );
      expect(Notification.emit).toHaveBeenCalledWith(
        'Runtime profile "Sample Profile" updated successfully.',
        'success',
        { autoClose: 5000 }
      );
      expect(onProfileUpdated).toHaveBeenCalledWith(savedProfile);
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('shows the update error, with a fallback message when none is given', async () => {
      jest
        .spyOn(mockService, 'updateRuntimeProfile')
        .mockRejectedValueOnce(new Error('Permission denied'))
        .mockRejectedValueOnce({});
      const onSuccess = jest.fn();

      await renderEditForm(onSuccess);
      await clickSave();
      expect(Notification.emit).toHaveBeenCalledWith(
        'Permission denied',
        'error',
        { autoClose: 5000 }
      );

      await clickSave();
      expect(Notification.emit).toHaveBeenCalledWith(
        'Failed to update runtime profile.',
        'error',
        { autoClose: 5000 }
      );
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('keeps the Runtime Profile ID read-only in the runtime configuration drawer', async () => {
      await renderEditForm();

      await act(async () => {
        (
          container.querySelector(
            '.section-detail-edit-button'
          ) as HTMLButtonElement
        ).click();
      });

      const profileIdInput = document.body.querySelector(
        '#edit-runtime-profile-id'
      ) as HTMLInputElement;
      expect(profileIdInput.disabled).toBe(true);
      expect(profileIdInput.value).toBe('sample_profile');
      // The existing ID isn't re-validated against the create-time format
      expect(
        document.body.querySelector('#runtime-profile-id-error-text')
      ).toBeNull();
      const saveBtn = Array.from(
        document.body.querySelectorAll('.edit-drawer-footer button')
      ).find(b => b.textContent?.trim() === 'Save') as HTMLButtonElement;
      expect(saveBtn.disabled).toBe(false);
    });

    it('keeps Metastore, Network and security, and Session lifecycle read-only until the update mapper saves them', async () => {
      await renderEditForm();

      const sectionEditButtons = Array.from(
        container.querySelectorAll<HTMLButtonElement>(
          '.section-detail-edit-button'
        )
      );
      expect(sectionEditButtons).toHaveLength(7);
      // Runtime config (0), Executor and driver (1), Autoscaling (2) and
      // Other customizations (6) are saved by the update; Metastore (3),
      // Network and security (4) and Session lifecycle (5) are not yet.
      const expectedDisabled = [false, false, false, true, true, true, false];
      sectionEditButtons.forEach((btn, idx) =>
        expect(btn.getAttribute('aria-disabled')).toBe(
          String(expectedDisabled[idx])
        )
      );

      // A disabled section doesn't open its drawer.
      await act(async () => {
        sectionEditButtons[4].click();
      });
      expect(
        document.body.querySelector('#edit-network-source-project')
      ).toBeNull();
    });

    it('leaves every section editable in create mode', async () => {
      await act(async () => {
        root.render(<CreateRuntimeProfileComponent service={mockService} />);
      });

      const sectionEditButtons = Array.from(
        container.querySelectorAll<HTMLButtonElement>(
          '.section-detail-edit-button'
        )
      );
      expect(sectionEditButtons).toHaveLength(7);
      sectionEditButtons.forEach(btn =>
        expect(btn.getAttribute('aria-disabled')).toBe('false')
      );
    });
  });

  it('should provide network, subnetwork, shared VPC, keyRing, and cryptoKey methods on RuntimeProfileService', async () => {
    const networks = await mockService.getNetworks();
    expect(networks).toEqual(['default']);

    const subnetworks = await mockService.getSubnetworks('default');
    expect(subnetworks).toEqual(['default']);

    const sharedVpc = await mockService.getSharedVpcSubnetworks();
    expect(sharedVpc).toEqual({ hostProjectId: '', subnetworks: [] });

    const keyRings = await mockService.getKeyRings();
    expect(keyRings).toEqual([]);

    const cryptoKeys = await mockService.getCryptoKeys('test-ring');
    expect(cryptoKeys).toEqual([]);
  });

  it('disables Save in NetworkSecurityEditDrawer when shared network has no available subnetworks', async () => {
    const sharedVpcSpy = jest
      .spyOn(mockService, 'getSharedVpcSubnetworks')
      .mockResolvedValue({ hostProjectId: '', subnetworks: [] });

    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });
    await expandAdditionalConfig();

    // Open Network and security edit drawer (index 4)
    const editButtons = container.querySelectorAll(
      '.section-detail-edit-button'
    );
    await act(async () => {
      (editButtons[4] as HTMLButtonElement).click();
    });

    // Should not fetch shared VPC subnetworks when 'project' network source is selected
    expect(sharedVpcSpy).not.toHaveBeenCalled();

    const getSaveBtn = () =>
      Array.from(
        document.body.querySelectorAll('.edit-drawer-footer button')
      ).find(b => b.textContent?.trim() === 'Save') as HTMLButtonElement;

    expect(getSaveBtn()?.disabled).toBe(false);

    // Switch to 'Networks shared from host project'
    const sharedRadio = document.body.querySelector(
      '#edit-network-source-shared'
    ) as HTMLInputElement;
    expect(sharedRadio).not.toBeNull();
    await act(async () => {
      sharedRadio.click();
    });

    expect(sharedVpcSpy).toHaveBeenCalledTimes(1);
    expect(
      document.body.querySelector('.edit-drawer-info-banner-text')?.textContent
    ).toBe('No shared subnetworks are available in this region.');
    expect(
      document.body.querySelector('#edit-shared-network-tags')
    ).not.toBeNull();
    expect(getSaveBtn()?.disabled).toBe(true);

    // Open Shared subnetwork dropdown and verify 'No items to display' is shown
    const sharedSubnetTrigger = document.body.querySelector(
      '#edit-shared-subnetwork'
    ) as HTMLElement;
    expect(sharedSubnetTrigger).not.toBeNull();
    await act(async () => {
      sharedSubnetTrigger.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, button: 0 })
      );
    });
    const emptyOption = document.body.querySelector(
      'li[role="option"][data-value="__no_items__"]'
    );
    expect(emptyOption?.textContent).toBe('No items to display');

    // Switch back to 'Networks in this project'
    const projectRadio = document.body.querySelector(
      '#edit-network-source-project'
    ) as HTMLInputElement;
    await act(async () => {
      projectRadio.click();
    });
    expect(getSaveBtn()?.disabled).toBe(false);

    // Selecting Cloud KMS key without a key ring / crypto key disables Save
    const cmekRadio = document.body.querySelector(
      '#edit-encryption-customer-managed'
    ) as HTMLInputElement;
    await act(async () => {
      cmekRadio.click();
    });
    expect(getSaveBtn()?.disabled).toBe(true);

    // Switch back to Google-managed encryption key
    const googleManagedRadio = document.body.querySelector(
      '#edit-encryption-google-managed'
    ) as HTMLInputElement;
    await act(async () => {
      googleManagedRadio.click();
    });
    expect(getSaveBtn()?.disabled).toBe(false);
  });

  it('validates Autoscaling, SessionLifecycle, and OtherCustomization edit drawers', async () => {
    expect(AutoscalingEditDrawer).toBeDefined();
    expect(SessionLifecycleEditDrawer).toBeDefined();
    expect(OtherCustomizationEditDrawer).toBeDefined();

    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });
    await expandAdditionalConfig();

    const editButtons = container.querySelectorAll(
      '.section-detail-edit-button'
    );
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    const getSaveBtn = () =>
      Array.from(document.body.querySelectorAll('.edit-drawer-footer button'))
        .filter(b => b.textContent?.trim() === 'Save')
        .pop() as HTMLButtonElement;

    // 1. Autoscaling drawer validation
    await act(async () => {
      (editButtons[2] as HTMLButtonElement).click();
    });
    const initExecInput = document.body.querySelector(
      '#edit-initial-executors'
    ) as HTMLInputElement;
    const minExecInput = document.body.querySelector(
      '#edit-minimum-executors'
    ) as HTMLInputElement;
    const maxExecInput = document.body.querySelector(
      '#edit-maximum-executors'
    ) as HTMLInputElement;
    const enabledCheckbox = document.body.querySelector(
      '#edit-autoscaling-enabled'
    ) as HTMLInputElement;

    await act(async () => {
      nativeInputValueSetter?.call(initExecInput, '****');
      initExecInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(
      document.body.querySelector('#initial-executors-error-text')?.textContent
    ).toBe('Initial executors must be an integer.');
    expect(getSaveBtn()?.disabled).toBe(true);

    await act(async () => {
      nativeInputValueSetter?.call(initExecInput, '-2');
      initExecInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(
      document.body.querySelector('#initial-executors-error-text')?.textContent
    ).toBe('Initial executors must be greater than or equal to 2.');

    // Cross-field range validation: Initial < Minimum
    await act(async () => {
      nativeInputValueSetter?.call(initExecInput, '2');
      initExecInput.dispatchEvent(new Event('input', { bubbles: true }));
      nativeInputValueSetter?.call(minExecInput, '4');
      minExecInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(
      document.body.querySelector('#initial-executors-error-text')?.textContent
    ).toBe('Initial executors must be between minimum and maximum executors.');
    expect(getSaveBtn()?.disabled).toBe(true);

    // Cross-field range validation: Minimum > Maximum
    await act(async () => {
      nativeInputValueSetter?.call(minExecInput, '10');
      minExecInput.dispatchEvent(new Event('input', { bubbles: true }));
      nativeInputValueSetter?.call(maxExecInput, '5');
      maxExecInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(
      document.body.querySelector('#minimum-executors-error-text')?.textContent
    ).toBe('Minimum executors must not exceed maximum executors.');
    expect(getSaveBtn()?.disabled).toBe(true);

    // Unchecking Enabled disables fields and bypasses validation
    await act(async () => {
      enabledCheckbox.click();
    });
    expect(initExecInput.disabled).toBe(true);
    expect(minExecInput.disabled).toBe(true);
    expect(maxExecInput.disabled).toBe(true);
    expect(
      document.body.querySelector('#initial-executors-error-text')
    ).toBeNull();
    expect(
      document.body.querySelector('#minimum-executors-error-text')
    ).toBeNull();
    expect(getSaveBtn()?.disabled).toBe(false);

    // Re-checking Enabled restores validation until valid range is entered
    await act(async () => {
      enabledCheckbox.click();
    });
    expect(getSaveBtn()?.disabled).toBe(true);

    await act(async () => {
      nativeInputValueSetter?.call(minExecInput, '2');
      minExecInput.dispatchEvent(new Event('input', { bubbles: true }));
      nativeInputValueSetter?.call(maxExecInput, '1000');
      maxExecInput.dispatchEvent(new Event('input', { bubbles: true }));
      nativeInputValueSetter?.call(initExecInput, '4');
      initExecInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(
      document.body.querySelector('#initial-executors-error-text')
    ).toBeNull();
    expect(
      document.body.querySelector('#minimum-executors-error-text')
    ).toBeNull();
    expect(getSaveBtn()?.disabled).toBe(false);
    await act(async () => {
      getSaveBtn().click();
    });

    // 2. Session lifecycle drawer validation
    expect(getFieldValue('Maximum idle time')).toBe('None');
    expect(getFieldValue('Maximum session time')).toBe('None');
    await act(async () => {
      (editButtons[5] as HTMLButtonElement).click();
    });
    const idleQtyInput = document.body.querySelector(
      '#edit-max-idle-time-quantity'
    ) as HTMLInputElement;
    const sessionQtyInput = document.body.querySelector(
      '#edit-max-session-time-quantity'
    ) as HTMLInputElement;
    expect(idleQtyInput.value).toBe('60');
    expect(sessionQtyInput.value).toBe('3');

    await act(async () => {
      nativeInputValueSetter?.call(idleQtyInput, '0');
      idleQtyInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(
      document.body.querySelector('#max-idle-time-quantity-error-text')
        ?.textContent
    ).toBe('Max idle time must be between 10 minutes and 330 hours.');
    expect(getSaveBtn()?.disabled).toBe(true);

    await act(async () => {
      nativeInputValueSetter?.call(idleQtyInput, '30');
      idleQtyInput.dispatchEvent(new Event('input', { bubbles: true }));
      nativeInputValueSetter?.call(sessionQtyInput, '15');
      sessionQtyInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(
      document.body.querySelector('#max-session-time-quantity-error-text')
        ?.textContent
    ).toBe('Max session time must be between 10 minutes and 14 days.');
    expect(getSaveBtn()?.disabled).toBe(true);

    await act(async () => {
      nativeInputValueSetter?.call(sessionQtyInput, '3');
      sessionQtyInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(getSaveBtn()?.disabled).toBe(false);
    await act(async () => {
      getSaveBtn().click();
    });
    expect(getFieldValue('Maximum idle time')).toBe('30 minutes');
    expect(getFieldValue('Maximum session time')).toBe('3 days');

    // 3. Other customizations drawer validation
    await act(async () => {
      (editButtons[6] as HTMLButtonElement).click();
    });
    const addBtns = Array.from(
      document.body.querySelectorAll('.edit-drawer-add-btn')
    ) as HTMLButtonElement[];
    await act(async () => {
      addBtns[0].click();
      addBtns[1].click();
    });
    expect(document.body.querySelector('#spark-key-error-0')?.textContent).toBe(
      'Key is required'
    );
    expect(document.body.querySelector('#label-key-error-0')?.textContent).toBe(
      'Key is required'
    );
    expect(getSaveBtn()?.disabled).toBe(true);
  });

  it('syncs autoscaling, session lifecycle, spark properties, and labels when initial* props update', async () => {
    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });
    await expandAdditionalConfig();

    await act(async () => {
      root.render(
        <CreateRuntimeProfileComponent
          service={mockService}
          initialAutoscalingConfig={{
            autoscalingEnabled: false,
            initialExecutors: 6,
            minExecutors: 3,
            maxExecutors: 50
          }}
          initialSessionLifecycleConfig={{
            maxIdleTime: '45 minutes',
            maxSessionTime: '5 days'
          }}
          initialSparkProperties={{ 'spark.sql.shuffle.partitions': '200' }}
          initialLabels={{ env: 'staging' }}
        />
      );
    });
    await expandAdditionalConfig();

    expect(getFieldValue('Autoscaling')).toBe('Disabled');
    expect(getFieldValue('Initial executors')).toBe('6');
    expect(getFieldValue('Maximum idle time')).toBe('45 minutes');
    expect(getFieldValue('Maximum session time')).toBe('5 days');
    expect(getFieldValue('Spark properties')).toBe(
      'spark.sql.shuffle.partitions: 200'
    );
    expect(getFieldValue('Labels')).toBe('env: staging');
  });

  it('should calculate runtime pricing estimate DCU values across machine shapes and autoscaling configurations', () => {
    expect(MACHINE_SHAPE_RESOURCES['highmem-4']).toEqual({
      vcpus: 4,
      memoryGib: 32
    });
    expect(calculateDcu(4, 32)).toBe(5.6);
    expect(calculateDcu(12, 170)).toBe(31.6);
    expect(MACHINE_SHAPE_DCU['highmem-4']).toBe(5.6);
    expect(MACHINE_SHAPE_DCU['standard-4']).toBe(4);
    expect(MACHINE_SHAPE_DCU['l4-4']).toBe(4);
    expect(MACHINE_SHAPE_DCU['a100-40']).toBe(15.7);
    expect(MACHINE_SHAPE_DCU['a100-80']).toBe(31.6);
    expect(getShapeDcu('highmem-4 (4 vCPU, 32 GB)')).toBe(5.6);
    expect(getShapeDcu('L4 (4 cores)')).toBe(4);
    expect(getShapeDcu('A100 (80 GB)')).toBe(31.6);
    expect(getShapeDcu('unknown-shape')).toBe(0);
    expect(getShapeDcu('')).toBe(0);

    // 1. Baseline and autoscaling range for highmem-4 (5.6 DCU, initialExecutors: 5, minExecutors: 2, maxExecutors: 1000)
    const defaultEstimate = calculateRuntimePricingEstimate({
      executorMachineType: 'highmem-4',
      useDifferentDriverConfig: false,
      autoscalingEnabled: true,
      initialExecutors: 5,
      minExecutors: 2,
      maxExecutors: 1000
    });
    expect(defaultEstimate.hero).toBe('33.6 DCU hours / hour of usage');
    expect(defaultEstimate.baselineCaption).toBe(
      'Baseline for 1 driver and 5 initial executors'
    );
    expect(defaultEstimate.subjectToAutoscaling).toBe(true);
    expect(defaultEstimate.executorRowLabel).toBe('Executor nodes (initial 5)');
    expect(defaultEstimate.executorRowValue).toBe(
      '28 DCU hours / hour of usage'
    );
    expect(defaultEstimate.driverRowLabel).toBe('Driver node');
    expect(defaultEstimate.driverRowValue).toBe(
      '5.6 DCU hours / hour of usage'
    );
    expect(defaultEstimate.autoscalingRowLabel).toBe(
      'Autoscaling range (2–1,000 executors)'
    );
    expect(defaultEstimate.autoscalingRowValue).toBe(
      '16.8 – 5,605.6 DCU hours / hour of usage'
    );
    expect(defaultEstimate.totalRowLabel).toBe('Total (baseline)');
    expect(defaultEstimate.totalRowValue).toBe(
      '33.6 DCU hours / hour of usage'
    );

    // 2. Executor shape changed to standard-4 (4 DCU) -> 5 * 4 + 4 = 24
    const standard4Estimate = calculateRuntimePricingEstimate({
      executorMachineType: 'standard-4',
      useDifferentDriverConfig: false,
      autoscalingEnabled: true,
      initialExecutors: 5,
      minExecutors: 2,
      maxExecutors: 300
    });
    expect(standard4Estimate.hero).toBe('24 DCU hours / hour of usage');
    expect(standard4Estimate.executorRowLabel).toBe(
      'Executor nodes (initial 5)'
    );
    expect(standard4Estimate.executorRowValue).toBe(
      '20 DCU hours / hour of usage'
    );
    expect(standard4Estimate.driverRowValue).toBe(
      '4 DCU hours / hour of usage'
    );
    expect(standard4Estimate.totalRowValue).toBe(
      '24 DCU hours / hour of usage'
    );

    // 3. Initial executors changed to 10 (with highmem-4 -> 10 * 5.6 + 5.6 = 61.6)
    const tenExecutorsEstimate = calculateRuntimePricingEstimate({
      executorMachineType: 'highmem-4',
      useDifferentDriverConfig: false,
      autoscalingEnabled: true,
      initialExecutors: 10,
      minExecutors: 2,
      maxExecutors: 300
    });
    expect(tenExecutorsEstimate.hero).toBe('61.6 DCU hours / hour of usage');
    expect(tenExecutorsEstimate.baselineCaption).toBe(
      'Baseline for 1 driver and 10 initial executors'
    );
    expect(tenExecutorsEstimate.executorRowLabel).toBe(
      'Executor nodes (initial 10)'
    );
    expect(tenExecutorsEstimate.executorRowValue).toBe(
      '56 DCU hours / hour of usage'
    );
    expect(tenExecutorsEstimate.totalRowValue).toBe(
      '61.6 DCU hours / hour of usage'
    );

    // 4. Separate driver enabled with standard-4 (5 * 5.6 + 4 = 32)
    const separateDriverEstimate = calculateRuntimePricingEstimate({
      executorMachineType: 'highmem-4',
      driverMachineType: 'standard-4',
      useDifferentDriverConfig: true,
      autoscalingEnabled: true,
      initialExecutors: 5,
      minExecutors: 2,
      maxExecutors: 300
    });
    expect(separateDriverEstimate.hero).toBe('32 DCU hours / hour of usage');
    expect(separateDriverEstimate.driverRowLabel).toBe('Driver node');
    expect(separateDriverEstimate.driverRowValue).toBe(
      '4 DCU hours / hour of usage'
    );
    expect(separateDriverEstimate.autoscalingRowValue).toBe(
      '15.2 – 1,684 DCU hours / hour of usage'
    );
    expect(separateDriverEstimate.totalRowValue).toBe(
      '32 DCU hours / hour of usage'
    );

    // 5. Autoscaling disabled -> hides Subject to autoscaling and autoscaling range row
    const noAutoscalingEstimate = calculateRuntimePricingEstimate({
      executorMachineType: 'highmem-4',
      useDifferentDriverConfig: false,
      autoscalingEnabled: false,
      initialExecutors: 5
    });
    expect(noAutoscalingEstimate.subjectToAutoscaling).toBe(false);
    expect(noAutoscalingEstimate.autoscalingRowLabel).toBeNull();
    expect(noAutoscalingEstimate.autoscalingRowValue).toBeNull();

    // 6. Null / empty input, driverShape fallback, prototype keys, & min >= max single-value autoscaling fallback
    expect(getShapeDcu('toString')).toBe(0);
    expect(getShapeDcu('valueOf')).toBe(0);

    const nullEstimate = calculateRuntimePricingEstimate(null);
    expect(nullEstimate.hero).toBe('0 DCU hours / hour of usage');
    expect(nullEstimate.totalRowValue).toBe('0 DCU hours / hour of usage');

    const driverShapeFallbackEstimate = calculateRuntimePricingEstimate({
      executorMachineType: 'highmem-4',
      driverMachineType: '   ',
      driverShape: 'standard-4',
      useDifferentDriverConfig: true,
      initialExecutors: 5
    });
    expect(driverShapeFallbackEstimate.driverDcu).toBe(4);
    expect(driverShapeFallbackEstimate.hero).toBe(
      '32 DCU hours / hour of usage'
    );

    const equalBoundsEstimate = calculateRuntimePricingEstimate({
      executorMachineType: 'highmem-4',
      autoscalingEnabled: true,
      initialExecutors: 5,
      minExecutors: 10,
      maxExecutors: 10
    });
    expect(equalBoundsEstimate.autoscalingRowLabel).toBe(
      'Autoscaling range (10 executors)'
    );
    expect(equalBoundsEstimate.autoscalingRowValue).toBe(
      '61.6 DCU hours / hour of usage'
    );
  });

  it('should render RuntimePricingEstimate and update dynamically in CreateRuntimeProfileComponent when executor shape changes', async () => {
    expect(RuntimePricingEstimate).toBeDefined();

    const staticMarkup = ReactDOMServer.renderToStaticMarkup(
      <RuntimePricingEstimate
        pricingInput={{
          executorMachineType: 'highmem-4',
          useDifferentDriverConfig: false,
          autoscalingEnabled: true,
          initialExecutors: 5,
          minExecutors: 2,
          maxExecutors: 1000
        }}
      />
    );
    expect(staticMarkup).toContain('Pricing estimate');
    expect(staticMarkup).toContain('33.6 DCU hours / hour of usage');
    expect(staticMarkup).toContain(
      'Baseline for 1 driver and 5 initial executors'
    );
    expect(staticMarkup).toContain('Subject to autoscaling');
    expect(staticMarkup).toContain('16.8 – 5,605.6 DCU hours / hour of usage');
    expect(staticMarkup).toContain('Total (baseline)');

    await act(async () => {
      root.render(<CreateRuntimeProfileComponent service={mockService} />);
    });
    await expandAdditionalConfig();

    const pricingSection = container.querySelector(
      '[data-testid="runtime-pricing-estimate-section"]'
    );
    expect(pricingSection).not.toBeNull();
    // 2 initial executors * 5.6 DCU + 5.6 DCU driver = 16.8 DCU hours
    expect(
      pricingSection?.querySelector('.runtime-pricing-hero')?.textContent
    ).toBe('16.8 DCU hours / hour of usage');

    // Change executor machine shape to standard-4 (2 initial executors * 4 DCU + 4 DCU driver = 12 DCU hours)
    await selectExecutorType('standard-4');
    expect(
      pricingSection?.querySelector('.runtime-pricing-hero')?.textContent
    ).toBe('12 DCU hours / hour of usage');

    // Render a fresh instance with separate driver config and disabled autoscaling
    await act(async () => {
      root.render(
        <CreateRuntimeProfileComponent
          key="custom-driver-no-autoscaling"
          service={mockService}
          initialExecutorType="highmem-4"
          initialExecutorAndDriverConfig={{
            tier: 'Premium',
            executorType: 'highmem-4',
            useDifferentDriverConfig: true,
            driverMachineType: 'standard-4'
          }}
          initialAutoscalingConfig={{
            autoscalingEnabled: false,
            initialExecutors: 5
          }}
        />
      );
    });
    await expandAdditionalConfig();

    const updatedPricingSection = container.querySelector(
      '[data-testid="runtime-pricing-estimate-section"]'
    );
    expect(
      updatedPricingSection?.querySelector('.runtime-pricing-hero')?.textContent
    ).toBe('32 DCU hours / hour of usage');
    expect(
      updatedPricingSection?.querySelector(
        '[data-testid="pricing-autoscaling-caption"]'
      )
    ).toBeNull();
    expect(
      updatedPricingSection?.querySelector(
        '[data-testid="pricing-autoscaling-row"]'
      )
    ).toBeNull();
  });
});
