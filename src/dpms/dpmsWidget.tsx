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
import { Database } from './databaseInfo';
import { MainAreaWidget } from '@jupyterlab/apputils';
import { v4 as uuidv4 } from 'uuid';
import 'semantic-ui-css/semantic.min.css';
import {
  BASE_URL,
  API_HEADER_CONTENT_TYPE,
  API_HEADER_BEARER
} from '../utils/const';
import { authApi } from '../utils/utils';
import { Table } from './tableInfo';
import { ClipLoader } from 'react-spinners';

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
  const [clusterValue, setClusterValue] = useState<string>('');
  const [dataprocMetastoreServices, setDataprocMetastoreServices] =
    useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [noCluster, setNoCluster] = useState(false);
  const [entries, setEntries] = useState<string[]>([]);
  const [columnResponse, setColumnResponse] = useState<string[]>([]);
  const [databaseDetails, setDatabaseDetails] = useState({});
  const [tableDescription, setTableDescription] = useState({});
  const getColumnDetails = async (name: string) => {
    console.log(name);
    const credentials = await authApi();
    if (credentials && clusterValue) {
      fetch(`https://datacatalog.googleapis.com/v1/${name}`, {
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
            .then(async (responseResult: any) => {
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
          console.error('Error listing clusters Details', err);
        });
    }
  };
  const getTableDetails = async (database: string) => {
    console.log(database);
    const credentials = await authApi();
    if (credentials && clusterValue) {
      const requestBody = {
        query: `system=dataproc_metastore AND type=TABLE parent=${credentials.project_id}.${credentials.region_id}.${dataprocMetastoreServices}.${database}`,
        scope: {
          includeProjectIds: [credentials.project_id]
        }
      };
      fetch('https://datacatalog.googleapis.com/v1/catalog:search', {
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
              console.log(responseResult);
              console.log(dataprocMetastoreServices);
              const filteredEntries = responseResult.results.filter(
                (entry: { displayName: string }) => entry.displayName !== 'def'
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
                  console.log(entry.displayName);
                  console.log(entry.relativeResourceName);
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
          console.error('Error listing clusters Details', err);
        });
    }
  };
  const database: { [dbName: string]: { [tableName: string]: string[] } } = {};
  console.log(columnResponse);
  columnResponse.forEach((res: any) => {
    const dbName = res.fullyQualifiedName.split('.').slice(-2, -1)[0];
    const tableName = res.displayName;
    const columns = res.schema.columns.map((column: any) => ({
      name: column.column,
      type: column.type.toUpperCase(),
      mode: column.mode,
      description: column?.description || 'None'
    }));

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
  console.log(data.length);
  console.log(data);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const searchMatch = (node: any | string, term: string) => {
    return node.data.name.toLowerCase().includes(term.toLowerCase());
  };

  const handleNodeClick = (node: any) => {
    // Open main area widget with selected node values
    const depth = calculateDepth(node);
    if (depth === 1) {
      console.log(dataprocMetastoreServices);
      console.log(databaseDetails);
      const content = new Database(
        node.data.name,
        dataprocMetastoreServices,
        databaseDetails
      );
      const widget = new MainAreaWidget<Database>({ content });
      const widgetId = `node-widget-${uuidv4()}`;
      widget.id = widgetId;
      widget.title.label = node.data.name;
      widget.title.closable = true;
      widget.title.icon = iconDatabaseWidget;

      // Add the widget to the main area
      app.shell.add(widget, 'main');
    } else if (depth === 2) {
      console.log(node);
      console.log(node.parent.data.name);
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

      // Add the widget to the main area
      app.shell.add(widget, 'main');
    }
  };
  const clearState = () => {
    setSearchTerm('');
    setClusterValue('');
    setDataprocMetastoreServices('');
    setIsLoading(true);
    setEntries([]);
    setColumnResponse([]);
    setDatabaseDetails({});
  };
  const handleRefreshClick = () => {
    // Call the getClusterDetails function to fetch updated data
    clearState();
    setIsLoading(true);
    getActiveNotebook();
  };

  type NodeProps = NodeRendererProps<any> & {
    onClick: (node: any) => void;
  };

  function Node({ node, style, dragHandle, onClick }: NodeProps) {
    const [expanded, setExpanded] = useState(false);

    const handleToggle = () => {
      setExpanded(!expanded);
    };
    const handleTextClick = (event: React.MouseEvent) => {
      // Prevent the event from propagating to the caret icon and node container
      event.stopPropagation();
      onClick(node); // Call the original onClick to open the main widget area
    };
    const renderNodeIcon = () => {
      const depth = calculateDepth(node);

      const hasChildren = node.children && node.children.length > 0;

      const arrowIcon = hasChildren ? (
        expanded ? (
          <>
            <div className="caret-icon" onClick={handleToggle}>
              <iconRightArrow.react tag="div" />
            </div>
          </>
        ) : (
          <div className="caret-icon" onClick={handleToggle}>
            <iconDownArrow.react tag="div" />
          </div>
        )
      ) : null;

      if (depth === 1) {
        return (
          <>
            {arrowIcon}
            <div>
              <iconDatabase.react tag="div" />
            </div>
          </>
        );
      } else if (depth === 2) {
        return (
          <>
            {arrowIcon}
            <iconTable.react tag="div" />
          </>
        );
      }

      return (
        <>
          {arrowIcon}
          <iconColumns.react tag="div" />
        </>
      );
    };

    return (
      <div
        style={style}
        ref={dragHandle}
        // onClick={event => {
        //   // Call node.toggle() only when clicked on the caret icon
        //   const targetElement = event.currentTarget as HTMLElement;
        //   if (targetElement.classList.contains('caret-icon')) {
        //     node.toggle();
        //   }
        // }}
        onClick={() => node.toggle()}
        // onMouseDown={() => onClick(node)}
      >
        {renderNodeIcon()}
        <div onClick={handleTextClick}>{node.data.name}</div>
      </div>
    );
  }
  const getDatabaseDetails = async () => {
    const credentials = await authApi();
    if (credentials && clusterValue) {
      const requestBody = {
        query: `system=dataproc_metastore AND type=DATABASE parent=${credentials.project_id}.${credentials.region_id}.${dataprocMetastoreServices}`,
        scope: {
          includeProjectIds: [credentials.project_id]
        }
      };
      fetch('https://datacatalog.googleapis.com/v1/catalog:search', {
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
              console.log(responseResult);
              console.log(dataprocMetastoreServices);
              const filteredEntries = responseResult.results.filter(
                (entry: { displayName: string }) => entry.displayName !== 'def'
              );
              const databaseNames: string[] = [];
              const updatedDatabaseDetails: { [key: string]: string } = {};
              filteredEntries.forEach(
                (entry: { description: string; displayName: string }) => {
                  console.log(entry.displayName);
                  databaseNames.push(entry.displayName);
                  const description = entry.description || 'None';
                  updatedDatabaseDetails[entry.displayName] = description;
                }
              );
              setDatabaseDetails(updatedDatabaseDetails);
              console.log(databaseDetails);
              console.log(databaseNames);
              // setDatabaseLength(databaseNames.length);
              databaseNames.map(async (db: string) => {
                // setDatabaseIteration(databaseIteration + 1);
                await getTableDetails(db);
              });
            })
            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          console.error('Error listing clusters Details', err);
        });
    }
  };
  const getClusterDetails = async () => {
    const credentials = await authApi();
    if (credentials && clusterValue) {
      fetch(
        `${BASE_URL}/projects/${credentials.project_id}/regions/${credentials.region_id}/clusters/${clusterValue}`,
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
              console.log(responseResult);
              const metastoreServices =
                responseResult.config?.metastoreConfig
                  ?.dataprocMetastoreService;
              console.log(metastoreServices);
              if (metastoreServices) {
                const lastIndex = metastoreServices.lastIndexOf('/');
                const instanceName =
                  lastIndex !== -1
                    ? metastoreServices.substring(lastIndex + 1)
                    : '';
                console.log(instanceName);
                setDataprocMetastoreServices(instanceName);
                console.log(dataprocMetastoreServices);
                setNoCluster(false);
              } else {
                setNoCluster(true);
              }
            })
            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          // setIsLoading(false);
          console.error('Error listing clusters Details', err);
          // toast.error('Failed to fetch Cluster Details');
        });
    }
  };
  const getActiveNotebook = () => {
    const clusterVal = localStorage.getItem('clusterValue');
    console.log(clusterVal);
    if (clusterVal) {
      setClusterValue(clusterVal);
      getClusterDetails();
    } else {
      setNoCluster(true);
      console.log('no value');
    }
  };
  useEffect(() => {
    getActiveNotebook();
    return () => {
      // Cleanup function to reset clusterValue when the component is unmounted
      setClusterValue('');
    };
  }, [clusterValue]);
  useEffect(() => {
    console.log('database use effect');
    getDatabaseDetails();
  }, [dataprocMetastoreServices]);
  useEffect(() => {
    console.log('table use effect');
    entries.forEach(async (entry: string) => {
      await getColumnDetails(entry);
    });
  }, [entries]);

  return (
    <>
      <div>
        <div className="dpms-title">Dataproc Metastore</div>
        <div className="refresh-icon" onClick={handleRefreshClick}>
          <iconRefresh.react tag="div" />
        </div>
      </div>
      {!noCluster ? (
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
                    />
                    <div className="search-icon">
                      <iconSearch.react tag="div" />
                    </div>
                  </div>
                </div>
                <div className="tree-container">
                  <Tree
                    data={data}
                    openByDefault={false}
                    width={600}
                    height={1000}
                    indent={24}
                    rowHeight={36}
                    overscanCount={1}
                    paddingTop={30}
                    paddingBottom={10}
                    padding={25}
                    searchTerm={searchTerm}
                    searchMatch={searchMatch}
                  >
                    {(props: NodeRendererProps<any>) => (
                      <Node {...props} onClick={handleNodeClick} />
                    )}
                  </Tree>
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="dpms-error">
          Please select cluster notebook attached to metastore and refresh
        </div>
      )}
    </>
  );
};

export class dpmsWidget extends ReactWidget {
  app: JupyterLab;

  constructor(app: JupyterLab) {
    super();
    this.app = app;
    this.addClass('jp-ReactWidget');
  }

  render(): JSX.Element {
    return <DpmsComponent app={this.app} />;
  }
}
