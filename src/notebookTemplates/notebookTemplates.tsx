import React, { useEffect, useState } from 'react';
import { DataprocWidget } from '../controls/DataprocWidget';
import { LOGIN_STATE } from '../utils/const';
import { checkConfig } from '../utils/utils';
import ListNotebookTemplates from './listNotebookTemplates';
import { JupyterLab } from '@jupyterlab/application';
import { IThemeManager } from '@jupyterlab/apputils';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { CircularProgress } from '@mui/material';
import LoginErrorComponent from '../utils/loginErrorComponent';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

const NotebookTemplatesComponent = ({
  app,
  themeManager,
  factory,
  settingRegistry
}: {
  app: JupyterLab;
  themeManager: IThemeManager;
  factory: IFileBrowserFactory;
  settingRegistry: ISettingRegistry;
}): JSX.Element => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [configError, setConfigError] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    checkConfig(setLoggedIn, setConfigError, setLoginError);
    setLoggedIn((!loginError && !configError).toString() === LOGIN_STATE);
    if (loggedIn) {
      setConfigLoading(false);
    }
  }, []);

  return (
    <div className="component-level">
      {configLoading && !loggedIn && !configError && !loginError && (
        <div className="spin-loader-main">
          <CircularProgress
            className="spin-loader-custom-style"
            size={18}
            aria-label="Loading Spinner"
            data-testid="loader"
          />
          Loading Templates
        </div>
      )}
      {(loginError || configError) && (
        <div className="login-error-parent">
          <LoginErrorComponent
            setLoginError={setLoginError}
            loginError={loginError}
            configError={configError}
            setConfigError={setConfigError}
            settingRegistry={settingRegistry}
            app={app}
          />
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
  settingRegistry: ISettingRegistry;

  constructor(
    app: JupyterLab,
    themeManager: IThemeManager,
    factory: IFileBrowserFactory,
    settingRegistry: ISettingRegistry
  ) {
    super(themeManager);
    this.app = app;
    this.factory = factory;
    this.settingRegistry = settingRegistry;
  }

  renderInternal(): React.JSX.Element {
    return (
      <div className="component-level">
        <NotebookTemplatesComponent
          app={this.app}
          themeManager={this.themeManager}
          factory={this.factory}
          settingRegistry={this.settingRegistry}
        />
      </div>
    );
  }
}
