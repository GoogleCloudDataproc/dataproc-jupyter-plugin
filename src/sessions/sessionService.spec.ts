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

import React from 'react';
import { setImmediate } from 'timers';
import { Notification } from '@jupyterlab/apputils';
import { SessionService } from './sessionService';
import {
  HTTP_METHOD,
  STATUS_ACTIVE,
  STATUS_FAIL,
  STATUS_TERMINATED
} from '../utils/const';
import {
  IAuthCredentials,
  authApi,
  loggedFetch,
  authenticatedFetch,
  elapsedTime,
  handleApiError
} from '../utils/utils';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';

// Mock ../handler/handler so module-level gcpServiceUrls resolves cleanly in tests.
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
  authenticatedFetch: jest.fn(),
  jobTimeFormat: jest.fn((time: string) => `formatted:${time}`),
  elapsedTime: jest.fn(() => '5m 10s'),
  handleApiError: jest.fn()
}));

const flushPromises = () => new Promise<void>(resolve => setImmediate(resolve));

const mockJsonResponse = (payload: unknown) => ({
  json: jest.fn().mockResolvedValue(payload)
});

const mockNestedTerminateResponse = (payload: unknown) => ({
  json: jest.fn().mockResolvedValue(mockJsonResponse(payload))
});

describe('SessionService', () => {
  const mockCredentials: IAuthCredentials = {
    project_id: 'test-project',
    region_id: 'us-central1',
    access_token: 'mock-token',
    login_error: 0,
    config_error: 0
  };

  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
    (authApi as jest.Mock).mockResolvedValue(mockCredentials);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('deleteSessionAPI', () => {
    it('skips loggedFetch when credentials are unavailable', async () => {
      (authApi as jest.Mock).mockResolvedValue(undefined);

      await SessionService.deleteSessionAPI('session-1');
      await flushPromises();

      expect(loggedFetch).not.toHaveBeenCalled();
      expect(Notification.emit).not.toHaveBeenCalled();
    });

    test.each([
      ['empty object payload', {}],
      ['null JSON payload', null]
    ])(
      'sends DELETE request and emits success notification for %s',
      async (_label, payload) => {
        (loggedFetch as jest.Mock).mockResolvedValue(mockJsonResponse(payload));

        await SessionService.deleteSessionAPI('session-1');
        await flushPromises();

        expect(loggedFetch).toHaveBeenCalledWith(
          'https://dataproc.googleapis.com/v1/projects/test-project/locations/us-central1/sessions/session-1',
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer mock-token'
            }
          }
        );
        expect(Notification.emit).toHaveBeenCalledWith(
          'Session session-1 deleted successfully',
          'success',
          { autoClose: 5000 }
        );
      }
    );

    it('emits error notification when DELETE response contains an API error code', async () => {
      (loggedFetch as jest.Mock).mockResolvedValue(
        mockJsonResponse({
          error: { code: 403, message: 'Permission denied' }
        })
      );

      await SessionService.deleteSessionAPI('session-1');
      await flushPromises();

      expect(Notification.emit).toHaveBeenCalledWith(
        'Permission denied',
        'error',
        { autoClose: 5000 }
      );
    });

    it('logs error and emits failure notification when loggedFetch rejects', async () => {
      (loggedFetch as jest.Mock).mockRejectedValue(new Error('Network down'));

      await SessionService.deleteSessionAPI('session-1');
      await flushPromises();

      expect(DataprocLoggingService.log).toHaveBeenCalledWith(
        'Error deleting session',
        LOG_LEVEL.ERROR
      );
      expect(Notification.emit).toHaveBeenCalledWith(
        'Failed to delete the session session-1 : Error: Network down',
        'error',
        { autoClose: 5000 }
      );
    });
  });

  describe('terminateSessionAPI', () => {
    it('skips loggedFetch when credentials are unavailable', async () => {
      (authApi as jest.Mock).mockResolvedValue(undefined);

      await SessionService.terminateSessionAPI('session-2');
      await flushPromises();

      expect(loggedFetch).not.toHaveBeenCalled();
    });

    test.each([
      ['empty object payload', {}],
      ['null JSON payload', null]
    ])(
      'sends POST :terminate request without emitting error for %s',
      async (_label, payload) => {
        (loggedFetch as jest.Mock).mockResolvedValue(
          mockNestedTerminateResponse(payload)
        );

        await SessionService.terminateSessionAPI('session-2');
        await flushPromises();

        expect(loggedFetch).toHaveBeenCalledWith(
          'https://dataproc.googleapis.com/v1/projects/test-project/locations/us-central1/sessions/session-2:terminate',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer mock-token'
            }
          }
        );
        expect(Notification.emit).not.toHaveBeenCalled();
      }
    );

    it('emits error notification when formatted terminate response includes error.code', async () => {
      (loggedFetch as jest.Mock).mockResolvedValue(
        mockNestedTerminateResponse({
          error: { code: 400, message: 'Invalid session state' }
        })
      );

      await SessionService.terminateSessionAPI('session-2');
      await flushPromises();

      expect(Notification.emit).toHaveBeenCalledWith(
        'Failed to terminate session session-2 : Invalid session state',
        'error',
        { autoClose: 5000 }
      );
    });

    it('catches outer response.json() rejection and logs the exact error', async () => {
      const parseError = new Error('Outer parse');
      (loggedFetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockRejectedValue(parseError)
      });

      await SessionService.terminateSessionAPI('session-2');
      await flushPromises();

      expect(consoleLogSpy).toHaveBeenCalledWith(parseError);
      expect(Notification.emit).not.toHaveBeenCalled();
    });

    it('catches inner responseResult.json() rejection and logs the exact error', async () => {
      const parseError = new Error('Inner parse');
      (loggedFetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          json: jest.fn().mockRejectedValue(parseError)
        })
      });

      await SessionService.terminateSessionAPI('session-2');
      await flushPromises();

      expect(consoleLogSpy).toHaveBeenCalledWith(parseError);
      expect(Notification.emit).not.toHaveBeenCalled();
    });

    it('logs error and emits failure notification when loggedFetch rejects', async () => {
      (loggedFetch as jest.Mock).mockRejectedValue(new Error('Timeout'));

      await SessionService.terminateSessionAPI('session-2');
      await flushPromises();

      expect(DataprocLoggingService.log).toHaveBeenCalledWith(
        'Error terminating session',
        LOG_LEVEL.ERROR
      );
      expect(Notification.emit).toHaveBeenCalledWith(
        'Failed to terminate session session-2 : Error: Timeout',
        'error',
        { autoClose: 5000 }
      );
    });
  });

  describe('getSessionDetailsService', () => {
    const createCallbacks = () => ({
      setErrorView: jest.fn(),
      setIsLoading: jest.fn(),
      setLabelDetail: jest.fn(),
      setSessionInfo: jest.fn()
    });

    it('fetches session details, sets formatted labels, and clears loading state on success', async () => {
      const cb = createCallbacks();
      const payload = {
        name: 'projects/test-project/locations/us-central1/sessions/sess-1',
        state: STATUS_ACTIVE,
        labels: { env: 'prod', team: 'analytics' }
      };
      (authenticatedFetch as jest.Mock).mockResolvedValue(
        mockJsonResponse(payload)
      );

      await SessionService.getSessionDetailsService(
        'sess-1',
        cb.setErrorView,
        cb.setIsLoading,
        cb.setLabelDetail,
        cb.setSessionInfo
      );

      expect(authenticatedFetch).toHaveBeenCalledWith({
        uri: 'sessions/sess-1',
        method: HTTP_METHOD.GET,
        regionIdentifier: 'locations'
      });
      expect(cb.setErrorView).not.toHaveBeenCalled();
      expect(cb.setSessionInfo).toHaveBeenCalledWith(payload);
      expect(cb.setLabelDetail).toHaveBeenCalledWith([
        'env:prod',
        'team:analytics'
      ]);
      expect(cb.setIsLoading).toHaveBeenCalledWith(false);
      expect(Notification.emit).not.toHaveBeenCalled();
    });

    it('sets empty label list when session response does not include labels', async () => {
      const cb = createCallbacks();
      const payload = {
        name: 'projects/test-project/locations/us-central1/sessions/sess-no-labels',
        state: STATUS_ACTIVE
      };
      (authenticatedFetch as jest.Mock).mockResolvedValue(
        mockJsonResponse(payload)
      );

      await SessionService.getSessionDetailsService(
        'sess-no-labels',
        cb.setErrorView,
        cb.setIsLoading,
        cb.setLabelDetail,
        cb.setSessionInfo
      );

      expect(cb.setLabelDetail).toHaveBeenCalledWith([]);
      expect(cb.setIsLoading).toHaveBeenCalledWith(false);
    });

    test.each([
      [404, 'Session not found', true],
      [500, 'Internal error', false]
    ])(
      'handles API error code %i (expectErrorView=%s) and emits notification',
      async (code, message, expectErrorView) => {
        const cb = createCallbacks();
        (authenticatedFetch as jest.Mock).mockResolvedValue(
          mockJsonResponse({ error: { code, message } })
        );

        await SessionService.getSessionDetailsService(
          'sess-err-code',
          cb.setErrorView,
          cb.setIsLoading,
          cb.setLabelDetail,
          cb.setSessionInfo
        );

        if (expectErrorView) {
          expect(cb.setErrorView).toHaveBeenCalledWith(true);
        } else {
          expect(cb.setErrorView).not.toHaveBeenCalled();
        }
        expect(cb.setLabelDetail).toHaveBeenCalledWith([]);
        expect(cb.setIsLoading).toHaveBeenCalledWith(false);
        expect(Notification.emit).toHaveBeenCalledWith(
          `Failed to fetch session details sess-err-code : ${message}`,
          'error',
          { autoClose: 5000 }
        );
      }
    );

    it('stops loader, logs error, and emits notification when authenticatedFetch rejects', async () => {
      const cb = createCallbacks();
      (authenticatedFetch as jest.Mock).mockRejectedValue(
        new Error('Connection refused')
      );

      await SessionService.getSessionDetailsService(
        'sess-net-err',
        cb.setErrorView,
        cb.setIsLoading,
        cb.setLabelDetail,
        cb.setSessionInfo
      );

      expect(cb.setIsLoading).toHaveBeenCalledWith(false);
      expect(DataprocLoggingService.log).toHaveBeenCalledWith(
        'Error loading session details',
        LOG_LEVEL.ERROR
      );
      expect(Notification.emit).toHaveBeenCalledWith(
        'Failed to fetch session details sess-net-err : Error: Connection refused',
        'error',
        { autoClose: 5000 }
      );
    });
  });

  describe('listSessionsAPIService', () => {
    const createListCallbacks = () => ({
      renderActions: jest
        .fn()
        .mockReturnValue(React.createElement('div', null, 'actions')),
      setIsLoading: jest.fn(),
      setSessionsList: jest.fn(),
      setApiDialogOpen: jest.fn(),
      setPollingDisable: jest.fn(),
      setEnableLink: jest.fn()
    });

    const invokeListService = async (
      cb = createListCallbacks(),
      credentials: IAuthCredentials | undefined = mockCredentials
    ) => {
      await SessionService.listSessionsAPIService(
        cb.renderActions,
        cb.setIsLoading,
        cb.setSessionsList,
        cb.setApiDialogOpen,
        cb.setPollingDisable,
        cb.setEnableLink,
        credentials
      );
      return cb;
    };

    const createRawSession = (overrides: Record<string, unknown> = {}) => ({
      name: 'projects/test-project/locations/us-central1/sessions/sess-1',
      state: STATUS_ACTIVE,
      createTime: '2026-01-01T10:00:00Z',
      stateTime: '2026-01-01T10:05:10Z',
      creator: 'alice@example.com',
      ...overrides
    });

    it('fetches sessions with default query params and transforms row fields', async () => {
      const rawSession = createRawSession();
      (authenticatedFetch as jest.Mock).mockResolvedValue(
        mockJsonResponse({ sessions: [rawSession] })
      );

      const cb = await invokeListService();

      expect(authenticatedFetch).toHaveBeenCalledWith({
        uri: 'sessions',
        method: HTTP_METHOD.GET,
        regionIdentifier: 'locations',
        queryParams: new URLSearchParams({ pageSize: '1000', pageToken: '' })
      });
      expect(cb.renderActions).toHaveBeenCalledWith(rawSession);
      expect(cb.setSessionsList).toHaveBeenCalledWith([
        expect.objectContaining({
          sessionID: 'sess-1',
          status: STATUS_ACTIVE,
          location: 'us-central1',
          engine: 'Default',
          creator: 'alice@example.com',
          creationTime: 'formatted:2026-01-01T10:00:00Z',
          elapsedTime: ''
        })
      ]);
      expect(cb.setIsLoading).toHaveBeenCalledWith(false);
    });

    it('paginates recursively when nextPageToken is returned and merges all pages', async () => {
      (authenticatedFetch as jest.Mock)
        .mockResolvedValueOnce(
          mockJsonResponse({
            sessions: [
              createRawSession({
                name: 'projects/test-project/locations/us-central1/sessions/sess-p1',
                createTime: '2026-01-01T10:00:00Z'
              })
            ],
            nextPageToken: 'token-page-2'
          })
        )
        .mockResolvedValueOnce(
          mockJsonResponse({
            sessions: [
              createRawSession({
                name: 'projects/test-project/locations/us-east1/sessions/sess-p2',
                createTime: '2026-01-02T10:00:00Z'
              })
            ]
          })
        );

      const cb = await invokeListService();
      await flushPromises();

      expect(authenticatedFetch).toHaveBeenCalledTimes(2);
      expect(authenticatedFetch).toHaveBeenNthCalledWith(2, {
        uri: 'sessions',
        method: HTTP_METHOD.GET,
        regionIdentifier: 'locations',
        queryParams: new URLSearchParams({
          pageSize: '1000',
          pageToken: 'token-page-2'
        })
      });
      expect(cb.setSessionsList).toHaveBeenCalledTimes(1);
      expect(cb.setSessionsList.mock.calls[0][0]).toHaveLength(2);
    });

    it('sorts sessions in descending order by createTime', async () => {
      (authenticatedFetch as jest.Mock).mockResolvedValue(
        mockJsonResponse({
          sessions: [
            createRawSession({
              name: 'projects/p/locations/us-central1/sessions/sess-oldest',
              createTime: '2026-01-01T08:00:00Z'
            }),
            createRawSession({
              name: 'projects/p/locations/us-central1/sessions/sess-newest',
              createTime: '2026-01-03T08:00:00Z'
            }),
            createRawSession({
              name: 'projects/p/locations/us-central1/sessions/sess-middle',
              createTime: '2026-01-02T08:00:00Z'
            })
          ]
        })
      );

      const cb = await invokeListService();

      const ids = cb.setSessionsList.mock.calls[0][0].map(
        (s: { sessionID: string }) => s.sessionID
      );
      expect(ids).toEqual(['sess-newest', 'sess-middle', 'sess-oldest']);
    });

    test.each([
      [STATUS_TERMINATED, '5m 10s', 1],
      [STATUS_FAIL, '5m 10s', 1],
      [STATUS_ACTIVE, '', 0]
    ])(
      'computes elapsedTime="%s" for state %s (elapsedTime calls=%i)',
      async (state, expectedElapsed, expectedCalls) => {
        (authenticatedFetch as jest.Mock).mockResolvedValue(
          mockJsonResponse({
            sessions: [createRawSession({ state })]
          })
        );

        const cb = await invokeListService();

        expect(elapsedTime).toHaveBeenCalledTimes(expectedCalls);
        expect(cb.setSessionsList).toHaveBeenCalledWith([
          expect.objectContaining({ elapsedTime: expectedElapsed })
        ]);
      }
    );

    test.each([
      [
        'lightningEngine property',
        { properties: { 'spark:spark.dataproc.engine': 'lightningEngine' } },
        'Lightning Engine'
      ],
      ['omitted runtimeConfig', undefined, 'Default'],
      [
        'unmapped engine value',
        { properties: { 'spark:spark.dataproc.engine': 'customEngine' } },
        undefined
      ]
    ])(
      'maps engine display name for %s',
      async (_label, runtimeConfig, expectedEngine) => {
        (authenticatedFetch as jest.Mock).mockResolvedValue(
          mockJsonResponse({
            sessions: [createRawSession({ runtimeConfig })]
          })
        );

        const cb = await invokeListService();

        expect(cb.setSessionsList).toHaveBeenCalledWith([
          expect.objectContaining({ engine: expectedEngine })
        ]);
      }
    );

    test.each([
      ['empty object without sessions', {}],
      ['null JSON response', null]
    ])(
      'sets empty session list without calling handleApiError for %s',
      async (_label, payload) => {
        (authenticatedFetch as jest.Mock).mockResolvedValue(
          mockJsonResponse(payload)
        );

        const cb = await invokeListService();

        expect(cb.setSessionsList).toHaveBeenCalledWith([]);
        expect(cb.setIsLoading).toHaveBeenCalledWith(false);
        expect(handleApiError).not.toHaveBeenCalled();
      }
    );

    it('sets empty list and delegates to handleApiError when response contains error.code', async () => {
      const errorResponse = {
        error: { code: 403, message: 'Dataproc API has not been used' }
      };
      (authenticatedFetch as jest.Mock).mockResolvedValue(
        mockJsonResponse(errorResponse)
      );

      const cb = await invokeListService();

      expect(cb.setSessionsList).toHaveBeenCalledWith([]);
      expect(cb.setIsLoading).toHaveBeenCalledWith(false);
      expect(handleApiError).toHaveBeenCalledWith(
        errorResponse,
        mockCredentials,
        cb.setApiDialogOpen,
        cb.setEnableLink,
        cb.setPollingDisable,
        'sessions'
      );
    });

    it('logs error and emits notification when authenticatedFetch throws', async () => {
      (authenticatedFetch as jest.Mock).mockRejectedValue(
        new Error('Fetch failed')
      );

      const cb = await invokeListService(createListCallbacks(), undefined);

      expect(cb.setIsLoading).toHaveBeenCalledWith(false);
      expect(DataprocLoggingService.log).toHaveBeenCalledWith(
        'Error listing Sessions',
        LOG_LEVEL.ERROR
      );
      expect(Notification.emit).toHaveBeenCalledWith(
        'Failed to fetch sessions : Error: Fetch failed',
        'error',
        { autoClose: 5000 }
      );
    });
  });
});
