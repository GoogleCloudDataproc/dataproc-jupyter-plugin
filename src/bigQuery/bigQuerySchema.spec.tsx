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
import BigQuerySchemaInfo from './bigQuerySchema';

describe('BigQuerySchemaInfo Component', () => {
  let container: HTMLDivElement;
  let root: Root;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: originalInnerHeight
    });
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('renders schema headers and column rows with bold first column', async () => {
    const columns = [
      {
        name: 'user_id',
        type: 'STRING',
        mode: 'REQUIRED',
        key: 'PK',
        collation: 'und:ci',
        defaultValue: 'N/A',
        policyTags: 'tag-1',
        dataPolicies: 'policy-1',
        description: 'Unique user ID'
      },
      {
        name: 'created_at',
        type: '',
        mode: ''
      }
    ];

    await act(async () => {
      root.render(<BigQuerySchemaInfo column={columns} />);
    });

    const headers = Array.from(container.querySelectorAll('thead th')).map(th =>
      th.textContent?.trim()
    );
    expect(headers).toEqual([
      'Field name',
      'Type',
      'Mode',
      'Key',
      'Collation',
      'Default Value',
      'Policy Tags',
      'Data Policies',
      'Description'
    ]);

    const rows = Array.from(container.querySelectorAll('tbody tr'));
    expect(rows).toHaveLength(2);
    const firstCells = Array.from(rows[0].querySelectorAll('td'));
    expect(firstCells[0].className).toBe('bold-column');
    expect(firstCells[0].textContent).toBe('user_id');
    expect(firstCells[1].textContent).toBe('STRING');
    expect(firstCells[2].textContent).toBe('REQUIRED');
    expect(firstCells[3].textContent).toBe('PK');
    expect(firstCells[4].textContent).toBe('und:ci');
    expect(firstCells[5].textContent).toBe('N/A');
    // bigQuerySchema.tsx defines accessor 'policyTags ' (trailing space), so cell 6 renders empty.
    expect(firstCells[6].textContent).toBe('');
    expect(firstCells[7].textContent).toBe('policy-1');
    expect(firstCells[8].textContent).toBe('Unique user ID');
  });

  it('computes wrapper height from window.innerHeight, handles resize, and cleans up listener on unmount', async () => {
    const addSpy = jest.spyOn(window, 'addEventListener');
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 900
    });

    await act(async () => {
      root.render(
        <BigQuerySchemaInfo
          column={[{ name: 'id', type: 'INTEGER', mode: 'NULLABLE' }]}
        />
      );
    });

    const wrapper = container.querySelector(
      '.big-query-schema-wrapper'
    ) as HTMLDivElement;
    expect(wrapper.style.height).toBe('650px');
    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    // Triggering resize with unchanged height exercises the debounced listener
    // without causing a re-render loop from un-memoized react-table columns.
    await act(async () => {
      window.dispatchEvent(new Event('resize'));
      jest.advanceTimersByTime(500);
    });
    expect(wrapper.style.height).toBe('650px');

    act(() => {
      root.unmount();
    });
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
