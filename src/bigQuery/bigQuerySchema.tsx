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
import { useTable } from 'react-table';
import { handleDebounce } from '../utils/utils';

interface IColumn {
  name: string;
  type: string;
  mode: string;
  key?: string;
  collation?: string;
  defaultValue?: string;
  policyTags?: string;
  dataPolicies?: string;
  description?: string;
}

const BigQuerySchemaInfo = ({ column }: { column: IColumn[] }) => {
  const [height, setHeight] = useState(window.innerHeight - 250);

  function handleUpdateHeight() {
    const updateHeight = window.innerHeight - 250;
    setHeight(updateHeight);
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
      Header: 'Key',
      accessor: 'key'
    },
    {
      Header: 'Collation',
      accessor: 'collation'
    },
    {
      Header: 'Default Value',
      accessor: 'defaultValue'
    },
    {
      Header: 'Policy Tags',
      accessor: 'policyTags '
    },
    {
      Header: 'Data Policies',
      accessor: 'dataPolicies'
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
    key: column.key || '',
    collation: column.collation || '',
    defaultValue: column.defaultValue || '',
    policyTags: column.policyTags || '',
    dataPolicies: column.dataPolicies || '',
    description: column.description
  }));

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    // @ts-ignore  react-table 'columns' which is declared here on type 'TableOptions<IColumns>'
    useTable({ columns, data });

  return (
    <div className="big-query-schema-wrapper" style={{ height: height }}>
      <div className="big-query-schema-table-container">
        <table className="big-query-schema-table" {...getTableProps()}>
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

export default BigQuerySchemaInfo;
