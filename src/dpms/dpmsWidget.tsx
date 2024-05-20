/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { JupyterLab } from '@jupyterlab/application';
import React, { useEffect, useState } from 'react';
import { Tree, NodeRendererProps, NodeApi } from 'react-arborist';
import { LabIcon } from '@jupyterlab/ui-components';
import databaseIcon from '../../style/icons/database_icon.svg';
import tableIcon from '../../style/icons/table_icon.svg';
import columnsIcon from '../../style/icons/columns_icon.svg';
import databaseWidgetIcon from '../../style/icons/database_widget_icon.svg';
import datasetsIcon from '../../style/icons/datasets_icon.svg';
import searchIcon from '../../style/icons/search_icon.svg';
import rightArrowIcon from '../../style/icons/right_arrow_icon.svg';
import downArrowIcon from '../../style/icons/down_arrow_icon.svg';
import searchClearIcon from '../../style/icons/search_clear_icon.svg';
import { Database } from './databaseInfo';
import { MainAreaWidget } from '@jupyterlab/apputils';
import { v4 as uuidv4 } from 'uuid';
import { auto } from '@popperjs/core';
import { Table } from './tableInfo';
import { DataprocWidget } from '../controls/DataprocWidget';
import { IThemeManager } from '@jupyterlab/apputils';
import {
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField
} from '@mui/material';
import { TitleComponent } from '../controls/SidePanelTitleWidget';
import { DpmsService } from './dpmsService';

const iconDatasets = new LabIcon({
  name: 'launcher:datasets-icon',
  svgstr: datasetsIcon
});
const iconDatabaseWidget = new LabIcon({
  name: 'launcher:databse-widget-icon',
  svgstr: databaseWidgetIcon
});
const iconRightArrow = new LabIcon({
  name: 'launcher:right-arrow-icon',
  svgstr: rightArrowIcon
});
const iconDownArrow = new LabIcon({
  name: 'launcher:down-arrow-icon',
  svgstr: downArrowIcon
});
const calculateDepth = (node: NodeApi): number => {
  let depth = 0;
  let currentNode = node;
  while (currentNode.parent) {
    depth++;
    currentNode = currentNode.parent;
  }
  return depth;
};
const DpmsComponent = ({
  app,
  themeManager
}: {
  app: JupyterLab;
  themeManager: IThemeManager;
}): JSX.Element => {
  const iconSearchClear = new LabIcon({
    name: 'launcher:search-clear-icon',
    svgstr: searchClearIcon
  });
  const iconDatabase = new LabIcon({
    name: 'launcher:database-icon',
    svgstr: databaseIcon
  });
  const iconTable = new LabIcon({
    name: 'launcher:table-icon',
    svgstr: tableIcon
  });

  const iconColumns = new LabIcon({
    name: 'launcher:columns-icon',
    svgstr: columnsIcon
  });
  const iconSearch = new LabIcon({
    name: 'launcher:search-icon',
    svgstr: searchIcon
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [notebookValue, setNotebookValue] = useState<string>('');
  const [dataprocMetastoreServices, setDataprocMetastoreServices] =
    useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [noDpmsInstance, setNoDpmsInstance] = useState(false);
  const [session, setSession] = useState(false);
  const [cluster, setCluster] = useState(false);
  const [entries, setEntries] = useState<string[]>([]);
  const [databaseNames, setDatabaseNames] = useState<string[]>([]);
  const [apiError, setApiError] = useState(false);
  const [schemaError, setSchemaError] = useState(false);
  const [totalDatabases, setTotalDatabases] = useState<number>(0);
  const [totalTables, setTotalTables] = useState<number>(0);
  const [columnResponse, setColumnResponse] = useState<IColumn[]>([]);
  const [databaseDetails, setDatabaseDetails] = useState<
    Record<string, string>
  >({});
  const [tableDescription, setTableDescription] = useState<
    Record<string, string>
  >({});
  const [apiMessage, setApiMessage] = useState('');

  const getColumnDetails = async (name: string) => {
    await DpmsService.getColumnDetailsAPIService(
      name,
      notebookValue,
      setColumnResponse,
      setIsLoading,
      data
    );
  };

  const getTableDetails = async (database: string) => {
    await DpmsService.getTableDetailsAPIService(
      database,
      notebookValue,
      dataprocMetastoreServices,
      totalDatabases,
      setTotalTables,
      setTotalDatabases,
      setEntries,
      setTableDescription
    );
  };
  interface IColumn {
    name: string;
    schema: {
      columns: {
        column: string;
        type: string;
        mode: string;
        description: string;
      }[];
    };
    fullyQualifiedName: string;
    displayName: string;
    column: string;
    type: string;
    mode: string;
    description: string;
  }
  interface IDataEntry {
    id: string;
    name: string;
    type: string;
    description: string;
    children: any;
  }

  const databases: { [dbName: string]: { [tableName: string]: IColumn[] } } =
    {};

  columnResponse.forEach((res: IColumn) => {
    /* fullyQualifiedName : dataproc_metastore:projectId.location.metastore_instance.database_name.table_name
      fetching database name from fully qualified name structure */
    const dbName = res.fullyQualifiedName.split('.').slice(-2, -1)[0];
    const tableName = res.displayName;
    const columns: IColumn[] = res.schema.columns.map(
      (column: {
        column: string;
        type: string;
        mode: string;
        description: string;
      }) => ({
        name: `${column.column}`,
        schema: res.schema, // Include the schema object
        fullyQualifiedName: res.fullyQualifiedName,
        displayName: res.displayName,
        column: res.column, //no response
        type: column.type,
        mode: column.mode,
        description: res.description
      })
    );

    if (!databases[dbName]) {
      databases[dbName] = {};
    }

    if (!databases[dbName][tableName]) {
      databases[dbName][tableName] = [];
    }

    databases[dbName][tableName].push(...columns);
  });

  const data = Object.entries(databases).map(([dbName, tables]) => ({
    id: uuidv4(),
    name: dbName,
    children: Object.entries(tables).map(([tableName, columns]) => ({
      id: uuidv4(),
      name: tableName,
      description: '',
      children: columns.map((column: IColumn) => ({
        id: uuidv4(),
        name: column.name,
        type: column.type,
        mode: column.mode,
        description: column.description
      }))
    }))
  }));

  data.sort((a, b) => a.name.localeCompare(b.name));

  data.forEach(db => {
    db.children.sort((a, b) => a.name.localeCompare(b.name));
    db.children.forEach(table => {
      table.children.sort((a, b) => a.name.localeCompare(b.name));
    });
  });

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  const searchMatch = (node: { data: { name: string } }, term: string) => {
    return node.data.name.toLowerCase().includes(term.toLowerCase());
  };
  const openedWidgets: Record<string, boolean> = {};
  const handleNodeClick = (node: NodeApi) => {
    const depth = calculateDepth(node);
    const widgetTitle = node.data.name;
    if (!openedWidgets[widgetTitle]) {
      if (depth === 1) {
        const content = new Database(
          node.data.name,
          dataprocMetastoreServices,
          databaseDetails,
          themeManager
        );
        const widget = new MainAreaWidget<Database>({ content });
        const widgetId = 'node-widget-db';
        widget.id = widgetId;
        widget.title.label = node.data.name;
        widget.title.closable = true;
        widget.title.icon = iconDatabaseWidget;
        app.shell.add(widget, 'main');
        widget.disposed.connect(() => {
          const widgetTitle = widget.title.label;
          delete openedWidgets[widgetTitle];
        });
      } else if (depth === 2 && node.parent) {
        const database = node.parent.data.name;
        const column = node.data.children;

        const content = new Table(
          node.data.name,
          dataprocMetastoreServices,
          database,
          column,
          tableDescription,
          themeManager
        );
        const widget = new MainAreaWidget<Table>({ content });
        const widgetId = `node-widget-${uuidv4()}`;
        widget.id = widgetId;
        widget.title.label = node.data.name;
        widget.title.closable = true;
        widget.title.icon = iconDatasets;
        app.shell.add(widget, 'main');
        widget.disposed.connect(() => {
          const widgetTitle = widget.title.label;
          delete openedWidgets[widgetTitle];
        });
      }
      openedWidgets[widgetTitle] = node.data.name;
    }
  };
  const handleSearchClear = () => {
    setSearchTerm('');
  };
  type NodeProps = NodeRendererProps<IDataEntry> & {
    onClick: (node: NodeRendererProps<IDataEntry>['node']) => void;
  };
  const Node = ({ node, style, onClick }: NodeProps) => {
    const handleToggle = () => {
      node.toggle();
    };
    const handleIconClick = (event: React.MouseEvent) => {
      if (event.currentTarget.classList.contains('caret-icon')) {
        handleToggle();
      }
    };
    const handleTextClick = (event: React.MouseEvent) => {
      event.stopPropagation();
      onClick(node);
    };
    const renderNodeIcon = () => {
      const depth = calculateDepth(node);
      const hasChildren = node.children && node.children.length > 0;
      const arrowIcon = hasChildren ? (
        node.isOpen ? (
          <>
            <div
              role="treeitem"
              className="caret-icon right"
              onClick={handleIconClick}
            >
              <iconDownArrow.react
                tag="div"
                className="icon-white logo-alignment-style"
              />
            </div>
          </>
        ) : (
          <div
            role="treeitem"
            className="caret-icon down"
            onClick={handleIconClick}
          >
            <iconRightArrow.react
              tag="div"
              className="icon-white logo-alignment-style"
            />
          </div>
        )
      ) : null;
      if (searchTerm) {
        const arrowIcon = hasChildren ? (
          node.isOpen ? (
            <>
              <div
                role="treeitem"
                className="caret-icon right"
                onClick={handleIconClick}
              >
                <iconDownArrow.react
                  tag="div"
                  className="icon-white logo-alignment-style"
                />
              </div>
            </>
          ) : (
            <div
              role="treeitem"
              className="caret-icon down"
              onClick={handleIconClick}
            >
              <iconRightArrow.react
                tag="div"
                className="icon-white logo-alignment-style"
              />
            </div>
          )
        ) : null;
        if (depth === 1) {
          return (
            <>
              {arrowIcon}
              <div role="img" className="db-icon" onClick={handleIconClick}>
                <iconDatabase.react
                  tag="div"
                  className="icon-white logo-alignment-style"
                />
              </div>
            </>
          );
        } else if (depth === 2) {
          return (
            <>
              {arrowIcon}
              <div role="img" className="table-icon" onClick={handleIconClick}>
                <iconTable.react
                  tag="div"
                  className="icon-white logo-alignment-style"
                />
              </div>
            </>
          );
        }

        return (
          <>
            <iconColumns.react
              tag="div"
              className="icon-white logo-alignment-style"
            />
          </>
        );
      }
      if (depth === 1) {
        return (
          <>
            {arrowIcon}
            <div role="img" className="db-icon" onClick={handleIconClick}>
              <iconDatabase.react
                tag="div"
                className="icon-white logo-alignment-style"
              />
            </div>
          </>
        );
      } else if (depth === 2) {
        return (
          <>
            {arrowIcon}
            <div role="img" className="table-icon" onClick={handleIconClick}>
              <iconTable.react
                tag="div"
                className="icon-white logo-alignment-style"
              />
            </div>
          </>
        );
      }

      return (
        <>
          <iconColumns.react
            tag="div"
            className="icon-white logo-alignment-style"
          />
        </>
      );
    };

    return (
      <div style={style}>
        {renderNodeIcon()}
        <div
          role="treeitem"
          title={
            node.data.children && node.data.children.length > 0
              ? node.data.children[0]?.description
              : ''
          }
          onClick={handleTextClick}
        >
          {node.data.name}
        </div>
        <div className="dpms-column-type-text">{node.data.type}</div>
      </div>
    );
  };

  const getDatabaseDetails = async () => {
    await DpmsService.getDatabaseDetailsAPIService(
      notebookValue,
      dataprocMetastoreServices,
      setDatabaseDetails,
      setDatabaseNames,
      setTotalDatabases,
      setApiError,
      setSchemaError,
      setNoDpmsInstance,
      setIsLoading,
      setApiMessage
    );
  };

  const getClusterDetails = async () => {
    await DpmsService.getClusterDetailsAPIService(
      notebookValue,
      setIsLoading,
      setCluster,
      setNoDpmsInstance,
      setDataprocMetastoreServices
    );
  };

  const getSessionDetails = async () => {
    await DpmsService.getSessionDetailsAPIService(
      notebookValue,
      setIsLoading,
      setSession,
      setNoDpmsInstance,
      setDataprocMetastoreServices
    );
  };
  const getActiveNotebook = () => {
    const notebookVal = localStorage.getItem('notebookValue');
    // notebookVal: clustername/cluster or sessionname/session getting only the cluster or session name
    if (notebookVal?.includes('/clusters')) {
      const clusterName = notebookVal.split('/');
      const clusterVal = clusterName.slice(0, -1).join('/');
      setNotebookValue(clusterVal);
      getClusterDetails();
    } else if (notebookVal?.includes('/sessions')) {
      const sessionName = notebookVal.split('/');
      const sessionVal = sessionName.slice(0, -1).join('/');
      setNotebookValue(sessionVal);
      getSessionDetails();
    } else {
      setNoDpmsInstance(true);
    }
  };
  useEffect(() => {
    getActiveNotebook();
    return () => {
      setNotebookValue('');
    };
  }, [notebookValue]);
  useEffect(() => {
    getDatabaseDetails();
  }, [dataprocMetastoreServices]);

  useEffect(() => {
    Promise.all(databaseNames.map(db => getTableDetails(db)))
      .then(results => {})
      .catch(error => {
        console.log(error);
      });
  }, [databaseNames]);

  useEffect(() => {
    Promise.all(entries.map(entry => getColumnDetails(entry)))
      .then(results => {})
      .catch(error => {
        console.log(error);
      });
  }, [entries]);

  return (
    <div className="dpms-Wrapper">
      <TitleComponent titleStr="Dataset Explorer" isPreview />
      {!noDpmsInstance ? (
        <>
          <div>
            {isLoading ? (
              <div className="database-loader">
                <div>
                  <CircularProgress
                    className="spin-loader-custom-style"
                    size={20}
                    aria-label="Loading Spinner"
                    data-testid="loader"
                  />
                </div>
                Loading databases
              </div>
            ) : (
              <>
                <div className="search-field">
                  <TextField
                    placeholder="Search your DBs and tables"
                    type="text"
                    variant="outlined"
                    fullWidth
                    size="small"
                    onChange={handleSearch}
                    value={searchTerm}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <iconSearch.react
                            tag="div"
                            className="icon-white logo-alignment-style"
                          />
                        </InputAdornment>
                      ),
                      endAdornment: searchTerm && (
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleSearchClear}
                        >
                          <iconSearchClear.react
                            tag="div"
                            className="icon-white logo-alignment-style search-clear-icon"
                          />
                        </IconButton>
                      )
                    }}
                  />
                </div>
                <div className="tree-container">
                  {data.length === totalDatabases
                    ? data[totalDatabases - 1].children.length ===
                        totalTables && (
                        <Tree
                          className="database-tree"
                          initialData={data}
                          openByDefault={false}
                          indent={24}
                          width={auto}
                          height={675}
                          rowHeight={36}
                          overscanCount={1}
                          paddingTop={30}
                          paddingBottom={10}
                          padding={25}
                          searchTerm={searchTerm}
                          searchMatch={searchMatch}
                          idAccessor={node => node.id}
                        >
                          {(props: NodeRendererProps<any>) => (
                            <Node {...props} onClick={handleNodeClick} />
                          )}
                        </Tree>
                      )
                    : ''}
                </div>
              </>
            )}
          </div>
        </>
      ) : session ? (
        <div className="dpms-error">
          DPMS is not configured for this runtime template. Please attach DPMS
          or activate DPMS sync with data catalog
        </div>
      ) : cluster ? (
        <div className="dpms-error">
          DPMS is not configured for this cluster. Please attach DPMS or
          activate DPMS sync with data catalog
        </div>
      ) : apiError ? (
        <div className="dpms-error">{apiMessage}</div>
      ) : schemaError ? (
        <div className="dpms-error">No schema available</div>
      ) : (
        <div className="dpms-error">DPMS schema explorer not set up</div>
      )}
    </div>
  );
};

export class dpmsWidget extends DataprocWidget {
  app: JupyterLab;

  constructor(app: JupyterLab, themeManager: IThemeManager) {
    super(themeManager);
    this.app = app;
  }

  renderInternal(): JSX.Element {
    return <DpmsComponent app={this.app} themeManager={this.themeManager} />;
  }
}
