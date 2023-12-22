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
import { ILabShell } from '@jupyterlab/application';
import CreateNotebookScheduler from './createNotebookScheduler';

const NotebookSchedulerComponent = ({
  themeManager,
  labShell
}: {
  themeManager: IThemeManager;
  labShell: ILabShell;
}): JSX.Element => {
  return (
    <>
      <CreateNotebookScheduler
        themeManager={themeManager}
        labShell={labShell}
      />
    </>
  );
};

export class NotebookScheduler extends DataprocWidget {
  labShell: ILabShell;
  constructor(labShell: ILabShell, themeManager: IThemeManager) {
    super(themeManager);
    this.labShell = labShell;
  }

  renderInternal(): React.JSX.Element {
    return (
      <NotebookSchedulerComponent
        themeManager={this.themeManager}
        labShell={this.labShell}
      />
    );
  }
}
