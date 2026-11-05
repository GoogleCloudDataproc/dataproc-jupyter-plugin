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

jest.mock('../utils/utils', () => ({
  checkConfig: jest.fn()
}));

jest.mock('./listCluster', () => ({
  __esModule: true,
  default: ({ setClusterSelected, setDetailedView }: any) => (
    <div data-testid="mock-list-cluster">
      <button
        data-testid="open-cluster-detail-btn"
        onClick={() => {
          setClusterSelected('cluster-alpha');
          setDetailedView(true);
        }}
      >
        Select Cluster Alpha
      </button>
    </div>
  )
}));

jest.mock('./clusterDetails', () => ({
  __esModule: true,
  default: ({ clusterSelected, setDetailedView }: any) => (
    <div data-testid="mock-cluster-details">
      <span>Details for {clusterSelected}</span>
      <button
        data-testid="close-cluster-detail-btn"
        onClick={() => setDetailedView(false)}
      >
        Back
      </button>
    </div>
  )
}));

jest.mock('../jobs/jobs', () => ({
  __esModule: true,
  default: ({ fromPage, setDetailedJobView }: any) => (
    <div data-testid="mock-jobs-component">
      <span>Jobs from {fromPage}</span>
      <button
        data-testid="open-job-detail-btn"
        onClick={() => setDetailedJobView(true)}
      >
        Open Job Detail
      </button>
    </div>
  )
}));

jest.mock('../utils/loginErrorComponent', () => ({
  __esModule: true,
  default: ({ loginError, configError }: any) => (
    <div data-testid="mock-login-error">
      LoginError: {String(loginError)}, ConfigError: {String(configError)}
    </div>
  )
}));

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Cluster } from './cluster';
import { checkConfig } from '../utils/utils';

describe('Cluster Widget and ClusterComponent', () => {
  let container: HTMLDivElement;
  let root: Root;
  const mockSettingRegistry: any = {};
  const mockApp: any = {};
  const mockThemeManager: any = {
    theme: 'JupyterLab Light',
    isLight: jest.fn().mockReturnValue(true),
    themeChanged: {
      connect: jest.fn(),
      disconnect: jest.fn()
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
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

  const renderWidget = async () => {
    const widget = new Cluster(mockSettingRegistry, mockApp, mockThemeManager);
    await act(async () => {
      root.render(widget.renderInternal());
    });
    return widget;
  };

  it('shows Loading Clusters spinner while checkConfig is still pending', async () => {
    (checkConfig as jest.Mock).mockImplementation(
      () => new Promise(() => undefined)
    );

    await renderWidget();

    expect(container.querySelector('[data-testid="loader"]')).not.toBeNull();
    expect(container.textContent).toContain('Loading Clusters');
  });

  it('renders LoginErrorComponent when checkConfig sets loginError or configError', async () => {
    (checkConfig as jest.Mock).mockImplementation(
      async (setLoggedIn, setConfigError, setLoginError) => {
        setLoginError(true);
        setConfigError(false);
      }
    );

    await renderWidget();

    const errorEl = container.querySelector('[data-testid="mock-login-error"]');
    expect(errorEl).not.toBeNull();
    expect(errorEl?.textContent).toContain('LoginError: true');
  });

  it('renders Clusters and Jobs tabs and defaults to ListCluster when authenticated', async () => {
    (checkConfig as jest.Mock).mockResolvedValue(undefined);

    await renderWidget();

    expect(
      container.querySelector('[data-testid="mock-list-cluster"]')
    ).not.toBeNull();

    const tabPanels = container.querySelectorAll('[role="tabpanel"]');
    expect(tabPanels.length).toBe(2);
    expect(tabPanels[0].textContent).toBe('Clusters');
    expect(tabPanels[0].className).toBe('selected-header');
    expect(tabPanels[1].textContent).toBe('Jobs');
    expect(tabPanels[1].className).toBe('unselected-header');
  });

  it('switches between Clusters and Jobs tabs and hides tab overlay when detailedJobView is active', async () => {
    (checkConfig as jest.Mock).mockResolvedValue(undefined);

    await renderWidget();

    const tabPanels = container.querySelectorAll('[role="tabpanel"]');
    const jobsTab = tabPanels[1] as HTMLElement;

    await act(async () => {
      jobsTab.click();
    });

    expect(
      container.querySelector('[data-testid="mock-jobs-component"]')
    ).not.toBeNull();
    expect(container.textContent).toContain('Jobs from clusters');

    const updatedTabs = container.querySelectorAll('[role="tabpanel"]');
    expect(updatedTabs[0].className).toBe('unselected-header');
    expect(updatedTabs[1].className).toBe('selected-header');

    // Switch back to Clusters tab
    await act(async () => {
      (updatedTabs[0] as HTMLElement).click();
    });
    expect(
      container.querySelector('[data-testid="mock-list-cluster"]')
    ).not.toBeNull();

    // Switch to Jobs tab and trigger detailedJobView
    await act(async () => {
      (
        container.querySelectorAll('[role="tabpanel"]')[1] as HTMLElement
      ).click();
    });
    const openJobDetailBtn = container.querySelector(
      '[data-testid="open-job-detail-btn"]'
    ) as HTMLElement;
    await act(async () => {
      openJobDetailBtn.click();
    });

    expect(container.querySelector('.clusters-list-overlay')).toBeNull();
  });

  it('navigates to ClusterDetails when a cluster is selected and returns on back', async () => {
    (checkConfig as jest.Mock).mockResolvedValue(undefined);

    await renderWidget();

    const openDetailBtn = container.querySelector(
      '[data-testid="open-cluster-detail-btn"]'
    ) as HTMLElement;

    await act(async () => {
      openDetailBtn.click();
    });

    expect(
      container.querySelector('[data-testid="mock-cluster-details"]')
    ).not.toBeNull();
    expect(container.textContent).toContain('Details for cluster-alpha');

    const closeDetailBtn = container.querySelector(
      '[data-testid="close-cluster-detail-btn"]'
    ) as HTMLElement;

    await act(async () => {
      closeDetailBtn.click();
    });

    expect(
      container.querySelector('[data-testid="mock-list-cluster"]')
    ).not.toBeNull();
  });
});
