import React, { useState } from 'react';
import { IThemeManager } from '@jupyterlab/apputils';
import { JupyterLab } from '@jupyterlab/application';
import { ILauncher } from '@jupyterlab/launcher';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import '../../style/settingsLayout.css';

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
          <div className="settings-component">
            {/* Common settings component to be added here */}
          </div>
        )}

        {activeTab === 'spark' && (
          <div className="settings-component">
            {/* serverless listing component to be added here */}
          </div>
        )}
      </div>
    </div>
  );
}
