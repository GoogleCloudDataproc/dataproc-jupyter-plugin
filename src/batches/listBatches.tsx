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
import { LabIcon } from '@jupyterlab/ui-components';
import SubmitJobIcon from '../../style/icons/submit_job_icon.svg';
import filterIcon from '../../style/icons/filter_icon.svg';
import SucceededIcon from '../../style/icons/succeeded_icon.svg';
import clusterRunningIcon from '../../style/icons/cluster_running_icon.svg';
import clusterErrorIcon from '../../style/icons/cluster_error_icon.svg';
import refreshBatchIcon from '../../style/icons/refresh_cluster_icon.svg';
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
import { ICellProps } from '../utils/utils';
import { BatchService } from './batchService';
import DeletePopup from '../utils/deletePopup';
import BatchDetails from './batchDetails';
import CreateBatch from './createBatch';
import PreviousIcon from '../../style/icons/previous_page.svg';
import NextIcon from '../../style/icons/next_page.svg';

import deleteIcon from '../../style/icons/delete_icon.svg';
import { CircularProgress } from '@mui/material';
import ApiEnableDialog from '../utils/apiErrorPopup';

const iconPrevious = new LabIcon({
  name: 'launcher:previous-icon',
  svgstr: PreviousIcon
});
const iconNext = new LabIcon({
  name: 'launcher:next-icon',
  svgstr: NextIcon
});

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

const iconRefreshBatch = new LabIcon({
  name: 'launcher:refresh-dataset-explorer-icon',
  svgstr: refreshBatchIcon
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
  const [nextPageTokens, setNextPageTokens] = useState<string[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // New state to track if a batch was created from batch details
  const [batchCreatedFromDetails, setBatchCreatedFromDetails] =
    useState<boolean>(false);
  const [apiDialogOpen, setApiDialogOpen] = useState(false);
  const [enableLink, setEnableLink] = useState('');
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
    state: { pageSize }
  } = useTable(
    //@ts-ignore react-table 'columns' which is declared here on type 'TableOptions<ICluster>'
    { columns, data, autoResetPage: false, initialState: { pageSize: 50 } },
    useGlobalFilter,
    usePagination
  );

  const handleCreateBatchOpen = () => {
    setCreateBatchView(true);
  };

  const handleRefreshBatches = () => {
    // If we're on the first page (index 0), refresh with no tokens
    if (currentPageIndex === 0) {
      listBatchAPI([], true);
    } else {
      // For any other page, use the current page's tokens to stay on the same page
      // Get tokens up to the current page
      const tokensForCurrentPage = nextPageTokens.slice(0, currentPageIndex);
      listBatchAPI(tokensForCurrentPage, false); // false to maintain current pagination state
    }
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

  const listBatchAPI = async (
    pageToken?: string[],
    shouldUpdatePagination: boolean = true
  ) => {
    await BatchService.listBatchAPIService(
      setRegionName,
      setProjectName,
      renderActions,
      setBatchesList,
      setIsLoading,
      setLoggedIn,
      setApiDialogOpen,
      setPollingDisable,
      setEnableLink,
      pageToken ? pageToken : nextPageTokens,
      setNextPageTokens,
      undefined,
      // Only update nextPageTokens if shouldUpdatePagination is true
      shouldUpdatePagination
    );
  };

  const handleBatchDetails = (selectedName: string) => {
    // Stop polling and don't update pagination when viewing details
    setPollingDisable(true);
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

  // Updated useEffect - prevent API call when returning from detailed view
  useEffect(() => {
    if (!createBatchView && !detailedBatchView) {
      // Only call API when not in detailed view and not creating batch
      // Don't update pagination when coming back from detailed view
      listBatchAPI(undefined, false);
    }
  }, [createBatchView, pollingDisable]);

  // Separate useEffect for when detailedBatchView changes to false (coming back)
  useEffect(() => {
    if (!detailedBatchView && !createBatchView) {
      // Check if a batch was created from details
      if (batchCreatedFromDetails) {
        // Case 1: Batch was created from details - reset pagination and clear tokens
        setNextPageTokens([]);
        setCurrentPageIndex(0);
        listBatchAPI([], true);
        setBatchCreatedFromDetails(false);
      } else if (batchesList.length > 0) {
        // Case 2 & 3: No batch created - just refresh data without updating pagination
        listBatchAPI(undefined, false);
      }
    }
  }, [detailedBatchView, createBatchView, batchCreatedFromDetails]);

  // Keep the initial load with pagination enabled
  useEffect(() => {
    listBatchAPI();
  }, []);

  const handlePreviousPage = () => {
    if (currentPageIndex > 0) {
      const newPageIndex = currentPageIndex - 1;
      setCurrentPageIndex(newPageIndex);

      const tokensForPreviousPage = nextPageTokens.slice(
        0,
        nextPageTokens.length - 2
      );
      listBatchAPI(tokensForPreviousPage, true);
    }
  };

  const handleNextPage = () => {
    // Check if we have a next page token available
    if (nextPageTokens.length > currentPageIndex) {
      const newPageIndex = currentPageIndex + 1;
      setCurrentPageIndex(newPageIndex);

      // Use the last token in the array for the next page
      listBatchAPI(nextPageTokens, true);
    }
  };

  // Check if we can navigate to previous/next pages
  const canPreviousPage = currentPageIndex > 0;
  const canNextPage = nextPageTokens.length > currentPageIndex;

  const startIndex = currentPageIndex * pageSize + 1;
  const actualRecordsOnCurrentPage = rows.length;

  // Calculate the end index - either full pageSize or actual records if less than pageSize
  const endIndex = Math.min(
    (currentPageIndex + 1) * pageSize,
    startIndex - 1 + actualRecordsOnCurrentPage
  );

  // Calculate estimated total:
  // If there's a next page available, show current page + next potential page (+ pageSize)
  // If no next page, show actual end index as total
  const estimatedTotal = canNextPage
    ? (currentPageIndex + 2) * pageSize
    : endIndex;

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
          batchCreatedFromDetails={batchCreatedFromDetails}
          setBatchCreatedFromDetails={setBatchCreatedFromDetails}
        />
      )}
      {createBatchView && (
        <CreateBatch
          setCreateBatchView={setCreateBatchView}
          regionName={regionName}
          projectName={projectName}
          setNextPageTokens={setNextPageTokens}
          batchCreatedFromDetails={batchCreatedFromDetails}
          setBatchCreatedFromDetails={setBatchCreatedFromDetails}
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
            <div
              className="create-batch-overlay"
              onClick={() => {
                handleRefreshBatches();
              }}
            >
              <div className="batch-refresh-icon">
                <iconRefreshBatch.react
                  tag="div"
                  className="logo-alignment-style"
                />
              </div>
              <div className="create-text">Refresh</div>
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
                <div className="pagination-parent-view">
                  <div>Rows per page: 50</div>
                  <div className="page-display-part">
                    {batchesList.length > 0
                      ? `${startIndex} - ${endIndex} of ${estimatedTotal}`
                      : '0 - 0 of 0'}
                  </div>
                  <div
                    role="button"
                    className={
                      !canPreviousPage
                        ? 'page-move-button disabled'
                        : 'page-move-button'
                    }
                    onClick={() => handlePreviousPage()}
                  >
                    <iconPrevious.react
                      tag="div"
                      className="icon-white logo-alignment-style"
                    />
                  </div>
                  <div
                    role="button"
                    onClick={() => handleNextPage()}
                    className={
                      !canNextPage
                        ? 'page-move-button disabled'
                        : 'page-move-button'
                    }
                  >
                    <iconNext.react
                      tag="div"
                      className="icon-white logo-alignment-style"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {isLoading && (
                <div className="spin-loader-main">
                  <CircularProgress
                    className="spin-loader-custom-style"
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
              {apiDialogOpen && (
                <ApiEnableDialog
                  open={apiDialogOpen}
                  onCancel={() => setApiDialogOpen(false)}
                  onEnable={() => setApiDialogOpen(false)}
                  enableLink={enableLink}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ListBatches;
