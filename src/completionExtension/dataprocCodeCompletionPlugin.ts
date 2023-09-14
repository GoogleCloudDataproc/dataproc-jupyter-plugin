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
import { INotebookTracker } from '@jupyterlab/notebook';
import {
  EditorExtensionRegistry,
  IEditorExtensionRegistry
} from '@jupyterlab/codemirror';
import { dataprocCodeCompletionExtensions } from './dataprocCodeCompletionExtension';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IStatusBar } from '@jupyterlab/statusbar';
import { CodeCompletionStatusBar } from './dataprocCodeCompletionStatusWidget';
import { IThemeManager } from '@jupyterlab/apputils';

const PLUGIN_ID = 'dataproc_jupyter_plugin:aicompletion';
const PLUGIN_STATUS_WIDGET_ID = 'dataproc_jupyter_plugin:aicompletion_status';

export const DataprocCompanionAiCompletionPlugin: JupyterFrontEndPlugin<void> =
  {
    id: PLUGIN_ID,
    autoStart: true,
    requires: [
      INotebookTracker,
      IEditorExtensionRegistry,
      ISettingRegistry,
      IStatusBar,
      IThemeManager
    ],
    activate: async (
      app: JupyterFrontEnd,
      notebookTracker: INotebookTracker,
      editorExtensionRegistry: IEditorExtensionRegistry,
      settingRegistry: ISettingRegistry,
      statusBar: IStatusBar,
      themeManager: IThemeManager
    ) => {
      const settings = await settingRegistry.load(PLUGIN_ID);

      const statusWidget = new CodeCompletionStatusBar(themeManager);
      statusBar.registerStatusItem(PLUGIN_STATUS_WIDGET_ID, {
        align: 'right',
        item: statusWidget
      });

      // Register a new editor configurable extension
      editorExtensionRegistry.addExtension(
        Object.freeze({
          name: 'dataproc_jupyter_plugin:autocomplete',
          factory: () =>
            // The factory will be called for every new CodeMirror editor
            EditorExtensionRegistry.createImmutableExtension(
              dataprocCodeCompletionExtensions(notebookTracker, settings)
            )
        })
      );
    }
  };
