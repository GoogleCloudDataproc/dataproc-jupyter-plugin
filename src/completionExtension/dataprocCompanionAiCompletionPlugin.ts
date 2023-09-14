import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICompletionProviderManager } from '@jupyterlab/completer';
import { DataprocCompanionAiCompletionProvider } from './dataprocCompanionAiCompletionProvider';
import { INotebookTracker } from '@jupyterlab/notebook';
import { generatePrompt } from './dataprocCompanionAiGenerationPrompt';
import { DataprocCompanionAiFetcherService } from './dataprocCompanionAiFetcherService';
import {
  EditorExtensionRegistry,
  IEditorExtensionRegistry
} from '@jupyterlab/codemirror';
import {
  dataprocCodeCompletionExtension,
  dataprocCodeCompletionKeyMap
} from './dataprocCodeCompletionExtension';

export const DataprocCompanionAiCompletionPlugin: JupyterFrontEndPlugin<void> =
  {
    id: 'dataproc_jupyter_plugin:aicompanion',
    autoStart: true,
    requires: [
      ICompletionProviderManager,
      INotebookTracker,
      IEditorExtensionRegistry
    ],
    activate: async (
      app: JupyterFrontEnd,
      completionProviderManager: ICompletionProviderManager,
      notebookTracker: INotebookTracker,
      editorExtensionRegistry: IEditorExtensionRegistry
    ) => {
      console.log('dataproc_completer_plugin is now running');
      const completionProvider = new DataprocCompanionAiCompletionProvider();
      completionProviderManager.registerProvider(completionProvider);

      // Register a new editor configurable extension
      editorExtensionRegistry.addExtension(
        Object.freeze({
          name: 'dataproc_jupyter_plugin:autocomplete',
          // Default CodeMirror extension parameters
          default: 1000,
          factory: () =>
            // The factory will be called for every new CodeMirror editor
            EditorExtensionRegistry.createConfigurableExtension(
              (delayMs: number) => [
                dataprocCodeCompletionKeyMap,
                dataprocCodeCompletionExtension(notebookTracker, delayMs)
              ]
            ),
          // JSON schema defining the CodeMirror extension parameters
          schema: {
            type: 'number',
            title: 'Autocomplete Delay (ms)',
            description:
              'How long to wait before making a request to vertex AI (in ms).'
          }
        })
      );

      const command = 'dataproc_jupyter_plugin:generate-code';
      // Add a command
      app.commands.addCommand(command, {
        label: 'Generate',
        caption: 'Generate Code using Cloud AI Companion',
        execute: async () => {
          const widget = notebookTracker.currentWidget;
          const activeCell = widget?.content?.activeCell;

          const firstComment = activeCell?.editor
            ?.getTokens()
            .find(token => token.type === 'Comment');
          if (
            firstComment &&
            firstComment.type === 'Comment' &&
            firstComment.value.startsWith('# @generate')
          ) {
            const promptPieces = firstComment.value.split('# @generate');
            const kernel = widget?.sessionContext?.session?.kernel;
            const prompt = await generatePrompt(
              promptPieces.at(1)?.trim() ?? '',
              kernel
            );
            if (prompt) {
              const suggestions = await DataprocCompanionAiFetcherService.fetch(
                { prefix: prompt }
              );
              if (suggestions && suggestions.length > 0) {
                activeCell?.model.sharedModel.updateSource(
                  firstComment.value.length,
                  Number.MAX_SAFE_INTEGER,
                  `\n${suggestions[0].content}`
                );
              }
            }
          }
        }
      });
    }
  };
