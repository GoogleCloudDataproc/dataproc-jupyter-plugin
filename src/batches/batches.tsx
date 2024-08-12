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
import { LOGIN_ERROR_MESSAGE, LOGIN_STATE } from '../utils/const';
import { checkConfig } from '../utils/utils';
import { CircularProgress } from '@mui/material';

const BatchesComponent = (): React.JSX.Element => {
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
          Loading Batches
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
  renderInternal(): React.JSX.Element {
    return <BatchesComponent />;
  }
}
