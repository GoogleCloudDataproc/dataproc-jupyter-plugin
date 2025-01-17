/**
 * @license
 * Copyright 2025 Google LLC
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
import {
  CircularProgress,
  Button
} from '@mui/material';
import { IDagRunList } from './VertexInterfaces';
import { LogEntriesServices } from '../../Services/LogEntries';

const VertexJobTaskLogs = ({
  jobRunId,
  jobRunsData,
}: {
  jobRunId: string;
  jobRunsData: IDagRunList | undefined;
}): JSX.Element => {
  const [dagTaskInstancesList, setDagTaskInstancesList] = useState<any>([]);
  const [isLoading, setIsLoading] = useState(true);

  /** 
   * Fetches and lists the task instances for a specific job run.
   */
  const listDagTaskInstancesRunsList = async () => {
    await LogEntriesServices.vertexJobTaskLogsListService(
      jobRunId,
      jobRunsData,
      setDagTaskInstancesList,
      setIsLoading
    );
  };

  useEffect(() => {
    if (jobRunId && jobRunsData) {
      listDagTaskInstancesRunsList();
    }
  }, [jobRunId, jobRunsData]);

  return (
    <div>
      <div className="btn-refresh log-btn">
        <Button
          disabled={isLoading}
          className="btn-refresh-text"
          variant="outlined"
          aria-label="cancel Batch"
        >
          <div>LOGS</div>
        </Button>
      </div>
      {dagTaskInstancesList.length > 0 ? (
        <div>
          <div className="accordion-vertex-row-parent-header">
            <div className="accordion-vertex-row-data">Severity</div>
            <div className="accordion-vertex-row-data">Time Stamp</div>
            <div className="accordion-vertex-row-data">Summary</div>
            <div className="accordion-row-data-expand-logo"></div>
          </div>
          {dagTaskInstancesList.length > 0 &&
            dagTaskInstancesList.map((taskInstance: { severity: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; date: string; time: string; textPayload: string; tryNumber: number; }, index: string) => (
              <div>
                {
                  taskInstance.severity === 'ERROR' || taskInstance.severity === "WARNING" &&
                  <div className="accordion-vertex-row-parent">
                    <div className="accordion-vertex-row-data">
                      {taskInstance.severity}
                    </div>
                    <div className="accordion-vertex-row-data">
                      {taskInstance.date + " " + taskInstance.time}
                    </div>
                    <div className="accordion-vertex-row-data">
                      {taskInstance.textPayload.split(']')[1]}
                    </div>
                  </div>
                }
              </div>
            ))}
        </div>
      ) : (
        <div>
          {isLoading ? (
            <div className="spin-loader-main">
              <CircularProgress
                className="spin-loader-custom-style"
                color="primary"
                size={18}
              />
              Loading Dag Runs Task Instances
            </div>
          ) : (
            <div className="no-data-style">No rows to display</div>
          )}
        </div>
      )}
    </div>
  );
};

export default VertexJobTaskLogs;
