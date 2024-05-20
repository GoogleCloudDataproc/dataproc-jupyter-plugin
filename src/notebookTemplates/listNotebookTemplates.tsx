import React, { useEffect, useState } from 'react';
import { useTable, useGlobalFilter, usePagination } from 'react-table';
import { LabIcon } from '@jupyterlab/ui-components';
import filterIcon from '../../style/icons/filter_icon.svg';
import GlobalFilter from '../utils/globalFilter';
import TableData from '../utils/tableData';
import { PaginationView } from '../utils/paginationView';
import { ICellProps } from '../utils/utils';
import * as path from 'path';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { IThemeManager } from '@jupyterlab/apputils';
import NotebookTemplateService from './notebookTemplatesService';
import { CircularProgress } from '@mui/material';

function ListNotebookTemplates({
  app,
  themeManager,
  factory
}: {
  app: JupyterFrontEnd;
  themeManager: IThemeManager;
  factory: IFileBrowserFactory;
}) {
  const iconFilter = new LabIcon({
    name: 'launcher:filter-icon',
    svgstr: filterIcon
  });

  interface ITemplateList {
    category: string;
    title: string;
    description: string;
    actions: React.JSX.Element;
  }
  interface INotebookTemplate {
    category: string;
    created_at: string;
    description: string;
    sub_category: string;
    title: string;
    url: string;
  }

  const [templateList, setTemplateList] = useState<ITemplateList[]>([]);
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
    notebookContent: object,
    notebookUrl: string
  ) => {
    const contentsManager = app.serviceManager.contents;
    const { tracker } = factory;
    // Get the current active widget in the file browser
    const widget = tracker.currentWidget;
    if (!widget) {
      console.error('No active file browser widget found.');
      return;
    }

    // Define the path to the 'notebookTemplateDownload' folder within the local application directory
    const notebookTemplateDownloadFolderPath = widget.model.path.includes('gs:')
      ? ''
      : widget.model.path;

    const urlParts = notebookUrl.split('/');
    const filePath = `${notebookTemplateDownloadFolderPath}${path.sep}${
      urlParts[urlParts.length - 1]
    }`;

    // Save the file to the workspace
    await contentsManager.save(filePath, {
      type: 'file',
      format: 'text',
      content: JSON.stringify(notebookContent)
    });

    // Refresh the file fileBrowser to reflect the new file
    app.shell.currentWidget?.update();

    app.commands.execute('docmanager:open', {
      path: filePath
    });
  };

  const handleClick = async (template: INotebookTemplate) => {
    await NotebookTemplateService.handleClickService(
      template,
      downloadNotebook
    );
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
    await NotebookTemplateService.listNotebookTemplateAPIService(
      setTemplateList,
      renderActions,
      setIsLoading
    );
  };

  const renderActions = (data: any) => {
    return (
      <div
        className="use-template-style"
        role="button"
        aria-label="Use notebook template"
        title="Use notebook template"
        onClick={() => handleClick(data)}
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
                <CircularProgress
                  className = "spin-loader-custom-style"
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
