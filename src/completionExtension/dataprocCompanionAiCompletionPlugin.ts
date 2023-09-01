import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICompletionProviderManager } from '@jupyterlab/completer';
import { INotebookTracker } from '@jupyterlab/notebook';
import {
  generateFixPrompt,
  generatePrompt
} from './dataprocCompanionAiGenerationPrompt';
import { CodeCompletionStatusBar } from './dataprocCodeCompletionStatusWidget';
import {
  EditorExtensionRegistry,
  IEditorExtensionRegistry
} from '@jupyterlab/codemirror';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IStatusBar } from '@jupyterlab/statusbar';
import { IThemeManager, InputDialog } from '@jupyterlab/apputils';
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

      const fixcommand = 'dataproc_jupyter_plugin:fix-code';
      // Add a command
      app.commands.addCommand(fixcommand, {
        label: 'Fix',
        caption: 'Fix Code using Cloud AI Companion',
        execute: async () => {
          const widget = notebookTracker.currentWidget;
          const activeCell = widget?.content?.activeCell;
          const widgetModelId = activeCell?.model?.id;
          const widgetCells = widget?.model?.cells;
          console.log({ widgetModelId, widgetCells, len: widgetCells?.length });
          if (!widgetModelId || !widgetCells) {
            return;
          }

          const prevCellContext = [];
          let curCellCode = '';
          let curCellError = '';

          // Generate context from previous cells.
          for (var i = 0; i < widgetCells.length; i++) {
            const cell = widgetCells.get(i);
            if (cell.isDisposed || cell.type != 'code') {
              continue;
            }
            const sharedModel = cell.sharedModel as ISharedCodeCell;

            console.log(sharedModel.id, widgetModelId);
            if (sharedModel.id === widgetModelId) {
              curCellCode = `\`\`\`python\n${sharedModel.source}\n\`\`\``;
              const modelOutputs = sharedModel.getOutputs();
              for (var j = 0; j < modelOutputs.length; j++) {
                const output = modelOutputs[j];
                if (output.output_type === 'error') {
                  curCellError = `\`\`\`\n${output.text}\n${output.ename}\n${
                    output.evalue
                  }\n${((output.traceback as string[]) ?? [])
                    .join('\n')
                    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')}\n\`\`\``;
                }
              }
            }

            prevCellContext.push(`\`\`\`python\n${sharedModel.source}\n\`\`\``);
            const modelOutputs = sharedModel.getOutputs();
            for (var j = 0; j < modelOutputs.length; j++) {
              const output = modelOutputs[j];
              console.log({ output });
              if (output.name === 'stdout') {
                prevCellContext.push(`\`\`\`\n${output.text}\n\`\`\``);
              }
            }
          }

          const issue = (
            await InputDialog.getText({
              title: 'What was wrong with the code? (optional)'
            })
          ).value;

          let generatePrompt = '';

          const firstComment = activeCell?.editor
            ?.getTokens()
            .find(token => token.type === 'Comment');
          if (
            firstComment &&
            firstComment.type === 'Comment' &&
            firstComment.value.startsWith('# @generate')
          ) {
            const promptPieces = firstComment.value.split('# @generate');
            promptPieces.at(1)?.trim() ?? '';
            generatePrompt = promptPieces.at(1)?.trim() ?? '';
          }
          // const kernel = widget?.sessionContext?.session?.kernel;
          const prompt = await generateFixPrompt(
            widget.context.path,
            curCellCode,
            curCellError,
            prevCellContext,
            issue ?? '',
            generatePrompt
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
                generatePrompt.length > 0
                  ? generatePrompt.length + '# @generate'.length
                  : 0,
                Number.MAX_SAFE_INTEGER,
                `\n${content}`
              );
            }
          }
        }
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
