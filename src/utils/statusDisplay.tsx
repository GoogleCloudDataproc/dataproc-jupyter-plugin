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

import React from 'react';
import {
  STATUS_CREATING,
  STATUS_DELETING,
  STATUS_FAIL,
  STATUS_PROVISIONING,
  STATUS_RUNNING,
  STATUS_STARTING,
  STATUS_STOPPING,
  STATUS_CANCELLED,
  STATUS_PENDING,
  STATUS_SUCCESS
} from '../utils/const';
import { LabIcon } from '@jupyterlab/ui-components';
import stopIcon from '../../style/icons/stop_icon.svg';
import clusterRunningIcon from '../../style/icons/cluster_running_icon.svg';
import clusterErrorIcon from '../../style/icons/cluster_error_icon.svg';
import SucceededIcon from '../../style/icons/succeeded_icon.svg';
import { CircularProgress } from '@mui/material';

export const statusDisplay = (statusMsg: string) => {
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
  const iconStop = new LabIcon({
    name: 'launcher:stop-icon',
    svgstr: stopIcon
  });

  return (
    <div className="cluster-detail-status-parent">
      {statusMsg === STATUS_CANCELLED && (
        <iconStop.react tag="div" className="logo-alignment-style" />
      )}
      {statusMsg === STATUS_RUNNING && (
        <iconClusterRunning.react tag="div" className="logo-alignment-style" />
      )}
      {statusMsg === STATUS_SUCCESS && (
        <iconSucceeded.react tag="div" className="logo-alignment-style" />
      )}
      {statusMsg === STATUS_FAIL && (
        <iconClusterError.react tag="div" className="logo-alignment-style" />
      )}
      {(statusMsg === STATUS_PROVISIONING ||
        statusMsg === STATUS_CREATING ||
        statusMsg === STATUS_STARTING ||
        statusMsg === STATUS_STOPPING ||
        statusMsg === STATUS_PENDING ||
        statusMsg === STATUS_DELETING) && (
        <CircularProgress
          size={15}
          aria-label="Loading Spinner"
          data-testid="loader"
        />
      )}
      <div className="cluster-status">{statusMsg.toLowerCase()}</div>
    </div>
  );
};
