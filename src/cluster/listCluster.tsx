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

import React from 'react';
import { useTable, useGlobalFilter, usePagination } from 'react-table';
import { LabIcon } from '@jupyterlab/ui-components';
import createClusterIcon from '../../style/icons/create_cluster_icon.svg';
import filterIcon from '../../style/icons/filter_icon.svg';
import stopIcon from '../../style/icons/stop_icon.svg';
import clusterRunningIcon from '../../style/icons/cluster_running_icon.svg';
import clusterErrorIcon from '../../style/icons/cluster_error_icon.svg';
import { ClipLoader } from 'react-spinners';
import {
  CREATE_CLUSTER_URL,
  STATUS_CREATING,
  STATUS_DELETING,
  STATUS_ERROR,
  STATUS_PROVISIONING,
  STATUS_RUNNING,
  STATUS_STARTING,
  STATUS_STOPPED,
  STATUS_STOPPING
} from '../utils/const';
import GlobalFilter from '../utils/globalFilter';
import TableData from '../utils/tableData';
import { PaginationView } from '../utils/paginationView';
import { ICellProps } from '../utils/utils';

const iconCreateCluster = new LabIcon({
  name: 'launcher:create-cluster-icon',
  svgstr: createClusterIcon
});
const iconFilter = new LabIcon({
  name: 'launcher:filter-icon',
  svgstr: filterIcon
});

const iconStop = new LabIcon({
  name: 'launcher:stop-icon',
  svgstr: stopIcon
});

const iconClusterRunning = new LabIcon({
  name: 'launcher:cluster-running-icon',
  svgstr: clusterRunningIcon
});
const iconClusterError = new LabIcon({
  name: 'launcher:cluster-error-icon',
  svgstr: clusterErrorIcon
});
interface ICluster {
  clusterName: string;
  status: string;
  clusterImage: string;
  region: string;
  zone: string;
  totalWorkersNode: string;
  schedulesDeletion: string;
  actions: React.ReactNode;
}

interface IListClusterProps {
  clustersList: ICluster[];
  isLoading: boolean;
  setPollingDisable: (value: boolean) => void;
  handleClusterDetails: (clusterName: string) => void;
  project_id: string;
}
function ListCluster({
  clustersList,
  isLoading,
  setPollingDisable,
  handleClusterDetails,
  project_id
}: IListClusterProps) {
  const data = clustersList;
  const columns = React.useMemo(
    () => [
      {
        Header: 'Name',
        accessor: 'clusterName'
      },
      {
        Header: 'Status',
        accessor: 'status'
      },
      {
        Header: 'Cluster image name',
        accessor: 'clusterImage'
      },
      {
        Header: 'Region',
        accessor: 'region'
      },
      {
        Header: 'Zone',
        accessor: 'zone'
      },
      {
        Header: 'Total worker nodes',
        accessor: 'totalWorkersNode'
      },
      {
        Header: 'Scheduled deletion',
        accessor: 'schedulesDeletion'
      },
      {
        Header: 'Actions',
        accessor: 'actions'
      }
    ],
    []
  );

  const tableDataCondition = (cell: ICellProps) => {
    if (cell.column.Header === 'Name') {
      return (
        <td
          {...cell.getCellProps()}
          role="button"
          className="cluster-name"
          onClick={() =>
            cell.row.original.status !== STATUS_DELETING &&
            handleClusterDetails(cell.value)
          }
        >
          {cell.value}
        </td>
      );
    } else if (cell.column.Header === 'Status') {
      return (
        <td {...cell.getCellProps()} className="clusters-table-data">
          <div
            key="Status"
            className="cluster-status-parent"
            role="status"
            aria-labels={cell.value}
          >
            {cell.value === STATUS_RUNNING && (
              <iconClusterRunning.react tag="div" className='logo-alignment-style' />
            )}
            {cell.value === STATUS_STOPPED && <iconStop.react tag="div" className='logo-alignment-style' />}
            {cell.value === STATUS_ERROR && (
              <iconClusterError.react tag="div" className='logo-alignment-style' />
            )}
            {(cell.value === STATUS_PROVISIONING ||
              cell.value === STATUS_CREATING ||
              cell.value === STATUS_STARTING ||
              cell.value === STATUS_STOPPING ||
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

  return (
    <div>
      <div className="create-cluster-overlay">
        <div
          role="button"
          className="create-cluster-sub-overlay"
          onClick={() => {
            window.open(
              `${CREATE_CLUSTER_URL}?project=${project_id}`,
              '_blank'
            );
          }}
        >
          <div className="create-icon">
            <iconCreateCluster.react tag="div" className='logo-alignment-style' />
          </div>
          <div className="create-text">Create cluster</div>
        </div>
      </div>

      {clustersList.length > 0 ? (
        <div>
          <div className="filter-cluster-overlay">
            <div className="filter-cluster-icon">
              <iconFilter.react tag="div" className='logo-alignment-style' />
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
              fromPage="Clusters"
            />
            {clustersList.length > 50 && (
              <PaginationView
                pageSize={pageSize}
                setPageSize={setPageSize}
                pageIndex={pageIndex}
                allData={clustersList}
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
            <div className="spin-loaderMain">
              <ClipLoader
                color="#8A8A8A"
                loading={true}
                size={18}
                aria-label="Loading Spinner"
                data-testid="loader"
              />
              Loading Clusters
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

export default ListCluster;
