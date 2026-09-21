/**
 * @license
 * Copyright 2026 Google LLC
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

import React, { useState } from 'react';
import { JupyterLab } from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import Common from './common';
import RuntimeProfileList from '../runtimeProfile/runtimeProfileList';

interface ISettingsLayoutProps {
  configError: boolean;
  setConfigError: (error: boolean) => void;
  app?: JupyterLab;
  settingRegistry?: ISettingRegistry;
}

export default function SettingsLayout({
  configError,
  setConfigError,
  app,
  settingRegistry
}: ISettingsLayoutProps) {
  const [activeTab, setActiveTab] = useState<'common' | 'spark'>('common');

  return (
    <div className="settings-layout-container">
      <div className="settings-sidebar">
        <div className="settings-sidebar-header">
          Google Cloud Settings
        </div>
        <div
          className={`settings-tab ${activeTab === 'common' ? 'active' : ''}`}
          onClick={() => setActiveTab('common')}
        >
          <span>Common</span>
          <span>&rsaquo;</span>
        </div>
        <div
          className={`settings-tab ${activeTab === 'spark' ? 'active' : ''}`}
          onClick={() => setActiveTab('spark')}
        >
          <span>Spark</span>
          <span>&rsaquo;</span>
        </div>
      </div>

      <div className="settings-content-area">
        {activeTab === 'common' && (
          <Common
            configError={configError}
            setConfigError={setConfigError}
            settingRegistry={settingRegistry}
          />
        )}

        {activeTab === 'spark' && (
          <RuntimeProfileList app={app} />
        )}
      </div>
    </div>
  );
}
