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

import React, { useState, useEffect } from 'react';
import { useTable, usePagination } from 'react-table';
import TableData from '../utils/tableData';
import { PaginationView } from '../utils/paginationView';
import { ICellProps } from '../utils/utils';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { Autocomplete, TextField } from '@mui/material';
import deleteIcon from '../../style/icons/delete_icon.svg';
import { LabIcon } from '@jupyterlab/ui-components';
import playIcon from '../../style/icons/play_icon.svg';
import pauseIcon from '../../style/icons/pause_icon.svg';
import downloadIcon from '../../style/icons/download_icon.svg';
import { SchedulerService } from './schedulerServices';
import { ClipLoader } from 'react-spinners';

const iconDelete = new LabIcon({
  name: 'launcher:delete-icon',
  svgstr: deleteIcon
});
const iconPlay = new LabIcon({
  name: 'launcher:play-icon',
  svgstr: playIcon
});
const iconPause = new LabIcon({
  name: 'launcher:pause-icon',
  svgstr: pauseIcon
});

const iconDownload = new LabIcon({
  name: 'launcher:download-icon',
  svgstr: downloadIcon
});

function listNotebookScheduler({
  app,
  handleDagIdSelection
}: {
  app: JupyterFrontEnd;
  handleDagIdSelection: (composerName: string, dagId: string) => void;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [composerList, setComposerList] = useState<string[]>([]);
  const [composerSelected, setComposerSelected] = useState('');
  const [dagList, setDagList] = useState<any[]>([]);
  const data = dagList;
  const [bucketName, setBucketName] = useState('');
  const columns = React.useMemo(
    () => [
      {
        Header: 'Job Name',
        accessor: 'jobid'
      },
      {
        Header: 'Schedule',
        accessor: 'schedule'
      },
      {
        Header: 'Status',
        accessor: 'status'
      },
      {
        Header: 'Actions',
        accessor: 'actions'
      }
    ],
    []
  );
  const handleComposerSelected = (data: string | null) => {
    if (data) {
      const selectedComposer = data.toString();
      setComposerSelected(selectedComposer);
    }
  };

  const handleUpdateScheduler = async (
    dag_id: string,
    is_status_paused: boolean
  ) => {
    await SchedulerService.handleUpdateSchedulerAPIService(
      composerSelected,
      dag_id,
      is_status_paused,
      setDagList,
      setIsLoading,
      setBucketName
    );
  };
  const handleDeleteScheduler = async (dag_id: string) => {
    await SchedulerService.handleDeleteSchedulerAPIService(
      composerSelected,
      dag_id,
      setDagList,
      setIsLoading,
      setBucketName
    );
  };

  const handleDownloadScheduler = async (event: React.MouseEvent) => {
    const jobid = event.currentTarget.getAttribute('data-jobid')!;
    await SchedulerService.handleDownloadSchedulerAPIService(
      composerSelected,
      jobid,
      bucketName
    );
  };

  const listComposersAPI = async () => {
    await SchedulerService.listComposersAPIService(setComposerList);
  };

  const listDagInfoAPI = async () => {
    await SchedulerService.listDagInfoAPIService(
      setDagList,
      setIsLoading,
      setBucketName,
      composerSelected
    );
  };

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
    state: { pageIndex, pageSize }
  } = useTable(
    //@ts-ignore react-table 'columns' which is declared here on type 'TableOptions<ICluster>'
    { columns, data, autoResetPage: false, initialState: { pageSize: 50 } },
    usePagination
  );

  const renderActions = (data: any) => {
    const is_status_paused = data.status === 'Paused';
    return (
      <div className="actions-icon">
        <div
          role="button"
          className="icon-buttons-style"
          title={is_status_paused ? 'start' : 'stop'}
          onClick={e => handleUpdateScheduler(data.jobid, is_status_paused)}
        >
          {is_status_paused ? (
            <iconPlay.react
              tag="div"
              className="icon-white logo-alignment-style"
            />
          ) : (
            <iconPause.react
              tag="div"
              className="icon-white logo-alignment-style"
            />
          )}
        </div>
        <div
          role="button"
          className="icon-buttons-style"
          title="Delete"
          onClick={() => handleDeleteScheduler(data.jobid)}
        >
          <iconDelete.react
            tag="div"
            className="icon-white logo-alignment-style"
          />
        </div>
        <div
          role="button"
          className="icon-buttons-style"
          title="Download Notebook"
          data-jobid={data.jobid}
          onClick={e => handleDownloadScheduler(e)}
        >
          <iconDownload.react
            tag="div"
            className="icon-white logo-alignment-style"
          />
        </div>
      </div>
    );
  };

  const tableDataCondition = (cell: ICellProps) => {
    if (cell.column.Header === 'Actions') {
      return (
        <td {...cell.getCellProps()} className="clusters-table-data">
          {renderActions(cell.row.original)}
        </td>
      );
    } else if (cell.column.Header === 'Job Name') {
      return (
        <td
          {...cell.getCellProps()}
          className="clusters-table-data"
          onClick={() => handleDagIdSelection(composerSelected, cell.value)}
        >
          {cell.value}
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
  useEffect(() => {
    listComposersAPI();
  }, []);
  useEffect(() => {
    const sortedComposers = composerList.slice().sort();
    setComposerSelected(sortedComposers.length > 0 ? sortedComposers[0] : '');
    sortedComposers.length > 0 ? listDagInfoAPI() : setIsLoading(false);
  }, [composerSelected]);
  return (
    <div>
      <div className="select-text-overlay-scheduler">
        <div className="create-scheduler-form-element">
          <Autocomplete
            options={composerList}
            value={composerSelected}
            onChange={(_event, val) => {
              handleComposerSelected(val);
            }}
            renderInput={params => (
              <TextField {...params} label="Environment*" />
            )}
          />
        </div>
      </div>
      {dagList.length > 0 ? (
        <div className="notebook-templates-list-table-parent">
          <TableData
            getTableProps={getTableProps}
            headerGroups={headerGroups}
            getTableBodyProps={getTableBodyProps}
            isLoading={isLoading}
            rows={rows}
            page={page}
            prepareRow={prepareRow}
            tableDataCondition={tableDataCondition}
            fromPage="Notebook Schedulers"
          />
          {dagList.length > 50 && (
            <PaginationView
              pageSize={pageSize}
              setPageSize={setPageSize}
              pageIndex={pageIndex}
              allData={dagList}
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
              Loading Notebook Schedulers
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
export default listNotebookScheduler;
