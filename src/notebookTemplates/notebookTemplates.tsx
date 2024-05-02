import React, { useEffect, useState } from 'react';
import { DataprocWidget } from '../controls/DataprocWidget';
import { LOGIN_ERROR_MESSAGE, LOGIN_STATE } from '../utils/const';
import { checkConfig } from '../utils/utils';
import ListNotebookTemplates from './listNotebookTemplates';
import { JupyterLab } from '@jupyterlab/application';
import { IThemeManager } from '@jupyterlab/apputils';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { CircularProgress } from '@mui/material';

const NotebookTemplatesComponent = ({
  app,
  themeManager,
  factory
}: {
  app: JupyterLab;
  themeManager: IThemeManager;
  factory: IFileBrowserFactory;
}): JSX.Element => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [configError, setConfigError] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    checkConfig(setLoggedIn, setConfigError, setLoginError);
    const localstorageGetInformation = localStorage.getItem('loginState');
    setLoggedIn(localstorageGetInformation === LOGIN_STATE);
    if (loggedIn) {
      setConfigLoading(false);
    }
  }, []);

  return (
    <div className="component-level">
      {configLoading && !loggedIn && !configError && !loginError && (
        <div className="spin-loader-main">
          <CircularProgress
            className = "spin-loader-custom-style"
            size={18}
            aria-label="Loading Spinner"
            data-testid="loader"
          />
          Loading Templates
        </div>
      )}
      {loginError && (
        <div role="alert" className="login-error">
          {LOGIN_ERROR_MESSAGE}
        </div>
      )}
      {configError && (
        <div role="alert" className="login-error">
          Please configure gcloud with account, project-id and region
        </div>
      )}
      {loggedIn && !configError && !loginError && (
        <div className="clusters-list-component" role="tablist">
          <div>
            <ListNotebookTemplates
              app={app}
              themeManager={themeManager}
              factory={factory}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export class NotebookTemplates extends DataprocWidget {
  app: JupyterLab;
  factory: IFileBrowserFactory;

  constructor(
    app: JupyterLab,
    themeManager: IThemeManager,
    factory: IFileBrowserFactory
  ) {
    super(themeManager);
    this.app = app;
    this.factory = factory;
  }

  renderInternal(): React.JSX.Element {
    return (
      <div className="component-level">
        <NotebookTemplatesComponent
          app={this.app}
          themeManager={this.themeManager}
          factory={this.factory}
        />
      </div>
    );
  }
}
