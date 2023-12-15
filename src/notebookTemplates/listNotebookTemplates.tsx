import React, { useEffect,useState } from 'react';
import { useTable, useGlobalFilter, usePagination } from 'react-table';
import { LabIcon } from '@jupyterlab/ui-components';
import filterIcon from '../../style/icons/filter_icon.svg';
import { ClipLoader } from 'react-spinners';
import GlobalFilter from '../utils/globalFilter';
import TableData from '../utils/tableData';
import { PaginationView } from '../utils/paginationView';
import { ICellProps, loggedFetch } from '../utils/utils';
import  TemplateData from './notebookTemplatesData.json';
import * as path from 'path';

function ListNotebookTemplates({app}: any) {
  
  const iconFilter = new LabIcon({
    name: 'launcher:filter-icon',
    svgstr: filterIcon
  });

  const downloadNotebook = async ( notebookContent: any,notebookUrl: string) =>
  {
     // Get the contents manager to save the file
     const contentsManager = app.serviceManager.contents;

     // Define the path to the 'notebookTemplateDownload' folder within the local application directory
     const notebookTemplateDownloadFolderPath = `${path.sep}notebookTemplateDownload`;

     try {
       // Check if the 'notebookTemplateDownload' folder exists
       await contentsManager.get(notebookTemplateDownloadFolderPath);
     } catch (error) {
       // The folder does not exist; create it
       await contentsManager.save(notebookTemplateDownloadFolderPath, {
         type: 'directory'
       });
     }

     // Replace 'path/to/save/file.txt' with the desired path and filename
     const urlParts = notebookUrl.split('/');
     const filePath = `.${notebookTemplateDownloadFolderPath}${path.sep}${urlParts[urlParts.length - 1]}`;

     // Save the file to the workspace
     await contentsManager.save(filePath, {
       type: 'file',
       format: 'text',
       content: JSON.stringify(notebookContent)
     });

     // Refresh the file browser to reflect the new file
     app.shell.currentWidget?.update();

     app.commands.execute('docmanager:open', {
       path: filePath
     });

  }

  const handleNameClick = async (template: any) => {
   console.log(template.url)
    const notebookUrl = template.url;
    loggedFetch(notebookUrl,
      {
        method: 'GET',
        headers:{
          Accept: 'application/vnd.github.raw'
        }
      }
    )
      .then((response: Response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch notebook content. Status: ${response.status}`);
        }
        return response.json(); 
      })
      .then((notebookContent: string) => {
        console.log(notebookContent);
        //downloadNotebook(notebookContent,notebookUrl)
        downloadNotebook(notebookContent,notebookUrl)
        // Process the notebook content as needed
      })
      .catch((err: Error) => {
        console.error('Error fetching notebook content', err);
      });
    
  };

  
  const [templateList, setTemplateList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const data = templateList;
  const columns = React.useMemo(
    () => [
      {
        Header: 'Name',
        accessor: 'name'
      },
      {
        Header: 'Category',
        accessor: 'category'
      },
      {
        Header: 'Description',
        accessor: 'description'
      }
    ],
    []
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    state,
    preGlobalFilteredRows,
    setGlobalFilter,
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
    useGlobalFilter,
    usePagination
  );

  const tableDataCondition = (cell: ICellProps) => {
    if (cell.column.Header === 'name') {
      return (
        <td
          role="button"
          {...cell.getCellProps()}
          className="notebook-template-name"
          onClick={() => handleNameClick(cell.row.original)}
        >
          {cell.value}
        </td>
      );
    } else {
      return (
        <td {...cell.getCellProps()} className="notebook-template-table-data">
          {cell.render('Cell')}
        </td>
      );
    }
  };


  const listTemplateAPI = async () => {
   try {
      setTemplateList(TemplateData);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsLoading(false);
    }
  };
  
useEffect(() => {
    listTemplateAPI();
  }, []);

  return (
    <div>
        <>
          {templateList.length > 0 ?( //change this 
             <div>
             <div className="filter-cluster-overlay">
               <div className="filter-cluster-icon">
                 <iconFilter.react
                   tag="div"
                   className="icon-white logo-alignment-style"
                 />
               </div>
               <div className="filter-cluster-text"></div>
               <div className="filter-cluster-section">
                 <GlobalFilter
                   preGlobalFilteredRows={preGlobalFilteredRows}
                   globalFilter={state.globalFilter}
                   setGlobalFilter={setGlobalFilter}
                  // setPollingDisable={setPollingDisable}
                 />
               </div>
             </div>
             <div className="clusters-list-table-parent"><TableData
                  getTableProps={getTableProps}
                  headerGroups={headerGroups}
                  getTableBodyProps={getTableBodyProps}
                  isLoading={isLoading}
                  rows={rows}
                  page={page}
                  prepareRow={prepareRow}
                  tableDataCondition={tableDataCondition}
                  fromPage="Templates"
                />
                {templateList.length > 50 && (
                  <PaginationView
                    pageSize={pageSize}
                    setPageSize={setPageSize}
                    pageIndex={pageIndex}
                    allData={templateList}
                    previousPage={previousPage}
                    nextPage={nextPage}
                    canPreviousPage={canPreviousPage}
                    canNextPage={canNextPage}
                  />
                )}
              </div>
            </div>
          ) : (
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
                  Loading Templates
                </div>
              )}
              {!isLoading && (
                <div className="no-data-style">No rows to display</div>
              )}
            </div>
          )}
        </>
    </div>
  );
}

export default ListNotebookTemplates;
