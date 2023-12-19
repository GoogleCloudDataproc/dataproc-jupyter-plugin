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
import JobComponent from '../jobs/jobs';
import { LabIcon } from '@jupyterlab/ui-components';
import LeftArrowIcon from '../../style/icons/left_arrow_icon.svg';
import StartClusterIcon from '../../style/icons/start_cluster_icon.svg';
import StartClusterDisableIcon from '../../style/icons/start_cluster_icon_disable.svg';
import StopClusterIcon from '../../style/icons/stop_cluster_icon.svg';
import StopClusterDisableIcon from '../../style/icons/stop_cluster_disable_icon.svg';
import DeleteClusterIcon from '../../style/icons/delete_cluster_icon.svg';
import errorIcon from '../../style/icons/error_icon.svg';
import clusterRunningIcon from '../../style/icons/cluster_running_icon.svg';
import clusterErrorIcon from '../../style/icons/cluster_error_icon.svg';
import stopIcon from '../../style/icons/stop_icon.svg';
import { ClusterService } from './clusterServices';
import {
  STATUS_CREATING,
  STATUS_DELETING,
  STATUS_ERROR,
  STATUS_PROVISIONING,
  STATUS_RUNNING,
  STATUS_STARTING,
  STATUS_STOPPED,
  STATUS_STOPPING
} from '../utils/const';
import ClipLoader from 'react-spinners/ClipLoader';
import ViewLogs from '../utils/viewLogs';
import DeletePopup from '../utils/deletePopup';
import SubmitJob from '../jobs/submitJob';
import PollingTimer from '../utils/pollingTimer';
import { JobService } from '../jobs/jobServices';

const iconLeftArrow = new LabIcon({
  name: 'launcher:left-arrow-icon',
  svgstr: LeftArrowIcon
});
const iconStartCluster = new LabIcon({
  name: 'launcher:start-cluster-icon',
  svgstr: StartClusterIcon
});
const iconStartClusterDisable = new LabIcon({
  name: 'launcher:start-cluster-disable-icon',
  svgstr: StartClusterDisableIcon
});
const iconStopCluster = new LabIcon({
  name: 'launcher:stop-cluster-icon',
  svgstr: StopClusterIcon
});
const iconStopClusterDisable = new LabIcon({
  name: 'launcher:stop-cluster-disable-icon',
  svgstr: StopClusterDisableIcon
});
const iconDeleteCluster = new LabIcon({
  name: 'launcher:delete-cluster-icon',
  svgstr: DeleteClusterIcon
});
const iconClusterRunning = new LabIcon({
  name: 'launcher:cluster-running-icon',
  svgstr: clusterRunningIcon
});
const iconClusterError = new LabIcon({
  name: 'launcher:cluster-error-icon',
  svgstr: clusterErrorIcon
});
const iconStop = new LabIcon({
  name: 'launcher:stop-icon',
  svgstr: stopIcon
});
const iconError = new LabIcon({
  name: 'launcher:error-icon',
  svgstr: errorIcon
});
interface IClusterDetailsProps {
  clusterSelected: string;
  setDetailedView: (value: boolean) => void;
  setDetailedClusterView?: (value: boolean) => void;
  detailedJobView?: boolean;
  setDetailedJobView?: (value: boolean) => void;
  setSubmitJobView?: (value: boolean) => void;
  submitJobView: boolean;
  selectedJobClone: any;
  setSelectedJobClone?: (value: boolean) => void;
}
function ClusterDetails({
  clusterSelected,
  setDetailedView,
  setDetailedClusterView,
  detailedJobView,
  setSubmitJobView,
  setDetailedJobView,
  submitJobView,
  selectedJobClone,
  setSelectedJobClone
}: IClusterDetailsProps) {
  const [clusterInfo, setClusterInfo] = useState({
    status: { state: '' },
    clusterName: '',
    clusterUuid: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorView, setErrorView] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [deletePopupOpen, setDeletePopupOpen] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState('');

  const [clusterResponse, setClusterResponse] = useState([]);

  const timer = useRef<NodeJS.Timeout | undefined>(undefined);

  const pollingClusterDetails = async (
    pollingFunction: () => void,
    pollingDisable: boolean
  ) => {
    timer.current = PollingTimer(
      pollingFunction,
      pollingDisable,
      timer.current
    );
  };

  const listClustersAPI = async () => {
    await JobService.listClustersAPIService(setClusterResponse);
  };

  const handleDetailedView = () => {
    pollingClusterDetails(getClusterDetails, true);
    setDetailedView(false);
    setDetailedClusterView?.(false);
    setDetailedJobView?.(false);
  };

  const handleDeleteCluster = (clustername: string) => {
    setSelectedCluster(clustername);
    setDeletePopupOpen(true);
  };
  const handleCancelDelete = () => {
    setDeletePopupOpen(false);
  };

  const handleDelete = async () => {
    await ClusterService.deleteClusterApi(selectedCluster);

    setDeletePopupOpen(false);
    handleDetailedView();
  };

  const getClusterDetails = async () => {
    await ClusterService.getClusterDetailsService(
      setProjectName,
      clusterSelected,
      setErrorView,
      setIsLoading,
      setClusterInfo
    );
  };

  const clusterDetailsAction = () => {
    return (
      <div className="cluster-details-action-parent">
        <div
          role="button"
          aria-disabled={clusterInfo.status.state !== STATUS_STOPPED}
          className={
            clusterInfo.status.state === STATUS_STOPPED
              ? 'action-cluster-section'
              : 'action-cluster-section disabled'
          }
          onClick={() =>
            clusterInfo.status.state === STATUS_STOPPED &&
            ClusterService.startClusterApi(clusterInfo.clusterName)
          }
        >
          <div
            className="action-cluster-icon"
            role="button"
            aria-disabled={clusterInfo.status.state !== STATUS_STOPPED}
          >
            {clusterInfo.status.state === STATUS_STOPPED ? (
              <iconStartCluster.react
                tag="div"
                className="logo-alignment-style"
              />
            ) : (
              <iconStartClusterDisable.react
                tag="div"
                className="logo-alignment-style"
              />
            )}
          </div>
          <div className="action-cluster-text">START</div>
        </div>
        <div
          role="button"
          aria-disabled={clusterInfo.status.state !== STATUS_RUNNING}
          className={
            clusterInfo.status.state === STATUS_RUNNING
              ? 'action-cluster-section'
              : 'action-cluster-section disabled'
          }
          onClick={() =>
            clusterInfo.status.state === STATUS_RUNNING &&
            ClusterService.stopClusterApi(clusterInfo.clusterName)
          }
        >
          <div className="action-cluster-icon">
            {clusterInfo.status.state === STATUS_RUNNING ? (
              <iconStopCluster.react
                tag="div"
                className="logo-alignment-style"
              />
            ) : (
              <iconStopClusterDisable.react
                tag="div"
                className="logo-alignment-style"
              />
            )}
          </div>
          <div className="action-cluster-text">STOP</div>
        </div>
        <div
          role="button"
          className="action-cluster-section"
          onClick={() => handleDeleteCluster(clusterInfo.clusterName)}
        >
          <div className="action-cluster-icon">
            <iconDeleteCluster.react
              tag="div"
              className="logo-alignment-style"
            />
          </div>
          <div className="action-cluster-text">DELETE</div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    getClusterDetails();
    listClustersAPI();
    pollingClusterDetails(getClusterDetails, false);

    return () => {
      pollingClusterDetails(getClusterDetails, true);
    };
  }, []);

  return (
    <div>
      {errorView && (
        <div className="error-view-parent">
          <div
            role="button"
            aria-label="back-arrow-icon"
            className="back-arrow-icon"
            onClick={() => handleDetailedView()}
          >
            <iconLeftArrow.react tag="div" className="logo-alignment-style" />
          </div>
          <div className="error-view-message-parent">
            <iconError.react tag="div" className="logo-alignment-style" />
            <div role="alert" className="error-view-message">
              Unable to find the resource you requested
            </div>
          </div>
        </div>
      )}
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
            'This will delete ' + selectedCluster + ' and cannot be undone.'
          }
        />
      )}
      {!submitJobView && (
        <div className="scroll">
          {!errorView && clusterInfo.clusterName !== '' ? (
            <div>
              {!detailedJobView && (
                <div>
                  <div className="cluster-details-header">
                    <div
                      role="button"
                      aria-label="back-arrow-icon"
                      className="back-arrow-icon"
                      onClick={() => handleDetailedView()}
                    >
                      <iconLeftArrow.react
                        tag="div"
                        className="icon-white logo-alignment-style"
                      />
                    </div>
                    <div className="cluster-details-title">Cluster details</div>
                    {clusterDetailsAction()}
                    <ViewLogs
                      clusterInfo={clusterInfo}
                      projectName={projectName}
                    />
                  </div>
                  <div className="cluster-details-container">
                    <div className="row-details"></div>
                    <div className="row-details">
                      <div className="cluster-details-label">Name</div>
                      <div className="cluster-details-value">
                        {clusterInfo.clusterName}
                      </div>
                    </div>
                    <div className="row-details">
                      <div className="cluster-details-label">Cluster UUID</div>
                      <div className="cluster-details-value">
                        {clusterInfo.clusterUuid}
                      </div>
                    </div>
                    <div className="row-details">
                      <div className="cluster-details-label">Type</div>
                      <div className="cluster-details-value">
                        Dataproc Cluster
                      </div>
                    </div>
                    <div className="row-details">
                      <div className="cluster-details-label">Status</div>
                      <div
                        className="cluster-detail-status-parent"
                        aria-status={clusterInfo.status.state}
                        aria-label={clusterInfo.status.state}
                      >
                        {clusterInfo.status.state === STATUS_RUNNING && (
                          <iconClusterRunning.react
                            tag="div"
                            className="logo-alignment-style"
                          />
                        )}
                        {clusterInfo.status.state === STATUS_STOPPED && (
                          <iconStop.react
                            tag="div"
                            className="logo-alignment-style"
                          />
                        )}
                        {clusterInfo.status.state === STATUS_ERROR && (
                          <iconClusterError.react
                            tag="div"
                            className="logo-alignment-style"
                          />
                        )}
                        {(clusterInfo.status.state === STATUS_PROVISIONING ||
                          clusterInfo.status.state === STATUS_CREATING ||
                          clusterInfo.status.state === STATUS_STARTING ||
                          clusterInfo.status.state === STATUS_STOPPING ||
                          clusterInfo.status.state === STATUS_DELETING) && (
                          <div>
                            <ClipLoader
                              color="#3367d6"
                              loading={true}
                              size={15}
                              aria-label="Loading Spinner"
                              data-testid="loader"
                            />
                          </div>
                        )}
                        <div className="cluster-status">
                          {clusterInfo.status.state === STATUS_CREATING
                            ? STATUS_PROVISIONING
                            : clusterInfo.status.state.toLowerCase()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="cluster-details-header">
                    <div className="cluster-details-title">Jobs</div>
                  </div>
                </div>
              )}
              <JobComponent
                clusterSelected={clusterSelected}
                setDetailedView={setDetailedView}
                detailedJobView={detailedJobView}
                setDetailedJobView={setDetailedJobView}
                setSubmitJobView={setSubmitJobView}
                setSelectedJobClone={setSelectedJobClone}
              />
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="spin-loader-main">
                  <ClipLoader
                    color="#3367d6"
                    loading={true}
                    size={18}
                    aria-label="Loading Spinner"
                    data-testid="loader"
                  />
                  Loading Cluster Details
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ClusterDetails;
