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

import { API_HEADER_BEARER, API_HEADER_CONTENT_TYPE } from '../utils/const';
import { authApi } from '../utils/utils';

interface GenerateCodeResponse {
  predictions: Array<{
    content: string;
    score: number;
  }>;
}

type Options = {
  prefix: string;
  postfix?: string;
  model?: string;
  maxOutputTokens?: number;
  stopSequences?: string[];
};

type IdleStatus = {
  state: 'idle';
};

type RunningStatus = {
  state: 'running';
};

type ErrorStatus = {
  state: 'error';
  errorMsg: string;
};
export type Status = IdleStatus | RunningStatus | ErrorStatus;

class DataprocCodeCompletionFetcherServiceImpl extends EventTarget {
  private _status: Status = { state: 'idle' };

  set status(newStatus: Status) {
    this._status = newStatus;
    console.log(this._status);
    this.dispatchEvent(new Event('status-updated'));
  }

  get status() {
    return this._status;
  }

  async fetch(options: Options) {
    const { prefix, postfix, model, maxOutputTokens, stopSequences } = {
      postfix: '',
      model: 'code-bison',
      maxOutputTokens: 256,
      ...options
    };

    try {
      this.status = {
        state: 'running'
      };

      const credentials = await authApi();
      if (!credentials) throw 'User Not Logged In';

      const response = await fetch(
        `https://${credentials.region_id}-aiplatform.googleapis.com/v1/projects/${credentials.project_id}/locations/${credentials.region_id}/publishers/google/models/${model}:predict`,
        {
          method: 'POST',
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          },
          body: JSON.stringify({
            instances: {
              prefix,
              postfix
            },
            parameters: {
              temperature: 0.3,
              maxOutputTokens,
              candidateCount: 1,
              stopSequences
            }
          })
        }
      );
      if (response.status === 403) {
        throw 'API not enabled.';
      }
      this.status = {
        state: 'idle'
      };
      const responseJson = (await response.json()) as GenerateCodeResponse;
      return responseJson.predictions;
    } catch (e) {
      this.status = {
        state: 'error',
        errorMsg: e as string
      };
      throw e;
    }
  }
}

export const DataprocCodeCompletionFetcherService =
  new DataprocCodeCompletionFetcherServiceImpl();
