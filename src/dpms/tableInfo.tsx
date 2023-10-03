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
import { useTable } from 'react-table';
import { IThemeManager } from '@jupyterlab/apputils';
import { DataprocWidget } from '../controls/DataprocWidget';
interface IColumn {
  name: string;
  type: string;
  mode: string;
  description: string;
}

interface IDatabaseProps {
  title: string;
  dataprocMetastoreServices: string;
  database: string;
  column: IColumn[];
  tableDescription: Record<string, string>;
}
const TableInfo = ({
  title,
  dataprocMetastoreServices,
  database,
  column,
  tableDescription
}: IDatabaseProps): React.JSX.Element => {
  const table = {
    'Table name': title,
    Description: tableDescription[title],
    Database: database,
    'Dataproc Metastore Instance': dataprocMetastoreServices
  };

  const renderColumnTable = () => {
    const columns = React.useMemo(
      () => [
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
      ],
      []
    );

    const data = React.useMemo(() => {
      return column.map((column: IColumn) => ({
        name: column.name,
        type: column.type || '',
        mode: column.mode || '',
        description: column.description
      }));
    }, [column]);

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

  return (
    <div className="dpms-Wrapper">
      <div className="table-info-overlay">
        <div className="title-overlay">{title}</div>
        <div className="db-title">Table info</div>
        <div className="table-container">
          <table className="db-table">
            <tbody>
              {Object.entries(table).map(([key, value], index) => (
                <tr
                  key={key}
                  className={index % 2 === 0 ? 'tr-row-even' : 'tr-row-odd'}
                >
                  <td className="bold-column">{key}</td>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="db-title">Schema</div>
        {renderColumnTable()}
      </div>
    </div>
  );
};

export class Table extends DataprocWidget {
  constructor(
    title: string,
    private dataprocMetastoreServices: string,
    private database: string,
    private column: IColumn[],
    private tableDescription: Record<string, string>,
    themeManager: IThemeManager
  ) {
    super(themeManager);
  }

  renderInternal(): React.JSX.Element {
    return (
      <TableInfo
        title={this.title.label}
        dataprocMetastoreServices={this.dataprocMetastoreServices}
        database={this.database}
        column={this.column}
        tableDescription={this.tableDescription}
      />
    );
  }
}
