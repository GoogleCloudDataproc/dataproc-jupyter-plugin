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
import { NotebookTemplates } from './notebookTemplates/notebookTemplates';
import clusterIcon from '../style/icons/cluster_icon.svg';
import addRuntimeIcon from '../style/icons/add_runtime_template.svg';
import serverlessIcon from '../style/icons/serverless_icon.svg';
import notebookTemplateIcon from '../style/icons/notebook_template_icon.svg';
import scheduledNotebooksIcon from '../style/icons/scheduled_notebooks_icon.svg';
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
import {
  IFileBrowserFactory,
  IDefaultFileBrowser
} from '@jupyterlab/filebrowser';
import dpmsIconDark from '../style/icons/dpms_icon_dark.svg';
import storageIconDark from '../style/icons/Storage-icon-dark.svg';
import { NotebookButtonExtension } from './controls/NotebookButtonExtension';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { GCSDrive } from './gcs/gcsDrive';
import { GcsBrowserWidget } from './gcs/gcsBrowserWidget';
import { DataprocLoggingService } from './utils/loggingService';
import { NotebookJobs } from './scheduler/notebookJobs';

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
    IDefaultFileBrowser,
    ILauncher,
    IMainMenu,
    ILabShell,
    INotebookTracker,
    IThemeManager,
    ISettingRegistry,
    IDocumentManager
  ],
  activate: async (
    app: JupyterFrontEnd,
    factory: IFileBrowserFactory,
    defaultFileBrowser: IDefaultFileBrowser,
    launcher: ILauncher,
    mainMenu: IMainMenu,
    labShell: ILabShell,
    notebookTracker: INotebookTracker,
    themeManager: IThemeManager,
    settingRegistry: ISettingRegistry,
    documentManager: IDocumentManager
  ) => {
    DataprocLoggingService.attach();
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
    const iconScheduledNotebooks = new LabIcon({
      name: 'launcher:scheduled-notebooks-icon',
      svgstr: scheduledNotebooksIcon
    });
    const iconNotebookTemplate = new LabIcon({
      name: 'launcher:notebook-template-icon',
      svgstr: notebookTemplateIcon
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

    // START -- Enable Preview Features.
    const settings = await settingRegistry.load(PLUGIN_ID);

    // The current value of whether or not preview features are enabled.
    let previewEnabled = settings.get('previewEnabled').composite as boolean;
    let panelDpms: Panel | undefined, panelGcs: Panel | undefined;
    let gcsDrive: GCSDrive | undefined;
    settings.changed.connect(() => {
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
      previewEnabled = settings.get('previewEnabled').composite as boolean;
      if (!previewEnabled) {
        // Preview was disabled, tear everything down.
        panelDpms?.dispose();
        panelGcs?.dispose();
        gcsDrive?.dispose();
        panelDpms = undefined;
        panelGcs = undefined;
        gcsDrive = undefined;
      } else {
        // Preview was enabled, (re)create DPMS and GCS.
        panelDpms = new Panel();
        panelDpms.id = 'dpms-tab';
        panelDpms.addWidget(new dpmsWidget(app as JupyterLab, themeManager));
        panelGcs = new Panel();
        panelGcs.id = 'GCS-bucket-tab';
        gcsDrive = new GCSDrive();
        documentManager.services.contents.addDrive(gcsDrive);
        panelGcs.addWidget(
          new GcsBrowserWidget(gcsDrive, factory as IFileBrowserFactory)
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
    const createNotebookJobsComponentCommand = 'create-notebook-jobs-component';
    commands.addCommand(createNotebookJobsComponentCommand, {
      caption: 'Create a new Serverless Component',
      label: 'Scheduled Notebooks',
      // @ts-ignore jupyter lab icon command issue
      icon: args => (args['isPalette'] ? null : iconScheduledNotebooks),
      execute: () => {
        const content = new NotebookJobs(app as JupyterLab, themeManager);
        const widget = new MainAreaWidget<NotebookJobs>({ content });
        widget.title.label = 'Scheduled Notebooks';
        widget.title.icon = iconScheduledNotebooks;
        app.shell.add(widget, 'main');
      }
    });

    const createTemplateComponentCommand = 'create-template-component';
    commands.addCommand(createTemplateComponentCommand, {
      caption: 'Create a new Template Component',
      label: 'Notebook Templates',
      // @ts-ignore jupyter lab icon command issue
      icon: args => (args['isPalette'] ? null : iconNotebookTemplate),
      execute: () => {
        const content = new NotebookTemplates(
          app as JupyterLab,
          themeManager,
          defaultFileBrowser as IDefaultFileBrowser
        );
        const widget = new MainAreaWidget<NotebookTemplates>({ content });
        widget.title.label = 'Notebook Templates';
        widget.title.icon = iconNotebookTemplate;
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
      launcher.add({
        command: createNotebookJobsComponentCommand,
        category: TITLE_LAUNCHER_CATEGORY,
        rank: 3 //it will be 4
      });
      launcher.add({
        command: createTemplateComponentCommand,
        category: TITLE_LAUNCHER_CATEGORY,
        rank: 4
      });
    }

    // the plugin depends on having a toast container, and Jupyter labs lazy
    // loads one when a notification occurs.  Let's hackily fire off a notification
    // so jupyter would give us a toast container.
    // Long term we should just replace the toast calls across the plugin with
    // apputils:notify.
    commands.execute('apputils:notify', {
      message: 'Dataproc Jupyter Plugin Successfully Loaded',
      type: 'success',
      options: {
        autoClose: 1000
      }
    });
  }
};

export default extension;
