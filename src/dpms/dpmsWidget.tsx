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
// import { Widget } from '@lumino/widgets';
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
  // const [databases, setDatabases] = useState<string[]>([]);
  // const [tables, setTables] = useState<string[]>([]);
  const [entries, setEntries] = useState<string[]>([]);
  // const [columns, setColumns] = useState<string[]>([]);
  const [columnResponse, setColumnResponse] = useState<string[]>([]);
  const [databaseLength, setDatabaseLength] = useState(Number);
  const [databaseIteration, setDatabaseIteration] = useState(0);
  const [tableLength, setTableLength] = useState(Number);
  const [tableIteration, setTableIteration] = useState(0);
  // console.log(databases);
  // const data = [
  //   {
  //     id: '3',
  //     name: 'Database 1',
  //     children: [
  //       { id: 'c1', name: 'Table1', children: [{ id: 'e1', name: 'column1' }] },
  //       { id: 'c2', name: 'Table2', children: [{ id: 'e2', name: 'column2' }] },
  //       { id: 'c3', name: 'Table3', children: [{ id: 'e3', name: 'column3' }] }
  //     ]
  //   },
  //   {
  //     id: '4',
  //     name: 'Database 2',
  //     children: [
  //       { id: 'd1', name: 'Table1', children: [{ id: 'f1', name: 'column1' }] },
  //       { id: 'd2', name: 'Table2', children: [{ id: 'f2', name: 'column2' }] },
  //       { id: 'd3', name: 'Table3', children: [{ id: 'f3', name: 'column3' }] }
  //     ]
  //   }
  // ];

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
              // console.log(responseResult);

              // const columns = responseResult.schema.columns.map(
              //   (column: { column: string }) => column.column
              // );
              // console.log(columns);
              // setColumns(columns);
              setColumnResponse((prevResponse: any) => [
                ...prevResponse,
                responseResult
              ]);
              // if (data) {
              //   setIsLoading(false);
              // }
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
              // Extract and display the displayName of each entry
              filteredEntries.forEach(
                (entry: {
                  displayName: string;
                  relativeResourceName: string;
                }) => {
                  console.log(entry.displayName);
                  console.log(entry.relativeResourceName);
                  tableNames.push(entry.displayName);
                  entryNames.push(entry.relativeResourceName);
                  // Display or do something with entry.displayName
                }
              );
              // setTables(tableNames);
              setEntries(entryNames);
              // console.log(tables);
              console.log(entryNames.length);
              setTableLength(entryNames.length);
              // let count = 0;
              // entries.map(async (entry: string) => {
              //   count++;
              //   console.log(count);
              //   setTableIteration(count);
              //   await getColumnDetails(entry);
              // });

              // await Promise.all(promises);
              // for (const entry of entries) {
              //   await getColumnDetails(entry);
              // }
              // if (data) {
              //   setIsLoading(false);
              // }
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
  // const dataLoading = () => {
  //   setIsLoading(false);
  // };
  // const [data, setData] = useState<
  //   {
  //     id: string;
  //     name: string;
  //     children: {
  //       id: string;
  //       name: string;
  //       children: { id: string; name: string }[];
  //     }[];
  //   }[]
  // >([]);
  // const data = databases.map((db: string) => {
  //   const dbName = db;
  //   // const tables = ['table1', 'table2'];
  //   const tableData = tables.map((table: string) => {
  //     const tableName = table;
  //     // const columns = ['column1', 'column2'];
  //     // getColumnDetails(table);
  //     const columnData = columns.map((column: string) => ({
  //       id: uuidv4(),
  //       name: column
  //     }));

  //     return {
  //       id: uuidv4(),
  //       name: tableName,
  //       children: columnData
  //     };
  //   });

  //   return {
  //     id: uuidv4(),
  //     name: dbName,
  //     children: tableData
  //   };
  // });
  // const data = columnResponse.map((res: any) => {
  //   console.log(databases, columns);
  //   const dbName = res.fullyQualifiedName.split('.').slice(-2, -1)[0];
  //   const tableName = res.fullyQualifiedName.split('.').slice(-1)[0];
  //   const columnData = res.schema.columns.map((column: { column: string }) => ({
  //     id: uuidv4(),
  //     name: column.column
  //   }));

  //   return {
  //     id: uuidv4(),
  //     name: dbName,
  //     children: [
  //       {
  //         id: uuidv4(),
  //         name: tableName,
  //         children: columnData
  //       }
  //     ]
  //   };
  // });
  const database: { [dbName: string]: { [tableName: string]: string[] } } = {};

  columnResponse.forEach((res: any) => {
    const dbName = res.fullyQualifiedName.split('.').slice(-2, -1)[0];
    const tableName = res.displayName;
    const columnName = res.schema.columns.map(
      (column: { column: string }) => column.column
    );

    if (!database[dbName]) {
      database[dbName] = {};
    }

    if (!database[dbName][tableName]) {
      database[dbName][tableName] = [];
    }

    database[dbName][tableName].push(...columnName);
  });

  const data = Object.entries(database).map(([dbName, tables]) => ({
    id: uuidv4(),
    name: dbName,
    children: Object.entries(tables).map(([tableName, columns]) => ({
      id: uuidv4(),
      name: tableName,
      children: columns.map((columnName: string) => ({
        id: uuidv4(),
        name: columnName
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
      const content = new Database(node.data.name);
      const widget = new MainAreaWidget<Database>({ content });
      const widgetId = `node-widget-${uuidv4()}`;
      widget.id = widgetId;
      // widget.node.innerHTML = node.data.name;
      widget.title.label = node.data.name;
      widget.title.closable = true;
      widget.title.icon = iconDatabaseWidget;

      // Add the widget to the main area
      app.shell.add(widget, 'main');
    } else if (depth === 2) {
      const content = new Table(node.data.name);
      const widget = new MainAreaWidget<Table>({ content });
      const widgetId = `node-widget-${uuidv4()}`;
      widget.id = widgetId;
      // widget.node.innerHTML = node.data.name;
      widget.title.label = node.data.name;
      widget.title.closable = true;
      widget.title.icon = iconDatasets;

      // Add the widget to the main area
      app.shell.add(widget, 'main');
    }
  };
  const handleRefreshClick = () => {
    // Call the getClusterDetails function to fetch updated data
    getClusterDetails();
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
            <div onClick={handleToggle}>
              <iconRightArrow.react tag="div" />
            </div>
            {/* <i className="caret right icon large" onClick={handleToggle}></i> */}
          </>
        ) : (
          <div onClick={handleToggle}>
            <iconDownArrow.react tag="div" />
          </div>
          // <i className="caret down icon large" onClick={handleToggle}></i>
        )
      ) : null;

      if (depth === 1) {
        return (
          <>
            {arrowIcon}
            <iconDatabase.react tag="div" />
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
                (entry: { displayName: string }) =>
                  entry.displayName !== 'default'
              );
              const databaseNames: string[] = [];
              // Extract and display the displayName of each entry
              filteredEntries.forEach((entry: { displayName: string }) => {
                console.log(entry.displayName);
                databaseNames.push(entry.displayName);
                // Display or do something with entry.displayName
              });
              // setDatabases(databaseNames);
              console.log(databaseNames);
              setDatabaseLength(databaseNames.length);
              databaseNames.map(async (db: string) => {
                setDatabaseIteration(databaseIteration + 1);
                await getTableDetails(db);
              });
              // await Promise.all(promises);
              // for (const db of databaseNames) {
              //   await getTableDetails(db);
              // }
              // console.log('loading false');
              // setIsLoading(false);
              // if (data.length !== 0) {
              //   console.log('loading false');
              //   setIsLoading(false);
              // }
            })
            .catch((e: Error) => {
              console.log(e);
            });
        })
        .catch((err: Error) => {
          console.error('Error listing clusters Details', err);
        });
    }
    // console.log(dataprocMetastoreServices);
    // const inputArray = [
    //   'dataproc_metastore:acn-ytmusicsonos.us-central1.service-metastore.default'
    // ];
    // const valuesAfterLastDot = inputArray.map(inputString => {
    //   const parts = inputString.split('.');
    //   return parts[parts.length - 1];
    // });
    // setDatabases(valuesAfterLastDot);
    // console.log(valuesAfterLastDot); // Output: "default"
    // if (data) {
    //   setIsLoading(false);
    // }
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
              // let transformClusterListData = [];

              const metastoreServices =
                responseResult.config?.metastoreConfig
                  ?.dataprocMetastoreService;
              // const metastoreServices =
              // 'projects/acn-ytmusicsonos/locations/us-central1/services/service-metastore';
              console.log(metastoreServices);
              const lastIndex = metastoreServices.lastIndexOf('/');
              const instanceName =
                lastIndex !== -1
                  ? metastoreServices.substring(lastIndex + 1)
                  : '';
              console.log(instanceName);
              setDataprocMetastoreServices(instanceName);
              console.log(dataprocMetastoreServices);
              // getDatabaseDetails();
              // if(data){
              //   setIsLoading(false);
              // }
            })
            .catch((e: Error) => {
              console.log(e);
              // setIsLoading(false);
            });
        })
        .catch((err: Error) => {
          // setIsLoading(false);
          console.error('Error listing clusters Details', err);
          // toast.error('Failed to fetch Cluster Details');
        });
    }
  };
  useEffect(() => {
    const clusterVal = localStorage.getItem('clusterValue');
    console.log(clusterVal);
    if (clusterVal) {
      setClusterValue(clusterVal);
      getClusterDetails();
    } else {
      console.log('no value');
    }
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
    // entries.map((entry: string) => {
    //   getColumnDetails(entry);
    //   setTableIteration(tableIteration + 1);
    // });
    entries.forEach(async (entry: string) => {
      await getColumnDetails(entry);
      setTableIteration(prevCount => prevCount + 1);
    });
  }, [entries]);
  useEffect(() => {
    console.log(columnResponse);
    console.log(databaseIteration);
    console.log(databaseLength);
    console.log(tableLength);
    console.log(tableIteration);
    if (
      tableIteration === tableLength &&
      databaseIteration === databaseLength &&
      tableLength !== 0
    ) {
      console.log('loading false');
      console.log(databaseIteration);
      console.log(databaseLength);
      console.log(tableLength);
      console.log(tableIteration);
      setIsLoading(false);
    }
    // dataLoading();
  }, [columnResponse]);
  useEffect(() => {
    console.log('tableIteration:', tableIteration);

    // You can perform other actions with the tableIteration count here if needed
  }, [tableIteration]);
  return (
    <>
      <div>
        <div className="dpms-title">Dataproc Metastore</div>
        <div className="refresh-icon" onClick={handleRefreshClick}>
          <iconRefresh.react tag="div" />
        </div>
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

            {/* <i className="search icon"></i> */}
          </div>
        </div>
      </div>
      <div style={{ marginLeft: '20px' }}>
        {isLoading ? ( // Conditional rendering based on isLoading state
          <div>Loading data...</div>
        ) : (
          <div
            className="tree-container"
            style={{ height: '600px', overflowY: 'auto' }}
          >
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
        )}
      </div>
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
