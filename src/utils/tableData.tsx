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

import React, { useState } from 'react';
import { ClipLoader } from 'react-spinners';
import { Cell, Row } from 'react-table';

function TableData({
  getTableProps,
  headerGroups,
  getTableBodyProps,
  isLoading,
  rows,
  page,
  prepareRow,
  tableDataCondition,
  fromPage,
  setDagRunId,
  selectedDagIndex
}: any) {
  const [selectedRowIndex, setSelectedRowIndex] = useState(selectedDagIndex);

  const displayData = page ? page : rows;

  const handleRowClicked = (row: any, index: number) => {
    if (parseInt(row.id) === index) {
      setSelectedRowIndex(index);
      if (fromPage === 'Dag Runs') {
        setDagRunId(row?.original?.dagRunId);
      }
    }
  };

  return (
    <table {...getTableProps()} className="clusters-list-table">
      <thead className="scroll-fix-header">
        {headerGroups.map((headerGroup: any) => (
          <tr
            {...headerGroup.getHeaderGroupProps()}
            className="cluster-list-table-header"
          >
            {headerGroup.headers.map((column: any) => (
              <th
                {...column.getHeaderProps()}
                className="clusters-table-header"
              >
                {column.render('Header')}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody
        {...getTableBodyProps()}
        className={
          fromPage === 'Dag Runs'
            ? 'dag-runs-table-body'
            : 'clusters-table-body'
        }
      >
        {isLoading ? (
          <div className="spin-loader">
            <ClipLoader
              color="#3367d6"
              loading={true}
              size={18}
              aria-label="Loading Spinner"
              data-testid="loader"
            />
            Loading {fromPage}
          </div>
        ) : (
          displayData.map((row: Row, index: number) => {
            prepareRow(row);
            return (
              <tr
                {...row.getRowProps()}
                className={
                  fromPage === 'Dag Runs'
                    ? selectedRowIndex === index
                      ? 'dag-runs-row-data-parent-selected'
                      : 'dag-runs-row-data-parent'
                    : 'cluster-list-data-parent'
                }
                onClick={() => handleRowClicked(row, index)}
              >
                {row.cells.map((cell: Cell) => {
                  return tableDataCondition(cell);
                })}
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

export default TableData;
