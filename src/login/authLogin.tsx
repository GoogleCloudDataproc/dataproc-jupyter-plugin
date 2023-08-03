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

import { ReactWidget } from '@jupyterlab/apputils';
import React, { useEffect, useState } from 'react';
import { LabIcon } from '@jupyterlab/ui-components';
import signinGoogleIcon from '../../style/icons/signin_google_icon.svg';
import { requestAPI } from '../handler/handler';
import ConfigSelection from './configSelection';
import { LOGIN_STATE, STATUS_SUCCESS } from '../utils/const';
import { checkConfig } from '../utils/utils';
import { ClipLoader } from 'react-spinners';

// Create the LabIcon instance outside of the component
const IconsigninGoogle = new LabIcon({
  name: 'launcher:signin_google_icon',
  svgstr: signinGoogleIcon
});

const AuthLoginComponent = (): React.JSX.Element => {
  const [loginState, setLoginState] = useState(false);
  const [isloginDisabled, setIsloginDisabled] = useState(false);
  const [configError, setConfigError] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);

  const login = async () => {
    setIsloginDisabled(true);
    const data = await requestAPI('login');
    if (typeof data === 'object' && data !== null) {
      const loginStatus = (data as { login: string }).login;
      if (loginStatus === STATUS_SUCCESS) {
        setLoginState(true);
        setLoginError(false);
        localStorage.setItem('loginState', LOGIN_STATE);
      } else {
        setLoginState(false);
        localStorage.clear();
      }
    }
  };

  useEffect(() => {
    checkConfig(setLoginState, setConfigError, setLoginError);
    const localstorageGetInformation = localStorage.getItem('loginState');
    setLoginState(localstorageGetInformation === LOGIN_STATE);
    if (loginState) {
      setConfigLoading(false);
    }
  }, []);

  return (
    <div>
      {configLoading && !loginState && !configError && !loginError && (
        <div className="spin-loaderMain">
          <ClipLoader
            color="#8A8A8A"
            loading={true}
            size={18}
            aria-label="Loading Spinner"
            data-testid="loader"
          />
          Loading Config Setup
        </div>
      )}
      {!loginError && loginState && (
        <ConfigSelection
          loginState={loginState}
          configError={configError}
          setConfigError={setConfigError}
        />
      )}
      {loginError && (
        <>
          <div className="login-error">Please login to continue</div>
          <div style={{ alignItems: 'center' }}>
            <div
              className={
                isloginDisabled
                  ? 'signin-google-icon disabled'
                  : 'signin-google-icon'
              }
              onClick={isloginDisabled ? undefined : login}
            >
              <IconsigninGoogle.react tag="div" />
            </div>
          </div>
        </>
      )}
      {configError && (
        <div className="login-error">
          Please Configure Gcloud with Account, Project ID and Region
        </div>
      )}
    </div>
  );
};

export class AuthLogin extends ReactWidget {
  constructor() {
    super();
    this.addClass('jp-ReactWidget');
  }

  render(): React.JSX.Element {
    return <AuthLoginComponent />;
  }
}
