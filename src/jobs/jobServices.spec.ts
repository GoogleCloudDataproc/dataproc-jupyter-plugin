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

jest.mock('../utils/loggingService', () => ({
  DataprocLoggingService: { log: jest.fn() },
  LOG_LEVEL: { ERROR: 40 }
}));

jest.mock('../utils/utils', () => ({
  ...jest.requireActual('../utils/utils'),
  authApi: jest.fn(),
  loggedFetch: jest.fn(),
  authenticatedFetch: jest.fn(),
  handleApiError: jest.fn()
}));

import React from 'react';
import { Notification } from '@jupyterlab/apputils';
import { JobService } from './jobServices';
import {
  authApi,
  authenticatedFetch,
  handleApiError,
  loggedFetch
} from '../utils/utils';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';
import { HTTP_METHOD } from '../utils/const';

const creds = {
  project_id: 'test-project',
  region_id: 'us-central1',
  access_token: 'test-token'
};
const baseUrl =
  'https://dataproc.googleapis.com/v1/projects/test-project/regions/us-central1';
const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const mockJson = (data: unknown, extra: object = {}) => ({
  ...extra,
  json: jest.fn().mockResolvedValue(data)
});

describe('JobService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authApi as jest.Mock).mockResolvedValue(creds);
  });

  describe('stopJobApi', () => {
    it('cancels job and notifies on nested error payload', async () => {
      (loggedFetch as jest.Mock).mockResolvedValue(
        mockJson(mockJson({ error: { code: 400, message: 'Cannot stop job' } }))
      );
      await JobService.stopJobApi('job-123');
      await flush();

      expect(loggedFetch).toHaveBeenCalledWith(
        `${baseUrl}/jobs/job-123:cancel`,
        expect.objectContaining({ method: 'POST' })
      );
      expect(Notification.emit).toHaveBeenCalledWith(
        'Cannot stop job',
        'error',
        { autoClose: 5000 }
      );
    });

    it('logs and notifies on rejection, and skips when unauthenticated', async () => {
      (loggedFetch as jest.Mock).mockRejectedValue(new Error('Network fail'));
      await JobService.stopJobApi('job-123');
      await flush();

      expect(DataprocLoggingService.log).toHaveBeenCalledWith(
        'Error to  stop job',
        LOG_LEVEL.ERROR
      );
      expect(Notification.emit).toHaveBeenCalledWith(
        expect.stringContaining('Failed to stop job job-123'),
        'error',
        { autoClose: 5000 }
      );

      jest.clearAllMocks();
      (authApi as jest.Mock).mockResolvedValue(undefined);
      await JobService.stopJobApi('job-123');
      expect(loggedFetch).not.toHaveBeenCalled();
    });
  });

  describe('deleteJobApi', () => {
    it('deletes job and emits success notification', async () => {
      (loggedFetch as jest.Mock).mockResolvedValue(mockJson({}));
      await JobService.deleteJobApi('job-456');
      await flush();

      expect(loggedFetch).toHaveBeenCalledWith(
        `${baseUrl}/jobs/job-456`,
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(Notification.emit).toHaveBeenCalledWith(
        'Job job-456 deleted successfully',
        'success',
        { autoClose: 5000 }
      );
    });

    it('logs and notifies when deleteJobApi rejects', async () => {
      (loggedFetch as jest.Mock).mockRejectedValue(new Error('Delete failed'));
      await JobService.deleteJobApi('job-456');
      await flush();

      expect(DataprocLoggingService.log).toHaveBeenCalledWith(
        'Error Deleting Job',
        LOG_LEVEL.ERROR
      );
      expect(Notification.emit).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete the job job-456'),
        'error',
        { autoClose: 5000 }
      );
    });
  });

  describe('getJobDetailsService', () => {
    it('fetches job details, formats labels, and updates setters', async () => {
      const mockResponse = {
        jobUuid: 'uuid-1',
        labels: { env: 'prod', team: 'data' },
        reference: { jobId: 'job-1' }
      };
      (loggedFetch as jest.Mock).mockResolvedValue(mockJson(mockResponse));

      const setErrorView = jest.fn();
      const setIsLoading = jest.fn();
      const setjobInfoResponse = jest.fn();
      const setjobInfo = jest.fn();
      const setLabelDetail = jest.fn();
      const setSelectedJobClone = jest.fn();

      await JobService.getJobDetailsService(
        'job-1',
        setErrorView,
        setIsLoading,
        setjobInfoResponse,
        setjobInfo,
        setLabelDetail,
        setSelectedJobClone
      );
      await flush();

      expect(setErrorView).not.toHaveBeenCalled();
      expect(setjobInfoResponse).toHaveBeenCalledWith(mockResponse);
      expect(setjobInfo).toHaveBeenCalledWith(mockResponse);
      expect(setLabelDetail).toHaveBeenCalledWith(['env:prod', 'team:data']);
      expect(setSelectedJobClone).toHaveBeenCalledWith(mockResponse);
      expect(setIsLoading).toHaveBeenCalledWith(false);
    });

    it('sets errorView on 404 and handles fetch rejection', async () => {
      (loggedFetch as jest.Mock).mockResolvedValue(
        mockJson({ error: { code: 404, message: 'Job not found' } })
      );
      const setErrorView = jest.fn();
      const setIsLoading = jest.fn();

      await JobService.getJobDetailsService(
        'missing',
        setErrorView,
        setIsLoading,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn()
      );
      await flush();

      expect(setErrorView).toHaveBeenCalledWith(true);
      expect(Notification.emit).toHaveBeenCalledWith('Job not found', 'error', {
        autoClose: 5000
      });

      (loggedFetch as jest.Mock).mockRejectedValue(new Error('Timeout'));
      await JobService.getJobDetailsService(
        'job-1',
        jest.fn(),
        setIsLoading,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn()
      );
      await flush();

      expect(setIsLoading).toHaveBeenCalledWith(false);
      expect(DataprocLoggingService.log).toHaveBeenCalledWith(
        'Error in getting job details',
        LOG_LEVEL.ERROR
      );
    });
  });

  describe('updateJobDetailsService', () => {
    it('sends PATCH request and emits notifications on response or rejection', async () => {
      (loggedFetch as jest.Mock).mockResolvedValue(
        mockJson(mockJson({ error: { code: 400, message: 'Update error' } }))
      );
      const payload = { labels: { env: 'dev' } };
      await JobService.updateJobDetailsService(payload, 'job-789');
      await flush();

      expect(loggedFetch).toHaveBeenCalledWith(
        `${baseUrl}/jobs/job-789?updateMask=labels`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(payload)
        })
      );
      expect(Notification.emit).toHaveBeenCalledWith('Update error', 'error', {
        autoClose: 5000
      });
      expect(Notification.emit).toHaveBeenCalledWith(
        'Job job-789 updated successfully',
        'success',
        { autoClose: 5000 }
      );

      (loggedFetch as jest.Mock).mockRejectedValue(new Error('Patch failed'));
      await JobService.updateJobDetailsService({}, 'job-789');
      await flush();

      expect(DataprocLoggingService.log).toHaveBeenCalledWith(
        'Error in updating job',
        LOG_LEVEL.ERROR
      );
    });
  });

  describe('listJobsAPIService', () => {
    const jobItem = (id: string, labels?: Record<string, string>) => ({
      reference: { jobId: id },
      statusHistory: [{ stateStartTime: '2026-01-01T10:00:00Z' }],
      status: { state: 'DONE', stateStartTime: '2026-01-01T10:05:00Z' },
      pysparkJob: { mainPythonFileUri: 'gs://bucket/main.py' },
      ...(labels ? { labels } : {})
    });

    it('lists and transforms paginated jobs', async () => {
      (loggedFetch as jest.Mock)
        .mockResolvedValueOnce(
          mockJson({
            jobs: [jobItem('job-1', { env: 'prod' })],
            nextPageToken: 'page-2'
          })
        )
        .mockResolvedValueOnce(mockJson({ jobs: [jobItem('job-2')] }));

      const setIsLoading = jest.fn();
      const setjobsList = jest.fn();
      const renderActions = jest.fn(() => React.createElement('div'));

      await JobService.listJobsAPIService(
        'cluster-a',
        setIsLoading,
        setjobsList,
        renderActions,
        new AbortController().signal,
        jest.fn(),
        jest.fn(),
        jest.fn()
      );
      await flush();

      expect(loggedFetch).toHaveBeenCalledTimes(2);
      expect(setjobsList).toHaveBeenCalledWith([
        expect.objectContaining({
          jobid: 'job-1',
          region: 'us-central1',
          type: 'PySpark',
          labels: ['env : prod']
        }),
        expect.objectContaining({ jobid: 'job-2', labels: ['None'] })
      ]);
      expect(setIsLoading).toHaveBeenCalledWith(false);
    });

    it('delegates API error to handleApiError and handles fetch failure', async () => {
      const errPayload = { error: { code: 403, message: 'Forbidden' } };
      (loggedFetch as jest.Mock).mockResolvedValue(mockJson(errPayload));

      const setApiDialogOpen = jest.fn();
      const setPollingDisable = jest.fn();
      const setEnableLink = jest.fn();
      const setIsLoading = jest.fn();
      const renderActions = jest.fn(() => React.createElement('div'));

      await JobService.listJobsAPIService(
        '',
        setIsLoading,
        jest.fn(),
        renderActions,
        new AbortController().signal,
        setApiDialogOpen,
        setPollingDisable,
        setEnableLink
      );
      await flush();

      expect(handleApiError).toHaveBeenCalledWith(
        errPayload,
        creds,
        setApiDialogOpen,
        setEnableLink,
        setPollingDisable,
        'jobs'
      );

      (loggedFetch as jest.Mock).mockRejectedValue(new Error('List error'));
      await JobService.listJobsAPIService(
        '',
        setIsLoading,
        jest.fn(),
        renderActions,
        new AbortController().signal,
        setApiDialogOpen,
        setPollingDisable,
        setEnableLink
      );
      await flush();

      expect(setIsLoading).toHaveBeenCalledWith(false);
      expect(DataprocLoggingService.log).toHaveBeenCalledWith(
        'Error listing jobs',
        LOG_LEVEL.ERROR
      );
    });
  });

  describe('listClustersAPIService', () => {
    it('fetches paginated clusters and transforms them', async () => {
      (authenticatedFetch as jest.Mock)
        .mockResolvedValueOnce(
          mockJson({
            clusters: [
              {
                clusterUuid: 'u1',
                status: { state: 'RUNNING' },
                clusterName: 'c1'
              }
            ],
            nextPageToken: 'next-c'
          })
        )
        .mockResolvedValueOnce(
          mockJson({
            clusters: [
              {
                clusterUuid: 'u2',
                status: { state: 'STOPPED' },
                clusterName: 'c2'
              }
            ]
          })
        );

      const setClusterResponse = jest.fn();
      await JobService.listClustersAPIService(setClusterResponse);
      await flush();

      expect(authenticatedFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          uri: 'clusters',
          regionIdentifier: 'regions',
          method: HTTP_METHOD.GET
        })
      );
      expect(setClusterResponse).toHaveBeenCalledWith([
        { clusterUuid: 'u1', status: 'RUNNING', clusterName: 'c1' },
        { clusterUuid: 'u2', status: 'STOPPED', clusterName: 'c2' }
      ]);
    });

    it('handles non-403 vs 403 error payloads and fetch rejection', async () => {
      (authenticatedFetch as jest.Mock).mockResolvedValueOnce(
        mockJson({ error: { code: 500, message: 'Server error' } })
      );
      await JobService.listClustersAPIService(jest.fn());
      expect(Notification.emit).toHaveBeenCalledWith('Server error', 'error', {
        autoClose: 5000
      });

      jest.clearAllMocks();
      (authenticatedFetch as jest.Mock).mockResolvedValueOnce(
        mockJson({ error: { code: 403, message: 'Forbidden' } })
      );
      await JobService.listClustersAPIService(jest.fn());
      expect(Notification.emit).not.toHaveBeenCalled();

      (authenticatedFetch as jest.Mock).mockRejectedValueOnce(
        new Error('Cluster fetch failed')
      );
      await JobService.listClustersAPIService(jest.fn());
      expect(DataprocLoggingService.log).toHaveBeenCalledWith(
        'Error listing clusters',
        LOG_LEVEL.ERROR
      );
    });
  });

  describe('submitJobService', () => {
    it('emits success on 200 and error notifications on non-200', async () => {
      (loggedFetch as jest.Mock).mockResolvedValue(
        mockJson({ reference: { jobId: 'job-new' } }, { status: 200 })
      );
      await JobService.submitJobService({ job: {} }, 'job-new', creds as any);
      await flush();

      expect(loggedFetch).toHaveBeenCalledWith(
        `${baseUrl}/jobs:submit`,
        expect.objectContaining({ method: 'POST' })
      );
      expect(Notification.emit).toHaveBeenCalledWith(
        'Job job-new successfully submitted',
        'success',
        { autoClose: 5000 }
      );

      (loggedFetch as jest.Mock).mockResolvedValue(
        mockJson({ error: { message: 'Invalid job payload' } }, { status: 400 })
      );
      await JobService.submitJobService({ job: {} }, 'job-bad', creds as any);
      await flush();

      expect(Notification.emit).toHaveBeenCalledWith(
        'Invalid job payload',
        'error',
        { autoClose: 5000 }
      );
      expect(DataprocLoggingService.log).toHaveBeenCalledWith(
        'Error submitting job',
        LOG_LEVEL.ERROR
      );
    });
  });
});
