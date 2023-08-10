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
import { LabIcon } from '@jupyterlab/ui-components';
import LeftArrowIcon from '../../style/icons/left_arrow_icon.svg';
import StopClusterIcon from '../../style/icons/stop_cluster_icon.svg';
import StopClusterDisableIcon from '../../style/icons/stop_cluster_disable_icon.svg';
import SucceededIcon from '../../style/icons/succeeded_icon.svg';
import clusterErrorIcon from '../../style/icons/cluster_error_icon.svg';
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  BASE_URL,
  NETWORK_KEY,
  NETWORK_LABEL,
  POLLING_TIME_LIMIT,
  SERVICE_ACCOUNT_KEY,
  SERVICE_ACCOUNT_LABEL,
  STATUS_ACTIVE,
  STATUS_CREATING,
  STATUS_DELETING,
  STATUS_ERROR,
  STATUS_FAIL,
  STATUS_PROVISIONING,
  STATUS_STARTING,
  STATUS_STOPPING,
  STATUS_TERMINATED,
  STATUS_TERMINATING,
  SUBNETWORK_KEY,
  SUBNETWORK_LABEL
} from '../utils/const';
import { authApi, elapsedTime, jobTimeFormat } from '../utils/utils';
import ClipLoader from 'react-spinners/ClipLoader';
import ViewLogs from '../utils/viewLogs';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { terminateSessionAPI } from '../utils/sessionService';

const iconLeftArrow = new LabIcon({
  name: 'launcher:left-arrow-icon',
  svgstr: LeftArrowIcon
});
const iconStopCluster = new LabIcon({
  name: 'launcher:stop-cluster-icon',
  svgstr: StopClusterIcon
});
const iconStopClusterDisable = new LabIcon({
  name: 'launcher:stop-cluster-disable-icon',
  svgstr: StopClusterDisableIcon
});
const iconSucceeded = new LabIcon({
  name: 'launcher:succeeded-icon',
  svgstr: SucceededIcon
});

const iconClusterError = new LabIcon({
  name: 'launcher:cluster-error-icon',
  svgstr: clusterErrorIcon
});

interface ISessionDetailsProps {
  sessionSelected: string;
  setDetailedSessionView: React.Dispatch<React.SetStateAction<boolean>>;
  detailedSessionView: boolean;
}
function SessionDetails({
  sessionSelected,
  setDetailedSessionView,
  detailedSessionView
}: ISessionDetailsProps) {
  const [sessionInfo, setSessionInfo] = useState({
    state: '',
    name: '',
    uuid: '',
    elapsedTime: '',
    createTime: '',
    stateTime: '',
    stateHistory: [{ stateStartTime: '' }],
    runtimeConfig: { properties: [] },
    environmentConfig: {
      executionConfig: []
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [labelDetail, setLabelDetail] = useState(['']);
  const [timer, setTimer] = useState<NodeJS.Timer | undefined>(undefined);
  const pollingSessionDetails = async (
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
    pollingSessionDetails(getSessionDetails, true);
    setDetailedSessionView(false);
  };
  const getSessionDetails = async () => {
    const credentials = await authApi();
    if (credentials) {
      fetch(
        `${BASE_URL}/projects/${credentials.project_id}/locations/${credentials.region_id}/sessions/${sessionSelected}`,
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
              setSessionInfo(responseResult);
              const labelValue: string[] = [];
              if (responseResult.labels) {
                for (const [key, value] of Object.entries(
                  responseResult.labels
                )) {
                  labelValue.push(`${key}:${value}`);
                }
              }
              setLabelDetail(labelValue);
              setIsLoading(false);
            })
            .catch((e: Error) => {
              console.log(e);
              setIsLoading(false);
            });
        })
        .catch((err: Error) => {
          setIsLoading(false);
          console.error('Error loading session details', err);
          toast.error(`Failed to fetch session details ${sessionSelected}`);
        });
    }
  };

  useEffect(() => {
    getSessionDetails();
    pollingSessionDetails(getSessionDetails, false);

    return () => {
      pollingSessionDetails(getSessionDetails, true);
    };
  }, []);
  
  const createTimeDisplay = jobTimeFormat(sessionInfo.createTime);
  const parts = createTimeDisplay.split(',');
  const createTimeString = parts.slice(0, 2).join(',');
  const sessionStartTime = new Date(sessionInfo.createTime);
  let elapsedTimeString = '';
  if (
    sessionInfo.state === STATUS_TERMINATED ||
    sessionInfo.state === STATUS_FAIL
  ) {
    elapsedTimeString = elapsedTime(sessionInfo.stateTime, sessionStartTime);
  }
  const sessionActiveTime =
    sessionInfo.stateHistory &&
    sessionInfo.stateHistory.length > 1 &&
    sessionInfo.stateHistory[1].stateStartTime
      ? new Date(sessionInfo.stateHistory[1].stateStartTime)
      : '';
  let runTimeString = '';
  if (sessionActiveTime !== '') {
    runTimeString = elapsedTime(sessionInfo.stateTime, sessionActiveTime);
  }

  return (
    <div>
      <ToastContainer />
      {sessionInfo.name !== '' ? (
        <div className="scroll-comp">
          {detailedSessionView && (
            <div>
              <div className="cluster-details-header">
                <div
                  role="button"
                  className="back-arrow-icon"
                  onClick={() => handleDetailedView()}
                >
                  <iconLeftArrow.react tag="div" />
                </div>
                <div className="cluster-details-title">Session details</div>
                <div
                  role="button"
                  className={
                    sessionInfo.state === STATUS_ACTIVE
                      ? 'action-cluster-section'
                      : 'action-cluster-section disabled'
                  }
                  onClick={() =>
                    sessionInfo.state === STATUS_ACTIVE &&
                    terminateSessionAPI(sessionInfo.name.split('/')[5])
                  }
                >
                  <div className="action-cluster-icon">
                    {sessionInfo.state === STATUS_ACTIVE ? (
                      <iconStopCluster.react tag="div" />
                    ) : (
                      <iconStopClusterDisable.react tag="div" />
                    )}
                  </div>
                  <div className="action-cluster-text">TERMINATE</div>
                </div>
                <ViewLogs sessionInfo={sessionInfo} />
              </div>
              <div className="cluster-details-container">
                <div className="row-details"></div>
                <div className="row-details">
                  <div className="cluster-details-label">Name</div>
                  <div className="session-details-value">
                    {sessionInfo.name.split('/')[5]}
                  </div>
                </div>
                <div className="row-details">
                  <div className="cluster-details-label">UUID</div>
                  <div className="session-details-value">
                    {sessionInfo.uuid}
                  </div>
                </div>
                <div className="row-details">
                  <div className="cluster-details-label">Status</div>
                  <div className="session-detail-status-parent">
                    {sessionInfo.state === STATUS_ACTIVE && (
                      <iconSucceeded.react tag="div" />
                    )}
                    {sessionInfo.state === STATUS_TERMINATED && (
                      <iconSucceeded.react tag="div" />
                    )}
                    {sessionInfo.state === STATUS_ERROR && (
                      <iconClusterError.react tag="div" />
                    )}
                    {sessionInfo.state === STATUS_FAIL && (
                      <iconClusterError.react tag="div" />
                    )}
                    {(sessionInfo.state === STATUS_PROVISIONING ||
                      sessionInfo.state === STATUS_CREATING ||
                      sessionInfo.state === STATUS_STARTING ||
                      sessionInfo.state === STATUS_STOPPING ||
                      sessionInfo.state === STATUS_TERMINATING ||
                      sessionInfo.state === STATUS_DELETING) && (
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
                      {sessionInfo.state === STATUS_CREATING
                        ? STATUS_PROVISIONING
                        : sessionInfo.state.toLowerCase()}
                    </div>
                  </div>
                </div>
                <div className="row-details">
                  <div className="cluster-details-label">Create time</div>
                  <div className="session-details-value">
                    {createTimeString}
                  </div>
                </div>
              </div>
              <div className="cluster-details-header">
                <div className="cluster-details-title">Details</div>
              </div>
              <div className="cluster-details-container">
                <div className="row-details">
                  <div className="cluster-details-label">Elapsed time</div>
                  <div className="session-details-value">
                    {elapsedTimeString}
                  </div>
                </div>
                {(sessionInfo.state === STATUS_ACTIVE ||
                  sessionInfo.state === STATUS_TERMINATED) && (
                  <div className="row-details">
                    <div className="cluster-details-label">Run time</div>
                    <div className="session-details-value">{runTimeString}</div>
                  </div>
                )}
                <div className="row-details">
                  <div className="cluster-details-label">Properties</div>
                </div>
                {Object.entries(sessionInfo.runtimeConfig.properties).map(
                  ([key, value]) => (
                    <div className="row-details" key={key}>
                      <div className="session-details-label">{key}</div>
                      <div className="session-details-value">{value}</div>
                    </div>
                  )
                )}
                <div className="row-details">
                  <div className="cluster-details-label">
                    Environment config
                  </div>
                </div>
                <div className="row-details">
                  <div className="session-details-label">Execution config</div>
                </div>
                {Object.entries(
                  sessionInfo.environmentConfig.executionConfig
                ).map(([key, value]) => {
                  let label;
                  if (key === SERVICE_ACCOUNT_KEY) {
                    label = SERVICE_ACCOUNT_LABEL;
                  } else if (key === NETWORK_KEY) {
                    label = NETWORK_LABEL;
                  } else if (key === SUBNETWORK_KEY) {
                    label = SUBNETWORK_LABEL;
                  } else {
                    label = '';
                  }
                  if (
                    key === SERVICE_ACCOUNT_KEY ||
                    key === NETWORK_KEY ||
                    key === SUBNETWORK_KEY
                  ) {
                    return (
                      <div className="row-details" key={key}>
                        <div className="session-env-details-label">{label}</div>
                        <div className="session-env-details-value">{value}</div>
                      </div>
                    );
                  }
                })}
                <div className="row-details">
                  <div className="session-env-details-label">Network tags</div>
                  <div className="session-env-details-value"></div>
                </div>
                <div className="row-details">
                  <div className="cluster-details-label">Labels</div>
                  <div className="session-label-style-parent">
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
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="loader-full-style">
          {isLoading && (
            <div className="session-loader">
              <ClipLoader
                color="#8A8A8A"
                loading={true}
                size={20}
                aria-label="Loading Spinner"
                data-testid="loader"
              />
              Loading Session Details
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SessionDetails;
