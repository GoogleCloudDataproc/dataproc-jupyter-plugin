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
  Notification: { emit: jest.fn() }
}));

jest.mock('../utils/pollingTimer', () => jest.fn(() => undefined));

jest.mock('./submitJob', () => ({
  __esModule: true,
  default: ({ selectedJobClone }: any) => (
    <div data-testid="submit-job-mock">
      SubmitJob:{selectedJobClone?.reference?.jobId || 'none'}
    </div>
  )
}));

jest.mock('../cluster/clusterDetails', () => ({
  __esModule: true,
  default: ({ clusterSelected }: any) => (
    <div data-testid="cluster-details-mock">
      ClusterDetails:{clusterSelected}
    </div>
  )
}));

jest.mock('../utils/viewLogs', () => ({
  __esModule: true,
  default: ({ clusterName }: any) => (
    <div data-testid="view-logs-mock">ViewLogs:{clusterName}</div>
  )
}));

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Notification } from '@jupyterlab/apputils';
import JobDetails from './jobDetails';
import { JobService } from './jobServices';
import { STATUS_RUNNING } from '../utils/const';

const createPySparkJob = (state = STATUS_RUNNING, withLabels = true) => ({
  status: { state, stateStartTime: '2026-01-01T10:05:00Z' },
  statusHistory: [{ stateStartTime: '2026-01-01T10:00:00Z' }],
  labels: withLabels ? { env: 'prod', team: 'data' } : {},
  reference: { jobId: 'job-pyspark-1' },
  jobUuid: 'uuid-pyspark-1',
  scheduling: { maxFailuresPerHour: 2 },
  pysparkJob: {
    args: ['--arg1', '--arg2'],
    mainPythonFileUri: 'gs://bucket/main.py',
    pythonFileUris: ['gs://bucket/helper.py'],
    jarFileUris: [],
    fileUris: [],
    archiveUris: [],
    properties: { 'spark.executor.memory': '4g' }
  },
  placement: { clusterName: 'cluster-alpha' }
});

const createSparkSqlJob = () => ({
  status: { state: 'DONE', stateStartTime: '2026-01-01T10:02:00Z' },
  statusHistory: [{ stateStartTime: '2026-01-01T10:00:00Z' }],
  labels: {},
  reference: { jobId: 'job-sql-1' },
  jobUuid: 'uuid-sql-1',
  scheduling: { maxFailuresPerHour: 0 },
  sparkSqlJob: {
    queryList: { queries: 'SELECT 1' },
    args: [],
    scriptVariables: {},
    properties: {},
    jarFileUris: []
  },
  placement: { clusterName: 'cluster-sql' }
});

describe('JobDetails Component', () => {
  let container: HTMLDivElement;
  let root: Root;
  let setDetailedJobView: jest.Mock;
  let setDetailedView: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    setDetailedJobView = jest.fn();
    setDetailedView = jest.fn();

    jest.spyOn(JobService, 'stopJobApi').mockResolvedValue(undefined);
    jest.spyOn(JobService, 'deleteJobApi').mockResolvedValue(undefined);
    jest
      .spyOn(JobService, 'updateJobDetailsService')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  const mockGetJobDetails = (job: any, labels: string[] = ['env:prod']) =>
    jest
      .spyOn(JobService, 'getJobDetailsService')
      .mockImplementation(
        async (
          _id,
          _err,
          setIsLoading,
          setjobInfoResponse,
          setjobInfo,
          setLabelDetail,
          setSelectedJobClone
        ) => {
          setjobInfoResponse(job);
          setjobInfo(job);
          setLabelDetail(labels);
          setSelectedJobClone(job);
          setIsLoading(false);
        }
      );

  const findBtn = (text: string) =>
    Array.from(container.querySelectorAll('[role="button"]')).find(
      el => el.textContent?.trim() === text
    ) as HTMLElement;

  const renderDetails = async (
    fromPage = 'jobs',
    jobSelected = 'job-pyspark-1'
  ) => {
    await act(async () => {
      root.render(
        <JobDetails
          jobSelected={jobSelected}
          setDetailedJobView={setDetailedJobView}
          region={{ region: 'us-central1' }}
          setDetailedView={setDetailedView}
          clusterResponse={[]}
          fromPage={fromPage}
        />
      );
    });
  };

  it('shows loading state while job details are being fetched', async () => {
    jest
      .spyOn(JobService, 'getJobDetailsService')
      .mockImplementation(async () => new Promise(() => undefined));

    await renderDetails();
    expect(container.textContent).toContain('Loading Job Details');
  });

  it('shows error view on 404 and navigates back on back arrow click', async () => {
    jest
      .spyOn(JobService, 'getJobDetailsService')
      .mockImplementation(async (_id, setErrorView, setIsLoading) => {
        setErrorView(true);
        setIsLoading(false);
      });

    await renderDetails();
    expect(container.textContent).toContain(
      'Unable to find the resource you requested'
    );

    const backBtn = container.querySelector('.back-arrow-icon') as HTMLElement;
    await act(async () => {
      backBtn.click();
    });
    expect(setDetailedJobView).toHaveBeenCalledWith(false);
  });

  it('renders PySpark job details, properties, arguments, labels, and ViewLogs', async () => {
    mockGetJobDetails(createPySparkJob(), ['env:prod', 'team:data']);
    await renderDetails();

    expect(container.textContent).toContain('job-pyspark-1');
    expect(container.textContent).toContain('uuid-pyspark-1');
    expect(container.textContent).toContain('us-central1');
    expect(container.textContent).toContain('cluster-alpha');
    expect(container.textContent).toContain('PySpark');
    expect(container.textContent).toContain('gs://bucket/main.py');
    expect(container.textContent).toContain('gs://bucket/helper.py');
    expect(container.textContent).toContain('spark.executor.memory');
    expect(container.textContent).toContain('4g');
    expect(container.textContent).toContain('--arg1');
    expect(container.textContent).toContain('env : prod');
    expect(container.textContent).toContain('Max restarts per hour');
    expect(
      container.querySelector('[data-testid="view-logs-mock"]')?.textContent
    ).toBe('ViewLogs:cluster-alpha');
  });

  it('renders SparkSQL query details and None when labels are empty', async () => {
    mockGetJobDetails(createSparkSqlJob(), []);
    await renderDetails('jobs', 'job-sql-1');
    expect(container.textContent).toContain('Query script');
    expect(container.textContent).toContain('SELECT 1');
    expect(container.textContent).toContain('None');
  });

  it('handles STOP, DELETE popup, back navigation, and cluster navigation', async () => {
    mockGetJobDetails(createPySparkJob(STATUS_RUNNING));
    await renderDetails();

    await act(async () => {
      findBtn('STOP').click();
    });
    expect(JobService.stopJobApi).toHaveBeenCalledTimes(1);

    await act(async () => {
      findBtn('DELETE').click();
    });
    expect(document.body.textContent).toContain(
      'This will delete job-pyspark-1 and cannot be undone.'
    );
    const cancelDialogBtn = Array.from(
      document.body.querySelectorAll('button')
    ).find(b => b.textContent === 'Cancel') as HTMLButtonElement;
    await act(async () => {
      cancelDialogBtn.click();
    });

    await act(async () => {
      findBtn('DELETE').click();
    });
    const deleteDialogBtn = Array.from(
      document.body.querySelectorAll('button')
    ).find(b => b.textContent === 'Delete') as HTMLButtonElement;
    await act(async () => {
      deleteDialogBtn.click();
    });
    expect(JobService.deleteJobApi).toHaveBeenCalledWith('job-pyspark-1');
    expect(setDetailedJobView).toHaveBeenCalledWith(false);

    const clusterLink = container.querySelector(
      '.cluster-details-value-job'
    ) as HTMLElement;
    await act(async () => {
      clusterLink.click();
    });
    expect(
      container.querySelector('[data-testid="cluster-details-mock"]')
        ?.textContent
    ).toBe('ClusterDetails:cluster-alpha');
  });

  it('opens SubmitJob on CLONE and handles label edit, save, and cancel', async () => {
    mockGetJobDetails(createPySparkJob('DONE'));
    await renderDetails();

    // Enter label edit mode and cancel
    await act(async () => {
      findBtn('EDIT').click();
    });
    expect(container.textContent).toContain('SAVE');
    expect(container.textContent).toContain('CANCEL');

    await act(async () => {
      findBtn('CANCEL').click();
    });
    expect(container.textContent).not.toContain('SAVE');

    // Re-enter label edit mode and save
    await act(async () => {
      findBtn('EDIT').click();
    });
    await act(async () => {
      findBtn('SAVE').click();
    });
    expect(JobService.updateJobDetailsService).toHaveBeenCalledWith(
      expect.objectContaining({ labels: { env: 'prod' } }),
      'job-pyspark-1'
    );
    expect(Notification.emit).toHaveBeenCalledWith(
      'Request to update job job-pyspark-1 submitted',
      'success',
      { autoClose: 5000 }
    );

    // Clone job
    await act(async () => {
      findBtn('CLONE').click();
    });
    expect(
      container.querySelector('[data-testid="submit-job-mock"]')?.textContent
    ).toBe('SubmitJob:job-pyspark-1');
  });
});
