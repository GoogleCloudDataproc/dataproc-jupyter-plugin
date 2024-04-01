/**
 * @license
 * Copyright 2023 Google LLC
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
import { ClipLoader } from 'react-spinners';
import { useGlobalFilter, usePagination, useTable } from 'react-table';
import { PaginationView } from '../utils/paginationView';
import TableData from '../utils/tableData';
import { BigQueryService } from './bigQueryService';
import { ICellProps } from '../utils/utils';

const PreviewDataInfo = ({ column, tableId, dataSetId }: any) => {
  const [previewDataList, setPreviewDataList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const data = previewDataList;

  const columns = React.useMemo(
    () =>
      column.map((column: any) => ({
        Header: column.name.split(' ')[0],
        accessor: column.name.split(' ')[0]
      })),
    []
  );

  const bigQueryPreviewAPI = async () => {
    await BigQueryService.bigQueryPreviewAPIService(
      columns,
      tableId,
      dataSetId,
      setIsLoading,
      setPreviewDataList
    );
  };

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize }
  } = useTable(
    { columns, data, autoResetPage: false, initialState: { pageSize: 50 } },
    useGlobalFilter,
    usePagination
  );

  useEffect(() => {
    bigQueryPreviewAPI();
  }, []);

  const tableDataCondition = (cell: ICellProps) => {
    return (
      <td {...cell.getCellProps()} className="preview-table-data">
        {cell.value === null ? 'null' : cell.render('Cell')}
      </td>
    );
  };

  return (
    <div>
      {previewDataList.length > 0 ? (
        <div>
          <div className="preview-data-table-parent">
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
            {previewDataList.length > 50 && (
              <PaginationView
                pageSize={pageSize}
                setPageSize={setPageSize}
                pageIndex={pageIndex}
                allData={previewDataList}
                previousPage={previousPage}
                nextPage={nextPage}
                canPreviousPage={canPreviousPage}
                canNextPage={canNextPage}
              />
            )}
          </div>
        </div>
      ) : (
        <div>
          {isLoading && (
            <div className="spin-loader-main">
              <ClipLoader
                color="#3367d6"
                loading={true}
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
