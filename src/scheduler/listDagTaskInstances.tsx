import React, { useEffect, useState } from 'react';
import {
  Typography,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { SchedulerService } from './schedulerServices';
// import { styled } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
// import MuiAccordion, { AccordionProps } from '@mui/material/Accordion';
// import MuiAccordionSummary, {
//   AccordionSummaryProps,
// } from '@mui/material/AccordionSummary';
// import MuiAccordionDetails from '@mui/material/AccordionDetails';

// const Accordion = styled((props: AccordionProps) => (
//   <MuiAccordion disableGutters elevation={0} square {...props} />
// ))(({ theme }) => ({
//   border: `1px solid ${theme.palette.divider}`,
//   '&:not(:last-child)': {
//     borderBottom: 0,
//   },
//   '&::before': {
//     display: 'none',
//   },
// }));

// const AccordionSummary = styled((props: AccordionSummaryProps) => (
//   <MuiAccordionSummary
//     expandIcon={<ExpandMoreIcon sx={{ fontSize: '0.9rem' }} />}
//     {...props}
//   />
// ))(({ theme }) => ({
//   backgroundColor:
//     theme.palette.mode === 'dark'
//       ? 'rgba(255, 255, 255, .05)'
//       : 'rgba(0, 0, 0, .03)',
//   flexDirection: 'row-reverse',
//   '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': {
//     order: 1,
//     transform: 'rotate(90deg)',
//   },
//   '& .MuiAccordionSummary-content': {
//     order: 0,
//     marginLeft: theme.spacing(1),
//   },
// }));

// const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
//   padding: theme.spacing(2),
//   borderTop: '1px solid rgba(0, 0, 0, .125)',
// }));
// const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
//   padding: theme.spacing(2),
//   height: '400px',
//   overflow: 'auto',
//   borderTop: '1px solid rgba(0, 0, 0, .125)',
// }));

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
    (index: number) => (event: React.SyntheticEvent, newExpanded: boolean) => {
      if (index === 0) {
        setExpanded(false);
      } else {
        setExpanded(newExpanded ? `${index}` : false);
        listDagTaskLogList(index);
      }
    };

  const listDagTaskLogList = async (index: any) => {
    console.log('index', index);
    console.log('dagtask', dagTaskInstancesList);
    await SchedulerService.listDagTaskLogsListService(
      composerName,
      dagId,
      dagRunId,
      dagTaskInstancesList[index].taskId,
      dagTaskInstancesList[index].tryNumber,
      setLogList,
      setIsLoading
    );
  };
  console.log(loglist);
  return (
    <div>
      {dagTaskInstancesList.length > 0 ? (
        <div>
          <div>
            {/* <div className="header-row-span123">
                <span   style={{
                  width:'33%',
                  marginLeft: '5px',
                  fontSize: '13px',
                  padding: '2px',}}>Attempts</span>
                <span
                style={{
                  width:'33%',
                  marginLeft: '5px',
                  fontSize: '13px',
                  padding: '2px',}}
                >Start</span>
                <span   style={{
                  width:'33%',
                  marginLeft: '5px',
                  fontSize: '13px',
                  padding: '2px',}}
                >Duration</span>
              </div> */}
            <div>
              {dagTaskInstancesList.length > 0 &&
                dagTaskInstancesList.map((taskInstance: any, index: number) => (
                  <div key={index}>
                    <Accordion
                      expanded={expanded === `${index}`}
                      onChange={handleChange(index)}
                    >
                      <AccordionSummary
                        expandIcon={index === 0 ? null : <ExpandMoreIcon />}
                        aria-controls="panel2bh-content"
                        id="panel2bh-header"
                      >
                        <div>
                          <span>{taskInstance.taskId}</span>
                          <span>{taskInstance.tryNumber}</span>
                          <span>{taskInstance.duration}</span>
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
