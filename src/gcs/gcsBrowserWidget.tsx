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
import { ToolbarButton } from '@jupyterlab/apputils';
import { FileBrowser, IFileBrowserFactory } from '@jupyterlab/filebrowser';
import 'react-toastify/dist/ReactToastify.css';
import { LabIcon } from '@jupyterlab/ui-components';
import gcsNewFolderIcon from '../../style/icons/gcs_folder_new_icon.svg';
import gcsUploadIcon from '../../style/icons/gcs_upload_icon.svg';

const iconGCSNewFolder = new LabIcon({
  name: 'gcs-toolbar:gcs-folder-new-icon',
  svgstr: gcsNewFolderIcon
});
const iconGCSUpload = new LabIcon({
  name: 'gcs-toolbar:gcs-upload-icon',
  svgstr: gcsUploadIcon
});
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

    let newFolder = new ToolbarButton({
      icon: iconGCSNewFolder,
      className: 'jp-NewFolderIcon',
      onClick: () => {
        console.log('Folder New');
      },
      tooltip: 'New Folder'
    });
    let gcsUpload = new ToolbarButton({
      icon: iconGCSUpload,
      className: 'jp-UploadIcon',
      onClick: () => {
        console.log('Upload File');
      },
      tooltip: 'File Upload'
    });
    this.browser.title.caption = 'Google Cloud Storage';
    this.browser.toolbar.addItem('New Folder', newFolder);
    this.browser.toolbar.addItem('File Upload', gcsUpload);
  }

  dispose() {
    this.browser.dispose();
    super.dispose();
  }
}
