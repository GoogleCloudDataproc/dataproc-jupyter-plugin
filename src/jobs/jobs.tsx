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
import {
  authApi,
  jobTimeFormat,
  jobTypeValue,
  elapsedTime,
  statusMessage,
  jobTypeDisplay,
  ICellProps,
  toastifyCustomStyle
} from '../utils/utils';
import { LabIcon } from '@jupyterlab/ui-components';
import filterIcon from '../../style/icons/filter_icon.svg';
import cloneIcon from '../../style/icons/clone_icon.svg';
import stopIcon from '../../style/icons/stop_icon.svg';
import JobDetails from './jobDetails';
import stopDisableIcon from '../../style/icons/stop_disable_icon.svg';
import deleteIcon from '../../style/icons/delete_icon.svg';
import clusterRunningIcon from '../../style/icons/cluster_running_icon.svg';
import clusterErrorIcon from '../../style/icons/cluster_error_icon.svg';
import SucceededIcon from '../../style/icons/succeeded_icon.svg';
import SubmitJobIcon from '../../style/icons/submit_job_icon.svg';
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  BASE_URL,
  ClusterStatus,
  STATUS_CANCELLED,
  STATUS_CREATING,
  STATUS_DELETING,
  STATUS_FAIL,
  STATUS_PROVISIONING,
  STATUS_STARTING,
  STATUS_STOPPING,
  STATUS_SUCCESS
} from '../utils/const';
import ClipLoader from 'react-spinners/ClipLoader';
import SubmitJob from './submitJob';
import GlobalFilter from '../utils/globalFilter';
import TableData from '../utils/tableData';
import DeletePopup from '../utils/deletePopup';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { stopJobApi, deleteJobApi } from '../utils/jobServices';
import { PaginationView } from '../utils/paginationView';
import PollingTimer from '../utils/pollingTimer';

const iconFilter = new LabIcon({
  name: 'launcher:filter-icon',
  svgstr: filterIcon
});
const iconClone = new LabIcon({
  name: 'launcher:clone-icon',
  svgstr: cloneIcon
});
const iconStop = new LabIcon({
  name: 'launcher:stop-icon',
  svgstr: stopIcon
});
const iconStopDisable = new LabIcon({
  name: 'launcher:stop-disable-icon',
  svgstr: stopDisableIcon
});
const iconDelete = new LabIcon({
  name: 'launcher:delete-icon',
  svgstr: deleteIcon
});
const iconClusterRunning = new LabIcon({
  name: 'launcher:cluster-running-icon',
  svgstr: clusterRunningIcon
});
const iconClusterError = new LabIcon({
  name: 'launcher:cluster-error-icon',
  svgstr: clusterErrorIcon
});
const iconSucceeded = new LabIcon({
  name: 'launcher:succeeded-icon',
  svgstr: SucceededIcon
});
const iconSubmitJob = new LabIcon({
  name: 'launcher:submit-job-icon',
  svgstr: SubmitJobIcon
});

function JobComponent({
  clusterSelected,
  detailedJobView,
  setDetailedJobView,
  submitJobView,
  setSubmitJobView,
  setDetailedView,
  clusterResponse,
  selectedJobClone,
  setSelectedJobClone,
  clustersList
}: any) {
  const [jobsList, setjobsList] = useState([]);
  const [jobSelected, setjobSelected] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [pollingDisable, setPollingDisable] = useState(false);
  const [region, setRegion] = useState('');
  const [deletePopupOpen, setDeletePopupOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const timer = useRef<NodeJS.Timeout | undefined>(undefined);

  const pollingJobs = async (
    pollingFunction: () => void,
    pollingDisable: boolean
  ) => {
    timer.current = PollingTimer(
      pollingFunction,
      pollingDisable,
      timer.current
    );
  };

  const data = jobsList;

  const columns = React.useMemo(
    () => [
      {
        Header: 'Job ID',
        accessor: 'jobid'
      },
      {
        Header: 'Status',
        accessor: 'status'
      },
      {
        Header: 'Region',
        accessor: 'region'
      },
      {
        Header: 'Type',
        accessor: 'type'
      },
      {
        Header: 'Start time',
        accessor: 'starttime'
      },

      {
        Header: 'Elapsed time',
        accessor: 'elapsedtime'
      },
      {
        Header: 'Labels',
        accessor: 'labels'
      },
      {
        Header: 'Actions',
        accessor: 'actions'
      }
    ],
    []
  );

  const jobDetails = (selectedName: string) => {
    pollingJobs(listJobsAPI, true);
    const filteredJobDetails = jobsList.filter((jobInfo: any) => {
      return jobInfo.jobid === selectedName;
    });
    const region = filteredJobDetails[0];
    setRegion(region);
    setjobSelected(selectedName);
    setDetailedJobView(true);
  };

  const handleSubmitJobOpen = () => {
    setSubmitJobView(true);
    setSelectedJobClone('');
  };
  const handleDeleteJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setDeletePopupOpen(true);
  };
  const handleStopJob = async (jobId: string) => {
    setSelectedJobId(jobId);
    await stopJobApi(jobId);
  };
  const handleCancelDelete = () => {
    setDeletePopupOpen(false);
  };

  const handleDelete = async () => {
    await deleteJobApi(selectedJobId);
    setDeletePopupOpen(false);
  };
  interface IJobList {
    jobs: Array<{
      reference: {
        jobId: string;
      };
      statusHistory: Array<{
        stateStartTime: string;
      }>;
      status: {
        stateStartTime: string;
      };
      labels?: {
        [key: string]: string;
      };
    }>;
    nextPageToken?: string;
  }

  const listJobsAPI = async (
    nextPageToken?: string,
    previousJobsList?: object
  ) => {
    const credentials = await authApi();
    const clusterName = clusterSelected ?? '';
    const pageToken = nextPageToken ?? '';
    if (credentials) {
      fetch(
        `${BASE_URL}/projects/${credentials.project_id}/regions/${credentials.region_id}/jobs?pageSize=50&pageToken=${pageToken}&&clusterName=${clusterName}`,
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
            .then((responseResult: IJobList) => {
              let transformJobListData: {
                jobid: number;
                status: string;
                region: string | undefined;
                type: string | undefined;
                starttime: string;
                elapsedtime: string;
                labels: string[];
                actions: React.JSX.Element;
              }[] = [];
              if (responseResult && responseResult.jobs) {
                transformJobListData = responseResult.jobs.map((data: any) => {
                  const startTime = jobTimeFormat(
                    data.statusHistory[0].stateStartTime
                  );
                  const job = jobTypeValue(data);
                  const jobType = jobTypeDisplay(job);
                  const endTime = data.status.stateStartTime;
                  const jobStartTime = new Date(
                    data.statusHistory[0].stateStartTime
                  );

                  const elapsedTimeString = elapsedTime(endTime, jobStartTime);

                  const statusMsg = statusMessage(data);

                  const labelvalue = [];
                  if (data.labels) {
                    for (const [key, value] of Object.entries(data.labels)) {
                      labelvalue.push(`${key} : ${value}`);
                    }
                  } else {
                    labelvalue.push('None');
                  }
                  return {
                    jobid: data.reference.jobId,
                    status: statusMsg,
                    region: credentials.region_id,
                    type: jobType,
                    starttime: startTime,
                    elapsedtime: elapsedTimeString,
                    labels: labelvalue,
                    actions: renderActions(data)
                  };
                });
              }
              const existingJobsData = previousJobsList ?? [];
              //setStateAction never type issue
              let allJobsData: any = [
                ...(existingJobsData as []),
                ...transformJobListData
              ];

              if (responseResult.nextPageToken) {
                listJobsAPI(responseResult.nextPageToken, allJobsData);
              } else {
                setjobsList(allJobsData);
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
          console.error('Error listing jobs', err);
          toast.error('Failed to fetch jobs', toastifyCustomStyle);
        });
    }
  };

  const handleCloneJob = (data: object) => {
    setSubmitJobView(true);
    setSelectedJobClone(data);
  };
  const renderActions = (data: {
    reference: { jobId: string };
    status: { state: ClusterStatus };
    clusterName: string;
  }) => {
    const jobId = data.reference.jobId;
    return (
      <div className="actions-icon">
        <div
          role="button"
          className="icon-buttons-style"
          title="Clone Job"
          onClick={() => handleCloneJob(data)}
        >
          <iconClone.react tag="div" className="logo-alignment-style" />
        </div>
        <div
          role="button"
          aria-disabled={data.status.state !== ClusterStatus.STATUS_RUNNING}
          className={
            data.status.state === ClusterStatus.STATUS_RUNNING
              ? 'icon-buttons-style'
              : 'icon-buttons-style-disable'
          }
          title="Stop Job"
          onClick={
            data.status.state === ClusterStatus.STATUS_RUNNING
              ? () => handleStopJob(jobId)
              : undefined
          }
        >
          {data.status.state === ClusterStatus.STATUS_RUNNING ? (
            <iconStop.react tag="div" className="logo-alignment-style" />
          ) : (
            <iconStopDisable.react tag="div" className="logo-alignment-style" />
          )}
        </div>
        <div
          role="button"
          aria-disabled={data.status.state !== ClusterStatus.STATUS_RUNNING}
          className={
            data.status.state === ClusterStatus.STATUS_RUNNING
              ? 'icon-buttons-style-disable'
              : 'icon-buttons-style'
          }
          title="Delete Job"
          onClick={
            data.status.state !== ClusterStatus.STATUS_RUNNING
              ? () => handleDeleteJob(jobId)
              : undefined
          }
        >
          {data.status.state === ClusterStatus.STATUS_RUNNING ? (
            <iconDelete.react tag="div" className="logo-alignment-style" />
          ) : (
            <iconDelete.react tag="div" className="logo-alignment-style" />
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    listJobsAPI();
    return () => {
      pollingJobs(listJobsAPI, true);
    };
  }, [pollingDisable, detailedJobView]);
  useEffect(() => {
    if (!detailedJobView && !isLoading) {
      pollingJobs(listJobsAPI, pollingDisable);
    }
  }, [isLoading]);
  const tableDataCondition = (cell: ICellProps) => {
    if (cell.column.Header === 'Job ID') {
      return (
        <td
          role="button"
          {...cell.getCellProps()}
          className="cluster-name"
          onClick={() => jobDetails(cell.value)}
        >
          {cell.value}
        </td>
      );
    }
    if (cell.column.Header === 'Status' && cell.value) {
      return (
        <td {...cell.getCellProps()} className="clusters-table-data">
          <div key="Status" className="cluster-status-parent">
            {cell.value === ClusterStatus.STATUS_RUNNING && (
              <iconClusterRunning.react
                tag="div"
                className="logo-alignment-style"
              />
            )}
            {cell.value === STATUS_CANCELLED && (
              <iconStop.react tag="div" className="logo-alignment-style" />
            )}
            {cell.value === STATUS_FAIL && (
              <iconClusterError.react
                tag="div"
                className="logo-alignment-style"
              />
            )}
            {cell.value === STATUS_SUCCESS && (
              <iconSucceeded.react tag="div" className="logo-alignment-style" />
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
            <div className="cluster-status">{cell.value.toLowerCase()}</div>
          </div>
        </td>
      );
    }
    if (cell.column.Header === 'Labels') {
      return (
        <td {...cell.getCellProps()} className="clusters-table-data">
          {cell.value.map((label: string) => {
            return (
              <div
                key={label}
                className={label !== 'None' ? 'job-label-style-list' : ''}
              >
                {label}
              </div>
            );
          })}
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
    { columns, data, autoResetPage: false, initialState: { pageSize: 50 } },
    useGlobalFilter,
    usePagination
  );

  return (
    <div>
      {submitJobView && !detailedJobView && (
        <SubmitJob
          setSubmitJobView={setSubmitJobView}
          selectedJobClone={selectedJobClone}
          clusterResponse={clusterResponse}
        />
      )}
      {deletePopupOpen && (
        <DeletePopup
          onCancel={() => handleCancelDelete()}
          onDelete={() => handleDelete()}
          deletePopupOpen={deletePopupOpen}
          DeleteMsg={
            'This will delete ' + selectedJobId + ' and cannot be undone.'
          }
        />
      )}
      {!submitJobView && detailedJobView && (
        <JobDetails
          jobSelected={jobSelected}
          setDetailedJobView={setDetailedJobView}
          stopJobApi={stopJobApi}
          deleteJobApi={deleteJobApi}
          region={region}
          setDetailedView={setDetailedView}
          clusterResponse={clusterResponse}
          clustersList={clustersList}
        />
      )}
      {!submitJobView && !detailedJobView && (
        <div>
          {clusterResponse &&
            clusterResponse.clusters &&
            clusterResponse.clusters.length > 0 && (
              <div className="create-cluster-overlay">
                <div
                  role="button"
                  className="create-cluster-sub-overlay"
                  onClick={() => {
                    handleSubmitJobOpen();
                  }}
                >
                  <div className="create-icon">
                    <iconSubmitJob.react
                      tag="div"
                      className="logo-alignment-style"
                    />
                  </div>
                  <div className="create-text">SUBMIT JOB</div>
                </div>
              </div>
            )}
          {jobsList.length > 0 ? (
            <div>
              <div className="filter-cluster-overlay">
                <div className="filter-cluster-icon">
                  <iconFilter.react
                    tag="div"
                    className="logo-alignment-style"
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
              <div
                className={
                  clusterSelected
                    ? 'jobs-list-table-parent-small'
                    : 'jobs-list-table-parent'
                }
              >
                <TableData
                  getTableProps={getTableProps}
                  headerGroups={headerGroups}
                  getTableBodyProps={getTableBodyProps}
                  isLoading={isLoading}
                  page={page}
                  rows={rows}
                  prepareRow={prepareRow}
                  tableDataCondition={tableDataCondition}
                  fromPage="Jobs"
                />
                {jobsList.length > 50 && (
                  <PaginationView
                    pageSize={pageSize}
                    setPageSize={setPageSize}
                    pageIndex={pageIndex}
                    allData={jobsList}
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
                    size={20}
                    aria-label="Loading Spinner"
                    data-testid="loader"
                  />
                  Loading Jobs
                </div>
              )}
              {!isLoading && (
                <div className="no-data-style">No rows to display</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default JobComponent;
