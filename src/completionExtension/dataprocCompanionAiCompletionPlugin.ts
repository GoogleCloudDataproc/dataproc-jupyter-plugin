import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICompletionProviderManager } from '@jupyterlab/completer';
import { DataprocCompanionAiCompletionProvider } from './dataprocCompanionAiCompletionProvider';
import { INotebookTracker } from '@jupyterlab/notebook';
import { generatePrompt } from './dataprocCompanionAiGenerationPrompt';
import { DataprocCompanionAiFetcherService } from './dataprocCompanionAiFetcherService';

export const DataprocCompanionAiCompletionPlugin: JupyterFrontEndPlugin<void> =
  {
    id: 'dataproc_jupyter_plugin:aicompanion',
    autoStart: true,
    requires: [ICompletionProviderManager, INotebookTracker],
    activate: async (
      app: JupyterFrontEnd,
      completionProviderManager: ICompletionProviderManager,
      notebookTracker: INotebookTracker
    ) => {
      console.log('dataproc_completer_plugin is now running');
      const completionProvider = new DataprocCompanionAiCompletionProvider();
      completionProviderManager.registerProvider(completionProvider);

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
              const service = new DataprocCompanionAiFetcherService();
              const suggestions = await service.fetch(prompt);
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
