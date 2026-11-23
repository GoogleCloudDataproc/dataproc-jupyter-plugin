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

jest.mock('../utils/previewPaginationView', () => ({
  PreviewPaginationView: ({
    pageIndex,
    pageSize,
    totalRowSize,
    onPageChange,
    setPageSize
  }: any) => (
    <div data-testid="preview-pagination-mock">
      <span>
        page:{pageIndex}|size:{pageSize}|total:{totalRowSize}
      </span>
      <button onClick={() => onPageChange(pageIndex + 1)}>NextPage</button>
      <button onClick={() => setPageSize(100)}>Size100</button>
    </div>
  )
}));

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import PreviewDataInfo from './previewDataInfo';
import { BigQueryService } from './bigQueryService';

describe('PreviewDataInfo Component', () => {
  let container: HTMLDivElement;
  let root: Root;
  const columns = [{ name: 'id INT64' }, { name: 'name STRING' }];

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

  it('shows loading spinner initially and "No rows to display" when preview is empty', async () => {
    let finishFetch: () => void = () => {};
    jest.spyOn(BigQueryService, 'bigQueryPreviewAPIService').mockImplementation(
      (
        _cols,
        _t,
        _d,
        setIsLoading,
        _p,
        _ps,
        _pi,
        setTotalRowSize,
        setPreviewDataList
      ) =>
        new Promise<void>(resolve => {
          finishFetch = () => {
            setTotalRowSize('0');
            setPreviewDataList([]);
            setIsLoading(false);
            resolve();
          };
        })
    );

    await act(async () => {
      root.render(
        <PreviewDataInfo
          column={columns}
          tableId="orders"
          dataSetId="sales"
          projectId="test-project"
        />
      );
    });

    expect(container.textContent).toContain('Loading Preview Data');

    await act(async () => {
      finishFetch();
    });
    expect(container.textContent).toContain('No rows to display');
  });

  it('renders preview rows with null fallback and handles pagination updates', async () => {
    const previewSpy = jest
      .spyOn(BigQueryService, 'bigQueryPreviewAPIService')
      .mockImplementation(
        async (
          _cols,
          _t,
          _d,
          setIsLoading,
          _p,
          _pageSize,
          pageIndex,
          setTotalRowSize,
          setPreviewDataList
        ) => {
          setTotalRowSize('120');
          setPreviewDataList([
            { id: `row-${pageIndex}`, name: pageIndex === 0 ? null : 'Alice' }
          ]);
          setIsLoading(false);
        }
      );

    await act(async () => {
      root.render(
        <PreviewDataInfo
          column={columns}
          tableId="orders"
          dataSetId="sales"
          projectId="test-project"
        />
      );
    });

    expect(previewSpy).toHaveBeenCalledWith(
      [
        { Header: 'id', accessor: 'id' },
        { Header: 'name', accessor: 'name' }
      ],
      'orders',
      'sales',
      expect.any(Function),
      'test-project',
      50,
      0,
      expect.any(Function),
      expect.any(Function)
    );
    expect(container.textContent).toContain('row-0');
    expect(container.textContent).toContain('null');
    expect(
      container.querySelector('[data-testid="preview-pagination-mock"]')
        ?.textContent
    ).toContain('page:0|size:50|total:120');

    const nextBtn = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent === 'NextPage'
    ) as HTMLButtonElement;
    await act(async () => {
      nextBtn.click();
    });

    expect(previewSpy).toHaveBeenLastCalledWith(
      expect.any(Array),
      'orders',
      'sales',
      expect.any(Function),
      'test-project',
      50,
      1,
      expect.any(Function),
      expect.any(Function)
    );
    expect(container.textContent).toContain('row-1');
    expect(container.textContent).toContain('Alice');

    const sizeBtn = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent === 'Size100'
    ) as HTMLButtonElement;
    await act(async () => {
      sizeBtn.click();
    });

    expect(previewSpy).toHaveBeenLastCalledWith(
      expect.any(Array),
      'orders',
      'sales',
      expect.any(Function),
      'test-project',
      100,
      1,
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('cleans up resize event listener on unmount', async () => {
    const removeSpy = jest.spyOn(window, 'removeEventListener');
    jest
      .spyOn(BigQueryService, 'bigQueryPreviewAPIService')
      .mockImplementation(
        async (
          _c,
          _t,
          _d,
          setIsLoading,
          _p,
          _ps,
          _pi,
          setTotalRowSize,
          setPreviewDataList
        ) => {
          setTotalRowSize('1');
          setPreviewDataList([{ id: '1', name: 'Bob' }]);
          setIsLoading(false);
        }
      );

    await act(async () => {
      root.render(
        <PreviewDataInfo
          column={columns}
          tableId="orders"
          dataSetId="sales"
          projectId="test-project"
        />
      );
    });

    act(() => {
      root.unmount();
    });
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
