/**
 * @license
 * Copyright 2023 Google LLC
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

import React, { useEffect, useState } from 'react';
import ListBatches from './listBatches';
import ListSessions from '../sessions/listSessions';
import { DataprocWidget } from '../controls/DataprocWidget';
import { checkConfig } from '../utils/utils';
import { CircularProgress } from '@mui/material';
import LoginErrorComponent from '../utils/loginErrorComponent';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IThemeManager } from '@jupyterlab/apputils';
import { JupyterLab } from '@jupyterlab/application';

const BatchesComponent = ({
  settingRegistry,
  app
}: {
  settingRegistry: ISettingRegistry;
  app: JupyterLab;
}): React.JSX.Element => {
  const [selectedMode, setSelectedMode] = useState('Batches');

  const [loggedIn, setLoggedIn] = useState(false);
  const [configError, setConfigError] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);

  const selectedModeChange = (mode: 'Sessions' | 'Batches') => {
    setSelectedMode(mode);
  };

  const toggleStyleSelection = (toggleItem: string) => {
    if (selectedMode === toggleItem) {
      return 'selected-header';
    } else {
      return 'unselected-header';
    }
  };

  useEffect(() => {
    const handleConfigCheck = async () => {
      await checkConfig(setLoggedIn, setConfigError, setLoginError);
      setLoggedIn(!loginError && !configError);
      if (!loginError && !configError) {
        setConfigLoading(false);
      }
    };

    handleConfigCheck();
  }, []);

  return (
    <div className="component-level">
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
      {configLoading && !loggedIn && !configError && !loginError && (
        <div className="spin-loader-main">
          <CircularProgress
            className="spin-loader-custom-style"
            size={18}
            aria-label="Loading Spinner"
            data-testid="loader"
          />
          Loading Batches
        </div>
      )}
      {loggedIn && !configError && !loginError && (
        <div className="clusters-list-component" role="tablist">
          {
            <div className="clusters-list-overlay" role="tab">
              <div
                role="tabpanel"
                className={toggleStyleSelection('Batches')}
                onClick={() => selectedModeChange('Batches')}
              >
                Batches
              </div>
              <div
                role="tabpanel"
                className={toggleStyleSelection('Sessions')}
                onClick={() => selectedModeChange('Sessions')}
              >
                Sessions
              </div>
            </div>
          }
          <div>
            {selectedMode === 'Sessions' ? (
              <ListSessions />
            ) : (
              <ListBatches setLoggedIn={setLoggedIn} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export class Batches extends DataprocWidget {
  settingRegistry: ISettingRegistry;
  app: JupyterLab;
  constructor(
    settingRegistry: ISettingRegistry,
    app: JupyterLab,
    themeManager: IThemeManager
  ) {
    super(themeManager);
    this.settingRegistry = settingRegistry;
    this.app = app;
  }

  renderInternal(): React.JSX.Element {
    return (
      <BatchesComponent settingRegistry={this.settingRegistry} app={this.app} />
    );
  }
}
