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

import React, { useState, useEffect, useRef } from 'react';
import { useTable, usePagination } from 'react-table';
import TableData from '../utils/tableData';
import { PaginationView } from '../utils/paginationView';
import { ICellProps } from '../utils/utils';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { Autocomplete, TextField } from '@mui/material';
import deleteIcon from '../../style/icons/scheduler_delete.svg';
import { LabIcon } from '@jupyterlab/ui-components';
import playIcon from '../../style/icons/scheduler_play.svg';
import pauseIcon from '../../style/icons/scheduler_pause.svg';
import EditIconDisable from '../../style/icons/scheduler_edit_dag.svg';
import EditNotebookIcon from '../../style/icons/scheduler_edit_calendar.svg';
import { SchedulerService } from './schedulerServices';
import { ClipLoader } from 'react-spinners';
import DeletePopup from '../utils/deletePopup';
import PollingTimer from '../utils/pollingTimer';
import PollingImportErrorTimer from '../utils/pollingImportErrorTimer';
import ImportErrorPopup from '../utils/importErrorPopup';
import triggerIcon from '../../style/icons/scheduler_trigger.svg';
import { scheduleMode } from '../utils/const';

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
const iconEditDag = new LabIcon({
  name: 'launcher:edit-disable-icon',
  svgstr: EditIconDisable
});
const iconEditNotebook = new LabIcon({
  name: 'launcher:edit-notebook-icon',
  svgstr: EditNotebookIcon
});

const iconTrigger = new LabIcon({
  name: 'launcher:trigger-icon',
  svgstr: triggerIcon
});
interface IDagList {
  jobid: string;
  notebookname: string;
  schedule: string;
  scheduleInterval: string;
}

function listNotebookScheduler({
  app,
  handleDagIdSelection,
  backButtonComposerName,
  composerSelectedFromCreate,
  setCreateCompleted,
  setJobNameSelected,
  setComposerSelected,
  setScheduleMode,
  setScheduleValue,

  setInputFileSelected,
  setParameterDetail,
  setParameterDetailUpdated,
  setSelectedMode,
  setClusterSelected,
  setServerlessSelected,
  setServerlessDataSelected,
  serverlessDataList,
  setServerlessDataList,
  setServerlessList,
  setRetryCount,
  setRetryDelay,
  setEmailOnFailure,
  setEmailonRetry,
  setEmailOnSuccess,
  setEmailList,
  setStopCluster,
  setTimeZoneSelected,
  setEditMode,
  bucketName,
  setBucketName
}: {
  app: JupyterFrontEnd;
  handleDagIdSelection: (composerName: string, dagId: string) => void;
  backButtonComposerName: string;
  composerSelectedFromCreate: string;
  setCreateCompleted?: (value: boolean) => void;
  setJobNameSelected?: (value: string) => void;
  setComposerSelected?: (value: string) => void;
  setScheduleMode?: (value: scheduleMode) => void;
  setScheduleValue?: (value: string) => void;

  setInputFileSelected?: (value: string) => void;
  setParameterDetail?: (value: string[]) => void;
  setParameterDetailUpdated?: (value: string[]) => void;
  setSelectedMode?: (value: string) => void;
  setClusterSelected?: (value: string) => void;
  setServerlessSelected?: (value: string) => void;
  setServerlessDataSelected?: (value: any) => void;
  serverlessDataList?: any;
  setServerlessDataList?: (value: any) => void;
  setServerlessList?: (value: string[]) => void;
  setRetryCount?: (value: number) => void;
  setRetryDelay?: (value: number) => void;
  setEmailOnFailure?: (value: boolean) => void;
  setEmailonRetry?: (value: boolean) => void;
  setEmailOnSuccess?: (value: boolean) => void;
  setEmailList?: (value: string[]) => void;
  setStopCluster?: (value: boolean) => void;
  setTimeZoneSelected?: (value: string) => void;
  setEditMode?: (value: boolean) => void;
  bucketName: string;
  setBucketName: (value: string) => void;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [composerList, setComposerList] = useState<string[]>([]);
  const [composerSelectedList, setComposerSelectedList] = useState('');
  const [dagList, setDagList] = useState<IDagList[]>([]);
  const data = dagList;
  const backselectedEnvironment = backButtonComposerName;
  const createSelectedEnvironment = composerSelectedFromCreate;
  const [deletePopupOpen, setDeletePopupOpen] = useState(false);
  const [importErrorPopupOpen, setImportErrorPopupOpen] = useState(false);
  const [selectedDagId, setSelectedDagId] = useState('');
  const [editDagLoading, setEditDagLoading] = useState('');
  const [inputNotebookFilePath, setInputNotebookFilePath] = useState('');
  const [editNotebookLoading, setEditNotebookLoading] = useState('');
  const [deletingNotebook, setDeletingNotebook] = useState(false);
  const [importErrorData, setImportErrorData] = useState<string[]>([]);
  const [importErrorEntries, setImportErrorEntries] = useState<number>(0);
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
  const timer = useRef<NodeJS.Timeout | undefined>(undefined);
  const pollingDagList = async (
    pollingFunction: () => void,
    pollingDisable: boolean
  ) => {
    timer.current = PollingTimer(
      pollingFunction,
      pollingDisable,
      timer.current
    );
  };

  const timerImportError = useRef<NodeJS.Timeout | undefined>(undefined);
  const pollingImportError = async (
    pollingFunction: () => void,
    pollingDisable: boolean
  ) => {
    timerImportError.current = PollingImportErrorTimer(
      pollingFunction,
      pollingDisable,
      timerImportError.current
    );
  };
  const handleComposerSelected = (data: string | null) => {
    if (data) {
      const selectedComposer = data.toString();
      setComposerSelectedList(selectedComposer);
    }
  };
  const handleUpdateScheduler = async (
    dag_id: string,
    is_status_paused: boolean
  ) => {
    await SchedulerService.handleUpdateSchedulerAPIService(
      composerSelectedList,
      dag_id,
      is_status_paused,
      setDagList,
      setIsLoading,
      setBucketName
    );
  };
  const handleDeletePopUp = (dag_id: string) => {
    setSelectedDagId(dag_id);
    setDeletePopupOpen(true);
  };
  const handleEditNotebook = async (event: React.MouseEvent) => {
    const jobid = event.currentTarget.getAttribute('data-jobid');
    if (jobid !== null) {
      await SchedulerService.editNotebookSchedulerService(
        bucketName,
        jobid,
        setInputNotebookFilePath,
        setEditNotebookLoading
      );
    }
  };
  const handleTriggerDag = async (event: React.MouseEvent) => {
    const jobid = event.currentTarget.getAttribute('data-jobid');
    if (jobid !== null) {
      await SchedulerService.triggerDagService(jobid, composerSelectedList);
    }
  };
  const handleEditDags = async (event: React.MouseEvent) => {
    const jobid = event.currentTarget.getAttribute('data-jobid');
    if (jobid !== null) {
      await SchedulerService.editJobSchedulerService(
        bucketName,
        jobid,
        composerSelectedList,
        setEditDagLoading,
        setCreateCompleted,
        setJobNameSelected,
        setComposerSelected,
        setScheduleMode,
        setScheduleValue,

        setInputFileSelected,
        setParameterDetail,
        setParameterDetailUpdated,
        setSelectedMode,
        setClusterSelected,
        setServerlessSelected,
        setServerlessDataSelected,
        serverlessDataList,
        setServerlessDataList,
        setServerlessList,
        setRetryCount,
        setRetryDelay,
        setEmailOnFailure,
        setEmailonRetry,
        setEmailOnSuccess,
        setEmailList,
        setStopCluster,
        setTimeZoneSelected,
        setEditMode
      );
    }
  };

  const handleCancelDelete = () => {
    setDeletePopupOpen(false);
  };

  const handleDeleteScheduler = async () => {
    setDeletingNotebook(true);
    await SchedulerService.handleDeleteSchedulerAPIService(
      composerSelectedList,
      selectedDagId,
      setDagList,
      setIsLoading,
      setBucketName
    );
    setDeletePopupOpen(false);
    setDeletingNotebook(false);
  };

  const handleDeleteImportError = async (dagId: string) => {
    const fromPage ="importErrorPage"
    await SchedulerService.handleDeleteSchedulerAPIService(
      composerSelectedList,
      dagId,
      setDagList,
      setIsLoading,
      setBucketName,
      fromPage
    );
  };

  const listComposersAPI = async () => {
    await SchedulerService.listComposersAPIService(
      setComposerList,
      setIsLoading
    );
  };

  const listDagInfoAPI = async () => {
    await SchedulerService.listDagInfoAPIService(
      setDagList,
      setIsLoading,
      setBucketName,
      composerSelectedList
    );
  };

  const handleImportErrorPopup = async () => {
    setImportErrorPopupOpen(true);
  };
  const handleImportErrorClosed = async () => {
    setImportErrorPopupOpen(false);
  };
  const handleImportErrordata = async () => {
    await SchedulerService.handleImportErrordataService(
      composerSelectedList,
      setImportErrorData,
      setImportErrorEntries
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
          title={is_status_paused ? 'Unpause' : 'Pause'}
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
          className={
            !is_status_paused
              ? 'icon-buttons-style'
              : 'icon-buttons-style-disable '
          }
          title={
            !is_status_paused ? 'Trigger the job' : " Can't Trigger Paused job"
          }
          data-jobid={data.jobid}
          onClick={e => {
            !is_status_paused ? handleTriggerDag(e) : null;
          }}
        >
          <iconTrigger.react
            tag="div"
            className="icon-white logo-alignment-style"
          />
        </div>
        {data.jobid === editDagLoading ? (
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
            className="icon-buttons-style"
            title="Edit Schedule"
            data-jobid={data.jobid}
            onClick={e => handleEditDags(e)}
          >
            <iconEditNotebook.react
              tag="div"
              className="icon-white logo-alignment-style"
            />
          </div>
        )}
        {data.jobid === editNotebookLoading ? (
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
            className="icon-buttons-style"
            title="Edit Notebook"
            data-jobid={data.jobid}
            onClick={e => handleEditNotebook(e)}
          >
            <iconEditDag.react
              tag="div"
              className="icon-white logo-alignment-style"
            />
          </div>
        )}
        <div
          role="button"
          className="icon-buttons-style"
          title="Delete"
          onClick={() => handleDeletePopUp(data.jobid)}
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
    } else if (cell.column.Header === 'Job Name') {
      return (
        <td
          {...cell.getCellProps()}
          className="clusters-table-data"
          onClick={() => handleDagIdSelection(composerSelectedList, cell.value)}
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
    if (inputNotebookFilePath !== '') {
      let filePath = inputNotebookFilePath.replace('gs://', 'gs:');
      app.commands.execute('docmanager:open', {
        path: filePath
      });
      setInputNotebookFilePath('');
    }
  }, [inputNotebookFilePath]);

  useEffect(() => {
    const loadComposerListAndSelectFirst = async () => {
      await listComposersAPI();
    };
    loadComposerListAndSelectFirst();
  }, []);

  useEffect(() => {
    if (
      composerList.length > 0 &&
      backselectedEnvironment === '' &&
      createSelectedEnvironment === ''
    ) {
      setComposerSelectedList(composerList[0]);
    }
    if (
      composerList.length > 0 &&
      backselectedEnvironment === '' &&
      createSelectedEnvironment !== ''
    ) {
      setComposerSelectedList(createSelectedEnvironment);
    }
    if (composerList.length > 0 && backselectedEnvironment !== '') {
      setComposerSelectedList(backselectedEnvironment);
    }
  }, [composerList]);

  useEffect(() => {
    if (composerSelectedList !== '') {
      setIsLoading(true);
      listDagInfoAPI();
      handleImportErrordata();
    }
  }, [composerSelectedList]);

  useEffect(() => {
    if (composerSelectedList !== '') {
      pollingDagList(listDagInfoAPI, false);
    }
    return () => {
      pollingDagList(listDagInfoAPI, true);
    };
  }, [composerSelectedList]);

  useEffect(() => {
    if (composerSelectedList !== '') {
      pollingImportError(handleImportErrordata, false);
    }
    return () => {
      pollingImportError(handleImportErrordata, true);
    };
  }, [composerSelectedList]);

  return (
    <div>
      <div className="select-text-overlay-scheduler">
        <div className="create-scheduler-form-element">
          <Autocomplete
            options={composerList}
            value={composerSelectedList}
            onChange={(_event, val) => {
              handleComposerSelected(val);
            }}
            renderInput={params => (
              <TextField {...params} label="Environment*" />
            )}
          />
        </div>
        {importErrorEntries > 0 && (
          <div className="import-error-parent">
            <div
              className="accordion-button"
              role="button"
              aria-label="Show Import Errors"
              title="Show Import Errors"
              onClick={handleImportErrorPopup}
            >
              Show Schedule Errors ({importErrorEntries})
            </div>
            {importErrorPopupOpen && (
              <ImportErrorPopup
                importErrorData={importErrorData}
                importErrorEntries={importErrorEntries}
                importErrorPopupOpen={importErrorPopupOpen}
                onClose={handleImportErrorClosed}
                onDelete={(dagId :string) =>handleDeleteImportError(dagId)}
              />
            )}
          </div>
        )}
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
          {deletePopupOpen && (
            <DeletePopup
              onCancel={() => handleCancelDelete()}
              onDelete={() => handleDeleteScheduler()}
              deletePopupOpen={deletePopupOpen}
              DeleteMsg={`This will delete ${selectedDagId} and cannot be undone.`}
              deletingNotebook={deletingNotebook}
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
