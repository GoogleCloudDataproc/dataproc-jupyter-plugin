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
import { Kernel, KernelAPI, KernelSpecAPI } from '@jupyterlab/services';
import { iconDisplay } from './utils/utils';
import { dpmsWidget } from './dpms/dpmsWidget';
import dpmsIcon from '../style/icons/dpms_icon.svg';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { TITLE_LAUNCHER_CATEGORY } from './utils/const';
import { RuntimeTemplate } from './runtime/runtimeTemplate';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import dpmsIconDark from '../style/icons/dpms_icon_dark.svg';
import storageIconDark from '../style/icons/Storage-icon-dark.svg';
import { NotebookButtonExtension } from './controls/NotebookButtonExtension';
import { injectToastContainer } from './utils/injectToastContainer';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { GcsBucket } from './gcs/gcsBucket';

const iconDpms = new LabIcon({
  name: 'launcher:dpms-icon',
  svgstr: dpmsIcon
});

const PLUGIN_ID = 'dataproc_jupyter_plugin:plugin';

const extension: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  autoStart: true,
  optional: [
    IFileBrowserFactory,
    ILauncher,
    IMainMenu,
    ILabShell,
    INotebookTracker,
    IThemeManager,
    ISettingRegistry
  ],
  activate: async (
    app: JupyterFrontEnd,
    factory: IFileBrowserFactory,
    launcher: ILauncher,
    mainMenu: IMainMenu,
    labShell: ILabShell,
    notebookTracker: INotebookTracker,
    themeManager: IThemeManager,
    settingRegistry: ISettingRegistry
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
    const iconDpmsDark = new LabIcon({
      name: 'launcher:dpms-icon-dark',
      svgstr: dpmsIconDark
    });
    const iconStorageDark = new LabIcon({
      name: 'launcher:storage-icon-dark',
      svgstr: storageIconDark
    });
    window.addEventListener('beforeunload', () => {
      localStorage.removeItem('notebookValue');
    });

    // React-Toastify needs a ToastContainer to render toasts, since we don't
    // have a global React Root, lets just inject one in the body.
    injectToastContainer();

    // START -- Enable Preview Features.
    const settings = await settingRegistry.load(PLUGIN_ID);

    // The current value of whether or not preview features are enabled.
    let previewEnabled = settings.get('previewEnabled').composite as boolean;
    let panelDpms: Panel | undefined, panelGcs: Panel | undefined;
    settings.changed.connect(() => {
      previewEnabled = settings.get('previewEnabled').composite as boolean;
      onPreviewEnabledChanged();
    });

    /**
     * Handler for when the Jupyter Lab theme changes.
     */
    const onThemeChanged = () => {
      if (!panelDpms || !panelGcs) return;
      const isLightTheme = themeManager.theme
        ? themeManager.isLight(themeManager.theme)
        : true;
      if (isLightTheme) {
        panelDpms.title.icon = iconDpms;
        panelGcs.title.icon = iconStorage;
      } else {
        panelDpms.title.icon = iconDpmsDark;
        panelGcs.title.icon = iconStorageDark;
      }
    };
    themeManager.themeChanged.connect(onThemeChanged);

    /**
     * Helper method for when the preview flag gets updated.  This reads the
     * previewEnabled flag and hides or shows the GCS browser or DPMS explorer
     * as necessary.
     */
    const onPreviewEnabledChanged = () => {
      if (!previewEnabled) {
        // Preview was disabled, tear everything down.
        panelDpms?.dispose();
        panelGcs?.dispose();
        panelDpms = undefined;
        panelGcs = undefined;
      } else {
        // Preview was enabled, (re)create DPMS and GCS.
        panelDpms = new Panel();
        panelDpms.id = 'dpms-tab';
        panelDpms.addWidget(new dpmsWidget(app as JupyterLab, themeManager));
        panelGcs = new Panel();
        panelGcs.id = 'GCS-bucket-tab';
        panelGcs.addWidget(
          new GcsBucket(
            app as JupyterLab,
            factory as IFileBrowserFactory,
            themeManager
          )
        );
        // Update the icons.
        onThemeChanged();
        app.shell.add(panelGcs, 'left', { rank: 1001 });
        app.shell.add(panelDpms, 'left', { rank: 1000 });
      }
    };

    onPreviewEnabledChanged();
    // END -- Enable Preview Features.

    app.docRegistry.addWidgetExtension(
      'Notebook',
      new NotebookButtonExtension(app as JupyterLab, launcher, themeManager)
    );

    const loadDpmsWidget = (value: string) => {
      // If DPMS is not enabled, no-op.
      if (!panelDpms) return;
      const existingWidgets = panelDpms.widgets;
      existingWidgets.forEach(widget => {
        if (widget instanceof dpmsWidget) {
          widget.dispose();
        }
      });
      const newWidget = new dpmsWidget(app as JupyterLab, themeManager);
      panelDpms.addWidget(newWidget);
    };

    let lastClusterName = localStorage.getItem('notebookValue') || '';
    if (lastClusterName) {
      loadDpmsWidget(lastClusterName);
    }

    const onTitleChanged = async (title: Title<Widget>) => {
      const widget = title.owner as NotebookPanel;
      lastClusterName = localStorage.getItem('notebookValue') || '';
      if (widget && widget instanceof NotebookPanel) {
        const kernel = widget.sessionContext.session?.kernel;
        if (kernel) {
          const kernelName = kernel.name;
          const kernelSpec = kernels[kernelName];
          if (
            kernelSpec?.resources?.endpointParentResource?.includes?.(
              '/clusters/'
            )
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
            kernelSpec?.resources?.endpointParentResource?.includes?.(
              '/sessions'
            )
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
      await KernelAPI.listRunning();
      const { oldValue, newValue } = change;
      // Clean up after the old value if it exists,
      // listen for changes to the title of the activity
      if (oldValue) {
        // Check if the old value is an instance of NotebookPanel
        if (oldValue instanceof NotebookPanel) {
          oldValue.title.changed.disconnect(onTitleChanged);
          await KernelAPI.listRunning();
        }
      }
      if (newValue) {
        // Check if the new value is an instance of NotebookPanel

        if (newValue instanceof NotebookPanel) {
          newValue.title.changed.connect(onTitleChanged);
          newValue.toolbar.update();
        } else if (
          (newValue.title.label === 'Launcher' ||
            newValue.title.label === 'Config Setup' ||
            newValue.title.label === 'Clusters' ||
            newValue.title.label === 'Serverless' ||
            newValue.title.label === 'Settings') &&
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
            newValue.title.label !== 'Serverless' &&
            newValue.title.label !== 'Runtime template' &&
            newValue.title.label !== 'Settings'
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
        const content = new RuntimeTemplate(
          app as JupyterLab,
          launcher as ILauncher,
          themeManager
        );
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
        const content = new AuthLogin(
          app as JupyterLab,
          launcher as ILauncher,
          themeManager
        );
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
