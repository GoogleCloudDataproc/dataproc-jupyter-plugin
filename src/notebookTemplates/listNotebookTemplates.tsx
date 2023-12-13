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

function ListNotebookTemplates({app}: any) {
  
  const iconFilter = new LabIcon({
    name: 'launcher:filter-icon',
    svgstr: filterIcon
  });
  
  const downloadNotebook = (content: any, filename: any) =>  {
    content=JSON.stringify(content);
    // Create a Blob from the notebook content
    const blob = new Blob([content], { type: 'application/json' });
  
    // Create a link element
    const link = document.createElement('a');
  
    // Set the href attribute of the link to a Blob URL
    link.href = URL.createObjectURL(blob);
  
    // Set the download attribute to specify the filename
    link.download = filename;
  
    // Append the link to the document
    document.body.appendChild(link);
  // Trigger a click event on the link to start the download
    link.click();
  
    // Remove the link from the document
    document.body.removeChild(link);
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
        console.log(response);
        return response.json(); // Use text() instead of json()
      })
      .then((notebookContent: string) => {
        console.log(notebookContent);
        downloadNotebook(notebookContent,'test-example.ipynb')
        // Process the notebook content as needed
      })
      .catch((err: Error) => {
        console.error('Error fetching notebook content', err);
      });
    
  
  //  loggedFetch(
  //       `https://raw.githubusercontent.com/GoogleCloudPlatform/dataproc-ml-quickstart-notebooks/main/regression/decision_tree_regression/housing_prices_prediction.ipynb`,
  //       {
  //         method: 'GET',
  //         headers: {
  //         Cookie:'_gh_sess=ufnp0O7Lum8Ka7bQFQr7aKYkPFtoWL7f8YJIb%2BO%2BL4XQSx%2BOoRwHfQTYWjWgFWkQ%2BBxhW8hucnDDMQ1kQiOiGqic84BCGIbnD7ByZ97JelbEl2U5kTUG%2Fx%2FckYOE6WD1c7s%2FUAw5pJXEglwcT0I0VnNx7nKiNRvMGEMIUiFVaKE8wU08PlFIuAZWYv%2FCAA8hHzkZvbVihfCVBRDtF9D3zmAoJPdSjrQ6Rb57BfwIGXD6EnuIho1SPNQr7%2FLHlbM4saX0AM78dm9ewE7xyaS8oA%3D%3D--Su3yrBaYU32IMnH%2B--BNHR%2FkQCZ541tpR3vIrW6g%3D%3D; _octo=GH1.1.1309758578.1702278645; logged_in=no'
  //         }
  //       }
  //     )
  //       .then((response: Response) => {
  //         response
  //           .text()
  //           // .then(async (responseResult: Response) => {
  //           //   console.log(responseResult);

  //           // })
  //           .catch((e: Error) => console.log(e));
  //       })
  //       .catch((err: Error) => {
  //         console.error('Error fetching notebook content', err);
  //       });
    await app.commands.execute('docmanager:open', {
      path: 'example.ipynb',
      factory: 'notebook'
    });
  };

  
  const [templateList, setTemplateList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const data = templateList;
  const columns = React.useMemo(
    () => [
      {
        Header: 'name',
        accessor: 'name'
      },
      {
        Header: 'category',
        accessor: 'category'
      },
      {
        Header: 'description',
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
          className="cluster-name"
          onClick={() => handleNameClick(cell.row.original)}
        >
          {cell.value}
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
              <div className="clusters-list-table-parent">
                <TableData
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
