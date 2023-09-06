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
import CreateRuntime from './createRunTime';
import { JupyterLab } from '@jupyterlab/application';
import { SessionTemplate } from '../utils/listRuntimeTemplateInterface';

const RuntimeTemplateComponent = ({
  app
}: {
  app: JupyterLab;
}): JSX.Element => {
  const [openCreateTemplate, setOpenCreateTemplate] = useState(false);

  const [selectedRuntimeClone, setSelectedRuntimeClone] =
    useState<SessionTemplate>();
  useEffect(() => {
    setSelectedRuntimeClone(undefined);
  });
  return (
    <div>
      {!openCreateTemplate && (
        <CreateRuntime
          setOpenCreateTemplate={setOpenCreateTemplate}
          selectedRuntimeClone={selectedRuntimeClone}
        />
      )}
    </div>
  );
};

export class RuntimeTemplate extends ReactWidget {
  app: JupyterLab;

  constructor(app: JupyterLab) {
    super();
    this.app = app;
  }

  render(): React.JSX.Element {
    return <RuntimeTemplateComponent app={this.app} />;
  }
}
