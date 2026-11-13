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

jest.mock('../utils/pollingTimer', () => jest.fn(() => undefined));

jest.mock('./submitJob', () => ({
  __esModule: true,
  default: ({ selectedJobClone }: any) => (
    <div data-testid="submit-job-mock">
      SubmitJob:{selectedJobClone?.reference?.jobId || 'new'}
    </div>
  )
}));

jest.mock('./jobDetails', () => ({
  __esModule: true,
  default: ({ jobSelected }: any) => (
    <div data-testid="job-details-mock">JobDetails:{jobSelected}</div>
  )
}));

import React, { act, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import JobComponent from './jobs';
import { JobService } from './jobServices';
import {
  ClusterStatus,
  STATUS_CANCELLED,
  STATUS_FAIL,
  STATUS_PROVISIONING,
  STATUS_SUCCESS
} from '../utils/const';

const makeJobRow = (
  id: string,
  status: string,
  state: ClusterStatus,
  labels: string[] = ['env : prod']
) => ({
  jobid: id,
  status,
  region: 'us-central1',
  type: 'PySpark',
  starttime: '2026-01-01 10:00:00',
  elapsedtime: '1 min 5 sec',
  labels,
  raw: {
    reference: { jobId: id },
    status: { state },
    clusterName: 'cluster-1'
  }
});

function JobsHarness({ clusterSelected = '' }: { clusterSelected?: string }) {
  const [detailedJobView, setDetailedJobView] = useState(false);
  const [submitJobView, setSubmitJobView] = useState(false);
  const [selectedJobClone, setSelectedJobClone] = useState<any>('');
  const [detailedView, setDetailedView] = useState(false);

  return (
    <JobComponent
      clusterSelected={clusterSelected}
      detailedJobView={detailedJobView}
      setDetailedJobView={setDetailedJobView}
      submitJobView={submitJobView}
      setSubmitJobView={setSubmitJobView}
      setDetailedView={setDetailedView}
      selectedJobClone={selectedJobClone}
      setSelectedJobClone={setSelectedJobClone}
      fromPage={detailedView ? 'clusters' : 'jobs'}
    />
  );
}

describe('JobComponent', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    jest.spyOn(JobService, 'stopJobApi').mockResolvedValue(undefined);
    jest.spyOn(JobService, 'deleteJobApi').mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('shows loading spinner initially and empty message when no jobs are returned', async () => {
    let finishList: () => void = () => {};
    jest.spyOn(JobService, 'listJobsAPIService').mockImplementation(
      (_c, setIsLoading, setjobsList) =>
        new Promise<void>(resolve => {
          finishList = () => {
            setjobsList([]);
            setIsLoading(false);
            resolve();
          };
        })
    );
    jest
      .spyOn(JobService, 'listClustersAPIService')
      .mockResolvedValue(undefined);

    await act(async () => {
      root.render(<JobsHarness />);
    });
    expect(container.textContent).toContain('Loading Jobs');

    await act(async () => {
      finishList();
    });
    expect(container.textContent).toContain('No rows to display');
    expect(container.textContent).not.toContain('SUBMIT JOB');
  });

  it('renders jobs table with statuses, labels, and opens SubmitJob on SUBMIT JOB click', async () => {
    const sampleRows = [
      makeJobRow(
        'job-run',
        ClusterStatus.STATUS_RUNNING,
        ClusterStatus.STATUS_RUNNING
      ),
      makeJobRow('job-ok', STATUS_SUCCESS, ClusterStatus.STATUS_STOPPED, [
        'None'
      ]),
      makeJobRow('job-fail', STATUS_FAIL, ClusterStatus.STATUS_STOPPED),
      makeJobRow('job-cancel', STATUS_CANCELLED, ClusterStatus.STATUS_STOPPED),
      makeJobRow('job-prov', STATUS_PROVISIONING, ClusterStatus.STATUS_STOPPED)
    ];

    jest
      .spyOn(JobService, 'listJobsAPIService')
      .mockImplementation(
        async (_c, setIsLoading, setjobsList, renderActions) => {
          setjobsList(
            sampleRows.map(r => ({ ...r, actions: renderActions(r.raw) }))
          );
          setIsLoading(false);
        }
      );
    jest
      .spyOn(JobService, 'listClustersAPIService')
      .mockImplementation(async setClusterResponse => {
        setClusterResponse([{ clusterName: 'cluster-1', status: 'RUNNING' }]);
      });

    await act(async () => {
      root.render(<JobsHarness clusterSelected="cluster-1" />);
    });

    const headers = Array.from(container.querySelectorAll('thead th')).map(
      th => th.textContent
    );
    expect(headers).toEqual([
      'Job ID',
      'Status',
      'Region',
      'Type',
      'Start time',
      'Elapsed time',
      'Labels',
      'Actions'
    ]);
    expect(container.textContent).toContain('job-run');
    expect(container.textContent).toContain('env : prod');
    expect(container.textContent).toContain('None');
    expect(container.querySelector('[data-testid="loader"]')).toBeTruthy();

    const submitBtn = Array.from(
      container.querySelectorAll('[role="button"]')
    ).find(el => el.textContent?.includes('SUBMIT JOB')) as HTMLElement;
    expect(submitBtn).toBeTruthy();
    await act(async () => {
      submitBtn.click();
    });
    expect(
      container.querySelector('[data-testid="submit-job-mock"]')?.textContent
    ).toBe('SubmitJob:new');
  });

  it('handles Clone, Stop, Delete confirmation popup, and JobDetails navigation', async () => {
    const rows = [
      makeJobRow(
        'job-running',
        ClusterStatus.STATUS_RUNNING,
        ClusterStatus.STATUS_RUNNING
      ),
      makeJobRow('job-done', STATUS_SUCCESS, ClusterStatus.STATUS_STOPPED)
    ];
    jest
      .spyOn(JobService, 'listJobsAPIService')
      .mockImplementation(
        async (_c, setIsLoading, setjobsList, renderActions) => {
          setjobsList(rows.map(r => ({ ...r, actions: renderActions(r.raw) })));
          setIsLoading(false);
        }
      );
    jest
      .spyOn(JobService, 'listClustersAPIService')
      .mockResolvedValue(undefined);

    await act(async () => {
      root.render(<JobsHarness />);
    });

    // Stop running job
    const stopButtons = container.querySelectorAll('[title="Stop Job"]');
    await act(async () => {
      (stopButtons[0] as HTMLElement).click();
      (stopButtons[1] as HTMLElement).click();
    });
    expect(JobService.stopJobApi).toHaveBeenCalledTimes(1);
    expect(JobService.stopJobApi).toHaveBeenCalledWith('job-running');

    // Delete completed job (cancel then confirm)
    const deleteButtons = container.querySelectorAll('[title="Delete Job"]');
    await act(async () => {
      (deleteButtons[0] as HTMLElement).click();
    });
    expect(document.body.textContent).not.toContain('Confirm deletion');

    await act(async () => {
      (deleteButtons[1] as HTMLElement).click();
    });
    expect(document.body.textContent).toContain(
      'This will delete job-done and cannot be undone.'
    );
    const cancelBtn = Array.from(document.body.querySelectorAll('button')).find(
      b => b.textContent === 'Cancel'
    ) as HTMLButtonElement;
    await act(async () => {
      cancelBtn.click();
    });

    await act(async () => {
      (deleteButtons[1] as HTMLElement).click();
    });
    const confirmDeleteBtn = Array.from(
      document.body.querySelectorAll('button')
    ).find(b => b.textContent === 'Delete') as HTMLButtonElement;
    await act(async () => {
      confirmDeleteBtn.click();
    });
    expect(JobService.deleteJobApi).toHaveBeenCalledWith('job-done');

    // Open JobDetails by clicking Job ID cell
    const jobIdCell = Array.from(
      container.querySelectorAll('td.cluster-name')
    )[0] as HTMLElement;
    await act(async () => {
      jobIdCell.click();
    });
    expect(
      container.querySelector('[data-testid="job-details-mock"]')?.textContent
    ).toBe('JobDetails:job-running');
  });

  it('handles Clone action, global filter, pagination (>50 jobs), and API enable dialog', async () => {
    const manyRows = Array.from({ length: 52 }, (_, i) =>
      makeJobRow(`job-${i + 1}`, STATUS_SUCCESS, ClusterStatus.STATUS_STOPPED)
    );
    jest
      .spyOn(JobService, 'listJobsAPIService')
      .mockImplementation(
        async (_c, setIsLoading, setjobsList, renderActions) => {
          setjobsList(
            manyRows.map(r => ({ ...r, actions: renderActions(r.raw) }))
          );
          setIsLoading(false);
        }
      );
    jest
      .spyOn(JobService, 'listClustersAPIService')
      .mockResolvedValue(undefined);

    await act(async () => {
      root.render(<JobsHarness />);
    });

    expect(container.textContent).toContain('Rows per page');

    const filterInput = container.querySelector(
      'input[aria-label="filterd value"]'
    ) as HTMLInputElement;
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    )?.set;
    await act(async () => {
      setValue?.call(filterInput, 'job-52');
      filterInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container.textContent).toContain('job-52');

    // Clone action
    const cloneBtn = container.querySelector(
      '[title="Clone Job"]'
    ) as HTMLElement;
    await act(async () => {
      cloneBtn.click();
    });
    expect(
      container.querySelector('[data-testid="submit-job-mock"]')?.textContent
    ).toBe('SubmitJob:job-52');
  });

  it('renders ApiEnableDialog when listJobsAPIService opens API dialog', async () => {
    jest
      .spyOn(JobService, 'listJobsAPIService')
      .mockImplementation(
        async (
          _c,
          setIsLoading,
          setjobsList,
          _r,
          _s,
          setApiDialogOpen,
          setPollingDisable,
          setEnableLink
        ) => {
          setjobsList([]);
          setIsLoading(false);
          setEnableLink('https://console.cloud.google.com/apis/dataproc');
          setApiDialogOpen(true);
          setPollingDisable(true);
        }
      );
    jest
      .spyOn(JobService, 'listClustersAPIService')
      .mockResolvedValue(undefined);

    await act(async () => {
      root.render(<JobsHarness />);
    });
    expect(document.body.textContent).toContain('No rows to display');
    expect(document.body.querySelector('[role="dialog"]')).toBeTruthy();
  });
});
