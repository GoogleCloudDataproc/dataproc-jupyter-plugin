import React, { useState } from 'react';
import { DataprocWidget } from '../controls/DataprocWidget';
import { JupyterLab } from '@jupyterlab/application';
import { IThemeManager } from '@jupyterlab/apputils';
import ListNotebookScheduler from './listNotebookScheduler';
import ExecutionHistory from './executionHistory';

const NotebookJobComponent = ({
  app
}: {
  app: JupyterLab;
  themeManager: IThemeManager;
}): React.JSX.Element => {
  const [showExecutionHistory, setShowExecutionHistory] = useState(false);
  const [composerName, setComposerName] = useState('');
  const [dagId, setDagId] = useState('');

  const handleDagIdSelection = (composerName: string, dagId: string) => {
    setShowExecutionHistory(true);
    setComposerName(composerName);
    setDagId(dagId);
  };

  const handleBackButton = () => {
    setShowExecutionHistory(false);
  }

  return (
    <>
      {showExecutionHistory ? (
        <ExecutionHistory composerName={composerName} dagId={dagId} handleBackButton={handleBackButton}/>
      ) : (
        <>
          <div className="clusters-list-overlay" role="tab">
            <div className="cluster-details-title">Notebook Job Scheduler</div>
          </div>
          <div>
            <ListNotebookScheduler
              app={app}
              handleDagIdSelection={handleDagIdSelection}
            />
          </div>
        </>
      )}
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
