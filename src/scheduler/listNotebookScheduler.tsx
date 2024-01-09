import React, { useState, useEffect } from 'react';
import { useTable, usePagination } from 'react-table';
import TableData from '../utils/tableData';
import { PaginationView } from '../utils/paginationView';
import { ICellProps } from '../utils/utils';
import { requestAPI } from '../handler/handler';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';
import { toast } from 'react-toastify';
import { toastifyCustomStyle } from '../utils/utils';
import { Autocomplete, TextField } from '@mui/material';
import deleteIcon from '../../style/icons/delete_icon.svg';
import { LabIcon } from '@jupyterlab/ui-components';
import startIcon from '../../style/icons/start_icon.svg';
import stopIcon from '../../style/icons/stop_icon.svg';

const iconDelete = new LabIcon({
  name: 'launcher:delete-icon',
  svgstr: deleteIcon
});
const iconStart = new LabIcon({
  name: 'launcher:start-icon',
  svgstr: startIcon
});
const iconStop = new LabIcon({
  name: 'launcher:stop-icon',
  svgstr: stopIcon
});

function listNotebookScheduler({
  app,
  handleDagIdSelection
}: {
  app: JupyterFrontEnd;
  handleDagIdSelection: (composerName: string, dagId: string) => void;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [composerList, setComposerList] = useState<string[]>([]);
  const [composerSelected, setComposerSelected] = useState('composer4');
  const [dagList, setDagList] = useState<any[]>([]);
  const data = dagList;
  const [bucketName, setBucketName] = useState('')
  //const [schedulerStatus] = useState('active')

  const columns = React.useMemo(
    () => [
      {
        Header: 'Job Id',
        accessor: 'jobid'
      },
      {
        Header: 'Notebook name',
        accessor: 'notebookname'
      },
      {
        Header: 'Schedule',
        accessor: 'schedule'
      },
      {
        Header: 'Status',
        accessor: 'status'
      },
      {
        Header: 'Actions',
        accessor: 'actions'
      }
    ],
    []
  );
  const handleComposerSelected = (data: string | null) => {
    if (data) {
      const selectedComposer = data.toString();
      setComposerSelected(selectedComposer);
    }
  };

  const handleUpdateScheduler = async (data: string, isSchedulerActive:boolean) => {
    console.log('data in Update', data);
    //schedulerStatus(data.status)
    try {
      const serviceURL = `update?composer=${composerSelected}&dag_id=${data}`;
      const formattedResponse: any = await requestAPI(serviceURL);
      console.log(formattedResponse);
      //console.log('before', schedulerStatus);
      // if(formattedResponse.status == '0') 
      // console.log(formattedResponse.status)
      // setSchedulerStatus("Pause");
      // console.log('after', schedulerStatus);

      setDagList(prevDagList => {
        const updatedDagList = prevDagList.map(dag => {
          if (dag.jobid === data) {
            return {
              ...dag,
              status: isSchedulerActive ? 'Paused' : 'Active',
            };
          }
          return dag;
        });
        console.log(updatedDagList)
        return updatedDagList;
     
      });
      //listDagInfoAPI();
    } catch (error) {
      DataprocLoggingService.log('Error in Update api', LOG_LEVEL.ERROR);
      console.error('Error in Update api', error);
      toast.error('Failed to fetch Update api', toastifyCustomStyle);
    }
  };
  const handleDeleteScheduler = async (data: string) => {
  console.log('data in Delete', data);
  try {
    const serviceURL = `delete?composer=${composerSelected}&dag_id=${data}`;
    const deleteResponse: any = await requestAPI(serviceURL);
    console.log(deleteResponse);
    listDagInfoAPI();
    //if condition pending
    toast.success(
      `scheduler ${data} deleted successfully`,
      toastifyCustomStyle
    );
  } catch (error) {
    DataprocLoggingService.log('Error in Delete api', LOG_LEVEL.ERROR);
    console.error('Error in Delete api', error);
    toast.error(
      `Failed to delete the ${data}`,
      toastifyCustomStyle
    );
   
  }
};


  const handleInputFileClick = async (event: React.MouseEvent) => {
    // Prevent the default behavior of the anchor tag (e.g., navigating to a new page)
    event.preventDefault();
    const jobid = event.currentTarget.getAttribute('data-jobid');
    console.log('jobid', jobid);
    try {
      const serviceURL = `download?composer=${composerSelected}&dag_id=${jobid}&bucket_name=${bucketName}`;
      //console.log(serviceURL);
      const formattedResponse: any = await requestAPI(serviceURL);
      if(formattedResponse.status === 0){
      toast.success(
        `${jobid} downloaded successfully`,
        toastifyCustomStyle
      );}
      else{
        toast.error(
          `Failed to download the ${jobid}`,
          toastifyCustomStyle
        );
      }
    } catch (error) {
      DataprocLoggingService.log('Error in Download api', LOG_LEVEL.ERROR);
      console.error('Error in Download api', error);
    }
  };

  const listComposersAPI = async () => {
    try {
      const formattedResponse: any = await requestAPI('composer');
      // console.log("Composerlistapi",formattedResponse)
      let composerEnvironmentList: string[] = [];
      formattedResponse.forEach((data: any) => {
        composerEnvironmentList.push(data.name);
      });

      setComposerList(composerEnvironmentList);
    } catch (error) {
      DataprocLoggingService.log(
        'Error listing composer environment list',
        LOG_LEVEL.ERROR
      );
      console.error('Error listing composer environment list', error);
      toast.error(
        'Failed to fetch composer environment list',
        toastifyCustomStyle
      );
    }
  };

  const listDagInfoAPI = async () => {
    try {
      const serviceURL = `dagList?composer=${composerSelected}`;
      const formattedResponse: any = await requestAPI(serviceURL);
      let transformDagListData = [];
      if (formattedResponse && formattedResponse[0].dags) {
        transformDagListData = formattedResponse[0].dags.map((dag: any) => {
          return {
            jobid: dag.dag_id,
            notebookname: dag.dag_id,
            schedule: dag.timetable_description,
            status: dag.is_active ? 'Active' : 'Paused'
          };
        });
      }
      setDagList(transformDagListData);
      setIsLoading(false);
      setBucketName(formattedResponse[1]);
    } catch (error) {
      DataprocLoggingService.log(
        'Error listing dag Scheduler list',
        LOG_LEVEL.ERROR
      );
      console.error('Error listing dag Scheduler list', error);
      toast.error('Failed to fetch dag Scheduler list', toastifyCustomStyle);
    }
  };

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize }
  } = useTable(
    //@ts-ignore react-table 'columns' which is declared here on type 'TableOptions<ICluster>'
    { columns, data, autoResetPage: false, initialState: { pageSize: 50 } },
    usePagination
  );

  const renderActions = (data: any) => {
    //console.log("data in render ",data)
    const isSchedulerActive = data.status === 'Active';
    return (
      <div className="actions-icon">
        <div
          role="button"
          className="icon-buttons-style"
          title={isSchedulerActive ? 'stop' : 'start'}
          onClick={e => handleUpdateScheduler(data.jobid, isSchedulerActive)}
        >
          {isSchedulerActive ? (
            <iconStop.react
              tag="div"
              className="icon-white logo-alignment-style"
            />
          ) : (
            <iconStart.react
              tag="div"
              className="icon-white logo-alignment-style"
            />
          )}
        </div>
        <div
          role="button"
          className="icon-buttons-style"
          title="Delete"
          onClick={() => handleDeleteScheduler(data.jobid)}
        >
          <iconDelete.react
            tag="div"
            className="icon-white logo-alignment-style"
          />
        </div>
      </div>
    );
  };

  const tableDataCondition = (cell: ICellProps) => {
    if (cell.column.Header === 'Actions') {
      return (
        <td {...cell.getCellProps()} className="clusters-table-data">
          {renderActions(cell.row.original)}
        </td>
      );
    } else if (cell.column.Header === 'Job Id') {
      return (
        <td
          {...cell.getCellProps()}
          className="clusters-table-data"
          onClick={() => handleDagIdSelection(composerSelected, cell.value)}
        >
          {cell.value}
        </td>
      );
    } else if (cell.column.Header === 'Notebook name') {
      return (
        <td {...cell.getCellProps()} className="clusters-table-data">
          <button
            className="download-button"
            data-jobid={cell.value}
            onClick={e => handleInputFileClick(e)}
          >
            Download
          </button>
        </td>
      );
    } else {
      return (
        <td {...cell.getCellProps()} className="clusters-table-data">
          {cell.render('Cell')}
        </td>
      );
    }
  };
  useEffect(() => {
    listComposersAPI();
  }, []);
  useEffect(() => {
    listDagInfoAPI();
  }, [composerSelected]);
  return (
    <div>
      <div className="select-text-overlay-scheduler">
        <div className="create-scheduler-form-element">
          <Autocomplete
            options={composerList}
            value={composerSelected}
            onChange={(_event, val) => {
              handleComposerSelected(val);
            }}
            renderInput={params => (
              <TextField {...params} label="Environment*" />
            )}
          />
        </div>
      </div>
      <div className="notebook-templates-list-table-parent">
        <TableData
          getTableProps={getTableProps}
          headerGroups={headerGroups}
          getTableBodyProps={getTableBodyProps}
          isLoading={isLoading}
          rows={rows}
          page={page}
          prepareRow={prepareRow}
          tableDataCondition={tableDataCondition}
          fromPage="Notebook Scheduler"
        />
        <PaginationView
          pageSize={pageSize}
          setPageSize={setPageSize}
          pageIndex={pageIndex}
          allData={dagList}
          previousPage={previousPage}
          nextPage={nextPage}
          canPreviousPage={canPreviousPage}
          canNextPage={canNextPage}
        />
      </div>
    </div>
  );
}
export default listNotebookScheduler;
