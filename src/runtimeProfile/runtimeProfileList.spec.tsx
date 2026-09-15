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

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import RuntimeProfileList from './runtimeProfileList';
import { RuntimeProfileService } from './runtimeProfileService';
import { runtimeProfileListMapper } from './runtimeProfileListMapper';
import { Notification } from '@jupyterlab/apputils';

jest.mock('@jupyterlab/apputils', () => ({
  Notification: {
    emit: jest.fn()
  }
}));

describe('RuntimeProfileList Component & Mapper', () => {
  let container: HTMLDivElement;
  let root: Root;

  const mockTemplates = [
    {
      name: 'projects/test-project/locations/us-central1/sessionTemplates/profile-1',
      description: 'Short description',
      jupyterSession: { kernel: 'PYTHON', displayName: 'profile-1' },
      environmentConfig: {
        executionConfig: {
          subnetworkUri: 'default'
        }
      },
      runtimeConfig: {
        version: '2.2',
        properties: {
          'spark.driver.memory': '4g'
        }
      },
      creator: 'alice@example.com',
      updateTime: '2025-01-15T10:00:00Z'
    },
    {
      name: 'projects/test-project/locations/us-east1/sessionTemplates/profile-2',
      description:
        'A very long description that exceeds forty characters and should be truncated in the table view',
      jupyterSession: { kernel: 'PYTHON', displayName: 'profile-2' },
      runtimeConfig: {
        version: '2.1'
      },
      creator: 'bob@example.com',
      updateTime: 'invalid-date'
    },
    {
      name: 'projects/test-project/locations/us-central1/sessionTemplates/non-jupyter-template',
      description: 'Should be filtered out because jupyterSession is missing'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    jest
      .spyOn(RuntimeProfileService, 'fetchRuntimeProfiles')
      .mockResolvedValue({
        templates: mockTemplates,
        nextPageToken: 'next-token-123'
      });

    jest
      .spyOn(RuntimeProfileService, 'deleteRuntimeProfile')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  describe('runtimeProfileListMapper', () => {
    it('should filter only Jupyter session templates and map fields correctly', () => {
      const mapped = runtimeProfileListMapper(mockTemplates);
      expect(mapped).toHaveLength(2);
      expect(mapped[0].id).toBe(
        'projects/test-project/locations/us-central1/sessionTemplates/profile-1'
      );
      expect(mapped[0].name).toBe('profile-1');
      expect(mapped[0].region).toBe('us-central1');
      expect(mapped[0].runtimeVersion).toBe('2.2');
      expect(mapped[0].lastUsed).toBe('Jan 15, 2025');

      // Invalid date should safely fallback to empty string
      expect(mapped[1].name).toBe('profile-2');
      expect(mapped[1].lastUsed).toBe('');
    });
  });

  describe('RuntimeProfileList Component', () => {
    it('should fetch and display runtime profiles in table with pagination footer', async () => {
      await act(async () => {
        root.render(<RuntimeProfileList />);
      });

      expect(RuntimeProfileService.fetchRuntimeProfiles).toHaveBeenCalledWith(
        ''
      );
      expect(container.textContent).toContain('profile-1');
      expect(container.textContent).toContain('us-central1');
      expect(container.textContent).toContain('profile-2');
      expect(container.textContent).toContain('Showing 1 – 2 profiles');
    });

    it('should execute create-runtime-profile-component command when Create button is clicked', async () => {
      const mockApp = {
        commands: {
          execute: jest.fn()
        }
      };

      await act(async () => {
        root.render(<RuntimeProfileList app={mockApp} />);
      });

      const createBtn = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent?.includes('Create runtime profile')
      ) as HTMLButtonElement;

      expect(createBtn).toBeDefined();

      act(() => {
        createBtn.click();
      });

      expect(mockApp.commands.execute).toHaveBeenCalledWith(
        'create-runtime-profile-component'
      );
    });

    it('should open custom centered delete modal via portal and delete profile on confirmation', async () => {
      await act(async () => {
        root.render(<RuntimeProfileList />);
      });

      // Open action menu dropdown on first row
      const actionTriggers = container.querySelectorAll('.actions-cell span');
      expect(actionTriggers.length).toBeGreaterThan(0);

      act(() => {
        (actionTriggers[0] as HTMLElement).click();
      });

      const deleteOption = container.querySelector(
        '.dropdown-content.show div'
      ) as HTMLElement;
      expect(deleteOption).toBeDefined();
      expect(deleteOption.textContent).toBe('Delete');

      // Click Delete option to open modal
      act(() => {
        deleteOption.click();
      });

      // Modal is rendered in document.body via createPortal
      const modalTitle = document.body.querySelector(
        '.delete-profile-modal-title'
      );
      const modalBanner = document.body.querySelector(
        '.delete-profile-modal-banner'
      );
      const modalBody = document.body.querySelector(
        '.delete-profile-modal-body'
      );

      expect(modalTitle?.textContent).toBe('Delete Runtime Profile');
      expect(modalBanner?.textContent).toContain(
        'This operation cannot be undone.'
      );
      expect(modalBody?.textContent).toContain(
        'Do you want to delete runtime profile profile-1?'
      );

      const modalButtons = Array.from(
        document.body.querySelectorAll('.delete-profile-modal-btn')
      );
      const confirmDeleteBtn = modalButtons.find(
        btn => btn.textContent === 'Delete'
      ) as HTMLButtonElement;

      expect(confirmDeleteBtn).toBeDefined();

      await act(async () => {
        confirmDeleteBtn.click();
      });

      expect(
        RuntimeProfileService.deleteRuntimeProfile
      ).toHaveBeenCalledWith(
        'projects/test-project/locations/us-central1/sessionTemplates/profile-1',
        'profile-1'
      );
      expect(Notification.emit).toHaveBeenCalledWith(
        'profile-1 is deleted successfully',
        'success',
        { autoClose: 5000 }
      );
    });

    it('should close delete modal when Cancel is clicked without deleting', async () => {
      await act(async () => {
        root.render(<RuntimeProfileList />);
      });

      const actionTriggers = container.querySelectorAll('.actions-cell span');
      act(() => {
        (actionTriggers[0] as HTMLElement).click();
      });

      const deleteOption = container.querySelector(
        '.dropdown-content.show div'
      ) as HTMLElement;
      act(() => {
        deleteOption.click();
      });

      expect(
        document.body.querySelector('.delete-profile-modal')
      ).not.toBeNull();

      const cancelBtn = Array.from(
        document.body.querySelectorAll('.delete-profile-modal-btn')
      ).find(btn => btn.textContent === 'Cancel') as HTMLButtonElement;

      act(() => {
        cancelBtn.click();
      });

      expect(document.body.querySelector('.delete-profile-modal')).toBeNull();
      expect(
        RuntimeProfileService.deleteRuntimeProfile
      ).not.toHaveBeenCalled();
    });
  });
});
