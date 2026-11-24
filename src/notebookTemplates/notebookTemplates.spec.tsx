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

jest.mock('../utils/utils', () => ({
  checkConfig: jest.fn()
}));

const mockListNotebookTemplatesProps = jest.fn();
jest.mock('./listNotebookTemplates', () => ({
  __esModule: true,
  default: (props: any) => {
    mockListNotebookTemplatesProps(props);
    return (
      <div data-testid="mock-list-notebook-templates">
        Mock ListNotebookTemplates
      </div>
    );
  }
}));

const mockLoginErrorProps = jest.fn();
jest.mock('../utils/loginErrorComponent', () => ({
  __esModule: true,
  default: (props: any) => {
    mockLoginErrorProps(props);
    return (
      <div data-testid="mock-login-error">
        LoginError: {String(props.loginError)}, ConfigError:{' '}
        {String(props.configError)}
      </div>
    );
  }
}));

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { NotebookTemplates } from './notebookTemplates';
import { checkConfig } from '../utils/utils';

describe('NotebookTemplates Widget and NotebookTemplatesComponent', () => {
  let container: HTMLDivElement;
  let root: Root;

  const mockApp: any = { id: 'mock-app' };
  const mockFactory: any = { id: 'mock-factory' };
  const mockSettingRegistry: any = { id: 'mock-settings' };
  const mockThemeManager: any = {
    theme: 'JupyterLab Light',
    isLight: jest.fn().mockReturnValue(true),
    themeChanged: {
      connect: jest.fn(),
      disconnect: jest.fn()
    }
  };

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
      mockResolvedConfigCheck({ loginError: true });

      await renderWidget();

      const errorEl = container.querySelector(
        '[data-testid="mock-login-error"]'
      );
      expect(errorEl).not.toBeNull();
      expect(errorEl?.textContent).toContain('LoginError: true');
    });

    it('renders LoginErrorComponent when checkConfig reports configError', async () => {
      mockResolvedConfigCheck({ configError: true });

      await renderWidget();

      const errorEl = container.querySelector(
        '[data-testid="mock-login-error"]'
      );
      expect(errorEl).not.toBeNull();
      expect(errorEl?.textContent).toContain('ConfigError: true');
    });

    it('forwards app, settingRegistry, error flags, and setters to LoginErrorComponent', async () => {
      mockResolvedConfigCheck({ loginError: true, configError: false });

      await renderWidget();

      expect(mockLoginErrorProps).toHaveBeenCalledWith(
        expect.objectContaining({
          loginError: true,
          configError: false,
          setLoginError: expect.any(Function),
          setConfigError: expect.any(Function),
          settingRegistry: mockSettingRegistry,
          app: mockApp
        })
      );
    });

    it('hides the loading spinner and ListNotebookTemplates when an error occurs', async () => {
      mockResolvedConfigCheck({ configError: true });

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

      expect(mockListNotebookTemplatesProps).toHaveBeenCalledWith({
        app: mockApp,
        themeManager: mockThemeManager,
        factory: mockFactory
      });
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
