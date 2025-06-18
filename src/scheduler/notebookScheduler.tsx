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

import React from 'react';

import { IThemeManager } from '@jupyterlab/apputils';
import { DataprocWidget } from '../controls/DataprocWidget';
import { JupyterLab } from '@jupyterlab/application';
import CreateNotebookScheduler from './createNotebookScheduler';

import { DocumentRegistry } from '@jupyterlab/docregistry';
import { INotebookModel } from '@jupyterlab/notebook';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

const NotebookSchedulerComponent = ({
  themeManager,
  app,
  context,
  settingRegistry
}: {
  themeManager: IThemeManager;
  app: JupyterLab;
  context: DocumentRegistry.IContext<INotebookModel> | string;
  settingRegistry: ISettingRegistry;
}): JSX.Element => {
  return (
    <div className="component-level">
      <CreateNotebookScheduler
        themeManager={themeManager}
        app={app}
        context={context}
        settingRegistry={settingRegistry}
      />
    </div>
  );
};

export class NotebookScheduler extends DataprocWidget {
  app: JupyterLab;
  context: DocumentRegistry.IContext<INotebookModel> | string;
  settingRegistry: ISettingRegistry;

  constructor(
    app: JupyterLab,
    themeManager: IThemeManager,
    settingRegistry: ISettingRegistry,
    context: DocumentRegistry.IContext<INotebookModel> | string
  ) {
    super(themeManager);
    this.app = app;
    this.context = context;
    this.settingRegistry = settingRegistry;
  }

  renderInternal(): React.JSX.Element {
    return (
      <NotebookSchedulerComponent
        themeManager={this.themeManager}
        app={this.app}
        context={this.context}
        settingRegistry={this.settingRegistry}
      />
    );
  }
}
