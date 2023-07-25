import React, { useState, useEffect } from 'react';
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
import {
  deleteClusterApi,
  startClusterApi,
  stopClusterApi
} from '../utils/clusterServices';
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  BASE_URL,
  POLLING_TIME_LIMIT,
  STATUS_CREATING,
  STATUS_DELETING,
  STATUS_ERROR,
  STATUS_PROVISIONING,
  STATUS_RUNNING,
  STATUS_STARTING,
  STATUS_STOPPED,
  STATUS_STOPPING
} from '../utils/const';
import { authApi } from '../utils/utils';
import ClipLoader from 'react-spinners/ClipLoader';
import ViewLogs from '../utils/viewLogs';
import DeletePopup from '../utils/deletePopup';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
}
function ClusterDetails({
  clusterSelected,
  setDetailedView,
  setDetailedClusterView,
  detailedJobView,
  setDetailedJobView,
  setSubmitJobView
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
  const [timer, setTimer] = useState<NodeJS.Timer | undefined>(undefined);
  const pollingClusterDetails = async (
    pollingFunction: () => void,
    pollingDisable: boolean
  ) => {
    if (pollingDisable) {
      clearInterval(timer);
    } else {
      setTimer(setInterval(pollingFunction, POLLING_TIME_LIMIT));
    }
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
    await deleteClusterApi(selectedCluster);

    setDeletePopupOpen(false);
    handleDetailedView();
  };

  const getClusterDetails = async () => {
    const credentials = await authApi();
    if (credentials) {
      setProjectName(credentials.project_id || '');
      fetch(
        `${BASE_URL}/projects/${credentials.project_id}/regions/${credentials.region_id}/clusters/${clusterSelected}`,
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
              if (responseResult.error && responseResult.error.code === 404) {
                setErrorView(true);
              }
              setClusterInfo(responseResult);
              setIsLoading(false);
            })
            .catch((e: Error) => {
              console.log(e);
              setIsLoading(false);
            });
        })
        .catch((err: Error) => {
          setIsLoading(false);
          console.error('Error listing clusters Details', err);
          toast.error('Failed to fetch Cluster Details');
        });
    }
  };

  const clusterDetailsAction = () => {
    return (
      <div className="cluster-details-action-parent">
        <div
          className={
            clusterInfo.status.state === STATUS_STOPPED
              ? 'action-cluster-section'
              : 'action-cluster-section disabled'
          }
          onClick={() =>
            clusterInfo.status.state === STATUS_STOPPED &&
            startClusterApi(clusterInfo.clusterName)
          }
        >
          <div className="action-cluster-icon">
            {clusterInfo.status.state === STATUS_STOPPED ? (
              <iconStartCluster.react tag="div" />
            ) : (
              <iconStartClusterDisable.react tag="div" />
            )}
          </div>
          <div className="action-cluster-text">START</div>
        </div>
        <div
          className={
            clusterInfo.status.state === STATUS_RUNNING
              ? 'action-cluster-section'
              : 'action-cluster-section disabled'
          }
          onClick={() =>
            clusterInfo.status.state === STATUS_RUNNING &&
            stopClusterApi(clusterInfo.clusterName)
          }
        >
          <div className="action-cluster-icon">
            {clusterInfo.status.state === STATUS_RUNNING ? (
              <iconStopCluster.react tag="div" />
            ) : (
              <iconStopClusterDisable.react tag="div" />
            )}
          </div>
          <div className="action-cluster-text">STOP</div>
        </div>
        <div
          className="action-cluster-section"
          onClick={() => handleDeleteCluster(clusterInfo.clusterName)}
        >
          <div className="action-cluster-icon">
            <iconDeleteCluster.react tag="div" />
          </div>
          <div className="action-cluster-text">DELETE</div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    getClusterDetails();
    pollingClusterDetails(getClusterDetails, false);

    return () => {
      pollingClusterDetails(getClusterDetails, true);
    };
  }, []);

  return (
    <div>
      {errorView && (
        <div className="error-view-parent">
          <div className="back-arrow-icon" onClick={() => handleDetailedView()}>
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
      <div className="scroll-comp">
        <ToastContainer />
        {!errorView && clusterInfo.clusterName !== '' ? (
          <div>
            {!detailedJobView && (
              <div>
                <div className="cluster-details-header">
                  <div
                    className="back-arrow-icon"
                    onClick={() => handleDetailedView()}
                  >
                    <iconLeftArrow.react tag="div" />
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
                    <div className="cluster-detail-status-parent">
                      {clusterInfo.status.state === STATUS_RUNNING && (
                        <iconClusterRunning.react tag="div" />
                      )}
                      {clusterInfo.status.state === STATUS_STOPPED && (
                        <iconStop.react tag="div" />
                      )}
                      {clusterInfo.status.state === STATUS_ERROR && (
                        <iconClusterError.react tag="div" />
                      )}
                      {(clusterInfo.status.state === STATUS_PROVISIONING ||
                        clusterInfo.status.state === STATUS_CREATING ||
                        clusterInfo.status.state === STATUS_STARTING ||
                        clusterInfo.status.state === STATUS_STOPPING ||
                        clusterInfo.status.state === STATUS_DELETING) && (
                        <div>
                          <ClipLoader
                            color="#8A8A8A"
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
            />
          </div>
        ) : (
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
                Loading Cluster Details
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ClusterDetails;
