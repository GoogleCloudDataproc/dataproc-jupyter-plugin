/**
 * @license
 * Copyright 2024 Google LLC
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
import bigQueryProjectIcon from '../../style/icons/bigquery_project_icon.svg';
import datasetIcon from '../../style/icons/dataset_icon.svg';
import tableIcon from '../../style/icons/table_icon.svg';
import columnsIcon from '../../style/icons/columns_icon.svg';
import databaseWidgetIcon from '../../style/icons/database_widget_icon.svg';
import datasetsIcon from '../../style/icons/datasets_icon.svg';
import searchIcon from '../../style/icons/search_icon.svg';
import rightArrowIcon from '../../style/icons/right_arrow_icon.svg';
import downArrowIcon from '../../style/icons/down_arrow_icon.svg';
import searchClearIcon from '../../style/icons/search_clear_icon.svg';
import { MainAreaWidget } from '@jupyterlab/apputils';
import { v4 as uuidv4 } from 'uuid';
import { auto } from '@popperjs/core';
import { ClipLoader } from 'react-spinners';
import { IThemeManager } from '@jupyterlab/apputils';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import { TitleComponent } from '../controls/SidePanelTitleWidget';
import { BigQueryService } from './bigQueryService';
import { authApi } from '../utils/utils';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { BigQueryDatasetWrapper } from './bigQueryDatasetInfoWrapper';
import { BigQueryTableWrapper } from './bigQueryTableInfoWrapper';

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

  const [projectNameInfo, setProjectNameInfo] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [notebookValue, setNotebookValue] = useState<string>('');
  const [dataprocMetastoreServices, setDataprocMetastoreServices] =
    useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [noDpmsInstance, setNoDpmsInstance] = useState(false);
  const [databaseNames, setDatabaseNames] = useState<string[]>([]);
  const [schemaError, setSchemaError] = useState(false);

  const [dataSetResponse, setDataSetResponse] = useState<any>();
  const [tableResponse, setTableResponse] = useState<any>();
  const [schemaResponse, setSchemaResponse] = useState<any>();

  const [treeStructureData, setTreeStructureData] = useState<any>([]);

  const [currentNode, setCurrentNode] = useState<any>();

  const getBigQueryColumnDetails = async (
    tableId: string,
    datasetId: string
  ) => {
    await BigQueryService.getBigQueryColumnDetailsAPIService(
      datasetId,
      tableId,
      setSchemaResponse
    );
  };

  interface IDataEntry {
    id: string;
    name: string;
    type: string;
    description: string;
    children: any;
  }

  const treeStructureforDatasets = () => {
    const data = [
      {
        id: uuidv4(),
        name: projectNameInfo,
        children: databaseNames.map(datasetName => ({
          id: uuidv4(),
          name: datasetName,
          children: []
        }))
      }
    ];

    data.sort((a, b) => a.name.localeCompare(b.name));

    data.forEach(db => {
      db.children.sort((a, b) => a.name.localeCompare(b.name));
    });

    setTreeStructureData(data);
  };

  const treeStructureforTables = () => {
    let tempData = [...treeStructureData];

    tempData[0].children.forEach((dataset: any) => {
      if (tableResponse.length > 0 && tableResponse[0].tableReference) {
        if (dataset.name === tableResponse[0].tableReference.datasetId) {
          dataset['children'] = tableResponse.map((tableDetails: any) => ({
            id: uuidv4(),
            name: tableDetails.tableReference.tableId,
            children: []
          }));
        }
      } else {
        if (dataset.name === tableResponse) {
          dataset['children'] = false;
        }
      }
    });
    setTreeStructureData(tempData);
  };

  const treeStructureforSchema = () => {
    let tempData = [...treeStructureData];

    tempData[0].children.forEach((dataset: any) => {
      if (dataset.name === schemaResponse.tableReference.datasetId) {
        dataset.children.forEach((table: any) => {
          if (table.name === schemaResponse.tableReference.tableId) {
            if (schemaResponse.schema?.fields) {
              table['children'] = schemaResponse.schema?.fields.map(
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
    setTreeStructureData(tempData);
  };

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
      if (depth === 2) {
        const content = new BigQueryDatasetWrapper(node.data.name, themeManager);
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
      } else if (depth === 3 && node.parent) {
        const database = node.parent.data.name;
        
        const content = new BigQueryTableWrapper(
          node.data.name,
          database,
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
  };
  type NodeProps = NodeRendererProps<IDataEntry> & {
    onClick: (node: NodeRendererProps<IDataEntry>['node']) => void;
  };
  const Node = ({ node, style, onClick }: NodeProps) => {
    const handleToggle = () => {
      if (calculateDepth(node) === 2) {
        setCurrentNode(node);
        getBigQueryTables(node.data.name); 
      } else if (calculateDepth(node) === 3 && node.parent) {
        setCurrentNode(node);
        getBigQueryColumnDetails(node.data.name, node.parent?.data?.name);   
      } else {
        node.toggle();
      }
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
      const hasChildren =
        (node.children && node.children.length > 0) ||
        (depth !== 4 && node.children);
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
      ) : (
        <div style={{ width: '29px' }}></div>
      );
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
        ) : (
          <div style={{ width: '29px' }}></div>
        );
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
                <iconDataset.react
                  tag="div"
                  className="icon-white logo-alignment-style"
                />
              </div>
            </>
          );
        } else if (depth === 3) {
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
              <iconDataset.react
                tag="div"
                className="icon-white logo-alignment-style"
              />
            </div>
          </>
        );
      } else if (depth === 3) {
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
              ? node.data.children[0]?.tableDescription
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

  const getBigQueryDatasets = async () => {
    const credentials: any = await authApi();
    if (credentials) {
      setProjectNameInfo(credentials.project_id);
    }
    await BigQueryService.getBigQueryDatasetsAPIService(
      notebookValue,
      settingRegistry,
      setDatabaseNames,
      setDataSetResponse,
      setSchemaError,
      setIsLoading
    );
  };

  const getBigQueryTables = async (datasetId: string) => {
    await BigQueryService.getBigQueryTableAPIService(
      notebookValue,
      datasetId,
      setDatabaseNames,
      setTableResponse,
      setSchemaError
    );
  };

  const getActiveNotebook = () => {
    const notebookVal = localStorage.getItem('notebookValue');
    if (notebookVal?.includes('bigframes')) {
      setNotebookValue('bigframes');
      setDataprocMetastoreServices('bigframes');
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
    getBigQueryDatasets();
  }, [dataprocMetastoreServices]);

  useEffect(() => {
    treeStructureforDatasets();
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
    }
    if (currentNode) {
      currentNode?.toggle();
    }
  }, [treeStructureData]);

  return (
    <div className="dpms-Wrapper">
      <TitleComponent titleStr="Dataset Explorer" isPreview />
      {!noDpmsInstance ? (
        <>
          <div>
            {isLoading ? (
              <div className="database-loader">
                <div>
                  <ClipLoader
                    color="#3367d6"
                    loading={true}
                    size={20}
                    aria-label="Loading Spinner"
                    data-testid="loader"
                  />
                </div>
                Loading datasets
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
                  {treeStructureData.length > 0 &&
                    treeStructureData[0].name !== '' && (
                      <Tree
                        className="dataset-tree"
                        data={treeStructureData}
                        openByDefault={false}
                        indent={24}
                        width={auto}
                        height={765}
                        rowHeight={36}
                        overscanCount={1}
                        paddingTop={30}
                        paddingBottom={10}
                        padding={25}
                        searchTerm={searchTerm}
                        searchMatch={searchMatch}
                        idAccessor={(node: any) => node.id}
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
      ) : schemaError ? (
        <div className="dpms-error">No schema available</div>
      ) : (
        <div className="dpms-error">DPMS schema explorer not set up</div>
      )}
    </div>
  );
};

export default BigQueryComponent;
