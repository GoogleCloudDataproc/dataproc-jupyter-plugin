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
import { useTable, useGlobalFilter, usePagination } from 'react-table';
import { LabIcon } from '@jupyterlab/ui-components';
import filterIcon from '../../style/icons/filter_icon.svg';
import deleteIcon from '../../style/icons/delete_icon.svg';
import GlobalFilter from '../utils/globalFilter';
import TableData from '../utils/tableData';
import { ICellProps } from '../utils/utils';
import DeletePopup from '../utils/deletePopup';
import { RunTimeSerive } from './runtimeService';
import SubmitJobIcon from '../../style/icons/submit_job_icon.svg';
import refreshIcon from '../../style/icons/refresh_cluster_icon.svg'; // Added refresh icon
import PreviousIcon from '../../style/icons/previous_page.svg'; // Added pagination icon
import NextIcon from '../../style/icons/next_page.svg'; // Added pagination icon
import {
  ISessionTemplate,
  ISessionTemplateDisplay
} from '../utils/listRuntimeTemplateInterface';
import { CircularProgress } from '@mui/material';
import ApiEnableDialog from '../utils/apiErrorPopup';
const iconFilter = new LabIcon({
  name: 'launcher:filter-icon',
  svgstr: filterIcon
});
const iconDelete = new LabIcon({
  name: 'launcher:delete-icon',
  svgstr: deleteIcon
});
const iconSubmitJob = new LabIcon({
  name: 'launcher:submit-job-icon',
  svgstr: SubmitJobIcon
});

const iconRefresh = new LabIcon({
  name: 'launcher:refresh-icon',
  svgstr: refreshIcon
});
const iconPrevious = new LabIcon({
  name: 'launcher:previous-icon',
  svgstr: PreviousIcon
});
const iconNext = new LabIcon({
  name: 'launcher:next-icon',
  svgstr: NextIcon
});

interface IListRuntimeTemplate {
  openCreateTemplate: boolean;
  setOpenCreateTemplate: (value: boolean) => void;
  setSelectedRuntimeClone: (value: ISessionTemplate | undefined) => void;
}

function ListRuntimeTemplates({
  openCreateTemplate,
  setOpenCreateTemplate,
  setSelectedRuntimeClone
}: IListRuntimeTemplate) {
  const [runtimeTemplateslist, setRuntimeTemplateslist] = useState<
    ISessionTemplateDisplay[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletePopupOpen, setDeletePopupOpen] = useState(false);
  const [selectedRuntimeTemplateValue, setSelectedRuntimeTemplateValue] =
    useState('');
  const [
    selectedRuntimeTemplateDisplayName,
    setSelectedRuntimeTemplateDisplayName
  ] = useState('');
  const [runTimeTemplateAllList, setRunTimeTemplateAllList] = useState<
    ISessionTemplate[]
  >([]);
  const [apiDialogOpen, setApiDialogOpen] = useState(false);
  const [enableLink, setEnableLink] = useState('');

  const [nextPageTokens, setNextPageTokens] = useState<string[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const data = runtimeTemplateslist;

  const columns = React.useMemo(
    () => [
      {
        Header: 'Name',
        accessor: 'name'
      },
      {
        Header: 'Owner',
        accessor: 'owner'
      },
      {
        Header: 'Description',
        accessor: 'description'
      },
      {
        Header: 'Engine',
        accessor: 'engine'
      },
      {
        Header: 'Authentication',
        accessor: 'authentication'
      },
      {
        Header: 'Last Modified',
        accessor: 'lastModified'
      },
      {
        Header: 'Actions',
        accessor: 'actions'
      }
    ],
    []
  );

  const listRuntimeTemplatesAPI = async (
    pageToken?: string[],
    shouldUpdatePagination: boolean = true
  ) => {
    await RunTimeSerive.listRuntimeTemplatesAPIService(
      renderActions,
      setIsLoading,
      setRuntimeTemplateslist,
      setRunTimeTemplateAllList,
      setApiDialogOpen,
      setEnableLink,
      pageToken ? pageToken : nextPageTokens,
      setNextPageTokens,
      shouldUpdatePagination
    );
  };

  const handleDeleteRuntimeTemplate = (
    runtimeTemplateName: string,
    runtimeTemplateDisplayName: string
  ) => {
    setSelectedRuntimeTemplateValue(runtimeTemplateName);
    setSelectedRuntimeTemplateDisplayName(runtimeTemplateDisplayName);
    setDeletePopupOpen(true);
  };
  const handleCancelDelete = () => {
    setDeletePopupOpen(false);
  };

  const handleDelete = async () => {
    await RunTimeSerive.deleteRuntimeTemplateAPI(
      selectedRuntimeTemplateValue,
      selectedRuntimeTemplateDisplayName
    );
    handleRefresh();
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
    state: { pageSize }
  } = useTable(
    //@ts-ignore columns Header, accessor with interface issue
    { columns, data, autoResetPage: false, initialState: { pageSize: 50 } },
    useGlobalFilter,
    usePagination
  );
  useEffect(() => {
    if (!openCreateTemplate) {
      setCurrentPageIndex(0);
      setNextPageTokens([]);
      listRuntimeTemplatesAPI([], true);
    }
  }, [openCreateTemplate]);

  const renderActions = (data: ISessionTemplate) => {
    let runtimeTemplateName = data.name;
    let runtimeTemplateDisplayName = data?.jupyterSession?.displayName;
    return (
      <div className="actions-icon">
        <div
          role="button"
          className="icon-buttons-style"
          title="Delete Runtime Template"
          onClick={() =>
            handleDeleteRuntimeTemplate(
              runtimeTemplateName,
              runtimeTemplateDisplayName
            )
          }
        >
          <iconDelete.react
            tag="div"
            className="icon-white logo-alignment-style"
          />
        </div>
      </div>
    );
  };

  const handleRuntimeTemplatesName = (selectedValue: ICellProps) => {
    let selectedRunTimeAll: ISessionTemplate[] = [];
    /*
         Extracting runtimeId from name
         Example: "projects/{projectName}/locations/{region}/sessionTemplates/{runtimeid}",
      */

    runTimeTemplateAllList.forEach((data: ISessionTemplate) => {
      if (data.name.split('/')[5] === selectedValue.row.original.id) {
        selectedRunTimeAll.push(data);
      }
    });

    setSelectedRuntimeClone(selectedRunTimeAll[0]);
    setOpenCreateTemplate(true);
  };

  const handleCreateBatchOpen = () => {
    setOpenCreateTemplate(true);
    setSelectedRuntimeClone(undefined);
  };

  const handleRefresh = () => {
    // Fetch the data for the current page, without updating pagination state
    const tokensForCurrentPage = nextPageTokens.slice(0, currentPageIndex);
    listRuntimeTemplatesAPI(tokensForCurrentPage, false);
  };

  const handlePreviousPage = () => {
    if (currentPageIndex > 0) {
      const newPageIndex = currentPageIndex - 1;
      setCurrentPageIndex(newPageIndex);
      // Get tokens needed to fetch the *new* target page
      const tokensForPage = nextPageTokens.slice(0, newPageIndex);
      listRuntimeTemplatesAPI(tokensForPage, true);
    }
  };

  const handleNextPage = () => {
    // We only know a next page exists if a token was added
    if (nextPageTokens.length > currentPageIndex) {
      const newPageIndex = currentPageIndex + 1;
      setCurrentPageIndex(newPageIndex);
      // Pass the *current* token list; service will use the last token
      listRuntimeTemplatesAPI(nextPageTokens, true);
    }
  };

  const tableDataCondition = (cell: ICellProps) => {
    if (cell.column.Header === 'Name') {
      return (
        <td
          role="button"
          {...cell.getCellProps()}
          className="cluster-name"
          onClick={() => handleRuntimeTemplatesName(cell)}
        >
          {cell.value}
        </td>
      );
    } else {
      return (
        <td {...cell.getCellProps()} className="runtime-table-data">
          {cell.render('Cell')}
        </td>
      );
    }
  };

  const canPreviousPage = currentPageIndex > 0;
  const canNextPage = nextPageTokens.length > currentPageIndex;

  const startIndex = currentPageIndex * pageSize + 1;
  const actualRecordsOnCurrentPage = rows.length;

  const endIndex = Math.min(
    (currentPageIndex + 1) * pageSize,
    startIndex - 1 + actualRecordsOnCurrentPage
  );

  const estimatedTotal = canNextPage
    ? (currentPageIndex + 2) * pageSize
    : endIndex;

  return (
    <div className="list-runtime-template-wrapper">
      {deletePopupOpen && (
        <DeletePopup
          onCancel={() => handleCancelDelete()}
          onDelete={() => handleDelete()}
          deletePopupOpen={deletePopupOpen}
          DeleteMsg={
            'This will delete ' +
            selectedRuntimeTemplateDisplayName +
            ' and cannot be undone.'
          }
        />
      )}
      <div className="create-runtime-button-wrapper">
        <div
          className="create-runtime-overlay"
          onClick={() => {
            handleCreateBatchOpen();
          }}
        >
          <div className="create-icon">
            <iconSubmitJob.react tag="div" className="logo-alignment-style" />
          </div>
          <div className="create-text">Create</div>
        </div>

        <div
          className="create-runtime-overlay"
          onClick={() => {
            handleRefresh();
          }}
        >
          <div className="create-icon">
            <iconRefresh.react tag="div" className="logo-alignment-style" />
          </div>
          <div className="create-text">Refresh</div>
        </div>
      </div>
      {runtimeTemplateslist.length > 0 && !openCreateTemplate ? (
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
                setPollingDisable={() => {}}
              />
            </div>
          </div>
          <div className="runtime-list-table-parent">
            <TableData
              getTableProps={getTableProps}
              headerGroups={headerGroups}
              getTableBodyProps={getTableBodyProps}
              isLoading={isLoading}
              rows={rows}
              page={page}
              prepareRow={prepareRow}
              tableDataCondition={tableDataCondition}
              fromPage="Runtime Templates"
            />
            <div className="pagination-parent-view">
              <div>Rows per page: {pageSize}</div>
              <div className="page-display-part">
                {runtimeTemplateslist.length > 0
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
            <div className="spin-loader-runtime">
              <CircularProgress
                className="spin-loader-custom-style"
                size={18}
                aria-label="Loading Spinner"
                data-testid="loader"
              />
              Loading Runtime Templates
            </div>
          )}
          {!isLoading && !openCreateTemplate && (
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
    </div>
  );
}

export default ListRuntimeTemplates;
