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

jest.mock('./bigQueryTableInfo', () => ({
  __esModule: true,
  default: ({ title, dataset, projectId }: any) => (
    <div data-testid="table-info-mock">
      {projectId}.{dataset}.{title}
    </div>
  )
}));

jest.mock('./bigQuerySchema', () => ({
  __esModule: true,
  default: ({ column }: any) => (
    <div data-testid="table-schema-mock">columns:{column.length}</div>
  )
}));

jest.mock('./previewDataInfo', () => ({
  __esModule: true,
  default: ({ tableId, dataSetId, projectId, column }: any) => (
    <div data-testid="table-preview-mock">
      {projectId}.{dataSetId}.{tableId}:{column.length}
    </div>
  )
}));

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { BigQueryTableWrapper } from './bigQueryTableInfoWrapper';
import { BigQueryService } from './bigQueryService';

describe('BigQueryTableWrapper', () => {
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

  const renderWidget = async (schemaFields: any[]) => {
    jest
      .spyOn(BigQueryService, 'getBigQuerySchemaInfoAPIService')
      .mockImplementation(
        (_dataset, _table, _projectId, setSchemaInfoResponse) => {
          setSchemaInfoResponse(schemaFields);
          return Promise.resolve();
        }
      );

    const widget = new BigQueryTableWrapper(
      'orders',
      'sales_ds',
      'test-project',
      mockThemeManager
    );
    widget.title.label = 'orders';

    await act(async () => {
      root.render(widget.renderInternal());
    });
    return widget;
  };

  const tabByText = (text: string) =>
    Array.from(container.querySelectorAll('[role="tabpanel"]')).find(
      el => el.textContent?.trim() === text
    ) as HTMLElement;

  it('defaults to Details tab and switches between Schema and Preview tabs when schema exists', async () => {
    await renderWidget([{ name: 'id', type: 'STRING', mode: 'REQUIRED' }]);

    expect(
      BigQueryService.getBigQuerySchemaInfoAPIService
    ).toHaveBeenCalledWith(
      'sales_ds',
      'orders',
      'test-project',
      expect.any(Function)
    );
    expect(tabByText('Details').className).toBe('selected-header');
    expect(tabByText('Schema').className).toBe('unselected-header');
    expect(
      container.querySelector('[data-testid="table-info-mock"]')?.textContent
    ).toBe('test-project.sales_ds.orders');

    await act(async () => {
      tabByText('Schema').click();
    });
    expect(tabByText('Schema').className).toBe('selected-header');
    expect(container.querySelector('.db-title')?.textContent).toBe('Schema');
    expect(
      container.querySelector('[data-testid="table-schema-mock"]')?.textContent
    ).toBe('columns:1');

    await act(async () => {
      tabByText('Preview').click();
    });
    expect(tabByText('Preview').className).toBe('selected-header');
    expect(
      container.querySelector('[data-testid="table-preview-mock"]')?.textContent
    ).toBe('test-project.sales_ds.orders:1');
  });

  it('shows empty schema message and suppresses Preview when schema is empty', async () => {
    await renderWidget([]);

    await act(async () => {
      tabByText('Schema').click();
    });
    expect(container.querySelector('.no-data-style')?.textContent).toBe(
      'No rows to display'
    );

    await act(async () => {
      tabByText('Preview').click();
    });
    expect(
      container.querySelector('[data-testid="table-preview-mock"]')
    ).toBeNull();
  });
});
