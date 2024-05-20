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

import { LabIcon } from '@jupyterlab/ui-components';
import React, { useEffect, useRef, useState } from 'react';
import { useGlobalFilter, usePagination, useTable } from 'react-table';
import clusterErrorIcon from '../../style/icons/cluster_error_icon.svg';
import deleteIcon from '../../style/icons/delete_icon.svg';
import filterIcon from '../../style/icons/filter_icon.svg';
import stopDisableIcon from '../../style/icons/stop_disable_icon.svg';
import stopIcon from '../../style/icons/stop_icon.svg';
import SucceededIcon from '../../style/icons/succeeded_icon.svg';
import {
  ClusterStatus,
  STATUS_ACTIVE,
  STATUS_CREATING,
  STATUS_DELETING,
  STATUS_FAIL,
  STATUS_PENDING,
  STATUS_PROVISIONING,
  STATUS_TERMINATED,
  STATUS_TERMINATING
} from '../utils/const';
import DeletePopup from '../utils/deletePopup';
import GlobalFilter from '../utils/globalFilter';
import { PaginationView } from '../utils/paginationView';
import PollingTimer from '../utils/pollingTimer';
import { SessionService } from './sessionService';
import TableData from '../utils/tableData';
import { ICellProps } from '../utils/utils';
import SessionDetails from './sessionDetails';
import { CircularProgress } from '@mui/material';

const iconFilter = new LabIcon({
  name: 'launcher:filter-icon',
  svgstr: filterIcon
});
const iconSucceeded = new LabIcon({
  name: 'launcher:succeeded-icon',
  svgstr: SucceededIcon
});

const iconClusterError = new LabIcon({
  name: 'launcher:cluster-error-icon',
  svgstr: clusterErrorIcon
});
const iconStop = new LabIcon({
  name: 'launcher:stop-icon',
  svgstr: stopIcon
});
const iconStopDisable = new LabIcon({
  name: 'launcher:stop-disable-icon',
  svgstr: stopDisableIcon
});
const iconDelete = new LabIcon({
  name: 'launcher:delete-icon',
  svgstr: deleteIcon
});

function ListSessions() {
  const [sessionsList, setSessionsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pollingDisable, setPollingDisable] = useState(false);
  const [sessionSelected, setSessionSelected] = useState('');
  const [detailedSessionView, setDetailedSessionView] = useState(false);

  const [deletePopupOpen, setDeletePopupOpen] = useState(false);
  const [selectedSessionValue, setSelectedSessionValue] = useState('');
  const timer = useRef<NodeJS.Timeout | undefined>(undefined);

  const pollingSessions = async (
    pollingFunction: () => void,
    pollingDisable: boolean
  ) => {
    timer.current = PollingTimer(
      pollingFunction,
      pollingDisable,
      timer.current
    );
  };

  const data = sessionsList;

  const columns = React.useMemo(
    () => [
      {
        Header: 'Session ID',
        accessor: 'sessionID'
      },
      {
        Header: 'Status',
        accessor: 'status'
      },
      {
        Header: 'Location',
        accessor: 'location'
      },
      {
        Header: 'Creator',
        accessor: 'creator'
      },
      {
        Header: 'Creation time',
        accessor: 'creationTime'
      },
      {
        Header: 'Elapsed time',
        accessor: 'elapsedTime'
      },
      {
        Header: 'Actions',
        accessor: 'actions'
      }
    ],
    []
  );

  const listSessionsAPI = async () => {
    await SessionService.listSessionsAPIService(
      renderActions,
      setIsLoading,
      setSessionsList
    );
  };

  const handleDeleteSession = (session: string) => {
    setSelectedSessionValue(session);
    setDeletePopupOpen(true);
  };
  const handleCancelDelete = () => {
    setDeletePopupOpen(false);
  };

  const handleDelete = async () => {
    await SessionService.deleteSessionAPI(selectedSessionValue);
    setDeletePopupOpen(false);
  };

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    state,
    preGlobalFilteredRows,
    setGlobalFilter,
    page,
    canPreviousPage,
    canNextPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize }
  } = useTable(
    { columns, data, autoResetPage: false, initialState: { pageSize: 50 } },
    useGlobalFilter,
    usePagination
  );

  useEffect(() => {
    if (!pollingDisable) {
      listSessionsAPI();
    }
    return () => {
      pollingSessions(listSessionsAPI, true);
    };
  }, [pollingDisable, detailedSessionView]);
  useEffect(() => {
    if (!detailedSessionView && !isLoading) {
      pollingSessions(listSessionsAPI, pollingDisable);
    }
  }, [isLoading]);
  const renderActions = (data: { state: ClusterStatus; name: string }) => {
    /*
      Extracting sessionId from sessionInfo
      Example: "projects/{project}/locations/{location}/sessions/{name}"
    */
    let sessionValue = data.name.split('/')[5];

    return (
      <div className="actions-icon">
        <div
          role="button"
          aria-disabled={data.state !== ClusterStatus.STATUS_ACTIVE}
          className={
            data.state === ClusterStatus.STATUS_ACTIVE
              ? 'icon-buttons-style'
              : 'icon-buttons-style-disable'
          }
          title="Terminate Session"
          onClick={
            data.state === ClusterStatus.STATUS_ACTIVE
              ? () => SessionService.terminateSessionAPI(sessionValue)
              : undefined
          }
        >
          {data.state === ClusterStatus.STATUS_ACTIVE ? (
            <iconStop.react
              tag="div"
              className="icon-white logo-alignment-style"
            />
          ) : (
            <iconStopDisable.react
              tag="div"
              className="icon-white logo-alignment-style"
            />
          )}
        </div>
        <div
          role="button"
          className="icon-buttons-style"
          title="Delete Session"
          onClick={() => handleDeleteSession(sessionValue)}
        >
          <iconDelete.react
            tag="div"
            className="icon-white logo-alignment-style"
          />
        </div>
      </div>
    );
  };
  const handleSessionDetails = (selectedName: string) => {
    pollingSessions(listSessionsAPI, true);
    setSessionSelected(selectedName);
    setDetailedSessionView(true);
  };

  const tableDataCondition = (cell: ICellProps) => {
    if (cell.column.Header === 'Session ID') {
      return (
        <td
          role="button"
          {...cell.getCellProps()}
          className="cluster-name"
          onClick={() => handleSessionDetails(cell.value)}
        >
          {cell.value}
        </td>
      );
    }
    if (cell.column.Header === 'Status') {
      return (
        <td {...cell.getCellProps()} className="clusters-table-data">
          <div key="Status" className="cluster-status-parent">
            {cell.value === STATUS_FAIL && (
              <iconClusterError.react
                tag="div"
                className="logo-alignment-style"
              />
            )}
            {cell.value === STATUS_TERMINATED && (
              <iconSucceeded.react tag="div" className="logo-alignment-style" />
            )}
            {cell.value === STATUS_ACTIVE && (
              <iconSucceeded.react tag="div" className="logo-alignment-style" />
            )}
            {(cell.value === STATUS_PROVISIONING ||
              cell.value === STATUS_CREATING ||
              cell.value === STATUS_PENDING ||
              cell.value === STATUS_TERMINATING ||
              cell.value === STATUS_DELETING) && (
              <CircularProgress
                size={15}
                aria-label="Loading Spinner"
                data-testid="loader"
              />
            )}
            <div className="cluster-status">
              {cell.value && cell.value.toLowerCase()}
            </div>
          </div>
        </td>
      );
    } else {
      return (
        <td {...cell.getCellProps()} className="clusters-table-data">
          {cell.render('Cell')}
        </td>
      );
    }
  };

  return (
    <div>
      {deletePopupOpen && (
        <DeletePopup
          onCancel={() => handleCancelDelete()}
          onDelete={() => handleDelete()}
          deletePopupOpen={deletePopupOpen}
          DeleteMsg={
            'This will delete ' +
            selectedSessionValue +
            ' and cannot be undone.'
          }
        />
      )}
      {detailedSessionView && (
        <SessionDetails
          sessionSelected={sessionSelected}
          setDetailedSessionView={setDetailedSessionView}
          detailedSessionView={detailedSessionView}
        />
      )}
      {sessionsList.length > 0 && !detailedSessionView ? (
        <div>
          <div className="filter-cluster-overlay">
            <div className="filter-cluster-icon">
              <iconFilter.react
                tag="div"
                className="icon-white logo-alignment-style"
              />
            </div>
            <div className="filter-cluster-text"></div>
            <div className="filter-cluster-section">
              <GlobalFilter
                preGlobalFilteredRows={preGlobalFilteredRows}
                globalFilter={state.globalFilter}
                setGlobalFilter={setGlobalFilter}
                setPollingDisable={setPollingDisable}
              />
            </div>
          </div>
          <div className="session-list-table-parent">
            <TableData
              getTableProps={getTableProps}
              headerGroups={headerGroups}
              getTableBodyProps={getTableBodyProps}
              isLoading={isLoading}
              rows={rows}
              page={page}
              prepareRow={prepareRow}
              tableDataCondition={tableDataCondition}
              fromPage="Sessions"
            />
            {sessionsList.length > 50 && (
              <PaginationView
                pageSize={pageSize}
                setPageSize={setPageSize}
                pageIndex={pageIndex}
                allData={sessionsList}
                previousPage={previousPage}
                nextPage={nextPage}
                canPreviousPage={canPreviousPage}
                canNextPage={canNextPage}
              />
            )}
          </div>
        </div>
      ) : (
        <div>
          {isLoading && (
            <div className="spin-loader-main">
              <CircularProgress
                className = "spin-loader-custom-style"
                size={18}
                aria-label="Loading Spinner"
                data-testid="loader"
              />
              Loading Sessions
            </div>
          )}
          {!isLoading && !detailedSessionView && (
            <div className="no-data-style">No rows to display</div>
          )}
        </div>
      )}
    </div>
  );
}

export default ListSessions;
