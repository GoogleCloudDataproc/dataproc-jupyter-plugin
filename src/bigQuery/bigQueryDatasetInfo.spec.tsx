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
import BigQueryDatasetInfo from './bigQueryDatasetInfo';
import { BigQueryService } from './bigQueryService';

describe('BigQueryDatasetInfo Component', () => {
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

  it('shows loading spinner while dataset details are loading', async () => {
    jest
      .spyOn(BigQueryService, 'getBigQueryDatasetDetailsAPIService')
      .mockImplementation(async () => new Promise(() => undefined));

    await act(async () => {
      root.render(
        <BigQueryDatasetInfo dataset="my_dataset" projectId="test-project" />
      );
    });

    expect(
      BigQueryService.getBigQueryDatasetDetailsAPIService
    ).toHaveBeenCalledWith(
      'my_dataset',
      expect.any(Function),
      'test-project',
      expect.any(Function)
    );
    expect(container.textContent).toContain('Loading dataset details');
    expect(container.querySelector('[data-testid="loader"]')).toBeTruthy();
  });

  it('renders dataset details table once loaded', async () => {
    jest
      .spyOn(BigQueryService, 'getBigQueryDatasetDetailsAPIService')
      .mockImplementation(
        async (_dataset, setDatasetInfo, _projectId, setIsLoading) => {
          setDatasetInfo({
            'Dataset ID': 'test-project:my_dataset',
            'Data location': 'US',
            'Case insensitive': 'true'
          });
          setIsLoading(false);
        }
      );

    await act(async () => {
      root.render(
        <BigQueryDatasetInfo dataset="my_dataset" projectId="test-project" />
      );
    });

    const rows = Array.from(container.querySelectorAll('tbody tr.tr-row'));
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain('Dataset ID');
    expect(rows[0].textContent).toContain('test-project:my_dataset');
    expect(rows[1].textContent).toContain('Data location');
    expect(rows[1].textContent).toContain('US');
    expect(rows[2].textContent).toContain('Case insensitive');
    expect(rows[2].textContent).toContain('true');
  });
});
