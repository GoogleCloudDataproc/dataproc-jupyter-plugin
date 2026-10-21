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

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../handler/handler', () => ({
  requestAPI: jest
    .fn()
    .mockResolvedValue({ storage_url: 'https://storage.googleapis.com/' })
}));

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import RuntimeProfileDetails, {
  applyAutoscalingUpdateToTemplate,
  applyExecutorAndDriverUpdateToTemplate,
  applyMetastoreUpdateToTemplate,
  applyNetworkSecurityUpdateToTemplate,
  applyOtherCustomizationUpdateToTemplate,
  applyRuntimeEnvironmentUpdateToTemplate,
  applySessionLifecycleUpdateToTemplate,
  buildAutoscalingConfigFromTemplate,
  buildExecutorAndDriverConfigFromTemplate,
  buildMetastoreConfigFromTemplate,
  buildNetworkSecurityConfigFromTemplate,
  buildOtherCustomizationSparkPropertiesFromTemplate,
  buildRuntimeEnvironmentConfigFromTemplate,
  buildSessionLifecycleConfigFromTemplate,
  formatCreateTime,
  formatDiskConfig,
  formatDurationTtl,
  stripPropertyPrefix
} from './runtimeProfileDetails';
import {
  formatLastUsed,
  IRuntimeProfileTemplate,
  parseRuntimeProfileResourceName
} from './runtimeProfileListMapper';
import {
  runtimeProfileService,
  RuntimeProfileService
} from './runtimeProfileService';
import { Notification } from '@jupyterlab/apputils';

jest.mock('@jupyterlab/apputils', () => ({
  ...jest.requireActual('@jupyterlab/apputils'),
  Notification: { emit: jest.fn() }
}));

describe('RuntimeProfileDetails Component', () => {
  let container: HTMLDivElement;
  let root: Root;
  const originalClipboard = navigator.clipboard;
  const originalExecCommand = document.execCommand;

  const mockProfile: IRuntimeProfileTemplate = {
    name: 'projects/test-project/locations/us-central1/sessionTemplates/sample-profile',
    description: 'test123',
    creator: 'user@example.com',
    createTime: '2026-09-16T08:02:03Z',
    updateTime: '2026-09-16T08:02:03Z',
    jupyterSession: { displayName: 'sample-profile', kernel: 'PYTHON' },
    environmentConfig: {
      executionConfig: {
        subnetworkUri: 'default',
        idleTtl: '3600s',
        ttl: '259200s',
        authenticationConfig: {
          userWorkloadAuthenticationType: 'END_USER_CREDENTIALS'
        }
      }
    },
    runtimeConfig: {
      version: '2.3',
      properties: {
        'dataproc:dataproc.tier': 'premium',
        'spark:spark.dataproc.engine': 'lightningEngine',
        'spark:spark.dataproc.driver.disk.tier': 'standard',
        'spark:spark.dataproc.driver.disk.size': '400g',
        'spark:spark.dataproc.executor.disk.tier': 'standard',
        'spark:spark.dataproc.executor.disk.size': '100g',
        'spark:spark.dynamicAllocation.enabled': 'true',
        'spark:spark.dynamicAllocation.initialExecutors': '2',
        'spark:spark.dynamicAllocation.minExecutors': '2',
        'spark:spark.dynamicAllocation.maxExecutors': '10',
        'spark:spark.sql.catalog.biglake':
          'org.apache.iceberg.spark.SparkCatalog',
        'spark:spark.sql.catalog.biglake.type': 'hadoop'
      }
    },
    labels: {
      env: 'dev',
      team: 'analytics'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    jest
      .spyOn(RuntimeProfileService, 'deleteRuntimeProfile')
      .mockResolvedValue(undefined);
    jest
      .spyOn(RuntimeProfileService, 'updateRuntimeProfile')
      .mockImplementation(async (_id, payload) => payload);
    jest
      .spyOn(runtimeProfileService, 'getNetworks')
      .mockResolvedValue(['default']);
    jest
      .spyOn(runtimeProfileService, 'getSubnetworks')
      .mockResolvedValue(['default']);
    jest
      .spyOn(runtimeProfileService, 'getNetworkFromSubnetwork')
      .mockResolvedValue('default');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
      writable: true
    });
    document.execCommand = originalExecCommand;
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  const renderDetails = (
    onBack = jest.fn(),
    onDeleteSuccess?: () => void,
    profile: IRuntimeProfileTemplate = mockProfile,
    onUpdateSuccess?: (updated: IRuntimeProfileTemplate) => void
  ) =>
    act(async () => {
      root.render(
        <RuntimeProfileDetails
          profile={profile}
          onBack={onBack}
          onDeleteSuccess={onDeleteSuccess}
          onUpdateSuccess={onUpdateSuccess}
        />
      );
    });

  it('should render Basic Information, Configuration subsections, and handle Back and Copy actions', async () => {
    const onBackMock = jest.fn();
    const writeTextMock = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Clipboard blocked'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true
    });

    await renderDetails(onBackMock);

    expect(container.textContent).toContain('Resource details');
    expect(container.textContent).toContain('Basic Information');
    expect(container.textContent).toContain('sample-profile');
    expect(container.textContent).toContain('us-central1');
    expect(container.textContent).toContain(
      'Wed Sep 16 2026 08:02:03 GMT+0000 (Coordinated Universal Time)'
    );
    expect(container.textContent).toContain('user@example.com');
    expect(container.textContent).toContain('test123');
    expect(container.textContent).toContain('PYTHON');

    // Configuration section is collapsed by default
    expect(container.textContent).not.toContain('Runtime configuration');
    const configHeader = container.querySelector(
      '[aria-controls="runtime-profile-config-content"]'
    ) as HTMLElement;
    expect(configHeader.getAttribute('aria-expanded')).toBe('false');

    act(() => {
      configHeader.click();
    });
    expect(configHeader.getAttribute('aria-expanded')).toBe('true');

    // Runtime configuration
    expect(container.textContent).toContain('Runtime configuration');
    expect(container.textContent).toContain('Spark runtime version');
    expect(container.textContent).toContain('2.3');
    expect(container.textContent).toContain('Configuration type');
    expect(container.textContent).toContain('Jupyter');
    expect(container.textContent).toContain('Custom Spark image');
    expect(container.textContent).toContain('Cloud storage staging bucket');
    expect(container.textContent).toContain('Auto');
    expect(container.textContent).toContain('Python package repository');
    expect(container.textContent).toContain(
      'Google managed PyPI pull-through cache'
    );

    // Executor and driver configuration
    expect(container.textContent).toContain(
      'Executor and driver configuration'
    );
    expect(container.textContent).toContain('Tier');
    expect(container.textContent).toContain('Accelerated');
    expect(container.textContent).toContain('Lightning Engine');
    expect(container.textContent).toContain('Enabled');
    expect(container.textContent).toContain('Standard persistent disk, 400GB');
    expect(container.textContent).toContain('Standard persistent disk, 100GB');

    // Autoscaling, Metastore, Network and security, Session lifecycle, Other customizations
    expect(container.textContent).toContain('Autoscaling');
    expect(container.textContent).toContain('On');
    expect(container.textContent).toContain('Initial executors');
    expect(container.textContent).toContain('Minimum executors');
    expect(container.textContent).toContain('Maximum executors');
    expect(container.textContent).toContain('Metastore configuration');
    expect(container.textContent).toContain('Hive endpoint');
    expect(container.textContent).toContain('Disabled');
    expect(container.textContent).toContain('Encryption type');
    expect(container.textContent).toContain('Google-managed');
    expect(container.textContent).toContain('Network and security');
    expect(container.textContent).toContain('Session lifecycle');
    expect(container.textContent).toContain('Max idle time');
    expect(container.textContent).toContain('1 hr');
    expect(container.textContent).toContain('Max session time');
    expect(container.textContent).toContain('3 days');
    expect(container.textContent).toContain('Other customizations');

    const subsectionEditBtns = Array.from(
      container.querySelectorAll('button[aria-label^="Edit "]')
    ) as HTMLButtonElement[];
    expect(subsectionEditBtns).toHaveLength(7);
    expect(subsectionEditBtns[0].disabled).toBe(false); // Runtime configuration
    expect(subsectionEditBtns[1].disabled).toBe(false); // Executor and driver configuration
    expect(subsectionEditBtns[2].disabled).toBe(false); // Autoscaling
    expect(subsectionEditBtns[3].disabled).toBe(false); // Metastore configuration
    expect(subsectionEditBtns[4].disabled).toBe(false); // Network and security
    expect(subsectionEditBtns[5].disabled).toBe(false); // Session lifecycle
    expect(subsectionEditBtns[6].disabled).toBe(false); // Other customizations

    // Spark properties & Labels
    expect(container.textContent).toContain('Spark properties');
    expect(container.textContent).toContain('Labels');
    const propAndLabelLines = Array.from(
      container.querySelectorAll('.runtime-profile-details-spark-prop-line')
    ).map(el => el.textContent);
    expect(propAndLabelLines).toEqual([
      'dataproc.tier: premium',
      'spark.sql.catalog.biglake: org.apache.iceberg.spark.SparkCatalog',
      'spark.sql.catalog.biglake.type: hadoop',
      'env: dev',
      'team: analytics'
    ]);

    const editBtn = Array.from(
      container.querySelectorAll('.secondary-action-btn')
    ).find(btn => btn.textContent?.includes('Edit')) as HTMLButtonElement;
    expect(editBtn.disabled).toBe(true);

    const copyBtn = container.querySelector(
      '.runtime-profile-details-copy-btn'
    ) as HTMLButtonElement;
    await act(async () => {
      copyBtn.click();
    });
    expect(writeTextMock).toHaveBeenCalledWith('sample-profile');
    expect(Notification.emit).toHaveBeenCalledWith(
      'Name copied to clipboard',
      'success',
      { autoClose: 2000 }
    );

    await act(async () => {
      copyBtn.click();
    });
    expect(writeTextMock).toHaveBeenCalledTimes(2);
    expect(Notification.emit).toHaveBeenCalledWith(
      'Failed to copy name to clipboard',
      'error',
      { autoClose: 3000 }
    );

    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
      writable: true
    });
    document.execCommand = jest.fn().mockReturnValue(true);
    await act(async () => {
      copyBtn.click();
    });
    expect(document.execCommand).toHaveBeenCalledWith('copy');

    const backBtn = container.querySelector(
      '.runtime-profile-details-back-btn'
    ) as HTMLButtonElement;
    act(() => {
      backBtn.click();
    });
    expect(onBackMock).toHaveBeenCalledTimes(1);
  });

  it('should render Customer-managed encryption, Disabled Lightning Engine, Autoscaling Off (hiding executor rows), custom Metastore, and toggle Configuration section', async () => {
    const customProfile: IRuntimeProfileTemplate = {
      name: 'projects/test-project/locations/us-central1/sessionTemplates/custom-profile',
      jupyterSession: { displayName: 'custom-profile', kernel: 'PYTHON' },
      environmentConfig: {
        executionConfig: {
          kmsKey: 'projects/p/locations/l/keyRings/kr/cryptoKeys/k',
          stagingBucket: 'my-staging-bucket'
        },
        peripheralsConfig: {
          metastoreService: 'projects/p/locations/l/services/my-metastore'
        }
      },
      runtimeConfig: {
        version: '2.2',
        containerImage: 'us-central1-docker.pkg.dev/my-proj/repo/img:latest',
        repositoryConfig: {
          pypiRepositoryConfig: {
            pypiRepository: 'https://us-central1-python.pkg.dev/my-proj/pypi'
          }
        },
        properties: {
          'spark.dynamicAllocation.enabled': 'false',
          'dataproc.lakehouse.defaultCatalog': 'iceberg_cat',
          'dataproc.lakehouse.catalog.hive_cat':
            'projects/p/locations/l/catalogs/hive_cat'
        }
      }
    };

    await renderDetails(jest.fn(), undefined, customProfile);

    const configHeader = container.querySelector(
      '[aria-controls="runtime-profile-config-content"]'
    ) as HTMLElement;
    expect(container.textContent).not.toContain('Runtime configuration');

    act(() => {
      configHeader.click();
    });
    expect(container.textContent).toContain('Runtime configuration');

    expect(container.textContent).toContain(
      'us-central1-docker.pkg.dev/my-proj/repo/img:latest'
    );
    expect(container.textContent).toContain('my-staging-bucket');
    expect(container.textContent).toContain(
      'https://us-central1-python.pkg.dev/my-proj/pypi'
    );
    expect(container.textContent).toContain('Standard');
    expect(container.textContent).toContain('Customer-managed');
    expect(container.textContent).toContain('Disabled');
    expect(container.textContent).toContain('Enabled');
    expect(container.textContent).toContain('Off');
    expect(container.textContent).not.toContain('Initial executors');
    expect(container.textContent).not.toContain('Minimum executors');
    expect(container.textContent).not.toContain('Maximum executors');
    expect(container.textContent).not.toContain('Max idle time');
    expect(container.textContent).not.toContain('Max session time');
    expect(container.textContent).toContain(
      'projects/p/locations/l/services/my-metastore'
    );
    expect(container.textContent).toContain('None');

    act(() => {
      configHeader.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
    });
    expect(container.textContent).not.toContain('Runtime configuration');

    act(() => {
      configHeader.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true })
      );
    });
    expect(container.textContent).toContain('Runtime configuration');
  });

  it('should render Lakehouse runtime catalog summary and Disabled Hive endpoint for existing Iceberg catalog', async () => {
    const existingLakehouseProfile: IRuntimeProfileTemplate = {
      name: 'projects/test-project/locations/us-central1/sessionTemplates/lakehouse-profile',
      jupyterSession: { displayName: 'lakehouse-profile', kernel: 'PYTHON' },
      runtimeConfig: {
        version: '2.3',
        properties: {
          'spark.dataproc.lakehouse.project': 'other-lh-proj',
          'dataproc.lakehouse.defaultCatalog':
            'projects/other-lh-proj/catalogs/existing_iceberg_cat',
          'dataproc.lakehouse.catalog.existing_iceberg_cat':
            'projects/other-lh-proj/catalogs/existing_iceberg_cat'
        }
      }
    };

    await renderDetails(jest.fn(), undefined, existingLakehouseProfile);

    const configHeader = container.querySelector(
      '[aria-controls="runtime-profile-config-content"]'
    ) as HTMLElement;
    act(() => {
      configHeader.click();
    });

    const rows = Array.from(
      container.querySelectorAll('.runtime-profile-details-row')
    );
    const getRowValue = (label: string) =>
      rows
        .find(
          r =>
            r.querySelector('.runtime-profile-details-label')?.textContent ===
            label
        )
        ?.querySelector('.runtime-profile-details-value')?.textContent;

    expect(getRowValue('Metastore')).toBe(
      'Lakehouse runtime catalog (project: other-lh-proj)'
    );
    expect(getRowValue('Hive endpoint')).toBe('Disabled');
  });

  it('should open section edit drawers, call updateRuntimeProfile on Save, and notify user', async () => {
    const onUpdateSuccessMock = jest.fn();
    await renderDetails(jest.fn(), undefined, mockProfile, onUpdateSuccessMock);

    const configHeader = container.querySelector(
      '[aria-controls="runtime-profile-config-content"]'
    ) as HTMLElement;
    act(() => {
      configHeader.click();
    });

    // 1. Open Runtime configuration drawer
    const editRuntimeBtn = container.querySelector(
      'button[aria-label="Edit Runtime configuration"]'
    ) as HTMLButtonElement;
    await act(async () => {
      editRuntimeBtn.click();
    });

    const profileIdInput = document.body.querySelector(
      '#edit-runtime-profile-id'
    ) as HTMLInputElement;
    expect(profileIdInput).not.toBeNull();
    expect(profileIdInput.value).toBe('sample-profile');
    expect(profileIdInput.disabled).toBe(true);

    // Click Save in active EditDrawer matching the section title
    const getDrawerSaveBtn = (title: string) => {
      const activeModals = Array.from(
        document.body.querySelectorAll(
          '[role="presentation"]:not(.MuiModal-hidden)'
        )
      );
      const target = activeModals.find(
        el => el.querySelector('.edit-drawer-title')?.textContent === title
      );
      return Array.from(target?.querySelectorAll('button') ?? []).find(
        btn => btn.textContent === 'Save'
      ) as HTMLButtonElement;
    };

    await act(async () => {
      getDrawerSaveBtn('Runtime configuration').click();
    });

    expect(RuntimeProfileService.updateRuntimeProfile).toHaveBeenCalledWith(
      mockProfile.name,
      expect.objectContaining({
        name: mockProfile.name,
        runtimeConfig: expect.objectContaining({ version: '2.3' })
      }),
      'sample-profile'
    );
    expect(onUpdateSuccessMock).toHaveBeenCalledTimes(1);
    expect(Notification.emit).toHaveBeenCalledWith(
      'Runtime Profile sample-profile successfully updated',
      'success',
      { autoClose: 5000 }
    );

    // 2. Open Executor and driver configuration drawer and test error + success
    const editExecDriverBtn = container.querySelector(
      'button[aria-label="Edit Executor and driver configuration"]'
    ) as HTMLButtonElement;
    await act(async () => {
      editExecDriverBtn.click();
    });

    (
      RuntimeProfileService.updateRuntimeProfile as jest.Mock
    ).mockRejectedValueOnce(new Error('Quota exceeded'));
    await act(async () => {
      getDrawerSaveBtn('Executor and driver configuration').click();
    });
    expect(Notification.emit).toHaveBeenCalledWith(
      expect.stringContaining('Failed to update sample-profile:'),
      'error',
      { autoClose: 5000 }
    );

    await act(async () => {
      getDrawerSaveBtn('Executor and driver configuration').click();
    });
    expect(RuntimeProfileService.updateRuntimeProfile).toHaveBeenCalledTimes(3);
    expect(onUpdateSuccessMock).toHaveBeenCalledTimes(2);

    // 3. Open Autoscaling drawer and save
    const editAutoscalingBtn = container.querySelector(
      'button[aria-label="Edit Autoscaling"]'
    ) as HTMLButtonElement;
    await act(async () => {
      editAutoscalingBtn.click();
    });
    expect(
      (document.body.querySelector('#edit-initial-executors') as HTMLInputElement)
        ?.value
    ).toBe('2');
    await act(async () => {
      getDrawerSaveBtn('Autoscaling').click();
    });
    expect(RuntimeProfileService.updateRuntimeProfile).toHaveBeenCalledTimes(4);
    expect(onUpdateSuccessMock).toHaveBeenCalledTimes(3);

    // 4. Open Session lifecycle drawer and save
    const editLifecycleBtn = container.querySelector(
      'button[aria-label="Edit Session lifecycle"]'
    ) as HTMLButtonElement;
    await act(async () => {
      editLifecycleBtn.click();
    });
    expect(
      (
        document.body.querySelector(
          '#edit-max-idle-time-quantity'
        ) as HTMLInputElement
      )?.value
    ).toBe('1');
    await act(async () => {
      getDrawerSaveBtn('Session lifecycle').click();
    });
    expect(RuntimeProfileService.updateRuntimeProfile).toHaveBeenCalledTimes(5);
    expect(onUpdateSuccessMock).toHaveBeenCalledTimes(4);

    // 5. Open Other customizations drawer and save
    const editOtherBtn = container.querySelector(
      'button[aria-label="Edit Other customizations"]'
    ) as HTMLButtonElement;
    await act(async () => {
      editOtherBtn.click();
    });
    expect(
      (
        document.body.querySelector(
          '#edit-spark-property-key-0'
        ) as HTMLInputElement
      )?.value
    ).toBe('spark.sql.catalog.biglake');
    await act(async () => {
      getDrawerSaveBtn('Other customizations').click();
    });
    expect(RuntimeProfileService.updateRuntimeProfile).toHaveBeenCalledTimes(6);
    expect(onUpdateSuccessMock).toHaveBeenCalledTimes(5);

    // 6. Open Metastore configuration drawer and save
    const editMetastoreBtn = container.querySelector(
      'button[aria-label="Edit Metastore configuration"]'
    ) as HTMLButtonElement;
    await act(async () => {
      editMetastoreBtn.click();
    });
    expect(
      (document.body.querySelector('#metastore-project-id') as HTMLInputElement)
        ?.value
    ).toBe('test-project');
    expect(
      (document.body.querySelector('#new-catalog-name') as HTMLInputElement)
        ?.value
    ).toBe('standard-lh-catalog-us-central1');
    await act(async () => {
      getDrawerSaveBtn('Metastore configuration').click();
    });
    expect(RuntimeProfileService.updateRuntimeProfile).toHaveBeenCalledTimes(7);
    expect(RuntimeProfileService.updateRuntimeProfile).toHaveBeenLastCalledWith(
      mockProfile.name,
      expect.objectContaining({
        runtimeConfig: expect.objectContaining({
          properties: expect.objectContaining({
            'spark.dataproc.lakehouse.project': 'test-project',
            'dataproc.lakehouse.defaultCatalog':
              'standard-lh-catalog-us-central1',
            'dataproc.lakehouse.catalog.standard-lh-catalog-us-central1':
              'projects/test-project/catalogs/standard-lh-catalog-us-central1'
          })
        })
      }),
      'sample-profile'
    );
    expect(onUpdateSuccessMock).toHaveBeenCalledTimes(6);
    expect(container.textContent).toContain('Lakehouse runtime catalog');

    // 7. Open Network and security drawer and save
    const editNetworkBtn = container.querySelector(
      'button[aria-label="Edit Network and security"]'
    ) as HTMLButtonElement;
    await act(async () => {
      editNetworkBtn.click();
    });
    expect(
      (
        document.body.querySelector(
          '#edit-execution-identity-user-account'
        ) as HTMLInputElement
      )?.checked
    ).toBe(true);
    await act(async () => {
      getDrawerSaveBtn('Network and security').click();
    });
    expect(RuntimeProfileService.updateRuntimeProfile).toHaveBeenCalledTimes(8);
    expect(RuntimeProfileService.updateRuntimeProfile).toHaveBeenLastCalledWith(
      mockProfile.name,
      expect.objectContaining({
        environmentConfig: expect.objectContaining({
          executionConfig: expect.objectContaining({
            subnetworkUri: 'default',
            authenticationConfig: {
              userWorkloadAuthenticationType: 'END_USER_CREDENTIALS'
            }
          })
        })
      }),
      'sample-profile'
    );
    expect(onUpdateSuccessMock).toHaveBeenCalledTimes(7);
  });

  it('should enable the header Edit button when onEdit is provided and enable all 7 section edit icons', async () => {
    const onEditMock = jest.fn();
    await act(async () => {
      root.render(
        <RuntimeProfileDetails
          profile={mockProfile}
          onBack={jest.fn()}
          onEdit={onEditMock}
        />
      );
    });

    const editBtn = Array.from(
      container.querySelectorAll('.secondary-action-btn')
    ).find(btn => btn.textContent?.includes('Edit')) as HTMLButtonElement;
    expect(editBtn.disabled).toBe(false);

    act(() => {
      editBtn.click();
    });
    expect(onEditMock).toHaveBeenCalledTimes(1);

    // Configuration is collapsed by default; expand it to reach the
    // subsection edit buttons.
    const configHeader = container.querySelector(
      '[aria-controls="runtime-profile-config-content"]'
    ) as HTMLElement;
    act(() => {
      configHeader.click();
    });

    // All 7 configuration subsections have edit drawers wired in the details view.
    const subsectionEditBtns = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '.runtime-profile-details-subsection-edit-btn'
      )
    );
    expect(subsectionEditBtns).toHaveLength(7);
    subsectionEditBtns.forEach(btn => expect(btn.disabled).toBe(false));
  });

  it('should preserve changed network and subnetwork when reopening Network and security drawer and resolve parent network on fresh load', async () => {
    jest
      .spyOn(runtimeProfileService, 'getNetworks')
      .mockResolvedValue(['default', 'custom-vpc']);
    jest
      .spyOn(runtimeProfileService, 'getSubnetworks')
      .mockImplementation(async (network: string) =>
        network === 'custom-vpc'
          ? ['custom-subnet-1', 'custom-subnet-2']
          : ['default']
      );
    const getNetFromSubSpy = jest
      .spyOn(runtimeProfileService, 'getNetworkFromSubnetwork')
      .mockImplementation(async (sub: string) =>
        sub.startsWith('custom-subnet') ? 'custom-vpc' : 'default'
      );

    let latestProfile = mockProfile;
    const handleUpdateSuccess = jest.fn((updated: IRuntimeProfileTemplate) => {
      latestProfile = updated;
      root.render(
        <RuntimeProfileDetails
          profile={updated}
          onBack={jest.fn()}
          onUpdateSuccess={handleUpdateSuccess}
        />
      );
    });

    await renderDetails(jest.fn(), undefined, latestProfile, handleUpdateSuccess);

    const configHeader = container.querySelector(
      '.runtime-profile-details-section-header.configuration-header'
    ) as HTMLElement;
    await act(async () => {
      configHeader.click();
    });

    const openNetworkDrawer = async () => {
      const btn = container.querySelector(
        'button[aria-label="Edit Network and security"]'
      ) as HTMLButtonElement;
      await act(async () => {
        btn.click();
      });
    };

    await openNetworkDrawer();

    // Change Primary network to 'custom-vpc'
    const networkTrigger = document.body.querySelector(
      '#edit-primary-network'
    ) as HTMLElement;
    await act(async () => {
      networkTrigger.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, button: 0 })
      );
    });
    const customVpcOption = document.body.querySelector(
      'li[role="option"][data-value="custom-vpc"]'
    ) as HTMLElement;
    expect(customVpcOption).not.toBeNull();
    await act(async () => {
      customVpcOption.click();
    });

    // Change Subnetwork to 'custom-subnet-2'
    const subnetworkTrigger = document.body.querySelector(
      '#edit-subnetwork'
    ) as HTMLElement;
    await act(async () => {
      subnetworkTrigger.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, button: 0 })
      );
    });
    const customSubOption = document.body.querySelector(
      'li[role="option"][data-value="custom-subnet-2"]'
    ) as HTMLElement;
    expect(customSubOption).not.toBeNull();
    await act(async () => {
      customSubOption.click();
    });

    const saveBtn = Array.from(
      document.body.querySelectorAll(
        '[role="presentation"]:not(.MuiModal-hidden) .edit-drawer-footer button'
      )
    ).find(b => b.textContent?.trim() === 'Save') as HTMLButtonElement;
    await act(async () => {
      saveBtn.click();
    });

    expect(latestProfile.environmentConfig?.executionConfig?.subnetworkUri).toBe(
      'custom-subnet-2'
    );
    expect(
      latestProfile.environmentConfig?.executionConfig?.networkUri
    ).toBeUndefined();

    // 1. Re-open drawer immediately after save -> updated network & subnetwork stay selected
    await openNetworkDrawer();
    expect(
      document.body.querySelector('#edit-primary-network')?.textContent
    ).toBe('custom-vpc');
    expect(document.body.querySelector('#edit-subnetwork')?.textContent).toBe(
      'custom-subnet-2'
    );

    // 2. Unmount and mount fresh RuntimeProfileDetails (only subnetworkUri in SessionTemplate)
    act(() => {
      root.unmount();
    });
    root = createRoot(container);
    getNetFromSubSpy.mockClear();

    await renderDetails(jest.fn(), undefined, latestProfile);
    const freshConfigHeader = container.querySelector(
      '.runtime-profile-details-section-header.configuration-header'
    ) as HTMLElement;
    await act(async () => {
      freshConfigHeader.click();
    });
    await openNetworkDrawer();

    expect(getNetFromSubSpy).toHaveBeenCalledWith(
      'custom-subnet-2',
      'test-project',
      'us-central1'
    );
    expect(
      document.body.querySelector('#edit-primary-network')?.textContent
    ).toBe('custom-vpc');
    expect(document.body.querySelector('#edit-subnetwork')?.textContent).toBe(
      'custom-subnet-2'
    );
  });

  it('should open delete modal, handle Escape/Cancel, and delete or notify on error', async () => {
    const onDeleteSuccessMock = jest.fn();
    await renderDetails(jest.fn(), onDeleteSuccessMock);

    const getDeleteHeaderBtn = () =>
      Array.from(container.querySelectorAll('.secondary-action-btn')).find(
        btn => btn.textContent?.includes('Delete')
      ) as HTMLButtonElement;

    act(() => {
      getDeleteHeaderBtn().click();
    });
    expect(
      document.body.querySelector('.delete-profile-modal-title')?.textContent
    ).toBe('Delete Runtime Profile');

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(document.body.querySelector('.delete-profile-modal')).toBeNull();

    (
      RuntimeProfileService.deleteRuntimeProfile as jest.Mock
    ).mockRejectedValueOnce(new Error('Permission denied'));
    act(() => {
      getDeleteHeaderBtn().click();
    });

    const getConfirmBtn = () =>
      Array.from(
        document.body.querySelectorAll('.delete-profile-modal-btn')
      ).find(btn => btn.textContent === 'Delete') as HTMLButtonElement;

    await act(async () => {
      getConfirmBtn().click();
    });
    expect(Notification.emit).toHaveBeenCalledWith(
      expect.stringContaining('Failed to delete sample-profile:'),
      'error',
      { autoClose: 5000 }
    );

    await act(async () => {
      getConfirmBtn().click();
    });
    expect(RuntimeProfileService.deleteRuntimeProfile).toHaveBeenCalledWith(
      'projects/test-project/locations/us-central1/sessionTemplates/sample-profile',
      'sample-profile'
    );
    expect(Notification.emit).toHaveBeenCalledWith(
      'sample-profile is deleted successfully',
      'success',
      { autoClose: 5000 }
    );
    expect(onDeleteSuccessMock).toHaveBeenCalledTimes(1);
  });

  it('should format createTime, lastUsed, diskConfig, durationTtl, stripPropertyPrefix, and map drawer configs deterministically', () => {
    expect(formatCreateTime('')).toBe('');
    expect(formatCreateTime('invalid-date')).toBe('');
    expect(formatCreateTime('2026-09-16T08:02:03Z')).toBe(
      'Wed Sep 16 2026 08:02:03 GMT+0000 (Coordinated Universal Time)'
    );

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-29T15:37:20Z'));

    expect(formatLastUsed('', true)).toBe('');
    expect(formatLastUsed('invalid-date', true)).toBe('');
    expect(formatLastUsed('2026-09-29T15:37:20Z', true)).toBe('0 minutes ago');
    expect(formatLastUsed('2026-09-29T15:36:10Z', true)).toBe('1 minute ago');
    expect(formatLastUsed('2026-09-29T13:37:20Z', true)).toBe('2 hours ago');
    expect(formatLastUsed('2026-09-28T15:37:20Z', true)).toBe('yesterday');

    const expectedDate = new Date('2026-01-10T15:37:20Z');
    const expectedMonth = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ][expectedDate.getMonth()];
    const expectedString = `${expectedMonth} ${expectedDate.getDate()}, ${expectedDate.getFullYear()}`;
    expect(formatLastUsed('2026-01-10T15:37:20Z', true)).toBe(expectedString);

    expect(formatDiskConfig('Standard', '200g')).toBe(
      'Standard persistent disk, 200GB'
    );
    expect(formatDiskConfig('Standard', '200gb')).toBe(
      'Standard persistent disk, 200GB'
    );
    expect(formatDiskConfig('Standard', '200gib')).toBe(
      'Standard persistent disk, 200GB'
    );
    expect(formatDiskConfig('Standard', '')).toBe('Standard persistent disk');
    expect(formatDiskConfig('', '200g')).toBe('200GB');
    expect(formatDiskConfig('', '')).toBe('');

    expect(formatDurationTtl('')).toBe('');
    expect(formatDurationTtl('0s')).toBe('0 sec');
    expect(formatDurationTtl('1s')).toBe('1 sec');
    expect(formatDurationTtl('45s')).toBe('45 secs');
    expect(formatDurationTtl('60s')).toBe('1 min');
    expect(formatDurationTtl('90s')).toBe('90 secs');
    expect(formatDurationTtl('1800s')).toBe('30 mins');
    expect(formatDurationTtl(' 3600s ')).toBe('1 hr');
    expect(formatDurationTtl('7200s')).toBe('2 hrs');
    expect(formatDurationTtl('86400s')).toBe('1 day');
    expect(formatDurationTtl('259200s')).toBe('3 days');
    expect(formatDurationTtl('3 days')).toBe('3 days');

    expect(stripPropertyPrefix('spark:spark.executor.cores')).toBe(
      'spark.executor.cores'
    );
    expect(stripPropertyPrefix('dataproc:dataproc.tier')).toBe('dataproc.tier');
    expect(stripPropertyPrefix('spark.executor.cores')).toBe(
      'spark.executor.cores'
    );

    // Drawer config builders and updaters
    const envCfg = buildRuntimeEnvironmentConfigFromTemplate(
      mockProfile,
      'sample-profile'
    );
    expect(envCfg.runtimeProfileId).toBe('sample-profile');
    expect(envCfg.runtimeVersion).toBe('2.3');
    expect(envCfg.lightningEngineEnabled).toBe(true);

    const updatedEnvTemplate = applyRuntimeEnvironmentUpdateToTemplate(
      mockProfile,
      {
        runtimeProfileId: 'sample-profile',
        runtimeVersion: '2.2 LTS (Spark 3.5, Java 17, Scala 2.13)',
        customSparkImage: 'gcr.io/proj/img:v1',
        stagingBucket: 'gs://custom-bucket',
        pythonPackageRepository: 'https://pypi.example.com/simple'
      }
    );
    expect(updatedEnvTemplate.runtimeConfig?.version).toBe('2.2');
    expect(updatedEnvTemplate.runtimeConfig?.containerImage).toBe(
      'gcr.io/proj/img:v1'
    );
    expect(
      updatedEnvTemplate.environmentConfig?.executionConfig?.stagingBucket
    ).toBe('custom-bucket');
    expect(
      updatedEnvTemplate.runtimeConfig?.repositoryConfig?.pypiRepositoryConfig
        ?.pypiRepository
    ).toBe('https://pypi.example.com/simple');

    const clearedEnvTemplate = applyRuntimeEnvironmentUpdateToTemplate(
      updatedEnvTemplate,
      {
        runtimeProfileId: 'sample-profile',
        runtimeVersion: '',
        customSparkImage: 'None',
        stagingBucket: 'Auto',
        pythonPackageRepository: 'Google Managed PyPI pull through cache'
      }
    );
    expect(clearedEnvTemplate.runtimeConfig?.version).toBeUndefined();
    expect(clearedEnvTemplate.runtimeConfig?.containerImage).toBeUndefined();
    expect(clearedEnvTemplate.runtimeConfig?.repositoryConfig).toBeUndefined();
    expect(
      clearedEnvTemplate.environmentConfig?.executionConfig?.stagingBucket
    ).toBeUndefined();

    const execDrvCfg = buildExecutorAndDriverConfigFromTemplate(mockProfile);
    expect(execDrvCfg.tier).toBe('Premium');
    expect(execDrvCfg.lightningEngineEnabled).toBe(true);
    expect(execDrvCfg.useDifferentDriverConfig).toBe(true);

    const updatedExecDrvTemplate = applyExecutorAndDriverUpdateToTemplate(
      mockProfile,
      {
        tier: 'Premium',
        lightningEngineEnabled: false,
        executorType: 'l4-4',
        executorMachineType: 'l4-4',
        executorDisk: 'SSD (premium), 375 GiB',
        driverMachineType: 'standard-4',
        driverDisk: 'SSD (premium), 375 GiB'
      }
    );
    const updatedProps =
      updatedExecDrvTemplate.runtimeConfig?.properties || {};
    expect(updatedProps['dataproc.tier']).toBe('premium');
    expect(updatedProps['spark.dataproc.engine']).toBeUndefined();
    expect(updatedProps['spark.executor.cores']).toBe('4');
    expect(updatedProps['spark.executor.memory']).toBeUndefined();
    expect(updatedProps['spark.dataproc.executor.resource.accelerator.type']).toBe(
      'l4'
    );
    expect(updatedProps['spark.driver.cores']).toBe('4');
    expect(updatedProps['spark.driver.memory']).toBe('16g');
    expect(updatedProps['spark.dataproc.driver.compute.tier']).toBe('premium');

    // 2.x template without dataproc.tier defaults to Standard and leaves dataproc.tier unset if unchanged
    const template2xNoTier: IRuntimeProfileTemplate = {
      name: 'projects/test-project/locations/us-central1/sessionTemplates/no-tier-2x',
      runtimeConfig: {
        version: '2.3',
        properties: {
          'spark:spark.executor.cores': '4',
          'spark:spark.executor.memory': '16g'
        }
      }
    };
    const cfg2xNoTier = buildExecutorAndDriverConfigFromTemplate(template2xNoTier);
    expect(cfg2xNoTier.tier).toBe('Standard');

    const saved2xUnchanged = applyExecutorAndDriverUpdateToTemplate(
      template2xNoTier,
      cfg2xNoTier
    );
    expect(
      saved2xUnchanged.runtimeConfig?.properties?.['dataproc.tier']
    ).toBeUndefined();

    // 3.1+ template without dataproc.tier defaults to Premium
    const template31NoTier: IRuntimeProfileTemplate = {
      name: 'projects/test-project/locations/us-central1/sessionTemplates/no-tier-31',
      runtimeConfig: {
        version: '3.1',
        properties: {}
      }
    };
    expect(buildExecutorAndDriverConfigFromTemplate(template31NoTier).tier).toBe(
      'Premium'
    );

    // Autoscaling builder & updater (including minExecutors > 2 with unset initialExecutors)
    const autoCfg = buildAutoscalingConfigFromTemplate(mockProfile);
    expect(autoCfg).toEqual({
      autoscalingEnabled: true,
      initialExecutors: 2,
      minExecutors: 2,
      maxExecutors: 10
    });
    expect(
      buildAutoscalingConfigFromTemplate({
        name: 'projects/p/locations/l/sessionTemplates/t',
        runtimeConfig: {
          properties: {
            'spark.dynamicAllocation.minExecutors': '5'
          }
        }
      })
    ).toEqual({
      autoscalingEnabled: true,
      initialExecutors: 5,
      minExecutors: 5,
      maxExecutors: 1000
    });
    const unchangedEmptyAuto = applyAutoscalingUpdateToTemplate(
      {
        name: 'projects/p/locations/l/sessionTemplates/t',
        runtimeConfig: { properties: {} }
      },
      {
        autoscalingEnabled: true,
        initialExecutors: 2,
        minExecutors: 2,
        maxExecutors: 1000
      }
    );
    expect(unchangedEmptyAuto.runtimeConfig?.properties).toEqual({});

    const partiallyChangedAuto = applyAutoscalingUpdateToTemplate(
      {
        name: 'projects/p/locations/l/sessionTemplates/t',
        runtimeConfig: {
          properties: {
            'spark.dynamicAllocation.minExecutors': '2'
          }
        }
      },
      {
        autoscalingEnabled: true,
        initialExecutors: 2,
        minExecutors: 2,
        maxExecutors: 50
      }
    );
    expect(partiallyChangedAuto.runtimeConfig?.properties).toEqual({
      'spark.dynamicAllocation.minExecutors': '2',
      'spark.dynamicAllocation.maxExecutors': '50'
    });

    const updatedAutoOn = applyAutoscalingUpdateToTemplate(mockProfile, {
      autoscalingEnabled: true,
      initialExecutors: 4,
      minExecutors: 2,
      maxExecutors: 20
    });
    expect(
      updatedAutoOn.runtimeConfig?.properties?.[
        'spark.dynamicAllocation.initialExecutors'
      ]
    ).toBe('4');
    expect(
      updatedAutoOn.runtimeConfig?.properties?.[
        'spark.dynamicAllocation.maxExecutors'
      ]
    ).toBe('20');

    const updatedAutoOff = applyAutoscalingUpdateToTemplate(mockProfile, {
      autoscalingEnabled: false,
      initialExecutors: 4,
      minExecutors: 2,
      maxExecutors: 20
    });
    expect(
      updatedAutoOff.runtimeConfig?.properties?.[
        'spark.dynamicAllocation.enabled'
      ]
    ).toBe('false');
    expect(
      updatedAutoOff.runtimeConfig?.properties?.[
        'spark.dynamicAllocation.initialExecutors'
      ]
    ).toBeUndefined();

    // Session lifecycle builder & updater (including unset 'None' defaults, seconds/minutes/generic units, and clearing)
    expect(
      buildSessionLifecycleConfigFromTemplate({
        name: 'projects/p/locations/l/sessionTemplates/t'
      })
    ).toEqual({
      maxIdleTime: 'None',
      maxSessionTime: 'None'
    });
    const lifecycleCfg = buildSessionLifecycleConfigFromTemplate(mockProfile);
    expect(lifecycleCfg).toEqual({
      maxIdleTimeQuantity: 1,
      maxIdleTimeUnit: 'hours',
      maxIdleTime: '1 hours',
      maxSessionTimeQuantity: 3,
      maxSessionTimeUnit: 'days',
      maxSessionTime: '3 days'
    });
    expect(
      buildSessionLifecycleConfigFromTemplate({
        name: 'projects/p/locations/l/sessionTemplates/t',
        environmentConfig: {
          executionConfig: {
            idleTtl: '1800s',
            ttl: '45s'
          }
        }
      })
    ).toEqual({
      maxIdleTimeQuantity: 30,
      maxIdleTimeUnit: 'minutes',
      maxIdleTime: '30 minutes',
      maxSessionTimeQuantity: 45,
      maxSessionTimeUnit: 'seconds',
      maxSessionTime: '45 seconds'
    });
    const updatedLifecycle = applySessionLifecycleUpdateToTemplate(
      mockProfile,
      {
        maxIdleTimeQuantity: 30,
        maxIdleTimeUnit: 'minutes',
        maxIdleTime: '30 minutes',
        maxSessionTimeQuantity: 2,
        maxSessionTimeUnit: 'days',
        maxSessionTime: '2 days'
      }
    );
    expect(
      updatedLifecycle.environmentConfig?.executionConfig?.idleTtl
    ).toBe('1800s');
    expect(updatedLifecycle.environmentConfig?.executionConfig?.ttl).toBe(
      '172800s'
    );
    const clearedLifecycle = applySessionLifecycleUpdateToTemplate(
      mockProfile,
      {
        maxIdleTime: '2h'
      }
    );
    expect(
      clearedLifecycle.environmentConfig?.executionConfig?.idleTtl
    ).toBe('7200s');
    expect(
      clearedLifecycle.environmentConfig?.executionConfig?.ttl
    ).toBeUndefined();

    // Other customizations builder & updater
    const customSparkProps =
      buildOtherCustomizationSparkPropertiesFromTemplate(mockProfile);
    expect(customSparkProps).toEqual({
      'dataproc.tier': 'premium',
      'spark.sql.catalog.biglake': 'org.apache.iceberg.spark.SparkCatalog',
      'spark.sql.catalog.biglake.type': 'hadoop'
    });
    const updatedOther = applyOtherCustomizationUpdateToTemplate(
      {
        ...mockProfile,
        runtimeConfig: {
          ...mockProfile.runtimeConfig,
          properties: {
            ...mockProfile.runtimeConfig?.properties,
            'dataproc.lakehouse.catalog.hive_cat':
              'projects/p/locations/l/catalogs/hive_cat'
          }
        }
      },
      {
        'dataproc.tier': 'premium',
        'spark.sql.shuffle.partitions': '200'
      },
      { env: 'prod' }
    );
    expect(
      updatedOther.runtimeConfig?.properties?.['spark.sql.shuffle.partitions']
    ).toBe('200');
    expect(
      updatedOther.runtimeConfig?.properties?.[
        'spark:spark.sql.catalog.biglake'
      ]
    ).toBeUndefined();
    expect(
      updatedOther.runtimeConfig?.properties?.['spark:spark.dataproc.engine']
    ).toBe('lightningEngine');
    expect(
      updatedOther.runtimeConfig?.properties?.[
        'dataproc.lakehouse.catalog.hive_cat'
      ]
    ).toBe('projects/p/locations/l/catalogs/hive_cat');
    expect(updatedOther.labels).toEqual({ env: 'prod' });

    // Resource name parser extracts projectId, region, and profileId
    expect(parseRuntimeProfileResourceName(mockProfile.name)).toEqual({
      projectId: 'test-project',
      region: 'us-central1',
      profileId: 'sample-profile'
    });
    expect(parseRuntimeProfileResourceName('')).toEqual({
      projectId: '',
      region: '',
      profileId: ''
    });

    // Metastore builder & updater
    expect(
      buildMetastoreConfigFromTemplate(mockProfile, 'test-project', 'us-central1')
    ).toEqual({
      hiveEndpointEnabled: false
    });

    // Unset metastoreType is a safe no-op that preserves existing properties
    const unchangedMetastoreRef = applyMetastoreUpdateToTemplate(
      mockProfile,
      { hiveEndpointEnabled: false },
      'test-project',
      'us-central1'
    );
    expect(unchangedMetastoreRef).toBe(mockProfile);

    // 'new' Lakehouse catalog mode (default regional catalog name vs. custom catalogName + prefixed keys)
    const defaultNewLakehouse = applyMetastoreUpdateToTemplate(
      { name: 'projects/test-project/locations/us-central1/sessionTemplates/p1' },
      {
        metastore: 'Lakehouse runtime catalog',
        metastoreType: 'lakehouse',
        icebergRestEndpointEnabled: true,
        catalogSelectionMode: 'new',
        hiveEndpointEnabled: false
      },
      'test-project',
      'us-central1'
    );
    expect(defaultNewLakehouse.environmentConfig).toBeUndefined();
    expect(defaultNewLakehouse.runtimeConfig?.properties).toEqual({
      'spark.dataproc.lakehouse.project': 'test-project',
      'dataproc.lakehouse.defaultCatalog': 'standard-lh-catalog-us-central1',
      'dataproc.lakehouse.catalog.standard-lh-catalog-us-central1':
        'projects/test-project/catalogs/standard-lh-catalog-us-central1'
    });
    expect(
      buildMetastoreConfigFromTemplate(
        defaultNewLakehouse,
        'test-project',
        'us-central1'
      )
    ).toEqual({
      metastore: 'Lakehouse runtime catalog',
      metastoreType: 'lakehouse',
      icebergRestEndpointEnabled: true,
      catalogSelectionMode: 'new',
      hiveEndpointEnabled: false
    });

    const prefixedCustomNewLakehouse: IRuntimeProfileTemplate = {
      name: 'projects/test-project/locations/us-central1/sessionTemplates/p2',
      runtimeConfig: {
        properties: {
          'spark:spark.dataproc.lakehouse.project': 'test-project',
          'dataproc:dataproc.lakehouse.defaultCatalog': 'my_custom_catalog',
          'dataproc:dataproc.lakehouse.catalog.my_custom_catalog':
            'projects/test-project/catalogs/my_custom_catalog'
        }
      }
    };
    expect(
      buildMetastoreConfigFromTemplate(
        prefixedCustomNewLakehouse,
        'test-project',
        'us-central1'
      )
    ).toEqual({
      metastore: 'Lakehouse runtime catalog',
      metastoreType: 'lakehouse',
      icebergRestEndpointEnabled: true,
      catalogSelectionMode: 'new',
      catalogName: 'my_custom_catalog',
      hiveEndpointEnabled: false
    });

    const dpmsTemplate = applyMetastoreUpdateToTemplate(
      mockProfile,
      {
        metastore: 'Dataproc Metastore',
        metastoreType: 'dataproc',
        projectId: 'other-dpms-proj',
        dataprocMetastoreService:
          'projects/other-dpms-proj/locations/us-central1/services/dpms-1'
      },
      'test-project',
      'us-central1'
    );
    expect(
      dpmsTemplate.environmentConfig?.peripheralsConfig?.metastoreService
    ).toBe('projects/other-dpms-proj/locations/us-central1/services/dpms-1');
    expect(
      buildMetastoreConfigFromTemplate(
        dpmsTemplate,
        'test-project',
        'us-central1'
      )
    ).toEqual({
      metastore: 'Dataproc Metastore',
      metastoreType: 'dataproc',
      projectId: 'other-dpms-proj',
      dataprocMetastoreService:
        'projects/other-dpms-proj/locations/us-central1/services/dpms-1'
    });

    const clearedDpmsTemplate = applyMetastoreUpdateToTemplate(
      dpmsTemplate,
      {
        metastore: 'Dataproc Metastore',
        metastoreType: 'dataproc',
        dataprocMetastoreService: 'None'
      },
      'test-project',
      'us-central1'
    );
    expect(
      clearedDpmsTemplate.environmentConfig?.peripheralsConfig
    ).toBeUndefined();

    const lakehouseExistingWithHive = applyMetastoreUpdateToTemplate(
      dpmsTemplate,
      {
        metastore: 'Lakehouse runtime catalog',
        metastoreType: 'lakehouse',
        projectId: 'iceberg-proj',
        icebergRestEndpointEnabled: true,
        catalogSelectionMode: 'existing',
        catalogId: 'existing_cat',
        hiveEndpointEnabled: true,
        hiveProjectId: 'hive-proj',
        hiveCatalogId: 'hive-cat-id',
        hiveCatalogName: 'hive_alias'
      },
      'test-project',
      'us-central1'
    );
    expect(
      lakehouseExistingWithHive.environmentConfig?.peripheralsConfig
    ).toBeUndefined();
    expect(
      lakehouseExistingWithHive.runtimeConfig?.properties?.[
        'spark.dataproc.lakehouse.project'
      ]
    ).toBe('iceberg-proj');
    expect(
      lakehouseExistingWithHive.runtimeConfig?.properties?.[
        'dataproc.lakehouse.defaultCatalog'
      ]
    ).toBe('projects/iceberg-proj/catalogs/existing_cat');
    expect(
      lakehouseExistingWithHive.runtimeConfig?.properties?.[
        'dataproc.lakehouse.catalog.existing_cat'
      ]
    ).toBe('projects/iceberg-proj/catalogs/existing_cat');
    expect(
      lakehouseExistingWithHive.runtimeConfig?.properties?.[
        'dataproc.lakehouse.catalog.hive_alias'
      ]
    ).toBe('projects/hive-proj/catalogs/hive-cat-id');
    expect(
      buildMetastoreConfigFromTemplate(
        lakehouseExistingWithHive,
        'test-project',
        'us-central1'
      )
    ).toEqual({
      metastore: 'Lakehouse runtime catalog',
      metastoreType: 'lakehouse',
      projectId: 'iceberg-proj',
      icebergRestEndpointEnabled: true,
      catalogSelectionMode: 'existing',
      catalogId: 'existing_cat',
      hiveEndpointEnabled: true,
      hiveProjectId: 'hive-proj',
      hiveCatalogId: 'hive-cat-id',
      hiveCatalogName: 'hive_alias'
    });

    const lakehouseHiveOnly = applyMetastoreUpdateToTemplate(
      lakehouseExistingWithHive,
      {
        metastore: 'Lakehouse runtime catalog',
        metastoreType: 'lakehouse',
        icebergRestEndpointEnabled: false,
        hiveEndpointEnabled: true,
        hiveProjectId: 'hive-only-proj',
        hiveCatalogId: 'hive-only-id',
        hiveCatalogName: 'hive_only'
      },
      'test-project',
      'us-central1'
    );
    expect(
      lakehouseHiveOnly.runtimeConfig?.properties?.[
        'dataproc.lakehouse.defaultCatalog'
      ]
    ).toBeUndefined();
    expect(
      buildMetastoreConfigFromTemplate(
        lakehouseHiveOnly,
        'test-project',
        'us-central1'
      )
    ).toEqual({
      metastore: 'Lakehouse runtime catalog',
      metastoreType: 'lakehouse',
      icebergRestEndpointEnabled: false,
      hiveEndpointEnabled: true,
      hiveProjectId: 'hive-only-proj',
      hiveCatalogId: 'hive-only-id',
      hiveCatalogName: 'hive_only'
    });

    // Network and security builder & updater (omits primaryNetwork when only subnetworkUri is present)
    const initialNetSec = buildNetworkSecurityConfigFromTemplate(
      mockProfile,
      'test-project',
      'us-central1'
    );
    expect(initialNetSec).toEqual({
      networkSource: 'project',
      subnetwork: 'default',
      networkTags: [],
      executionIdentity: 'user_account',
      encryption: 'google_managed'
    });

    // Defaults primaryNetwork to 'default' when neither networkUri nor subnetworkUri is present
    expect(
      buildNetworkSecurityConfigFromTemplate(
        { name: 'projects/test-project/locations/us-central1/sessionTemplates/empty-net' },
        'test-project',
        'us-central1'
      )
    ).toEqual({
      networkSource: 'project',
      primaryNetwork: 'default',
      networkInThisProject: 'default',
      subnetwork: 'default',
      networkTags: [],
      executionIdentity: 'service_account',
      encryption: 'google_managed'
    });

    // Domain-scoped Shared VPC project ID + full compute networkUri URL
    expect(
      buildNetworkSecurityConfigFromTemplate(
        {
          name: 'projects/test-project/locations/us-central1/sessionTemplates/domain-vpc',
          environmentConfig: {
            executionConfig: {
              networkUri:
                'https://www.googleapis.com/compute/v1/projects/test-project/global/networks/analytics-vpc',
              subnetworkUri:
                'projects/google.com:host-vpc/regions/us-central1/subnetworks/shared-sub-domain'
            }
          }
        },
        'test-project',
        'us-central1'
      )
    ).toEqual({
      networkSource: 'shared_from_host',
      primaryNetwork: 'analytics-vpc',
      networkInThisProject: 'analytics-vpc',
      subnetwork: 'default',
      hostProjectId: 'google.com:host-vpc',
      sharedSubnetwork: 'shared-sub-domain',
      networkTags: [],
      executionIdentity: 'service_account',
      encryption: 'google_managed'
    });

    // Same-project full subnetwork URI and empty projectId stay in 'project' networkSource
    const sameProjFullSubnetTemplate: IRuntimeProfileTemplate = {
      name: 'same-proj-template',
      environmentConfig: {
        executionConfig: {
          subnetworkUri:
            'projects/test-project/regions/us-central1/subnetworks/local-sub'
        }
      }
    };
    expect(
      buildNetworkSecurityConfigFromTemplate(
        sameProjFullSubnetTemplate,
        'test-project',
        'us-central1'
      ).networkSource
    ).toBe('project');
    expect(
      buildNetworkSecurityConfigFromTemplate(
        sameProjFullSubnetTemplate,
        '',
        'us-central1'
      ).networkSource
    ).toBe('project');

    const sharedVpcCmekTemplate = applyNetworkSecurityUpdateToTemplate(
      mockProfile,
      {
        networkSource: 'shared_from_host',
        hostProjectId: 'host-vpc-proj',
        sharedSubnetwork: 'shared-sub-1',
        networkTags: ['spark-tag', 'internal'],
        executionIdentity: 'service_account',
        serviceAccount: 'runner@test-project.iam.gserviceaccount.com',
        encryption: 'customer_managed_key',
        kmsKeySelectionMode: 'select',
        keyRing: 'ring-1',
        cryptoKey: 'key-1'
      },
      'test-project',
      'us-central1'
    );
    expect(sharedVpcCmekTemplate.environmentConfig?.executionConfig).toEqual({
      idleTtl: '3600s',
      ttl: '259200s',
      subnetworkUri:
        'projects/host-vpc-proj/regions/us-central1/subnetworks/shared-sub-1',
      networkTags: ['spark-tag', 'internal'],
      serviceAccount: 'runner@test-project.iam.gserviceaccount.com',
      kmsKey:
        'projects/test-project/locations/us-central1/keyRings/ring-1/cryptoKeys/key-1'
    });

    expect(
      buildNetworkSecurityConfigFromTemplate(
        sharedVpcCmekTemplate,
        'test-project',
        'us-central1'
      )
    ).toEqual({
      networkSource: 'shared_from_host',
      primaryNetwork: 'default',
      networkInThisProject: 'default',
      subnetwork: 'default',
      hostProjectId: 'host-vpc-proj',
      sharedSubnetwork: 'shared-sub-1',
      networkTags: ['spark-tag', 'internal'],
      executionIdentity: 'service_account',
      serviceAccount: 'runner@test-project.iam.gserviceaccount.com',
      encryption: 'customer_managed_key',
      kmsKeySelectionMode: 'select',
      keyRing: 'ring-1',
      cryptoKey: 'key-1',
      kmsKeyName:
        'projects/test-project/locations/us-central1/keyRings/ring-1/cryptoKeys/key-1'
    });

    const manualCrossProjKmsTemplate = applyNetworkSecurityUpdateToTemplate(
      sharedVpcCmekTemplate,
      {
        networkSource: 'project',
        primaryNetwork: 'default',
        subnetwork: 'custom-subnet',
        networkTags: [],
        executionIdentity: 'service_account',
        encryption: 'customer_managed_key',
        kmsKeySelectionMode: 'manual',
        kmsKeyName:
          'projects/kms-proj/locations/us-central1/keyRings/ext-ring/cryptoKeys/ext-key'
      },
      'test-project',
      'us-central1'
    );
    expect(
      buildNetworkSecurityConfigFromTemplate(
        manualCrossProjKmsTemplate,
        'test-project',
        'us-central1'
      )
    ).toEqual({
      networkSource: 'project',
      subnetwork: 'custom-subnet',
      networkTags: [],
      executionIdentity: 'service_account',
      encryption: 'customer_managed_key',
      kmsKeySelectionMode: 'manual',
      kmsKeyName:
        'projects/kms-proj/locations/us-central1/keyRings/ext-ring/cryptoKeys/ext-key'
    });

    // Switching back to google_managed clears kmsKey and omits empty environmentConfig
    const clearedExecTemplate = applyNetworkSecurityUpdateToTemplate(
      {
        name: 'projects/test-project/locations/us-central1/sessionTemplates/minimal',
        environmentConfig: {
          executionConfig: {
            kmsKey:
              'projects/test-project/locations/us-central1/keyRings/r/cryptoKeys/k'
          }
        }
      },
      {
        networkSource: 'project',
        subnetwork: '',
        networkTags: [],
        executionIdentity: 'service_account',
        encryption: 'google_managed'
      },
      'test-project',
      'us-central1'
    );
    expect(clearedExecTemplate.environmentConfig).toBeUndefined();
  });
});

