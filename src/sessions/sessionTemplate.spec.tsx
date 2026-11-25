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
import { JupyterLab } from '@jupyterlab/application';
import { IThemeManager } from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import { DataprocWidget } from '../controls/DataprocWidget';
import { SessionTemplate } from './sessionTemplate';
import SessionDetails from './sessionDetails';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('./sessionDetails', () => ({
  __esModule: true,
  default: jest.fn(
    ({
      setDetailedSessionView
    }: {
      setDetailedSessionView: (value: boolean) => void;
    }) => (
      <div data-testid="mock-session-details">
        <button
          data-testid="close-session-details-btn"
          onClick={() => setDetailedSessionView(false)}
        >
          Close
        </button>
      </div>
    )
  )
}));

describe('SessionTemplate Widget', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  const mockApp = {
    shell: { activeWidget: { close: jest.fn() } }
  } as unknown as JupyterLab;
  const mockLauncher = { add: jest.fn() } as unknown as ILauncher;
  const mockThemeManager = {
    theme: 'JupyterLab Light',
    isLight: jest.fn().mockReturnValue(true),
    themeChanged: {
      connect: jest.fn(),
      disconnect: jest.fn()
    }
  } as unknown as IThemeManager;

  beforeEach(() => {
    jest.clearAllMocks();
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

  const renderWidget = async (sessionId = 'session-template-01') => {
    const widget = new SessionTemplate(
      mockApp,
      mockLauncher,
      mockThemeManager,
      sessionId
    );
    await act(async () => {
      root?.render(widget.renderInternal());
    });
    return widget;
  };

  describe('constructor', () => {
    it('extends DataprocWidget', () => {
      const widget = new SessionTemplate(
        mockApp,
        mockLauncher,
        mockThemeManager,
        'sess-abc'
      );

      expect(widget).toBeInstanceOf(DataprocWidget);
    });

    it('stores app, launcher, and sessionId on the widget instance', () => {
      const widget = new SessionTemplate(
        mockApp,
        mockLauncher,
        mockThemeManager,
        'sess-abc'
      );

      expect(widget.app).toBe(mockApp);
      expect(widget.launcher).toBe(mockLauncher);
      expect(widget.sessionId).toBe('sess-abc');
    });
  });

  describe('rendering and state transitions', () => {
    it('renders SessionDetails inside session-template-container by default', async () => {
      await renderWidget('sess-xyz');

      expect(
        container.querySelector('.session-template-container')
      ).not.toBeNull();
      expect(
        container.querySelector('[data-testid="mock-session-details"]')
      ).not.toBeNull();
    });

    test.each(['sess-xyz', ''])(
      'forwards Launcher props to SessionDetails for sessionId="%s"',
      async sessionId => {
        await renderWidget(sessionId);

        expect(SessionDetails).toHaveBeenLastCalledWith(
          expect.objectContaining({
            sessionSelected: sessionId,
            detailedSessionView: true,
            fromPage: 'Launcher',
            app: mockApp,
            setDetailedSessionView: expect.any(Function)
          }),
          expect.anything()
        );
      }
    );

    it('unmounts SessionDetails when setDetailedSessionView(false) is invoked', async () => {
      await renderWidget('sess-close-test');

      const closeBtn = container.querySelector(
        '[data-testid="close-session-details-btn"]'
      ) as HTMLButtonElement;
      expect(closeBtn).not.toBeNull();

      await act(async () => {
        closeBtn.click();
      });

      expect(
        container.querySelector('.session-template-container')
      ).not.toBeNull();
      expect(
        container.querySelector('[data-testid="mock-session-details"]')
      ).toBeNull();
    });
  });
});
