import React, { useState, useEffect } from 'react';
import { useTable, usePagination } from 'react-table';
import TableData from '../utils/tableData';
import { PaginationView } from '../utils/paginationView';
import { ICellProps } from '../utils/utils';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { Autocomplete, TextField } from '@mui/material';
import deleteIcon from '../../style/icons/delete_icon.svg';
import { LabIcon } from '@jupyterlab/ui-components';
import startIcon from '../../style/icons/start_icon.svg';
import stopIcon from '../../style/icons/stop_icon.svg';
import downloadIcon from '../../style/icons/download_icon.svg';
import { SchedulerService } from './schedulerServices';

const iconDelete = new LabIcon({
  name: 'launcher:delete-icon',
  svgstr: deleteIcon
});
const iconStart = new LabIcon({
  name: 'launcher:start-icon',
  svgstr: startIcon
});
const iconStop = new LabIcon({
  name: 'launcher:stop-icon',
  svgstr: stopIcon
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
  const [composerSelected, setComposerSelected] = useState('composer4');
  const [dagList, setDagList] = useState<any[]>([]);
  const data = dagList;
  const [bucketName, setBucketName] = useState('');
  const columns = React.useMemo(
    () => [
      {
        Header: 'Job Id',
        accessor: 'jobid'
      },
      {
        Header: 'Notebook name',
        accessor: 'notebookname'
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
            <iconStart.react
              tag="div"
              className="icon-white logo-alignment-style"
            />
          ) : (
            <iconStop.react
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
    } else if (cell.column.Header === 'Job Id') {
      return (
        <td
          {...cell.getCellProps()}
          className="clusters-table-data"
          onClick={() => handleDagIdSelection(composerSelected, cell.value)}
        >
          {cell.value}
        </td>
      );
    } else if (cell.column.Header === 'Notebook name') {
      return (
        <td {...cell.getCellProps()} className="clusters-table-data">
          <div
            role="button"
            className="icon-buttons-style"
            title="Download"
            data-jobid={cell.value}
            onClick={e => handleDownloadScheduler(e)}
          >
            <iconDownload.react
              tag="div"
              className="icon-white logo-alignment-style"
            />
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
  useEffect(() => {
    listComposersAPI();
  }, []);
  useEffect(() => {
    listDagInfoAPI();
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
          fromPage="Notebook Scheduler"
        />
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
      </div>
    </div>
  );
}
export default listNotebookScheduler;
