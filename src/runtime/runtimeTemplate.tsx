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
import CreateRuntime from './createRunTime';
import { JupyterLab } from '@jupyterlab/application';
import { ISessionTemplate } from '../utils/listRuntimeTemplateInterface';
import { IThemeManager } from '@jupyterlab/apputils';
import { DataprocWidget } from '../controls/DataprocWidget';
import { ILauncher } from '@jupyterlab/launcher';

const RuntimeTemplateComponent = ({
  app,
  launcher,
  themeManager
}: {
  app: JupyterLab;
  launcher: ILauncher;
  themeManager: IThemeManager;
}): JSX.Element => {
  const [openCreateTemplate, setOpenCreateTemplate] = useState(false);

  const [selectedRuntimeClone, setSelectedRuntimeClone] =
    useState<ISessionTemplate>();
  useEffect(() => {
    setSelectedRuntimeClone(undefined);
  });
  return (
    <div>
      {!openCreateTemplate && (
        <CreateRuntime
          setOpenCreateTemplate={setOpenCreateTemplate}
          selectedRuntimeClone={selectedRuntimeClone}
          themeManager={themeManager}
          app={app}
          launcher={launcher}
          fromPage="launcher"
        />
      )}
    </div>
  );
};

export class RuntimeTemplate extends DataprocWidget {
  app: JupyterLab;
  launcher: ILauncher;

  constructor(app: JupyterLab, launcher: ILauncher, themeManager: IThemeManager) {
    super(themeManager);
    this.app = app;
    this.launcher = launcher;
  }

  renderInternal(): React.JSX.Element {
    return (
      <RuntimeTemplateComponent
        app={this.app}
        launcher={this.launcher}
        themeManager={this.themeManager}
      />
    );
  }
}
