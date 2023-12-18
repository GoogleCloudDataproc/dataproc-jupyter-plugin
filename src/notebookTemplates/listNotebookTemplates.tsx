import React, { useEffect, useState } from 'react';
import { useTable, useGlobalFilter, usePagination } from 'react-table';
import { LabIcon } from '@jupyterlab/ui-components';
import filterIcon from '../../style/icons/filter_icon.svg';
import { ClipLoader } from 'react-spinners';
import GlobalFilter from '../utils/globalFilter';
import TableData from '../utils/tableData';
import { PaginationView } from '../utils/paginationView';
import { ICellProps, loggedFetch } from '../utils/utils';
import * as path from 'path';
import { NOTEBOOK_TEMPLATES_LIST_URL } from '../utils/const';

function ListNotebookTemplates({ app }: any) {
  const iconFilter = new LabIcon({
    name: 'launcher:filter-icon',
    svgstr: filterIcon
  });

  const [templateList, setTemplateList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const data = templateList;
  const columns = React.useMemo(
    () => [
      {
        Header: 'Category',
        accessor: 'category'
      },
      {
        Header: 'Name',
        accessor: 'name'
      },
      {
        Header: 'Description',
        accessor: 'description'
      },
      {
        Header: '',
        accessor: 'actions'
      }
    ],
    []
  );

  const downloadNotebook = async (
    notebookContent: any,
    notebookUrl: string
  ) => {
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

    const urlParts = notebookUrl.split('/');
    const filePath = `.${notebookTemplateDownloadFolderPath}${path.sep}${
      urlParts[urlParts.length - 1]
    }`;

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
  };

  const handleNameClick = async (template: any) => {
    const notebookUrl = template.url;
    loggedFetch(notebookUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github.raw'
      }
    })
      .then((response: Response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to fetch notebook content. Status: ${response.status}`
          );
        }
        return response.json();
      })
      .then((notebookContent: string) => {
        downloadNotebook(notebookContent, notebookUrl);
      })
      .catch((err: Error) => {
        console.error('Error fetching notebook content', err);
      });
  };

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
    return (
      <td {...cell.getCellProps()} className="notebook-template-table-data">
        {cell.render('Cell')}
      </td>
    );
  };

  const listTemplateAPI = async () => {
    loggedFetch(NOTEBOOK_TEMPLATES_LIST_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github.raw'
      }
    })
      .then((response: Response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to fetch notebook content. Status: ${response.status}`
          );
        }
        return response.json();
      })
      .then((responseData: any) => {
        let transformNotebookData = responseData.map((data: any) => {
          return {
            name: data.title,
            category: data.category,
            description: data.description,
            actions: renderActions(data)
          };
        });
        setTemplateList(transformNotebookData);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        console.error('Error fetching data:', err);
        setIsLoading(false);
      });
  };

  const renderActions = (data: any) => {
    return (
      <div
        className="use-template-style"
        role="button"
        aria-label="Use notebook template"
        title="Use notebook template"
        onClick={() => handleNameClick(data)}
      >
        Use this template
      </div>
    );
  };

  useEffect(() => {
    listTemplateAPI();
  }, []);

  return (
    <div>
      <>
        {templateList.length > 0 ? (
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
                  fromPage="notebook-templates"
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
                Loading Notebook Templates
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
