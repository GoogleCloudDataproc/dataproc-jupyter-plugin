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
import { Dialog, ToolbarButton, showDialog } from '@jupyterlab/apputils';
import { FileBrowser, IFileBrowserFactory } from '@jupyterlab/filebrowser';
import 'react-toastify/dist/ReactToastify.css';
import { LabIcon } from '@jupyterlab/ui-components';
import gcsNewFolderIcon from '../../style/icons/gcs_folder_new_icon.svg';
import gcsUploadIcon from '../../style/icons/gcs_upload_icon.svg';
import { GcsService } from './gcsService';
import { GCSDrive } from './gcsDrive';
import { TitleWidget } from '../controls/SidePanelTitleWidget';

const iconGCSNewFolder = new LabIcon({
  name: 'gcs-toolbar:gcs-folder-new-icon',
  svgstr: gcsNewFolderIcon
});
const iconGCSUpload = new LabIcon({
  name: 'gcs-toolbar:gcs-upload-icon',
  svgstr: gcsUploadIcon
});

const debounce = (func: any, delay: number) => {
  let timeoutId: any;
  return function (...args: any) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};
export class GcsBrowserWidget extends Widget {
  private browser: FileBrowser;
  private fileInput: HTMLInputElement;

  // Function to trigger file input dialog when the upload button is clicked
  private onUploadButtonClick = () => {
    if (this.browser.model.path.split(':')[1] !== '') {
      this.fileInput.click();
    } else {
      showDialog({
        title: 'Upload Error',
        body: 'Uploading files at bucket level is not allowed',
        buttons: [Dialog.okButton()]
      });
    }
  };

  private handleFolderCreation = () => {
    if (this.browser.model.path.split(':')[1] !== '') {
      this.browser.createNewDirectory();
    } else {
      showDialog({
        title: 'Create Bucket Error',
        body: 'Please use console to create new bucket',
        buttons: [Dialog.okButton()]
      });
    }
  };

  // Function to handle file upload
  private handleFileUpload = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);

    // Clear the input element's value to force the 'change' event on subsequent selections
    input.value = '';

    if (files && files.length > 0) {
      files.forEach((fileData: any) => {
        const file = fileData;
        const reader = new FileReader();

        reader.onloadend = async () => {
          // Upload the file content to Google Cloud Storage
          const gcsPath = this.browser.model.path.split(':')[1];
          const path = GcsService.pathParser(gcsPath);
          let filePath;

          if (path.path === '') {
            filePath = file.name;
          } else {
            filePath = path.path + '/' + file.name;
          }

          const content = await GcsService.list({
            prefix: filePath,
            bucket: path.bucket
          });

          if (content.items && content.items.length > 0) {
            const result = await showDialog({
              title: 'Upload files',
              body:
                file.name +
                ' already exists in ' +
                path.bucket +
                ' Do you want to overwrite the file?',
              buttons: [Dialog.okButton(), Dialog.cancelButton()]
            });

            if (result.button.accept) {
              await GcsService.saveFile({
                bucket: path.bucket,
                path: filePath,
                contents: reader.result as string // assuming contents is a string
              });
            }
          } else {
            await GcsService.saveFile({
              bucket: path.bucket,
              path: filePath,
              contents: reader.result as string // assuming contents is a string
            });
          }

          // Optionally, update the FileBrowser model to reflect the newly uploaded file
          // Example: Refresh the current directory
          await this.browser.model.refresh();
        };

        // Read the file as text
        reader.readAsText(file);
      });
    }
  };

  private filterFilesByName = async (filterValue: string) => {
    this.browser.model.refresh();
  };

  constructor(
    private drive: GCSDrive,
    private fileBrowserFactory: IFileBrowserFactory
  ) {
    super();
    this.browser = this.fileBrowserFactory.createFileBrowser(
      'dataproc-jupyter-plugin:gcsBrowser',
      {
        driveName: this.drive.name
      }
    );
    this.layout = new PanelLayout();
    this.node.style.height = '100%';
    this.node.style.display = 'flex';
    this.node.style.flexDirection = 'column';

    (this.layout as PanelLayout).addWidget(
      new TitleWidget('Google Cloud Storage', true)
    );

    let filterInput = document.createElement('input');
    filterInput.id = 'filter-buckets-objects';
    filterInput.className = 'filter-search-gcs';
    filterInput.type = 'text';
    filterInput.placeholder = 'Filter by Name';

    // Debounce the filterFilesByName function with a delay of 300 milliseconds
    const debouncedFilter = debounce(this.filterFilesByName, 300);

    filterInput.addEventListener('input', event => {
      const filterValue = (event.target as HTMLInputElement).value;
      //@ts-ignore
      document
        .getElementById('filter-buckets-objects')
        .setAttribute('value', filterValue);
      // Call a function to filter files based on filterValue
      debouncedFilter(filterValue);
    });

    this.browser.showFileCheckboxes = false;
    (this.layout as PanelLayout).addWidget(this.browser);
    this.browser.node.style.flexShrink = '1';
    this.browser.node.style.flexGrow = '1';

    let newFolder = new ToolbarButton({
      icon: iconGCSNewFolder,
      className: 'icon-white',
      onClick: this.handleFolderCreation,
      tooltip: 'New Folder'
    });

    // Create a file input element
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.multiple = true; // Enable multiple file selection
    this.fileInput.style.display = 'none';

    // Attach event listener for file selection
    this.fileInput.addEventListener('change', this.handleFileUpload);

    // Append the file input element to the widget's node
    this.node.appendChild(this.fileInput);
    let gcsUpload = new ToolbarButton({
      icon: iconGCSUpload,
      className: 'icon-white jp-UploadIcon',
      onClick: this.onUploadButtonClick,
      tooltip: 'File Upload'
    });
    this.browser.toolbar.addItem('New Folder', newFolder);
    this.browser.toolbar.addItem('File Upload', gcsUpload);
    let filterItem = new Widget({ node: filterInput });
    this.browser.toolbar.addItem('Filter by Name:', filterItem);
  }

  dispose() {
    this.browser.dispose();
    this.fileInput.removeEventListener('change', this.handleFileUpload);
    super.dispose();
  }
}
