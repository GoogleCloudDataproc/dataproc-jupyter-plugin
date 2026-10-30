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
  Notification: {
    emit: jest.fn()
  }
}));

jest.mock('../utils/loggingService', () => ({
  DataprocLoggingService: {
    log: jest.fn()
  },
  LOG_LEVEL: {
    INFO: 0,
    WARN: 1,
    ERROR: 2
  }
}));

jest.mock('../utils/utils', () => ({
  ...jest.requireActual('../utils/utils'),
  authApi: jest.fn(),
  loggedFetch: jest.fn(),
  getProjectId: jest.fn(),
  authenticatedFetch: jest.fn(),
  statusValue: jest.fn(),
  handleApiError: jest.fn()
}));

import React from 'react';
import { ClusterService } from './clusterServices';
import { ClusterStatus, HTTP_METHOD, POLLING_TIME_LIMIT } from '../utils/const';
import {
  authApi,
  loggedFetch,
  getProjectId,
  authenticatedFetch,
  statusValue,
  handleApiError
} from '../utils/utils';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';
import { Notification } from '@jupyterlab/apputils';

const flushPromises = async () => {
  for (let i = 0; i < 6; i++) {
    await new Promise<void>(resolve => queueMicrotask(resolve));
  }
};

describe('ClusterService', () => {
  const mockCredentials = {
    project_id: 'test-project',
    region_id: 'us-central1',
    access_token: 'mock-access-token',
    login_error: 0,
    config_error: 0
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getProjectId as jest.Mock).mockResolvedValue('test-project');
    (authApi as jest.Mock).mockResolvedValue(mockCredentials);
    (statusValue as jest.Mock).mockImplementation(
      (data: any) => data.status?.state || 'RUNNING'
    );
  });

  describe('listClustersAPIService', () => {
    const mockSetProjectId = jest.fn();
    const mockRenderActions = jest
      .fn()
      .mockReturnValue(React.createElement('div', null, 'actions'));
    const mockSetClustersList = jest.fn();
    const mockSetIsLoading = jest.fn();
    const mockSetLoggedIn = jest.fn();
    const mockSetApiDialogOpen = jest.fn();
    const mockSetPollingDisable = jest.fn();
    const mockSetEnableLink = jest.fn();

    it('fetches and transforms a single page of clusters with workerConfig and lifecycleConfig variants', async () => {
      const apiPayload = {
        clusters: [
          {
            clusterUuid: 'uuid-1',
            clusterName: 'cluster-1',
            status: { state: 'RUNNING' },
            config: {
              gceClusterConfig: {
                zoneUri: 'projects/test-project/zones/us-central1-a'
              },
              softwareConfig: {
                imageVersion: '2.1-debian11'
              },
              workerConfig: {
                numInstances: 4
              },
              lifecycleConfig: {
                idleDeleteTtl: '3600s'
              }
            },
            labels: {
              'goog-dataproc-location': 'us-central1'
            }
          },
          {
            clusterUuid: 'uuid-2',
            clusterName: 'cluster-single-node',
            status: { state: 'STOPPED' },
            config: {
              gceClusterConfig: {
                zoneUri: 'projects/test-project/zones/us-central1-b'
              },
              softwareConfig: {
                imageVersion: '2.2-debian12'
              }
            },
            labels: {
              'goog-dataproc-location': 'us-central1'
            }
          }
        ]
      };

      (authenticatedFetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(apiPayload)
      });

      await ClusterService.listClustersAPIService(
        mockSetProjectId,
        mockRenderActions,
        mockSetClustersList,
        mockSetIsLoading,
        mockSetLoggedIn,
        mockSetApiDialogOpen,
        mockSetPollingDisable,
        mockSetEnableLink
      );

      expect(getProjectId).toHaveBeenCalledTimes(1);
      expect(mockSetProjectId).toHaveBeenCalledWith('test-project');
      expect(authenticatedFetch).toHaveBeenCalledWith({
        uri: 'clusters',
        regionIdentifier: 'regions',
        method: HTTP_METHOD.GET,
        queryParams: new URLSearchParams({ pageSize: '50', pageToken: '' })
      });
      expect(mockRenderActions).toHaveBeenCalledTimes(2);
      expect(mockSetClustersList).toHaveBeenCalledWith([
        expect.objectContaining({
          clusterUuid: 'uuid-1',
          clusterName: 'cluster-1',
          status: 'RUNNING',
          clusterImage: '2.1-debian11',
          region: 'us-central1',
          zone: 'us-central1-a',
          totalWorkersNode: 4,
          schedulesDeletion: 'On'
        }),
        expect.objectContaining({
          clusterUuid: 'uuid-2',
          clusterName: 'cluster-single-node',
          status: 'STOPPED',
          clusterImage: '2.2-debian12',
          region: 'us-central1',
          zone: 'us-central1-b',
          totalWorkersNode: 0,
          schedulesDeletion: 'Off'
        })
      ]);
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
      expect(mockSetLoggedIn).toHaveBeenCalledWith(true);
    });

    it('recursively fetches subsequent pages when nextPageToken is present', async () => {
      const page1 = {
        clusters: [
          {
            clusterUuid: 'uuid-p1',
            clusterName: 'cluster-p1',
            status: { state: 'RUNNING' },
            config: {
              gceClusterConfig: { zoneUri: 'zones/us-central1-a' },
              softwareConfig: { imageVersion: '2.1' }
            },
            labels: { 'goog-dataproc-location': 'us-central1' }
          }
        ],
        nextPageToken: 'page-token-2'
      };
      const page2 = {
        clusters: [
          {
            clusterUuid: 'uuid-p2',
            clusterName: 'cluster-p2',
            status: { state: 'STOPPED' },
            config: {
              gceClusterConfig: { zoneUri: 'zones/us-central1-b' },
              softwareConfig: { imageVersion: '2.1' }
            },
            labels: { 'goog-dataproc-location': 'us-central1' }
          }
        ]
      };

      (authenticatedFetch as jest.Mock)
        .mockResolvedValueOnce({ json: jest.fn().mockResolvedValue(page1) })
        .mockResolvedValueOnce({ json: jest.fn().mockResolvedValue(page2) });

      await ClusterService.listClustersAPIService(
        mockSetProjectId,
        mockRenderActions,
        mockSetClustersList,
        mockSetIsLoading,
        mockSetLoggedIn,
        mockSetApiDialogOpen,
        mockSetPollingDisable,
        mockSetEnableLink
      );
      await flushPromises();

      expect(authenticatedFetch).toHaveBeenCalledTimes(2);
      expect(authenticatedFetch).toHaveBeenNthCalledWith(2, {
        uri: 'clusters',
        regionIdentifier: 'regions',
        method: HTTP_METHOD.GET,
        queryParams: new URLSearchParams({
          pageSize: '50',
          pageToken: 'page-token-2'
        })
      });
      expect(mockSetClustersList).toHaveBeenCalledTimes(1);
      expect(mockSetClustersList).toHaveBeenCalledWith([
        expect.objectContaining({ clusterName: 'cluster-p1' }),
        expect.objectContaining({ clusterName: 'cluster-p2' })
      ]);
    });

    it('invokes handleApiError when response contains an error code and credentials are valid', async () => {
      const errorResponse = {
        error: {
          code: 403,
          message: 'Cloud Dataproc API has not been used in project'
        }
      };

      (authenticatedFetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(errorResponse)
      });

      await ClusterService.listClustersAPIService(
        mockSetProjectId,
        mockRenderActions,
        mockSetClustersList,
        mockSetIsLoading,
        mockSetLoggedIn,
        mockSetApiDialogOpen,
        mockSetPollingDisable,
        mockSetEnableLink
      );

      expect(handleApiError).toHaveBeenCalledWith(
        errorResponse,
        mockCredentials,
        mockSetApiDialogOpen,
        mockSetEnableLink,
        mockSetPollingDisable,
        'clusters'
      );
    });

    it('handles exceptions by logging error and emitting notification when logged in', async () => {
      (authenticatedFetch as jest.Mock).mockRejectedValue(
        new Error('Network failure')
      );

      await ClusterService.listClustersAPIService(
        mockSetProjectId,
        mockRenderActions,
        mockSetClustersList,
        mockSetIsLoading,
        mockSetLoggedIn,
        mockSetApiDialogOpen,
        mockSetPollingDisable,
        mockSetEnableLink
      );

      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
      expect(DataprocLoggingService.log).toHaveBeenCalledWith(
        'Error listing clusters',
        LOG_LEVEL.ERROR
      );
      expect(Notification.emit).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch clusters list'),
        'error',
        { autoClose: 5000 }
      );
    });
  });

  describe('getClusterDetailsService', () => {
    const mockSetProjectName = jest.fn();
    const mockSetErrorView = jest.fn();
    const mockSetIsLoading = jest.fn();
    const mockSetClusterInfo = jest.fn();

    it('fetches cluster details and updates state on 200 response', async () => {
      const detailsPayload = {
        clusterName: 'cluster-1',
        clusterUuid: 'uuid-123',
        status: { state: 'RUNNING' }
      };

      (loggedFetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(detailsPayload)
      });

      await ClusterService.getClusterDetailsService(
        mockSetProjectName,
        'cluster-1',
        mockSetErrorView,
        mockSetIsLoading,
        mockSetClusterInfo
      );
      await flushPromises();

      expect(mockSetProjectName).toHaveBeenCalledWith('test-project');
      expect(loggedFetch).toHaveBeenCalledWith(
        'https://dataproc.googleapis.com/v1/projects/test-project/regions/us-central1/clusters/cluster-1',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-access-token'
          }
        })
      );
      expect(mockSetErrorView).not.toHaveBeenCalled();
      expect(mockSetClusterInfo).toHaveBeenCalledWith(detailsPayload);
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
    });

    it('sets errorView to true and emits notification on 404 error payload', async () => {
      const notFoundPayload = {
        error: {
          code: 404,
          message: 'Resource not found'
        }
      };

      (loggedFetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(notFoundPayload)
      });

      await ClusterService.getClusterDetailsService(
        mockSetProjectName,
        'missing-cluster',
        mockSetErrorView,
        mockSetIsLoading,
        mockSetClusterInfo
      );
      await flushPromises();

      expect(mockSetErrorView).toHaveBeenCalledWith(true);
      expect(Notification.emit).toHaveBeenCalledWith(
        'Failed to fetch cluster details : Resource not found',
        'error',
        { autoClose: 5000 }
      );
      expect(mockSetClusterInfo).toHaveBeenCalledWith(notFoundPayload);
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
    });

    it('handles response.json() rejection gracefully and sets loading to false', async () => {
      const consoleLogSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);

      (loggedFetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      });

      await ClusterService.getClusterDetailsService(
        mockSetProjectName,
        'cluster-1',
        mockSetErrorView,
        mockSetIsLoading,
        mockSetClusterInfo
      );
      await flushPromises();

      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
      consoleLogSpy.mockRestore();
    });

    it('logs and notifies when loggedFetch rejects', async () => {
      (loggedFetch as jest.Mock).mockRejectedValue(new Error('Connection lost'));

      await ClusterService.getClusterDetailsService(
        mockSetProjectName,
        'cluster-1',
        mockSetErrorView,
        mockSetIsLoading,
        mockSetClusterInfo
      );
      await flushPromises();

      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
      expect(DataprocLoggingService.log).toHaveBeenCalledWith(
        'Error listing clusters Details',
        LOG_LEVEL.ERROR
      );
      expect(Notification.emit).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch cluster details'),
        'error',
        { autoClose: 5000 }
      );
    });
  });

  describe('statusApiService', () => {
    it('starts cluster and clears interval when cluster state reaches STATUS_STOPPED', async () => {
      const startSpy = jest
        .spyOn(ClusterService, 'startClusterApi')
        .mockResolvedValue(undefined);
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const mockListClustersAPI = jest.fn();
      const timerRef = { current: 999 as unknown as NodeJS.Timeout };

      (authenticatedFetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          status: { state: ClusterStatus.STATUS_STOPPED }
        })
      });

      await ClusterService.statusApiService(
        'cluster-1',
        mockListClustersAPI,
        timerRef
      );

      expect(authenticatedFetch).toHaveBeenCalledWith({
        uri: 'clusters/cluster-1',
        method: HTTP_METHOD.GET,
        regionIdentifier: 'regions'
      });
      expect(startSpy).toHaveBeenCalledWith('cluster-1');
      expect(clearIntervalSpy).toHaveBeenCalledWith(timerRef.current);
      expect(mockListClustersAPI).toHaveBeenCalledTimes(1);

      startSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });

    it('emits notification when status response contains an error code', async () => {
      const mockListClustersAPI = jest.fn();
      const timerRef = { current: undefined };

      (authenticatedFetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          status: { state: ClusterStatus.STATUS_RUNNING },
          error: { code: 500, message: 'Internal status error' }
        })
      });

      await ClusterService.statusApiService(
        'cluster-1',
        mockListClustersAPI,
        timerRef
      );

      expect(Notification.emit).toHaveBeenCalledWith(
        'Failed to fetch status for cluster cluster-1 : Internal status error',
        'error',
        { autoClose: 5000 }
      );
      expect(mockListClustersAPI).toHaveBeenCalledTimes(1);
    });

    it('logs and emits notification when statusApiService throws', async () => {
      (authenticatedFetch as jest.Mock).mockRejectedValue(
        new Error('Status network error')
      );

      await ClusterService.statusApiService('cluster-1', jest.fn(), {
        current: undefined
      });

      expect(DataprocLoggingService.log).toHaveBeenCalledWith(
        'Error fetching status',
        LOG_LEVEL.ERROR
      );
      expect(Notification.emit).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch status for cluster cluster-1'),
        'error',
        { autoClose: 5000 }
      );
    });
  });

  describe('restartClusterApiService', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('stops the cluster, sets up status polling interval, and toggles restartEnabled', async () => {
      const consoleLogSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);
      const mockSetRestartEnabled = jest.fn();
      const mockListClustersAPI = jest.fn();
      const mockStatusApi = jest.fn();
      const timerRef: { current: any } = { current: undefined };

      (authenticatedFetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue({ name: 'operations/stop-op-1' })
      });

      await ClusterService.restartClusterApiService(
        'cluster-1',
        mockSetRestartEnabled,
        mockListClustersAPI,
        timerRef,
        mockStatusApi
      );

      expect(mockSetRestartEnabled).toHaveBeenNthCalledWith(1, true);
      expect(authenticatedFetch).toHaveBeenCalledWith({
        uri: 'clusters/cluster-1:stop',
        method: HTTP_METHOD.POST,
        regionIdentifier: 'regions'
      });
      expect(mockListClustersAPI).toHaveBeenCalledTimes(2);
      expect(mockSetRestartEnabled).toHaveBeenNthCalledWith(2, false);

      jest.advanceTimersByTime(POLLING_TIME_LIMIT);
      expect(mockStatusApi).toHaveBeenCalledWith('cluster-1');

      clearInterval(timerRef.current);
      consoleLogSpy.mockRestore();
    });

    it('emits error notification when restart stop call returns an error code or throws', async () => {
      const consoleLogSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);
      const timerRef: { current: any } = { current: undefined };

      (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          error: { code: 400, message: 'Cannot stop cluster' }
        })
      });

      await ClusterService.restartClusterApiService(
        'cluster-1',
        jest.fn(),
        jest.fn(),
        timerRef,
        jest.fn()
      );
      clearInterval(timerRef.current);

      expect(Notification.emit).toHaveBeenCalledWith(
        'Failed to restart cluster cluster-1 : Cannot stop cluster',
        'error',
        { autoClose: 5000 }
      );

      (authenticatedFetch as jest.Mock).mockRejectedValueOnce(
        new Error('Stop failed')
      );

      await ClusterService.restartClusterApiService(
        'cluster-1',
        jest.fn(),
        jest.fn(),
        timerRef,
        jest.fn()
      );

      expect(DataprocLoggingService.log).toHaveBeenCalledWith(
        'Error restarting cluster',
        LOG_LEVEL.ERROR
      );
      consoleLogSpy.mockRestore();
    });
  });

  describe('deleteClusterApi', () => {
    it('sends DELETE request and emits success notification when deletion succeeds', async () => {
      const consoleLogSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);

      (loggedFetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue({ name: 'operations/delete-op' })
      });

      await ClusterService.deleteClusterApi('cluster-to-delete');
      await flushPromises();

      expect(loggedFetch).toHaveBeenCalledWith(
        'https://dataproc.googleapis.com/v1/projects/test-project/regions/us-central1/clusters/cluster-to-delete',
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(Notification.emit).toHaveBeenCalledWith(
        'Cluster cluster-to-delete deleted successfully',
        'success',
        { autoClose: 5000 }
      );
      consoleLogSpy.mockRestore();
    });

    it('emits error notification when delete response contains an error or loggedFetch rejects', async () => {
      const consoleLogSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);

      (loggedFetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          error: { code: 403, message: 'Delete permission denied' }
        })
      });

      await ClusterService.deleteClusterApi('cluster-1');
      await flushPromises();

      expect(Notification.emit).toHaveBeenCalledWith(
        'Error deleting cluster : Delete permission denied',
        'error',
        { autoClose: 5000 }
      );

      (loggedFetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      await ClusterService.deleteClusterApi('cluster-1');
      await flushPromises();

      expect(DataprocLoggingService.log).toHaveBeenCalledWith(
        'Error deleting cluster',
        LOG_LEVEL.ERROR
      );
      expect(Notification.emit).toHaveBeenCalledWith(
        expect.stringContaining('Error deleting cluster :'),
        'error',
        { autoClose: 5000 }
      );
      consoleLogSpy.mockRestore();
    });
  });

  describe('startStopAPI, startClusterApi, and stopClusterApi', () => {
    it('calls startStopAPI with start and stop operations and handles API/network errors', async () => {
      const consoleLogSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);

      (loggedFetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          error: { code: 400, message: 'Start failed message' }
        })
      });

      await ClusterService.startClusterApi('cluster-1');
      await flushPromises();

      expect(loggedFetch).toHaveBeenCalledWith(
        'https://dataproc.googleapis.com/v1/projects/test-project/regions/us-central1/clusters/cluster-1:start',
        expect.objectContaining({ method: 'POST' })
      );
      expect(Notification.emit).toHaveBeenCalledWith(
        'Start failed message',
        'error',
        { autoClose: 5000 }
      );

      (loggedFetch as jest.Mock).mockRejectedValueOnce(
        new Error('Stop network error')
      );

      await ClusterService.stopClusterApi('cluster-1');
      await flushPromises();

      expect(loggedFetch).toHaveBeenCalledWith(
        'https://dataproc.googleapis.com/v1/projects/test-project/regions/us-central1/clusters/cluster-1:stop',
        expect.objectContaining({ method: 'POST' })
      );
      expect(DataprocLoggingService.log).toHaveBeenCalledWith(
        'Error stop cluster',
        LOG_LEVEL.ERROR
      );
      expect(Notification.emit).toHaveBeenCalledWith(
        expect.stringContaining('Error stop cluster :'),
        'error',
        { autoClose: 5000 }
      );
      consoleLogSpy.mockRestore();
    });
  });
});
