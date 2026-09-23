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

jest.mock('../../third-party-licenses.txt', () => 'Mock Third Party Licenses');

jest.mock('@mui/material', () => {
  const actual = jest.requireActual('@mui/material');
  return {
    ...actual,
    Button: ({ children, onClick, disabled }: any) => (
      <button onClick={onClick} disabled={disabled}>
        {children}
      </button>
    )
  };
});

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import Common from './common';
import { authApi, loggedFetch } from '../utils/utils';
import { requestAPI } from '../handler/handler';
import { Notification } from '@jupyterlab/apputils';

jest.mock('../utils/utils', () => ({
  authApi: jest.fn(),
  loggedFetch: jest.fn()
}));

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

jest.mock('../controls/DynamicDropdown', () => ({
  DynamicDropdown: ({ value, onChange, label }: any) => (
    <input
      data-testid="project-dropdown"
      aria-label={label}
      value={value}
      onChange={e => onChange(e, e.target.value)}
    />
  )
}));

jest.mock('../controls/RegionDropdown', () => ({
  RegionDropdown: ({ region, onRegionChange }: any) => (
    <input
      data-testid="region-dropdown"
      value={region}
      onChange={e => onRegionChange(e.target.value)}
    />
  )
}));

jest.mock('../controls/BigQueryRegionDropdown', () => ({
  BigQueryRegionDropdown: ({ region, onRegionChange }: any) => (
    <input
      data-testid="bq-region-dropdown"
      value={region}
      onChange={e => onRegionChange(e.target.value)}
    />
  )
}));

const defaultServiceUrls = {
  dataproc_url: 'https://dataproc.googleapis.com/',
  compute_url: 'https://compute.googleapis.com/compute',
  metastore_url: 'https://metastore.googleapis.com/',
  cloudkms_url: 'https://cloudkms.googleapis.com/',
  cloudresourcemanager_url: 'https://cloudresourcemanager.googleapis.com/',
  datacatalog_url: 'https://datacatalog.googleapis.com/',
  storage_url: 'https://storage.googleapis.com/'
};

describe('Common Settings Component', () => {
  let container: HTMLDivElement;
  let root: Root;


  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    (requestAPI as jest.Mock).mockImplementation((endpoint: string) => {
      if (endpoint === 'settings') {
        return Promise.resolve({
          enable_bigquery_integration: false,
          kernel_gateway_project_number: null
        });
      }
      if (endpoint === 'configuration') {
        return Promise.resolve({ config: 'Configuration saved' });
      }
      return Promise.resolve(defaultServiceUrls);
    });

    (loggedFetch as jest.Mock).mockResolvedValue({
      json: () =>
        Promise.resolve({
          email: 'test-user@example.com',
          picture: 'https://example.com/avatar.png'
        })
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('should render loading spinner initially before authApi resolves', async () => {
    (authApi as jest.Mock).mockReturnValue(new Promise(() => {}));

    await act(async () => {
      root.render(
        <Common
          configError={false}
          setConfigError={jest.fn()}
        />
      );
    });

    expect(container.textContent).toContain('Loading Config Setup');
  });

  it('should render common settings form and user info after credentials load', async () => {
    (authApi as jest.Mock).mockResolvedValue({
      access_token: 'mock-token',
      project_id: 'my-gcp-project',
      region_id: 'us-central1',
      config_error: 0,
      login_error: 0
    });

    const setConfigError = jest.fn();

    await act(async () => {
      root.render(
        <Common
          configError={false}
          setConfigError={setConfigError}
        />
      );
    });

    expect(container.textContent).toContain('Google Cloud Project Settings');
    expect(container.textContent).toContain('test-user@example.com');
    expect(setConfigError).toHaveBeenCalledWith(false);

    const projectInput = container.querySelector(
      '[data-testid="project-dropdown"]'
    ) as HTMLInputElement;
    const regionInput = container.querySelector(
      '[data-testid="region-dropdown"]'
    ) as HTMLInputElement;

    expect(projectInput.value).toBe('my-gcp-project');
    expect(regionInput.value).toBe('us-central1');
  });

  it('should handle undefined credentials by setting configError and emitting notification', async () => {
    (authApi as jest.Mock).mockResolvedValue(undefined);
    const setConfigError = jest.fn();

    await act(async () => {
      root.render(
        <Common
          configError={false}
          setConfigError={setConfigError}
        />
      );
    });

    expect(setConfigError).toHaveBeenCalledWith(true);
    expect(Notification.emit).toHaveBeenCalledWith(
      'Failed to fetch credentials. Please check your configuration.',
      'error',
      { autoClose: 5000 }
    );
  });

  it('should submit configuration and emit error notification on save failure', async () => {
    (authApi as jest.Mock).mockResolvedValue({
      access_token: 'mock-token',
      project_id: 'my-gcp-project',
      region_id: 'us-central1'
    });
    (requestAPI as jest.Mock).mockImplementation((endpoint: string) => {
      if (endpoint === 'settings') {
        return Promise.resolve({});
      }
      if (endpoint === 'configuration') {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({});
    });

    await act(async () => {
      root.render(
        <Common
          configError={false}
          setConfigError={jest.fn()}
        />
      );
    });

    const saveBtn = Array.from(container.querySelectorAll('button')).find(
      btn => btn.textContent === 'Save'
    ) as HTMLButtonElement;

    expect(saveBtn).toBeDefined();

    await act(async () => {
      saveBtn.click();
    });

    expect(requestAPI).toHaveBeenCalledWith('configuration', {
      body: JSON.stringify({
        projectId: 'my-gcp-project',
        region: 'us-central1'
      }),
      method: 'POST'
    });
    expect(Notification.emit).toHaveBeenCalledWith(
      expect.stringContaining('Error saving configuration:'),
      'error',
      { autoClose: 5000 }
    );
  });

  it('should prevent default and open license window on clicking Licenses link', async () => {
    (authApi as jest.Mock).mockResolvedValue({
      access_token: 'mock-token',
      project_id: 'my-gcp-project',
      region_id: 'us-central1'
    });

    const mockOpen = jest.spyOn(window, 'open').mockImplementation(
      () =>
        ({
          document: {
            createElement: () => ({ textContent: '' }),
            body: { appendChild: jest.fn() }
          }
        }) as any
    );

    await act(async () => {
      root.render(
        <Common
          configError={false}
          setConfigError={jest.fn()}
        />
      );
    });

    const licenseLink = Array.from(container.querySelectorAll('a')).find(
      a => a.textContent === 'Licenses'
    ) as HTMLAnchorElement;

    expect(licenseLink).toBeDefined();

    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    });
    act(() => {
      licenseLink.dispatchEvent(clickEvent);
    });

    expect(clickEvent.defaultPrevented).toBe(true);
    expect(mockOpen).toHaveBeenCalledWith('about:blank');

    mockOpen.mockRestore();
  });

  it('should await settings.set for bqRegion before completing save when BigQuery feature is enabled', async () => {
    const callOrder: string[] = [];
    const originalLocation = window.location;
    delete (window as any).location;
    (window as any).location = {
      ...originalLocation,
      reload: jest.fn().mockImplementation(() => {
        callOrder.push('location.reload');
      })
    };

    try {
      (authApi as jest.Mock).mockResolvedValue({
        access_token: 'mock-token',
        project_id: 'my-gcp-project',
        region_id: 'us-central1'
      });

      (requestAPI as jest.Mock).mockImplementation((endpoint: string) => {
        if (endpoint === 'settings') {
          return Promise.resolve({
            enable_bigquery_integration: true,
            kernel_gateway_project_number: null
          });
        }
        if (endpoint === 'configuration') {
          return Promise.resolve({ config: 'Configuration saved' });
        }
        return Promise.resolve(defaultServiceUrls);
      });

      const mockSet = jest.fn().mockImplementation(() =>
        Promise.resolve().then(() => {
          callOrder.push('settings.set');
        })
      );
      const mockSettingRegistry: any = {
        load: jest.fn().mockResolvedValue({
          get: jest.fn().mockReturnValue({ composite: 'us-central1' }),
          set: mockSet
        })
      };

      await act(async () => {
        root.render(
          <Common
            configError={false}
            setConfigError={jest.fn()}
            settingRegistry={mockSettingRegistry}
          />
        );
      });

      const saveBtn = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent === 'Save'
      ) as HTMLButtonElement;

      await act(async () => {
        saveBtn.click();
      });

      expect(mockSettingRegistry.load).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith('bqRegion', 'us-central1');
      expect(callOrder).toEqual(['settings.set', 'location.reload']);
    } finally {
      (window as any).location = originalLocation;
    }
  });

  it('should render read-only project ID with help tooltip when kernel_gateway_project_number is present', async () => {
    (authApi as jest.Mock).mockResolvedValue({
      access_token: 'mock-token',
      project_id: 'my-gcp-project',
      region_id: 'us-central1'
    });

    (requestAPI as jest.Mock).mockImplementation((endpoint: string) => {
      if (endpoint === 'settings') {
        return Promise.resolve({
          enable_bigquery_integration: false,
          kernel_gateway_project_number: '123456789'
        });
      }
      return Promise.resolve(defaultServiceUrls);
    });

    await act(async () => {
      root.render(
        <Common
          configError={false}
          setConfigError={jest.fn()}
        />
      );
    });

    expect(
      container.querySelector('.info-icon-container')?.getAttribute('title')
    ).toBe('Project Id is set at Jupyter Lab startup');
  });
});
