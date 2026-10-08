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
  formatCreateTime
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
    name: 'projects/test-project/locations/us-central1/sessionTemplates/aditee-test1234',
    description: 'test123',
    creator: 'aditeekatti@google.com',
    createTime: '2026-09-16T08:02:03Z',
    updateTime: '2026-09-16T08:02:03Z',
    jupyterSession: { displayName: 'aditee-test1234', kernel: 'PYTHON' }
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

  const renderDetails = (onBack = jest.fn(), onDeleteSuccess?: () => void) =>
    act(async () => {
      root.render(
        <RuntimeProfileDetails
          profile={mockProfile}
          onBack={onBack}
          onDeleteSuccess={onDeleteSuccess}
        />
      );
    });

  it('should render Basic Information and handle Back and Copy actions', async () => {
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
    expect(container.textContent).toContain('aditee-test1234');
    expect(container.textContent).toContain('us-central1');
    expect(container.textContent).toContain(
      'Wed Sep 16 2026 08:02:03 GMT+0000 (Coordinated Universal Time)'
    );
    expect(container.textContent).toContain('aditeekatti@google.com');
    expect(container.textContent).toContain('test123');
    expect(container.textContent).toContain('PYTHON');

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
    expect(writeTextMock).toHaveBeenCalledWith('aditee-test1234');
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

    const backBtn = container.querySelector(
      '.runtime-profile-details-back-btn'
    ) as HTMLButtonElement;
    act(() => {
      backBtn.click();
    });
    expect(onBackMock).toHaveBeenCalledTimes(1);
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
      expect.stringContaining('Failed to delete aditee-test1234:'),
      'error',
      { autoClose: 5000 }
    );

    await act(async () => {
      getConfirmBtn().click();
    });
    expect(RuntimeProfileService.deleteRuntimeProfile).toHaveBeenCalledWith(
      'projects/test-project/locations/us-central1/sessionTemplates/aditee-test1234',
      'aditee-test1234'
    );
    expect(Notification.emit).toHaveBeenCalledWith(
      'aditee-test1234 is deleted successfully',
      'success',
      { autoClose: 5000 }
    );
    expect(onDeleteSuccessMock).toHaveBeenCalledTimes(1);
  });

  it('should format createTime and lastUsed dates deterministically', () => {
    expect(formatCreateTime('')).toBe('');
    expect(formatCreateTime('invalid-date')).toBe('');

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
  });
});
