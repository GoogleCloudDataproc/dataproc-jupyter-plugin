/**
 * @license
 * Copyright 2024 Google LLC
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

import React, { useEffect, useState } from 'react';
import { useGlobalFilter, usePagination, useTable } from 'react-table';
import TableData from '../utils/tableData';
import { BigQueryService } from './bigQueryService';
import { ICellProps, handleDebounce } from '../utils/utils';
import { PreviewPaginationView } from '../utils/previewPaginationView';
import { CircularProgress } from '@mui/material';

const PreviewDataInfo = ({ column, tableId, dataSetId, projectId }: any) => {
  const [previewDataList, setPreviewDataList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalRowSize, setTotalRowSize] = useState('');

  const [pageIndex, setPageIndex] = useState(0);

  const [previewHeight, setPreviewHeight] = useState(window.innerHeight - 180);

  function handleUpdateHeight() {
    let updateHeight = window.innerHeight - 180;
    setPreviewHeight(updateHeight);
  }

  // Debounce the handleUpdateHeight function
  const debouncedHandleUpdateHeight = handleDebounce(handleUpdateHeight, 500);

  // Add event listener for window resize using useEffect
  useEffect(() => {
    window.addEventListener('resize', debouncedHandleUpdateHeight);

    // Cleanup function to remove event listener on component unmount
    return () => {
      window.removeEventListener('resize', debouncedHandleUpdateHeight);
    };
  }, []);

  const data = previewDataList;

  const columns = React.useMemo(
    () =>
      column.map((column: any) => ({
        Header: column.name.split(' ')[0],
        accessor: column.name.split(' ')[0]
      })),
    []
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    page,
    setPageSize,
    state: { pageSize }
  } = useTable(
    {
      columns,
      data,
      autoResetPage: false,
      initialState: { pageSize: 50, pageIndex: 0 }
    },
    useGlobalFilter,
    usePagination
  );

  useEffect(() => {
    BigQueryService.bigQueryPreviewAPIService(
      columns,
      tableId,
      dataSetId,
      setIsLoading,
      projectId,
      pageSize,
      pageIndex,
      setTotalRowSize,
      setPreviewDataList
    );
  }, [pageSize, pageIndex]);

  const tableDataCondition = (cell: ICellProps) => {
    return (
      <td {...cell.getCellProps()} className="preview-table-data">
        {cell.value === null ? 'null' : cell.render('Cell')}
      </td>
    );
  };

  const handlePageChange = (newPageIndex: number) => {
    setPageIndex(newPageIndex);
  };

  return (
    <div>
      {previewDataList.length > 0 ? (
        <div>
          <div
            className="preview-data-table-parent"
            style={{ height: previewHeight }}
          >
            <TableData
              getTableProps={getTableProps}
              headerGroups={headerGroups}
              getTableBodyProps={getTableBodyProps}
              isLoading={isLoading}
              rows={rows}
              page={page}
              prepareRow={prepareRow}
              tableDataCondition={tableDataCondition}
              fromPage="Preview"
            />
            {Number(totalRowSize) >= 50 && (
              <PreviewPaginationView
                pageSize={pageSize}
                setPageSize={setPageSize}
                pageIndex={pageIndex}
                totalRowSize={totalRowSize}
                canPreviousPage={pageIndex !== 0}
                canNextPage={
                  pageIndex !== Math.floor(Number(totalRowSize) / pageSize)
                }
                onPageChange={handlePageChange}
              />
            )}
          </div>
        </div>
      ) : (
        <div>
          {isLoading && (
            <div className="spin-loader-main">
              <CircularProgress
                className="spin-loader-custom-style"
                size={18}
                aria-label="Loading Spinner"
                data-testid="loader"
              />
              Loading Preview Data
            </div>
          )}
          {!isLoading && (
            <div className="no-data-style">No rows to display</div>
          )}
        </div>
      )}
    </div>
  );
};

export default PreviewDataInfo;
