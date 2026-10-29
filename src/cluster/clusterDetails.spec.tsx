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

jest.mock('../jobs/jobs', () => ({
  __esModule: true,
  default: ({ clusterSelected }: any) => (
    <div data-testid="mock-jobs">Jobs for {clusterSelected}</div>
  )
}));

jest.mock('../jobs/submitJob', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-submit-job">Submit Job View</div>
}));

jest.mock('../utils/viewLogs', () => ({
  __esModule: true,
  default: ({ projectName }: any) => (
    <div data-testid="mock-view-logs">Logs for {projectName}</div>
  )
}));

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import ClusterDetails from './clusterDetails';
import { ClusterService } from './clusterServices';
import { JobService } from '../jobs/jobServices';
import {
  STATUS_CREATING,
  STATUS_ERROR,
  STATUS_PROVISIONING,
  STATUS_RUNNING,
  STATUS_STOPPED
} from '../utils/const';

describe('ClusterDetails Component', () => {
  let container: HTMLDivElement;
  let root: Root;
  let consoleErrorSpy: jest.SpyInstance;
  const mockSetDetailedView = jest.fn();
  const mockSetDetailedClusterView = jest.fn();
  const mockSetDetailedJobView = jest.fn();
  const mockSetSubmitJobView = jest.fn();
  const mockSetSelectedJobClone = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    jest
      .spyOn(JobService, 'listClustersAPIService')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    consoleErrorSpy.mockRestore();
  });

  const renderDetails = async (
    overrides: Partial<React.ComponentProps<typeof ClusterDetails>> = {}
  ) => {
    await act(async () => {
      root.render(
        <ClusterDetails
          clusterSelected="cluster-alpha"
          setDetailedView={mockSetDetailedView}
          setDetailedClusterView={mockSetDetailedClusterView}
          detailedJobView={false}
          setDetailedJobView={mockSetDetailedJobView}
          submitJobView={false}
          setSubmitJobView={mockSetSubmitJobView}
          selectedJobClone={{}}
          setSelectedJobClone={mockSetSelectedJobClone}
          {...overrides}
        />
      );
    });
  };

  it('displays Loading Cluster Details spinner while loading and clusterName is empty', async () => {
    jest
      .spyOn(ClusterService, 'getClusterDetailsService')
      .mockImplementation(async () => undefined);

    await renderDetails();

    expect(container.querySelector('[data-testid="loader"]')).not.toBeNull();
    expect(container.textContent).toContain('Loading Cluster Details');
  });

  it('renders error view when getClusterDetailsService sets errorView to true and navigates back on arrow click', async () => {
    jest
      .spyOn(ClusterService, 'getClusterDetailsService')
      .mockImplementation(
        async (
          setProjectName,
          clusterSelected,
          setErrorView,
          setIsLoading
        ) => {
          setErrorView(true);
          setIsLoading(false);
        }
      );

    await renderDetails();

    const alertEl = container.querySelector('[role="alert"]');
    expect(alertEl?.textContent).toBe(
      'Unable to find the resource you requested'
    );

    const backBtn = container.querySelector(
      '[aria-label="back-arrow-icon"]'
    ) as HTMLElement;
    await act(async () => {
      backBtn.click();
    });

    expect(mockSetDetailedView).toHaveBeenCalledWith(false);
    expect(mockSetDetailedClusterView).toHaveBeenCalledWith(false);
    expect(mockSetDetailedJobView).toHaveBeenCalledWith(false);
  });

  it('renders cluster metadata, ViewLogs, JobComponent, and triggers STOP when cluster is RUNNING', async () => {
    const startSpy = jest
      .spyOn(ClusterService, 'startClusterApi')
      .mockResolvedValue(undefined);
    const stopSpy = jest
      .spyOn(ClusterService, 'stopClusterApi')
      .mockResolvedValue(undefined);

    jest
      .spyOn(ClusterService, 'getClusterDetailsService')
      .mockImplementation(
        async (
          setProjectName,
          clusterSelected,
          setErrorView,
          setIsLoading,
          setClusterInfo
        ) => {
          setProjectName('my-project');
          setClusterInfo({
            clusterName: 'cluster-alpha',
            clusterUuid: 'uuid-alpha-123',
            status: { state: STATUS_RUNNING },
            error: { message: '', code: 0 }
          });
          setIsLoading(false);
        }
      );

    await renderDetails({
      setDetailedClusterView: undefined,
      setDetailedJobView: undefined
    });

    expect(container.textContent).toContain('cluster-alpha');
    expect(container.textContent).toContain('uuid-alpha-123');
    expect(container.textContent).toContain('Dataproc Cluster');
    expect(container.textContent).toContain('running');
    expect(
      container.querySelector('[data-testid="mock-view-logs"]')?.textContent
    ).toBe('Logs for my-project');
    expect(
      container.querySelector('[data-testid="mock-jobs"]')?.textContent
    ).toBe('Jobs for cluster-alpha');

    const actionSections = container.querySelectorAll('.action-cluster-section');
    const startAction = actionSections[0] as HTMLElement;
    const stopAction = actionSections[1] as HTMLElement;

    expect(startAction.getAttribute('aria-disabled')).toBe('true');
    expect(stopAction.getAttribute('aria-disabled')).toBe('false');

    await act(async () => {
      startAction.click();
      stopAction.click();
    });

    expect(startSpy).not.toHaveBeenCalled();
    expect(stopSpy).toHaveBeenCalledWith('cluster-alpha');

    const headerBackBtn = container.querySelector(
      '[aria-label="back-arrow-icon"]'
    ) as HTMLElement;
    await act(async () => {
      headerBackBtn.click();
    });
    expect(mockSetDetailedView).toHaveBeenCalledWith(false);
    expect(mockSetDetailedClusterView).not.toHaveBeenCalled();
    expect(mockSetDetailedJobView).not.toHaveBeenCalled();

    startSpy.mockRestore();
    stopSpy.mockRestore();
  });

  it('triggers START when cluster is STOPPED and handles CREATING/ERROR status rendering', async () => {
    const startSpy = jest
      .spyOn(ClusterService, 'startClusterApi')
      .mockResolvedValue(undefined);
    const stopSpy = jest
      .spyOn(ClusterService, 'stopClusterApi')
      .mockResolvedValue(undefined);

    jest
      .spyOn(ClusterService, 'getClusterDetailsService')
      .mockImplementationOnce(
        async (
          setProjectName,
          clusterSelected,
          setErrorView,
          setIsLoading,
          setClusterInfo
        ) => {
          setClusterInfo({
            clusterName: 'cluster-stopped',
            clusterUuid: 'uuid-stopped',
            status: { state: STATUS_STOPPED },
            error: { message: '', code: 0 }
          });
          setIsLoading(false);
        }
      );

    await renderDetails();

    const actionSections = container.querySelectorAll('.action-cluster-section');
    const startAction = actionSections[0] as HTMLElement;
    const stopAction = actionSections[1] as HTMLElement;

    expect(startAction.getAttribute('aria-disabled')).toBe('false');
    expect(stopAction.getAttribute('aria-disabled')).toBe('true');

    await act(async () => {
      startAction.click();
      stopAction.click();
    });

    expect(startSpy).toHaveBeenCalledWith('cluster-stopped');
    expect(stopSpy).not.toHaveBeenCalled();

    // Verify STATUS_CREATING maps display text to STATUS_PROVISIONING and shows spinner
    jest
      .spyOn(ClusterService, 'getClusterDetailsService')
      .mockImplementationOnce(
        async (
          setProjectName,
          clusterSelected,
          setErrorView,
          setIsLoading,
          setClusterInfo
        ) => {
          setClusterInfo({
            clusterName: 'cluster-creating',
            clusterUuid: 'uuid-creating',
            status: { state: STATUS_CREATING },
            error: { message: '', code: 0 }
          });
          setIsLoading(false);
        }
      );

    act(() => {
      root.unmount();
    });
    root = createRoot(container);
    await renderDetails();

    expect(container.querySelector('.cluster-status')?.textContent).toBe(
      STATUS_PROVISIONING
    );
    expect(container.querySelector('[data-testid="loader"]')).not.toBeNull();

    // Verify STATUS_ERROR renders error status
    jest
      .spyOn(ClusterService, 'getClusterDetailsService')
      .mockImplementationOnce(
        async (
          setProjectName,
          clusterSelected,
          setErrorView,
          setIsLoading,
          setClusterInfo
        ) => {
          setClusterInfo({
            clusterName: 'cluster-error',
            clusterUuid: 'uuid-error',
            status: { state: STATUS_ERROR },
            error: { message: '', code: 0 }
          });
          setIsLoading(false);
        }
      );

    act(() => {
      root.unmount();
    });
    root = createRoot(container);
    await renderDetails();

    expect(container.querySelector('.cluster-status')?.textContent).toBe(
      'error'
    );

    startSpy.mockRestore();
    stopSpy.mockRestore();
  });

  it('opens DeletePopup on DELETE click, cancels on Cancel, and deletes + navigates back on Delete', async () => {
    const deleteSpy = jest
      .spyOn(ClusterService, 'deleteClusterApi')
      .mockResolvedValue(undefined);

    jest
      .spyOn(ClusterService, 'getClusterDetailsService')
      .mockImplementation(
        async (
          setProjectName,
          clusterSelected,
          setErrorView,
          setIsLoading,
          setClusterInfo
        ) => {
          setClusterInfo({
            clusterName: 'cluster-alpha',
            clusterUuid: 'uuid-alpha',
            status: { state: STATUS_RUNNING },
            error: { message: '', code: 0 }
          });
          setIsLoading(false);
        }
      );

    await renderDetails();

    const deleteAction = container.querySelectorAll(
      '.action-cluster-section'
    )[2] as HTMLElement;

    await act(async () => {
      deleteAction.click();
    });

    expect(document.body.textContent).toContain(
      'This will delete cluster-alpha and cannot be undone.'
    );

    // Click Cancel first
    const cancelBtn = Array.from(document.body.querySelectorAll('button')).find(
      b => b.textContent === 'Cancel'
    );
    await act(async () => {
      cancelBtn?.click();
    });
    expect(deleteSpy).not.toHaveBeenCalled();

    // Re-open and click Delete
    await act(async () => {
      deleteAction.click();
    });
    const confirmDeleteBtn = Array.from(
      document.body.querySelectorAll('button')
    ).find(b => b.textContent === 'Delete');

    await act(async () => {
      confirmDeleteBtn?.click();
    });

    expect(deleteSpy).toHaveBeenCalledWith('cluster-alpha');
    expect(mockSetDetailedView).toHaveBeenCalledWith(false);
    deleteSpy.mockRestore();
  });

  it('renders SubmitJob when submitJobView is true and detailedJobView is false', async () => {
    jest
      .spyOn(ClusterService, 'getClusterDetailsService')
      .mockImplementation(async () => undefined);

    await renderDetails({ submitJobView: true, detailedJobView: false });

    expect(
      container.querySelector('[data-testid="mock-submit-job"]')
    ).not.toBeNull();
  });
});
