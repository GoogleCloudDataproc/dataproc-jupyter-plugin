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

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import BigQueryTableInfo from './bigQueryTableInfo';
import { BigQueryService } from './bigQueryService';

describe('BigQueryTableInfo Component', () => {
  let container: HTMLDivElement;
  let root: Root;

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

  it('shows loading spinner while fetching dataset and table info', async () => {
    jest
      .spyOn(BigQueryService, 'getBigQueryDatasetInfoAPIService')
      .mockImplementation(() => new Promise(() => {}));
    jest
      .spyOn(BigQueryService, 'getBigQueryTableInfoAPIService')
      .mockImplementation(() => new Promise(() => {}));

    await act(async () => {
      root.render(
        <BigQueryTableInfo
          title="events"
          dataset="analytics"
          projectId="test-project"
        />
      );
    });

    expect(
      BigQueryService.getBigQueryDatasetInfoAPIService
    ).toHaveBeenCalledWith('analytics', 'test-project', expect.any(Function));
    expect(BigQueryService.getBigQueryTableInfoAPIService).toHaveBeenCalledWith(
      'events',
      'analytics',
      expect.any(Function),
      {},
      'test-project',
      expect.any(Function)
    );
    expect(container.textContent).toContain('Loading table details');
  });

  it('fetches table info with datasetInfo and renders table details once loaded', async () => {
    jest
      .spyOn(BigQueryService, 'getBigQueryDatasetInfoAPIService')
      .mockImplementation((_dataset, _projectId, setDatasetInfo) => {
        setDatasetInfo({ 'Case insensitive': true });
        return Promise.resolve();
      });

    jest
      .spyOn(BigQueryService, 'getBigQueryTableInfoAPIService')
      .mockImplementation(
        (
          _title,
          _dataset,
          setTableInfo,
          datasetInfo,
          _projectId,
          setIsLoading
        ) => {
          if (datasetInfo['Case insensitive']) {
            setTableInfo({
              'Table ID': 'test-project:analytics.events',
              'Data location': 'US',
              'Case insensitive': 'true'
            });
            setIsLoading(false);
          }
          return Promise.resolve();
        }
      );

    await act(async () => {
      root.render(
        <BigQueryTableInfo
          title="events"
          dataset="analytics"
          projectId="test-project"
        />
      );
    });

    expect(container.querySelector('.db-title')?.textContent).toBe(
      'Table info'
    );
    const rows = Array.from(container.querySelectorAll('tbody tr.tr-row'));
    expect(rows).toHaveLength(3);
    const getRowValue = (label: string) => {
      const row = rows.find(
        r => r.querySelector('.bold-column')?.textContent === label
      );
      return row?.querySelectorAll('td')[1]?.textContent;
    };
    expect(getRowValue('Table ID')).toBe('test-project:analytics.events');
    expect(getRowValue('Data location')).toBe('US');
    expect(getRowValue('Case insensitive')).toBe('true');
  });
});
