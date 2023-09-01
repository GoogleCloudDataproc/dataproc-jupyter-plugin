import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICompletionProviderManager } from '@jupyterlab/completer';
import { INotebookTracker } from '@jupyterlab/notebook';
import { generatePrompt } from './dataprocCompanionAiGenerationPrompt';
import { CodeCompletionStatusBar } from './dataprocCodeCompletionStatusWidget';
import {
  EditorExtensionRegistry,
  IEditorExtensionRegistry
} from '@jupyterlab/codemirror';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IStatusBar } from '@jupyterlab/statusbar';
import { IThemeManager } from '@jupyterlab/apputils';
import { dataprocCodeCompletionExtensions } from './dataprocCodeCompletionExtension';
import { DataprocCodeCompletionFetcherService } from './dataprocCodeCompletionFetcherService';
import { ISharedCodeCell } from '@jupyter/ydoc';

const PLUGIN_ID = 'dataproc_jupyter_plugin:aicompanion';
const PLUGIN_STATUS_WIDGET_ID = 'dataproc_jupyter_plugin:aicompletion_status';

export const DataprocCompanionAiCompletionPlugin: JupyterFrontEndPlugin<void> =
  {
    id: PLUGIN_ID,
    autoStart: true,
    requires: [
      ICompletionProviderManager,
      INotebookTracker,
      IEditorExtensionRegistry,
      ISettingRegistry,
      IStatusBar,
      IThemeManager
    ],
    activate: async (
      app: JupyterFrontEnd,
      completionProviderManager: ICompletionProviderManager,
      notebookTracker: INotebookTracker,
      editorExtensionRegistry: IEditorExtensionRegistry,
      settingRegistry: ISettingRegistry,
      statusBar: IStatusBar,
      themeManager: IThemeManager
    ) => {
      console.log('dataproc_completer_plugin is now running');
      // const completionProvider = new DataprocCompanionAiCompletionProvider();
      // completionProviderManager.registerProvider(completionProvider);

      const settings = await settingRegistry.load(PLUGIN_ID);

      const statusWidget = new CodeCompletionStatusBar(themeManager);
      statusBar.registerStatusItem(PLUGIN_STATUS_WIDGET_ID, {
        align: 'right',
        item: statusWidget
      });

      // Register a new editor configurable extension
      editorExtensionRegistry.addExtension({
        name: 'dataproc_jupyter_plugin:autocomplete',
        factory: () =>
          // The factory will be called for every new CodeMirror editor
          EditorExtensionRegistry.createImmutableExtension(
            dataprocCodeCompletionExtensions(notebookTracker, settings)
          )
      });

      const command = 'dataproc_jupyter_plugin:generate-code';
      // Add a command
      app.commands.addCommand(command, {
        label: 'Generate',
        caption: 'Generate Code using Cloud AI Companion',
        execute: async () => {
          const widget = notebookTracker.currentWidget;
          const activeCell = widget?.content?.activeCell;
          const widgetModelId = activeCell?.model?.id;
          const widgetCells = widget?.model?.cells;
          console.log({ widgetModelId, widgetCells });
          if (!widgetModelId || !widgetCells) {
            return;
          }

          const prevCellContext = [];
          // Generate context from previous cells.
          for (var i = 0; i < widgetCells.length; i++) {
            const cell = widgetCells.get(i);
            if (cell.sharedModel.id === widgetModelId) {
              break;
            }
            if (cell.isDisposed || cell.type != 'code') {
              continue;
            }
            const sharedModel = cell.sharedModel as ISharedCodeCell;
            prevCellContext.push(`\`\`\`python\n${sharedModel.source}\n\`\`\``);
            const modelOutputs = sharedModel.getOutputs();
            for (var j = 0; j < modelOutputs.length; j++) {
              const output = modelOutputs[j];
              if (output.name === 'stdout') {
                prevCellContext.push(`\`\`\`\n${output.text}\n\`\`\``);
              }
            }
          }

          const firstComment = activeCell?.editor
            ?.getTokens()
            .find(token => token.type === 'Comment');
          if (
            firstComment &&
            firstComment.type === 'Comment' &&
            firstComment.value.startsWith('# @generate')
          ) {
            const promptPieces = firstComment.value.split('# @generate');
            // const kernel = widget?.sessionContext?.session?.kernel;
            const prompt = await generatePrompt(
              widget.context.path,
              prevCellContext,
              promptPieces.at(1)?.trim() ?? ''
            );
            if (prompt) {
              const suggestions =
                await DataprocCodeCompletionFetcherService.fetch({
                  prefix: prompt,
                  model: 'code-bison'
                });
              if (suggestions && suggestions.length > 0) {
                const contentLines = suggestions[0].content.split('\n');
                const content = contentLines
                  .splice(1, contentLines.length - 2)
                  .join('\n');
                activeCell?.model.sharedModel.updateSource(
                  firstComment.value.length,
                  Number.MAX_SAFE_INTEGER,
                  `\n${content}`
                );
              }
            }
          }
        }
      });
    }
  };
