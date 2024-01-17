import React, { useEffect, useState } from 'react';
import { Typography, CircularProgress } from '@mui/material';
import { SchedulerService } from './schedulerServices';
import { LabIcon } from '@jupyterlab/ui-components';
import failedIcon from '../../style/icons/error_icon.svg';
import successIcon from '../../style/icons/succeeded_icon.svg';
import stopIcon from '../../style/icons/stop_icon.svg';
import DownArrowIcon from '../../style/icons/keyboard_arrow_down.svg';

const iconFailed = new LabIcon({
  name: 'launcher:failed-icon',
  svgstr: failedIcon
});
const iconSuccess = new LabIcon({
  name: 'launcher:start-icon',
  svgstr: successIcon
});
const iconStop = new LabIcon({
  name: 'launcher:stop-icon',
  svgstr: stopIcon
});
const iconDownArrow = new LabIcon({
  name: 'launcher:keyboard-down-arrow-icon',
  svgstr: DownArrowIcon
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

  const handleChange = (index: number, iconIndex: number, fromClick: string) => {
    if (`${index}` === expanded &&  fromClick === 'expandClick') {
      setExpanded(false);
    } else {
      setExpanded(`${index}`);
      listDagTaskLogList(index, iconIndex);
    }
  };

  const listDagTaskLogList = async (index: any, iconIndex: number) => {
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
            <div className="accordion-row-data">Duration</div>
            <div className="accordion-row-data-expand-logo"></div>
          </div>
          {dagTaskInstancesList.length > 0 &&
            dagTaskInstancesList.map((taskInstance: any, index: number) => (
              <div>
                <div className="accordion-row-parent">
                  <div className="accordion-row-data">
                    {taskInstance.taskId}
                  </div>
                  <div className="accordion-row-data">
                    {taskInstance.tryNumber === 0 ? (
                      <iconStop.react
                        tag="div"
                        className="icon-white logo-alignment-style-accordion"
                      />
                    ) : (
                      <div className="logo-row-container">
                        {(() => {
                          const logos = [];
                          for (let i = 0; i < taskInstance.tryNumber; i++) {
                            logos.push(
                              <div
                                key={i}
                                className="logo-alignment-style-accordion"
                                onClick={() => handleChange(index, i + 1, 'attemptsClick')}
                              >
                                {i === taskInstance.tryNumber - 1 ? (
                                  taskInstance.state === 'failed' ? (
                                    <iconFailed.react
                                      tag="div"
                                      className="icon-white"
                                    />
                                  ) : (
                                    <iconSuccess.react
                                      tag="div"
                                      className="icon-white"
                                    />
                                  )
                                ) : (
                                  <iconFailed.react
                                    tag="div"
                                    className="icon-white"
                                  />
                                )}
                              </div>
                            );
                          }
                          return logos;
                        })()}
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
                        handleChange(index, taskInstance.tryNumber, 'expandClick')
                      }
                    >
                      <iconDownArrow.react
                        tag="div"
                        className="icon-white logo-alignment-style-accordion"
                      />
                    </div>
                  ) : (
                    <div className="accordion-row-data-expand-logo"></div>
                  )}
                </div>

                {isLoadingLogs && expanded === `${index}` ? (
                  <div className="spin-loader-main">
                    <CircularProgress color="primary" size={18} />
                    Loading Dag Runs Task Logs
                  </div>
                ) : (
                  expanded === `${index}` && (
                    <div>
                      {' '}
                      <Typography>
                        <pre className="logs-content-style">{loglist}</pre>
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
              <CircularProgress color="primary" size={18} />
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
