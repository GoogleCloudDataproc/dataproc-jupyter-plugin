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

import { Panel } from '@lumino/widgets';
import { NotebookPanel } from '@jupyterlab/notebook';

jest.mock('@jupyter/web-components', () => ({
  provideJupyterDesignSystem: jest.fn().mockReturnValue({
    register: jest.fn()
  }),
  jpButton: jest.fn(),
  jpToolbar: jest.fn(),
  addJupyterLabThemeChangeListener: jest.fn()
}));

jest.mock('@jupyter/react-components', () => ({
  Button: () => null
}));

jest.mock('../cluster/cluster', () => {
  const { Widget } = require('@lumino/widgets');
  return {
    Cluster: jest.fn().mockImplementation(() => new Widget())
  };
});

jest.mock('../batches/batches', () => {
  const { Widget } = require('@lumino/widgets');
  return {
    Batches: jest.fn().mockImplementation(() => new Widget())
  };
});

jest.mock('../notebookTemplates/notebookTemplates', () => {
  const { Widget } = require('@lumino/widgets');
  return {
    NotebookTemplates: jest.fn().mockImplementation(() => new Widget())
  };
});

jest.mock('../login/authLogin', () => {
  const { Widget } = require('@lumino/widgets');
  return {
    AuthLogin: jest.fn().mockImplementation(() => new Widget())
  };
});

jest.mock('../dpms/dpmsWidget', () => {
  const { Widget } = require('@lumino/widgets');
  return {
    dpmsWidget: jest.fn().mockImplementation(() => new Widget())
  };
});

jest.mock('../bigQuery/bigQueryWidget', () => {
  const { Widget } = require('@lumino/widgets');
  return {
    BigQueryWidget: jest.fn().mockImplementation(() => new Widget())
  };
});

jest.mock('../runtime/runtimeTemplate', () => {
  const { Widget } = require('@lumino/widgets');
  return {
    RuntimeTemplate: jest.fn().mockImplementation(() => new Widget())
  };
});

jest.mock('../runtimeProfile/createRuntimeProfile', () => {
  const { Widget } = require('@lumino/widgets');
  return {
    CreateRuntimeProfile: jest.fn().mockImplementation(() => new Widget())
  };
});

jest.mock('../controls/NotebookButtonExtension', () => {
  return {
    NotebookButtonExtension: class MockNotebookButtonExtension { }
  };
});

jest.mock('../bigQuery/bigQueryService', () => ({
  BigQueryService: {
    checkBigQueryDatasetsAPIService: jest
      .fn()
      .mockResolvedValue({ is_enabled: true })
  }
}));

jest.mock('../runtime/runtimeService', () => ({
  RunTimeSerive: {
    checkDataprocApiEnabledService: jest
      .fn()
      .mockResolvedValue({ is_enabled: true })
  }
}));

jest.mock('../notebookTemplates/notebookTemplatesService', () => ({
  handleClickService: jest.fn()
}));

jest.mock('../handler/handler', () => ({
  requestAPI: jest.fn()
}));

jest.mock('../utils/utils', () => ({
  authApi: jest.fn().mockResolvedValue({
    project_id: 'test-project',
    login_error: false,
    config_error: false
  }),
  iconDisplay: jest.fn().mockReturnValue({})
}));

jest.mock('../utils/loggingService', () => ({
  DataprocLoggingService: {
    attach: jest.fn(),
    log: jest.fn()
  },
  LOG_LEVEL: {
    INFO: 0,
    WARNING: 1,
    ERROR: 2
  }
}));

jest.mock('@jupyterlab/services', () => ({
  KernelAPI: {
    listRunning: jest.fn().mockResolvedValue([])
  },
  KernelSpecAPI: {
    getSpecs: jest.fn().mockResolvedValue({
      kernelspecs: {
        'session-kernel': {
          name: 'session-kernel',
          display_name: 'Session Kernel',
          argv: ['python'],
          resources: {
            endpointParentResource: 'projects/p/locations/l/sessions/s1'
          },
          metadata: {}
        },
        'cluster-kernel': {
          name: 'cluster-kernel',
          display_name: 'Cluster Kernel',
          argv: ['python'],
          resources: {
            endpointParentResource: 'projects/p/regions/r/clusters/c1'
          },
          metadata: {}
        }
      }
    })
  }
}));

jest.mock('@jupyterlab/apputils', () => {
  const actual = jest.requireActual('@jupyterlab/apputils');
  return {
    ...actual,
    Notification: {
      error: jest.fn(),
      info: jest.fn(),
      warning: jest.fn(),
      success: jest.fn()
    }
  };
});

import extension from '../index';
import { PLUGIN_ID } from '../utils/const';
import { DataprocLoggingService } from '../utils/loggingService';
import { NotebookButtonExtension } from '../controls/NotebookButtonExtension';
import { CreateRuntimeProfile } from '../runtimeProfile/createRuntimeProfile';
import { RuntimeTemplate } from '../runtime/runtimeTemplate';
import { Cluster } from '../cluster/cluster';
import { Batches } from '../batches/batches';
import { NotebookTemplates } from '../notebookTemplates/notebookTemplates';
import { AuthLogin } from '../login/authLogin';
import { BigQueryWidget } from '../bigQuery/bigQueryWidget';
import { dpmsWidget } from '../dpms/dpmsWidget';
import { requestAPI } from '../handler/handler';
import { eventEmitter } from '../utils/signalEmitter';
import { Notification, MainAreaWidget } from '@jupyterlab/apputils';
import NotebookTemplateService from '../notebookTemplates/notebookTemplatesService';

describe('extension index.ts comprehensive test suite', () => {
  let appMock: any;
  let factoryMock: any;
  let defaultFileBrowserMock: any;
  let launcherMock: any;
  let mainMenuMock: any;
  let labShellMock: any;
  let notebookTrackerMock: any;
  let themeManagerMock: any;
  let settingRegistryMock: any;
  let documentManagerMock: any;
  let commandsMap: Map<string, any>;
  let launcherItems: any[];
  let currentChangedCallback:
    | ((sender: any, args: any) => Promise<void>)
    | null = null;
  let themeChangedCallback: (() => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    commandsMap = new Map();
    launcherItems = [];
    currentChangedCallback = null;
    themeChangedCallback = null;

    (requestAPI as jest.Mock).mockImplementation(
      (endpoint: string, init?: any) => {
        if (endpoint === 'settings') {
          return Promise.resolve({
            enable_bigquery_integration: true,
            enable_metastore_integration: true,
            enable_cloud_storage_integration: true,
            enable_runtime_profile_integration: true
          });
        }
        if (endpoint === 'getGcpServiceUrls') {
          return Promise.resolve({
            dataproc_url: 'https://dataproc.googleapis.com',
            compute_url: 'https://compute.googleapis.com',
            metastore_url: 'https://metastore.googleapis.com',
            cloudkms_url: 'https://cloudkms.googleapis.com',
            cloudresourcemanager_url:
              'https://cloudresourcemanager.googleapis.com',
            datacatalog_url: 'https://datacatalog.googleapis.com',
            storage_url: 'https://storage.googleapis.com'
          });
        }
        if (endpoint.startsWith('checkResourceManager')) {
          return Promise.resolve({ status: 'OK' });
        }
        if (endpoint.startsWith('jupyterlabVersion')) {
          return Promise.resolve('0.1.0');
        }
        if (endpoint.startsWith('updatePlugin')) {
          return Promise.resolve({});
        }
        return Promise.resolve({});
      }
    );

    appMock = {
      commands: {
        addCommand: jest.fn((id: string, options: any) => {
          commandsMap.set(id, options);
          return { dispose: jest.fn() };
        }),
        execute: jest.fn().mockResolvedValue({ path: 'test-doc-path' })
      },
      restored: Promise.resolve(),
      shell: {
        add: jest.fn(),
        currentWidget: {
          update: jest.fn()
        }
      },
      docRegistry: {
        addWidgetExtension: jest.fn()
      },
      serviceManager: {
        contents: {
          save: jest.fn().mockResolvedValue({})
        }
      }
    };

    factoryMock = {
      tracker: {
        currentWidget: {
          model: {
            path: 'workspace/path'
          }
        }
      }
    };

    defaultFileBrowserMock = {};

    launcherMock = {
      add: jest.fn((item: any) => {
        launcherItems.push(item);
      })
    };

    mainMenuMock = {};

    labShellMock = {
      currentChanged: {
        connect: jest.fn((cb: any) => {
          currentChangedCallback = cb;
        })
      }
    };

    notebookTrackerMock = {};

    themeManagerMock = {
      theme: 'JupyterLab Light',
      isLight: jest.fn().mockReturnValue(true),
      themeChanged: {
        connect: jest.fn((cb: any) => {
          themeChangedCallback = cb;
        })
      }
    };

    settingRegistryMock = {
      load: jest.fn().mockResolvedValue({
        get: jest.fn().mockReturnValue({ composite: 'us-central1' })
      })
    };

    documentManagerMock = {};
  });

  describe('1. Plugin metadata and initial activation sequence', () => {
    it('should have correct plugin properties', () => {
      expect(extension.id).toBe(PLUGIN_ID);
      expect(extension.autoStart).toBe(true);
      expect(Array.isArray(extension.optional)).toBe(true);
    });

    it('should attach DataprocLoggingService and register notebook widget extension', async () => {
      await (extension.activate as any)(
        appMock,
        factoryMock,
        defaultFileBrowserMock,
        launcherMock,
        mainMenuMock,
        labShellMock,
        notebookTrackerMock,
        themeManagerMock,
        settingRegistryMock,
        documentManagerMock
      );

      expect(DataprocLoggingService.attach).toHaveBeenCalled();
      expect(appMock.docRegistry.addWidgetExtension).toHaveBeenCalledWith(
        'Notebook',
        expect.any(NotebookButtonExtension)
      );
    });

    it('should handle window beforeunload event by removing notebookValue from localStorage', async () => {
      localStorage.setItem('notebookValue', 'test-cluster');

      await (extension.activate as any)(
        appMock,
        factoryMock,
        defaultFileBrowserMock,
        launcherMock,
        mainMenuMock,
        labShellMock,
        notebookTrackerMock,
        themeManagerMock,
        settingRegistryMock,
        documentManagerMock
      );

      window.dispatchEvent(new Event('beforeunload'));
      expect(localStorage.getItem('notebookValue')).toBeNull();
    });
  });

  describe('2. Side panels initialization and theme switching', () => {
    it('should initialize BigQuery and DPMS side panels when enabled in settings', async () => {
      await (extension.activate as any)(
        appMock,
        factoryMock,
        defaultFileBrowserMock,
        launcherMock,
        mainMenuMock,
        labShellMock,
        notebookTrackerMock,
        themeManagerMock,
        settingRegistryMock,
        documentManagerMock
      );

      expect(BigQueryWidget).toHaveBeenCalled();
      expect(dpmsWidget).toHaveBeenCalled();

      expect(appMock.shell.add).toHaveBeenCalledWith(
        expect.any(Panel),
        'left',
        { rank: 1000 }
      );
      expect(appMock.shell.add).toHaveBeenCalledWith(
        expect.any(Panel),
        'left',
        { rank: 1001 }
      );
    });

    it('should update side panel icons on theme change', async () => {
      await (extension.activate as any)(
        appMock,
        factoryMock,
        defaultFileBrowserMock,
        launcherMock,
        mainMenuMock,
        labShellMock,
        notebookTrackerMock,
        themeManagerMock,
        settingRegistryMock,
        documentManagerMock
      );

      expect(themeChangedCallback).toBeDefined();

      // Trigger dark theme
      themeManagerMock.isLight.mockReturnValue(false);
      themeChangedCallback!();

      // Trigger light theme
      themeManagerMock.isLight.mockReturnValue(true);
      themeChangedCallback!();
    });
  });

  describe('3. Event emitter signal handlers', () => {
    it('should respond to dataprocConfigChange signal', async () => {
      await (extension.activate as any)(
        appMock,
        factoryMock,
        defaultFileBrowserMock,
        launcherMock,
        mainMenuMock,
        labShellMock,
        notebookTrackerMock,
        themeManagerMock,
        settingRegistryMock,
        documentManagerMock
      );

      eventEmitter.emit('dataprocConfigChange', 'config updated');
    });
  });

  describe('4. Resource Manager and JupyterLab version checks', () => {
    it('should notify error if resource manager API returns error', async () => {
      (requestAPI as jest.Mock).mockImplementation((endpoint: string) => {
        if (endpoint === 'settings') {
          return Promise.resolve({
            enable_bigquery_integration: false,
            enable_metastore_integration: false
          });
        }
        if (endpoint === 'getGcpServiceUrls') {
          return Promise.resolve({
            dataproc_url: 'https://dataproc.googleapis.com',
            compute_url: 'https://compute.googleapis.com',
            metastore_url: 'https://metastore.googleapis.com',
            cloudkms_url: 'https://cloudkms.googleapis.com',
            cloudresourcemanager_url:
              'https://cloudresourcemanager.googleapis.com',
            datacatalog_url: 'https://datacatalog.googleapis.com',
            storage_url: 'https://storage.googleapis.com'
          });
        }
        if (endpoint.startsWith('checkResourceManager')) {
          return Promise.resolve({
            status: 'ERROR',
            error:
              'API [cloudresourcemanager.googleapis.com] not enabled on project'
          });
        }
        if (endpoint.startsWith('jupyterlabVersion')) {
          return Promise.resolve('0.1.0');
        }
        return Promise.resolve({
          dataproc_url: 'https://dataproc.googleapis.com',
          compute_url: 'https://compute.googleapis.com',
          metastore_url: 'https://metastore.googleapis.com',
          cloudkms_url: 'https://cloudkms.googleapis.com',
          cloudresourcemanager_url:
            'https://cloudresourcemanager.googleapis.com',
          datacatalog_url: 'https://datacatalog.googleapis.com',
          storage_url: 'https://storage.googleapis.com'
        });
      });

      await (extension.activate as any)(
        appMock,
        factoryMock,
        defaultFileBrowserMock,
        launcherMock,
        mainMenuMock,
        labShellMock,
        notebookTrackerMock,
        themeManagerMock,
        settingRegistryMock,
        documentManagerMock
      );

      expect(Notification.error).toHaveBeenCalledWith(
        expect.stringContaining('Cloud Resource Manager API is not enabled'),
        expect.any(Object)
      );
    });
  });

  describe('5. Component Commands Registration & Execution', () => {
    beforeEach(async () => {
      await (extension.activate as any)(
        appMock,
        factoryMock,
        defaultFileBrowserMock,
        launcherMock,
        mainMenuMock,
        labShellMock,
        notebookTrackerMock,
        themeManagerMock,
        settingRegistryMock,
        documentManagerMock
      );
    });

    it('should register and execute create-runtime-template-component command', () => {
      const command = commandsMap.get('create-runtime-template-component');
      expect(command).toBeDefined();
      expect(command.caption).toBe('Create a new runtime template');
      expect(command.label).toBe('New Runtime Template');

      command.execute();
      expect(RuntimeTemplate).toHaveBeenCalledWith(
        appMock,
        launcherMock,
        themeManagerMock,
        settingRegistryMock
      );
      expect(appMock.shell.add).toHaveBeenCalledWith(
        expect.any(MainAreaWidget),
        'main'
      );
    });

    it('should register and execute create-runtime-profile-component command', () => {
      const command = commandsMap.get('create-runtime-profile-component');
      expect(command).toBeDefined();
      expect(command.caption).toBe('Create Runtime Profile');
      expect(command.label).toBe('Create Runtime Profile');

      command.execute();
      expect(CreateRuntimeProfile).toHaveBeenCalledWith(
        appMock,
        launcherMock,
        themeManagerMock,
        settingRegistryMock
      );
      expect(appMock.shell.add).toHaveBeenCalledWith(
        expect.any(MainAreaWidget),
        'main'
      );
    });

    it('should register and execute create-cluster-component command', () => {
      const command = commandsMap.get('create-cluster-component');
      expect(command).toBeDefined();
      expect(command.caption).toBe('Clusters');
      expect(command.label).toBe('Clusters');

      command.execute();
      expect(Cluster).toHaveBeenCalledWith(
        settingRegistryMock,
        appMock,
        themeManagerMock
      );
      expect(appMock.shell.add).toHaveBeenCalledWith(
        expect.any(MainAreaWidget),
        'main'
      );
    });

    it('should register and execute create-batches-component command', () => {
      const command = commandsMap.get('create-batches-component');
      expect(command).toBeDefined();
      expect(command.caption).toBe('Serverless');
      expect(command.label).toBe('Serverless');

      command.execute();
      expect(Batches).toHaveBeenCalledWith(
        settingRegistryMock,
        appMock,
        themeManagerMock
      );
      expect(appMock.shell.add).toHaveBeenCalledWith(
        expect.any(MainAreaWidget),
        'main'
      );
    });

    it('should register and execute create-template-component command', () => {
      const command = commandsMap.get('create-template-component');
      expect(command).toBeDefined();
      expect(command.caption).toBe('Notebook Templates');
      expect(command.label).toBe('Notebook Templates');

      command.execute();
      expect(NotebookTemplates).toHaveBeenCalledWith(
        appMock,
        themeManagerMock,
        factoryMock,
        settingRegistryMock
      );
      expect(appMock.shell.add).toHaveBeenCalledWith(
        expect.any(MainAreaWidget),
        'main'
      );
    });

    it('should register and execute cloud-dataproc-settings:configure command', () => {
      const command = commandsMap.get('cloud-dataproc-settings:configure');
      expect(command).toBeDefined();
      expect(command.label).toBe('Google Cloud Settings');

      command.execute();
      expect(AuthLogin).toHaveBeenCalledWith(
        appMock,
        launcherMock,
        settingRegistryMock,
        themeManagerMock
      );
      expect(appMock.shell.add).toHaveBeenCalledWith(
        expect.any(MainAreaWidget),
        'main'
      );
    });

    it('should register and execute create-bigquery-notebook-component command', async () => {
      const command = commandsMap.get('create-bigquery-notebook-component');
      expect(command).toBeDefined();
      expect(command.caption).toBe('BigQuery DataFrames');
      expect(command.label).toBe('BigQuery DataFrames');

      await command.execute();
      expect(NotebookTemplateService.handleClickService).toHaveBeenCalled();
    });

    it('should filter icon when isPalette is true on commands with icon functions', () => {
      const templateCmd = commandsMap.get('create-runtime-template-component');
      expect(templateCmd.icon({ isPalette: true })).toBeNull();
      expect(templateCmd.icon({ isPalette: false })).toBeDefined();

      const profileCmd = commandsMap.get('create-runtime-profile-component');
      expect(profileCmd.icon({ isPalette: true })).toBeNull();
      expect(profileCmd.icon({ isPalette: false })).toBeDefined();

      const clusterCmd = commandsMap.get('create-cluster-component');
      expect(clusterCmd.icon({ isPalette: true })).toBeNull();
      expect(clusterCmd.icon({ isPalette: false })).toBeDefined();

      const batchesCmd = commandsMap.get('create-batches-component');
      expect(batchesCmd.icon({ isPalette: true })).toBeNull();
      expect(batchesCmd.icon({ isPalette: false })).toBeDefined();

      const nbTemplatesCmd = commandsMap.get('create-template-component');
      expect(nbTemplatesCmd.icon({ isPalette: true })).toBeNull();
      expect(nbTemplatesCmd.icon({ isPalette: false })).toBeDefined();
    });
  });

  describe('6. Launcher Items & Dynamic Kernels', () => {
    beforeEach(async () => {
      await (extension.activate as any)(
        appMock,
        factoryMock,
        defaultFileBrowserMock,
        launcherMock,
        mainMenuMock,
        labShellMock,
        notebookTrackerMock,
        themeManagerMock,
        settingRegistryMock,
        documentManagerMock
      );
    });

    it('should add BigQuery Notebooks launcher entry when bigquery is enabled', () => {
      expect(launcherMock.add).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'create-bigquery-notebook-component',
          category: 'BigQuery Notebooks',
          rank: 1
        })
      );
    });

    it('should add serverless and cluster notebook kernel commands to launcher', async () => {
      expect(launcherMock.add).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'notebook:create-session-kernel',
          category: 'Dataproc Serverless Spark'
        })
      );

      expect(launcherMock.add).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'notebook:create-cluster-kernel',
          category: 'Dataproc Cluster Notebooks'
        })
      );

      // Test executing dynamic notebook creation command
      const sessionKernelCmd = commandsMap.get(
        'notebook:create-session-kernel'
      );
      expect(sessionKernelCmd).toBeDefined();
      await sessionKernelCmd.execute();

      expect(appMock.commands.execute).toHaveBeenCalledWith(
        'docmanager:new-untitled',
        expect.objectContaining({
          type: 'notebook',
          kernel: { name: 'session-kernel' }
        })
      );
      expect(appMock.commands.execute).toHaveBeenCalledWith(
        'docmanager:open',
        expect.objectContaining({
          kernel: { name: 'session-kernel' },
          path: 'test-doc-path',
          factory: 'notebook'
        })
      );
    });

    it('should add static commands to launcher with correct categories and ranks', () => {
      expect(launcherMock.add).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'create-runtime-profile-component',
          category: 'Dataproc Serverless Spark'
        })
      );
      expect(launcherMock.add).not.toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'create-runtime-template-component'
        })
      );
      expect(launcherMock.add).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'create-cluster-component',
          rank: 1
        })
      );
      expect(launcherMock.add).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'create-batches-component',
          rank: 2
        })
      );
      expect(launcherMock.add).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'create-template-component',
          rank: 3
        })
      );
    });

    it('should add create-runtime-template-component to launcher when runtime profile is disabled', async () => {
      launcherMock.add.mockClear();
      (requestAPI as jest.Mock).mockImplementation((endpoint: string) => {
        if (endpoint === 'settings') {
          return Promise.resolve({
            enable_bigquery_integration: true,
            enable_metastore_integration: true,
            enable_cloud_storage_integration: true,
            enable_runtime_profile_integration: false
          });
        }
        return Promise.resolve({});
      });

      await (extension.activate as any)(
        appMock,
        factoryMock,
        defaultFileBrowserMock,
        launcherMock,
        mainMenuMock,
        labShellMock,
        notebookTrackerMock,
        themeManagerMock,
        settingRegistryMock,
        documentManagerMock
      );

      expect(launcherMock.add).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'create-runtime-template-component',
          category: 'Dataproc Serverless Spark'
        })
      );
      expect(launcherMock.add).not.toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'create-runtime-profile-component'
        })
      );
    });

    it('should execute apputils:notify on extension load', () => {
      expect(appMock.commands.execute).toHaveBeenCalledWith(
        'apputils:notify',
        expect.objectContaining({
          message: 'BigQuery Plugin Successfully Loaded',
          type: 'success'
        })
      );
    });
  });

  describe('7. LabShell currentChanged and titleChanged lifecycle', () => {
    it('should handle tab switches and title changes for NotebookPanel', async () => {
      await (extension.activate as any)(
        appMock,
        factoryMock,
        defaultFileBrowserMock,
        launcherMock,
        mainMenuMock,
        labShellMock,
        notebookTrackerMock,
        themeManagerMock,
        settingRegistryMock,
        documentManagerMock
      );

      expect(currentChangedCallback).toBeDefined();

      const titleChangedConnectMock = jest.fn();
      const titleChangedDisconnectMock = jest.fn();

      const mockNotebookPanel = Object.create(NotebookPanel.prototype, {
        title: {
          value: {
            label: 'test.ipynb',
            owner: null,
            changed: {
              connect: titleChangedConnectMock,
              disconnect: titleChangedDisconnectMock
            }
          }
        },
        toolbar: {
          value: {
            update: jest.fn()
          }
        },
        sessionContext: {
          value: {
            session: {
              kernel: {
                name: 'cluster-kernel'
              }
            }
          }
        }
      });
      mockNotebookPanel.title.owner = mockNotebookPanel;

      // Simulate tab switch to NotebookPanel
      await currentChangedCallback!(labShellMock, {
        oldValue: null,
        newValue: mockNotebookPanel
      });

      expect(titleChangedConnectMock).toHaveBeenCalled();
      expect(mockNotebookPanel.toolbar.update).toHaveBeenCalled();

      // Trigger title changed handler
      const titleChangedHandler = titleChangedConnectMock.mock.calls[0][0];
      await titleChangedHandler(mockNotebookPanel.title);
      expect(localStorage.getItem('notebookValue')).toBe('c1/clusters');

      // Simulate tab switch to Launcher widget
      const mockLauncherWidget: any = {
        title: { label: 'Launcher' }
      };
      await currentChangedCallback!(labShellMock, {
        oldValue: mockNotebookPanel,
        newValue: mockLauncherWidget
      });

      expect(titleChangedDisconnectMock).toHaveBeenCalled();
      expect(localStorage.getItem('oldNotebookValue')).toBe('c1/clusters');
      expect(localStorage.getItem('notebookValue')).toBeNull();
    });
  });
});
