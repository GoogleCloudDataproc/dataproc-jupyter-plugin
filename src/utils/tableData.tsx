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

import React from 'react';
import { ClipLoader } from 'react-spinners';

function TableData({
  getTableProps,
  headerGroups,
  getTableBodyProps,
  isLoading,
  rows,
  prepareRow,
  tableDataCondition,
  fromPage
}: any) {
  return (
    <table {...getTableProps()} className="clusters-list-table">
      <thead>
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
      <tbody {...getTableBodyProps()} className="clusters-table-body">
        {isLoading ? (
          <div className="spin-loader">
            <ClipLoader
              color="#8A8A8A"
              loading={true}
              size={18}
              aria-label="Loading Spinner"
              data-testid="loader"
            />
            Loading {fromPage}
          </div>
        ) : (
          rows.map((row: any) => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()} className="cluster-list-data-parent">
                {row.cells.map((cell: any) => {
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
