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
import { KernelAPI, KernelSpecAPI } from '@jupyterlab/services';
import { authApi, iconDisplay, toastifyCustomStyle } from './utils/utils';
import { dpmsWidget } from './dpms/dpmsWidget';
import dpmsIcon from '../style/icons/dpms_icon.svg';
import datasetExplorerIcon from '../style/icons/dataset_explorer_icon.svg';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { PLUGIN_ID, TITLE_LAUNCHER_CATEGORY } from './utils/const';
import { RuntimeTemplate } from './runtime/runtimeTemplate';
import {
  IFileBrowserFactory,
  IDefaultFileBrowser
} from '@jupyterlab/filebrowser';
import dpmsIconDark from '../style/icons/dpms_icon_dark.svg';
import datasetExplorerIconDark from '../style/icons/dataset_explorer_dark_icon.svg';
import storageIconDark from '../style/icons/Storage-icon-dark.svg';
import { NotebookButtonExtension } from './controls/NotebookButtonExtension';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { GCSDrive } from './gcs/gcsDrive';
import { GcsBrowserWidget } from './gcs/gcsBrowserWidget';
import { DataprocLoggingService, LOG_LEVEL } from './utils/loggingService';
import { NotebookScheduler } from './scheduler/notebookScheduler';
import pythonLogo from '../third_party/icons/python_logo.svg';
import NotebookTemplateService from './notebookTemplates/notebookTemplatesService';
import * as path from 'path';
import { requestAPI } from './handler/handler';
import { eventEmitter } from './utils/signalEmitter';
import { BigQueryWidget } from './bigQuery/bigQueryWidget';
import { RunTimeSerive } from './runtime/runtimeService';
import { Notification } from '@jupyterlab/apputils';
import { BigQueryService } from './bigQuery/bigQueryService';
import { toast } from 'react-toastify';

const iconDpms = new LabIcon({
  name: 'launcher:dpms-icon',
  svgstr: dpmsIcon
});
const iconDatasetExplorer = new LabIcon({
  name: 'launcher:dataset-explorer-icon',
  svgstr: datasetExplorerIcon
});
const iconPythonLogo = new LabIcon({
  name: 'launcher:python-bigquery-logo-icon',
  svgstr: pythonLogo
});

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
    const iconDatasetExplorerDark = new LabIcon({
      name: 'launcher:dataset-explorer-icon-dark',
      svgstr: datasetExplorerIconDark
    });
    const iconStorageDark = new LabIcon({
      name: 'launcher:storage-icon-dark',
      svgstr: storageIconDark
    });
    window.addEventListener('beforeunload', () => {
      localStorage.removeItem('notebookValue');
    });
    interface SettingsResponse {
      enable_metastore_integration?: boolean;
      enable_cloud_storage_integration?: boolean;
      enable_bigquery_integration?: boolean;
    }
    let bqFeature: SettingsResponse = await requestAPI('settings');
    // START -- Enable Preview Features.
    const settings = await settingRegistry.load(PLUGIN_ID);

    // The current value of whether or not preview features are enabled.
    let panelDpms: Panel | undefined,
      panelGcs: Panel | undefined,
      panelDatasetExplorer: Panel | undefined;
    let gcsDrive: GCSDrive | undefined;
    await checkResourceManager();

    // Capture the signal
    eventEmitter.on('dataprocConfigChange', async (message: string) => {
      checkAllApisEnabled();
      await checkResourceManager();
      if (bqFeature.enable_bigquery_integration) {
        loadBigQueryWidget('');
      }
      onSidePanelEnabled();
    });

    const checkAllApisEnabled = async () => {
      const dataprocClusterResponse =
        await RunTimeSerive.listClustersDataprocAPIService();

      let bigqueryDatasetsResponse;
      const credentials = await authApi();
      if (credentials?.project_id) {
        bigqueryDatasetsResponse =
          await BigQueryService.checkBigQueryDatasetsAPIService();
      }

      const dataCatalogResponse =
        await BigQueryService.getBigQuerySearchCatalogAPIService();

      const apiChecks = [
        {
          response: dataprocClusterResponse,
          errorKey: 'error.message',
          errorMessage: 'Cloud Dataproc API has not been used in project',
          notificationMessage: 'The Cloud Dataproc API is not enabled.',
          enableLink: `https://console.cloud.google.com/apis/library/dataproc.googleapis.com?project=${credentials?.project_id}`
        },
        {
          response: bigqueryDatasetsResponse,
          errorKey: 'error',
          checkType: 'bigquery',
          errorMessage: 'has not enabled BigQuery',
          notificationMessage: 'The BigQuery API is not enabled.',
          enableLink: `https://console.cloud.google.com/apis/library/bigquery.googleapis.com?project=${credentials?.project_id}`
        },
        {
          response: dataCatalogResponse,
          errorKey: 'error',
          errorMessage:
            'Google Cloud Data Catalog API has not been used in project',
          notificationMessage: 'Google Cloud Data Catalog API is not enabled.',
          enableLink: `https://console.cloud.google.com/apis/library/datacatalog.googleapis.com?project=${credentials?.project_id}`
        }
      ];
      apiChecks.forEach(check => {
        if (check.checkType === 'bigquery') {
          if (check.response && check.response.is_enabled === false) {
            Notification.error(check.notificationMessage, {
              actions: [
                {
                  label: 'Enable',
                  callback: () => window.open(check.enableLink, '_blank'),
                  displayType: 'link'
                }
              ],
              autoClose: false
            });
          }
        } else {
          const errorValue = check.errorKey
            .split('.')
            .reduce((acc, key) => acc?.[key], check.response);
          if (errorValue && errorValue.includes(check.errorMessage)) {
            Notification.error(check.notificationMessage, {
              actions: [
                {
                  label: 'Enable',
                  callback: () => window.open(check.enableLink, '_blank'),
                  displayType: 'link'
                }
              ],
              autoClose: false
            });
          }
        }
      });
    };

    await checkAllApisEnabled();

    /**
     * Handler for when the Jupyter Lab theme changes.
     */
    const onThemeChanged = () => {
      if (!panelDpms && !panelGcs && !panelDatasetExplorer) return;
      const isLightTheme = themeManager.theme
        ? themeManager.isLight(themeManager.theme)
        : true;
      if (isLightTheme) {
        if (bqFeature.enable_metastore_integration && panelDpms) {
          panelDpms.title.icon = iconDpms;
        }
        if (bqFeature.enable_bigquery_integration && panelDatasetExplorer) {
          panelDatasetExplorer.title.icon = iconDatasetExplorer;
        }
        if (bqFeature.enable_cloud_storage_integration && panelGcs) {
          panelGcs.title.icon = iconStorage;
        }
      } else {
        if (bqFeature.enable_metastore_integration && panelDpms) {
          panelDpms.title.icon = iconDpmsDark;
        }
        if (bqFeature.enable_bigquery_integration && panelDatasetExplorer) {
          panelDatasetExplorer.title.icon = iconDatasetExplorerDark;
        }
        if (bqFeature.enable_cloud_storage_integration && panelGcs) {
          panelGcs.title.icon = iconStorageDark;
        }
      }
    };
    themeManager.themeChanged.connect(onThemeChanged);

    /**
     * Enables and disables the side panel sections DPMS, GCS and Datasset Explorer based on the flags.
     */
    const onSidePanelEnabled = async () => {
      const toBoolean = (value: any): boolean => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          const lowercased = value.toLowerCase().trim();
          return lowercased === 'true' || lowercased === '1';
        }
        return false;
      };

      // Convert configuration values to boolean
      const enableBigQuery = toBoolean(bqFeature.enable_bigquery_integration);
      const enableCloudStorage = toBoolean(
        bqFeature.enable_cloud_storage_integration
      );
      const enableMetastore = toBoolean(bqFeature.enable_metastore_integration);

      // Clear any existing panels first
      panelDatasetExplorer?.dispose();
      panelDatasetExplorer = undefined;

      panelGcs?.dispose();
      gcsDrive?.dispose();
      panelGcs = undefined;
      gcsDrive = undefined;

      panelDpms?.dispose();
      panelDpms = undefined;

      // Reinitialize panels based on individual flags
      if (enableBigQuery) {
        panelDatasetExplorer = new Panel();
        panelDatasetExplorer.id = 'dataset-explorer-tab';
        panelDatasetExplorer.title.caption = 'Dataset Explorer - BigQuery';
        panelDatasetExplorer.title.className = 'panel-icons-custom-style';
        panelDatasetExplorer.addWidget(
          new BigQueryWidget(
            app as JupyterLab,
            settingRegistry as ISettingRegistry,
            bqFeature.enable_bigquery_integration as boolean,
            themeManager
          )
        );
        onThemeChanged();
        app.shell.add(panelDatasetExplorer, 'left', { rank: 1000 });
        DataprocLoggingService.log(
          'Bigquery dataset explorer is enabled',
          LOG_LEVEL.INFO
        );
      }

      if (enableMetastore) {
        panelDpms = new Panel();
        panelDpms.id = 'dpms-tab';
        panelDpms.title.caption = 'Dataset Explorer - DPMS';
        panelDpms.title.className = 'panel-icons-custom-style';
        panelDpms.addWidget(new dpmsWidget(app as JupyterLab, themeManager));
        onThemeChanged();
        app.shell.add(panelDpms, 'left', { rank: 1001 });
        DataprocLoggingService.log('Metastore is enabled', LOG_LEVEL.INFO);
      }

      if (enableCloudStorage) {
        panelGcs = new Panel();
        panelGcs.id = 'GCS-bucket-tab';
        panelGcs.title.caption = 'Google Cloud Storage';
        panelGcs.title.className = 'panel-icons-custom-style';
        gcsDrive = new GCSDrive();
        documentManager.services.contents.addDrive(gcsDrive);
        panelGcs.addWidget(
          new GcsBrowserWidget(gcsDrive, factory as IFileBrowserFactory)
        );
        onThemeChanged();
        app.shell.add(panelGcs, 'left', { rank: 1002 });
        DataprocLoggingService.log('Cloud storage is enabled', LOG_LEVEL.INFO);
      }
    };
    onSidePanelEnabled();

    async function checkResourceManager() {
      try {
        const notificationMessage =
          'Cloud Resource Manager API is not enabled. Please enable the API and restart the instance to view Dataproc Serverless Notebooks.';
        const credentials = await authApi();
        const enableLink = `https://console.cloud.google.com/apis/library/cloudresourcemanager.googleapis.com?project=${credentials?.project_id}`;
        const data = await requestAPI('checkResourceManager', {
          method: 'POST'
        });
        const { status, error } = data as { status: string; error?: string };
        if (status === 'ERROR') {
          if (
            error?.includes(
              'API [cloudresourcemanager.googleapis.com] not enabled on project'
            )
          ) {
            Notification.error(notificationMessage, {
              actions: [
                {
                  label: 'Enable',
                  callback: () => window.open(enableLink, '_blank'),
                  displayType: 'link'
                }
              ],
              autoClose: false
            });
          } else {
            toast.error(
              `'Error in running gcloud command': ${error}`,
              toastifyCustomStyle
            );
          }
        }
      } catch (error) {
        console.error('Resource manager Api not enabled:', error);
        return [];
      }
    }

    app.docRegistry.addWidgetExtension(
      'Notebook',
      new NotebookButtonExtension(
        app as JupyterLab,
        settingRegistry as ISettingRegistry,
        launcher,
        themeManager
      )
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

    const loadBigQueryWidget = (value: string) => {
      // If DPMS is not enabled, no-op.
      if (!panelDatasetExplorer) return;
      const existingWidgets = panelDatasetExplorer.widgets;
      existingWidgets.forEach(widget => {
        if (widget instanceof dpmsWidget) {
          widget.dispose();
        }
      });
      const newWidget = new BigQueryWidget(
        app as JupyterLab,
        settingRegistry as ISettingRegistry,
        bqFeature.enable_bigquery_integration as boolean,
        themeManager
      );
      panelDatasetExplorer.addWidget(newWidget);
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
            newValue.title.label === 'Settings' ||
            newValue.title.label === 'Notebook Templates' ||
            newValue.title.label === 'Scheduled Jobs' ||
            newValue.title.label === 'Job Scheduler') &&
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
            newValue.title.label !== 'Settings' &&
            newValue.title.label !== 'Notebook Templates' &&
            newValue.title.label !== 'Scheduled Jobs' &&
            newValue.title.label !== 'Job Scheduler'
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

    const downloadNotebook = async (
      notebookContent: any,
      notebookUrl: string
    ) => {
      const contentsManager = app.serviceManager.contents;
      // Get the current file browser tracker
      const { tracker } = factory;
      // Get the current active widget in the file browser
      const widget = tracker.currentWidget;
      if (!widget) {
        console.error('No active file browser widget found.');
        return;
      }

      // Define the path to the 'bigQueryNotebookDownload' folder within the local application directory
      const bigQueryNotebookDownloadFolderPath = widget.model.path.includes(
        'gs:'
      )
        ? ''
        : widget.model.path;

      // Define the path to the 'bigQueryNotebookDownload' folder within the local application directory

      const urlParts = notebookUrl.split('/');
      const filePath = `${bigQueryNotebookDownloadFolderPath}${path.sep}${
        urlParts[urlParts.length - 1]
      }`;

      const credentials = await authApi();
      if (credentials) {
        notebookContent.cells[2].source[1] = `PROJECT_ID = '${credentials.project_id}' \n`;
        notebookContent.cells[2].source[2] = `REGION = '${
          settings.get('bqRegion')['composite']
        }'\n`;
      }

      // Save the file to the workspace
      await contentsManager.save(filePath, {
        type: 'file',
        format: 'text',
        content: JSON.stringify(notebookContent)
      });

      // Refresh the file fileBrowser to reflect the new file
      app.shell.currentWidget?.update();

      app.commands.execute('docmanager:open', {
        path: filePath
      });
    };

    const openBigQueryNotebook = async () => {
      const template = {
        url: 'https://raw.githubusercontent.com/GoogleCloudPlatform/ai-ml-recipes/main/notebooks/quickstart/bigframes/bigframes_quickstart.ipynb'
      };
      await NotebookTemplateService.handleClickService(
        template,
        downloadNotebook
      );
    };

    const createBigQueryNotebookComponentCommand =
      'create-bigquery-notebook-component';
    commands.addCommand(createBigQueryNotebookComponentCommand, {
      caption: 'BigQuery DataFrames',
      label: 'BigQuery DataFrames',
      icon: iconPythonLogo,
      execute: async () => {
        await openBigQueryNotebook();
      }
    });

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
      caption: 'Clusters',
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
      caption: 'Serverless',
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
      caption: 'Scheduled Jobs',
      label: 'Scheduled Jobs',
      icon: iconScheduledNotebooks,
      execute: () => {
        const content = new NotebookScheduler(
          app as JupyterLab,
          themeManager,
          settingRegistry as ISettingRegistry,
          ''
        );
        const widget = new MainAreaWidget<NotebookScheduler>({ content });
        widget.title.label = 'Scheduled Jobs';
        widget.title.icon = iconScheduledNotebooks;
        app.shell.add(widget, 'main');
      }
    });

    const createTemplateComponentCommand = 'create-template-component';
    commands.addCommand(createTemplateComponentCommand, {
      caption: 'Notebook Templates',
      label: 'Notebook Templates',
      // @ts-ignore jupyter lab icon command issue
      icon: args => (args['isPalette'] ? null : iconNotebookTemplate),
      execute: () => {
        const content = new NotebookTemplates(
          app as JupyterLab,
          themeManager,
          factory as IFileBrowserFactory
        );
        const widget = new MainAreaWidget<NotebookTemplates>({ content });
        widget.title.label = 'Notebook Templates';
        widget.title.icon = iconNotebookTemplate;
        app.shell.add(widget, 'main');
      }
    });

    const createAuthLoginComponentCommand = 'cloud-dataproc-settings:configure';
    commands.addCommand(createAuthLoginComponentCommand, {
      label: bqFeature.enable_bigquery_integration
        ? 'Google BigQuery Settings'
        : 'Google Dataproc Settings',
      execute: () => {
        const content = new AuthLogin(
          app as JupyterLab,
          launcher as ILauncher,
          settingRegistry as ISettingRegistry,
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
      if (bqFeature.enable_bigquery_integration) {
        loadBigQueryWidget('');

        launcher.add({
          command: createBigQueryNotebookComponentCommand,
          category: 'BigQuery Notebooks',
          rank: 1
        });
      }
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
        command: createTemplateComponentCommand,
        category: TITLE_LAUNCHER_CATEGORY,
        rank: 3
      });
      launcher.add({
        command: createNotebookJobsComponentCommand,
        category: TITLE_LAUNCHER_CATEGORY,
        rank: 4
      });
    }

    // the plugin depends on having a toast container, and Jupyter labs lazy
    // loads one when a notification occurs.  Let's hackily fire off a notification
    // so jupyter would give us a toast container.
    // Long term we should just replace the toast calls across the plugin with
    // apputils:notify.
    if (bqFeature.enable_bigquery_integration) {
      commands.execute('apputils:notify', {
        message: 'BigQuery Plugin Successfully Loaded',
        type: 'success',
        options: {
          autoClose: 1000
        }
      });
    } else {
      commands.execute('apputils:notify', {
        message: 'Dataproc Jupyter Plugin Successfully Loaded',
        type: 'success',
        options: {
          autoClose: 1000
        }
      });
    }
  }
};

export default extension;
