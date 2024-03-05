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

import React, { useEffect, useState } from 'react';
import { useTable, useGlobalFilter, usePagination } from 'react-table';
import { ClipLoader } from 'react-spinners';
import TableData from '../utils/tableData';
import { ICellProps } from '../utils/utils';
import { SchedulerService } from './schedulerServices';
import { Dayjs } from 'dayjs';

interface IDagRunList {
  dagRunId: string;
  filteredDate: Date;
  state: string;
  date: Date;
  time: string;
}

const ListDagRuns = ({
  composerName,
  dagId,
  startDate,
  endDate,
  setDagRunId,
  selectedDate,

  setBlueListDates,
  setGreyListDates,
  setOrangeListDates,
  setRedListDates,
  setGreenListDates,
  setDarkGreenListDates
}: {
  composerName: string;
  dagId: string;
  startDate: string;
  endDate: string;
  setDagRunId: (value: string) => void;
  selectedDate: Dayjs | null;

  setBlueListDates: (value: string[]) => void;
  setGreyListDates: (value: string[]) => void;
  setOrangeListDates: (value: string[]) => void;
  setRedListDates: (value: string[]) => void;
  setGreenListDates: (value: string[]) => void;
  setDarkGreenListDates: (value: string[]) => void;
}): JSX.Element => {
  const [dagRunsList, setDagRunsList] = useState<IDagRunList[]>([]);
  const [dagRunsCurrentDateList, setDagRunsCurrentDateList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const data =
    dagRunsCurrentDateList.length > 0 ? dagRunsCurrentDateList : dagRunsList;
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
  } = useTable(
    //@ts-ignore react-table 'columns' which is declared here on type 'TableOptions<ICluster>'
    { columns, data, autoResetPage: false, initialState: { pageSize: 50 } },
    useGlobalFilter,
    usePagination
  );

  const tableDataCondition = (cell: ICellProps) => {
    if (cell.column.Header === 'State') {
      if (cell.value === 'success') {
        return (
          <div className="dag-run-state-parent">
            <td
              {...cell.getCellProps()}
              className="dag-runs-table-data-state-success"
            >
              {cell.render('Cell')}
            </td>
          </div>
        );
      } else if (cell.value === 'failed') {
        return (
          <div className="dag-run-state-parent">
            <td
              {...cell.getCellProps()}
              className="dag-runs-table-data-state-failure"
            >
              {cell.render('Cell')}
            </td>
          </div>
        );
      } else if (cell.value === 'running') {
        return (
          <div className="dag-run-state-parent">
            <td
              {...cell.getCellProps()}
              className="dag-runs-table-data-state-running"
            >
              {cell.render('Cell')}
            </td>
          </div>
        );
      } else if (cell.value === 'queued') {
        return (
          <div className="dag-run-state-parent">
            <td
              {...cell.getCellProps()}
              className="dag-runs-table-data-state-queued"
            >
              {cell.render('Cell')}
            </td>
          </div>
        );
      }
    }
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
      setDagRunId,
      setIsLoading,
      setBlueListDates,
      setGreyListDates,
      setOrangeListDates,
      setRedListDates,
      setGreenListDates,
      setDarkGreenListDates
    );
  };

  useEffect(() => {
    listDagRunsList();
  }, [startDate, endDate]);

  useEffect(() => {
    let currentDate = selectedDate
      ? new Date(selectedDate.toDate()).toDateString()
      : null;
    let currentDateDagRunList: any = dagRunsList.filter((dagRun: any) => {
      return dagRun.date === currentDate;
    });
    if (currentDateDagRunList.length > 0) {
      setDagRunsCurrentDateList(currentDateDagRunList);
      setDagRunId(
        currentDateDagRunList[currentDateDagRunList.length - 1].dagRunId
      );
    } else {
      setDagRunsCurrentDateList([]);
      setDagRunId('');
    }
  }, [selectedDate, dagRunsList]);

  return (
    <div>
      <>
        {(dagRunsList.length > 0 && selectedDate === null) ||
        (selectedDate !== null && dagRunsCurrentDateList.length > 0) ? (
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
                setDagRunId={setDagRunId}
                selectedDagIndex={
                  dagRunsCurrentDateList.length > 0
                    ? dagRunsCurrentDateList.length - 1
                    : dagRunsList.length > 0
                    ? dagRunsList.length - 1
                    : -1
                }
              />
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
