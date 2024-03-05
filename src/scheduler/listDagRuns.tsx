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
import { PaginationView } from '../utils/paginationView';
import { ClipLoader } from 'react-spinners';
import TableData from '../utils/tableData';
import { ICellProps } from '../utils/utils';
import { SchedulerService } from './schedulerServices';
import { Dayjs } from 'dayjs';
import { LabIcon } from '@jupyterlab/ui-components';
import downloadIcon from '../../style/icons/scheduler_download.svg';

const iconDownload = new LabIcon({
  name: 'launcher:download-icon',
  svgstr: downloadIcon
});

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
  bucketName
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
  bucketName: string;
}): JSX.Element => {
  const [dagRunsList, setDagRunsList] = useState([]);
  const [dagRunsCurrentDateList, setDagRunsCurrentDateList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadOutputDagRunId, setDownloadOutputDagRunId] = useState('');
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
      },
      {
        Header: 'Actions',
        accessor: 'actions'
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
    page,
    canPreviousPage,
    canNextPage,
    nextPage,
    previousPage,
    setPageSize,
    gotoPage,
    state: { pageIndex, pageSize }
  } = useTable(
    //@ts-ignore react-table 'columns' which is declared here on type 'TableOptions<ICluster>'
    { columns, data, autoResetPage: false, initialState: { pageSize: 50 } },
    useGlobalFilter,
    usePagination
  );

  const tableDataCondition = (cell: ICellProps) => {
    if (cell.column.Header === 'Actions') {
      return (
        <td {...cell.getCellProps()} className="clusters-table-data">
          {renderActions(cell.row.original)}
        </td>
      );
    } else if (cell.column.Header === 'State') {
      if (cell.value === 'success') {
        return (
          <div className="dag-run-state-parent">
            <td
              {...cell.getCellProps()}
              className="dag-runs-table-data-state-success"
              onClick={() => handleDagRunStateClick(cell.row.original)}
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
              onClick={() => handleDagRunStateClick(cell.row.original)}
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
              onClick={() => handleDagRunStateClick(cell.row.original)}
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
              onClick={() => handleDagRunStateClick(cell.row.original)}
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

  const handleDagRunStateClick = (data: any) => {
    setDagRunId(data.dagRunId);
  };

  const handleDownloadOutput = async (event: React.MouseEvent) => {
    const dagRunId = event.currentTarget.getAttribute('data-dag-run-id')!;
    await SchedulerService.handleDownloadOutputNotebookAPIService(
      dagRunId,
      bucketName,
      dagId,
      setDownloadOutputDagRunId
    );
  };

  const renderActions = (data: any) => {
    return (
      <div className="actions-icon">
        {data.dagRunId === downloadOutputDagRunId ? (
          <div className="icon-buttons-style">
            <ClipLoader
              color="#3367d6"
              loading={true}
              size={18}
              aria-label="Loading Spinner"
              data-testid="loader"
            />
          </div>
        ) : (
          <div
            role="button"
            className={
              data.state === 'success'
                ? 'icon-buttons-style'
                : 'icon-buttons-style-disable'
            }
            title="Download Output"
            data-dag-run-id={data.dagRunId}
            onClick={
              data.state === 'success'
                ? e => handleDownloadOutput(e)
                : undefined
            }
          >
            <iconDownload.react
              tag="div"
              className="icon-white logo-alignment-style"
            />
          </div>
        )}
      </div>
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
      setGreenListDates
    );
  };

  useEffect(() => {
    listDagRunsList();
  }, [startDate, endDate]);

  useEffect(() => {
    gotoPage(0);
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
              />
            </div>
            {dagRunsCurrentDateList.length > 50 && (
              <PaginationView
                pageSize={pageSize}
                setPageSize={setPageSize}
                pageIndex={pageIndex}
                allData={dagRunsCurrentDateList}
                previousPage={previousPage}
                nextPage={nextPage}
                canPreviousPage={canPreviousPage}
                canNextPage={canNextPage}
              />
            )}
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
