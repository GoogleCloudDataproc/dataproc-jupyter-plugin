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

import { API_HEADER_BEARER, API_HEADER_CONTENT_TYPE, gcpServiceUrls } from '../utils/const';
import { authApi, loggedFetch } from '../utils/utils';
import type { storage_v1 } from '@googleapis/storage';

export class GcsService {
  

  /**
   * Translate a Jupyter Lab file path into tokens.  IE.
   *   gs:bucket-name/directory/file.ipynb
   * (Note that this isn't exactly a gsutil compatible URI)
   * Would translate to:
   * {
   *   bucket: 'bucket-name',
   *   path: 'directory/file.ipynb',
   *   name: 'file.ipynb'
   * }
   * @param localPath The absolute Jupyter file path
   * @returns Object containing the GCS bucket and object ID
   */
  static pathParser(localPath: string) {
    const matches = /^(?<bucket>[\w\-\_\.]+)\/?(?<path>.*)/.exec(
      localPath
    )?.groups;
    if (!matches) {
      throw 'Invalid Path';
    }
    const path = matches['path'];
    return {
      path: path,
      bucket: matches['bucket'],
      name: path.split('/').at(-1)
    };
  }

  /**
   * Thin wrapper around storage.object.list
   * @see https://cloud.google.com/storage/docs/listing-objects#rest-list-objects
   */
  static async list({ prefix, bucket }: { prefix: string; bucket: string }) {
    const credentials = await authApi();
    if (!credentials) {
      throw 'not logged in';
    }
    const { STORAGE } = await gcpServiceUrls;
    const requestUrl = new URL(`${STORAGE}b/${bucket}/o`);
    requestUrl.searchParams.append('prefix', prefix);
    requestUrl.searchParams.append('delimiter', '/');
    const response = await fetch(requestUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': API_HEADER_CONTENT_TYPE,
        Authorization: API_HEADER_BEARER + credentials.access_token,
        'X-Goog-User-Project': credentials.project_id || ''
      }
    });
    return (await response.json()) as storage_v1.Schema$Objects;
  }

  /**
   * Thin wrapper around storage.bucket.list
   * @see https://cloud.google.com/storage/docs/listing-buckets#rest-list-buckets
   */
  static async listBuckets({ prefix }: { prefix: string }) {
    const credentials = await authApi();
    if (!credentials) {
      throw 'not logged in';
    }
    const { STORAGE } = await gcpServiceUrls;
    const requestUrl = new URL(`${STORAGE}b`);
    requestUrl.searchParams.append('project', credentials.project_id ?? '');
    requestUrl.searchParams.append('prefix', prefix);
    const response = await loggedFetch(requestUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': API_HEADER_CONTENT_TYPE,
        Authorization: API_HEADER_BEARER + credentials.access_token,
        'X-Goog-User-Project': credentials.project_id || ''
      }
    });
    return (await response.json());
  }

  /**
   * Thin wrapper around object download
   * @see https://cloud.google.com/storage/docs/downloading-objects#rest-download-object
   */
  static async getFile({
    bucket,
    path,
    format
  }: {
    bucket: string;
    path: string;
    format: 'text' | 'json' | 'base64';
  }): Promise<string> {
    const credentials = await authApi();
    if (!credentials) {
      throw 'not logged in';
    }
    const { STORAGE } = await gcpServiceUrls;
    const requestUrl = new URL(
      `${STORAGE}b/${bucket}/o/${encodeURIComponent(path)}`
    );
    requestUrl.searchParams.append('alt', 'media');
    const response = await loggedFetch(requestUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': API_HEADER_CONTENT_TYPE,
        Authorization: API_HEADER_BEARER + credentials.access_token,
        'X-Goog-User-Project': credentials.project_id || ''
      }
    });
    if (response.status !== 200) {
      throw response.statusText;
    }
    if (format == 'base64') {
      const blob = await response.blob();
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = e => {
          reject(e);
        };
      });
    } else if (format == 'json') {
      return await response.json();
    } else {
      return await response.text();
    }
  }

  /**
   * Thin wrapper around object download
   * @see https://cloud.google.com/storage/docs/downloading-objects#rest-download-object
   */
  static async downloadFile({
    bucket,
    path,
    name,
    format
  }: {
    bucket: string;
    path: string;
    name: string;
    format: 'text' | 'json' | 'base64';
  }): Promise<string> {
    const credentials = await authApi();
    if (!credentials) {
      throw 'not logged in';
    }
    const { STORAGE } = await gcpServiceUrls;
    const requestUrl = new URL(
      `${STORAGE}b/${bucket}/o/${encodeURIComponent(path)}`
    );
    requestUrl.searchParams.append('alt', 'media');
    const response = await fetch(requestUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': API_HEADER_CONTENT_TYPE,
        Authorization: API_HEADER_BEARER + credentials.access_token,
        'X-Goog-User-Project': credentials.project_id || ''
      }
    });
    if (response.status !== 200) {
      throw response.statusText;
    }

    let blob = await response.blob()
    // Create blob link to download
    const url = window.URL.createObjectURL(
      new Blob([blob]),
    );
    return url;
  }

  /**
   * Thin wrapper around object upload
   * @see https://cloud.google.com/storage/docs/uploading-objects#rest-upload-objects
   */
  static async saveFile({
    bucket,
    path,
    contents
  }: {
    bucket: string;
    path: string;
    contents: Blob | string;
  }) {
    const credentials = await authApi();
    if (!credentials) {
      throw 'not logged in';
    }
    const { STORAGE_UPLOAD } = await gcpServiceUrls;
    const requestUrl = new URL(`${STORAGE_UPLOAD}b/${bucket}/o`);
    requestUrl.searchParams.append('name', path);
    requestUrl.searchParams.append('uploadType', 'media');
    const response = await loggedFetch(requestUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': API_HEADER_CONTENT_TYPE,
        Authorization: API_HEADER_BEARER + credentials.access_token,
        'X-Goog-User-Project': credentials.project_id || ''
      },
      body: contents
    });
    if (response.status !== 200) {
      throw response.statusText;
    }
    return (await response.json()) as storage_v1.Schema$Object;
  }

  /**
   * Thin wrapper around object upload
   * @see https://cloud.google.com/storage/docs/uploading-objects#rest-upload-objects
   */
  static async createFolder({
    bucket,
    path,
    folderName
  }: {
    bucket: string;
    path: string;
    folderName: string;
  }) {
    const credentials = await authApi();
    if (!credentials) {
      throw 'not logged in';
    }
    const { STORAGE_UPLOAD } = await gcpServiceUrls;
    const requestUrl = new URL(`${STORAGE_UPLOAD}b/${bucket}/o`);
    let newFolderPath =
      path === '' ? path + folderName + '/' : path + '/' + folderName + '/';
    requestUrl.searchParams.append('name', newFolderPath);
    const response = await loggedFetch(requestUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': API_HEADER_CONTENT_TYPE,
        Authorization: API_HEADER_BEARER + credentials.access_token,
        'X-Goog-User-Project': credentials.project_id || ''
      }
    });
    if (response.status !== 200) {
      throw response.statusText;
    }
    return (await response.json()) as storage_v1.Schema$Object;
  }

  /**
   * Thin wrapper around object delete
   * @see https://cloud.google.com/storage/docs/deleting-objects
   */
  static async deleteFile({ bucket, path }: { bucket: string; path: string }) {
    const credentials = await authApi();
    if (!credentials) {
      throw 'not logged in';
    }
    const { STORAGE } = await gcpServiceUrls;
    const requestUrl = new URL(
      `${STORAGE}b/${bucket}/o/${encodeURIComponent(path)}`
    );

    const response = await fetch(requestUrl.toString(), {
      method: 'DELETE',
      headers: {
        'Content-Type': API_HEADER_CONTENT_TYPE,
        Authorization: API_HEADER_BEARER + credentials.access_token,
        'X-Goog-User-Project': credentials.project_id || ''
      }
    });
    if (response.status !== 204) {
      if (response.status === 404) {
        throw 'Deleting Folder/Bucket is not allowed';
      }
      throw response.statusText;
    }
  }

  /**
   * Thin wrapper around object delete
   * @see https://cloud.google.com/storage/docs/copying-renaming-moving-objects
   */
  static async renameFile({
    oldBucket,
    oldPath,
    newBucket,
    newPath
  }: {
    oldBucket: string;
    oldPath: string;
    newBucket: string;
    newPath: string;
  }) {
    const credentials = await authApi();
    if (!credentials) {
      throw 'not logged in';
    }
    const { STORAGE } = await gcpServiceUrls;
    const requestUrl = new URL(
      `${STORAGE}b/${oldBucket}/o/${encodeURIComponent(
        oldPath
      )}/rewriteTo/b/${newBucket}/o/${encodeURIComponent(newPath)}`
    );

    const response = await fetch(requestUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': API_HEADER_CONTENT_TYPE,
        Authorization: API_HEADER_BEARER + credentials.access_token,
        'X-Goog-User-Project': credentials.project_id || ''
      }
    });

    if (response.status === 200) {
      return response.status;
    } else {
      throw response.statusText;
    }
  }
}
