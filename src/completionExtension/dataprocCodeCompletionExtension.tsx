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
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { DataprocCodeCompletionFetcherService } from './dataprocCodeCompletionFetcherService';
import { Extension } from '@codemirror/state';
// import { IStatusBar, StatusBar } from '@jupyterlab/statusbar';
class CodeCompletionWidget extends WidgetType {
  constructor(private suggestion: string) {
    super();
  }

  toDOM() {
    const rootEle = document.createElement('span');
    // TODO: probably more performant to generate the HTML nodes ourselves
    // instead of creating React Root element every time.
    const root = createRoot(rootEle);
    root.render(
      <span style={{ color: 'var(--jp-ui-font-color2)' }}>
        {this.suggestion}
        <span
          style={{ color: 'var(--jp-ui-font-color3)', fontStyle: 'italic' }}
        >
          &nbsp;Press-Command-Shift-O to accept
        </span>
      </span>
    );
    return rootEle;
  }
}

/**
 * This is a giant hack. We need this for dataprocCodeCompletionKeyMap.
 */
let plugin: any | undefined = undefined;

export const dataprocCodeCompletionExtensions: (
  notebookTracker: INotebookTracker,
  settings: ISettingRegistry.ISettings
) => Extension[] = (
  notebookTracker: INotebookTracker,
  settings: ISettingRegistry.ISettings
) => [
  keymap.of([
    {
      key: 'shift-cmd-o',
      run: (_: EditorView) => {
        /**
         * There's no easy way to get the plugin from the editor view
         * So the current solution maintain a singleton ref to the
         * last used plugin and call applySuggestion on that.
         */
        plugin?.applySuggestion && plugin.applySuggestion();
        return false;
      }
    }
  ]),
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.set([]);
      updateId: number = 0;
      debounceTimeout?: number;
      pendingSuggestion?: {
        offset: number;
        suggestion: string;
      };
      enabled: boolean = false;
      delayMs: number = 500;

      constructor(public view: EditorView) {
        this._applySettings();
        settings.changed.connect(this._applySettings);
      }

      destroy() {
        settings.changed.disconnect(this._applySettings);
      }

      _applySettings = () => {
        this.enabled = settings.get('enabled').composite as boolean;
        this.delayMs = settings.get('delayMs').composite as number;
      };

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
          if (cell.isDisposed || cell.type != 'code') {
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

      async _updateInternal(curUpdateId: number, update: ViewUpdate) {
        {
          const currentWidget = notebookTracker?.currentWidget;
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

          const val = await DataprocCodeCompletionFetcherService.fetch({
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
        }
      }

      update(update: ViewUpdate) {
        console.log('update');
        if (!this.enabled) return;
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

          this.debounceTimeout = window.setTimeout(
            () => this._updateInternal(curUpdateId, update),
            this.delayMs
          );
        }
      }

      applySuggestion() {
        if (!this.enabled) return;
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
    },
    {
      decorations: v => v.decorations
    }
  )
];
