import { Contents, ServerConnection } from '@jupyterlab/services';
import { ISignal, Signal } from '@lumino/signaling';
import { GcsService } from './gcsService';

import { showDialog, Dialog } from '@jupyterlab/apputils';
import { storage_v1 } from '@googleapis/storage';

// Template for an empty Directory IModel.
const DIRECTORY_IMODEL: Contents.IModel = {
  type: 'directory',
  path: '',
  name: '',
  format: null,
  content: null,
  created: '',
  writable: true,
  last_modified: '',
  mimetype: ''
};

let untitledFolderSuffix = '';

export class GCSDrive implements Contents.IDrive {
  constructor() {
    // Not actually used, but the Contents.IDrive interface requires one.
    this.serverSettings = ServerConnection.makeSettings();
  }

  private _isDisposed = false;
  private _fileChanged = new Signal<this, Contents.IChangedArgs>(this);
  // private _currentPrefix = '';
  readonly serverSettings: ServerConnection.ISettings;

  get name() {
    return 'gs';
  }

  get fileChanged(): ISignal<this, Contents.IChangedArgs> {
    return this._fileChanged;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
  }

  /**
   * @returns IModel directory containing all the GCS buckets for the current project.
   */
  private async getBuckets() {
    let paragraph: HTMLElement | null;
    let searchInput = document.getElementById('filter-buckets-objects');
    //@ts-ignore
    let searchValue = searchInput.value;
    const content = await GcsService.listBuckets({
      prefix: searchValue
    });

    if (content?.error?.code) {
      if(document.getElementById('gcs-list-bucket-error')){
        document.getElementById('gcs-list-bucket-error')?.remove()
      }
      const para = document.createElement('p');
      para.id = 'gcs-list-bucket-error';
      para.style.color = '#ff0000';
      para.style.maxWidth= '100%';
      para.style.whiteSpace='normal';
      para.textContent = content?.error?.message;
      paragraph = document.getElementById('filter-buckets-objects');
      paragraph?.after(para);
    } else {
      if(document.getElementById('gcs-list-bucket-error')){
        document.getElementById('gcs-list-bucket-error')?.remove()
      }
    }

    if (!content) {
      throw 'Error Listing Buckets';
    }
    return {
      ...DIRECTORY_IMODEL,
      content:
        content.items?.map((bucket: storage_v1.Schema$Object) => ({
          ...DIRECTORY_IMODEL,
          path: bucket.name,
          name: bucket.name,
          last_modified: bucket.updated ?? ''
        })) ?? []
    };
  }

  /**
   * @returns IModel directory for the given local path.
   */
  private async getDirectory(localPath: string) {
    const path = GcsService.pathParser(localPath);
    let searchInput = document.getElementById('filter-buckets-objects');
    //@ts-ignore
    let searchValue = searchInput.value;
    const prefix = path.path.length > 0 ? `${path.path}/` : path.path;
    const content = await GcsService.list({
      prefix: prefix + searchValue,
      bucket: path.bucket
    });
    if (!content) {
      throw 'Error Listing Objects';
    }
    let directory_contents: Contents.IModel[] = [];
    if (content.prefixes && content.prefixes.length > 0) {
      directory_contents = directory_contents.concat(
        content.prefixes.map((prefix: string) => {
          const path = prefix.split('/');
          const name = path.at(-2) ?? prefix;
          return {
            ...DIRECTORY_IMODEL,
            path: `${localPath}/${name}`,
            name: name
          };
        })
      );
    }
    if (content.items && content.items.length > 0) {
      directory_contents = directory_contents.concat(
        content.items
          .filter(item => item.name && !item.name.endsWith('/'))
          .map(item => {
            const itemName = item.name!;
            const path = itemName.split('/');
            const name = path.at(-1) ?? itemName;
            return {
              type: 'file',
              path: `${localPath}/${name}`,
              name: name,
              format: 'base64',
              content: null,
              created: item.timeCreated ?? '',
              writable: true,
              last_modified: item.updated ?? '',
              mimetype: item.contentType ?? ''
            };
          })
      );
    }
    return {
      ...DIRECTORY_IMODEL,
      path: localPath,
      name: localPath.split('\\').at(-1) ?? '',
      content: directory_contents
    };
  }

  /**
   * @returns IModel file for the given local path.
   */
  private async getFile(
    localPath: string,
    options?: Contents.IFetchOptions
  ): Promise<Contents.IModel> {
    const path = GcsService.pathParser(localPath);
    const content = await GcsService.getFile({
      path: path.path,
      bucket: path.bucket,
      format: options?.format ?? 'text'
    });
    if (!content) {
      throw 'Error Listing Objects';
    }
    return {
      type: 'file',
      path: localPath,
      name: localPath.split('\\').at(-1) ?? '',
      format: options?.format ?? 'text',
      content: content,
      created: '',
      writable: true,
      last_modified: '',
      mimetype: ''
    };
  }

  async get(
    localPath: string,
    options?: Contents.IFetchOptions
  ): Promise<Contents.IModel> {
    /**
     * Logic here is kind of complicated, we have 3 cases that
     * the IDrive interface uses this call for.
     * 1) If path is the root node, list the buckets
     * 2) If path is a directory in a bucket, list all of it's directory and files.
     * 3) If path is a file, return it's metadata and contents.
     */
    if (localPath.length === 0) {
      // Case 1: Return the buckets.
      return await this.getBuckets();
    }

    // Case 2: Return the directory contents.
    const directory = await this.getDirectory(localPath);
    if (directory.content.length === 0) {
      // Case 3?: Looks like there's no items with this prefix, so
      //  maybe it's a file?  Try fetching the file.
      try {
        return await this.getFile(localPath, options);
      } catch (e) {
        // If it's a 404, maybe it was an (empty) directory after all.
        // fall out and return the directory IModel.
      }
    }
    return directory;
  }

  // updateQuery(query: string): void {
  //   this._currentPrefix = query;
  // }

  async save(
    localPath: string,
    options?: Partial<Contents.IModel>
  ): Promise<Contents.IModel> {
    const path = GcsService.pathParser(localPath);
    const content =
      options?.format == 'json'
        ? JSON.stringify(options.content)
        : options?.content;
    const resp = await GcsService.saveFile({
      bucket: path.bucket,
      path: path.path,
      contents: content
    });
    return {
      type: 'file',
      path: localPath,
      name: localPath.split('\\').at(-1) ?? '',
      format: 'text',
      created: '',
      content: '',
      writable: true,
      last_modified: resp.updated ?? '',
      mimetype: '',
      ...options
    };
  }

  async getDownloadUrl(
    localPath: string,
    options?: Contents.IFetchOptions
  ): Promise<string> {
    const path = GcsService.pathParser(localPath);
    const fileContentURL = await GcsService.downloadFile({
      path: path.path,
      bucket: path.bucket,
      name: path.name ? path.name : '',
      format: options?.format ?? 'text'
    });

    return fileContentURL;
  }

  async newUntitled(
    options?: Contents.ICreateOptions
  ): Promise<Contents.IModel> {
    if (!options || !options.path) {
      return Promise.reject('Invalid path provided for new folder.');
    }

    // Extract the localPath from options
    let localPath = options.path;

    // Check if the provided path is valid and not the root directory
    if (localPath === '/' || localPath === '') {
      return Promise.reject('Cannot create new objects in the root directory.');
    }

    const path = GcsService.pathParser(localPath);

    const content = await GcsService.list({
      prefix:
        path.path === ''
          ? path.path + 'UntitledFolder'
          : path.path + '/UntitledFolder',
      bucket: path.bucket
    });
    if (content.prefixes) {
      let maxSuffix = 1;
      content.prefixes.forEach((data: string) => {
        let suffixElement = data
          .split('/')
          [data.split('/').length - 2].match(/\d+$/);
        if (suffixElement !== null && parseInt(suffixElement[0]) >= maxSuffix) {
          maxSuffix = parseInt(suffixElement[0]) + 1;
        }
        untitledFolderSuffix = maxSuffix.toString();
      });
    } else {
      untitledFolderSuffix = '';
    }
    let folderName = 'UntitledFolder' + untitledFolderSuffix;
    // Create the folder in your backend service
    const response = await GcsService.createFolder({
      bucket: path.bucket,
      path: path.path,
      folderName: folderName
    });

    // Handle the response from your backend service appropriately
    if (response) {
      // Folder created successfully, return the folder metadata
      return {
        type: 'directory',
        path: localPath.split(':')[1],
        name: folderName, // Extract folder name from path
        format: null,
        created: new Date().toISOString(),
        writable: true,
        last_modified: new Date().toISOString(), // Use current timestamp as last modified
        mimetype: '',
        content: null
      };
    } else {
      // Handle folder creation failure
      return Promise.reject('Failed to create folder.');
    }
  }

  async delete(path: string): Promise<void> {
    const localPath = GcsService.pathParser(path);
    const resp = await GcsService.deleteFile({
      bucket: localPath.bucket,
      path: localPath.path
    });
    console.log(resp);
    this._fileChanged.emit({
      type: 'delete',
      oldValue: { path },
      newValue: null
    });
  }

  async rename(
    path: string,
    newLocalPath: string,
    options?: Contents.IFetchOptions
  ): Promise<Contents.IModel> {
    const oldPath = GcsService.pathParser(path);
    const newPath = GcsService.pathParser(newLocalPath);

    if (
      newLocalPath.split('/')[newLocalPath.split('/').length - 1].length >= 1024
    ) {
      await showDialog({
        title: 'Rename Error',
        body: 'The maximum object length is 1024 characters',
        buttons: [Dialog.okButton()]
      });
      return DIRECTORY_IMODEL;
    }
    if (
      !path.includes('UntitledFolder' + untitledFolderSuffix) &&
      (!path.includes('.') || !newLocalPath.includes('.'))
    ) {
      await showDialog({
        title: 'Rename Error',
        body: 'Renaming Folder/Bucket is not allowed',
        buttons: [Dialog.okButton()]
      });
      return DIRECTORY_IMODEL;
    } else {
      if (oldPath.path.includes('UntitledFolder' + untitledFolderSuffix)) {
        oldPath.path = oldPath.path + '/';
        newPath.path = newPath.path + '/';
        path = path + '/';
      }
      const response = await GcsService.renameFile({
        oldBucket: oldPath.bucket,
        oldPath: oldPath.path,
        newBucket: newPath.bucket,
        newPath: newPath.path
      });

      if (response === 200) {
        await GcsService.deleteFile({
          bucket: oldPath.bucket,
          path: oldPath.path
        });
      }

      const contents = {
        type: 'file',
        path: newLocalPath,
        name: newLocalPath.split('\\').at(-1) ?? '',
        format: options?.format ?? 'text',
        content: '',
        created: '',
        writable: true,
        last_modified: '',
        mimetype: ''
      };

      return contents;
    }
  }

  async copy(localPath: string, toLocalDir: string): Promise<Contents.IModel> {
    throw 'Not Implemented';
  }

  // Checkpoint APIs, not currently supported.
  async createCheckpoint(
    localPath: string
  ): Promise<Contents.ICheckpointModel> {
    return {
      id: '',
      last_modified: ''
    };
  }

  async listCheckpoints(
    localPath: string
  ): Promise<Contents.ICheckpointModel[]> {
    return [];
  }

  async restoreCheckpoint(
    localPath: string,
    checkpointID: string
  ): Promise<void> {}

  async deleteCheckpoint(
    localPath: string,
    checkpointID: string
  ): Promise<void> {}
}
