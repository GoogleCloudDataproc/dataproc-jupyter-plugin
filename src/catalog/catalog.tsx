import { JupyterLab } from '@jupyterlab/application';
import React, { useEffect, useState } from 'react';
import { Tree, NodeRendererProps, NodeApi } from 'react-arborist';
import { LabIcon } from '@jupyterlab/ui-components';
import rightArrowIcon from 'style/icons/right_arrow_icon.svg';
import downArrowIcon from 'style/icons/down_arrow_icon.svg';
import bigQueryProjectIcon from 'style/icons/bigquery_project_icon.svg';
import { v4 as uuidv4 } from 'uuid';
import { auto } from '@popperjs/core';
import { IThemeManager } from '@jupyterlab/apputils';
import {
  CircularProgress
} from '@mui/material';
import { TitleComponent } from 'controls/SidePanelTitleWidget';
import { BigQueryWidgetService } from 'catalog/bigquery/bigqueryWidgetService';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { DataprocWidget } from 'controls/DataprocWidget';
import { handleDebounce } from 'utils/utils';
import { BIGQUERY_API_URL } from 'utils/const';


const iconRightArrow = new LabIcon({
  name: 'launcher:right-arrow-icon',
  svgstr: rightArrowIcon
});
const iconDownArrow = new LabIcon({
  name: 'launcher:down-arrow-icon',
  svgstr: downArrowIcon
});

const iconBigQueryProject = new LabIcon({
  name: 'launcher:bigquery-project-icon',
  svgstr: bigQueryProjectIcon
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


  const [treeStructureData, setTreeStructureData] = useState<any>([]);

  const [currentNode, setCurrentNode] = useState<any>();
  const [apiError, setApiError] = useState(false);

  const [height, setHeight] = useState(window.innerHeight - 125);
  const [projectName, setProjectName] = useState<string>('');


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
    type: string;
    isLoadMoreNode?: boolean;
    isNodeOpen: boolean;
    description: string;
    children: any;
  }

  const treeStructureforProjects = () => {
    const data = projectNameInfo.map(projectName => ({
      id: uuidv4(),
      name: projectName,
      children: [],
      isNodeOpen: false
    }));

    data.sort((a, b) => a.name.localeCompare(b.name));

    setTreeStructureData(data);
  };

  type NodeProps = NodeRendererProps<IDataEntry> & {
    onClick: (node: NodeRendererProps<IDataEntry>['node']) => void;
  };
  const Node = ({ node, style, onClick}: NodeProps) => {

    const handleToggle = () => {

      if (calculateDepth(node) === 1 && !node.isOpen) {
        setCurrentNode(node);
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
      const hasChildren =
        (node.children && node.children.length > 0) ||
        (depth !== 4 && node.children);
      const arrowIcon = hasChildren && !node.data.isLoadMoreNode ? (
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
      }
      return (
        <>
        </>
      );
    };

    return (
      <>
        <div style={style}>
          {renderNodeIcon()}
          <div
            role="treeitem"
            title={node.data.name}
            onClick={handleTextClick}
          >
            {node.data.name}
          </div>
        </div>
      </>
    );
  };

  const getBigQueryProjects = async (isReset : boolean) => {
    if (isReset) {
      setResetLoading(true);
    }
    await BigQueryWidgetService.getBigQueryProjectsListAPIService(
      setProjectNameInfo,
      setIsLoading,
      setApiError,
      setProjectName
    );
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
    if (treeStructureData.length > 0 && treeStructureData[0].name !== '') {
      setIsLoading(false);
      setResetLoading(false);
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
              {!apiError && (
                <div>
                  <div className="tree-container">
                    {treeStructureData.length > 0 &&
                      treeStructureData[0].name !== '' && (
                        <>
                          <Tree
                            className="dataset-tree"
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
                                onClick={() => {}}
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
          {apiError &&(
            <div className="sidepanel-login-error">
              <p>
                Bigquery API is not enabled for this project.
                Please{' '}
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
