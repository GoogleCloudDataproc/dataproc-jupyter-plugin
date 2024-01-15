import React, { useEffect, useState } from 'react';
import { Typography, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
//import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { SchedulerService } from './schedulerServices';
import { styled } from '@mui/material/styles';
import ArrowForwardIosSharpIcon from '@mui/icons-material/ArrowForwardIosSharp';
import MuiAccordion, { AccordionProps } from '@mui/material/Accordion';
import MuiAccordionSummary, {
  AccordionSummaryProps,
} from '@mui/material/AccordionSummary';
import MuiAccordionDetails from '@mui/material/AccordionDetails';

const Accordion = styled((props: AccordionProps) => (
  <MuiAccordion disableGutters elevation={0} square {...props} />
))(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  '&:not(:last-child)': {
    borderBottom: 0,
  },
  '&::before': {
    display: 'none',
  },
}));

const AccordionSummary = styled((props: AccordionSummaryProps) => (
  <MuiAccordionSummary
    expandIcon={<ArrowForwardIosSharpIcon sx={{ fontSize: '0.9rem' }} />}
    {...props}
  />
))(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, .05)'
      : 'rgba(0, 0, 0, .03)',
  flexDirection: 'row-reverse',
  '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': {
    transform: 'rotate(90deg)',
  },
  '& .MuiAccordionSummary-content': {
    marginLeft: theme.spacing(1),
  },
}));

const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: '1px solid rgba(0, 0, 0, .125)',
}));

const ListDagTaskInstances = ({
  composerName,
  dagId,
  dagRunId
}: {
  composerName: string;
  dagId: string;
  dagRunId: string;
}): JSX.Element => {
  const [dagTaskInstancesList, setDagTaskInstancesList] = useState([
    {
      tryNumber: 2,
      taskId:"start_cluster",
      date: '11-01-2023',
      duration: '4h 22m 18s',
    },
    {
      tryNumber: 1,
      taskId:"start_cluster",
      date: '11-02-2023',
      duration: '22m 18s',
    },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | false>(false);
  const [loglist, setLogList] = useState('')

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


  const handleChange = (index: number) => (
    event: React.SyntheticEvent,
    newExpanded: boolean
  ) => {
    setExpanded(newExpanded ? `${index}` : false);
    listDagTaskLogList(index);
  };

  const listDagTaskLogList = async (index: any ) => {
    console.log("index",index)
    console.log("dagtask",dagTaskInstancesList)
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
  console.log(loglist)
  return (
    <div>
      {dagTaskInstancesList.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Attempt</TableCell>
                <TableCell>Start</TableCell>
                <TableCell>Duration</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dagTaskInstancesList.map((taskInstance, index) => (
                <React.Fragment key={index}>
                  <TableRow>
                  <TableCell colSpan={4}>
                  <Accordion
                        expanded={expanded === `${index}`}
                        onChange={handleChange(index)}
                      >
                      <AccordionSummary>
                    <TableCell>{`${taskInstance.tryNumber}`}</TableCell>
                    <TableCell>{`${taskInstance.date}`}</TableCell>
                    <TableCell>{`${taskInstance.duration}`}</TableCell>
                    </AccordionSummary>
                    <AccordionDetails>
                          <Typography>
                            {loglist}
                          </Typography>
                    </AccordionDetails>
                    </Accordion>
                    </TableCell>
                  </TableRow>
                  {/* <TableRow>
                    <TableCell colSpan={3}>
                    </TableCell>
                  </TableRow> */}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
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
