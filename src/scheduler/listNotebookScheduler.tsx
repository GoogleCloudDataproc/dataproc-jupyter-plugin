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


function listNotebookScheduler({ app }: { app: JupyterFrontEnd }) {
  const [isLoading, setIsLoading] = useState(true);
  const [composerList, setComposerList] = useState<string[]>([]);
  const [composerSelected, setComposerSelected] = useState('composer4');
  const [dagList, setDagList]= useState<any[]>([]);
  const data = dagList;
  const [bucketName, setBucketName]=useState("")

  const columns = React.useMemo(
    () => [
      {
        Header: 'Notebook name',
        accessor: 'notebookname'
      },
      {
        Header: 'Input files name',
        accessor: 'inputfilesname'
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

  const handleUpdateScheduler= () =>{
    
  }

  const handleDeleteScheduler=() =>{

  }

  const handleInputFileClick = async (event: React.MouseEvent, inputPath: string) => {
    // Prevent the default behavior of the anchor tag (e.g., navigating to a new page)
    event.preventDefault();
  
    try {
      const serviceURL = `download?dag_path=${inputPath}`;
      const formattedResponse: any = await requestAPI(serviceURL);
  
      // Process the API response as needed
      console.log('API response for InputFilename:', formattedResponse);
    } catch (error) {
      // Handle API call errors
      console.error('Error making API call:', error);
      toast.error('Failed to fetch data', toastifyCustomStyle);
    }
  };
  

  const listComposersAPI = async () => {
    try {
      const formattedResponse: any = await requestAPI('composer');
      console.log("Composerlistapi",formattedResponse)
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

  const listDagInfoAPI = async () =>
  {
    try {
      const serviceURL = `dagList?composer=${composerSelected}`;
      const formattedResponse: any = await requestAPI(serviceURL);  
      console.log("daglistapi000", formattedResponse[0])
      console.log("1111",formattedResponse[1])
      let transformDagListData = [];
      if (formattedResponse && formattedResponse[0].dags) {
        transformDagListData = formattedResponse[0].dags.map((dag:any) => {
         return {
            notebookname: dag.dag_id,
            inputfilesname: `${dag.dag_id}.py`,
            schedule: dag.timetable_description,
            status: dag.is_active ? 'Active' : 'Paused',
          };
        });
      } 
        setDagList(transformDagListData);
        setIsLoading(false);
        setBucketName(formattedResponse[1])
    } catch (error) {
      DataprocLoggingService.log(
        'Error listing dag Scheduler list',
        LOG_LEVEL.ERROR
      );
      console.error('Error listing dag Scheduler list', error);
      toast.error(
        'Failed to fetch dag Scheduler list',
        toastifyCustomStyle
      );
    }
  }

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
    const isSchedulerActive = data.status === 'Active';
    return (
      <div className="actions-icon">
        <div
          role="button"
          className="icon-buttons-style"
          title={isSchedulerActive ? "stop" : "start"}
          onClick={() => handleUpdateScheduler()}
        >
          {isSchedulerActive ? 
          <iconStop.react 
          tag="div" className="icon-white logo-alignment-style" /> 
          : <iconStart.react 
          tag="div" className="icon-white logo-alignment-style" />}
        </div>
        <div
          role="button"
          className="icon-buttons-style"
          title="Delete"
          onClick={() => handleDeleteScheduler()}
        >
          <iconDelete.react tag="div" className="icon-white logo-alignment-style" />
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
    }
    else if (cell.column.Header === 'Input files name') {
      console.log("cell.value",cell.value);
      const input_path = `${bucketName}/dataproc-notebooks/${cell.value}`
      //console.log("input path :",input_path)
      return (
        <td {...cell.getCellProps()} className="clusters-table-data">
          <a
            href={`your-link-prefix/${cell.value}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => handleInputFileClick(e, input_path)}
          >
            {cell.render('Cell')}
          </a>
        </td>
      );
    } 
     else {
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
            onChange={(_event, val) =>{
              handleComposerSelected(val) 
            }
            }
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
