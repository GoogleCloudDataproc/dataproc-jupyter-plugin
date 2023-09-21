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
  JupyterFrontEndPlugin,
  JupyterLab,
  ILabShell
} from '@jupyterlab/application';
import { MainAreaWidget, IThemeManager } from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import { LabIcon } from '@jupyterlab/ui-components';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { Cluster } from './cluster/cluster';
import { Batches } from './batches/batches';
import clusterIcon from '../style/icons/cluster_icon.svg';
import addRuntimeIcon from '../style/icons/add_runtime_template.svg';
import serverlessIcon from '../style/icons/serverless_icon.svg';
import storageIcon from '../style/icons/storage_icon.svg';
import { Panel, Title, Widget } from '@lumino/widgets';
import { AuthLogin } from './login/authLogin';
import { Kernel, KernelSpecAPI } from '@jupyterlab/services';
import { iconDisplay } from './utils/utils';
import { dpmsWidget } from './dpms/dpmsWidget';
import dpmsIcon from '../style/icons/dpms_icon.svg';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
const iconDpms = new LabIcon({
  name: 'launcher:dpms-icon',
  svgstr: dpmsIcon
});
import { TITLE_LAUNCHER_CATEGORY } from './utils/const';
import { RuntimeTemplate } from './runtime/runtimeTemplate';
import { GcsBucket } from './gcs/gcsBucket';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';

const extension: JupyterFrontEndPlugin<void> = {
  id: 'dataproc_jupyter_plugin:plugin',
  autoStart: true,
  optional: [IFileBrowserFactory, ILauncher, IMainMenu, ILabShell, INotebookTracker, IThemeManager],
  activate: async (
    app: JupyterFrontEnd,
    factory: IFileBrowserFactory,
    launcher: ILauncher,
    mainMenu: IMainMenu,
    labShell: ILabShell,
    notebookTracker: INotebookTracker,
    themeManager: IThemeManager
  ) => {
    const { commands } = app;

    const iconAddRuntime = new LabIcon({
      name: 'launcher:add-runtime-icon',
      svgstr: addRuntimeIcon
    });
    const iconCluster = new LabIcon({
      name: 'launcher:clusters-icon',
      svgstr: clusterIcon
    });
    const iconServerless = new LabIcon({
      name: 'launcher:serverless-icon',
      svgstr: serverlessIcon
    });
    const iconStorage = new LabIcon({
      name: 'launcher:storage-icon',
      svgstr: storageIcon
    });

    window.addEventListener('beforeunload', () => {
      localStorage.removeItem('notebookValue');
    });
    let lastClusterName = '';
    const panel = new Panel();
    panel.id = 'dpms-tab';
    panel.title.icon = iconDpms;
    const loadDpmsWidget = (value: string) => {
      const existingWidgets = panel.widgets;
      existingWidgets.forEach(widget => {
        if (widget instanceof dpmsWidget) {
          widget.dispose();
        }
      });
      const newWidget = new dpmsWidget(app as JupyterLab, themeManager);
      panel.addWidget(newWidget);
    };

  
    panel.addWidget(new dpmsWidget(app as JupyterLab, themeManager));
    lastClusterName = localStorage.getItem('notebookValue') || '';
    if (lastClusterName) {
      loadDpmsWidget(lastClusterName);
    }
    app.shell.add(panel, 'left', { rank: 1000 });

    const panelGcs = new Panel();
    panelGcs.id = 'GCS-bucket-tab';
    panelGcs.title.icon = iconStorage; 
    panelGcs.addWidget(new GcsBucket(app as JupyterLab, factory as IFileBrowserFactory));
    app.shell.add(panelGcs, 'left', { rank: 1001 });

    const onTitleChanged = async (title: Title<Widget>) => {
      const widget = title.owner as NotebookPanel;
      lastClusterName = localStorage.getItem('notebookValue') || '';
      if (widget && widget instanceof NotebookPanel) {
        const kernel = widget.sessionContext.session?.kernel;
        if (kernel) {
          const kernelName = kernel.name;
          const kernelSpec = kernels[kernelName];
          if (
            kernelSpec?.resources.endpointParentResource.includes('/clusters/')
          ) {
            const parts =
              kernelSpec?.resources.endpointParentResource.split('/');
            const clusterValue = parts[parts.length - 1] + '/clusters';
            if (lastClusterName === null) {
              localStorage.setItem('notebookValue', clusterValue);
              lastClusterName = localStorage.getItem('notebookValue') || '';
              loadDpmsWidget(lastClusterName || '');
            } else if (lastClusterName !== clusterValue) {
              localStorage.setItem('notebookValue', clusterValue);
              lastClusterName = localStorage.getItem('notebookValue') || '';
              loadDpmsWidget(lastClusterName || '');
            }
          } else if (
            kernelSpec?.resources.endpointParentResource.includes('/sessions')
          ) {
            const parts = kernelSpec?.name.split('-');
            const sessionValue = parts.slice(1).join('-') + '/sessions';
            if (lastClusterName === null) {
              localStorage.setItem('notebookValue', sessionValue);
              lastClusterName = localStorage.getItem('notebookValue') || '';
              loadDpmsWidget(lastClusterName || '');
            } else if (lastClusterName !== sessionValue) {
              localStorage.setItem('notebookValue', sessionValue);
              lastClusterName = localStorage.getItem('notebookValue') || '';
              loadDpmsWidget(lastClusterName || '');
            }
          }
        } else {
          localStorage.removeItem('notebookValue');
          loadDpmsWidget('');
        }
        document.title = title.label;
      } else {
        document.title = title.label;
      }
      console.log(Kernel);
    };
    labShell.currentChanged.connect(async (_, change) => {
      const { oldValue, newValue } = change;
      // Clean up after the old value if it exists,
      // listen for changes to the title of the activity
      if (oldValue) {
        // Check if the old value is an instance of NotebookPanel
        if (oldValue instanceof NotebookPanel) {
          oldValue.title.changed.disconnect(onTitleChanged);
        }
      }
      if (newValue) {
        // Check if the new value is an instance of NotebookPanel
        if (newValue instanceof NotebookPanel) {
          newValue.title.changed.connect(onTitleChanged);
        } else if (
          (newValue.title.label === 'Launcher' ||
            newValue.title.label === 'Config Setup' ||
            newValue.title.label === 'Clusters' ||
            newValue.title.label === 'Serverless') &&
          lastClusterName !== ''
        ) {
          localStorage.setItem('oldNotebookValue', lastClusterName || '');
          localStorage.removeItem('notebookValue');
          lastClusterName = '';
          loadDpmsWidget('');
        } else {
          if (
            lastClusterName === '' &&
            newValue.title.label !== 'Launcher' &&
            newValue.title.label !== 'Config Setup' &&
            newValue.title.label !== 'Clusters' &&
            newValue.title.label !== 'Serverless'
          ) {
            let oldNotebook = localStorage.getItem('oldNotebookValue');
            localStorage.setItem('notebookValue', oldNotebook || '');
            lastClusterName = localStorage.getItem('notebookValue') || '';
            loadDpmsWidget(oldNotebook || '');
          }
        }
      }
    });

    const kernelSpecs = await KernelSpecAPI.getSpecs();
    const kernels = kernelSpecs.kernelspecs;

    const createRuntimeTemplateComponentCommand =
      'create-runtime-template-component';
    commands.addCommand(createRuntimeTemplateComponentCommand, {
      caption: 'Create a new runtime template',
      label: 'New Runtime Template',
      // @ts-ignore jupyter lab icon command issue
      icon: args => (args['isPalette'] ? null : iconAddRuntime),
      execute: () => {
        const content = new RuntimeTemplate(app as JupyterLab,launcher as ILauncher, themeManager);
        const widget = new MainAreaWidget<RuntimeTemplate>({ content });
        widget.title.label = 'Runtime template';
        widget.title.icon = iconServerless;
        app.shell.add(widget, 'main');
      }
    });

    const createClusterComponentCommand = 'create-cluster-component';
    commands.addCommand(createClusterComponentCommand, {
      caption: 'Create a new Cluster Component',
      label: 'Clusters',
      // @ts-ignore jupyter lab icon command issue
      icon: args => (args['isPalette'] ? null : iconCluster),
      execute: () => {
        const content = new Cluster(themeManager);
        const widget = new MainAreaWidget<Cluster>({ content });
        widget.title.label = 'Clusters';
        widget.title.icon = iconCluster;
        app.shell.add(widget, 'main');
      }
    });

    const createBatchesComponentCommand = 'create-batches-component';
    commands.addCommand(createBatchesComponentCommand, {
      caption: 'Create a new Serverless Component',
      label: 'Serverless',
      // @ts-ignore jupyter lab icon command issue
      icon: args => (args['isPalette'] ? null : iconServerless),
      execute: () => {
        const content = new Batches(themeManager);
        const widget = new MainAreaWidget<Batches>({ content });
        widget.title.label = 'Serverless';
        widget.title.icon = iconServerless;
        app.shell.add(widget, 'main');
      }
    });

    const createAuthLoginComponentCommand = 'cloud-dataproc-settings:configure';
    commands.addCommand(createAuthLoginComponentCommand, {
      label: 'Cloud Dataproc Settings',
      execute: () => {
        const content = new AuthLogin(app as JupyterLab,launcher as ILauncher, themeManager);
        const widget = new MainAreaWidget<AuthLogin>({ content });
        widget.title.label = 'Config Setup';
        widget.title.icon = iconCluster;
        app.shell.add(widget, 'main');
      }
    });

    let serverlessIndex = -1;

    if (launcher) {
      Object.values(kernels).forEach((kernelsData, index) => {
        if (
          kernelsData?.resources.endpointParentResource &&
          kernelsData?.resources.endpointParentResource.includes('/sessions')
        ) {
          const commandNotebook = `notebook:create-${kernelsData?.name}`;
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

          serverlessIndex = index;

          launcher.add({
            command: commandNotebook,
            category: 'Dataproc Serverless Notebooks',
            //@ts-ignore jupyter lab Launcher type issue
            metadata: kernelsData?.metadata,
            rank: index + 1,
            //@ts-ignore jupyter lab Launcher type issue
            args: kernelsData?.argv
          });
        }
      });
      Object.values(kernels).forEach((kernelsData, index) => {
        if (
          kernelsData?.resources.endpointParentResource &&
          !kernelsData?.resources.endpointParentResource.includes('/sessions')
        ) {
          const commandNotebook = `notebook:create-${kernelsData?.name}`;
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
            //@ts-ignore jupyter lab Launcher type issue
            metadata: kernelsData?.metadata,
            rank: index + 1,
            //@ts-ignore jupyter lab Launcher type issue
            args: kernelsData?.argv
          });
        }
      });
      launcher.add({
        command: createRuntimeTemplateComponentCommand,
        category: 'Dataproc Serverless Notebooks',
        rank: serverlessIndex + 2
      });
      launcher.add({
        command: createClusterComponentCommand,
        category: TITLE_LAUNCHER_CATEGORY,
        rank: 1
      });
      launcher.add({
        command: createBatchesComponentCommand,
        category: TITLE_LAUNCHER_CATEGORY,
        rank: 2
      });
    }
  }
};

export default extension;
