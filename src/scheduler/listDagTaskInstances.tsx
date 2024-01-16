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
  }, [dagRunId]);

  const handleChange =
    (index: number, tryNumber: number) => (event: React.SyntheticEvent, newExpanded: boolean) => {
      console.log(tryNumber, index, typeof tryNumber)
      if (index === 0 || tryNumber === 0) {
        setExpanded(false);
      } else {
        setExpanded(newExpanded ? `${index}` : false);
        listDagTaskLogList(index);
      }
    };

  const listDagTaskLogList = async (index: any) => {
    //console.log('index', index);
    //console.log('dagtask', dagTaskInstancesList);
    console.log(dagTaskInstancesList[index].tryNumber)
    if (dagTaskInstancesList[index].tryNumber !== 0) { 
    await SchedulerService.listDagTaskLogsListService(
      composerName,
      dagId,
      dagRunId,
      dagTaskInstancesList[index].taskId,
      dagTaskInstancesList[index].tryNumber,
      setLogList,
      setIsLoading
    );
    }
  };
  //onsole.log(loglist);
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
                      onChange={handleChange(index, taskInstance.tryNumber)}
                    >
                      <AccordionSummary
                        expandIcon={index === 0 || taskInstance.tryNumber === 0  ? null : <ExpandMoreIcon />}
                        aria-controls="panel2bh-content"
                        id="panel2bh-header"
                      >
                        <div className={index === 0 ? "accordion-row-parent-collapsed" : "accordion-row-parent"}>
                          <div className="accordion-row-data">
                            {taskInstance.taskId}
                          </div>
                          <div className="accordion-row-data">
                            {taskInstance.tryNumber}
                          </div>
                          <div className="accordion-row-data">
                            {taskInstance.duration}
                          </div>
                        </div>
                      </AccordionSummary>
                      <AccordionDetails>
                        {' '}
                        <Typography>{loglist}</Typography>{' '}
                      </AccordionDetails>
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
