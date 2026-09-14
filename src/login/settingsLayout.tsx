import React, { useState } from 'react';
import { IThemeManager } from '@jupyterlab/apputils';
import { JupyterLab } from '@jupyterlab/application';
import { ILauncher } from '@jupyterlab/launcher';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import '../../style/settingsLayout.css';
import Common from './common';
import RuntimeProfileList from '../runtimeProfile/runtimeProfileList';

interface ISettingsLayoutProps {
  configError: boolean;
  setConfigError: (error: boolean) => void;
  app?: JupyterLab;
  launcher?: ILauncher;
  settingRegistry?: ISettingRegistry;
  themeManager: IThemeManager;
}

export default function SettingsLayout({
  configError,
  setConfigError,
  app,
  launcher,
  settingRegistry,
  themeManager
}: ISettingsLayoutProps) {
  const [activeTab, setActiveTab] = useState<'common' | 'spark'>('common');

  return (
    <div className="settings-Layout-container">
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
            app={app}
            launcher={launcher}
            settingRegistry={settingRegistry}
            themeManager={themeManager}
          />
        )}

        {activeTab === 'spark' && (
          <RuntimeProfileList />
        )}
      </div>
    </div>
  );
}
