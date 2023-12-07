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
import { DataprocWidget } from '../controls/DataprocWidget';
import { LOGIN_ERROR_MESSAGE, LOGIN_STATE } from '../utils/const';
import { ClipLoader } from 'react-spinners';
import { checkConfig } from '../utils/utils';

const TemplatesComponent = (): React.JSX.Element => {
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
          <ClipLoader
            color="#3367d6"
            loading={true}
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
          {
            <div className="clusters-list-overlay" role="tab">
              <div>
                Templates
              </div>
          
            </div>
          }
        </div>
      )}
    </div>
  );
};

export class Templates extends DataprocWidget {
  renderInternal(): React.JSX.Element {
    return <TemplatesComponent />;
  }
}
