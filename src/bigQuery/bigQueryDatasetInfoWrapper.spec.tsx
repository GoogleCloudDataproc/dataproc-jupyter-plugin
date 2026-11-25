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

jest.mock('./bigQueryDatasetInfo', () => ({
  __esModule: true,
  default: ({ dataset, projectId }: any) => (
    <div data-testid="bq-dataset-info-mock">
      {dataset}:{projectId}
    </div>
  )
}));

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { BigQueryDatasetWrapper } from './bigQueryDatasetInfoWrapper';

describe('BigQueryDatasetWrapper', () => {
  let container: HTMLDivElement;
  let root: Root;
  let mockThemeManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockThemeManager = {
      theme: 'JupyterLab Light',
      isLight: jest.fn(() => true),
      themeChanged: {
        connect: jest.fn(),
        disconnect: jest.fn()
      }
    };
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    jest.restoreAllMocks();
  });

  it('sets widget title and renders Dataset info wrapper with BigQueryDatasetInfo', async () => {
    const widget = new BigQueryDatasetWrapper(
      'analytics_ds',
      'test-project',
      mockThemeManager
    );

    try {
      expect(widget.title.label).toBe('analytics_ds');

      await act(async () => {
        root.render(widget.renderInternal());
      });

      expect(container.querySelector('.title-overlay')?.textContent).toBe(
        'analytics_ds'
      );
      expect(container.querySelector('.db-title')?.textContent).toBe(
        'Dataset info'
      );
      expect(
        container.querySelector('[data-testid="bq-dataset-info-mock"]')
          ?.textContent
      ).toBe('analytics_ds:test-project');
    } finally {
      widget.dispose();
    }
    expect(mockThemeManager.themeChanged.disconnect).toHaveBeenCalled();
  });
});
