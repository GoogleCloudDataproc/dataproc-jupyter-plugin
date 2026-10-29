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

jest.mock('../utils/pollingTimer', () => ({
  __esModule: true,
  default: jest.fn()
}));

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import ListCluster from './listCluster';
import { ClusterService } from './clusterServices';
import PollingTimer from '../utils/pollingTimer';
import {
  CREATE_CLUSTER_URL,
  ClusterStatus,
  STATUS_CREATING,
  STATUS_DELETING,
  STATUS_ERROR,
  STATUS_RUNNING,
  STATUS_STOPPED
} from '../utils/const';

describe('ListCluster Component', () => {
  let container: HTMLDivElement;
  let root: Root;
  let consoleErrorSpy: jest.SpyInstance;
  const mockSetClusterSelected = jest.fn();
  const mockSetDetailedView = jest.fn();
  const mockSetLoggedIn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    consoleErrorSpy.mockRestore();
  });

  const buildClusterRow = (
    renderActions: (data: any) => React.JSX.Element,
    clusterName: string,
    statusText: string,
    stateEnum: ClusterStatus
  ) => ({
    clusterName,
    status: statusText,
    clusterImage: '2.1-debian11',
    region: 'us-central1',
    zone: 'us-central1-a',
    totalWorkersNode: '2',
    schedulesDeletion: 'Off',
    actions: renderActions({
      clusterName,
      status: { state: stateEnum }
    })
  });

  const renderComponent = async (detailedView = false) => {
    await act(async () => {
      root.render(
        <ListCluster
          setClusterSelected={mockSetClusterSelected}
          detailedView={detailedView}
          setDetailedView={mockSetDetailedView}
          setLoggedIn={mockSetLoggedIn}
        />
      );
    });
  };

  it('displays loading spinner while clusters are being fetched', async () => {
    jest
      .spyOn(ClusterService, 'listClustersAPIService')
      .mockImplementation(async () => undefined);

    await renderComponent();

    expect(container.querySelector('[data-testid="loader"]')).not.toBeNull();
    expect(container.textContent).toContain('Loading Clusters');
  });

  it('displays "No rows to display" when cluster list is empty after loading', async () => {
    jest
      .spyOn(ClusterService, 'listClustersAPIService')
      .mockImplementation(
        async (
          setProjectId,
          renderActions,
          setClustersList,
          setIsLoading,
          setLoggedIn
        ) => {
          setProjectId('test-project');
          setClustersList([]);
          setIsLoading(false);
          setLoggedIn(true);
        }
      );

    await renderComponent();

    expect(container.querySelector('.no-data-style')?.textContent).toBe(
      'No rows to display'
    );
    expect(PollingTimer).toHaveBeenCalled();
  });

  it('renders ApiEnableDialog when apiDialogOpen is true and closes on Cancel or Enable', async () => {
    const windowOpenSpy = jest
      .spyOn(window, 'open')
      .mockImplementation(() => null);

    jest
      .spyOn(ClusterService, 'listClustersAPIService')
      .mockImplementation(
        async (
          setProjectId,
          renderActions,
          setClustersList,
          setIsLoading,
          setLoggedIn,
          setApiDialogOpen,
          setPollingDisable,
          setEnableLink
        ) => {
          setIsLoading(false);
          setEnableLink('https://console.cloud.google.com/apis/dataproc');
          setApiDialogOpen(true);
        }
      );

    await renderComponent();

    expect(document.body.textContent).toContain(
      'The Cloud Dataproc API is not enabled for this project.'
    );

    const buttons = Array.from(document.body.querySelectorAll('button'));
    const enableBtn = buttons.find(b => b.textContent === 'Enable');
    expect(enableBtn).toBeDefined();

    await act(async () => {
      enableBtn?.click();
    });

    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://console.cloud.google.com/apis/dataproc',
      '_blank'
    );

    // Re-mount and verify Cancel button triggers onCancel handler
    act(() => {
      root.unmount();
    });
    root = createRoot(container);
    await renderComponent();

    const cancelBtn = Array.from(document.body.querySelectorAll('button')).find(
      b => b.textContent === 'Cancel'
    );
    expect(cancelBtn).toBeDefined();

    await act(async () => {
      cancelBtn?.click();
    });

    expect(windowOpenSpy).toHaveBeenCalledTimes(1);
    windowOpenSpy.mockRestore();
  });

  it('opens Create Cluster URL in a new tab with projectId when Create cluster button is clicked', async () => {
    const windowOpenSpy = jest
      .spyOn(window, 'open')
      .mockImplementation(() => null);

    jest
      .spyOn(ClusterService, 'listClustersAPIService')
      .mockImplementation(
        async (
          setProjectId,
          renderActions,
          setClustersList,
          setIsLoading,
          setLoggedIn
        ) => {
          setProjectId('my-gcp-project');
          setClustersList([]);
          setIsLoading(false);
          setLoggedIn(true);
        }
      );

    await renderComponent();

    const createClusterBtn = container.querySelector(
      '.create-cluster-sub-overlay'
    ) as HTMLElement;
    expect(createClusterBtn).not.toBeNull();

    await act(async () => {
      createClusterBtn.click();
    });

    expect(windowOpenSpy).toHaveBeenCalledWith(
      `${CREATE_CLUSTER_URL}?project=my-gcp-project`,
      '_blank'
    );
    windowOpenSpy.mockRestore();
  });

  it('renders cluster rows with status icons and triggers start, stop, and restart actions appropriately', async () => {
    const startSpy = jest
      .spyOn(ClusterService, 'startClusterApi')
      .mockResolvedValue(undefined);
    const stopSpy = jest
      .spyOn(ClusterService, 'stopClusterApi')
      .mockResolvedValue(undefined);
    const restartSpy = jest
      .spyOn(ClusterService, 'restartClusterApiService')
      .mockImplementation(
        async (selectedCluster, setRestartEnabled, listClustersAPI, timer, statusApi) => {
          await statusApi(selectedCluster);
        }
      );
    const statusSpy = jest
      .spyOn(ClusterService, 'statusApiService')
      .mockResolvedValue(undefined);

    jest
      .spyOn(ClusterService, 'listClustersAPIService')
      .mockImplementation(
        async (
          setProjectId,
          renderActions,
          setClustersList,
          setIsLoading,
          setLoggedIn
        ) => {
          setProjectId('test-project');
          setClustersList([
            buildClusterRow(
              renderActions,
              'cluster-running',
              STATUS_RUNNING,
              ClusterStatus.STATUS_RUNNING
            ),
            buildClusterRow(
              renderActions,
              'cluster-stopped',
              STATUS_STOPPED,
              ClusterStatus.STATUS_STOPPED
            ),
            buildClusterRow(
              renderActions,
              'cluster-error',
              STATUS_ERROR,
              ClusterStatus.STATUS_ACTIVE
            ),
            buildClusterRow(
              renderActions,
              'cluster-creating',
              STATUS_CREATING,
              ClusterStatus.STATUS_ACTIVE
            ),
            buildClusterRow(
              renderActions,
              'cluster-deleting',
              STATUS_DELETING,
              ClusterStatus.STATUS_ACTIVE
            )
          ]);
          setIsLoading(false);
          setLoggedIn(true);
        }
      );

    await renderComponent();

    const rows = container.querySelectorAll('tbody tr.cluster-list-data-parent');
    expect(rows.length).toBe(5);

    // Row 0 is RUNNING: Stop and Restart should be enabled; Start should be disabled
    const row0Start = rows[0].querySelector('[title="Start Cluster"]') as HTMLElement;
    const row0Stop = rows[0].querySelector('[title="Stop Cluster"]') as HTMLElement;
    const row0Restart = rows[0].querySelector('[title="Restart Cluster"]') as HTMLElement;

    expect(row0Start.getAttribute('aria-disabled')).toBe('true');
    expect(row0Stop.getAttribute('aria-disabled')).toBe('false');
    expect(row0Restart.getAttribute('aria-disabled')).toBe('false');

    await act(async () => {
      row0Start.click();
      row0Stop.click();
      row0Restart.click();
    });

    expect(startSpy).not.toHaveBeenCalled();
    expect(stopSpy).toHaveBeenCalledWith('cluster-running');
    expect(restartSpy).toHaveBeenCalled();
    expect(statusSpy).toHaveBeenCalledWith(
      'cluster-running',
      expect.any(Function),
      expect.objectContaining({ current: undefined })
    );

    // Row 1 is STOPPED: Start should be enabled; Stop and Restart should be disabled
    const row1Start = rows[1].querySelector('[title="Start Cluster"]') as HTMLElement;
    const row1Stop = rows[1].querySelector('[title="Stop Cluster"]') as HTMLElement;
    const row1Restart = rows[1].querySelector('[title="Restart Cluster"]') as HTMLElement;

    expect(row1Start.getAttribute('aria-disabled')).toBe('false');
    expect(row1Stop.getAttribute('aria-disabled')).toBe('true');
    expect(row1Restart.getAttribute('aria-disabled')).toBe('true');

    await act(async () => {
      row1Start.click();
    });
    expect(startSpy).toHaveBeenCalledWith('cluster-stopped');

    // Clicking cluster name navigates to details for RUNNING cluster, but not DELETING cluster
    const runningNameCell = rows[0].querySelector('.cluster-name') as HTMLElement;
    const deletingNameCell = rows[4].querySelector('.cluster-name') as HTMLElement;

    await act(async () => {
      deletingNameCell.click();
    });
    expect(mockSetClusterSelected).not.toHaveBeenCalled();

    await act(async () => {
      runningNameCell.click();
    });
    expect(mockSetClusterSelected).toHaveBeenCalledWith('cluster-running');
    expect(mockSetDetailedView).toHaveBeenCalledWith(true);

    startSpy.mockRestore();
    stopSpy.mockRestore();
    restartSpy.mockRestore();
    statusSpy.mockRestore();
  });

  it('renders PaginationView when clustersList has more than 50 clusters', async () => {
    jest
      .spyOn(ClusterService, 'listClustersAPIService')
      .mockImplementation(
        async (
          setProjectId,
          renderActions,
          setClustersList,
          setIsLoading,
          setLoggedIn
        ) => {
          const manyClusters = Array.from({ length: 55 }, (_, i) =>
            buildClusterRow(
              renderActions,
              `cluster-${i}`,
              STATUS_RUNNING,
              ClusterStatus.STATUS_RUNNING
            )
          );
          setClustersList(manyClusters);
          setIsLoading(false);
          setLoggedIn(true);
        }
      );

    await renderComponent();

    expect(container.querySelector('.pagination-parent-view')).not.toBeNull();
  });
});
