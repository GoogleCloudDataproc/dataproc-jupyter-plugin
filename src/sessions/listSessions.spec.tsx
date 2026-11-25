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

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import ListSessions from './listSessions';
import SessionDetails from './sessionDetails';
import { SessionService } from './sessionService';
import PollingTimer from '../utils/pollingTimer';
import { IAuthCredentials, authApi } from '../utils/utils';
import {
  ClusterStatus,
  STATUS_ACTIVE,
  STATUS_CREATING,
  STATUS_DELETING,
  STATUS_FAIL,
  STATUS_PENDING,
  STATUS_PROVISIONING,
  STATUS_TERMINATED,
  STATUS_TERMINATING
} from '../utils/const';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Mock ../handler/handler to prevent ../utils/const's module-level gcpServiceUrls IIFE from making API calls.
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

jest.mock('../utils/utils', () => ({
  ...jest.requireActual('../utils/utils'),
  authApi: jest.fn()
}));

jest.mock('./sessionDetails', () => ({
  __esModule: true,
  default: jest.fn(
    ({
      sessionSelected,
      setDetailedSessionView
    }: {
      sessionSelected: string;
      setDetailedSessionView: (value: boolean) => void;
    }) => (
      <div data-testid="mock-session-details">
        <span>Details for {sessionSelected}</span>
        <button
          data-testid="back-to-sessions-btn"
          onClick={() => setDetailedSessionView(false)}
        >
          Back
        </button>
      </div>
    )
  )
}));

describe('ListSessions Component', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  const mockCredentials: IAuthCredentials = {
    project_id: 'test-project',
    region_id: 'us-central1',
    access_token: 'mock-token'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (authApi as jest.Mock).mockResolvedValue(mockCredentials);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
      root = null;
    }
    container.remove();
    jest.restoreAllMocks();
  });

  const buildSessionRow = (
    renderActions: (data: {
      state: ClusterStatus;
      name: string;
    }) => React.JSX.Element,
    sessionID: string,
    status: string,
    actionState: ClusterStatus = ClusterStatus.STATUS_ACTIVE
  ) => ({
    sessionID,
    status,
    location: 'us-central1',
    engine: 'Default',
    creator: 'user@example.com',
    creationTime: 'Jan 1, 2026',
    elapsedTime: '2m 30s',
    actions: renderActions({
      name: `projects/test-project/locations/us-central1/sessions/${sessionID}`,
      state: actionState
    })
  });

  const mockListSessions = (
    buildRows: (
      renderActions: (data: {
        state: ClusterStatus;
        name: string;
      }) => React.JSX.Element
    ) => Array<ReturnType<typeof buildSessionRow>>
  ) =>
    jest
      .spyOn(SessionService, 'listSessionsAPIService')
      .mockImplementation(async (renderActions, setIsLoading, setList) => {
        setList(buildRows(renderActions));
        setIsLoading(false);
      });

  const renderComponent = async () => {
    await act(async () => {
      root?.render(<ListSessions />);
    });
  };

  describe('loading, empty, and polling lifecycle', () => {
    it('displays loading spinner while sessions are being fetched', async () => {
      jest
        .spyOn(SessionService, 'listSessionsAPIService')
        .mockImplementation(async () => undefined);

      await renderComponent();

      expect(container.querySelector('[data-testid="loader"]')).not.toBeNull();
      expect(container.textContent).toContain('Loading Sessions');
    });

    it('disables polling via PollingTimer when component unmounts', async () => {
      jest
        .spyOn(SessionService, 'listSessionsAPIService')
        .mockImplementation(async () => undefined);

      await renderComponent();

      act(() => {
        root?.unmount();
        root = null;
      });

      expect(PollingTimer).toHaveBeenCalledWith(
        expect.any(Function),
        true,
        undefined
      );
    });

    it('displays "No rows to display" when session list is empty', async () => {
      mockListSessions(() => []);

      await renderComponent();

      expect(container.querySelector('.no-data-style')?.textContent).toBe(
        'No rows to display'
      );
    });

    it('starts polling via PollingTimer after loading completes', async () => {
      mockListSessions(() => []);

      await renderComponent();

      expect(PollingTimer).toHaveBeenCalledWith(
        expect.any(Function),
        false,
        undefined
      );
    });
  });

  describe('ApiEnableDialog', () => {
    test.each([
      ['Enable', true],
      ['Cancel', false]
    ])(
      'handles "%s" click on ApiEnableDialog (opensWindow=%s)',
      async (buttonLabel, shouldOpenWindow) => {
        const windowOpenSpy = jest
          .spyOn(window, 'open')
          .mockImplementation(() => null);

        jest
          .spyOn(SessionService, 'listSessionsAPIService')
          .mockImplementation(
            async (
              _renderActions,
              setIsLoading,
              setList,
              setApiDialogOpen,
              _setPollingDisable,
              setEnableLink
            ) => {
              setList([]);
              setIsLoading(false);
              setEnableLink('https://console.cloud.google.com/apis/dataproc');
              setApiDialogOpen(true);
            }
          );

        await renderComponent();

        expect(document.body.textContent).toContain(
          'The Cloud Dataproc API is not enabled for this project.'
        );

        const actionBtn = Array.from(
          document.body.querySelectorAll('button')
        ).find(b => b.textContent === buttonLabel);
        expect(actionBtn).toBeDefined();

        await act(async () => {
          actionBtn?.click();
        });

        if (shouldOpenWindow) {
          expect(windowOpenSpy).toHaveBeenCalledWith(
            'https://console.cloud.google.com/apis/dataproc',
            '_blank'
          );
        } else {
          expect(windowOpenSpy).not.toHaveBeenCalled();
        }
        expect(document.body.textContent).not.toContain(
          'The Cloud Dataproc API is not enabled for this project.'
        );
      }
    );
  });

  describe('status cells', () => {
    test.each([
      [STATUS_ACTIVE, 'active', false],
      [STATUS_TERMINATED, 'terminated', false],
      [STATUS_FAIL, 'failed', false],
      [STATUS_PROVISIONING, 'provisioning', true],
      [STATUS_CREATING, 'creating', true],
      [STATUS_PENDING, 'pending', true],
      [STATUS_TERMINATING, 'terminating', true],
      [STATUS_DELETING, 'deleting', true],
      ['', '', false]
    ])(
      'renders status cell for "%s" with text "%s" and spinner=%s',
      async (statusValue, expectedLower, expectSpinner) => {
        mockListSessions(renderActions => [
          buildSessionRow(renderActions, 'sess-status', statusValue)
        ]);

        await renderComponent();

        expect(container.querySelector('.cluster-status')?.textContent).toBe(
          expectedLower
        );
        expect(Boolean(container.querySelector('[data-testid="loader"]'))).toBe(
          expectSpinner
        );
      }
    );
  });

  describe('row actions', () => {
    it('enables Terminate Session and invokes terminateSessionAPI for ACTIVE sessions', async () => {
      const terminateSpy = jest
        .spyOn(SessionService, 'terminateSessionAPI')
        .mockResolvedValue(undefined);
      mockListSessions(renderActions => [
        buildSessionRow(
          renderActions,
          'sess-active',
          STATUS_ACTIVE,
          ClusterStatus.STATUS_ACTIVE
        )
      ]);

      await renderComponent();

      const terminateBtn = container.querySelector(
        '[title="Terminate Session"]'
      ) as HTMLElement;
      expect(terminateBtn.getAttribute('aria-disabled')).toBe('false');

      await act(async () => {
        terminateBtn.click();
      });

      expect(terminateSpy).toHaveBeenCalledWith('sess-active');
    });

    it('disables Terminate Session and ignores clicks for non-ACTIVE sessions', async () => {
      const terminateSpy = jest
        .spyOn(SessionService, 'terminateSessionAPI')
        .mockResolvedValue(undefined);
      mockListSessions(renderActions => [
        buildSessionRow(
          renderActions,
          'sess-stopped',
          STATUS_TERMINATED,
          ClusterStatus.STATUS_STOPPED
        )
      ]);

      await renderComponent();

      const terminateBtn = container.querySelector(
        '[title="Terminate Session"]'
      ) as HTMLElement;
      expect(terminateBtn.getAttribute('aria-disabled')).toBe('true');

      await act(async () => {
        terminateBtn.click();
      });

      expect(terminateSpy).not.toHaveBeenCalled();
    });

    it('opens DeletePopup and closes without deleting when Cancel is clicked', async () => {
      const deleteSpy = jest
        .spyOn(SessionService, 'deleteSessionAPI')
        .mockResolvedValue(undefined);
      mockListSessions(renderActions => [
        buildSessionRow(renderActions, 'sess-active', STATUS_ACTIVE)
      ]);

      await renderComponent();

      const deleteBtn = container.querySelector(
        '[title="Delete Session"]'
      ) as HTMLElement;
      await act(async () => {
        deleteBtn.click();
      });

      expect(document.body.textContent).toContain(
        'This will delete sess-active and cannot be undone.'
      );

      const cancelBtn = Array.from(
        document.body.querySelectorAll('button')
      ).find(b => b.textContent === 'Cancel');
      await act(async () => {
        cancelBtn?.click();
      });

      expect(deleteSpy).not.toHaveBeenCalled();
      expect(document.body.textContent).not.toContain(
        'This will delete sess-active and cannot be undone.'
      );
    });

    it('invokes deleteSessionAPI when Delete is confirmed in DeletePopup', async () => {
      const deleteSpy = jest
        .spyOn(SessionService, 'deleteSessionAPI')
        .mockResolvedValue(undefined);
      mockListSessions(renderActions => [
        buildSessionRow(renderActions, 'sess-active', STATUS_ACTIVE)
      ]);

      await renderComponent();

      const deleteBtn = container.querySelector(
        '[title="Delete Session"]'
      ) as HTMLElement;
      await act(async () => {
        deleteBtn.click();
      });

      const confirmBtn = Array.from(
        document.body.querySelectorAll('button')
      ).find(b => b.textContent === 'Delete');
      await act(async () => {
        confirmBtn?.click();
      });

      expect(deleteSpy).toHaveBeenCalledWith('sess-active');
    });
  });

  describe('session details navigation', () => {
    it('opens SessionDetails with selected session ID when a Session ID cell is clicked', async () => {
      mockListSessions(renderActions => [
        buildSessionRow(renderActions, 'sess-detail-01', STATUS_ACTIVE)
      ]);

      await renderComponent();

      const sessionIdCell = container.querySelector(
        'td.cluster-name'
      ) as HTMLElement;
      expect(sessionIdCell.textContent).toBe('sess-detail-01');

      await act(async () => {
        sessionIdCell.click();
      });

      expect(
        container.querySelector('[data-testid="mock-session-details"]')
      ).not.toBeNull();
      expect(SessionDetails).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sessionSelected: 'sess-detail-01',
          detailedSessionView: true,
          setDetailedSessionView: expect.any(Function)
        }),
        expect.anything()
      );
    });

    it('returns to the sessions table when SessionDetails exits detailed view', async () => {
      const listSpy = mockListSessions(renderActions => [
        buildSessionRow(renderActions, 'sess-detail-01', STATUS_ACTIVE)
      ]);

      await renderComponent();

      const sessionIdCell = container.querySelector(
        'td.cluster-name'
      ) as HTMLElement;
      await act(async () => {
        sessionIdCell.click();
      });

      const backBtn = container.querySelector(
        '[data-testid="back-to-sessions-btn"]'
      ) as HTMLButtonElement;
      await act(async () => {
        backBtn.click();
      });

      expect(
        container.querySelector('[data-testid="mock-session-details"]')
      ).toBeNull();
      expect(listSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('filtering and pagination', () => {
    it('does not render PaginationView when 50 or fewer sessions are loaded', async () => {
      mockListSessions(renderActions =>
        Array.from({ length: 5 }, (_, idx) =>
          buildSessionRow(renderActions, `sess-${idx}`, STATUS_ACTIVE)
        )
      );

      await renderComponent();

      expect(container.querySelector('.pagination-parent-view')).toBeNull();
    });

    it('renders PaginationView and navigates Next/Previous pages when more than 50 sessions exist', async () => {
      mockListSessions(renderActions =>
        Array.from({ length: 52 }, (_, idx) =>
          buildSessionRow(renderActions, `sess-${idx}`, STATUS_ACTIVE)
        )
      );

      await renderComponent();

      expect(container.querySelector('.page-display-part')?.textContent).toBe(
        '1 - 50 of 52'
      );

      const moveButtons = container.querySelectorAll('.page-move-button');
      expect(moveButtons.length).toBe(2);

      await act(async () => {
        (moveButtons[1] as HTMLElement).click();
      });
      expect(container.querySelector('.page-display-part')?.textContent).toBe(
        '51 - 52 of 52'
      );

      await act(async () => {
        (moveButtons[0] as HTMLElement).click();
      });
      expect(container.querySelector('.page-display-part')?.textContent).toBe(
        '1 - 50 of 52'
      );
    });

    it('filters visible rows and disables polling when typing into GlobalFilter', async () => {
      const listSpy = mockListSessions(renderActions => [
        buildSessionRow(renderActions, 'sess-alpha', STATUS_ACTIVE),
        buildSessionRow(renderActions, 'sess-beta', STATUS_ACTIVE)
      ]);

      await renderComponent();

      const filterInput = container.querySelector(
        'input[aria-label="filterd value"]'
      ) as HTMLInputElement;
      expect(filterInput).not.toBeNull();

      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;

      await act(async () => {
        nativeInputValueSetter?.call(filterInput, 'sess-beta');
        filterInput.dispatchEvent(new Event('input', { bubbles: true }));
      });

      const visibleNameCells = container.querySelectorAll('td.cluster-name');
      expect(visibleNameCells.length).toBe(1);
      expect(visibleNameCells[0].textContent).toBe('sess-beta');
      expect(listSpy).toHaveBeenCalledTimes(1);
    });
  });
});
