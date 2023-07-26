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
import { LabIcon } from '@jupyterlab/ui-components';
import ViewLogsIcon from '../../style/icons/view_logs_icon.svg';
import { VIEW_LOGS_CLUSTER_URL } from './const';

const iconViewLogs = new LabIcon({
  name: 'launcher:view-logs-icon',
  svgstr: ViewLogsIcon
});

function ViewLogs({ clusterInfo, projectName }: any) {
  return (
    <div
      className={
        clusterInfo
          ? 'action-cluster-section'
          : 'action-disabled action-cluster-section'
      }
      onClick={() => {
        window.open(
          `${VIEW_LOGS_CLUSTER_URL}${clusterInfo.clusterName}%22%0Aresource.labels.cluster_uuid%3D%22${clusterInfo.clusterUuid}%22?project=${projectName}`,
          '_blank'
        );
      }}
    >
      <div className="action-cluster-icon">
        <iconViewLogs.react tag="div" />
      </div>
      <div className="action-cluster-text">VIEW LOGS</div>
    </div>
  );
}
export default ViewLogs;
