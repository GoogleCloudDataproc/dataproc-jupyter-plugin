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
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { NotebookTemplates } from './notebookTemplates';
import ListNotebookTemplates from './listNotebookTemplates';
import LoginErrorComponent from '../utils/loginErrorComponent';
import { checkConfig } from '../utils/utils';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Mock ../utils/const to prevent its module-level gcpServiceUrls IIFE from invoking requestAPI.
jest.mock('../utils/const', () => ({
  LOGIN_STATE: '1'
}));

jest.mock('../utils/utils', () => ({
  ...jest.requireActual('../utils/utils'),
  checkConfig: jest.fn()
}));

jest.mock('./listNotebookTemplates', () => ({
  __esModule: true,
  default: jest.fn(() => (
    <div data-testid="mock-list-notebook-templates">
      Mock ListNotebookTemplates
    </div>
  ))
}));

jest.mock('../utils/loginErrorComponent', () => ({
  __esModule: true,
  default: jest.fn(({ loginError, configError }: any) => (
    <div data-testid="mock-login-error">
      LoginError: {String(loginError)}, ConfigError: {String(configError)}
    </div>
  ))
}));

describe('NotebookTemplates Widget and NotebookTemplatesComponent', () => {
  let container: HTMLDivElement;
  let root: Root;

  const mockApp = { id: 'mock-app' } as unknown as JupyterLab;
  const mockFactory = { id: 'mock-factory' } as unknown as IFileBrowserFactory;
  const mockSettingRegistry = {
    id: 'mock-settings'
  } as unknown as ISettingRegistry;
  const mockThemeManager = {
    theme: 'JupyterLab Light',
    isLight: jest.fn().mockReturnValue(true),
    themeChanged: {
      connect: jest.fn(),
      disconnect: jest.fn()
    }
  } as unknown as IThemeManager;

  const mockPendingConfigCheck = () => {
    (checkConfig as jest.Mock).mockImplementation(
      () => new Promise(() => undefined)
    );
  };

  const mockResolvedConfigCheck = ({
    loggedIn = false,
    configError = false,
    loginError = false
  }: {
    loggedIn?: boolean;
    configError?: boolean;
    loginError?: boolean;
  }) => {
    (checkConfig as jest.Mock).mockImplementation(
      async (setLoggedIn, setConfigError, setLoginError) => {
        await Promise.resolve();
        setLoggedIn(loggedIn);
        setConfigError(configError);
        setLoginError(loginError);
      }
    );
  };

  const renderWidget = async () => {
    const widget = new NotebookTemplates(
      mockApp,
      mockThemeManager,
      mockFactory,
      mockSettingRegistry
    );
    await act(async () => {
      root.render(widget.renderInternal());
    });
    return widget;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    jest.restoreAllMocks();
  });

  describe('widget initialization', () => {
    it('stores app, factory, and settingRegistry on the widget instance', () => {
      const widget = new NotebookTemplates(
        mockApp,
        mockThemeManager,
        mockFactory,
        mockSettingRegistry
      );

      expect(widget.app).toBe(mockApp);
      expect(widget.factory).toBe(mockFactory);
      expect(widget.settingRegistry).toBe(mockSettingRegistry);
    });

    it('invokes checkConfig with state setter callbacks on mount', async () => {
      mockPendingConfigCheck();

      await renderWidget();

      expect(checkConfig).toHaveBeenCalledTimes(1);
      expect(checkConfig).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  describe('loading state', () => {
    it('displays the Loading Templates spinner while checkConfig is pending', async () => {
      mockPendingConfigCheck();

      await renderWidget();

      expect(container.querySelector('[data-testid="loader"]')).not.toBeNull();
      expect(container.textContent).toContain('Loading Templates');
    });

    it('does not render ListNotebookTemplates or LoginErrorComponent while loading', async () => {
      mockPendingConfigCheck();

      await renderWidget();

      expect(
        container.querySelector('[data-testid="mock-list-notebook-templates"]')
      ).toBeNull();
      expect(
        container.querySelector('[data-testid="mock-login-error"]')
      ).toBeNull();
    });
  });

  describe('error states', () => {
    it('renders LoginErrorComponent when checkConfig reports loginError', async () => {
      mockResolvedConfigCheck({ loginError: true, configError: false });

      await renderWidget();

      const errorEl = container.querySelector(
        '[data-testid="mock-login-error"]'
      );
      expect(errorEl).not.toBeNull();
      expect(errorEl?.textContent).toContain(
        'LoginError: true, ConfigError: false'
      );
    });

    it('renders LoginErrorComponent when checkConfig reports configError', async () => {
      mockResolvedConfigCheck({ loginError: false, configError: true });

      await renderWidget();

      const errorEl = container.querySelector(
        '[data-testid="mock-login-error"]'
      );
      expect(errorEl).not.toBeNull();
      expect(errorEl?.textContent).toContain(
        'LoginError: false, ConfigError: true'
      );
    });

    it('forwards app, settingRegistry, error flags, and setters to LoginErrorComponent', async () => {
      mockResolvedConfigCheck({ loginError: true, configError: false });

      await renderWidget();

      expect(LoginErrorComponent).toHaveBeenCalledWith(
        expect.objectContaining({
          loginError: true,
          configError: false,
          setLoginError: expect.any(Function),
          setConfigError: expect.any(Function),
          settingRegistry: mockSettingRegistry,
          app: mockApp
        }),
        expect.anything()
      );
    });

    it('hides the loading spinner and ListNotebookTemplates when an error occurs', async () => {
      mockResolvedConfigCheck({ loggedIn: true, configError: true });

      await renderWidget();

      expect(container.querySelector('[data-testid="loader"]')).toBeNull();
      expect(
        container.querySelector('[data-testid="mock-list-notebook-templates"]')
      ).toBeNull();
    });
  });

  describe('authenticated state', () => {
    it('renders ListNotebookTemplates inside the tablist container when authenticated', async () => {
      mockResolvedConfigCheck({ loggedIn: true });

      await renderWidget();

      expect(container.querySelector('[role="tablist"]')).not.toBeNull();
      expect(
        container.querySelector('[data-testid="mock-list-notebook-templates"]')
      ).not.toBeNull();
    });

    it('forwards app, themeManager, and factory props to ListNotebookTemplates', async () => {
      mockResolvedConfigCheck({ loggedIn: true });

      await renderWidget();

      expect(ListNotebookTemplates).toHaveBeenCalledWith(
        {
          app: mockApp,
          themeManager: mockThemeManager,
          factory: mockFactory
        },
        expect.anything()
      );
    });

    it('hides the loading spinner and LoginErrorComponent when authenticated', async () => {
      mockResolvedConfigCheck({ loggedIn: true });

      await renderWidget();

      expect(container.querySelector('[data-testid="loader"]')).toBeNull();
      expect(
        container.querySelector('[data-testid="mock-login-error"]')
      ).toBeNull();
    });
  });
});
