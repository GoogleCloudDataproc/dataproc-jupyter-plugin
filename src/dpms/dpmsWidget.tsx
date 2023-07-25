import { ReactWidget } from '@jupyterlab/apputils';
import { JupyterLab } from '@jupyterlab/application';
import React, { useState } from 'react';
import { Tree, NodeRendererProps } from 'react-arborist';
import { LabIcon } from '@jupyterlab/ui-components';
import databaseIcon from '../../style/icons/database_icon.svg';
import tableIcon from '../../style/icons/table_icon.svg';
import columnsIcon from '../../style/icons/columns_icon.svg';
import refreshIcon from '../../style/icons/refresh_icon.svg';
// import { Widget } from '@lumino/widgets';
import { Database } from './databaseInfo';
import { MainAreaWidget } from '@jupyterlab/apputils';
import { v4 as uuidv4 } from 'uuid';
import 'semantic-ui-css/semantic.min.css';

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
const iconRefresh = new LabIcon({
  name: 'launcher:refresh-icon',
  svgstr: refreshIcon
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

const CounterComponent = ({ app }: { app: JupyterLab }): JSX.Element => {
  const [searchTerm, setSearchTerm] = useState('');

  const data = [
    {
      id: '3',
      name: 'Database 1',
      children: [
        { id: 'c1', name: 'Table1', children: [{ id: 'e1', name: 'column1' }] },
        { id: 'c2', name: 'Table2', children: [{ id: 'e2', name: 'column2' }] },
        { id: 'c3', name: 'Table3', children: [{ id: 'e3', name: 'column3' }] }
      ]
    },
    {
      id: '4',
      name: 'Database 2',
      children: [
        { id: 'd1', name: 'Table1', children: [{ id: 'f1', name: 'column1' }] },
        { id: 'd2', name: 'Table2', children: [{ id: 'f2', name: 'column2' }] },
        { id: 'd3', name: 'Table3', children: [{ id: 'f3', name: 'column3' }] }
      ]
    }
  ];

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const searchMatch = (node: any | string, term: string) => {
    return node.data.name.toLowerCase().includes(term.toLowerCase());
  };

  const handleNodeClick = (node: any) => {
    // Open main area widget with selected node values
    const depth = calculateDepth(node);
    if (depth === 1 || depth === 2) {
      const content = new Database(node.data.name);
      const widget = new MainAreaWidget<Database>({ content });
      const widgetId = `node-widget-${uuidv4()}`;
      widget.id = widgetId;
      // widget.node.innerHTML = node.data.name;
      widget.title.label = node.data.name;
      widget.title.closable = true;

      // Add the widget to the main area
      app.shell.add(widget, 'main');
    }
  };

  return (
    <>
      <div>
        <div className="dpms-title">Dataproc Metastore</div>
        <div className="refresh-icon">
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
            <i className="search icon"></i>
          </div>
        </div>
      </div>
      <div style={{ marginLeft: '20px' }}>
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
      </div>
    </>
  );
};

type NodeProps = NodeRendererProps<any> & {
  onClick: (node: any) => void;
};

function Node({ node, style, dragHandle, onClick }: NodeProps) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  const renderNodeIcon = () => {
    const depth = calculateDepth(node);

    const hasChildren = node.children && node.children.length > 0;

    const arrowIcon = hasChildren ? (
      expanded ? (
        <i className="caret right icon large" onClick={handleToggle}></i>
      ) : (
        <i className="caret down icon large" onClick={handleToggle}></i>
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
      onMouseDown={() => onClick(node)}
    >
      {renderNodeIcon()} {node.data.name}
    </div>
  );
}

export class dpmsWidget extends ReactWidget {
  app: JupyterLab;

  constructor(app: JupyterLab) {
    super();
    this.app = app;
    this.addClass('jp-ReactWidget');
  }

  render(): JSX.Element {
    return <CounterComponent app={this.app} />;
  }
}
