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
import { Typography, CircularProgress, IconButton } from '@mui/material';
import { SchedulerService } from './schedulerServices';
import { LabIcon } from '@jupyterlab/ui-components';
import dagTaskSuccessIcon from '../../style/icons/dag_task_success_icon.svg';
import dagTaskFailedIcon from '../../style/icons/dag_task_failed_icon.svg';
import stopIcon from '../../style/icons/stop_icon.svg';
import expandLessIcon from '../../style/icons/expand_less.svg';
import expandMoreIcon from '../../style/icons/expand_more.svg';
import { handleDebounce } from '../utils/utils';

const iconDagTaskFailed = new LabIcon({
  name: 'launcher:dag-task-failed-icon',
  svgstr: dagTaskFailedIcon
});
const iconDagTaskSuccess = new LabIcon({
  name: 'launcher:dag-task-success-icon',
  svgstr: dagTaskSuccessIcon
});
const iconStop = new LabIcon({
  name: 'launcher:stop-icon',
  svgstr: stopIcon
});
const iconExpandLess = new LabIcon({
  name: 'launcher:expand-less-icon',
  svgstr: expandLessIcon
});
const iconExpandMore = new LabIcon({
  name: 'launcher:expand-more-icon',
  svgstr: expandMoreIcon
});

const ListDagTaskInstances = ({
  composerName,
  dagId,
  dagRunId
}: {
  composerName: string;
  dagId: string;
  dagRunId: string;
}): JSX.Element => {
  const [dagTaskInstancesList, setDagTaskInstancesList] = useState<any>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [expanded, setExpanded] = useState<string | false>(false);
  const [loglist, setLogList] = useState('');

  const [height, setHeight] = useState(window.innerHeight - 320);

  function handleUpdateHeight() {
    let updateHeight = window.innerHeight - 320;
    setHeight(updateHeight);
  }

  // Debounce the handleUpdateHeight function
  const debouncedHandleUpdateHeight = handleDebounce(handleUpdateHeight, 500);

  // Add event listener for window resize using useEffect
  useEffect(() => {
    window.addEventListener('resize', debouncedHandleUpdateHeight);

    // Cleanup function to remove event listener on component unmount
    return () => {
      window.removeEventListener('resize', debouncedHandleUpdateHeight);
    };
  }, []);

  const listDagTaskInstancesRunsList = async () => {
    await SchedulerService.listDagTaskInstancesListService(
      composerName,
      dagId,
      dagRunId,
      setDagTaskInstancesList,
      setIsLoading
    );
  };

  useEffect(() => {
    listDagTaskInstancesRunsList();
    setExpanded(false);
  }, [dagRunId]);

  useEffect(() => {
    if (dagTaskInstancesList.length > 0) {
      setExpanded('0');
      listDagTaskLogList('0', dagTaskInstancesList[0].tryNumber);
    }
  }, [dagTaskInstancesList]);

  const handleChange = (
    index: string,
    iconIndex: number,
    fromClick: string
  ) => {
    if (`${index}` === expanded && fromClick === 'expandClick') {
      setExpanded(false);
    } else {
      setExpanded(`${index}`);
      listDagTaskLogList(index, iconIndex);
    }
  };

  const listDagTaskLogList = async (index: string, iconIndex: number) => {
    await SchedulerService.listDagTaskLogsListService(
      composerName,
      dagId,
      dagRunId,
      dagTaskInstancesList[index].taskId,
      iconIndex,
      setLogList,
      setIsLoadingLogs
    );
  };
  return (
    <div>
      {dagTaskInstancesList.length > 0 ? (
        <div>
          <div className="accordion-row-parent-header">
            <div className="accordion-row-data">Task Id</div>
            <div className="accordion-row-data">Attempts</div>
            <div className="accordion-row-data">Duration (in seconds)</div>
            <div className="accordion-row-data-expand-logo"></div>
          </div>
          {dagTaskInstancesList.length > 0 &&
            dagTaskInstancesList.map((taskInstance: any, index: string) => (
              <div>
                <div className="accordion-row-parent">
                  <div className="accordion-row-data">
                    {taskInstance.taskId}
                  </div>
                  <div className="accordion-row-data">
                    {taskInstance.tryNumber === 0 ? (
                      <IconButton disabled>
                        <iconStop.react tag="div" />
                      </IconButton>
                    ) : (
                      <div className="logo-row-container">
                        {Array.from({ length: taskInstance.tryNumber }).map(
                          (_, i) => (
                            <IconButton
                              key={i}
                              onClick={() =>
                                handleChange(index, i + 1, 'attemptsClick')
                              }
                            >
                              {i === taskInstance.tryNumber - 1 ? (
                                taskInstance.state === 'failed' ? (
                                  <iconDagTaskFailed.react tag="div" />
                                ) : (
                                  <iconDagTaskSuccess.react tag="div" />
                                )
                              ) : (
                                <iconDagTaskFailed.react tag="div" />
                              )}
                            </IconButton>
                          )
                        )}
                      </div>
                    )}
                  </div>
                  <div className="accordion-row-data">
                    {taskInstance.duration}
                  </div>
                  {taskInstance.tryNumber !== 0 ? (
                    <div
                      className="accordion-row-data-expand-logo"
                      onClick={() =>
                        handleChange(
                          index,
                          taskInstance.tryNumber,
                          'expandClick'
                        )
                      }
                    >
                      {expanded === `${index}` ? (
                        <iconExpandLess.react
                          tag="div"
                          className="icon-white logo-alignment-style-accordion"
                        />
                      ) : (
                        <iconExpandMore.react
                          tag="div"
                          className="icon-white logo-alignment-style-accordion"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="accordion-row-data-expand-logo"></div>
                  )}
                </div>

                {isLoadingLogs && expanded === `${index}` ? (
                  <div className="spin-loader-main">
                    <CircularProgress
                      className="spin-loader-custom-style"
                      color="primary"
                      size={18}
                    />
                    Loading Dag Runs Task Logs
                  </div>
                ) : (
                  expanded === `${index}` && (
                    <div>
                      {' '}
                      <Typography>
                        <pre
                          className="logs-content-style"
                          style={{ maxHeight: height }}
                        >
                          {loglist}
                        </pre>
                      </Typography>{' '}
                    </div>
                  )
                )}
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

export default ListDagTaskInstances;
