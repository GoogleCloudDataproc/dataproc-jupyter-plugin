/**
 * @license
 * Copyright 2025 Google LLC
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

import React from 'react';
import { LabIcon } from '@jupyterlab/ui-components';
import signinGoogleIcon from '../../style/icons/signin_google_icon.svg';
import { login } from './utils';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { JupyterLab } from '@jupyterlab/application';

// Create the Google Sign-in Icon
const IconsigninGoogle = new LabIcon({
  name: 'launcher:signin_google_icon',
  svgstr: signinGoogleIcon
});

interface LoginErrorProps {
  loginError?: boolean;
  configError?: boolean;
  setLoginError: React.Dispatch<React.SetStateAction<boolean>>;
  setConfigError: React.Dispatch<React.SetStateAction<boolean>>;
  settingRegistry?: ISettingRegistry;
  app?: JupyterLab;
  fromPage?: string;
}

const LoginErrorComponent: React.FC<LoginErrorProps> = ({
  loginError = false,
  configError = false,
  setLoginError,
  setConfigError,
  app,
  fromPage
}) => {
  const handleConfigButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (app) {
      app.commands.execute('cloud-dataproc-settings:configure');
    }
  };

  if (configError) {
    return (
      <>
        <div
          className={
            fromPage === 'sidepanel' ? 'sidepanel-login-error' : 'login-error-parent'
          }
        >
          Please configure gcloud with account, project-id and region
        </div>
          <div style={{ alignItems: 'center' }}>
        <button className="config-button" onClick={handleConfigButtonClick}>
          Configure Settings
        </button>
        </div>
      </>
    );
  }

  if (loginError) {
    return (
      <>
        <div
          className={
            fromPage === 'sidepanel' ? 'sidepanel-login-error' : 'login-error-parent'
          }
        >
          Please login to continue
        </div>
        <div style={{ alignItems: 'center' }}>
          <div
            role="button"
            className={
            fromPage === 'sidepanel' ? 'sidepanel-signin-google-icon' :  'signin-google-icon'
          }

            onClick={() => login(setLoginError)}
          >
            <IconsigninGoogle.react
              tag="div"
              className="logo-alignment-style"
            />
          </div>
        </div>
      </>
    );
  }

  return null;
};

export default LoginErrorComponent;
