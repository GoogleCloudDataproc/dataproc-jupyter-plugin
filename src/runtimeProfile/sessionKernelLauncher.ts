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

import { JupyterLab } from '@jupyterlab/application';
import { IThemeManager } from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import { KernelSpecAPI } from '@jupyterlab/services';
import { iconDisplay } from '../utils/utils';

/**
 * Adds newly available Dataproc Serverless session kernels to the JupyterLab
 * launcher, mirroring the runtime template create flow in createRunTime.tsx.
 */
export const registerSessionKernelsInLauncher = async (
  app: JupyterLab,
  launcher: ILauncher,
  themeManager?: IThemeManager
): Promise<void> => {
  const kernelSpecs = await KernelSpecAPI.getSpecs();
  const kernels = kernelSpecs.kernelspecs;
  const { commands } = app;

  Object.values(kernels).forEach((kernelsData, index) => {
    const commandNotebook = `notebook:create-${kernelsData?.name}`;
    if (
      !kernelsData?.resources?.endpointParentResource?.includes('/sessions') ||
      commands.hasCommand(commandNotebook)
    ) {
      return;
    }

    commands.addCommand(commandNotebook, {
      caption: kernelsData?.display_name,
      label: kernelsData?.display_name,
      icon: themeManager
        ? () => iconDisplay(kernelsData, themeManager)
        : undefined,
      execute: async () => {
        const model = await app.commands.execute('docmanager:new-untitled', {
          type: 'notebook',
          path: '',
          kernel: { name: kernelsData?.name }
        });
        await app.commands.execute('docmanager:open', {
          kernel: { name: kernelsData?.name },
          path: model.path,
          factory: 'notebook'
        });
      }
    });

    launcher.add({
      command: commandNotebook,
      category: 'Dataproc Serverless Spark',
      //@ts-ignore jupyter lab Launcher type issue
      metadata: kernelsData?.metadata,
      rank: index + 1,
      //@ts-ignore jupyter lab Launcher type issue
      args: kernelsData?.argv
    });
  });
};
