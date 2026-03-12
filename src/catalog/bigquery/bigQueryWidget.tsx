/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
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
import bigQueryProjectIcon from '../../../style/icons/bigquery_project_icon.svg';
import datasetIcon from '../../../style/icons/dataset_icon.svg';
import tableIcon from '../../../style/icons/table_icon.svg';
import columnsIcon from '../../../style/icons/columns_icon.svg';
import databaseWidgetIcon from '../../../style/icons/database_widget_icon.svg';
import datasetsIcon from '../../../style/icons/datasets_icon.svg';
import searchIcon from '../../../style/icons/search_icon.svg';
import rightArrowIcon from '../../../style/icons/right_arrow_icon.svg';
import downArrowIcon from '../../../style/icons/down_arrow_icon.svg';
import searchClearIcon from '../../../style/icons/search_clear_icon.svg';
import bigqueryIcon from '../../../style/icons/dataset_explorer_icon.svg';
import biglakeIcon from '../../../style/icons/biglake_icon.svg';
import { MainAreaWidget } from '@jupyterlab/apputils';
import { Menu, MenuItem } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import { auto } from '@popperjs/core';
import { IThemeManager } from '@jupyterlab/apputils';
import {
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField
} from '@mui/material';
import { TitleComponent } from '../../controls/SidePanelTitleWidget';
import { BigQueryWidgetService } from './bigqueryWidgetService';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { BigQueryDatasetWrapper } from '../common/bigQueryDatasetInfoWrapper';
import { BigQueryTableWrapper } from '../common/bigQueryTableInfoWrapper';
import { DataprocWidget } from '../../controls/DataprocWidget';
import { checkConfig, handleDebounce } from '../../utils/utils';
import LoginErrorComponent from '../../utils/loginErrorComponent';
import { BIGQUERY_API_URL } from '../../utils/const';

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

let timeoutId: NodeJS.Timeout | null = null;

const debounce = (func: Function, delay: number) => {
  return (...args: any) => {
    clearTimeout(timeoutId as NodeJS.Timeout);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

const BigQueryComponent = ({
  app,
  settingRegistry,
  themeManager
}: {
  app: JupyterLab;
  settingRegistry: ISettingRegistry;
  themeManager: IThemeManager;
}): JSX.Element => {
  const iconSearchClear = new LabIcon({
    name: 'launcher:search-clear-icon',
    svgstr: searchClearIcon
  });
  const iconBigQueryProject = new LabIcon({
    name: 'launcher:bigquery-project-icon',
    svgstr: bigQueryProjectIcon
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
  const iconSearch = new LabIcon({
    name: 'launcher:search-icon',
    svgstr: searchIcon
  });
  const iconBiglake = new LabIcon({
    name: 'launcher:biglake-icon',
    svgstr: biglakeIcon
  });
  const iconBigquery = new LabIcon({
    name: 'launcher:bigquery-icon',
    svgstr: bigqueryIcon
  });

  const [projectNameInfo, setProjectNameInfo] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [notebookValue, setNotebookValue] = useState<string>('');
  const [dataprocMetastoreServices, setDataprocMetastoreServices] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadMoreLoading, setIsLoadMoreLoading] = useState(false);
  const [isResetLoading, setResetLoading] = useState(false);
  const [databaseNames, setDatabaseNames] = useState<string[]>([]);

  const [dataSetResponse, setDataSetResponse] = useState<any>();
  const [tableResponse, setTableResponse] = useState<any>();
  const [schemaResponse, setSchemaResponse] = useState<any>();

  const [treeStructureData, setTreeStructureData] = useState<any>([]);

  const [currentNode, setCurrentNode] = useState<any>();
  const [isIconLoading, setIsIconLoading] = useState(false);

  const [searchResponse, setSearchResponse] = useState<any>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [apiError, setApiError] = useState(false);

  const [height, setHeight] = useState(window.innerHeight - 125);
  const [loggedIn, setLoggedIn] = useState(false);
  const [configError, setConfigError] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [projectName, setProjectName] = useState<string>('');

  const [nextPageTokens, setNextPageTokens] = useState<Map<string, string | null>>(new Map());
  const [allDatasets, setAllDatasets] = useState<Map<string, any[]>>(new Map());

  function handleUpdateHeight() {
    let updateHeight = window.innerHeight - 125;
    setHeight(updateHeight);
  }

  const debouncedHandleUpdateHeight = handleDebounce(handleUpdateHeight, 500);

  useEffect(() => {
    window.addEventListener('resize', debouncedHandleUpdateHeight);
    return () => {
      window.removeEventListener('resize', debouncedHandleUpdateHeight);
    };
  }, []);

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
          name: 'Bigquery',
          projectId: projectName,
          children: [],
          isNodeOpen: false
        },
        {
          id: uuidv4(),
          name: 'Biglake',
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

  const treeStructureforDatasets = () => {
    let tempData = [...treeStructureData];
    const projectName = currentNode.parent?.data?.name;

    tempData.forEach((projectData: any) => {
      if (projectData.name === projectName) {
        const bigQueryNode = projectData.children.find((child: any) => child.name === 'Bigquery');
        
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
        const bigQueryNode = projectData.children.find((child: any) => child.name === 'Bigquery');
        
        if (bigQueryNode) {
          bigQueryNode.children.forEach((dataset: any) => {
            if (dataset.name === datasetName) {
              if (tableResponse && tableResponse.length > 0 && tableResponse[0].tableReference) {
                dataset['children'] = tableResponse.map((tableDetails: any) => ({
                  id: uuidv4(),
                  name: tableDetails.tableReference.tableId,
                  children: [],
                  isNodeOpen: false
                }));
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
        const bigQueryNode = projectData.children.find((child: any) => child.name === 'Bigquery');
        
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

  const handleSearchTreeStructure = () => {
    if (searchResponse && searchResponse.results && searchResponse.results.length > 0) {
      let data: any = [];

      searchResponse.results.forEach((searchData: any) => {
        const dataplexEntry = searchData.dataplexEntry;
        if (!dataplexEntry || !dataplexEntry.fullyQualifiedName) {
          return;
        }

        const fqn = dataplexEntry.fullyQualifiedName;
        const fqnParts = fqn.split(':');
        const tableParts = fqnParts[1].split('.');
        const projectId = tableParts[0];
        const datasetId = tableParts[1];
        const tableId = tableParts.length > 2 ? tableParts[2] : null;

        let projectNode = data.find((p: any) => p.name === projectId);
        if (!projectNode) {
          projectNode = {
            id: uuidv4(),
            name: projectId,
            children: [],
            isNodeOpen: true
          };
          data.push(projectNode);
        }

        let bqNode = projectNode.children.find((s: any) => s.name === 'Bigquery');
        if (!bqNode) {
          bqNode = {
            id: uuidv4(),
            name: 'Bigquery',
            projectId: projectId,
            children: [],
            isNodeOpen: true
          };
          projectNode.children.push(bqNode);
        }

        let datasetNode = bqNode.children.find((d: any) => d.name === datasetId);
        if (!datasetNode) {
          datasetNode = {
            id: uuidv4(),
            name: datasetId,
            children: [],
            isNodeOpen: false
          };
          bqNode.children.push(datasetNode);
        }

        if (tableId) {
          if (!datasetNode.children.find((t: any) => t.name === tableId)) {
            datasetNode.isNodeOpen = true;
            datasetNode.children.push({
              id: uuidv4(),
              name: tableId,
              children: [],
              isNodeOpen: false,
              isOpen: false
            });
          }
        }
      });

      setTreeStructureData(data);
    } else {
      setTreeStructureData([]);
    }
  };

  const handleSearch = (value: string) => {
    if (value !== '') {
      BigQueryWidgetService.getBigQuerySearchAPIService(
        value,
        setSearchLoading,
        setSearchResponse
      );
    } else {
      getBigQueryProjects(false);
    }
  };

  const debouncedHandleSearch = debounce(handleSearch, 1000);

  const handleSearchTerm = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
    if (value.length >= 3) {
      debouncedHandleSearch(value);
    }
    if (value.length === 0) {
      handleSearchClear();
    }
  };

  const openedWidgets: Record<string, boolean> = {};
  const handleNodeClick = (node: NodeApi) => {
    const depth = calculateDepth(node);
    const widgetTitle = node.data.name;

    if (!openedWidgets[widgetTitle]) {
      if (depth === 3) {
        const projectId = node.parent?.parent?.data?.name;
        const content = new BigQueryDatasetWrapper(
          node.data.name,
          projectId!,
          themeManager
        );
        const widget = new MainAreaWidget<BigQueryDatasetWrapper>({ content });
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
      } else if (depth === 4 && node.parent && node.parent.parent && node.parent.parent.parent) {
        const database = node.parent.data.name;
        const projectId = node.parent.parent.parent.data.name;

        const content = new BigQueryTableWrapper(
          node.data.name,
          database,
          projectId,
          themeManager
        );
        const widget = new MainAreaWidget<BigQueryTableWrapper>({ content });
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
    setSearchLoading(true);
    setAllDatasets(new Map());
    setNextPageTokens(new Map());
    getBigQueryProjects(false);
  };
  type NodeProps = NodeRendererProps<IDataEntry> & {
    onClick: (node: NodeRendererProps<IDataEntry>['node']) => void;
    nextPageTokens: Map<string, string | null>;
    getBigQueryDatasets: (projectId: string) => Promise<void>;
  };
  const Node = ({
    node,
    style,
    onClick,
    nextPageTokens,
    getBigQueryDatasets
  }: NodeProps) => {
    const [contextMenu, setContextMenu] = useState<{
      mouseX: number;
      mouseY: number;
    } | null>(null);
    const handleToggle = () => {
      const depth = calculateDepth(node);
      if (node.data.isLoadMoreNode) {
        const projectId = node.data.projectId || node.parent?.parent?.data?.name;
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
          console.log('hello biglake');
          return;
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
        setCurrentNode(node);
        setIsIconLoading(true);
        const projectId = node.parent?.parent?.data?.name;
        getBigQueryTables(node.data.name, projectId);
      } else if (depth === 4 && node.parent && !node.isOpen) {
        setCurrentNode(node);
        setIsIconLoading(true);
        const datasetId = node.parent?.data?.name;
        const projectId = node.parent?.parent?.parent?.data?.name;
        getBigQueryColumnDetails(
          node.data.name,
          datasetId,
          projectId
        );
      } else {
        node.toggle();
      }
    };
    const handleIconClick = (event: React.MouseEvent) => {
      if (node.isOpen !== node.data.isNodeOpen) {
        node.toggle();
      }
      if (event.currentTarget.classList.contains('caret-icon')) {
        node.data.isNodeOpen = !node.data.isNodeOpen;
        handleToggle();
      }
    };
    const handleTextClick = (event: React.MouseEvent) => {
      event.stopPropagation();
      onClick(node);
    };

    const handleContextMenu = (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const depth = calculateDepth(node);
      if (depth === 4) {
        setContextMenu(
          contextMenu === null
            ? {
                mouseX: event.clientX + 2,
                mouseY: event.clientY - 6
              }
            : null
        );
      }
    };

    const handleClose = () => {
      setContextMenu(null);
    };

    const handleCopyId = () => {
      const projectName = node.parent?.parent?.parent?.data.name;
      const datasetName = node.parent?.data.name;
      const tableName = node.data.name;
      const fullTableName = `${projectName}.${datasetName}.${tableName}`;
      navigator.clipboard.writeText(fullTableName);
      handleClose();
    };

    const handleOpenTableDetails = () => {
      onClick(node);
      handleClose();
    };

    const createBigQueryNotebookWithQuery = async (
      app: JupyterLab,
      fullTableName: string
    ) => {
      try {
        const notebookPanel = await app.commands.execute(
          'notebook:create-new',
          {
            kernelName: 'python3'
          }
        );
        await new Promise(resolve => setTimeout(resolve, 300));
        app.shell.activateById(notebookPanel.id);
        await app.commands.execute('notebook:replace-selection', {
          text: '#Uncomment if bigquery-magics is not installed \n#!pip install bigquery-magics\n%load_ext bigquery_magics'
        });
        await app.commands.execute('notebook:run-cell-and-insert-below');
        await app.commands.execute('notebook:replace-selection', {
          text: `%%bqsql\nselect * from ${fullTableName} limit 20`
        });
      } catch (error) {
        console.error('Error creating notebook:', error);
      }
      handleClose();
    };

    const handleQueryTable = async () => {
      const projectId = node.parent?.parent?.parent?.data.name;
      const datasetId = node.parent?.data.name;
      const tableId = node.data.name;
      const fullTableName = `\`${projectId}.${datasetId}.${tableId}\``;

      await createBigQueryNotebookWithQuery(app, fullTableName);
    };

    const depth = calculateDepth(node);
    const renderNodeIcon = () => {
      const hasChildren =
        (node.children && node.children.length > 0) ||
        (depth !== 5 && node.children);
      const arrowIcon =
        hasChildren && !node.data.isLoadMoreNode ? (
          isIconLoading && currentNode.data.name === node.data.name ? (
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
          <div className="load-more-spinner-container">
            <div className="load-more-spinner">
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
      if (searchTerm) {
        const arrowIcon =
          hasChildren && !node.data.isLoadMoreNode ? (
            isIconLoading && currentNode.data.name === node.data.name ? (
              <div className="big-query-loader-style">
                <CircularProgress
                  size={16}
                  aria-label="Loading Spinner"
                  data-testid="loader"
                />
              </div>
            ) : node.data.isNodeOpen ? (
              <>
                <div
                  role="treeitem"
                  className="caret-icon down"
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
                className="caret-icon right"
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
                ):(
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
                  <iconDataset.react
                    tag="div"
                    className="icon-white logo-alignment-style"
                  />
              </div>
            </>
          );
        } else if (depth === 4) {
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
              <iconDataset.react
                tag="div"
                className="icon-white logo-alignment-style"
              />
            </div>
          </>
        );
      } else if (depth === 4) {
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
      <>
        <div style={{ ...style, display: 'flex', alignItems: 'center' }}>
          {renderNodeIcon()}
          <div
            role="treeitem"
            title={node.data.name}
            onClick={handleTextClick}
            onContextMenu={handleContextMenu}
            style={{
              display: 'flex',
              alignItems: 'center',
              flex: 1,       // Take up the remaining width after the icon
              minWidth: 0,   // Allows this div to shrink below its content width
            }}
          >
            <span 
              style={{ 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap',
              }}
            >
              {node.data.name}
            </span>
            
            {node.data.type && (
              <span
                title={node.data.type}
                className="dpms-column-type-text"
                style={{ 
                  flexShrink: 0, 
                  marginLeft: '6px' 
                }}
              >
                ({node.data.type.toLowerCase()})
              </span>
            )}
          </div>

          <Menu
            open={contextMenu !== null}
            onClose={handleClose}
            anchorReference="anchorPosition"
            anchorPosition={
              contextMenu !== null
                ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                : undefined
            }
          >
            <MenuItem onClick={handleQueryTable}>Query table</MenuItem>
            <MenuItem onClick={handleOpenTableDetails}>
              Open table details
            </MenuItem>
            <MenuItem onClick={handleCopyId}>Copy table ID</MenuItem>
          </Menu>
        </div>
      </>
    );
  };

  const getBigQueryProjects = async (isReset: boolean) => {
    if (isReset) {
      setAllDatasets(new Map());
      setNextPageTokens(new Map());
      setResetLoading(true);
    }
    await BigQueryWidgetService.getBigQueryProjectsListAPIService(
      setProjectNameInfo,
      setIsLoading,
      setApiError,
      setProjectName
    );
  };

  const getBigQueryDatasets = async (projectId: string) => {
    const pageTokenForProject = nextPageTokens.get(projectId);
    const allDatasetsUnderProject = allDatasets.get(projectId) || [];

    await BigQueryWidgetService.getBigQueryDatasetsAPIService(
      notebookValue,
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
        notebookValue,
        datasetId,
        setDatabaseNames,
        setTableResponse,
        projectId,
        setIsIconLoading
      );
    }
  };

  const getActiveNotebook = () => {
    setNotebookValue('bigframes');
    setDataprocMetastoreServices('bigframes');
  };

  useEffect(() => {
    checkConfig(setLoggedIn, setConfigError, setLoginError);
    setLoggedIn(!loginError && !configError);
    if (loggedIn) {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    getActiveNotebook();
    return () => {
      setNotebookValue('');
    };
  }, [notebookValue]);

  useEffect(() => {
    getBigQueryProjects(false);
  }, [dataprocMetastoreServices]);

  useEffect(() => {
    if (projectNameInfo.length > 0) {
      treeStructureforProjects();
    }
  }, [projectNameInfo]);

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
      setSearchLoading(false);
      setIsLoading(false);
      setResetLoading(false);
      setIsLoadMoreLoading(false);
    }
    if (currentNode && !currentNode.isOpen) {
      currentNode?.toggle();
    }
  }, [treeStructureData]);

  useEffect(() => {
    handleSearchTreeStructure();
    setSearchLoading(false);
  }, [searchResponse]);

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
            <div className="database-loader">
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
              {!loginError && !configError && !apiError && (
                <div>
                  <div className="search-field">
                    <TextField
                      placeholder="Enter your keyword to search"
                      type="text"
                      variant="outlined"
                      fullWidth
                      size="small"
                      onChange={handleSearchTerm}
                      value={searchTerm}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            {!searchLoading ? (
                              <iconSearch.react
                                tag="div"
                                className="icon-white logo-alignment-style"
                              />
                            ) : (
                              <CircularProgress
                                size={16}
                                aria-label="Loading Spinner"
                                data-testid="loader"
                              />
                            )}
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
                    {treeStructureData.length > 0 &&
                      treeStructureData[0].name !== '' && (
                        <>
                          <Tree
                            className="dataset-tree"
                            data={treeStructureData}
                            openByDefault={searchTerm === '' ? false : true}
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
                                nextPageTokens={nextPageTokens}
                                getBigQueryDatasets={getBigQueryDatasets}
                              />
                            )}
                          </Tree>
                        </>
                      )}
                  </div>
                </div>
              )}
            </div>
          )}
          {apiError && !loginError && !configError && (
            <div className="sidepanel-login-error">
              <p>
                Bigquery API is not enabled for this project. Please{' '}
                <a
                  href={`${BIGQUERY_API_URL}?project=${projectName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-class"
                >
                  enable
                </a>
                <span> it. </span>
              </p>
            </div>
          )}
          {(loginError || configError) && (
            <div className="sidepanel-login-error">
              <LoginErrorComponent
                setLoginError={setLoginError}
                loginError={loginError}
                configError={configError}
                setConfigError={setConfigError}
                app={app}
                fromPage="sidepanel"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export class BigQueryWidget extends DataprocWidget {
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
      <BigQueryComponent
        app={this.app}
        settingRegistry={this.settingRegistry}
        themeManager={this.themeManager}
      />
    );
  }
}
