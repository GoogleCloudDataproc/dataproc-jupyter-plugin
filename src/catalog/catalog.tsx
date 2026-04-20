import { JupyterLab } from '@jupyterlab/application';
import React, { useEffect, useState } from 'react';
import { Tree, NodeRendererProps, NodeApi } from 'react-arborist';
import { LabIcon } from '@jupyterlab/ui-components';
import 'style/catalog.css';
import { MainAreaWidget, Notification } from '@jupyterlab/apputils';
import { BigQueryDatasetWrapper } from '../bigQuery/bigQueryDatasetInfoWrapper';
import { BigQueryTableWrapper } from '../bigQuery/bigQueryTableInfoWrapper';
import databaseWidgetIcon from 'style/icons/database_widget_icon.svg';
import datasetsIcon from 'style/icons/datasets_icon.svg';
import rightArrowIcon from 'style/icons/right_arrow_icon.svg';
import downArrowIcon from 'style/icons/down_arrow_icon.svg';
import bigQueryProjectIcon from 'style/icons/bigquery_project_icon.svg';
import bigqueryIcon from 'style/icons/dataset_explorer_icon.svg';
import biglakeIcon from 'style/icons/biglake_icon.svg';
import namespacesIcon from 'style/icons/namespaces_icon.svg';
import datasetIcon from 'style/icons/dataset_icon.svg';
import tableIcon from 'style/icons/table_icon.svg';
import columnsIcon from 'style/icons/columns_icon.svg';
import { v4 as uuidv4 } from 'uuid';
import { auto } from '@popperjs/core';
import { IThemeManager } from '@jupyterlab/apputils';
import {
  CircularProgress
} from '@mui/material';
import { TitleComponent } from 'controls/SidePanelTitleWidget';
import { BigQueryWidgetService } from 'catalog/bigquery/bigqueryWidgetService';
import { BigLakeWidgetService } from './biglake/biglakeWidgetService';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { DataprocWidget } from 'controls/DataprocWidget';
import { handleDebounce } from 'utils/utils';


const iconRightArrow = new LabIcon({
  name: 'launcher:right-arrow-icon',
  svgstr: rightArrowIcon
});
const iconDownArrow = new LabIcon({
  name: 'launcher:down-arrow-icon',
  svgstr: downArrowIcon
});

const iconDatabaseWidget = new LabIcon({
  name: 'launcher:databse-widget-icon',
  svgstr: databaseWidgetIcon
});

const iconDatasets = new LabIcon({
  name: 'launcher:datasets-icon',
  svgstr: datasetsIcon
});


const iconBigQueryProject = new LabIcon({
  name: 'launcher:bigquery-project-icon',
  svgstr: bigQueryProjectIcon
});
const iconBiglake = new LabIcon({
  name: 'launcher:biglake-icon',
  svgstr: biglakeIcon
});
const iconBigquery = new LabIcon({
  name: 'launcher:bigquery-icon',
  svgstr: bigqueryIcon
});
const iconDataset = new LabIcon({
  name: 'launcher:dataset-icon',
  svgstr: datasetIcon
});
const iconTable = new LabIcon({
  name: 'launcher:table-icon',
  svgstr: tableIcon
});

const iconColumns = new LabIcon({
  name: 'launcher:columns-icon',
  svgstr: columnsIcon
});

const iconNamespace = new LabIcon({
  name: 'launcher:namespaces-icon',
  svgstr: namespacesIcon
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


const CatalogComponent = ({
  app,
  settingRegistry,
  themeManager
}: {
  app: JupyterLab;
  settingRegistry: ISettingRegistry;
  themeManager: IThemeManager;
}): JSX.Element => {
  const [projectNameInfo, setProjectNameInfo] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetLoading, setResetLoading] = useState(false);
  const [isIconLoading, setIsIconLoading] = useState(false);

  const [treeStructureData, setTreeStructureData] = useState<any>([]);

  const [currentNode, setCurrentNode] = useState<any>();

  const [height, setHeight] = useState(window.innerHeight - 125);
  const [isLoadMoreLoading, setIsLoadMoreLoading] = useState(false);
  const [databaseNames, setDatabaseNames] = useState<string[]>([]);
  const [biglakeCatalogNames, setBiglakeCatalogNames] = useState<string[]>([]);
  const [biglakeCatalogResponse, setBiglakeCatalogResponse] = useState<any>();
  const [namespaceResponse, setNamespaceResponse] = useState<any>();
  const [biglakeTableResponse, setBiglakeTableResponse] = useState<any>();
  
  // NEW STATE: For biglake schema (columns)
  const [biglakeSchemaResponse, setBiglakeSchemaResponse] = useState<any>();

  const [dataSetResponse, setDataSetResponse] = useState<any>();
  const [tableResponse, setTableResponse] = useState<any>();
  const [schemaResponse, setSchemaResponse] = useState<any>();

  const [nextPageTokens, setNextPageTokens] = useState<Map<string, string | null>>(new Map());
  const [allDatasets, setAllDatasets] = useState<Map<string, any[]>>(new Map());


  function handleUpdateHeight() {
    let updateHeight = window.innerHeight - 125;
    setHeight(updateHeight);
  }

  // Debounce the handleUpdateHeight function
  const debouncedHandleUpdateHeight = handleDebounce(handleUpdateHeight, 500);

  // Add event listener for window resize using useEffect
  useEffect(() => {
    window.addEventListener('resize', debouncedHandleUpdateHeight);

    // Cleanup function to remove event listener on component unmount
    return () => {
      window.removeEventListener('resize', debouncedHandleUpdateHeight);
    };
  }, []);



  interface IDataEntry {
    id: string;
    name: string;
    type?: string;
    isLoadMoreNode?: boolean;
    isNodeOpen?: boolean;
    description?: string;
    children?: any;
    projectId?: string;
  }

  const treeStructureforProjects = () => {
    const data = projectNameInfo.map(projectName => ({
      id: uuidv4(),
      name: projectName,
      children: [
        {
          id: uuidv4(),
          name: 'Biglake',
          projectId: projectName,
          children: [],
          isNodeOpen: false
        },
        {
          id: uuidv4(),
          name: 'Bigquery',
          projectId: projectName,
          children: [],
          isNodeOpen: false
        }
      ],
      isNodeOpen: false
    }));

    data.sort((a, b) => a.name.localeCompare(b.name));

    setTreeStructureData(data);
  };

  const treeStructureforBigLakeCatalogs = () => {
    let tempData = [...treeStructureData];
    const projectName = currentNode.parent?.data?.name;

    tempData.forEach((projectData: any) => {
      if (projectData.name === projectName) {
        const biglakeNode = projectData.children.find(
          (child: any) => child.name === 'Biglake'
        );

        if (biglakeNode) {
          const catalogNodes = biglakeCatalogNames.map(catalogName => ({
            id: uuidv4(),
            name: catalogName,
            isLoadMoreNode: false,
            isNodeOpen: false,
            children: []
          }));
          catalogNodes.sort((a, b) => a.name.localeCompare(b.name));
          biglakeNode.children = catalogNodes;
        }
      }
    });

    setTreeStructureData(tempData);
  };

  const treeStructureforNamespaces = () => {
    let tempData = [...treeStructureData];
    const catalogName = currentNode.data.name;
    const projectName = currentNode.parent?.parent?.data?.name;

    tempData.forEach((projectData: any) => {
      if (projectData.name === projectName) {
        const biglakeNode = projectData.children.find(
          (child: any) => child.name === 'Biglake'
        );

        if (biglakeNode) {
          biglakeNode.children.forEach((catalog: any) => {
            if (catalog.name === catalogName) {
              if (
                namespaceResponse &&
                namespaceResponse.namespaces &&
                namespaceResponse.namespaces.length > 0
              ) {
                catalog['children'] = namespaceResponse.namespaces.map(
                  (namespaceDetails: any) => ({
                    id: uuidv4(),
                    name: namespaceDetails.name,
                    children: [],
                    isNodeOpen: false
                  })
                );
              } else {
                catalog['children'] = false;
              }
            }
          });
        }
      }
    });

    setTreeStructureData(tempData);
  };

  const treeStructureforBigLakeTables = () => {
    let tempData = [...treeStructureData];
    const namespaceName = currentNode.data.name;
    const catalogName = currentNode.parent?.data.name;
    const projectName = currentNode.parent?.parent?.parent?.data?.name;
 
    tempData.forEach((projectData: any) => {
      if (projectData.name === projectName) {
        const biglakeNode = projectData.children.find(
          (child: any) => child.name === 'Biglake'
        );
 
        if (biglakeNode) {
          biglakeNode.children.forEach((catalog: any) => {
            if (catalog.name === catalogName) {
              catalog.children.forEach((namespace: any) => {
                if (namespace.name === namespaceName) {
                  if (
                    biglakeTableResponse &&
                    biglakeTableResponse.tables &&
                    biglakeTableResponse.tables.length > 0
                  ) {
                    namespace['children'] = biglakeTableResponse.tables.map(
                      (tableDetails: any) => ({
                        id: uuidv4(),
                        name: tableDetails.name,
                        children: [],
                        isNodeOpen: false
                      })
                    );
                  } else {
                    namespace['children'] = false;
                  }
                }
              });
            }
          });
        }
      }
    });
 
    setTreeStructureData(tempData);
  };

  // NEW METHOD: Tree structure logic to append Columns for BigLake
  const treeStructureforBigLakeSchema = () => {
    let tempData = [...treeStructureData];
    const namespaceName = currentNode.parent?.data.name;
    const catalogName = currentNode.parent?.parent?.data.name;
    const projectName = currentNode.parent?.parent?.parent?.parent?.data?.name;

    tempData.forEach((projectData: any) => {
      if (projectData.name === projectName) {
        const biglakeNode = projectData.children.find(
          (child: any) => child.name === 'Biglake'
        );

        if (biglakeNode) {
          biglakeNode.children.forEach((catalog: any) => {
            if (catalog.name === catalogName) {
              catalog.children.forEach((namespace: any) => {
                if (namespace.name === namespaceName) {
                  namespace.children.forEach((table: any) => {
                    if (table.name === biglakeSchemaResponse?.tableId) {
                      if (biglakeSchemaResponse.schema?.fields) {
                        table['children'] = biglakeSchemaResponse.schema.fields.map(
                          (column: any) => ({
                            id: uuidv4(),
                            name: column.name,
                            type: column.type,
                            mode: column.mode,
                            isNodeOpen: false
                          })
                        );
                      } else {
                        table['children'] = false;
                      }
                    }
                  });
                }
              });
            }
          });
        }
      }
    });
    setTreeStructureData(tempData);
  };


  const treeStructureforDatasets = () => {
    let tempData = [...treeStructureData];
    const projectName = currentNode.parent?.data?.name;

    tempData.forEach((projectData: any) => {
      if (projectData.name === projectName) {
        const bigQueryNode = projectData.children.find(
          (child: any) => child.name === 'Bigquery'
        );

        if (bigQueryNode) {
          const datasetNodes = databaseNames.map(datasetName => ({
            id: uuidv4(),
            name: datasetName,
            isLoadMoreNode: false,
            isNodeOpen: false,
            children: []
          }));
          datasetNodes.sort((a, b) => a.name.localeCompare(b.name));

          const nextPageToken = nextPageTokens.get(projectData.name);
          if (nextPageToken) {
            datasetNodes.push({
              id: uuidv4(),
              name: '',
              isLoadMoreNode: true,
              isNodeOpen: false,
              children: []
            });
          }
          bigQueryNode.children = datasetNodes;
        }
      }
    });

    setTreeStructureData(tempData);
  };

  const treeStructureforTables = () => {
    let tempData = [...treeStructureData];
    const datasetName = currentNode.data.name;
    const projectName = currentNode.parent?.parent?.data?.name;

    tempData.forEach((projectData: any) => {
      if (projectData.name === projectName) {
        const bigQueryNode = projectData.children.find(
          (child: any) => child.name === 'Bigquery'
        );

        if (bigQueryNode) {
          bigQueryNode.children.forEach((dataset: any) => {
            if (dataset.name === datasetName) {
              if (
                tableResponse &&
                tableResponse.length > 0 &&
                tableResponse[0].tableReference
              ) {
                dataset['children'] = tableResponse.map(
                  (tableDetails: any) => ({
                    id: uuidv4(),
                    name: tableDetails.tableReference.tableId,
                    children: [],
                    isNodeOpen: false
                  })
                );
              } else if (dataset.name === tableResponse) {
                dataset['children'] = false;
              }
            }
          });
        }
      }
    });

    setTreeStructureData(tempData);
  };

  const treeStructureforSchema = () => {
    let tempData = [...treeStructureData];
    const projectName = currentNode.parent?.parent?.parent?.data?.name;

    tempData.forEach((projectData: any) => {
      if (projectData.name === projectName) {
        const bigQueryNode = projectData.children.find(
          (child: any) => child.name === 'Bigquery'
        );

        if (bigQueryNode) {
          bigQueryNode.children.forEach((dataset: any) => {
            if (dataset.name === schemaResponse?.tableReference?.datasetId) {
              dataset.children.forEach((table: any) => {
                if (table.name === schemaResponse?.tableReference?.tableId) {
                  if (schemaResponse.schema?.fields) {
                    table['children'] = schemaResponse.schema.fields.map(
                      (column: any) => ({
                        id: uuidv4(),
                        name: column.name,
                        type: column.type,
                        mode: column.mode,
                        key: column.key,
                        collation: column.collation,
                        defaultValue: column.defaultValue,
                        policyTags: column.policyTags,
                        dataPolicies: column.dataPolicies,
                        tableDescription: column.tableDescription,
                        description: column.description
                      })
                    );
                  } else {
                    table['children'] = false;
                  }
                }
              });
            }
          });
        }
      }
    });
    setTreeStructureData(tempData);
  };

  /**
   * Fetches BigLake catalogs for the specified project.
   * API availability is checked independently and non-blocking.
   * If the BigLake API is disabled, a warning is shown but the UI remains accessible.
   * Blocking errors will only appear if the user attempts to access Big Lake features
   * and the underlying API call fails.
   */
  const getBiglakeCatalogs = async (projectId: string) => {
    setIsLoading(true);

    try {
      // Check if BigLake API is enabled independently (non-blocking)
      const isBigLakeEnabled = await BigLakeWidgetService.checkBigLakeApiEnabledAPIService();
      if (!isBigLakeEnabled) {
        // Show a non-blocking warning but continue to fetch catalogs
        Notification.emit(
          'BigLake API is not enabled..',
          'error',
          { autoClose: 5000 }
        );
      }

      // Proceed to fetch catalogs regardless of API state
      // The actual API call will handle blocking errors if needed
      await BigLakeWidgetService.listCatalogAPIService(
        settingRegistry,
        setBiglakeCatalogNames,
        setBiglakeCatalogResponse,
        projectId,
        setIsIconLoading,
        setIsLoading
      );
    } catch (reason) {
      Notification.emit(`Failed to fetch BigLake catalogs: ${reason}`, 'error');
    } finally {
      setIsLoading(false);
      setIsIconLoading(false);
    }
  }

  const getBiglakeNamespaces = async (
    catalogId: string,
    projectId: string
  ) => {
    await BigLakeWidgetService.listNamespaceAPIService(
      settingRegistry,
      catalogId,
      setNamespaceResponse,
      projectId,
      setIsIconLoading
    );
  };

  const getBiglakeTables = async (
    catalogName: string,
    namespaceId: string,
  ) => {
    await BigLakeWidgetService.listTablesAPIService(
      catalogName,
      namespaceId,
      setBiglakeTableResponse,
      setIsIconLoading
    );
  };

  // NEW METHOD: Call service to get columns
  const getBiglakeColumns = async (
    catalogName: string,
    namespaceName: string,
    tableName: string
  ) => {
    await BigLakeWidgetService.getBigLakeColumnDetailsAPIService(
      catalogName,
      namespaceName,
      tableName,
      setBiglakeSchemaResponse,
      setIsIconLoading
    );
  };

  const getBigQueryDatasets = async (projectId: string) => {
    const pageTokenForProject = nextPageTokens.get(projectId);
    const allDatasetsUnderProject = allDatasets.get(projectId) || [];

    await BigQueryWidgetService.getBigQueryDatasetsAPIService(
      settingRegistry,
      setDatabaseNames,
      setDataSetResponse,
      projectId,
      setIsIconLoading,
      setIsLoading,
      setIsLoadMoreLoading,
      allDatasetsUnderProject,
      (value: any[]) => {
        setAllDatasets(prev => {
          const newMap = new Map(prev);
          newMap.set(projectId, value);
          return newMap;
        });
      },
      pageTokenForProject,
      (projectId: string, token: string | null) => {
        setNextPageTokens(prevTokens => {
            const newMap = new Map(prevTokens);
            if (token) {
                newMap.set(projectId, token);
            } else {
                newMap.delete(projectId);
            }
            return newMap;
        });
      }
    );
  };

  const getBigQueryTables = async (
    datasetId: string,
    projectId: string | undefined
  ) => {
    if (datasetId && projectId) {

      await BigQueryWidgetService.getBigQueryTableAPIService(
        datasetId,
        setDatabaseNames,
        setTableResponse,
        projectId,
        setIsIconLoading
      );
    }
  };

  const getBigQueryColumnDetails = async (
    tableId: string,
    datasetId: string,
    projectId: string | undefined
  ) => {
    if (tableId && datasetId && projectId) {

      await BigQueryWidgetService.getBigQueryColumnDetailsAPIService(
        datasetId,
        tableId,
        projectId,
        setIsIconLoading,
        setSchemaResponse
      );
    }
  };

  type NodeProps = NodeRendererProps<IDataEntry> & {
    onClick: (node: NodeRendererProps<IDataEntry>['node']) => void;
  };
  const Node = ({ node, style, onClick}: NodeProps) => {

    const handleToggle = () => {
      const depth = calculateDepth(node);
      if (node.data.isLoadMoreNode) {
        const projectId =
          node.data.projectId || node.parent?.parent?.data?.name;
        const nextPageToken = projectId
          ? nextPageTokens.get(projectId)
          : undefined;
        if (projectId && nextPageToken) {
          setCurrentNode(node.parent);
          setIsLoadMoreLoading(true);
          getBigQueryDatasets(projectId);
        }
        return;
      }

      if (depth === 1 && !node.isOpen) {
        node.toggle();
      } else if (depth === 2 && !node.isOpen) {
        if (node.data.name === 'Biglake') {
          setCurrentNode(node);
          const projectId = node.parent?.data?.name;
          if (projectId) {
            setIsIconLoading(true);
            getBiglakeCatalogs(projectId);
          }
        } else if (node.data.name === 'Bigquery') {
          setCurrentNode(node);
          const projectId = node.parent?.data?.name;
          if (projectId && !allDatasets.has(projectId)) {
            setIsIconLoading(true);
            getBigQueryDatasets(projectId);
          } else {
            node.toggle();
          }
        }
      } else if (depth === 3 && !node.isOpen) {
        // This is for BigQuery datasets
        if (node.parent?.data.name === 'Bigquery') {
          setCurrentNode(node);
          setIsIconLoading(true);
          const projectId = node.parent?.parent?.data?.name;
          getBigQueryTables(node.data.name, projectId);
        } else if (node.parent?.data.name === 'Biglake') {
            setCurrentNode(node);
            const projectId = node.parent?.parent?.data?.name;
            if (projectId) {
                setIsIconLoading(true);
                getBiglakeNamespaces(node.data.name, projectId);
            }
        }
      } else if (depth === 4 && node.parent && !node.isOpen) {
        // This is for BigQuery tables
        if (node.parent?.parent?.data.name === 'Bigquery') {
          setCurrentNode(node);
          setIsIconLoading(true);
          const datasetId = node.parent?.data?.name;
          const projectId = node.parent?.parent?.parent?.data?.name;
          getBigQueryColumnDetails(node.data.name, datasetId, projectId);
        } else if (node.parent?.parent?.data.name === 'Biglake') {
            setCurrentNode(node);
            const catalogName = node.parent?.data?.name;
            const projectName = node.parent?.parent?.parent?.data?.name
            if (catalogName) {
                setIsIconLoading(true);
                getBiglakeTables(`projects/${projectName}/catalogs/${catalogName}`,node.data.name);
            }
        }
      } else if (depth === 5 && !node.isOpen) {
        // NEW LOGIC: Trigger column fetch for BigLake table
        if (node.parent?.parent?.parent?.data.name === 'Biglake') {
          setCurrentNode(node);
          setIsIconLoading(true);
          const namespaceName = node.parent?.data?.name;
          const catalogName = node.parent?.parent?.data?.name;
          if (catalogName && namespaceName) {
            getBiglakeColumns(catalogName, namespaceName, node.data.name);
          }
        } else {
          node.toggle();
        }
      } else {
        node.toggle();
      }
    };
    
    const handleIconClick = (event: React.MouseEvent) => {
      // `node.isOpen` is the default property of the library, which sometimes has incorrect initial behaviour.
      // This leads to, incorrect expand / collapase Icon in the UI.
      // using `isNodeOpen` this (custom) property to correct the node's intial expand/collapse state.
      // and prevent visual flickering when the user interacts with the tree.
      if(node.isOpen !== node.data.isNodeOpen){
        node.toggle();
      }
      if (event.currentTarget.classList.contains('caret-icon')) {
        node.data.isNodeOpen = ! node.data.isNodeOpen
        handleToggle();
      }
    };
    const handleTextClick = (event: React.MouseEvent) => {
      event.stopPropagation();
      onClick(node);
    };


    const depth = calculateDepth(node);
    const renderNodeIcon = () => {
      // Determines whether this node should render a dropdown arrow
      const isBigQueryColumn = depth === 5 && node.parent?.parent?.parent?.data?.name === 'Bigquery';
      const isBigLakeColumn = depth === 6 && node.parent?.parent?.parent?.parent?.data?.name === 'Biglake';
      const hasChildren = (node.children && node.children.length > 0) || (!isBigQueryColumn && !isBigLakeColumn && node.data.children !== false);
      
      const arrowIcon = hasChildren && !node.data.isLoadMoreNode ? (
        isIconLoading && currentNode?.data?.name === node.data.name ? (
          <div className="big-query-loader-style">
            <CircularProgress
              size={16}
              aria-label="Loading Spinner"
              data-testid="loader"
            />
          </div>
        ) : node.isOpen ? (
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
      ) : (
        <div style={{ width: '29px' }}></div>
      );

      const renderLoadMoreNode = () =>
      isLoadMoreLoading ? (
        <div className='load-more-spinner-container'>
          <div className='load-more-spinner'>
      <CircularProgress
        className="spin-loader-custom-style"
        size={20}
        aria-label="Loading Spinner"
        data-testid="loader"
      />
          </div>
          Loading datasets
        </div>
      ) : (
        <div
          role="treeitem"
          className="caret-icon down load-more-icon"
          onClick={handleToggle}
        >
          Load More...
        </div>
      );

      if (node.data.isLoadMoreNode) {
        return renderLoadMoreNode();
      }
      if (depth === 1) {
        return (
          <>
            {arrowIcon}
            <div role="img" className="db-icon" onClick={handleIconClick}>
                <iconBigQueryProject.react
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
            <div role="img" className="db-icon" onClick={handleIconClick}>
              {node.data.name === 'Biglake' ? (
                <iconBiglake.react
                  tag="div"
                  className="icon-white logo-alignment-style"
                />
              ) : (
                <iconBigquery.react
                  tag="div"
                  className="icon-white logo-alignment-style"
                />
              )}
            </div>
          </>
        );
      } else if (depth === 3) {
        return (
          <>
            {arrowIcon}
            <div role="img" className="db-icon" onClick={handleIconClick}>
               { node.parent?.data.name === 'Biglake' ? (
                <iconBiglake.react
                  tag="div"
                  className="icon-white logo-alignment-style"
                />
              ) : (
              <iconDataset.react
                tag="div"
                className="icon-white logo-alignment-style"
              />
              )}
            </div>
          </>
        );
      } else if (depth === 4) {
        return (
          <>
            {arrowIcon}
            <div role="img" className="table-icon" onClick={handleIconClick}>
             {
              node.parent?.parent?.data.name === 'Biglake' ? (
                <iconNamespace.react
                  tag="div"
                  className="icon-white logo-alignment-style"
                />
              ) : (
                <iconTable.react
                  tag="div"
                  className="icon-white logo-alignment-style"
                />
              )
            }
            </div>
          </>
        );
      } else if (depth === 5) {
        if (node.parent?.parent?.parent?.data.name === 'Biglake') {
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
        } else {
            return (
              <>
                <iconColumns.react
                  tag="div"
                  className="icon-white logo-alignment-style"
                />
              </>
            );
        }
      // NEW RENDER CONDITION: Depth 6 is solely for BigLake Columns
      } else if (depth === 6) {
        return (
          <>
            <iconColumns.react
              tag="div"
              className="icon-white logo-alignment-style"
            />
          </>
        );
      }
      return (
        <>
        </>
      );
    };

    return (
      <>
        <div className="catalog-dataset-node" style={style}>
          {renderNodeIcon()}
          <div
            role="treeitem"
            title={node.data.name}
            onClick={handleTextClick}
            className="catalog-dataset-content"
          >
            <span className="catalog-dataset-name">{node.data.name}</span>
            {node.data.type && (
              <span
                title={node.data.type}
                className="bigquery-column-type"
              >
                ({node.data.type.toLowerCase()})
              </span>
            )}
          </div>
        </div>
      </>
    );
  };

  const getBigQueryProjects = async (isReset : boolean) => {
    if (isReset) {
      setAllDatasets(new Map()); 
      setNextPageTokens(new Map());
      setResetLoading(true);
    }
    await BigQueryWidgetService.getBigQueryProjectsListAPIService(
      setProjectNameInfo,
      setIsLoading
    );
  };

  const openedWidgets: Record<string, boolean> = {};
  const handleNodeClick = (node: NodeApi) => {
    const depth = calculateDepth(node);
    const widgetTitle = node.data.name;

    // Ensure we are in the BigQuery part of the tree
    if (
      node.parent?.data.name === 'Bigquery' ||
      node.parent?.parent?.data.name === 'Bigquery'
    ) {
      if (!openedWidgets[widgetTitle]) {
        if (depth === 3) {
          // BigQuery Dataset
          const content = new BigQueryDatasetWrapper(
            node.data.name,
            node?.parent?.parent?.data?.name!, // Project ID
            themeManager
          );
          const widget = new MainAreaWidget<BigQueryDatasetWrapper>({
            content
          });
          widget.id = `bigquery-dataset-info-${uuidv4()}`;
          widget.title.label = node.data.name;
          widget.title.closable = true;
          widget.title.icon = iconDatabaseWidget; // Will need to be defined
          app.shell.add(widget, 'main');
          widget.disposed.connect(() => {
            delete openedWidgets[widgetTitle];
          });
          openedWidgets[widgetTitle] = true;
        } else if (depth === 4) {
          // BigQuery Table
          const datasetId = node.parent?.data.name;
          const projectId = node.parent?.parent?.parent?.data.name;
          const content = new BigQueryTableWrapper(
            node.data.name,
            datasetId!,
            projectId!,
            themeManager
          );
          const widget = new MainAreaWidget<BigQueryTableWrapper>({ content });
          widget.id = `bigquery-table-info-${uuidv4()}`;
          widget.title.label = node.data.name;
          widget.title.closable = true;
          widget.title.icon = iconDatasets; // Will need to be defined
          app.shell.add(widget, 'main');
          widget.disposed.connect(() => {
            delete openedWidgets[widgetTitle];
          });
          openedWidgets[widgetTitle] = true;
        }
      }
    }
  };

  useEffect(() => {
    getBigQueryProjects(false);
  }, []);

  useEffect(() => {
    if (projectNameInfo.length > 0) {
      treeStructureforProjects();
    }
  }, [projectNameInfo]);

  useEffect(() => {
    if (biglakeCatalogResponse) {
      treeStructureforBigLakeCatalogs();
    }
  }, [biglakeCatalogResponse]);

  useEffect(() => {
    if (namespaceResponse) {
      treeStructureforNamespaces();
    }
  }, [namespaceResponse]);

  useEffect(() => {
    if (biglakeTableResponse) {
      treeStructureforBigLakeTables();
    }
  }, [biglakeTableResponse]);
  
  // NEW EFFECT HOOK: Update BigLake Columns 
  useEffect(() => {
    if (biglakeSchemaResponse) {
      treeStructureforBigLakeSchema();
    }
  }, [biglakeSchemaResponse]);

  useEffect(() => {
    if (dataSetResponse) {
      treeStructureforDatasets();
    }
  }, [dataSetResponse]);

  useEffect(() => {
    if (tableResponse) {
      treeStructureforTables();
    }
  }, [tableResponse]);

  useEffect(() => {
    if (schemaResponse) {
      treeStructureforSchema();
    }
  }, [schemaResponse]);


  useEffect(() => {
    if (treeStructureData.length > 0 && treeStructureData[0].name !== '') {
      setIsLoading(false);
      setResetLoading(false);
      setIsLoadMoreLoading(false);
    }
    if (currentNode && !currentNode.isOpen) {
      currentNode?.toggle();
    }
  }, [treeStructureData]);


  return (
    <div className="dpms-Wrapper">
      <TitleComponent
        titleStr="Catalog"
        isPreview={false}
        getBigQueryProjects={() => getBigQueryProjects(true)}
        isLoading={isResetLoading}
      />
      <div>
        <div>
          {isLoading ? (
            <div className="catalog-loader">
              <div>
                <CircularProgress
                  className="spin-loader-custom-style"
                  size={20}
                  aria-label="Loading Spinner"
                  data-testid="loader"
                />
              </div>
              Loading datasets
            </div>
          ) : (
            <div>
              <div>
                <div className="tree-container">
                    {treeStructureData.length > 0 &&
                      treeStructureData[0].name !== '' && (
                        <>
                          <Tree
                            className="bigquery-dataset-tree"
                            data={treeStructureData}
                            openByDefault={false}
                            indent={24}
                            width={auto}
                            height={height}
                            rowHeight={36}
                            overscanCount={1}
                            paddingTop={30}
                            paddingBottom={10}
                            padding={25}
                            idAccessor={(node: any) => node.id}
                          >
                            {(props: NodeRendererProps<any>) => (
                              <Node
                                {...props}
                                onClick={handleNodeClick}
                              />
                            )}
                          </Tree>
                        </>
                      )}
                  </div>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export class CatalogWidget extends DataprocWidget {
  app: JupyterLab;
  settingRegistry: ISettingRegistry;
  enableBigqueryIntegration: boolean;

  constructor(
    app: JupyterLab,
    settingRegistry: ISettingRegistry,
    enableBigqueryIntegration: boolean,
    themeManager: IThemeManager
  ) {
    super(themeManager);
    this.app = app;
    this.settingRegistry = settingRegistry;
    this.enableBigqueryIntegration = enableBigqueryIntegration;
  }

  renderInternal(): JSX.Element {
    return (
      <CatalogComponent
        app={this.app}
        settingRegistry={this.settingRegistry}
        themeManager={this.themeManager}
      />
    );
  }
}
