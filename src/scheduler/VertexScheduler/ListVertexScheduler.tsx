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

import React, { useState, useEffect,
} from 'react';
import { useTable, usePagination } from 'react-table';
import TableData from '../../utils/tableData';
import { PaginationView } from '../../utils/paginationView';
import { ICellProps } from '../../utils/utils';
import { JupyterFrontEnd } from '@jupyterlab/application';
import {
CircularProgress,
} from '@mui/material';
import deleteIcon from '../../../style/icons/scheduler_delete.svg';
import { LabIcon } from '@jupyterlab/ui-components';
import playIcon from '../../../style/icons/scheduler_play.svg';
import pauseIcon from '../../../style/icons/scheduler_pause.svg';
import EditIconDisable from '../../../style/icons/scheduler_edit_dag.svg';
import EditNotebookIcon from '../../../style/icons/scheduler_edit_calendar.svg';
import DeletePopup from '../../utils/deletePopup';
import triggerIcon from '../../../style/icons/scheduler_trigger.svg';
// import { PLUGIN_ID } from '../../utils/const';
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
const [isLoading, setIsLoading] = useState(true);
const [dagList, setDagList] = useState<IDagList[]>([]);
const data = dagList;
const [deletePopupOpen, 
 //setDeletePopupOpen
 ] = useState(false);
const [selectedDagId, 
 //setSelectedDagId
 ] = useState('');
const [editDagLoading, 
 //setEditDagLoading
 ] = useState('');
// const [inputNotebookFilePath, setInputNotebookFilePath] = useState('');
const [editNotebookLoading, 
 //setEditNotebookLoading
 ] = useState('');
const [deletingNotebook
 //, setDeletingNotebook
] = useState(false);
const [isPreviewEnabled, 
 //setIsPreviewEnabled
 ] = useState(false);
const [nextPageFlag, setNextPageFlag] = useState('');
console.log(nextPageFlag);
const [region, setRegion] = useState('');
const [projectId, setProjectId] = useState('');
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

const listDagInfoAPI = async () => {
 await VertexServices.listVertexSchedules(
   setDagList,
   region,
   setIsLoading,
   setNextPageFlag
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
     // onClick={e => handleUpdateScheduler(data.jobid, is_status_paused)}
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
       // //onClick={e => {
       //   !is_status_paused ? handleTriggerDag(e) : null;
       // }}
     >
       <iconTrigger.react
         tag="div"
         className="icon-white logo-alignment-style"
       />
     </div>
     {data.jobid === editDagLoading ? (
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
         title="Edit Schedule"
         data-jobid={data.jobid}
         //onClick={e => handleEditDags(e)}
       >
         <iconEditNotebook.react
           tag="div"
           className="icon-white logo-alignment-style"
         />
       </div>
     )}
     {isPreviewEnabled &&
       (data.jobid === editNotebookLoading ? (
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
           data-jobid={data.jobid}
           //onClick={e => handleEditNotebook(e)}
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
       //onClick={() => handleDeletePopUp(data.jobid)}
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
       //onClick={() => handleDagIdSelection(composerSelectedList, cell.value)}
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

// const checkPreviewEnabled = async () => {
//   const settings = await settingRegistry.load(PLUGIN_ID);

//   // The current value of whether or not preview features are enabled.
//   let previewEnabled = settings.get('previewEnabled').composite as boolean;
//   setIsPreviewEnabled(previewEnabled);
// };

// const openEditDagNotebookFile = async () => {
//   let filePath = inputNotebookFilePath.replace('gs://', 'gs:');
//   const openNotebookFile: any = await app.commands.execute('docmanager:open', {
//     path: filePath
//   });
//   setInputNotebookFilePath('');
//   if (openNotebookFile) {
//     setEditNotebookLoading('');
//   }
// };

// useEffect(() => {
//   if (inputNotebookFilePath !== '') {
//     openEditDagNotebookFile();
//   }
// }, [inputNotebookFilePath]);

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
   <div className="region-overlay create-scheduler-form-element content-pd-space ">
     <RegionDropdown
       projectId={projectId}
       region={region}
       onRegionChange={region => setRegion(region)}
     />
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
           fromPage="Notebook Schedulers"
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
             onCancel={() => {}}
             onDelete={() => {}}
             deletePopupOpen={deletePopupOpen}
             DeleteMsg={`This will delete ${selectedDagId} and cannot be undone.`}
             deletingNotebook={deletingNotebook}
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
