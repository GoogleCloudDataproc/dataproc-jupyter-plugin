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
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  BASE_URL,
  VIEW_LOGS_BATCH_URL,
  VIEW_LOGS_CLUSTER_URL,
  VIEW_LOGS_SESSION_URL
} from './const';
import { authApi } from './utils';

const iconViewLogs = new LabIcon({
  name: 'launcher:view-logs-icon',
  svgstr: ViewLogsIcon
});

function ViewLogs({
  clusterInfo,
  projectName,
  clusterName,
  setErrorView,
  batchInfoResponse,
  sessionInfo
}: any) {
  const handleJobDetailsViewLogs = async (clusterName: string) => {
    const credentials = await authApi();
    if (credentials) {
      fetch(
        `${BASE_URL}/projects/${credentials.project_id}/regions/${credentials.region_id}/clusters/${clusterName}`,
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
              } else {
                window.open(
                  responseResult.config.endpointConfig.httpPorts[
                    'Spark History Server'
                  ]
                );
              }
            })
            .catch((e: Error) => {
              console.error(e);
            });
        })
        .catch((err: Error) => {
          console.error('Error listing clusters Details', err);
        });
    }
  };

  return (
    <>
      <div
        className="action-cluster-section"
        onClick={() => {
          if (clusterInfo) {
            window.open(
              `${VIEW_LOGS_CLUSTER_URL}"${clusterInfo.clusterName}" resource.labels.cluster_uuid="${clusterInfo.clusterUuid}"?project=${projectName}`,
              '_blank'
            );
          } else if (batchInfoResponse) {
            window.open(
              batchInfoResponse.runtimeInfo.endpoints['Spark History Server'],
              '_blank'
            );
          } else if (sessionInfo) {
            window.open(
              sessionInfo.runtimeInfo.endpoints['Spark History Server'],
              '_blank'
            );
          } else {
            handleJobDetailsViewLogs(clusterName);
          }
        }}
      >
        <div className="action-cluster-icon">
          <iconViewLogs.react tag="div" />
        </div>
        {clusterInfo ? (
          <div className="action-cluster-text">VIEW CLOUD LOGS</div>
        ) : (
          <div className="action-cluster-text">VIEW SPARK LOGS</div>
        )}
      </div>
      <div
        className="action-cluster-section"
        onClick={() => {
          if (sessionInfo) {
            window.open(
              `${VIEW_LOGS_SESSION_URL} resource.labels.project_id="${
                sessionInfo.name.split('/')[1]
              }"
              resource.labels.location="us-central1"
              resource.labels.session_id="${
                sessionInfo.name.split('/')[5]
              }"?project=${sessionInfo.name.split('/')[1]}`,
              '_blank'
            );
          } else {
            window.open(
              `${VIEW_LOGS_BATCH_URL} resource.labels.project_id="${
                batchInfoResponse.name.split('/')[1]
              }"
              resource.labels.location="us-central1"
              resource.labels.session_id="${
                batchInfoResponse.name.split('/')[5]
              }"?project=${batchInfoResponse.name.split('/')[1]}`,
              '_blank'
            );
          }
        }}
      >
        {!clusterInfo && !clusterName && (
          <>
            <div className="action-cluster-icon">
              <iconViewLogs.react tag="div" />
            </div>
            <div className="action-cluster-text">VIEW CLOUD LOGS</div>
          </>
        )}
      </div>
    </>
  );
}
export default ViewLogs;
