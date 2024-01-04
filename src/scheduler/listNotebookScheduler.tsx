import React, { useState, useEffect } from 'react';
import { useTable, usePagination } from 'react-table';
import { ClipLoader } from 'react-spinners';
import TableData from '../utils/tableData';
import { PaginationView } from '../utils/paginationView';
import { ICellProps } from '../utils/utils';
import { requestAPI } from '../handler/handler';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';
import { toast } from 'react-toastify';
import { toastifyCustomStyle } from '../utils/utils';
import { Autocomplete, TextField } from '@mui/material';

function listNotebookScheduler({ app }: { app: JupyterFrontEnd }) {
  const [isLoading, setIsLoading] = useState(true);
  const [composerList, setComposerList] = useState<string[]>([]);
  const [composerSelected, setComposerSelected] = useState('composer4');
  const [dagList, setDagList]= useState<any[]>([]);
  const data = dagList;

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
      // listDagInfoAPI()
    }
  };

  const listComposersAPI = async () => {
    try {

      const formattedResponse: any = await requestAPI('composer');
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
      console.log(serviceURL)
      const formattedResponse: any = await requestAPI(serviceURL);  
      let transformDagListData = [];
      if (formattedResponse && formattedResponse.dags) {
        transformDagListData = formattedResponse.dags.map((dag:any) => {
         return {
            notebookname: dag.dag_id,
            inputfilesname:`bucket_name/dataproc_notebooks/${dag.dag_id}/input_notebook`,
            schedule: dag.timetable_description,
            status: dag.is_active ? 'Active' : 'Paused',
            // Add more properties based on your DAG data structure
          };
        });
      } 
      // const existingDagData = previousDagList ?? [];
      // const allDagData = [
      //   ...(existingDagData as []),
      //   ...transformDagListData
      // ];
  
      // if (formattedResponse.nextPageToken) {
      //   fetchDagAPI(formattedResponse.nextPageToken, allDagData);
      // } else {
      //   let transformDagListData = allDagData;
  
      //   const dagIdStructure = transformDagListData.map(
      //     (obj) => obj.dagId
      //   );
  
        setDagList(transformDagListData);
        setIsLoading(false);
      // }
  
      // if (formattedResponse?.error?.code) {
      //   toast.error(formattedResponse?.error?.message, toastifyCustomStyle);
      // }
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
    //state,
    //preGlobalFilteredRows,
    // setGlobalFilter,
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
    //useGlobalFilter,
    usePagination
  );

  const tableDataCondition = (cell: ICellProps) => {
    return (
      <td {...cell.getCellProps()} className="notebook-scheduler-table-data">
        {cell.render('Cell')}
      </td>
    );
  };
  useEffect(() => {
    //setComposerSelected('composer4')
    listComposersAPI();
    console.log('Composer selected on mount:', composerSelected)
  }, []);
  useEffect(() => {
    listDagInfoAPI();
    console.log("hiii ")
  }, [composerSelected]);
  return (
    <div>
        <div className="select-text-overlay-scheduler">
        <div className="create-scheduler-form-element">
          <Autocomplete
            options={composerList}
            value={composerSelected }//|| 'composer4'}
            onChange={(_event, val) =>{
              handleComposerSelected(val)
              //listDagInfoAPI()
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
        <div>
          {isLoading && (
            <div className="spin-loader-main">
              <ClipLoader
                color="#3367d6"
                loading={true}
                size={18}
                aria-label="Loading Spinner"
                data-testid="loader"
              />
              Loading Notebook Scheduler
            </div>
          )}
          {!isLoading && (
            <div className="no-data-style">  </div>
          )}
        </div>
      </div>
  );
}
export default listNotebookScheduler;
