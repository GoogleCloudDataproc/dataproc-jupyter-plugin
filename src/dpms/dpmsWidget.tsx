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
import {
  BASE_URL,
  API_HEADER_CONTENT_TYPE,
  API_HEADER_BEARER,
  CATALOG_SEARCH,
  COLUMN_API,
  QUERY_DATABASE,
  QUERY_TABLE
} from '../utils/const';
import { authApi, toastifyCustomStyle } from '../utils/utils';
import { Table } from './tableInfo';
import { ClipLoader } from 'react-spinners';
import { toast } from 'react-toastify';
import { DataprocWidget } from '../controls/DataprocWidget';
import { IThemeManager } from '@jupyterlab/apputils';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import darkSearchClearIcon from '../../style/icons/dark_search_clear_icon.svg';
import darkDatabaseIcon from '../../style/icons/database_icon_dark.svg';
import darkTableIcon from '../../style/icons/table_icon_dark.svg';
import darkColumnsIcon from '../../style/icons/dpms_icon_dark.svg';
import darkSearchIcon from '../../style/icons/search_icon_dark.svg';

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
const darkIconSearchClear = new LabIcon({
  name: 'launcher:dark-search-clear-icon',
  svgstr: darkSearchClearIcon
});
const darkIconDatabase = new LabIcon({
  name: 'launcher:dark-database-icon',
  svgstr: darkDatabaseIcon
});

const darkIconTable = new LabIcon({
  name: 'launcher:dark-table-icon',
  svgstr: darkTableIcon
});

const darkIconColumns = new LabIcon({
  name: 'launcher:dark-columns-icon',
  svgstr: darkColumnsIcon
});
const darkIconSearch = new LabIcon({
  name: 'launcher:dark-search-icon',
  svgstr: darkSearchIcon
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
  const isDarkTheme = !themeManager.isLight(themeManager.theme!);
  const iconSearchClear = isDarkTheme ? darkIconSearchClear : new LabIcon({
    name: 'launcher:search-clear-icon',
    svgstr: searchClearIcon
  });
  const iconDatabase = isDarkTheme ? darkIconDatabase : new LabIcon({
    name: 'launcher:database-icon',
    svgstr: databaseIcon
  });

  const iconTable = isDarkTheme ? darkIconTable : new LabIcon({
    name: 'launcher:table-icon',
    svgstr: tableIcon
  });

  const iconColumns = isDarkTheme ? darkIconColumns : new LabIcon({
    name: 'launcher:columns-icon',
    svgstr: columnsIcon
  });
  const iconSearch = isDarkTheme ? darkIconSearch : new LabIcon({
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

  const getColumnDetails = async (name: string) => {
    const credentials = await authApi();
    if (credentials && notebookValue) {
      fetch(`${COLUMN_API}${name}`, {
        method: 'GET',
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token,
          'X-Goog-User-Project': credentials.project_id || ''
        }
      })
        .then((response: Response) => {
          response
            .json()
            .then(async (responseResult: IColumn) => {
              setColumnResponse((prevResponse: IColumn[]) => [
                ...prevResponse,
                responseResult
              ]);
              if (data) {
                setIsLoading(false);
              }
            })
            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          console.error('Error getting column details', err);
          toast.error('Error getting column details', toastifyCustomStyle);
        });
    }
  };
  interface ITableResponse {
    results: Array<{
      displayName: string;
      relativeResourceName: string;
      description: string;
    }>;
  }
  const getTableDetails = async (database: string) => {
    const credentials = await authApi();
    if (credentials && notebookValue) {
      const requestBody = {
        query: `${QUERY_TABLE}${credentials.project_id}.${credentials.region_id}.${dataprocMetastoreServices}.${database}`,
        scope: {
          includeProjectIds: [credentials.project_id]
        }
      };
      fetch(`${CATALOG_SEARCH}`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token,
          'X-Goog-User-Project': credentials.project_id || ''
        }
      })
        .then((response: Response) => {
          response
            .json()
            .then((responseResult: ITableResponse) => {
              const filteredEntries = responseResult.results.filter(
                (entry: { displayName: string }) => entry.displayName
              );
              const tableNames: string[] = [];
              const entryNames: string[] = [];
              const updatedTableDetails: { [key: string]: string } = {};
              filteredEntries.forEach(
                (entry: {
                  displayName: string;
                  relativeResourceName: string;
                  description: string;
                }) => {
                  tableNames.push(entry.displayName);
                  entryNames.push(entry.relativeResourceName);
                  const description = entry.description || 'None';
                  updatedTableDetails[entry.displayName] = description;
                }
              );
              setEntries(entryNames);
              setTableDescription(updatedTableDetails);
              setTotalTables(tableNames.length);
            })
            .catch((e: Error) => {
              console.log(e);
              if (totalDatabases !== undefined) {
                setTotalDatabases(totalDatabases - 1 || 0);
              }
            });
        })
        .catch((err: Error) => {
          console.error('Error getting table details', err);
          toast.error('Error getting table details', toastifyCustomStyle);
        });
    }
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
    description: string;
    children: Table[];
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
        name: column.column,
        schema: res.schema, // Include the schema object
        fullyQualifiedName: res.fullyQualifiedName,
        displayName: res.displayName,
        column: res.column,
        type: res.type,
        mode: res.mode,
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
      desciption: '',
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
              <iconDownArrow.react tag="div" className="logo-alignment-style" />
            </div>
          </>
        ) : (
          <div
            role="treeitem"
            className="caret-icon down"
            onClick={handleIconClick}
          >
            <iconRightArrow.react tag="div" className="logo-alignment-style" />
          </div>
        )
      ) : null;
      if (searchTerm) {
        const arrowIcon =
          hasChildren && node.isOpen ? (
            <>
              <div
                role="treeitem"
                className="caret-icon right"
                onClick={handleIconClick}
              >
                <iconDownArrow.react
                  tag="div"
                  className="logo-alignment-style"
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
                className="logo-alignment-style"
              />
            </div>
          );
        if (depth === 1) {
          return (
            <>
              {arrowIcon}
              <div role="img" className="db-icon" onClick={handleIconClick}>
                <iconDatabase.react
                  tag="div"
                  className="logo-alignment-style"
                />
              </div>
            </>
          );
        } else if (depth === 2) {
          return (
            <>
              {arrowIcon}
              <div role="img" className="table-icon" onClick={handleIconClick}>
                <iconTable.react tag="div" className="logo-alignment-style" />
              </div>
            </>
          );
        }

        return (
          <>
            <iconColumns.react tag="div" className="logo-alignment-style" />
          </>
        );
      }
      if (depth === 1) {
        return (
          <>
            {arrowIcon}
            <div role="img" className="db-icon" onClick={handleIconClick}>
              <iconDatabase.react tag="div" className="logo-alignment-style" />
            </div>
          </>
        );
      } else if (depth === 2) {
        return (
          <>
            {arrowIcon}
            <div role="img" className="table-icon" onClick={handleIconClick}>
              <iconTable.react tag="div" className="logo-alignment-style" />
            </div>
          </>
        );
      }

      return (
        <>
          <iconColumns.react tag="div" className="logo-alignment-style" />
        </>
      );
    };

    return (
      <div style={style}>
        {renderNodeIcon()}
        <div role="treeitem" onClick={handleTextClick}>
          {node.data.name}
        </div>
      </div>
    );
  };
  interface IDatabaseResponse {
    results?: Array<{
      displayName: string;
      description: string;
    }>;
    error?: {
      code: string;
    };
  }
  const getDatabaseDetails = async () => {
    const credentials = await authApi();
    if (credentials && notebookValue) {
      const requestBody = {
        query: `${QUERY_DATABASE}${credentials.project_id}.${credentials.region_id}.${dataprocMetastoreServices}`,
        scope: {
          includeProjectIds: [credentials.project_id]
        }
      };
      fetch(`${CATALOG_SEARCH}`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token,
          'X-Goog-User-Project': credentials.project_id || ''
        }
      })
        .then((response: Response) => {
          response
            .json()
            .then(async (responseResult: IDatabaseResponse) => {
              if (responseResult?.results) {
                const filteredEntries = responseResult.results.filter(
                  (entry: { displayName: string }) => entry.displayName
                );
                const databaseNames: string[] = [];
                const updatedDatabaseDetails: { [key: string]: string } = {};
                filteredEntries.forEach(
                  (entry: { description: string; displayName: string }) => {
                    databaseNames.push(entry.displayName);
                    const description = entry.description || 'None';
                    updatedDatabaseDetails[entry.displayName] = description;
                  }
                );
                setDatabaseDetails(updatedDatabaseDetails);
                setDatabaseNames(databaseNames);
                setTotalDatabases(databaseNames.length);
                setApiError(false);
                setSchemaError(false);
              } else {
                if (responseResult?.error?.code) {
                  setApiError(true);
                  setSchemaError(false);
                } else {
                  setSchemaError(true);
                  setApiError(false);
                }
                setNoDpmsInstance(true);
                setIsLoading(false);
              }
            })
            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          console.error('Error getting database details', err);
          toast.error('Error getting database details', toastifyCustomStyle);
        });
    }
  };
  interface IClusterDetailsResponse {
    config?: {
      metastoreConfig?: {
        dataprocMetastoreService?: string;
      };
    };
  }
  const getClusterDetails = async () => {
    const credentials = await authApi();
    if (credentials && notebookValue) {
      fetch(
        `${BASE_URL}/projects/${credentials.project_id}/regions/${credentials.region_id}/clusters/${notebookValue}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      )
        .then((response: Response) => {
          response
            .json()
            .then(async (responseResult: IClusterDetailsResponse) => {
              const metastoreServices =
                responseResult.config?.metastoreConfig
                  ?.dataprocMetastoreService;
              if (metastoreServices) {
                const lastIndex = metastoreServices.lastIndexOf('/');
                const instanceName =
                  lastIndex !== -1
                    ? metastoreServices.substring(lastIndex + 1)
                    : '';
                setDataprocMetastoreServices(instanceName);
                setNoDpmsInstance(false);
                setCluster(false);
              } else {
                setNoDpmsInstance(true);
                setCluster(true);
              }
            })
            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          setIsLoading(false);
          console.error('Error listing session details', err);
          toast.error('Failed to fetch session details'), toastifyCustomStyle;
        });
    }
  };
  interface ISessionDetailsResponse {
    environmentConfig?: {
      peripheralsConfig?: {
        metastoreService?: string;
      };
    };
  }

  const getSessionDetails = async () => {
    const credentials = await authApi();
    if (credentials && notebookValue) {
      fetch(
        `${BASE_URL}/projects/${credentials.project_id}/locations/${credentials.region_id}/sessionTemplates/${notebookValue}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      )
        .then((response: Response) => {
          response
            .json()
            .then(async (responseResult: ISessionDetailsResponse) => {
              const metastoreServices =
                responseResult.environmentConfig?.peripheralsConfig
                  ?.metastoreService;
              if (metastoreServices) {
                const lastIndex = metastoreServices.lastIndexOf('/');
                const instanceName =
                  lastIndex !== -1
                    ? metastoreServices.substring(lastIndex + 1)
                    : '';
                setDataprocMetastoreServices(instanceName);
                setNoDpmsInstance(false);
                setSession(false);
              } else {
                setNoDpmsInstance(true);
                setSession(true);
              }
            })
            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          setIsLoading(false);
          console.error('Error listing clusters details', err);
          toast.error('Failed to fetch cluster details', toastifyCustomStyle);
        });
    }
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
      <div>
        <div className="dpms-title">Metadata Explorer</div>
      </div>
      {!noDpmsInstance ? (
        <>
          <div>
            {isLoading ? (
              <div className="database-loader">
                <div>
                  <ClipLoader
                    color="#8A8A8A"
                    loading={true}
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
                            className="logo-alignment-style"
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
                            className="logo-alignment-style search-clear-icon"
                          />
                        </IconButton>
                      )
                    }}
                  />
                </div>
                <div className="tree-container">
                  {data[totalDatabases - 1].children.length === totalTables && (
                    <Tree
                      className="Tree"
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
                  )}
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
        <div className="dpms-error">Datacatalog API is not enabled</div>
      ) : schemaError ? (
        <div className="dpms-error">No schema available</div>
      ) : (
        <div className="dpms-error">DPMS schema explorer not set up</div>
      )}
    </div>
  );
};

export class dpmsWidget extends DataprocWidget {
  constructor(private app: JupyterLab, themeManager: IThemeManager) {
    super(themeManager);
  }

  renderInternal(): JSX.Element {
    return <DpmsComponent app={this.app} themeManager={this.themeManager} />;
  }
}
