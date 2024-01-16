import React, { useEffect, useState } from 'react';
import {
  Typography,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { SchedulerService } from './schedulerServices';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { LabIcon } from '@jupyterlab/ui-components';
import failedIcon from '../../style/icons/error_icon.svg';
import successIcon from '../../style/icons/succeeded_icon.svg';
import stopIcon from '../../style/icons/stop_icon.svg';

const iconFailed = new LabIcon({
  name: 'launcher:delete-icon',
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
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
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

  const handleChange =
    (index: number, tryNumber: number, clickFrom: string, iconIndex: number) =>
    (event: React.SyntheticEvent, newExpanded: boolean) => {
      console.log(index, tryNumber, clickFrom, iconIndex);
      if (index === 0 || tryNumber === 0) {
        setExpanded(false);
      } else {
        setExpanded(newExpanded ? `${index}` : false);
        listDagTaskLogList(index, clickFrom, iconIndex);
      }
    };

  const listDagTaskLogList = async (
    index: any,
    clickFrom: string,
    iconIndex: number
  ) => {
    await SchedulerService.listDagTaskLogsListService(
      composerName,
      dagId,
      dagRunId,
      dagTaskInstancesList[index].taskId,
      clickFrom === 'logoClick'
        ? iconIndex
        : dagTaskInstancesList[index].tryNumber,
      setLogList,
      setIsLoadingLogs
    );
  };
  return (
    <div>
      {dagTaskInstancesList.length > 0 ? (
        <div>
          <div>
            <div>
              {dagTaskInstancesList.length > 0 &&
                dagTaskInstancesList.map((taskInstance: any, index: number) => (
                  <div key={index}>
                    <Accordion
                      expanded={expanded === `${index}`}
                      onChange={handleChange(
                        index,
                        taskInstance.tryNumber,
                        'expandClick',
                        taskInstance.tryNumber
                      )}
                    >
                      <AccordionSummary
                        expandIcon={
                          index === 0 || taskInstance.tryNumber === 0 ? null : (
                            <ExpandMoreIcon />
                          )
                        }
                        aria-controls="panel2bh-content"
                        id="panel2bh-header"
                      >
                        <div
                          className={
                            index === 0 || taskInstance.tryNumber === 0
                              ? 'accordion-row-parent-collapsed'
                              : 'accordion-row-parent'
                          }
                        >
                          <div className="accordion-row-data">
                            {taskInstance.taskId}
                          </div>
                          <div className="accordion-row-data">
                            {index === 0 ? (
                              <div>{taskInstance.tryNumber}</div>
                            ) : taskInstance.tryNumber === 0 ? (
                              <iconStop.react
                                tag="div"
                                className="icon-white logo-alignment-style-accordion"
                              />
                            ) : (
                              <div className="logo-row-container">
                                {(() => {
                                  const logos = [];
                                  for (
                                    let i = 0;
                                    i < taskInstance.tryNumber;
                                    i++
                                  ) {
                                    logos.push(
                                      <div
                                        key={i}
                                        className="logo-alignment-style-accordion"
                                        onClick={() =>
                                          handleChange(
                                            index,
                                            taskInstance.tryNumber,
                                            'logoClick',
                                            i + 1
                                          )
                                        }
                                      >
                                        {i === taskInstance.tryNumber - 1 ? (
                                          taskInstance.state ===
                                          'failed' ? (
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
                        </div>
                      </AccordionSummary>
                      {isLoadingLogs ? (
                        <div className="spin-loader-main">
                          <CircularProgress color="primary" size={18} />
                          Loading Dag Runs Task Logs
                        </div>
                      ) : (
                        <AccordionDetails>
                          {' '}
                          <Typography>
                            <pre className="logs-content-style">{loglist}</pre>
                          </Typography>{' '}
                        </AccordionDetails>
                      )}
                    </Accordion>
                  </div>
                ))}
            </div>
          </div>
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
