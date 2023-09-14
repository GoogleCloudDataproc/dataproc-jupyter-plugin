import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  ViewPlugin,
  ViewUpdate,
  DecorationSet,
  Decoration,
  WidgetType,
  EditorView,
  keymap
} from '@codemirror/view';
import { INotebookTracker, CellList } from '@jupyterlab/notebook';
import { DataprocCompanionAiFetcherService } from './dataprocCompanionAiFetcherService';
import { Extension } from '@codemirror/state';

class CodeCompletionWidget extends WidgetType {
  constructor(private suggestion: string) {
    super();
  }

  toDOM() {
    const rootEle = document.createElement('span');
    const root = createRoot(rootEle);
    root.render(
      <span style={{ color: '#888' }}>
        {this.suggestion}
        <span style={{ color: '#ccc', fontStyle: 'italic' }}>
          &nbsp;Press-Command-Shift-O to accept
        </span>
      </span>
    );
    return rootEle;
  }
}

export const dataprocCodeCompletionKeyMap: Extension = keymap.of([
  {
    key: 'Shift-Cmd-o',
    run: (view: EditorView) => {
      plugin?.applySuggestion && plugin.applySuggestion();
      return false;
    }
  }
]);

/**
 * This is a giant hack. UHHhhhhhhhh.  Need to clean this up.
 */
let plugin: any | undefined = undefined;

export const dataprocCodeCompletionExtension = (
  notebookTracker: INotebookTracker,
  delayMs: number
) =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.set([]);
      updateId: number = 0;
      debounceTimeout?: number;
      pendingSuggestion?: {
        offset: number;
        suggestion: string;
      };
      constructor(public view: EditorView) {}

      _clearCodeCompletion() {
        this.decorations = Decoration.set([]);
        this.pendingSuggestion = undefined;
        plugin = undefined;
      }

      _generatePrefixAndPostFixFromCells(
        cells: CellList,
        activeCellId: string,
        cursorPos: number
      ) {
        const prefix = [];
        const postfix = [];
        let isAfterCursor = false;
        for (var i = 0; i < cells.length; i++) {
          const cell = cells.get(i);
          if (cell.isDisposed) {
            continue;
          }
          if (cell.sharedModel.id === activeCellId) {
            prefix.push(cell.sharedModel.source.substring(0, cursorPos));
            postfix.push(cell.sharedModel.source.substring(cursorPos));
            isAfterCursor = true;
          } else if (!isAfterCursor) {
            prefix.push(cell.sharedModel.source);
          } else {
            postfix.push(cell.sharedModel.source);
          }
        }
        return { prefix, postfix };
      }

      applySuggestion() {
        if (this.pendingSuggestion) {
          this.view.dispatch({
            changes: [
              {
                from: this.pendingSuggestion.offset,
                to: this.pendingSuggestion.offset,
                insert: this.pendingSuggestion.suggestion
              }
            ],
            selection: {
              anchor:
                this.pendingSuggestion.offset +
                this.pendingSuggestion.suggestion.length
            }
          });
        }
      }

      update(update: ViewUpdate) {
        const curUpdateId = ++this.updateId;
        const currentWidget = notebookTracker?.currentWidget;
        const currentWidgetModel = currentWidget?.model;

        // If we lose focus, hide the autocomplete
        if (update.focusChanged && !update.view.hasFocus) {
          this._clearCodeCompletion();
        }
        if (update.docChanged && currentWidget && currentWidgetModel) {
          this._clearCodeCompletion();
          window.clearTimeout(this.debounceTimeout);

          this.debounceTimeout = window.setTimeout(async () => {
            const currentWidget = notebookTracker?.currentWidget;
            console.log({ currentWidget, notebookTracker });
            const selectionRanges = update.view.state.selection.ranges;
            if (
              curUpdateId != this.updateId ||
              !currentWidget ||
              !currentWidget.model ||
              selectionRanges.length != 1 ||
              selectionRanges[0].from !== selectionRanges[0].to
            ) {
              return;
            }
            const { prefix, postfix } = this._generatePrefixAndPostFixFromCells(
              currentWidget?.model.cells,
              currentWidget.content.activeCell?.model?.id ?? '',
              selectionRanges[0].from
            );

            const val = await DataprocCompanionAiFetcherService.fetch({
              prefix:
                `# File: ${currentWidget.context.path} \n` + prefix.join(''),
              postfix: postfix.join(''),
              model: 'code-gecko',
              maxOutputTokens: 64,
              stopSequences: ['\n\n']
            });

            if (curUpdateId != this.updateId) {
              return;
            }

            if (val && val.length > 0 && val[0].content) {
              this.pendingSuggestion = {
                offset: selectionRanges[0].from,
                suggestion: val[0].content
              };
              plugin = this;
              const widget = Decoration.widget({
                widget: new CodeCompletionWidget(val[0].content),
                side: 1
              });
              this.decorations = Decoration.set([
                widget.range(selectionRanges[0].from)
              ]);
              this.view.dispatch();
            }
          }, delayMs);
        }
      }
    },
    {
      decorations: v => v.decorations
    }
  );
