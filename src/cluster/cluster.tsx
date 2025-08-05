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
import JobComponent from '../jobs/jobs';
import { checkConfig } from '../utils/utils';
import ClusterDetails from './clusterDetails';
import ListCluster from './listCluster';
import { DataprocWidget } from '../controls/DataprocWidget';
import { CircularProgress } from '@mui/material';
import LoginErrorComponent from '../utils/loginErrorComponent';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IThemeManager } from '@jupyterlab/apputils';
import { JupyterLab } from '@jupyterlab/application';

const ClusterComponent = ({
  settingRegistry,
  app
}: {
  settingRegistry: ISettingRegistry;
  app: JupyterLab;
}): React.JSX.Element => {
  type Mode = 'Clusters' | 'Serverless' | 'Jobs';

  const [detailedJobView, setDetailedJobView] = useState(false);
  const [submitJobView, setSubmitJobView] = useState(false);
  const [selectedMode, setSelectedMode] = useState<Mode>('Clusters');
  const [clusterSelected, setClusterSelected] = useState<string>('');
  const [detailedView, setDetailedView] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [configError, setConfigError] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [selectedJobClone, setSelectedJobClone] = useState({});

  const selectedModeChange = (mode: Mode) => {
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
          Loading Clusters
        </div>
      )}
      {loggedIn && !loginError && !configError && (
        <>
          {detailedView && (
            <ClusterDetails
              clusterSelected={clusterSelected}
              setDetailedView={setDetailedView}
              detailedJobView={detailedJobView}
              setDetailedJobView={setDetailedJobView}
              submitJobView={submitJobView}
              selectedJobClone={selectedJobClone}
              setSelectedJobClone={setSelectedJobClone}
              setSubmitJobView={setSubmitJobView}
            />
          )}
          {!detailedView && !configError && !loginError && (
            <div className="clusters-list-component" role="tablist">
              {!detailedJobView && !submitJobView && (
                <div className="clusters-list-overlay" role="tab">
                  <div
                    role="tabpanel"
                    className={toggleStyleSelection('Clusters')}
                    onClick={() => selectedModeChange('Clusters')}
                  >
                    Clusters
                  </div>
                  <div
                    role="tabpanel"
                    className={toggleStyleSelection('Jobs')}
                    onClick={() => selectedModeChange('Jobs')}
                  >
                    Jobs
                  </div>
                </div>
              )}
              <div>
                {selectedMode === 'Jobs' ? (
                  <JobComponent
                    fromPage="clusters"
                    detailedJobView={detailedJobView}
                    setDetailedJobView={setDetailedJobView}
                    submitJobView={submitJobView}
                    setSubmitJobView={setSubmitJobView}
                    setDetailedView={setDetailedView}
                    selectedJobClone={selectedJobClone}
                    setSelectedJobClone={setSelectedJobClone}
                  />
                ) : (
                  <ListCluster
                    setClusterSelected={setClusterSelected}
                    detailedView={detailedView}
                    setDetailedView={setDetailedView}
                    setLoggedIn={setLoggedIn}
                  />
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export class Cluster extends DataprocWidget {
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
      <ClusterComponent settingRegistry={this.settingRegistry} app={this.app} />
    );
  }
}
