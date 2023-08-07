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

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { MainAreaWidget } from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import { LabIcon } from '@jupyterlab/ui-components';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { Cluster } from './cluster/cluster';
import { Serverless } from './batches/batches';
import clusterIcon from '../style/icons/cluster_icon.svg';
import serverlessIcon from '../style/icons/serverless_icon.svg';
import { Menu } from '@lumino/widgets';
import { AuthLogin } from './login/authLogin';
import { KernelSpecAPI } from '@jupyterlab/services';
import { iconDisplay } from './utils/utils';
import { TITLE_LAUNCHER_CATEGORY } from './utils/const';

const extension: JupyterFrontEndPlugin<void> = {
  id: 'cluster',
  autoStart: true,
  optional: [ILauncher, IMainMenu],
  activate: async (
    app: JupyterFrontEnd,
    launcher: ILauncher,
    mainMenu: IMainMenu
  ) => {
    const { commands } = app;
    const iconCluster = new LabIcon({
      name: 'launcher:clusters-icon',
      svgstr: clusterIcon
    });
    const iconServerless = new LabIcon({
      name: 'launcher:serverless-icon',
      svgstr: serverlessIcon
    });

    const kernelSpecs = await KernelSpecAPI.getSpecs();
    const kernels = kernelSpecs.kernelspecs;

    const createClusterComponentCommand = 'create-cluster-component';
    commands.addCommand(createClusterComponentCommand, {
      caption: 'Create a new Cluster Component',
      label: 'Clusters',
      // @ts-ignore
      icon: args => (args['isPalette'] ? null : iconCluster),
      execute: () => {
        const content = new Cluster();
        const widget = new MainAreaWidget<Cluster>({ content });
        widget.title.label = 'Clusters';
        widget.title.icon = iconCluster;
        app.shell.add(widget, 'main');
      }
    });

    const createServerlessComponentCommand = 'create-serverless-component';
    commands.addCommand(createServerlessComponentCommand, {
      caption: 'Create a new Serverless Component',
      label: 'Serverless',
      // @ts-ignore
      icon: args => (args['isPalette'] ? null : iconServerless),
      execute: () => {
        const content = new Serverless();
        const widget = new MainAreaWidget<Serverless>({ content });
        widget.title.label = 'Serverless';
        widget.title.icon = iconServerless;
        app.shell.add(widget, 'main');
      }
    });

    const createAuthLoginComponentCommand = 'create-authlogin-component';
    commands.addCommand(createAuthLoginComponentCommand, {
      label: 'Setup',
      caption: 'Setup',
      execute: () => {
        const content = new AuthLogin();
        const widget = new MainAreaWidget<AuthLogin>({ content });
        widget.title.label = 'Config Setup';
        widget.title.icon = iconCluster;
        app.shell.add(widget, 'main');
      }
    });

    const snippetMenu = new Menu({ commands });
    snippetMenu.title.label = 'Dataproc';
    snippetMenu.addItem({ command: createAuthLoginComponentCommand });
    mainMenu.addMenu(snippetMenu);

    if (launcher) {
      Object.values(kernels).forEach((kernelsData, index) => {
        if (
          kernelsData?.resources.endpointParentResource &&
          kernelsData?.resources.endpointParentResource.includes('/sessions')
        ) {
          const commandNotebook = `notebook:create-${kernelsData?.display_name}`;
          commands.addCommand(commandNotebook, {
            caption: kernelsData?.display_name,
            label: kernelsData?.display_name,
            icon: iconDisplay(kernelsData),
            execute: async () => {
              const model = await app.commands.execute(
                'docmanager:new-untitled',
                {
                  type: 'notebook',
                  path: '',
                  kernel: { name: kernelsData?.name }
                }
              );
              await app.commands.execute('docmanager:open', {
                kernel: { name: kernelsData?.name },
                path: model.path,
                factory: 'notebook'
              });
            }
          });

          launcher.add({
            command: commandNotebook,
            category: 'Dataproc Serverless Notebooks',
            //@ts-ignore
            metadata: kernelsData?.metadata,
            rank: index + 1,
            //@ts-ignore
            args: kernelsData?.argv
          });
        }
      });
      Object.values(kernels).forEach((kernelsData, index) => {
        if (
          kernelsData?.resources.endpointParentResource &&
          !kernelsData?.resources.endpointParentResource.includes('/sessions')
        ) {
          const commandNotebook = `notebook:create-${kernelsData?.display_name}`;
          commands.addCommand(commandNotebook, {
            caption: kernelsData?.display_name,
            label: kernelsData?.display_name,
            icon: iconDisplay(kernelsData),
            execute: async () => {
              const model = await app.commands.execute(
                'docmanager:new-untitled',
                {
                  type: 'notebook',
                  path: '',
                  kernel: { name: kernelsData?.name }
                }
              );
              await app.commands.execute('docmanager:open', {
                kernel: { name: kernelsData?.name },
                path: model.path,
                factory: 'notebook'
              });
            }
          });

          launcher.add({
            command: commandNotebook,
            category: 'Dataproc Cluster Notebooks',
            //@ts-ignore
            metadata: kernelsData?.metadata,
            rank: index + 1,
            //@ts-ignore
            args: kernelsData?.argv
          });
        }
      });

      // Object.values(kernels).forEach(kernelsData => {
      //   if (kernelsData?.resources.endpointParentResource) {
      //     const commandConsole = `console:create-${kernelsData?.display_name}`;
      //     commands.addCommand(commandConsole, {
      //       caption: kernelsData?.display_name,
      //       label: kernelsData?.display_name,
      //       icon: iconDisplay(kernelsData),
      //       execute: async () => {
      //         await app.commands.execute('console:create', {
      //           activate: true,
      //           kernel: { name: kernelsData?.name }
      //         });

      //         await app.commands.execute('console:open', {
      //           activate: true,
      //           kernel: { name: kernelsData?.name }
      //         });
      //       }
      //     });

      //     launcher.add({
      //       command: commandConsole,
      //       category: 'Dataproc Console',
      //       metadata: kernelsData?.metadata,
      //       args: kernelsData?.argv
      //     });
      //   }
      // });

      launcher.add({
        command: createClusterComponentCommand,
        category: TITLE_LAUNCHER_CATEGORY,
        rank: 1
      });
      launcher.add({
        command: createServerlessComponentCommand,
        category: TITLE_LAUNCHER_CATEGORY,
        rank: 2
      });
    }
  }
};

export default extension;
