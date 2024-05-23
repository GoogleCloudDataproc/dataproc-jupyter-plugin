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

import { CircularProgress } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Cell, Row } from 'react-table';
import { handleDebounce } from './utils';

function TableData({
  getTableProps,
  headerGroups,
  getTableBodyProps,
  isLoading,
  rows,
  page,
  prepareRow,
  tableDataCondition,
  fromPage
}: any) {
  const [listDagRunHeight, setListDagRunHeight] = useState(
    window.innerHeight - 505
  );

  function handleUpdateHeight() {
    let updateHeight = window.innerHeight - 505;
    setListDagRunHeight(updateHeight);
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

  const displayData = page ? page : rows;

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
        className={'clusters-table-body'}
        style={fromPage === 'Dag Runs' ? { maxHeight: listDagRunHeight } : null}
      >
        {isLoading ? (
          <div
            className={
              fromPage === 'Preview'
                ? 'spin-loader-preview-data'
                : 'spin-loader'
            }
          >
            <CircularProgress
              className="spin-loader-custom-style"
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
              <tr {...row.getRowProps()} className={'cluster-list-data-parent'}>
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
