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
  formatCreateTime,
  formatDiskConfig,
  formatDurationTtl,
  stripPropertyPrefix
} from './runtimeProfileDetails';
import {
  formatLastUsed,
  IRuntimeProfileTemplate
} from './runtimeProfileListMapper';
import { RuntimeProfileService } from './runtimeProfileService';
import { Notification } from '@jupyterlab/apputils';

jest.mock('@jupyterlab/apputils', () => ({
  ...jest.requireActual('@jupyterlab/apputils'),
  Notification: { emit: jest.fn() }
}));

describe('RuntimeProfileDetails Component', () => {
  let container: HTMLDivElement;
  let root: Root;
  const originalClipboard = navigator.clipboard;

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
  });

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
      writable: true
    });
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  const renderDetails = (
    onBack = jest.fn(),
    onDeleteSuccess?: () => void,
    profile: IRuntimeProfileTemplate = mockProfile
  ) =>
    act(async () => {
      root.render(
        <RuntimeProfileDetails
          profile={profile}
          onBack={onBack}
          onDeleteSuccess={onDeleteSuccess}
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

    const subsectionEditBtns = container.querySelectorAll(
      'button[aria-label^="Edit "]'
    );
    expect(subsectionEditBtns).toHaveLength(7);

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

    expect(container.textContent).toContain(
      'us-central1-docker.pkg.dev/my-proj/repo/img:latest'
    );
    expect(container.textContent).toContain('my-staging-bucket');
    expect(container.textContent).toContain(
      'https://us-central1-python.pkg.dev/my-proj/pypi'
    );
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

    const configHeader = container.querySelector(
      '[aria-controls="runtime-profile-config-content"]'
    ) as HTMLElement;
    act(() => {
      configHeader.click();
    });
    expect(container.textContent).not.toContain('Runtime configuration');

    act(() => {
      configHeader.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
    });
    expect(container.textContent).toContain('Runtime configuration');

    act(() => {
      configHeader.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true })
      );
    });
    expect(container.textContent).not.toContain('Runtime configuration');
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

  it('should format createTime, lastUsed, diskConfig, durationTtl, and stripPropertyPrefix deterministically', () => {
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
  });
});
