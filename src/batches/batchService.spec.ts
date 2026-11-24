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

import { Notification } from '@jupyterlab/apputils';
import { BatchService } from './batchService';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';
import {
  authApi,
  authenticatedFetch,
  handleApiError,
  jobTimeFormat,
  loggedFetch
} from '../utils/utils';

jest.mock('../handler/handler', () => ({
  requestAPI: jest.fn().mockResolvedValue({
    dataproc_url: 'https://dataproc.googleapis.com/',
    compute_url: 'https://compute.googleapis.com/compute/v1',
    metastore_url: 'https://metastore.googleapis.com/',
    cloudkms_url: 'https://cloudkms.googleapis.com/',
    cloudresourcemanager_url: 'https://cloudresourcemanager.googleapis.com/',
    datacatalog_url: 'https://datacatalog.googleapis.com/',
    storage_url: 'https://storage.googleapis.com/'
  })
}));
jest.mock('../utils/utils', () => ({
  ...jest.requireActual('../utils/utils'),
  authApi: jest.fn(),
  authenticatedFetch: jest.fn(),
  handleApiError: jest.fn(),
  loggedFetch: jest.fn()
}));
jest.mock('../utils/loggingService', () => ({
  ...jest.requireActual('../utils/loggingService'),
  DataprocLoggingService: { log: jest.fn() }
}));
jest.mock('@jupyterlab/apputils', () => ({
  ...jest.requireActual('@jupyterlab/apputils'),
  Notification: { emit: jest.fn() }
}));

const mockAuthApi = authApi as jest.Mock;
const mockLoggedFetch = loggedFetch as jest.Mock;
const mockAuthenticatedFetch = authenticatedFetch as jest.Mock;
const mockHandleApiError = jest.mocked(handleApiError);
const mockLog = jest.mocked(DataprocLoggingService.log);

const CREDENTIALS = {
  access_token: 'token-123',
  project_id: 'test-project',
  region_id: 'us-central1'
};
const HEADERS = {
  'Content-Type': 'application/json',
  Authorization: 'Bearer token-123'
};
const BATCHES_URL =
  'https://dataproc.googleapis.com/v1/projects/test-project/locations/us-central1/batches';
const INVALID_JSON = new SyntaxError('Unexpected token < in JSON');
const CREATED = '2026-01-01T10:00:00Z';
const PAYLOAD = { pysparkBatch: { mainPythonFileUri: 'gs://bucket/job.py' } };

const setRegionName = jest.fn();
const setProjectName = jest.fn();
const setIsLoading = jest.fn();
const setBatchInfoResponse = jest.fn();
const setLabelDetail = jest.fn();
const setErrorView = jest.fn();
const renderActions = jest.fn();
const setBatchesList = jest.fn();
const setLoggedIn = jest.fn();
const setApiDialogOpen = jest.fn();
const setPollingDisable = jest.fn();
const setEnableLink = jest.fn();
const setNextPageTokens = jest.fn();
const setCreateBatchView = jest.fn();
const setCreateBatch = jest.fn();
const setError = jest.fn();
const setClustersList = jest.fn();

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));
const mockResponse = (body: unknown, ok = true) => ({
  ok,
  json: jest.fn().mockResolvedValue(body)
});
const respondWith = (body: unknown, ok = true) =>
  mockLoggedFetch.mockResolvedValue(mockResponse(body, ok));
const expectToast = (message: unknown, type = 'error') =>
  expect(Notification.emit).toHaveBeenCalledWith(message, type, {
    autoClose: 5000
  });
const expectErrorLog = (message: string) =>
  expect(mockLog).toHaveBeenCalledWith(message, LOG_LEVEL.ERROR);

// The service methods fire their requests without awaiting them.
const deleteBatch = () =>
  BatchService.deleteBatchAPIService('batch-1').then(flushPromises);
const getDetails = () =>
  BatchService.getBatchDetailsService(
    setRegionName,
    setProjectName,
    'batch-1',
    setBatchInfoResponse,
    setLabelDetail,
    setIsLoading,
    setErrorView
  ).then(flushPromises);
const listBatches = (tokens: string[] = [], ...rest: [object?, boolean?]) =>
  BatchService.listBatchAPIService(
    setRegionName,
    setProjectName,
    renderActions,
    setBatchesList,
    setIsLoading,
    setLoggedIn,
    setApiDialogOpen,
    setPollingDisable,
    setEnableLink,
    tokens,
    setNextPageTokens,
    ...rest
  ).then(flushPromises);
const submitBatch = (withViewSetters = true) =>
  BatchService.creatBatchSubmitService(
    CREDENTIALS,
    PAYLOAD,
    'batch-new',
    withViewSetters ? setCreateBatchView : undefined,
    withViewSetters ? setCreateBatch : undefined,
    setError,
    null,
    setApiDialogOpen,
    setEnableLink
  ).then(flushPromises);

// A batch as returned by the Dataproc API and the table row it maps to.
const batchName = (id: string) =>
  `projects/test-project/locations/us-central1/batches/${id}`;
const rawBatch = (id: string, type = 'pysparkBatch', extra = {}) => ({
  name: batchName(id),
  state: 'SUCCEEDED',
  createTime: CREATED,
  stateTime: '2026-01-01T11:02:03Z',
  [type]: {},
  ...extra
});
const tableRow = (id: string, type: string, extra = {}) => ({
  batchID: id,
  status: 'SUCCEEDED',
  location: 'us-central1',
  tier: 'Standard',
  engine: 'Default',
  creationTime: jobTimeFormat(CREATED),
  type,
  elapsedTime: '1 hr 2 min 3 sec ',
  actions: { actionsFor: batchName(id) },
  ...extra
});
const lightning = (tier?: string, engine?: string) => ({
  runtimeConfig: {
    properties: {
      'dataproc:dataproc.tier': tier,
      'spark:spark.dataproc.engine': engine
    }
  }
});

describe('BatchService batch APIs', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockAuthApi.mockResolvedValue(CREDENTIALS);
    renderActions.mockImplementation(batch => ({ actionsFor: batch.name }));
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('deleteBatchAPIService', () => {
    it('sends an authorised DELETE request and notifies success', async () => {
      respondWith({});
      await deleteBatch();
      expect(mockLoggedFetch).toHaveBeenCalledWith(`${BATCHES_URL}/batch-1`, {
        method: 'DELETE',
        headers: HEADERS
      });
      expectToast('Batch batch-1 deleted successfully', 'success');
    });
  });

  describe('getBatchDetailsService', () => {
    it('stores the batch details and formats its labels', async () => {
      const batch = { state: 'RUNNING', labels: { env: 'dev', team: 'data' } };
      respondWith(batch);
      await getDetails();
      expect(setRegionName).toHaveBeenCalledWith('us-central1');
      expect(setProjectName).toHaveBeenCalledWith('test-project');
      expect(mockLoggedFetch).toHaveBeenCalledWith(`${BATCHES_URL}/batch-1`, {
        method: 'GET',
        headers: HEADERS
      });
      expect(setBatchInfoResponse).toHaveBeenCalledWith(batch);
      expect(setLabelDetail).toHaveBeenCalledWith(['env:dev', 'team:data']);
      expect(setIsLoading).toHaveBeenCalledWith(false);
      expect(setErrorView).not.toHaveBeenCalled();
    });

    it.each([
      [404, [[true]]],
      [500, []]
    ])('notifies API error %i (error view calls: %j)', async (code, calls) => {
      const body = { error: { code, message: 'Batch lookup failed' } };
      respondWith(body);
      await getDetails();
      expect(setErrorView.mock.calls).toEqual(calls);
      expect(setBatchInfoResponse).toHaveBeenCalledWith(body);
      expect(setLabelDetail).not.toHaveBeenCalled();
      expect(setIsLoading).toHaveBeenCalledWith(false);
      expectToast('Batch lookup failed');
    });
  });

  describe('listBatchAPIService', () => {
    const premium = lightning('premium', 'lightningEngine');

    it('requests the first page and maps batches to table rows', async () => {
      const batches = [rawBatch('b1'), rawBatch('b2', 'sparkBatch')];
      respondWith({ batches });
      await listBatches();
      expect(mockLoggedFetch).toHaveBeenCalledWith(
        `${BATCHES_URL}?orderBy=create_time desc&&pageSize=50&pageToken=`,
        { headers: HEADERS }
      );
      expect(renderActions).toHaveBeenCalledWith(batches[1]);
      expect(setBatchesList).toHaveBeenCalledWith([
        tableRow('b1', 'PySpark'),
        tableRow('b2', 'Spark')
      ]);
      expect(setNextPageTokens).toHaveBeenCalledWith([]);
      expect(setIsLoading).toHaveBeenCalledWith(false);
      expect(setLoggedIn).toHaveBeenCalledWith(true);
      expect(handleApiError).not.toHaveBeenCalled();
    });

    it('requests the page of the last token and appends the next token', async () => {
      respondWith({ batches: [rawBatch('b3')], nextPageToken: 't3' });
      await listBatches(['t1', 't2'], [{ batchID: 'b0' }]);
      expect(mockLoggedFetch.mock.calls[0][0]).toMatch(/&pageToken=t2$/);
      expect(setBatchesList).toHaveBeenCalledWith([
        { batchID: 'b0' },
        tableRow('b3', 'PySpark')
      ]);
      expect(setNextPageTokens).toHaveBeenCalledWith(['t1', 't2', 't3']);
      expect(setIsLoading).toHaveBeenCalledWith(false);
      expect(setLoggedIn).toHaveBeenCalledWith(true);
    });

    it('leaves the list and pagination untouched when shouldUpdatePagination is false', async () => {
      respondWith({ batches: [rawBatch('b1')], nextPageToken: 't2' });
      await listBatches(['t1'], undefined, false);
      expect(renderActions).toHaveBeenCalledTimes(1);
      expect(setBatchesList).not.toHaveBeenCalled();
      expect(setNextPageTokens).not.toHaveBeenCalled();
      expect(setIsLoading).not.toHaveBeenCalled();
      expect(setLoggedIn).not.toHaveBeenCalled();
    });

    it.each([
      ['an empty', {}],
      ['a null', null]
    ])('publishes an empty list for %s payload', async (_, body) => {
      respondWith(body);
      await listBatches(['t1']); // a last page clears the stored tokens
      expect(setBatchesList).toHaveBeenCalledWith([]);
      expect(setNextPageTokens).toHaveBeenCalledWith([]);
      expect(setLoggedIn).toHaveBeenCalledWith(true);
    });

    it.each([
      ['no runtime config', {}, 'Standard', 'Default'],
      ['no properties', { runtimeConfig: {} }, 'Standard', 'Default'],
      ['unset properties', lightning(), 'Standard', 'Default'],
      ['premium lightning', premium, 'Premium', 'Lightning Engine'],
      ['unknown values', lightning('gold', 'turbo'), undefined, undefined]
    ])('maps tier and engine for %s', async (_, extra, tier, engine) => {
      respondWith({ batches: [rawBatch('b1', 'sparkSqlBatch', extra)] });
      await listBatches();
      expect(setBatchesList).toHaveBeenCalledWith([
        tableRow('b1', 'Spark SQL', { tier, engine })
      ]);
    });

    it('passes API errors to handleApiError', async () => {
      const body = { error: { code: 403, message: 'Dataproc API disabled' } };
      respondWith(body);
      await listBatches();
      expect(handleApiError).toHaveBeenCalledWith(
        body,
        CREDENTIALS,
        setApiDialogOpen,
        setEnableLink,
        setPollingDisable,
        'batches'
      );
      expect(setBatchesList).toHaveBeenCalledWith([]);
    });

    it.each(['login_error', 'config_error'])(
      'does not call handleApiError when the credentials report a %s',
      async flag => {
        mockAuthApi.mockResolvedValue({ ...CREDENTIALS, [flag]: 1 });
        respondWith({ error: { code: 401, message: 'Unauthenticated' } });
        await listBatches();
        expect(handleApiError).not.toHaveBeenCalled();
      }
    );
  });

  describe('creatBatchSubmitService', () => {
    it('POSTs the payload, closes the create view and notifies success', async () => {
      respondWith({ name: 'operation-1' });
      await submitBatch();
      expect(mockLoggedFetch).toHaveBeenCalledWith(
        `${BATCHES_URL}?batchId=batch-new`,
        { method: 'POST', body: JSON.stringify(PAYLOAD), headers: HEADERS }
      );
      expect(setCreateBatchView).toHaveBeenCalledWith(false);
      expect(setCreateBatch).toHaveBeenCalledWith(false);
      expectToast('Batch batch-new successfully submitted', 'success');
    });

    it('notifies success when the optional view setters are undefined', async () => {
      respondWith({ name: 'operation-1' });
      await submitBatch(false);
      expectToast('Batch batch-new successfully submitted', 'success');
      expect(setError).not.toHaveBeenCalled();
    });

    it('opens the error dialog for non-403 API errors', async () => {
      const body = { error: { code: 400, message: 'Invalid' } };
      respondWith(body, false);
      await submitBatch();
      expect(setError).toHaveBeenCalledWith({
        isOpen: true,
        message: 'Invalid'
      });
      expect(handleApiError).not.toHaveBeenCalled();
      expect(setCreateBatchView).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        'Failed to submit batch, API response:',
        body
      );
    });

    it('delegates 403 errors to handleApiError with a no-op polling setter', async () => {
      const body = { error: { code: 403, message: 'Dataproc API disabled' } };
      respondWith(body, false);
      await submitBatch();
      expect(handleApiError).toHaveBeenCalledWith(
        body,
        CREDENTIALS,
        setApiDialogOpen,
        setEnableLink,
        expect.any(Function),
        'batches'
      );
      expect(mockHandleApiError.mock.calls[0][4](true)).toBeUndefined();
      expect(setError).not.toHaveBeenCalled();
    });

    it.each([
      ['a null', null],
      ['an empty', {}]
    ])('reports %s error payload as a failed submission', async (_, body) => {
      respondWith(body, false);
      await submitBatch();
      expect(setError).not.toHaveBeenCalled();
      expectErrorLog('Error submitting Batch');
      expectToast(
        expect.stringContaining('Failed to submit the Batch : TypeError')
      );
    });
  });

  describe('listClustersAPIService', () => {
    it('lists only the RUNNING clusters', async () => {
      const clusters = [
        { clusterName: 'cluster-a', status: { state: 'RUNNING' } },
        { clusterName: 'cluster-b', status: { state: 'STOPPED' } }
      ];
      mockAuthenticatedFetch.mockResolvedValue(mockResponse({ clusters }));
      await BatchService.listClustersAPIService(setClustersList);
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith({
        uri: 'clusters',
        method: 'GET',
        regionIdentifier: 'regions',
        queryParams: new URLSearchParams({ pageSize: '100' })
      });
      expect(setClustersList).toHaveBeenCalledWith(['cluster-a']);
    });

    it('sets an empty list when no clusters are returned', async () => {
      mockAuthenticatedFetch.mockResolvedValue(mockResponse({}));
      await BatchService.listClustersAPIService(setClustersList);
      expect(setClustersList).toHaveBeenCalledWith([]);
    });

    it('logs and notifies when listing the clusters fails', async () => {
      mockAuthenticatedFetch.mockRejectedValue(new Error('auth failed'));
      await BatchService.listClustersAPIService(setClustersList);
      expect(setClustersList).not.toHaveBeenCalled();
      expectErrorLog('Error listing clusters');
      expectToast('Failed to list the clusters : Error: auth failed');
    });
  });

  describe('shared request handling', () => {
    it.each([
      ['deleteBatchAPIService', deleteBatch],
      ['getBatchDetailsService', getDetails],
      ['listBatchAPIService', listBatches]
    ])('%s makes no request without credentials', async (_, call) => {
      mockAuthApi.mockResolvedValue(undefined);
      await call();
      expect(mockLoggedFetch).not.toHaveBeenCalled();
      expect(setRegionName).not.toHaveBeenCalled();
    });

    it.each([
      ['getBatchDetailsService', getDetails],
      ['listBatchAPIService', listBatches]
    ])('%s falls back to empty region and project names', async (_, call) => {
      mockAuthApi.mockResolvedValue({ access_token: 'token-123' });
      respondWith({});
      await call();
      expect(setRegionName).toHaveBeenCalledWith('');
      expect(setProjectName).toHaveBeenCalledWith('');
    });

    it.each([
      ['deleteBatchAPIService', deleteBatch, []],
      ['getBatchDetailsService', getDetails, [[false]]],
      ['listBatchAPIService', listBatches, [[false]]]
    ])('%s logs an unreadable response body', async (_, call, loading) => {
      mockLoggedFetch.mockResolvedValue({
        json: jest.fn().mockRejectedValue(INVALID_JSON)
      });
      await call();
      expect(console.log).toHaveBeenCalledWith(INVALID_JSON);
      expect(setIsLoading.mock.calls).toEqual(loading);
      expect(setBatchInfoResponse).not.toHaveBeenCalled();
      expect(setBatchesList).not.toHaveBeenCalled();
      expect(Notification.emit).not.toHaveBeenCalled();
    });

    it.each`
      method                       | call           | log                                 | loading      | toast
      ${'deleteBatchAPIService'}   | ${deleteBatch} | ${'Error deleting batches'}         | ${[]}        | ${'Failed to delete the batch batch-1 : Error: offline'}
      ${'getBatchDetailsService'}  | ${getDetails}  | ${'Error in getting Batch details'} | ${[[false]]} | ${'Failed to fetch batch details batch-1 : Error: offline'}
      ${'listBatchAPIService'}     | ${listBatches} | ${'Error listing batches'}          | ${[[false]]} | ${'Failed to fetch batches : Error: offline'}
      ${'creatBatchSubmitService'} | ${submitBatch} | ${'Error submitting Batch'}         | ${[]}        | ${'Failed to submit the Batch : Error: offline'}
    `(
      '$method logs and notifies when the request fails',
      async ({ call, log, loading, toast }) => {
        mockLoggedFetch.mockRejectedValue(new Error('offline'));
        await call();
        expect(setIsLoading.mock.calls).toEqual(loading);
        expectErrorLog(log);
        expectToast(toast);
      }
    );
  });
});
