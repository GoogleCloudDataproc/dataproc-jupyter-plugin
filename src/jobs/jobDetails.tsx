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

import React, { useEffect, useState } from 'react';
import { LabIcon } from '@jupyterlab/ui-components';
import LeftArrowIcon from '../../style/icons/left_arrow_icon.svg';

import 'semantic-ui-css/semantic.min.css';
import CloneJobIcon from '../../style/icons/clone_job_icon.svg';
import StopClusterIcon from '../../style/icons/stop_cluster_icon.svg';
import StopClusterDisableIcon from '../../style/icons/stop_cluster_disable_icon.svg';
import DeleteClusterIcon from '../../style/icons/delete_cluster_icon.svg';
import EditIcon from '../../style/icons/edit_icon.svg';
import EditIconDisable from '../../style/icons/edit_icon_disable.svg';
import DeletePopup from '../utils/deletePopup';
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  BASE_URL,
  LABEL_TEXT,
  POLLING_TIME_LIMIT,
  STATUS_RUNNING
} from '../utils/const';
import {
  authApi,
  elapsedTime,
  jobTimeFormat,
  jobTypeDisplay,
  jobTypeValue,
  jobTypeValueArguments,
  statusMessage
} from '../utils/utils';

import ClusterDetails from '../cluster/clusterDetails';
import { ClipLoader } from 'react-spinners';
import LabelProperties from './labelProperties';
import SubmitJob from './submitJob';
import ViewLogs from '../utils/viewLogs';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { statusDisplay } from '../utils/statusDisplay';
import { stopJobApi, deleteJobApi } from '../utils/jobServices';
import errorIcon from '../../style/icons/error_icon.svg';

const iconLeftArrow = new LabIcon({
  name: 'launcher:left-arrow-icon',
  svgstr: LeftArrowIcon
});
const iconCloneJob = new LabIcon({
  name: 'launcher:clone-job-icon',
  svgstr: CloneJobIcon
});
const iconStopClusterDisable = new LabIcon({
  name: 'launcher:stop-cluster-disable-icon',
  svgstr: StopClusterDisableIcon
});
const iconStopCluster = new LabIcon({
  name: 'launcher:stop-cluster-icon',
  svgstr: StopClusterIcon
});
const iconDeleteCluster = new LabIcon({
  name: 'launcher:delete-cluster-icon',
  svgstr: DeleteClusterIcon
});
const iconEdit = new LabIcon({
  name: 'launcher:edit-icon',
  svgstr: EditIcon
});
const iconEditDisable = new LabIcon({
  name: 'launcher:edit-disable-icon',
  svgstr: EditIconDisable
});
const iconError = new LabIcon({
  name: 'launcher:error-icon',
  svgstr: errorIcon
});
interface IJobDetailsProps {
  jobSelected: any;
  setDetailedJobView: (value: boolean) => void;
  stopJobApi: (jobId: string) => Promise<void>;
  deleteJobApi: (jobId: string) => Promise<void>;
  region: any;
  setDetailedView: (value: boolean) => void;
  clusterResponse: any;
  clustersList: object;
}
function JobDetails({
  jobSelected,
  setDetailedJobView,
  region,
  setDetailedView,
  clusterResponse,
  clustersList
}: IJobDetailsProps) {
  const [jobInfo, setjobInfo] = useState({
    status: { state: '', stateStartTime: '' },
    statusHistory: [{ stateStartTime: '' }],
    labels: '',
    reference: { jobId: '' },
    jobUuid: '',
    pysparkJob: { args: [], mainPythonFileUri: '' },
    sparkRJob: { args: [], mainRFileUri: '' },
    sparkJob: { args: [], mainJarFileUri: '', mainClass: '', jarFileUris: '' },
    sparkSqlJob: { queryFileUri: '', queryList: { queries: '' }, args: [] },
    placement: { clusterName: '' }
  });
  const [jobInfoResponse, setjobInfoResponse] = useState({
    status: { state: '', stateStartTime: '' },
    statusHistory: [{ stateStartTime: '' }],
    labels: {},
    reference: { jobId: '' },
    jobUuid: '',
    pysparkJob: { args: [], mainPythonFileUri: '' },
    sparkRJob: { args: [], mainRFileUri: '' },
    sparkJob: { args: [], mainJarFileUri: '', mainClass: '' },
    sparkSqlJob: { queryFileUri: '', queryList: { queries: '' }, args: [] },

    placement: { clusterName: '' }
  });
  const key: any[] | (() => any[]) = [];
  const value: any[] | (() => any[]) = [];
  const [labelEditMode, setLabelEditMode] = useState(false);
  const [labelDetail, setLabelDetail] = useState(key); //Final label value is stored
  const [labelDetailUpdated, setLabelDetailUpdated] = useState(value); //temporary storage to validate the label data being typed
  const [detailedClusterView, setDetailedClusterView] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJobClone, setSelectedJobClone] = useState({});
  const [submitJobView, setSubmitJobView] = useState(false);
  const [keyValidation, setKeyValidation] = useState(-1);
  const [valueValidation, setValueValidation] = useState(-1);
  const [duplicateKeyError, setDuplicateKeyError] = useState(-1);

  const [deletePopupOpen, setDeletePopupOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [timer, setTimer] = useState<NodeJS.Timer | undefined>(undefined);
  const [errorView, setErrorView] = useState(false);

  const pollingJobDetails = async (
    pollingFunction: () => void,
    pollingDisable: boolean
  ) => {
    if (pollingDisable) {
      clearInterval(timer);
    } else {
      setTimer(setInterval(pollingFunction, POLLING_TIME_LIMIT));
    }
  };

  const handleDetailedJobView = () => {
    pollingJobDetails(getJobDetails, true);
    setDetailedJobView(false);
  };

  const handleDetailedClusterView = () => {
    pollingJobDetails(getJobDetails, true);
    if (!clustersList) {
      setDetailedJobView(false);
    }
    setDetailedClusterView(true);
  };

  useEffect(() => {
    if (labelEditMode) {
      pollingJobDetails(getJobDetails, true);
    } else {
      getJobDetails();
      pollingJobDetails(getJobDetails, false);
    }

    return () => {
      pollingJobDetails(getJobDetails, true);
    };
  }, [labelEditMode]);

  const handleJobLabelEdit = () => {
    setLabelEditMode(true);
    setLabelDetailUpdated(labelDetail);
  };
  const handleDeleteJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setDeletePopupOpen(true);
  };
  const handleStopJob = async (jobId: string) => {
    setSelectedJobId(jobId);
    await stopJobApi(selectedJobId);
  };
  const handleCancelDelete = () => {
    setDeletePopupOpen(false);
  };

  const handleDelete = async () => {
    await deleteJobApi(selectedJobId);
    setDeletePopupOpen(false);
    handleDetailedJobView();
  };

  const updateJobDetails = async (payloadJob: object) => {
    const credentials = await authApi();
    if (credentials) {
      fetch(
        `${BASE_URL}/projects/${credentials.project_id}/regions/${credentials.region_id}/jobs/${jobSelected}?updateMask=${LABEL_TEXT}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payloadJob),
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      )
        .then((response: Response) => {
          response
            .json()
            .then((responseResultJob: Response) => {
              // TODO: Handle Toast here
              console.log(responseResultJob);
            })
            .catch((e: Error) => console.error(e));
        })
        .catch((err: Error) => {
          console.error('Error in updating job', err);
          toast.error(`Failed to update the job ${jobSelected}`);
        });
    }
  };

  const handleSaveEdit = () => {
    const payload = jobInfoResponse;
    const labelObject: { [key: string]: string } = {};
    labelDetailUpdated.forEach((label: string) => {
      /*
         Extracting key, value from label
         Example: "{client:dataproc_plugin}"
      */
      const labelParts = label.split(':');

      const key = labelParts[0];
      const value = labelParts[1];
      labelObject[key] = value;
    });
    payload.labels = labelObject;
    updateJobDetails(payload);
    setLabelEditMode(false);
    getJobDetails();
  };

  const handleCancelEdit = () => {
    setLabelEditMode(false);
  };

  const getJobDetails = async () => {
    const credentials = await authApi();
    if (credentials) {
      fetch(
        `${BASE_URL}/projects/${credentials.project_id}/regions/${credentials.region_id}/jobs/${jobSelected}`,
        {
          method: 'GET',
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
              setjobInfoResponse(responseResult);
              const labelValue: string[] = [];
              if (responseResult.labels) {
                for (const [key, value] of Object.entries(
                  responseResult.labels
                )) {
                  labelValue.push(`${key}:${value}`);
                }
              }
              setjobInfo(responseResult);
              setLabelDetail(labelValue);
              setIsLoading(false);
              setSelectedJobClone(responseResult);
            })
            .catch((e: Error) => {
              console.error(e);
              setIsLoading(false);
            });
        })
        .catch((err: Error) => {
          setIsLoading(false);
          console.error('Error in getting job details', err);
          toast.error(`Failed to fetch job details ${jobSelected}`);
        });
    }
  };

  const startTime = jobTimeFormat(jobInfo.statusHistory[0].stateStartTime);
  const job = jobTypeValue(jobInfo);
  const jobType = jobTypeDisplay(job);
  const jobArgument = jobTypeValueArguments(jobInfo);
  const jobTypeConcat = jobArgument + 'Job';
  //@ts-ignore
  const argumentsList = jobInfo[jobTypeConcat].args;
  const statusMsg = statusMessage(jobInfo);

  const endTime = jobInfo.status.stateStartTime;
  const jobStartTime = new Date(
    jobInfo.statusHistory[jobInfo.statusHistory.length - 1].stateStartTime
  );

  const elapsedTimeString = elapsedTime(endTime, jobStartTime);

  const statusStyleSelection = (jobInfo: any) => {
    if (jobInfo.status.state === STATUS_RUNNING) {
      return 'action-cluster-section'; //CSS class
    } else {
      return 'action-cluster-section disabled';
    }
  };

  const handleCloneJob = () => {
    setSubmitJobView(true);
  };

  const styleJobEdit = (labelEditMode: boolean) => {
    if (labelEditMode) {
      return 'job-edit-button-disabled';
    } else {
      return 'job-edit-button';
    }
  };

  const styleIconColor = (labelEditMode: boolean) => {
    if (labelEditMode) {
      return 'color-icon-disabled';
    } else {
      return 'color-icon';
    }
  };

  return (
    <div>
      {errorView && (
        <div className="error-view-parent">
          <div
            role="button"
            className="back-arrow-icon"
            onClick={() => setErrorView(false)}
          >
            <iconLeftArrow.react tag="div" />
          </div>
          <div className="error-view-message-parent">
            <iconError.react tag="div" />
            <div className="error-view-message">
              Unable to find the resource you requested
            </div>
          </div>
        </div>
      )}
      {submitJobView && !detailedClusterView && (
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
      {detailedClusterView && (
        <ClusterDetails
          clusterSelected={jobInfo.placement.clusterName}
          setDetailedView={setDetailedView}
          setDetailedClusterView={setDetailedClusterView}
          submitJobView={submitJobView}
          selectedJobClone={selectedJobClone}
          clusterResponse={clusterResponse}
          setSubmitJobView={setSubmitJobView}
          setDetailedJobView={setDetailedJobView}
          setSelectedJobClone={setSelectedJobClone}
        />
      )}
      {!submitJobView && !detailedClusterView && !errorView && (
        <div className="scroll-comp">
          {jobInfo.jobUuid !== '' && (
            <div>
              <div className="cluster-details-header">
                <div
                  className="back-arrow-icon"
                  role="button"
                  aria-label="Delete Job"
                  onClick={() => handleDetailedJobView()}
                >
                  <iconLeftArrow.react tag="div" />
                </div>
                <div className="cluster-details-title">Job details</div>
                <div
                  role="button"
                  className="action-cluster-section"
                  onClick={() => handleCloneJob()}
                >
                  <div className="action-cluster-icon">
                    <iconCloneJob.react tag="div" />
                  </div>
                  <div className="action-cluster-text">CLONE</div>
                </div>

                <div
                  role="button"
                  className={statusStyleSelection(jobInfo)}
                  onClick={() =>
                    jobInfo.status.state === STATUS_RUNNING &&
                    handleStopJob(jobInfo.reference.jobId)
                  }
                >
                  <div className="action-cluster-icon">
                    {jobInfo.status.state === STATUS_RUNNING ? (
                      <iconStopCluster.react tag="div" />
                    ) : (
                      <iconStopClusterDisable.react tag="div" />
                    )}
                  </div>
                  <div className="action-cluster-text">STOP</div>
                </div>
                <div
                  role="button"
                  className="action-cluster-section"
                  onClick={() => handleDeleteJob(jobInfo.reference.jobId)}
                >
                  <div className="action-cluster-icon">
                    <iconDeleteCluster.react tag="div" />
                  </div>
                  <div className="action-cluster-text">DELETE</div>
                </div>
                <ViewLogs
                  clusterName={jobInfo.placement.clusterName}
                  setErrorView={setErrorView}
                />
              </div>

              <div className="cluster-details-container">
                <div className="row-details"></div>
                <div className="row-details">
                  <div className="cluster-details-label">Job ID</div>
                  <div className="cluster-details-value">
                    {jobInfo.reference.jobId}
                  </div>
                </div>
                <div className="row-details">
                  <div className="cluster-details-label">Job UUID</div>
                  <div className="cluster-details-value">{jobInfo.jobUuid}</div>
                </div>
                <div className="row-details">
                  <div className="cluster-details-label">Type</div>
                  <div className="cluster-details-value">Dataproc Job</div>
                </div>
                <div className="row-details">
                  <div className="cluster-details-label">Status</div>
                  {statusDisplay(statusMsg)}
                </div>
                <ToastContainer />
              </div>
              <div className="cluster-details-header">
                <div className="cluster-details-title">Configuration</div>
              </div>
              <div className="job-edit-header">
                <div
                  role="button"
                  className={styleJobEdit(labelEditMode)}
                  onClick={() => (labelEditMode ? '' : handleJobLabelEdit())}
                >
                  {labelEditMode ? (
                    <iconEditDisable.react
                      tag="div"
                      className={styleIconColor(labelEditMode)}
                    />
                  ) : (
                    <iconEdit.react
                      tag="div"
                      className={styleIconColor(labelEditMode)}
                    />
                  )}
                  <div
                    className={
                      labelEditMode ? 'job-edit-text-disabled' : 'job-edit-text'
                    }
                  >
                    EDIT
                  </div>
                </div>
              </div>
              <div className="cluster-details-container">
                <div className="row-details">
                  <div className="cluster-details-label">Start time:</div>
                  <div className="cluster-details-value">{startTime}</div>
                </div>
                <div className="row-details">
                  <div className="cluster-details-label">Elapsed time:</div>
                  <div className="cluster-details-value">
                    {elapsedTimeString}
                  </div>
                </div>
                <div className="row-details">
                  <div className="cluster-details-label">Status:</div>
                  {statusDisplay(statusMsg)}
                </div>
                <div className="row-details">
                  <div className="cluster-details-label">Region</div>
                  <div className="cluster-details-value">{region.region}</div>
                </div>
                <div className="row-details">
                  <div className="cluster-details-label">Cluster</div>

                  <div
                    role="button"
                    className="cluster-details-value-job"
                    onClick={() => handleDetailedClusterView()}
                  >
                    {jobInfo.placement.clusterName}
                  </div>
                </div>
                <div className="row-details">
                  <div className="cluster-details-label">Job type</div>
                  <div className="cluster-details-value">{jobType}</div>
                </div>
                {job === 'SparkR' && (
                  <div className="row-details">
                    <div className="cluster-details-label">Spark R files</div>
                    <div className="cluster-details-value">
                      {jobInfo.sparkRJob.mainRFileUri}
                    </div>
                  </div>
                )}
                {job === 'SparkSQL' && (
                  <div className="row-details">
                    <div className="cluster-details-label">
                      Query source type
                    </div>
                    {jobInfo.sparkSqlJob.queryFileUri ? (
                      <div className="cluster-details-value">Query file</div>
                    ) : (
                      <div className="cluster-details-value">Query script</div>
                    )}
                  </div>
                )}
                {job === 'PySpark' && (
                  <div className="row-details">
                    <div className="cluster-details-label">
                      Main python file
                    </div>
                    <div className="cluster-details-value">
                      {jobInfo.pysparkJob.mainPythonFileUri}
                    </div>
                  </div>
                )}
                {job === 'Spark' && (
                  <>
                    <div className="row-details">
                      <div className="cluster-details-label">
                        Main class or jar
                      </div>
                      <div className="cluster-details-value">
                        {jobInfo.sparkJob.mainJarFileUri}
                        {jobInfo.sparkJob.mainClass}
                      </div>
                    </div>
                    <div className="row-details">
                      <div className="cluster-details-label">Jar files</div>
                      {jobInfo.sparkJob.jarFileUris ? (
                        <div className="cluster-details-value">
                          {jobInfo.sparkJob.jarFileUris}
                        </div>
                      ) : (
                        <div className="cluster-details-value">None</div>
                      )}
                    </div>
                  </>
                )}
                {job === 'SparkSQL' && jobInfo.sparkSqlJob.queryFileUri && (
                  <div className="row-details">
                    <div className="cluster-details-label">Query file</div>
                    <div className="cluster-details-value">
                      {jobInfo.sparkSqlJob.queryFileUri}
                    </div>
                  </div>
                )}
                {job === 'SparkSQL' && jobInfo.sparkSqlJob.queryList && (
                  <div className="row-details">
                    <div className="cluster-details-label">Query script</div>
                    <div className="cluster-details-value">
                      {jobInfo.sparkSqlJob.queryList.queries}
                    </div>
                  </div>
                )}
                {argumentsList && (
                  <div className="row-details">
                    <div className="cluster-details-label">Arguments</div>
                    <div className="cluster-details-value">
                      {argumentsList.length > 0
                        ? argumentsList.map((argument: string) => {
                            return (
                              <div
                                key={argument}
                                className="job-argument-style"
                              >
                                {argument}
                              </div>
                            );
                          })
                        : ''}
                    </div>
                  </div>
                )}
                <div className="job-details-label-row">
                  <div className="cluster-details-label">Labels</div>
                  {!labelEditMode ? (
                    <div className="job-label-style-parent">
                      {labelDetail.length > 0
                        ? labelDetail.map(label => {
                            /*
                            Extracting key, value from label
                               Example: "{client:dataproc_plugin}"
                         */
                            const labelParts = label.split(':');

                            return (
                              <div key={label} className="job-label-style">
                                {labelParts[0]} : {labelParts[1]}
                              </div>
                            );
                          })
                        : 'None'}
                    </div>
                  ) : (
                    <LabelProperties
                      labelDetail={labelDetail}
                      setLabelDetail={setLabelDetail}
                      labelDetailUpdated={labelDetailUpdated}
                      setLabelDetailUpdated={setLabelDetailUpdated}
                      selectedJobClone={selectedJobClone ? true : false}
                      buttonText="ADD LABEL"
                      keyValidation={keyValidation}
                      setKeyValidation={setKeyValidation}
                      valueValidation={valueValidation}
                      setValueValidation={setValueValidation}
                      labelEditMode={labelEditMode}
                      duplicateKeyError={duplicateKeyError}
                      setDuplicateKeyError={setDuplicateKeyError}
                    />
                  )}
                </div>
                {labelEditMode && (
                  <div className="job-button-style-parent">
                    <div className="job-save-button-style">
                      <div
                        role="button"
                        onClick={() => {
                          handleSaveEdit();
                        }}
                      >
                        SAVE
                      </div>
                    </div>
                    <div className="job-cancel-button-style">
                      <div
                        role="button"
                        onClick={() => {
                          handleCancelEdit();
                        }}
                      >
                        CANCEL
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <ToastContainer />
            </div>
          )}

          {jobInfo.jobUuid === '' && (
            <div className="loader-full-style">
              {isLoading && (
                <div>
                  <ClipLoader
                    color="#8A8A8A"
                    loading={true}
                    size={20}
                    aria-label="Loading Spinner"
                    data-testid="loader"
                  />
                  Loading Job Details
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default JobDetails;
