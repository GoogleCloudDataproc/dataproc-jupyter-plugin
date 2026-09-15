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
import SettingsLayout from './settingsLayout';

jest.mock('./common', () => () => (
  <div data-testid="mock-common-view">Common Settings View</div>
));

jest.mock('../runtimeProfile/runtimeProfileList', () => () => (
  <div data-testid="mock-runtime-profile-list">Runtime Profile List View</div>
));

describe('SettingsLayout Component', () => {
  let container: HTMLDivElement;
  let root: Root;

  const mockThemeManager: any = {
    theme: 'JupyterLab Light',
    isLight: () => true,
    themeChanged: {
      connect: jest.fn(),
      disconnect: jest.fn()
    }
  };

  beforeEach(() => {
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

  it('should render sidebar tabs and default to Common tab', () => {
    act(() => {
      root.render(
        <SettingsLayout
          configError={false}
          setConfigError={jest.fn()}
          themeManager={mockThemeManager}
        />
      );
    });

    expect(container.textContent).toContain('Google Cloud Settings');
    expect(container.textContent).toContain('Common');
    expect(container.textContent).toContain('Spark');
    expect(container.textContent).toContain('Common Settings View');
    expect(container.textContent).not.toContain('Runtime Profile List View');
  });

  it('should switch to Spark tab when clicked and render RuntimeProfileList', () => {
    act(() => {
      root.render(
        <SettingsLayout
          configError={false}
          setConfigError={jest.fn()}
          themeManager={mockThemeManager}
        />
      );
    });

    const tabs = container.querySelectorAll('.settings-tab');
    const sparkTab = Array.from(tabs).find(tab =>
      tab.textContent?.includes('Spark')
    ) as HTMLElement;

    expect(sparkTab).toBeDefined();

    act(() => {
      sparkTab.click();
    });

    expect(sparkTab.classList.contains('active')).toBe(true);
    expect(container.textContent).toContain('Runtime Profile List View');
    expect(container.textContent).not.toContain('Common Settings View');
  });

  it('should switch back to Common tab when clicked', () => {
    act(() => {
      root.render(
        <SettingsLayout
          configError={false}
          setConfigError={jest.fn()}
          themeManager={mockThemeManager}
        />
      );
    });

    const tabs = container.querySelectorAll('.settings-tab');
    const sparkTab = Array.from(tabs).find(tab =>
      tab.textContent?.includes('Spark')
    ) as HTMLElement;
    const commonTab = Array.from(tabs).find(tab =>
      tab.textContent?.includes('Common')
    ) as HTMLElement;

    act(() => {
      sparkTab.click();
    });
    expect(container.textContent).toContain('Runtime Profile List View');

    act(() => {
      commonTab.click();
    });
    expect(commonTab.classList.contains('active')).toBe(true);
    expect(container.textContent).toContain('Common Settings View');
    expect(container.textContent).not.toContain('Runtime Profile List View');
  });
});
