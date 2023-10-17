import { Contents, ServerConnection } from '@jupyterlab/services';
import { ISignal, Signal } from '@lumino/signaling';
import { GcsService } from './gcsService';

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

export class GCSDrive implements Contents.IDrive {
  constructor() {
    // Not actually used, but the Contents.IDrive interface requires one.
    this.serverSettings = ServerConnection.makeSettings();
  }

  private _isDisposed = false;
  private _fileChanged = new Signal<this, Contents.IChangedArgs>(this);
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
    const content = await GcsService.listBuckets();
    if (!content) {
      throw 'Error Listing Buckets';
    }
    return {
      ...DIRECTORY_IMODEL,
      content: content.items?.map(bucket => ({
        ...DIRECTORY_IMODEL,
        path: bucket.name,
        name: bucket.name,
        last_modified: bucket.updated ?? ''
      }))
    };
  }

  /**
   * @returns IModel directory for the given local path.
   */
  private async getDirectory(localPath: string) {
    const path = GcsService.pathParser(localPath);
    const content = await GcsService.list({
      prefix: path.path,
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

  /**
   * @returns IModel file for the given local path.
   */
  private async getFileContent(
    localPath: string,
    options?: Contents.IFetchOptions
  ): Promise<string> {
    const path = GcsService.pathParser(localPath);
    const content = await GcsService.getFileDownload({
      path: path.path,
      bucket: path.bucket,
      name: path.name ? path.name: '',
      format: options?.format ?? 'text'
    });
    if (!content) {
      throw 'Error Listing Objects';
    }
    return content;
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

  async getDownloadUrl(localPath: string, options?: Contents.IFetchOptions): Promise<string> {
    this.getFileContent(localPath, options)
    return 'Download successfully'
  }

  async newUntitled(
    options?: Contents.ICreateOptions
  ): Promise<Contents.IModel> {
    throw 'Not Implemented';
  }

  async delete(localPath: string): Promise<void> {
    const path = GcsService.pathParser(localPath);
    const resp = await GcsService.deleteFile({
      bucket: path.bucket,
      path: path.path
    });
    console.log(resp);
  }

  async rename(
    oldLocalPath: string,
    newLocalPath: string
  ): Promise<Contents.IModel> {
    throw 'Not Implemented';
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
