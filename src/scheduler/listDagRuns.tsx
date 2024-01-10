import React, { useEffect, useState } from 'react';
import { useTable, useGlobalFilter, usePagination } from 'react-table';
import { ClipLoader } from 'react-spinners';
import TableData from '../utils/tableData';
// import { PaginationView } from '../utils/paginationView';
import { ICellProps } from '../utils/utils';
import { SchedulerService } from './schedulerServices';

const ListDagRuns = ({
  composerName,
  dagId,
  startDate,
  endDate
}: {
  composerName: string;
  dagId: string;
  startDate: string;
  endDate: string;
}): JSX.Element => {
  const [dagRunsList, setDagRunsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const data = dagRunsList;
  const columns = React.useMemo(
    () => [
      {
        Header: 'State',
        accessor: 'state'
      },
      {
        Header: 'Date',
        accessor: 'date'
      },
      {
        Header: 'Time',
        accessor: 'time'
      }
    ],
    []
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    page
    // canPreviousPage,
    // canNextPage,
    // nextPage,
    // previousPage,
    // setPageSize,
    // state: { pageIndex, pageSize }
  } = useTable(
    //@ts-ignore react-table 'columns' which is declared here on type 'TableOptions<ICluster>'
    { columns, data, autoResetPage: false, initialState: { pageSize: 50 } },
    useGlobalFilter,
    usePagination
  );

  const tableDataCondition = (cell: ICellProps) => {
    return (
      <td {...cell.getCellProps()} className="notebook-template-table-data">
        {cell.render('Cell')}
      </td>
    );
  };

  const listDagRunsList = async () => {
    await SchedulerService.listDagRunsListService(
      composerName,
      dagId,
      startDate,
      endDate,
      setDagRunsList,
      setIsLoading
    );
  };

  useEffect(() => {
    listDagRunsList();
  }, [startDate, endDate]);

  return (
    <div>
      <>
        {dagRunsList.length > 0 ? (
          <div>
            <div className="dag-runs-list-table-parent">
              <TableData
                getTableProps={getTableProps}
                headerGroups={headerGroups}
                getTableBodyProps={getTableBodyProps}
                isLoading={isLoading}
                rows={rows}
                page={page}
                prepareRow={prepareRow}
                tableDataCondition={tableDataCondition}
                fromPage="Dag Runs"
              />
              {/* {dagRunsList.length > 50 && (
                <PaginationView
                  pageSize={pageSize}
                  setPageSize={setPageSize}
                  pageIndex={pageIndex}
                  allData={dagRunsList}
                  previousPage={previousPage}
                  nextPage={nextPage}
                  canPreviousPage={canPreviousPage}
                  canNextPage={canNextPage}
                />
              )} */}
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
                Loading Dag Runs
              </div>
            )}
            {!isLoading && (
              <div className="no-data-style">No rows to display</div>
            )}
          </div>
        )}
      </>
    </div>
  );
};

export default ListDagRuns;
