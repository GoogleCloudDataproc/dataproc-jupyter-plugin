/**
 * @license
 * Copyright 2022 Google LLC
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
import { useTable, useGlobalFilter } from 'react-table';
import { LabIcon } from '@jupyterlab/ui-components';
import createClusterIcon from '../../style/icons/create_cluster_icon.svg';
import filterIcon from '../../style/icons/filter_icon.svg';
import SucceededIcon from '../../style/icons/succeeded_icon.svg';
import clusterRunningIcon from '../../style/icons/cluster_running_icon.svg';
import clusterErrorIcon from '../../style/icons/cluster_error_icon.svg';
import { ClipLoader } from 'react-spinners';
import GlobalFilter from '../utils/globalFilter';
import {
  // CREATE_BATCH_URL,
  STATUS_CREATING,
  STATUS_DELETING,
  STATUS_FAIL,
  STATUS_PENDING,
  STATUS_PROVISIONING,
  STATUS_RUNNING,
  STATUS_SUCCESS
} from '../utils/const';
import TableData from '../utils/tableData';

const iconCreateCluster = new LabIcon({
  name: 'launcher:create-cluster-icon',
  svgstr: createClusterIcon
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

interface IBatch {
  batchID: string;
  status: string;
  location: string;
  creationTime: string;
  elapsedTime: string;
  type: string;
  actions: JSX.Element;
}

interface IListBatchesProps {
  batchesList: IBatch[];
  isLoading: boolean;
  setPollingDisable: (value: boolean) => void;
  listBatchAPI: () => void;
  handleBatchDetails: (batchID: string) => void;
}

function ListBatches({
  batchesList,
  isLoading,
  setPollingDisable,
  listBatchAPI,
  handleBatchDetails
}: IListBatchesProps) {
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
    //@ts-ignore
    preGlobalFilteredRows,
    //@ts-ignore
    setGlobalFilter
  } =
    //@ts-ignore
    useTable({ columns, data }, useGlobalFilter);

  interface ICellProps {
    getCellProps: () => React.TdHTMLAttributes<HTMLTableDataCellElement>;
    value: any;
    column: {
      Header: string;
    };
    render: (value: string) => React.ReactNode;
  }

  const tableDataCondition = (cell: ICellProps) => {
    if (cell.column.Header === 'Batch ID') {
      return (
        <td
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
              <iconClusterRunning.react tag="div" />
            )}
            {cell.value === STATUS_FAIL && <iconClusterError.react tag="div" />}
            {cell.value === STATUS_SUCCESS && <iconSucceeded.react tag="div" />}
            {(cell.value === STATUS_PROVISIONING ||
              cell.value === STATUS_CREATING ||
              cell.value === STATUS_PENDING ||
              cell.value === STATUS_DELETING) && (
              <ClipLoader
                color="#8A8A8A"
                loading={true}
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
      <div className="batch-header-part">
        <div
          className="action-disabled create-batch-overlay"
          // onClick={() => {
          //   window.open(CREATE_BATCH_URL, '_blank');
          // }}
        >
          <div className="create-cluster-icon">
            <iconCreateCluster.react tag="div" />
          </div>
          <div className="create-cluster-text">Create Batch</div>
        </div>
      </div>
      {batchesList.length > 0 ? (
        <div>
          <div className="filter-cluster-overlay">
            <div className="filter-cluster-icon">
              <iconFilter.react tag="div" />
            </div>
            <div className="filter-cluster-text"></div>
            <div className="filter-cluster-section">
              <GlobalFilter
                preGlobalFilteredRows={preGlobalFilteredRows}
                //@ts-ignore
                globalFilter={state.globalFilter}
                setGlobalFilter={setGlobalFilter}
                listBatchAPI={listBatchAPI}
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
              prepareRow={prepareRow}
              tableDataCondition={tableDataCondition}
              fromPage="Batches"
            />
          </div>
        </div>
      ) : (
        <div>
          {isLoading && (
            <div className="spin-loaderMain">
              <ClipLoader
                color="#8A8A8A"
                loading={true}
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
    </div>
  );
}

export default ListBatches;
