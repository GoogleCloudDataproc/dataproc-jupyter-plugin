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
  const [databases, setDatabases] = useState<string[]>([]);

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
  // const extractDatabaseName = (metastoreService: string) => {
  //   const lastIndex = metastoreService.lastIndexOf('/');
  //   return lastIndex !== -1 ? metastoreService.substring(lastIndex + 1) : '';
  // };

  const data = databases.map((db: string) => {
    const dbName = db;
    return {
      id: uuidv4(), // Generate a unique ID for each database entry
      name: dbName,
      children: [
        {
          id: uuidv4(),
          name: 'Table1',
          children: [{ id: uuidv4(), name: 'column1' }]
        },
        {
          id: uuidv4(),
          name: 'Table2',
          children: [{ id: uuidv4(), name: 'column2' }]
        },
        {
          id: uuidv4(),
          name: 'Table3',
          children: [{ id: uuidv4(), name: 'column3' }]
        }
      ]
    };
  });
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
            .then((responseResult: any) => {
              console.log(responseResult);
              console.log(dataprocMetastoreServices);
              // const metastoreServices = responseResult.config?.metastoreConfig?.dataprocMetastoreService;
              const inputArray = [
                'dataproc_metastore:acn-ytmusicsonos.us-central1.service-metastore.default'
              ];
              const valuesAfterLastDot = inputArray.map(inputString => {
                const parts = inputString.split('.');
                return parts[parts.length - 1];
              });
              setDatabases(valuesAfterLastDot);
              console.log(valuesAfterLastDot); // Output: "default"
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
    console.log('cluster details');
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
            .then((responseResult: any) => {
              console.log(responseResult);
              // const metastoreServices = responseResult.config?.metastoreConfig?.dataprocMetastoreService;
              const metastoreServices =
                'projects/acn-ytmusicsonos/locations/us-central1/services/service-metastore';
              const lastIndex = metastoreServices.lastIndexOf('/');
              const instanceName =
                lastIndex !== -1
                  ? metastoreServices.substring(lastIndex + 1)
                  : '';
              setDataprocMetastoreServices(instanceName);
              console.log(dataprocMetastoreServices);
              getDatabaseDetails();
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
          <Tree
            initialData={data}
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
