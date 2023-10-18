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
import { JupyterLab } from '@jupyterlab/application';
import { IThemeManager } from '@jupyterlab/apputils';
import { DataprocWidget } from '../controls/DataprocWidget';
import { ILauncher } from '@jupyterlab/launcher';
import SessionDetails from './sessionDetails';

const SessionTemplateComponent = ({
  app,
  launcher,
  themeManager,
  sessionId
}: {
  app: JupyterLab;
  launcher: ILauncher;
  themeManager: IThemeManager;
  sessionId: string;
}): JSX.Element => {
const [detailedSessionView,setDetailedSessionView] = useState(true);
  useEffect(() => {
  });
  return (
    <div>
     {detailedSessionView && (
        <SessionDetails
          sessionSelected={sessionId}
          setDetailedSessionView={setDetailedSessionView}
          detailedSessionView={detailedSessionView}
          fromPage = 'Launcher'
          app ={app}
        />
      )}
    </div>
  );
};

export class SessionTemplate extends DataprocWidget {
  app: JupyterLab;
  launcher: ILauncher;
  sessionId: string;

  constructor(app: JupyterLab, launcher: ILauncher, themeManager: IThemeManager, sessionId: string) {
    super(themeManager);
    this.app = app;
    this.launcher = launcher;
    this.sessionId = sessionId;
  }

  renderInternal(): React.JSX.Element {
    return (
      <SessionTemplateComponent
        app={this.app}
        launcher={this.launcher}
        themeManager={this.themeManager}
        sessionId = {this.sessionId}
      />
    );
  }
}
