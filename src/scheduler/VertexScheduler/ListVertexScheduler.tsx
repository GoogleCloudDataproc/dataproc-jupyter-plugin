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

import React, {
  useState, useEffect,
} from 'react';
import { useTable, usePagination } from 'react-table';
import TableData from '../../utils/tableData';
import { PaginationView } from '../../utils/paginationView';
import { VertexCellProps } from '../../utils/utils';
import { JupyterFrontEnd } from '@jupyterlab/application';
import {
  CircularProgress,
  Button
} from '@mui/material';
import deleteIcon from '../../../style/icons/scheduler_delete.svg';
import CompletedIcon from '../../../style/icons/dag_task_success_icon.svg'
import FailedIcon from '../../../style/icons/dag_task_failed_icon.svg'
import ActiveIcon from '../../../style/icons/cluster_running_icon.svg'
import { LabIcon } from '@jupyterlab/ui-components';
import playIcon from '../../../style/icons/scheduler_play.svg';
import pauseIcon from '../../../style/icons/scheduler_pause.svg';
import EditIconDisable from '../../../style/icons/scheduler_edit_dag.svg';
import EditNotebookIcon from '../../../style/icons/scheduler_edit_calendar.svg';
import DeletePopup from '../../utils/deletePopup';
import triggerIcon from '../../../style/icons/scheduler_trigger.svg';
import { PLUGIN_ID } from '../../utils/const';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { VertexServices } from './VertexServices';
import { RegionDropdown } from '../../controls/RegionDropdown';
import { authApi } from '../../utils/utils';

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

const iconSuccess = new LabIcon({
  name: 'launcher:success-icon',
  svgstr: CompletedIcon
});

const iconFailed = new LabIcon({
  name: 'launcher:failed-icon',
  svgstr: FailedIcon
});

const iconActive = new LabIcon({
  name: 'launcher:active-icon',
  svgstr: ActiveIcon
});


interface IDagList {
  displayName: string;
  schedule: string;
  status: string;
}

function listVertexScheduler({
  app,
  settingRegistry,
}: {
  app: JupyterFrontEnd;
  settingRegistry: ISettingRegistry;

}) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dagList, setDagList] = useState<IDagList[]>([]);
  const data = dagList;
  const [deletePopupOpen, setDeletePopupOpen] = useState<boolean>(false);
  // const [editDagLoading,
  //   //setEditDagLoading
  // ] = useState('');
  const [inputNotebookFilePath, setInputNotebookFilePath] = useState<string>('');
  const [editNotebookLoading, setEditNotebookLoading] = useState<string>('');
  const [deletingSchedule, setDeletingSchedule] = useState<boolean>(false);
  const [isPreviewEnabled, setIsPreviewEnabled] = useState<boolean>(false);
  console.log(isPreviewEnabled)
  const [nextPageFlag, setNextPageFlag] = useState<string>('');
  console.log(nextPageFlag);
  const [region, setRegion] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [uniqueScheduleId, setUniqueScheduleId] = useState<string>('');
  const [scheduleDisplayName, setScheduleDisplayName] = useState<string>('');

  const columns = React.useMemo(
    () => [
      {
        Header: 'Job Name',
        accessor: 'displayName'
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

  /**
  * Get list of schedules
  * @param {}
  */
  const listDagInfoAPI = async () => {
    setIsLoading(true);
    await VertexServices.listVertexSchedules(
      setDagList,
      region,
      setIsLoading,
      setNextPageFlag
    );
  };

  /**
  * Handle resume and pause 
  * @param {string} scheduleId unique ID for schedule
  * @param {string} is_status_paused modfied status of schedule
  * @param {string} displayName name of schedule
  */
  const handleUpdateScheduler = async (
    scheduleId: string,
    is_status_paused: string,
    displayName: string
  ) => {
    if (is_status_paused === 'ACTIVE') {
      await VertexServices.handleUpdateSchedulerPauseAPIService(
        scheduleId,
        region,
        setDagList,
        setIsLoading,
        setNextPageFlag,
        displayName
      );
    } else {
      await VertexServices.handleUpdateSchedulerResumeAPIService(
        scheduleId,
        region,
        setDagList,
        setIsLoading,
        setNextPageFlag,
        displayName
      );
    }
  };

  /**
  * Trigger a job immediately
  * @param {string} displayName name of schedule
  */
  const handleTriggerSchedule = async (event: React.MouseEvent, displayName: string) => {
    const scheduleId = event.currentTarget.getAttribute('data-scheduleId');
    if (scheduleId !== null) {
      await VertexServices.triggerSchedule(region, scheduleId, displayName);
    }
  };

  /**
  * Delete pop up
  * @param {string} schedule_id Id of schedule
  * @param {string} displayName name of schedule
  */
  const handleDeletePopUp = (schedule_id: string, displayName: string) => {
    setUniqueScheduleId(schedule_id);
    setScheduleDisplayName(displayName)
    setDeletePopupOpen(true);
  };

  /**
  * Cancel delete pop up
  * @param {}
  */
  const handleCancelDelete = () => {
    setDeletePopupOpen(false);
  };

  /**
  * Delete a schedule
  * @param {}
  */
  const handleDeleteScheduler = async () => {
    setDeletingSchedule(true);
    await VertexServices.handleDeleteSchedulerAPIService(
      region,
      uniqueScheduleId,
      scheduleDisplayName,
      setDagList,
      setIsLoading,
      setNextPageFlag,
    );
    setDeletePopupOpen(false);
    setDeletingSchedule(false);
  };

  /**
  * Edit schedule
  * @param {}
  */
  const handleEditVertex = async (event: React.MouseEvent, displayName: string) => {
    const scheduleId = event.currentTarget.getAttribute('data-scheduleId');
    if (scheduleId !== null) {
      await VertexServices.editVertexSchedulerService(
        scheduleId,
        region,
        setInputNotebookFilePath,
        setEditNotebookLoading,
      );
    }
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
    { columns, data, autoResetPage: false, initialState: { pageSize: 100 } },
    usePagination
  );

  const renderActions = (data: any) => {
    const is_status_paused = data.status;
    return (
      <div className="actions-icon">
        <div
          role="button"
          className="icon-buttons-style"
          title={is_status_paused === "COMPLETED" ? "Completed" : (is_status_paused === "PAUSE" ? 'Unpause' : 'Pause')}
          onClick={e => {
            is_status_paused !== "COMPLETED" && handleUpdateScheduler(data.name, is_status_paused, data.displayName)
          }}
        >
          {is_status_paused === 'COMPLETED' ? <iconPlay.react
            tag="div"
            className="icon-buttons-style-disable disable-complete-btn"
          /> : (
            is_status_paused === 'PAUSED' ?
              (<iconPlay.react
                tag="div"
                className="icon-white logo-alignment-style"
              />
              ) : (
                <iconPause.react
                  tag="div"
                  className="icon-white logo-alignment-style"
                />
              ))}
        </div>
        <div
          role="button"
          className='icon-buttons-style'
          title='Trigger the job'
          data-scheduleId={data.name}
          onClick={e => handleTriggerSchedule(e, data.displayName)}
        >
          <iconTrigger.react
            tag="div"
            className="icon-white logo-alignment-style"
          />
        </div>
        {/* {data.jobid === editDagLoading ? (
          <div className="icon-buttons-style">
            <CircularProgress
              size={18}
              aria-label="Loading Spinner"
              data-testid="loader"
            />
          </div>
        ) : ( */}
        <div
          role="button"
          className="icon-buttons-style"
          title="Edit Schedule"
          data-jobid={data.jobid}
        //onClick={e => handleEditDags(e)}
        >
          <iconEditNotebook.react
            tag="div"
            className="icon-white logo-alignment-style"
          />
        </div>
        {/* )} */}
        {
          // isPreviewEnabled &&
          (data.name === editNotebookLoading ? (
            <div className="icon-buttons-style">
              <CircularProgress
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
              data-scheduleId={data.name}
              onClick={e => handleEditVertex(e, data.displayName)}
            >
              <iconEditDag.react
                tag="div"
                className="icon-white logo-alignment-style"
              />
            </div>
          ))}
        <div
          role="button"
          className="icon-buttons-style"
          title="Delete"
          onClick={() => handleDeletePopUp(data.name, data.displayName)}
        >
          <iconDelete.react
            tag="div"
            className="icon-white logo-alignment-style"
          />
        </div>
      </div>
    );
  };

  const tableDataCondition = (cell: VertexCellProps) => {
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
        //onClick={() => handleDagIdSelection(composerSelectedList, cell.value)}
        >
          {cell.value}
        </td>
      );
    } else {
      return (
        <td {...cell.getCellProps()} className={cell.column.Header === 'Schedule' ? "clusters-table-data table-cell-width" : "clusters-table-data"}>
          {
            cell.column.Header === 'Status' ?
              <>
                <div className='execution-history-main-wrapper'>
                  {cell.row.original.lastScheduledRunResponse && cell.row.original.lastScheduledRunResponse.runResponse === 'OK' ? (cell.row.original.status === 'COMPLETED' ?
                    <div>
                      <iconSuccess.react
                        tag="div"
                        className="icon-white logo-alignment-style success_icon icon-size"
                      />
                    </div> : (cell.row.original.status === 'ACTIVE' ?
                      <iconActive.react
                        tag="div"
                        title={cell.row.original.lastScheduledRunResponse && cell.row.original.lastScheduledRunResponse.runResponse}
                        className="icon-white logo-alignment-style success_icon icon-size"
                      /> :
                      <iconSuccess.react
                        tag="div"
                        title="Done !"
                        className="icon-white logo-alignment-style success_icon icon-size"
                      />
                    ))
                    : <div>
                      <iconFailed.react
                        tag="div"
                        title={cell.row.original.lastScheduledRunResponse && cell.row.original.lastScheduledRunResponse.runResponse}
                        className="icon-white logo-alignment-style success_icon icon-size"
                      />
                    </div>}
                  {cell.render('Cell')}
                </div>

              </>
              :
              <>{cell.render('Cell')}</>
          }

        </td >
      );
    }
  };

  const checkPreviewEnabled = async () => {
    const settings = await settingRegistry.load(PLUGIN_ID);

    // The current value of whether or not preview features are enabled.
    let previewEnabled = settings.get('previewEnabled').composite as boolean;
    setIsPreviewEnabled(previewEnabled);
  };

  const openEditDagNotebookFile = async () => {
    let filePath = inputNotebookFilePath.replace('gs://', 'gs:');
    const openNotebookFile: any = await app.commands.execute('docmanager:open', {
      path: filePath
    });
    setInputNotebookFilePath('');
    if (openNotebookFile) {
      setEditNotebookLoading('');
    }
  };

  useEffect(() => {
    if (inputNotebookFilePath !== '') {
      openEditDagNotebookFile();
    }
  }, [inputNotebookFilePath]);

  useEffect(() => {
    checkPreviewEnabled();
  }, [])

  useEffect(() => {
    if (region !== '') {
      setIsLoading(true);
      listDagInfoAPI();
    }
  }, [region]);

  useEffect(() => {
    authApi()
      .then((credentials) => {
        if (credentials && credentials?.region_id && credentials.project_id) {
          setRegion(credentials.region_id);
          setProjectId(credentials.project_id);
        }
      })
      .catch((error) => {
        console.error(error);
      });
  }, [projectId])


  return (
    <div>
      <div className="select-text-overlay-scheduler">
        <div className="region-overlay create-scheduler-form-element content-pd-space ">
          <RegionDropdown
            projectId={projectId}
            region={region}
            onRegionChange={region => setRegion(region)}
          />
        </div>
        <div className="btn-refresh">
          <Button
            disabled={isLoading}
            className="btn-refresh-text"
            variant="outlined"
            aria-label="cancel Batch"
            onClick={listDagInfoAPI}
          >
            <div>REFRESH</div>
          </Button>
        </div>
      </div>

      {/*
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
                onDelete={(dagId: string) => handleDeleteImportError(dagId)}
              />
            )}
          </div>
        )}
      </div> */}
      {dagList.length > 0 ? (
        <>
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
              fromPage="Vertex schedulers"
            />
            {dagList.length > 100 && (
              <PaginationView
                pageSize={pageSize}
                setPageSize={setPageSize}
                pageIndex={pageIndex}
                allData={dagList}
                previousPage={previousPage}
                nextPage={nextPage}
                canPreviousPage={canPreviousPage}
                canNextPage={canNextPage}
                scheduleSelected="vertex"
              />
            )}
            {deletePopupOpen && (
              <DeletePopup
                onCancel={() => handleCancelDelete()}
                onDelete={() => handleDeleteScheduler()}
                deletePopupOpen={deletePopupOpen}
                DeleteMsg={`This will delete ${scheduleDisplayName} and cannot be undone.`}
                deletingSchedule={deletingSchedule}
              />
            )}
          </div>
        </>
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
              Loading Vertex Schedulers
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
export default listVertexScheduler;
