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
import { HTTP_METHOD } from '../utils/const';
import TableData from '../utils/tableData';
import {
  ICellProps,
  jobTimeFormat,
  toastifyCustomStyle,
  authenticatedFetch
} from '../utils/utils';
import DeletePopup from '../utils/deletePopup';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { deleteRuntimeTemplateAPI } from '../utils/runtimeService';
import { PaginationView } from '../utils/paginationView';
import PollingTimer from '../utils/pollingTimer';
import SubmitJobIcon from '../../style/icons/submit_job_icon.svg';
import {
  ISessionTemplate,
  ISessionTemplateDisplay,
  ISessionTemplateRoot
} from '../utils/listRuntimeTemplateInterface';
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
  const [pollingDisable, setPollingDisable] = useState(false);

  const [deletePopupOpen, setDeletePopupOpen] = useState(false);
  const [selectedRuntimeTemplateValue, setSelectedRuntimeTemplateValue] =
    useState('');
  const [
    selectedRuntimeTemplateDisplayName,
    setSelectedRuntimeTemplateDisplayName
  ] = useState('');
  const [runTimeTemplateAllList, setRunTimeTemplateAllList] = useState<
    ISessionTemplate[]
  >([
    {
      name: '',
      createTime: '',
      jupyterSession: {
        kernel: '',
        displayName: ''
      },
      creator: '',
      labels: {
        purpose: ''
      },
      environmentConfig: {
        executionConfig: {
          subnetworkUri: ''
        }
      },
      description: '',
      updateTime: ''
    }
  ]);

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
    try {
      const queryParams = new URLSearchParams({});
      const response = await authenticatedFetch({
        uri: 'sessionTemplates',
        method: HTTP_METHOD.GET,
        regionIdentifier: 'locations',
        queryParams: queryParams
      });
      const formattedResponse: ISessionTemplateRoot = await response.json();
      if (formattedResponse && formattedResponse.sessionTemplates) {
        setRunTimeTemplateAllList(formattedResponse.sessionTemplates);
      }
    } catch (error) {}
    try {
      const pageToken = nextPageToken ?? '';
      const queryParams = new URLSearchParams({
        pageSize: '50',
        pageToken: pageToken
      });

      const response = await authenticatedFetch({
        uri: 'sessionTemplates',
        method: HTTP_METHOD.GET,
        regionIdentifier: 'locations',
        queryParams: queryParams
      });
      const formattedResponse: ISessionTemplateRoot = await response.json();
      let transformRuntimeTemplatesListData: ISessionTemplateDisplay[] = [];
      if (formattedResponse && formattedResponse.sessionTemplates) {
        let runtimeTemplatesListNew = formattedResponse.sessionTemplates;
        runtimeTemplatesListNew.sort(
          (a: { updateTime: string }, b: { updateTime: string }) => {
            const dateA = new Date(a.updateTime);
            const dateB = new Date(b.updateTime);
            return Number(dateB) - Number(dateA);
          }
        );
        transformRuntimeTemplatesListData = runtimeTemplatesListNew.map(
          (data: ISessionTemplate) => {
            const startTimeDisplay = data.updateTime
              ? jobTimeFormat(data.updateTime)
              : '';

            let displayName = '';

            if (data.jupyterSession && data.jupyterSession.displayName) {
              displayName = data.jupyterSession.displayName;
            }

            // Extracting runtimeId from name
            // Example: "projects/{projectName}/locations/{region}/sessionTemplates/{runtimeid}",

            return {
              name: displayName,
              owner: data.creator,
              description: data.description,
              lastModified: startTimeDisplay,
              actions: renderActions(data),
              id: data.name.split('/')[5]
            };
          }
        );
      }

      const existingRuntimeTemplatesData = previousRuntimeTemplatesList ?? [];
      //setStateAction never type issue
      let allRuntimeTemplatesData: ISessionTemplateDisplay[] = [
        ...(existingRuntimeTemplatesData as []),
        ...transformRuntimeTemplatesListData
      ];

      if (formattedResponse.nextPageToken) {
        listRuntimeTemplatesAPI(
          formattedResponse.nextPageToken,
          allRuntimeTemplatesData
        );
      } else {
        setRuntimeTemplateslist(allRuntimeTemplatesData);
        setIsLoading(false);
      }
    } catch (error) {
      setIsLoading(false);
      console.error('Error listing runtime templates', error);
      toast.error('Failed to fetch runtime templates', toastifyCustomStyle);
    }
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
    await deleteRuntimeTemplateAPI(
      selectedRuntimeTemplateValue,
      selectedRuntimeTemplateDisplayName
    );
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
    //@ts-ignore columns Header, accessor with interface issue
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

  const renderActions = (data: ISessionTemplate) => {
    let runtimeTemplateName = data.name;
    let runtimeTemplateDisplayName = data.jupyterSession.displayName;
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
            className='icon-white logo-alignment-style'
          />
        </div>
      </div>
    );
  };

  const handleRuntimeTemplatesName = (selectedValue: any) => {
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
    pollingRuntimeTemplates(listRuntimeTemplatesAPI, true);
    setSelectedRuntimeClone(selectedRunTimeAll[0]);
    setOpenCreateTemplate(true);
  };

  const handleCreateBatchOpen = () => {
    setOpenCreateTemplate(true);
    setSelectedRuntimeClone(undefined);
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
      </div>
      {runtimeTemplateslist.length > 0 && !openCreateTemplate ? (
        <div>
          <div className="filter-cluster-overlay">
            <div className="filter-cluster-icon">
              <iconFilter.react
                tag="div"
                className='icon-white logo-alignment-style'
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
