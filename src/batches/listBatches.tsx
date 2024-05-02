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

import React, { useEffect, useRef, useState } from 'react';
import { useTable, useGlobalFilter, usePagination } from 'react-table';
import { LabIcon } from '@jupyterlab/ui-components';
import SubmitJobIcon from '../../style/icons/submit_job_icon.svg';
import filterIcon from '../../style/icons/filter_icon.svg';
import SucceededIcon from '../../style/icons/succeeded_icon.svg';
import clusterRunningIcon from '../../style/icons/cluster_running_icon.svg';
import clusterErrorIcon from '../../style/icons/cluster_error_icon.svg';
import GlobalFilter from '../utils/globalFilter';
import {
  BatchStatus,
  STATUS_CREATING,
  STATUS_DELETING,
  STATUS_FAIL,
  STATUS_PENDING,
  STATUS_PROVISIONING,
  STATUS_RUNNING,
  STATUS_SUCCESS
} from '../utils/const';
import TableData from '../utils/tableData';
import { PaginationView } from '../utils/paginationView';
import { ICellProps } from '../utils/utils';
import { BatchService } from './batchService';
import PollingTimer from '../utils/pollingTimer';
import DeletePopup from '../utils/deletePopup';
import BatchDetails from './batchDetails';
import CreateBatch from './createBatch';

import deleteIcon from '../../style/icons/delete_icon.svg';
import { CircularProgress } from '@mui/material';

const iconSubmitJob = new LabIcon({
  name: 'launcher:submit-job-icon',
  svgstr: SubmitJobIcon
});
const iconFilter = new LabIcon({
  name: 'launcher:filter-icon',
  svgstr: filterIcon
});
const iconSucceeded = new LabIcon({
  name: 'launcher:succeeded-icon',
  svgstr: SucceededIcon
});

const iconClusterRunning = new LabIcon({
  name: 'launcher:cluster-running-icon',
  svgstr: clusterRunningIcon
});
const iconClusterError = new LabIcon({
  name: 'launcher:cluster-error-icon',
  svgstr: clusterErrorIcon
});
const iconDelete = new LabIcon({
  name: 'launcher:delete-icon',
  svgstr: deleteIcon
});

interface IBatchesList {
  batchID: string;
  status: string;
  location: string;
  creationTime: string;
  type: string | undefined;
  elapsedTime: string;
  actions: React.JSX.Element;
}

function ListBatches({ setLoggedIn }: any) {
  const [detailedBatchView, setDetailedBatchView] = useState(false);

  const [createBatchView, setCreateBatchView] = useState(false);

  const [batchesList, setBatchesList] = useState<IBatchesList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [batchSelected, setBatchSelected] = useState('');
  const [pollingDisable, setPollingDisable] = useState(false);
  const [deletePopupOpen, setDeletePopupOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [regionName, setRegionName] = useState('');
  const [projectName, setProjectName] = useState('');
  const timer = useRef<NodeJS.Timeout | undefined>(undefined);
  const pollingBatches = async (
    pollingFunction: () => void,
    pollingDisable: boolean
  ) => {
    timer.current = PollingTimer(
      pollingFunction,
      pollingDisable,
      timer.current
    );
  };
  const data = batchesList;
  const columns = React.useMemo(
    () => [
      {
        Header: 'Batch ID',
        accessor: 'batchID'
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
        Header: 'Creation time',
        accessor: 'creationTime'
      },
      {
        Header: 'Elapsed time',
        accessor: 'elapsedTime'
      },
      {
        Header: 'Type',
        accessor: 'type'
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
    //@ts-ignore react-table 'columns' which is declared here on type 'TableOptions<ICluster>'
    { columns, data, autoResetPage: false, initialState: { pageSize: 50 } },
    useGlobalFilter,
    usePagination
  );

  const handleCreateBatchOpen = () => {
    setCreateBatchView(true);
  };

  const tableDataCondition = (cell: ICellProps) => {
    if (cell.column.Header === 'Batch ID') {
      return (
        <td
          role="button"
          {...cell.getCellProps()}
          className="cluster-name"
          onClick={() => handleBatchDetails(cell.value)}
        >
          {cell.value}
        </td>
      );
    } else if (cell.column.Header === 'Status') {
      return (
        <td {...cell.getCellProps()} className="clusters-table-data">
          <div key="Status" className="cluster-status-parent">
            {cell.value === STATUS_RUNNING && (
              <iconClusterRunning.react
                tag="div"
                className="logo-alignment-style"
              />
            )}
            {cell.value === STATUS_FAIL && (
              <iconClusterError.react
                tag="div"
                className="logo-alignment-style"
              />
            )}
            {cell.value === STATUS_SUCCESS && (
              <iconSucceeded.react tag="div" className="logo-alignment-style" />
            )}
            {(cell.value === STATUS_PROVISIONING ||
              cell.value === STATUS_CREATING ||
              cell.value === STATUS_PENDING ||
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

  interface IBatchData {
    name: string;
    state: BatchStatus;
    createTime: string;
    stateTime: Date;
  }

  const listBatchAPI = async () => {
    await BatchService.listBatchAPIService(
      setRegionName,
      setProjectName,
      renderActions,
      setBatchesList,
      setIsLoading,
      setLoggedIn
    );
  };

  const handleBatchDetails = (selectedName: string) => {
    pollingBatches(listBatchAPI, true);
    setBatchSelected(selectedName);
    setDetailedBatchView(true);
  };
  const handleDeleteBatch = (data: IBatchData) => {
    if (data.state !== BatchStatus.STATUS_PENDING) {
      /*
      Extracting project id
      Example: "projects/{project}/locations/{location}/batches/{batch_id}"
      */
      setSelectedBatch(data.name.split('/')[5]);
      setDeletePopupOpen(true);
    }
  };
  const handleCancelDelete = () => {
    setDeletePopupOpen(false);
  };

  const handleDelete = async () => {
    await BatchService.deleteBatchAPIService(selectedBatch);
    listBatchAPI();
    setDetailedBatchView(false);
    setDeletePopupOpen(false);
  };

  const renderActions = (data: IBatchData) => {
    return (
      <div
        className="actions-icon"
        role="button"
        aria-label="Delete Job"
        aria-disabled={data.state === BatchStatus.STATUS_PENDING}
      >
        <div
          className={
            data.state === BatchStatus.STATUS_PENDING
              ? 'icon-buttons-style-delete-batch-disable'
              : 'icon-buttons-style-delete-batch'
          }
          title="Delete Batch"
          onClick={() => handleDeleteBatch(data)}
        >
          {data.state === BatchStatus.STATUS_PENDING ? (
            <iconDelete.react
              tag="div"
              className="icon-white logo-alignment-style icon-delete"
            />
          ) : (
            <iconDelete.react
              tag="div"
              className="icon-white logo-alignment-style"
            />
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (!pollingDisable) {
      listBatchAPI();
    }

    return () => {
      pollingBatches(listBatchAPI, true);
    };
  }, [pollingDisable, detailedBatchView]);
  useEffect(() => {
    if (!detailedBatchView && !isLoading) {
      pollingBatches(listBatchAPI, pollingDisable);
    }
  }, [isLoading]);

  return (
    <div>
      {deletePopupOpen && (
        <DeletePopup
          onCancel={() => handleCancelDelete()}
          onDelete={() => handleDelete()}
          deletePopupOpen={deletePopupOpen}
          DeleteMsg={
            'This will delete ' + selectedBatch + ' and cannot be undone.'
          }
        />
      )}
      {detailedBatchView && (
        <BatchDetails
          batchSelected={batchSelected}
          setDetailedBatchView={setDetailedBatchView}
          setCreateBatchView={setCreateBatchView}
        />
      )}
      {createBatchView && (
        <CreateBatch
          setCreateBatchView={setCreateBatchView}
          regionName={regionName}
          projectName={projectName}
        />
      )}

      {!detailedBatchView && !createBatchView && (
        <>
          <div className="create-batch-wrapper ">
            <div
              className="create-batch-overlay"
              onClick={() => {
                handleCreateBatchOpen();
              }}
            >
              <div className="create-icon">
                <iconSubmitJob.react
                  tag="div"
                  className="logo-alignment-style"
                />
              </div>
              <div className="create-text">Create Batch</div>
            </div>
          </div>

          {batchesList.length > 0 && !createBatchView ? (
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
              <div className="clusters-list-table-parent">
                <TableData
                  getTableProps={getTableProps}
                  headerGroups={headerGroups}
                  getTableBodyProps={getTableBodyProps}
                  isLoading={isLoading}
                  rows={rows}
                  page={page}
                  prepareRow={prepareRow}
                  tableDataCondition={tableDataCondition}
                  fromPage="Batches"
                />
                {batchesList.length > 50 && (
                  <PaginationView
                    pageSize={pageSize}
                    setPageSize={setPageSize}
                    pageIndex={pageIndex}
                    allData={batchesList}
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
                  Loading Batches
                </div>
              )}
              {!isLoading && (
                <div className="no-data-style">No rows to display</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ListBatches;
