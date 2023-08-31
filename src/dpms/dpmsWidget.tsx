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

import { ReactWidget } from '@jupyterlab/apputils';
import { JupyterLab } from '@jupyterlab/application';
import React, { useEffect, useState } from 'react';
import { Tree, NodeRendererProps } from 'react-arborist';
import { LabIcon } from '@jupyterlab/ui-components';
import databaseIcon from '../../style/icons/database_icon.svg';
import tableIcon from '../../style/icons/table_icon.svg';
import columnsIcon from '../../style/icons/columns_icon.svg';
import refreshIcon from '../../style/icons/refresh_icon.svg';
import databaseWidgetIcon from '../../style/icons/database_widget_icon.svg';
import datasetsIcon from '../../style/icons/datasets_icon.svg';
import searchIcon from '../../style/icons/search_icon.svg';
import rightArrowIcon from '../../style/icons/right_arrow_icon.svg';
import downArrowIcon from '../../style/icons/down_arrow_icon.svg';
import searchClearIcon from '../../style/icons/search_clear_icon.svg';
import { Database } from './databaseInfo';
import { MainAreaWidget } from '@jupyterlab/apputils';
import { v4 as uuidv4 } from 'uuid';
import 'semantic-ui-css/semantic.min.css';
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
import { authApi } from '../utils/utils';
import { Table } from './tableInfo';
import { ClipLoader } from 'react-spinners';
import { ToastContainer, toast } from 'react-toastify';

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
const iconDatasets = new LabIcon({
  name: 'launcher:datasets-icon',
  svgstr: datasetsIcon
});
const iconDatabaseWidget = new LabIcon({
  name: 'launcher:databse-widget-icon',
  svgstr: databaseWidgetIcon
});
const iconRefresh = new LabIcon({
  name: 'launcher:refresh-icon',
  svgstr: refreshIcon
});
const iconSearch = new LabIcon({
  name: 'launcher:search-icon',
  svgstr: searchIcon
});
const iconRightArrow = new LabIcon({
  name: 'launcher:right-arrow-icon',
  svgstr: rightArrowIcon
});
const iconDownArrow = new LabIcon({
  name: 'launcher:down-arrow-icon',
  svgstr: downArrowIcon
});
const iconSearchClear = new LabIcon({
  name: 'launcher:search-clear-icon',
  svgstr: searchClearIcon
});

const calculateDepth = (node: any): number => {
  let depth = 0;
  let currentNode = node;
  while (currentNode.parent) {
    depth++;
    currentNode = currentNode.parent;
  }
  return depth;
};

const DpmsComponent = ({ app }: { app: JupyterLab }): JSX.Element => {
  const [searchTerm, setSearchTerm] = useState('');
  const [notebookValue, setNotebookValue] = useState<string>('');
  const [dataprocMetastoreServices, setDataprocMetastoreServices] =
    useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [noDpmsInstance, setNoDpmsInstance] = useState(false);
  const [session, setSession] = useState(false);
  const [cluster, setCluster] = useState(false);
  const [entries, setEntries] = useState<string[]>([]);
  const [columnResponse, setColumnResponse] = useState<string[]>([]);
  const [databaseDetails, setDatabaseDetails] = useState({});
  const [tableDescription, setTableDescription] = useState({});
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
            .then(async (responseResult: unknown) => {
              setColumnResponse((prevResponse: any) => [
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
          toast.error('Error getting column details');
        });
    }
  };
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
            .then((responseResult: any) => {
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
            })
            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          console.error('Error getting table details', err);
          toast.error('Error getting table details');
        });
    }
  };
  const database: { [dbName: string]: { [tableName: string]: string[] } } = {};
  columnResponse.forEach((res: any) => {
    /* fullyQualifiedName : dataproc_metastore:projectId.location.metastore_instance.database_name.table_name
fetching database name from fully qualified name structure */
    const dbName = res.fullyQualifiedName.split('.').slice(-2, -1)[0];
    const tableName = res.displayName;
    const columns = res.schema.columns.map(
      (column: {
        column: string;
        type: string;
        mode: string;
        description: string;
      }) => ({
        name: column.column,
        type: column.type.toUpperCase(),
        mode: column.mode,
        description: column?.description || 'None'
      })
    );

    if (!database[dbName]) {
      database[dbName] = {};
    }

    if (!database[dbName][tableName]) {
      database[dbName][tableName] = [];
    }

    database[dbName][tableName].push(...columns);
  });
  const data = Object.entries(database).map(([dbName, tables]) => ({
    id: uuidv4(),
    name: dbName,
    children: Object.entries(tables).map(([tableName, columns]) => ({
      id: uuidv4(),
      name: tableName,
      desciption: '',
      children: columns.map((column: any) => ({
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
  const openedWidgets: string[] = [];
  const handleNodeClick = (node: any) => {
    const depth = calculateDepth(node);
    const widgetTitle = node.data.name;
    if (!openedWidgets[widgetTitle]) {
      if (depth === 1) {
        const content = new Database(
          node.data.name,
          dataprocMetastoreServices,
          databaseDetails
        );
        const widget = new MainAreaWidget<Database>({ content });
        const widgetId = 'node-widget-db';
        widget.id = widgetId;
        widget.title.label = node.data.name;
        widget.title.closable = true;
        widget.title.icon = iconDatabaseWidget;
        app.shell.add(widget, 'main');
      } else if (depth === 2) {
        const database = node.parent.data.name;
        const column = node.data.children;
        const content = new Table(
          node.data.name,
          dataprocMetastoreServices,
          database,
          column,
          tableDescription
        );
        const widget = new MainAreaWidget<Table>({ content });
        const widgetId = `node-widget-${uuidv4()}`;
        widget.id = widgetId;
        widget.title.label = node.data.name;
        widget.title.closable = true;
        widget.title.icon = iconDatasets;
        app.shell.add(widget, 'main');
      }
      openedWidgets[widgetTitle] = node.data.name;
    }
  };
  const clearState = () => {
    setSearchTerm('');
    setNotebookValue('');
    setDataprocMetastoreServices('');
    setIsLoading(true);
    setEntries([]);
    setColumnResponse([]);
    setDatabaseDetails({});
  };
  const handleRefreshClick = () => {
    clearState();
    setIsLoading(true);
    getActiveNotebook();
  };
  const handleSearchClear = () => {
    setSearchTerm('');
  };
  type NodeProps = NodeRendererProps<any> & {
    onClick: (node: any) => void;
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
              <iconDownArrow.react tag="div" />
            </div>
          </>
        ) : (
          <div
            role="treeitem"
            className="caret-icon down"
            onClick={handleIconClick}
          >
            <iconRightArrow.react tag="div" />
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
                <iconDownArrow.react tag="div" />
              </div>
            </>
          ) : (
            <div
              role="treeitem"
              className="caret-icon down"
              onClick={handleIconClick}
            >
              <iconRightArrow.react tag="div" />
            </div>
          );
        if (depth === 1) {
          return (
            <>
              {arrowIcon}
              <div role="img" className="db-icon" onClick={handleIconClick}>
                <iconDatabase.react tag="div" />
              </div>
            </>
          );
        } else if (depth === 2) {
          return (
            <>
              {arrowIcon}
              <div role="img" className="table-icon" onClick={handleIconClick}>
                <iconTable.react tag="div" />
              </div>
            </>
          );
        }

        return (
          <>
            <iconColumns.react tag="div" />
          </>
        );
      }
      if (depth === 1) {
        return (
          <>
            {arrowIcon}
            <div role="img" className="db-icon" onClick={handleIconClick}>
              <iconDatabase.react tag="div" />
            </div>
          </>
        );
      } else if (depth === 2) {
        return (
          <>
            {arrowIcon}
            <div role="img" className="table-icon" onClick={handleIconClick}>
              <iconTable.react tag="div" />
            </div>
          </>
        );
      }

      return (
        <>
          <iconColumns.react tag="div" />
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
            .then(async (responseResult: any) => {
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
              databaseNames.map(async (db: string) => {
                await getTableDetails(db);
              });
            })
            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          console.error('Error getting database details', err);
          toast.error('Error getting database details');
        });
    }
  };
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
            .then(async (responseResult: any) => {
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
          toast.error('Failed to fetch session details');
        });
    }
  };
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
            .then(async (responseResult: any) => {
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
          toast.error('Failed to fetch cluster details');
        });
    }
  };
  const getActiveNotebook = () => {
    const notebookVal = localStorage.getItem('notebookValue');
    // notebookVal: clustername/cluster or sessionname/session getting only the cluster or session name
    if (notebookVal?.includes('/clusters')) {
      const clusterName = notebookVal.split('/')
      const clusterVal = clusterName.slice(0, -1).join('/')
      setNotebookValue(clusterVal);
      getClusterDetails();
    } else if(notebookVal?.includes('/sessions')){
      const sessionName = notebookVal.split('/')
      const sessionVal = sessionName.slice(0, -1).join('/')
      setNotebookValue(sessionVal);
      getSessionDetails();
    }
    else {
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
    entries.forEach(async (entry: string) => {
      await getColumnDetails(entry);
    });
  }, [entries]);
  return (
    <>
      <div>
        <div className="dpms-title">Metadata Explorer</div>
        <div
          role="button"
          aria-label="refresh"
          className="refresh-icon"
          data-tip="Refresh"
          onClick={handleRefreshClick}
        >
          <iconRefresh.react tag="div" />
        </div>
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
                <div className="ui category search">
                  <div className="ui icon input">
                    <input
                      className="search-field"
                      type="text"
                      value={searchTerm}
                      onChange={handleSearch}
                      placeholder="Search your DBs and tables"
                    />
                    <div className="search-icon">
                      <iconSearch.react tag="div" />
                    </div>
                    {searchTerm &&
                    <div
                      role="button"
                      className="search-clear-icon"
                      onClick={handleSearchClear}
                    >
                      <iconSearchClear.react tag="div" />
                    </div>
                    }
                  </div>
                </div>
                <div className="tree-container">
                  <Tree
                    className="Tree"
                    data={data}
                    openByDefault={false}
                    indent={24}
                    width={auto}
                    height={500}
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
                  <ToastContainer />
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        session ? (
        <div className="dpms-error">
          DPMS is not configured for this runtime template. Please attach DPMS or
          activate DPMS sync with data catalog
        </div>) : (cluster ? (<div className="dpms-error">
          DPMS is not configured for this cluster. Please attach DPMS or
          activate DPMS sync with data catalog
        </div>):(<div className="dpms-error">
        DPMS schema explorer not set up
        </div>))
      )}
    </>
  );
};

export class dpmsWidget extends ReactWidget {
  app: JupyterLab;

  constructor(app: JupyterLab) {
    super();
    this.app = app;
  }

  render(): JSX.Element {
    return <DpmsComponent app={this.app} />;
  }
}
