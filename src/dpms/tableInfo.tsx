import React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { useTable } from 'react-table';
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
}
const TableInfo = ({
  title,
  dataprocMetastoreServices,
  database,
  column
}: IDatabaseProps): React.JSX.Element => {
  const table = {
    'Table name': title,
    Description: 'description text goes here',
    'By column name': 'lorem ipsum',
    'By Database': database,
    'By Dataproc Metastore Instance': dataprocMetastoreServices
  };

  // const schema = [
  //   {
  //     name: 'column1',
  //     type: 'string',
  //     mode: 'nullable',
  //     description: 'Description for column1'
  //   },
  //   {
  //     name: 'column2',
  //     type: 'integer',
  //     mode: 'required',
  //     description: 'Description for column2'
  //   }
  //   // Add more columns as needed
  // ];

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
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      useTable({ columns, data });

    return (
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
                <tr
                  {...row.getRowProps()}
                  //   className={row.index % 2 === 0 ? 'tr-row-even' : 'tr-row-odd'}
                >
                  {row.cells.map((cell, index) => {
                    return (
                      <td
                        className={`schema-td ${
                          index === 0 ? 'bold-column' : ''
                        }`}
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
    );
  };

  return (
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
                <td>{key}</td>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="db-title">Schema</div>
      {renderColumnTable()}
    </div>
  );
};

export class Table extends ReactWidget {
  dataprocMetastoreServices: string;
  database!: string;
  column: IColumn[];

  constructor(
    title: string,
    dataprocMetastoreServices: string,
    database: string,
    column: IColumn[]
  ) {
    super();
    this.addClass('jp-ReactWidget');
    this.dataprocMetastoreServices = dataprocMetastoreServices;
    this.database = database;
    this.column = column;
  }

  render(): React.JSX.Element {
    return (
      <TableInfo
        title={this.title.label}
        dataprocMetastoreServices={this.dataprocMetastoreServices}
        database={this.database}
        column={this.column}
      />
    );
  }
}
