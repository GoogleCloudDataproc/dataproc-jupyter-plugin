import {
  ICompletionProvider,
  CompletionHandler,
  CompletionTriggerKind,
  ICompletionContext
} from '@jupyterlab/completer';
import { DataprocCompanionAiFetcherService } from './dataprocCompanionAiFetcherService';
import { generatePrompt } from './dataprocCompanionAiGenerationPrompt';

export class DataprocCompanionAiCompletionProvider
  implements ICompletionProvider
{
  readonly identifier =
    'CompletionProvider:dataprocCompanionAiCompletionProvider';
  readonly renderer = null;
  readonly rank = 1000;
  readonly genPrefix = '# @generate';

  async isApplicable(context: ICompletionContext): Promise<boolean> {
    console.log('isApplicable', context);
    return true;
  }

  async fetch(
    request: CompletionHandler.IRequest,
    context: ICompletionContext,
    trigger?: CompletionTriggerKind | undefined
  ): Promise<CompletionHandler.ICompletionItemsReply> {
    if (!context.editor) {
      throw 'Editor not found';
    }
    const cursorPosition = context.editor.getCursorPosition();
    const line = context.editor.getLine(cursorPosition.line);
    if (!line || line.length == 0) {
      console.error('no line');
      throw 'No line';
    }

    const firstComment = context.editor
      ?.getTokens()
      .find(token => token.type === 'Comment');
    if (
      firstComment &&
      firstComment.type === 'Comment' &&
      firstComment.value.startsWith(this.genPrefix)
    ) {
      const promptPieces = firstComment.value.split(this.genPrefix);
      const kernel = context.session?.kernel;
      const prompt = await generatePrompt(
        promptPieces.at(1)?.trim() ?? '',
        kernel
      );
      if (prompt) {
        const service = new DataprocCompanionAiFetcherService();
        const suggestions = await service.fetch(prompt);
        if (suggestions) {
          const completionItems: CompletionHandler.ICompletionItem[] =
            suggestions.map(suggestion => ({
              label: suggestion.content,
              insertText: suggestion.content,
              type: 'Duet AI'
            }));
          return {
            start: line.length,
            end: line.length,
            items: completionItems
          };
        }
      }
    }
    throw 'no results';
  }
}
