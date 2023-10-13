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

import { Widget, PanelLayout } from '@lumino/widgets';
import { FileBrowser, IFileBrowserFactory } from '@jupyterlab/filebrowser';
import 'react-toastify/dist/ReactToastify.css';

export class GcsBrowserWidget extends Widget {
  private browser: FileBrowser;
  constructor(
    private driveName: string,
    private fileBrowserFactory: IFileBrowserFactory
  ) {
    super();
    this.browser = this.fileBrowserFactory.createFileBrowser(
      'dataproc-jupyter-plugin:gcsBrowser',
      {
        driveName: this.driveName
      }
    );
    this.browser.showFileCheckboxes = false;
    this.browser.node.style.height = '100%';
    this.layout = new PanelLayout();
    this.node.style.height = '100%';
    (this.layout as PanelLayout).addWidget(this.browser);
  }

  dispose() {
    this.browser.dispose();
    super.dispose();
  }
}
