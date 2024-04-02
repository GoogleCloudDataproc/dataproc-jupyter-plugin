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

import React from 'react';
import { useTable } from 'react-table';

interface IColumn {
  name: string;
  type: string;
  mode: string;
  description: string;
}

const SchemaInfo = ({ column }: any) => {
  const columns = [
    {
      Header: 'Field name',
      accessor: 'name'
    },
    {
      Header: 'Type',
      accessor: 'type'
    },
    {
      Header: 'Mode',
      accessor: 'mode'
    },
    {
      Header: 'Description',
      accessor: 'description'
    }
  ];

  const data = column.map((column: IColumn) => ({
    name: column.name,
    type: column.type || '',
    mode: column.mode || '',
    description: column.description
  }));

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    // @ts-ignore  react-table 'columns' which is declared here on type 'TableOptions<IColumns>'
    useTable({ columns, data });

  return (
    <div className="dpms-Wrapper">
      <div className="table-container">
        <table className="schema-table" {...getTableProps()}>
          <thead>
            {headerGroups.map(headerGroup => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map(column => (
                  <th {...column.getHeaderProps()}>
                    {column.render('Header')}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()}>
            {rows.map(row => {
              prepareRow(row);
              return (
                <tr {...row.getRowProps()}>
                  {row.cells.map((cell, index) => {
                    return (
                      <td
                        className={index === 0 ? 'bold-column' : ''}
                        {...cell.getCellProps()}
                      >
                        {cell.render('Cell')}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SchemaInfo;
