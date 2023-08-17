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
import { useTable, useGlobalFilter, usePagination } from 'react-table';
import { LabIcon } from '@jupyterlab/ui-components';
import filterIcon from '../../style/icons/filter_icon.svg';
import deleteIcon from '../../style/icons/delete_icon.svg';
import { ClipLoader } from 'react-spinners';
import GlobalFilter from '../utils/globalFilter';
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  BASE_URL,
  ClusterStatus
} from '../utils/const';
import TableData from '../utils/tableData';
import { ICellProps, authApi, jobTimeFormat } from '../utils/utils';
import DeletePopup from '../utils/deletePopup';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { deleteRuntimeTemplateAPI } from '../utils/runtimeService';
import { PaginationView } from '../utils/paginationView';
import PollingTimer from '../utils/pollingTimer';
import SubmitJobIcon from '../../style/icons/submit_job_icon.svg';
// import CreateRuntimeTemplate from './createRuntimeTemplate';

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

interface IListRuntimeTemplate {
  openCreateTemplate: boolean;
  setOpenCreateTemplate: (value: boolean) => void;
  setRuntimeTemplateSelected: any
}

function ListRuntimeTemplates({
  openCreateTemplate,
  setOpenCreateTemplate,
  setRuntimeTemplateSelected
}: IListRuntimeTemplate) {
  const [runtimeTemplateslist, setRuntimeTemplateslist] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pollingDisable, setPollingDisable] = useState(false);
  
  const [deletePopupOpen, setDeletePopupOpen] = useState(false);
  const [selectedRuntimeTemplateValue, setSelectedRuntimeTemplateValue] =
    useState('');
  const timer = useRef<NodeJS.Timeout | undefined>(undefined);

  const pollingRuntimeTemplates = async (
    pollingFunction: () => void,
    pollingDisable: boolean
  ) => {
    timer.current = PollingTimer(
      pollingFunction,
      pollingDisable,
      timer.current
    );
  };

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
    nextPageToken?: string,
    previousRuntimeTemplatesList?: object
  ) => {
    const credentials = await authApi();
    const pageToken = nextPageToken ?? '';
    if (credentials) {
      fetch(
        `${BASE_URL}/projects/${credentials.project_id}/locations/${credentials.region_id}/sessionTemplates?pageSize=50&pageToken=${pageToken}`,
        {
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      )
        .then((response: Response) => {
          response
            .json()
            .then((responseResult: any) => {
              let transformRuntimeTemplatesListData = [];
              if (responseResult && responseResult.sessionTemplates) {
                let runtimeTemplatesListNew = responseResult.sessionTemplates;
                runtimeTemplatesListNew.sort(
                  (a: { updateTime: string }, b: { updateTime: string }) => {
                    const dateA = new Date(a.updateTime);
                    const dateB = new Date(b.updateTime);
                    return Number(dateB) - Number(dateA);
                  }
                );
                transformRuntimeTemplatesListData = runtimeTemplatesListNew.map(
                  (data: any) => {
                    const startTimeDisplay = data.updateTime ? jobTimeFormat(data.updateTime): '';

                    let displayName = '';

                    if (data.jupyterSession && data.jupyterSession.displayName) {
                      displayName = data.jupyterSession.displayName;
                    }

                    return {
                      name: displayName,
                      owner: data.creator,
                      description: data.description,
                      lastModified: startTimeDisplay,
                      actions: renderActions(data)
                    };
                  }
                );
              }

              const existingRuntimeTemplatesData =
                previousRuntimeTemplatesList ?? [];
              //setStateAction never type issue
              let allRuntimeTemplatesData: any = [
                ...(existingRuntimeTemplatesData as []),
                ...transformRuntimeTemplatesListData
              ];

              if (responseResult.nextPageToken) {
                listRuntimeTemplatesAPI(
                  responseResult.nextPageToken,
                  allRuntimeTemplatesData
                );
              } else {
                setRuntimeTemplateslist(allRuntimeTemplatesData);
                setIsLoading(false);
              }
            })
            .catch((e: Error) => {
              console.error(e);
              setIsLoading(false);
            });
        })
        .catch((err: Error) => {
          setIsLoading(false);
          console.error('Error listing runtime templates', err);
          toast.error('Failed to fetch runtime templates');
        });
    }
  };

  const handleDeleteRuntimeTemplate = (runtimeTemplateName: string) => {
    setSelectedRuntimeTemplateValue(runtimeTemplateName);
    setDeletePopupOpen(true);
  };
  const handleCancelDelete = () => {
    setDeletePopupOpen(false);
  };

  const handleDelete = async () => {
    await deleteRuntimeTemplateAPI(selectedRuntimeTemplateValue);
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
    canPreviousPage,
    canNextPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize }
  } = useTable(
    { columns, data, autoResetPage: false, initialState: { pageSize: 50 } },
    useGlobalFilter,
    usePagination
  );

  useEffect(() => {
    listRuntimeTemplatesAPI();
    if (!openCreateTemplate) {
      pollingRuntimeTemplates(listRuntimeTemplatesAPI, pollingDisable);
    }

    return () => {
      pollingRuntimeTemplates(listRuntimeTemplatesAPI, true);
    };
  }, [pollingDisable, openCreateTemplate]);

  const renderActions = (data: { state: ClusterStatus; name: string }) => {
    let runtimeTemplateName = data.name;
    return (
      <div className="actions-icon">
        <div
          role="button"
          className="icon-buttons-style"
          title="Delete Runtime Template"
          onClick={() => handleDeleteRuntimeTemplate(runtimeTemplateName)}
        >
          <iconDelete.react tag="div" />
        </div>
      </div>
    );
  };

  const handleRuntimeTemplatesName = (selectedName: string) => {
    let selectedRunTime: any = []
    runtimeTemplateslist.forEach((data: any)=>{
      if(data.name === selectedName) {
        selectedRunTime.push(data)
      }
    })
    pollingRuntimeTemplates(listRuntimeTemplatesAPI, true);
    setRuntimeTemplateSelected(selectedRunTime[0]);
    setOpenCreateTemplate(true);
  };

  const handleCreateBatchOpen = () => {
    setOpenCreateTemplate(true);
  };

  const tableDataCondition = (cell: ICellProps) => {
    if (cell.column.Header === 'Name') {
      return (
        <td
          role="button"
          {...cell.getCellProps()}
          className="cluster-name"
          onClick={() => handleRuntimeTemplatesName(cell.value)}
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

  return (
    <div className="list-runtime-template-wrapper">
      <ToastContainer />
      {deletePopupOpen && (
        <DeletePopup
          onCancel={() => handleCancelDelete()}
          onDelete={() => handleDelete()}
          deletePopupOpen={deletePopupOpen}
          DeleteMsg={
            'This will delete ' +
            selectedRuntimeTemplateValue +
            ' and cannot be undone.'
          }
        />
      )}
      {runtimeTemplateslist.length > 0 && !openCreateTemplate ? (
        <div>
          <div className="create-runtime-button-wrapper">
            <div
              className="create-runtime-overlay"
              onClick={() => {
                handleCreateBatchOpen();
              }}
            >
              <div className="create-cluster-icon">
                <iconSubmitJob.react tag="div" />
              </div>
              <div className="create-cluster-text">Create</div>
            </div>
          </div>
          <div className="filter-cluster-overlay">
            <div className="filter-cluster-icon">
              <iconFilter.react tag="div" />
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
            {runtimeTemplateslist.length > 50 && (
              <PaginationView
                pageSize={pageSize}
                setPageSize={setPageSize}
                pageIndex={pageIndex}
                allData={runtimeTemplateslist}
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
            <div className="spin-loader-runtime">
              <ClipLoader
                color="#8A8A8A"
                loading={true}
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
        </div>
      )}
    </div>
  );
}

export default ListRuntimeTemplates;
