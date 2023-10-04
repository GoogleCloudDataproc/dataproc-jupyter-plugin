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
import { LabIcon } from '@jupyterlab/ui-components';
import LeftArrowIcon from '../../style/icons/left_arrow_icon.svg';
import StopClusterIcon from '../../style/icons/stop_cluster_icon.svg';
import StopClusterDisableIcon from '../../style/icons/stop_cluster_disable_icon.svg';
import SucceededIcon from '../../style/icons/succeeded_icon.svg';
import clusterErrorIcon from '../../style/icons/cluster_error_icon.svg';
import {
  DATAPROC_CLUSTER_KEY,
  DATAPROC_CLUSTER_LABEL,
  HTTP_METHOD,
  METASTORE_SERVICE_KEY,
  METASTORE_SERVICE_LABEL,
  NETWORK_KEY,
  NETWORK_LABEL,
  NETWORK_TAGS_KEY,
  NETWORK_TAGS_LABEL,
  SERVICE_ACCOUNT_KEY,
  SERVICE_ACCOUNT_LABEL,
  SPARK_HISTORY_SERVER,
  SPARK_HISTORY_SERVER_KEY,
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
import {
  authenticatedFetch,
  elapsedTime,
  jobTimeFormat,
  toastifyCustomStyle
} from '../utils/utils';
import ClipLoader from 'react-spinners/ClipLoader';
import ViewLogs from '../utils/viewLogs';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { terminateSessionAPI } from '../utils/sessionService';
import PollingTimer from '../utils/pollingTimer';
import { JupyterLab } from '@jupyterlab/application';

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
  setDetailedSessionView: (value: boolean) => void;
  detailedSessionView: boolean;
  fromPage?: string;
  app?: JupyterLab;
}
function SessionDetails({
  sessionSelected,
  setDetailedSessionView,
  detailedSessionView,
  fromPage,
  app
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
    stateMessage:'',
    environmentConfig: {
      executionConfig: {
        serviceAccount: '',
        subnetworkUri: '',
        networkTags: [],
        kmsKey: ''
      },
      peripheralsConfig: {
        metastoreService: '',
        sparkHistoryServerConfig: {
          dataprocCluster: ''
        }
      }
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [labelDetail, setLabelDetail] = useState(['']);
  const timer = useRef<NodeJS.Timeout | undefined>(undefined);

  const pollingSessionDetails = async (
    pollingFunction: () => void,
    pollingDisable: boolean
  ) => {
    timer.current = PollingTimer(
      pollingFunction,
      pollingDisable,
      timer.current
    );
  };

  const handleDetailedView = () => {
    if (fromPage === 'Launcher') {
      app?.shell.activeWidget?.close();
    }
    else{
    pollingSessionDetails(getSessionDetails, true);
    setDetailedSessionView(false);
    }
  };
  const getSessionDetails = async () => {
    try {
      const response = await authenticatedFetch({
        uri: `sessions/${sessionSelected}`,
        method: HTTP_METHOD.GET,
        regionIdentifier: 'locations'
      });

      const formattedResponse = await response.json();
      setSessionInfo(formattedResponse);
      const labelValue: string[] = [];
      if (formattedResponse.labels) {
        for (const [key, value] of Object.entries(formattedResponse.labels)) {
          labelValue.push(`${key}:${value}`);
        }
      }
      setLabelDetail(labelValue);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error('Error loading session details', error);
      toast.error(
        `Failed to fetch session details ${sessionSelected}`,
        toastifyCustomStyle
      );
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
    const sessionStateTime = new Date(sessionInfo.stateTime); // Convert string to Date
    elapsedTimeString = elapsedTime(sessionStateTime, sessionStartTime);
  }
  const sessionActiveTime =
    sessionInfo.stateHistory &&
    sessionInfo.stateHistory.length > 1 &&
    sessionInfo.stateHistory[1].stateStartTime
      ? new Date(sessionInfo.stateHistory[1].stateStartTime)
      : '';
  let runTimeString = '';
  if (sessionActiveTime !== '') {
    const sessionInfoStateTime = new Date(sessionInfo.stateTime);
    runTimeString = elapsedTime(sessionInfoStateTime, sessionActiveTime);
  }
 

  return (
    <div>
      {sessionInfo.name !== '' ? (
        <div className="scroll-comp">
          {detailedSessionView && (
            <div>
              <div className="cluster-details-header scroll-fix-header">
                <div
                  role="button"
                  className="back-arrow-icon"
                  onClick={() => handleDetailedView()}
                >
                  <iconLeftArrow.react
                    tag="div"
                    className="logo-alignment-style"
                  />
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
                      <iconSucceeded.react
                        tag="div"
                        className="logo-alignment-style"
                      />
                    )}
                    {sessionInfo.state === STATUS_TERMINATED && (
                      <iconSucceeded.react
                        tag="div"
                        className="logo-alignment-style"
                      />
                    )}
                    {sessionInfo.state === STATUS_ERROR && (
                      <iconClusterError.react
                        tag="div"
                        className="logo-alignment-style"
                      />
                    )}
                    {sessionInfo.state === STATUS_FAIL && (
                      <iconClusterError.react
                        tag="div"
                        className="logo-alignment-style"
                      />
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
                {sessionInfo.state === STATUS_FAIL && (
                <div className="row-details">
                  <div className="cluster-details-label">Status Message</div>
                  <div className="session-details-value">
                    {sessionInfo.stateMessage}
                  </div>
                </div>
                )}
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
                  } else if (key === NETWORK_TAGS_KEY) {
                    label = NETWORK_TAGS_LABEL;
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
                  } else if (key === NETWORK_TAGS_KEY) {
                    return (
                      <div className="row-details" key={key}>
                        <div className="batch-details-label-level-two">{label}</div>
                        <div className="details-value">
                          {
                            //@ts-ignore value type issue
                            value.map((item: string) => {
                              return <div>{item}</div>;
                            })
                          }
                        </div>
                      </div>
                    );
                  }
                })}
              {(sessionInfo?.environmentConfig?.peripheralsConfig
              ?.metastoreService ||
              sessionInfo?.environmentConfig?.peripheralsConfig
                ?.sparkHistoryServerConfig?.dataprocCluster) && (
              <div className="row-details">
                <div className="batch-details-label-level-one">
                  Peripherals config
                </div>
                <div className="details-value"></div>
              </div>
            )}
            {Object.entries(
              sessionInfo.environmentConfig.peripheralsConfig
            ).map(([key, value]) => {
              let label;
              if (key === METASTORE_SERVICE_KEY) {
                label = METASTORE_SERVICE_LABEL;
              } else if (key === SPARK_HISTORY_SERVER_KEY) {
                label = SPARK_HISTORY_SERVER;
              } else {
                label = '';
              }
              <div className="row-details">
                <div className="batch-details-label-level-one">
                  Peripherals config
                </div>
                <div className="details-value"></div>
              </div>;
              if (key === METASTORE_SERVICE_KEY) {
                return (
                  <div className="row-details" key={key}>
                    <div className="batch-details-label-level-two">{label}</div>
                    <div className="details-value">
                      {
                        sessionInfo.environmentConfig.peripheralsConfig[
                          METASTORE_SERVICE_KEY
                        ]
                      }
                    </div>
                  </div>
                );
              } else if (
                key === SPARK_HISTORY_SERVER_KEY &&
                sessionInfo?.environmentConfig?.peripheralsConfig
                  ?.sparkHistoryServerConfig?.dataprocCluster
              ) {
                return (
                  <div>
                    <div className="row-details" key={key}>
                      <div className="batch-details-label-level-two">
                        {label}
                      </div>
                    </div>
                    <div className="row-details" key={DATAPROC_CLUSTER_KEY}>
                      <div className="batch-details-label-level-three">
                        {DATAPROC_CLUSTER_LABEL}
                      </div>
                      <div className="details-value">
                        {
                          sessionInfo.environmentConfig.peripheralsConfig
                            .sparkHistoryServerConfig[DATAPROC_CLUSTER_KEY]
                        }
                      </div>
                    </div>
                  </div>
                );
              }
            })}

            <div className="row-details">
              <div className="details-label">Encryption type</div>
              <div className="details-value">
                {sessionInfo?.environmentConfig?.executionConfig?.kmsKey
                  ? 'Customer-managed'
                  : 'Google-managed'}
              </div>
            </div>
            {sessionInfo?.environmentConfig?.executionConfig?.kmsKey && (
              <div className="row-details">
                <div className="details-label">Encryption key</div>
                <div className="details-value">
                  {sessionInfo.environmentConfig.executionConfig.kmsKey}
                </div>
              </div>
            )}
                <div className="row-details">
                  <div className="cluster-details-label">Labels</div>
                  <div className="session-label-style-parent">
                    {labelDetail.length > 0
                      ? labelDetail.map(label => {
                          /*
                          Extracting key, value from label
                             Example: "{client:dataproc_jupyter_plugin}"
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
