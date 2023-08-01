// import React from 'react';
// import { ReactWidget } from '@jupyterlab/apputils';
// const TableInfo = ({ title }: { title: any }): React.JSX.Element => {
//   //   return (
//   //     <div>
//   //       <div className="lm-Widget p-Widget jp-Toolbar jp-Toolbar-micro">
//   //         {title._label}
//   //       </div>
//   //       <div className="db-title">database info</div>
//   //     </div>
//   //   );
//   // };
//   const table = {
//     'Table name': 'dataproc-public-data.american_health_ranking.ahr',
//     Description: 'description text goes here',
//     'By column name': 'lorem ipsum',
//     'By Database': 'lorem ipsum',
//     'By Dataproc Metastore Instance': 'Lorem ipsum'
//   };

//   // Render the JSON object in a React table
//   const renderTable = () => {
//     return (
//       <div className="table-container">
//         <table className="db-table">
//           <tbody>
//             {Object.entries(table).map(([key, value], index) => (
//               <tr
//                 key={key}
//                 className={index % 2 === 0 ? 'tr-row-even' : 'tr-row-odd'} // Apply different classes to even and odd rows
//               >
//                 <td>{key}</td>
//                 <td>{value}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     );
//   };

//   return (
//     <div>
//       <div className="lm-Widget p-Widget jp-Toolbar jp-Toolbar-micro">
//         {title._label}
//       </div>
//       <div className="db-title">Table info</div>
//       {renderTable()}
//       <div className="db-title">Schema</div>
//       {renderColumnTable(table)}
//     </div>
//   );
// };

// export class Table extends ReactWidget {
//   constructor(title: string) {
//     super();
//     this.addClass('jp-ReactWidget');
//   }

//   render(): React.JSX.Element {
//     return <TableInfo title={this.title} />;
//   }
// }
import React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { useTable } from 'react-table';

const TableInfo = ({ title }: { title: any }): React.JSX.Element => {
  const table = {
    'Table name': 'dataproc-public-data.american_health_ranking.ahr',
    Description: 'description text goes here',
    'By column name': 'lorem ipsum',
    'By Database': 'lorem ipsum',
    'By Dataproc Metastore Instance': 'Lorem ipsum'
  };

  const schema = [
    {
      name: 'column1',
      type: 'string',
      mode: 'nullable',
      description: 'Description for column1'
    },
    {
      name: 'column2',
      type: 'integer',
      mode: 'required',
      description: 'Description for column2'
    }
    // Add more columns as needed
  ];

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

    const data = React.useMemo(() => schema, [schema]);

    const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      useTable({ columns, data });

    return (
      <div className="table-container">
        <table className="db-table" {...getTableProps()}>
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
                  {row.cells.map(cell => {
                    return (
                      <td className="schema-td" {...cell.getCellProps()}>
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
    <div>
      <div className="lm-Widget p-Widget jp-Toolbar jp-Toolbar-micro">
        {title._label}
      </div>
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
  constructor(title: string) {
    super();
    this.addClass('jp-ReactWidget');
  }

  render(): React.JSX.Element {
    return <TableInfo title={this.title} />;
  }
}
