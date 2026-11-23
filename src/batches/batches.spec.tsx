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

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Widget } from '@lumino/widgets';
import { Batches } from './batches';
import { checkConfig } from '../utils/utils';
import LoginErrorComponent from '../utils/loginErrorComponent';

jest.mock('../utils/utils', () => ({
  checkConfig: jest.fn()
}));

jest.mock('./listBatches', () => ({
  __esModule: true,
  default: ({ setLoggedIn }: any) => (
    <div data-testid="mock-list-batches">
      <button data-testid="mock-logout" onClick={() => setLoggedIn(false)}>
        Simulate logout
      </button>
    </div>
  )
}));

jest.mock('../sessions/listSessions', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-list-sessions" />
}));

jest.mock('../utils/loginErrorComponent', () => ({
  __esModule: true,
  default: jest.fn(({ loginError, configError, setLoginError }: any) => (
    <div data-testid="mock-login-error">
      {`loginError=${loginError} configError=${configError}`}
      <button
        data-testid="mock-clear-login-error"
        onClick={() => setLoginError(false)}
      >
        Simulate sign-in
      </button>
    </div>
  ))
}));

const mockCheckConfig = jest.mocked(checkConfig);
const mockLoginErrorComponent = jest.mocked(LoginErrorComponent);

// Outcomes mirror the branches of the real checkConfig in utils.ts.
const configPending: typeof checkConfig = () =>
  new Promise<void>(() => undefined);
const configValid: typeof checkConfig = async setLoggedIn => {
  setLoggedIn(true);
};
const loginInvalid: typeof checkConfig = async (
  _setLoggedIn,
  _setConfigError,
  setLoginError
) => {
  setLoginError(true);
};
const configInvalid: typeof checkConfig = async (
  setLoggedIn,
  setConfigError
) => {
  setConfigError(true);
  setLoggedIn(true);
};

describe('Batches', () => {
  const mockSettingRegistry: any = { id: 'mock-setting-registry' };
  const mockApp: any = { commands: { execute: jest.fn() } };
  let themeManager: any;
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    themeManager = {
      theme: 'JupyterLab Light',
      isLight: jest.fn().mockReturnValue(true),
      themeChanged: { connect: jest.fn(), disconnect: jest.fn() }
    };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  const renderBatches = async (outcome: typeof checkConfig) => {
    mockCheckConfig.mockImplementation(outcome);
    const widget = new Batches(mockSettingRegistry, mockApp, themeManager);
    await act(async () => {
      root.render(widget.renderInternal());
    });
    return widget;
  };

  const byTestId = (testId: string) =>
    container.querySelector(`[data-testid="${testId}"]`);

  const tabList = () => container.querySelector('[role="tablist"]');

  const getTab = (label: 'Batches' | 'Sessions') =>
    Array.from(
      container.querySelectorAll<HTMLElement>('[role="tabpanel"]')
    ).find(tab => tab.textContent === label) as HTMLElement;

  const click = async (element: Element | null) => {
    await act(async () => {
      (element as HTMLElement).click();
    });
  };

  describe('widget render', () => {
    it('stores settingRegistry and app and subscribes to theme changes', () => {
      const widget = new Batches(mockSettingRegistry, mockApp, themeManager);

      expect(widget.settingRegistry).toBe(mockSettingRegistry);
      expect(widget.app).toBe(mockApp);
      expect(themeManager.themeChanged.connect).toHaveBeenCalledWith(
        expect.any(Function),
        widget
      );

      const element = widget.renderInternal();
      expect(element.props.settingRegistry).toBe(mockSettingRegistry);
      expect(element.props.app).toBe(mockApp);
    });

    it('renders through DataprocWidget when attached and cleans up on dispose', async () => {
      mockCheckConfig.mockImplementation(configValid);
      const widget = new Batches(mockSettingRegistry, mockApp, themeManager);
      const host = document.createElement('div');
      document.body.appendChild(host);

      await act(async () => {
        Widget.attach(widget, host);
        await widget.renderPromise;
      });

      expect(widget.node.querySelector('[role="tablist"]')).not.toBeNull();
      expect(
        widget.node.querySelector('[data-testid="mock-list-batches"]')
      ).not.toBeNull();

      act(() => {
        widget.dispose();
      });

      expect(widget.isDisposed).toBe(true);
      expect(host.contains(widget.node)).toBe(false);
      expect(themeManager.themeChanged.disconnect).toHaveBeenCalledWith(
        expect.any(Function),
        widget
      );
      host.remove();
    });
  });

  describe('config check', () => {
    it('shows the "Loading Batches" spinner while checkConfig is pending', async () => {
      await renderBatches(configPending);

      expect(mockCheckConfig).toHaveBeenCalledTimes(1);
      expect(mockCheckConfig).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );
      expect(byTestId('loader')).not.toBeNull();
      expect(container.textContent).toContain('Loading Batches');
      expect(tabList()).toBeNull();
      expect(byTestId('mock-login-error')).toBeNull();
    });

    it.each([
      ['login', loginInvalid, 'loginError=true configError=false'],
      ['config', configInvalid, 'loginError=false configError=true']
    ])(
      'shows only LoginErrorComponent on a %s error',
      async (_kind, outcome, expectedText) => {
        await renderBatches(outcome);

        expect(byTestId('mock-login-error')?.textContent).toContain(
          expectedText
        );
        expect(byTestId('loader')).toBeNull();
        expect(tabList()).toBeNull();

        const props = mockLoginErrorComponent.mock.lastCall?.[0];
        expect(props?.settingRegistry).toBe(mockSettingRegistry);
        expect(props?.app).toBe(mockApp);
      }
    );

    it('shows the tabs once LoginErrorComponent clears the login error', async () => {
      await renderBatches(loginInvalid);

      await click(byTestId('mock-clear-login-error'));

      expect(byTestId('mock-login-error')).toBeNull();
      expect(tabList()).not.toBeNull();
      expect(byTestId('mock-list-batches')).not.toBeNull();
    });
  });

  describe('tab switching', () => {
    it('renders Batches and Sessions tabs with Batches selected by default', async () => {
      await renderBatches(configValid);

      const labels = Array.from(
        container.querySelectorAll('[role="tabpanel"]')
      ).map(tab => tab.textContent);
      expect(labels).toEqual(['Batches', 'Sessions']);
      expect(getTab('Batches').className).toBe('selected-header');
      expect(getTab('Sessions').className).toBe('unselected-header');
      expect(byTestId('mock-list-batches')).not.toBeNull();
      expect(byTestId('mock-list-sessions')).toBeNull();
      expect(byTestId('loader')).toBeNull();
      expect(byTestId('mock-login-error')).toBeNull();
    });

    it('switches to Sessions when the Sessions tab is clicked', async () => {
      await renderBatches(configValid);

      await click(getTab('Sessions'));

      expect(getTab('Sessions').className).toBe('selected-header');
      expect(getTab('Batches').className).toBe('unselected-header');
      expect(byTestId('mock-list-sessions')).not.toBeNull();
      expect(byTestId('mock-list-batches')).toBeNull();
    });

    it('switches back to Batches when the Batches tab is clicked', async () => {
      await renderBatches(configValid);
      await click(getTab('Sessions'));
      expect(byTestId('mock-list-sessions')).not.toBeNull();

      await click(getTab('Batches'));

      expect(getTab('Batches').className).toBe('selected-header');
      expect(getTab('Sessions').className).toBe('unselected-header');
      expect(byTestId('mock-list-batches')).not.toBeNull();
      expect(byTestId('mock-list-sessions')).toBeNull();
    });

    it('keeps Batches selected when the active tab is clicked again', async () => {
      await renderBatches(configValid);

      await click(getTab('Batches'));

      expect(getTab('Batches').className).toBe('selected-header');
      expect(getTab('Sessions').className).toBe('unselected-header');
      expect(byTestId('mock-list-batches')).not.toBeNull();
    });

    it('hides the tabs when ListBatches reports the user is logged out', async () => {
      await renderBatches(configValid);

      await click(byTestId('mock-logout'));

      expect(tabList()).toBeNull();
      expect(byTestId('mock-list-batches')).toBeNull();
      // The initial config check already finished, so no spinner returns.
      expect(byTestId('loader')).toBeNull();
    });
  });
});
