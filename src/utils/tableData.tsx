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
