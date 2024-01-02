import React from 'react';
import { DataprocWidget } from '../controls/DataprocWidget';
import { JupyterLab } from '@jupyterlab/application';
import { IThemeManager } from '@jupyterlab/apputils';
import ListNotebookScheduler from './listNotebookScheduler';

const NotebookJobComponent = ({
  app
}: {
  app: JupyterLab;
  themeManager: IThemeManager;
}): React.JSX.Element => {
  return (
    <>
      <div className="clusters-list-overlay" role="tab">
        <div className="cluster-details-title"> 
          Notebook Job Scheduler
        </div>
      </div>
      <div>
        <ListNotebookScheduler app={app} />
      </div>
    </>
  );
};

export class NotebookJobs extends DataprocWidget {
  app: JupyterLab;

  constructor(app: JupyterLab, themeManager: IThemeManager) {
    super(themeManager);
    this.app = app;
  }
  renderInternal(): React.JSX.Element {
    return (
      <NotebookJobComponent app={this.app} themeManager={this.themeManager} />
    );
  }
}
