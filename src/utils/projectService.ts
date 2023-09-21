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

import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  PROJECT_LIST_URL
} from '../utils/const';
import { authApi } from '../utils/utils';

interface IProject {
  projectId: string;
  name: string;
}

export const projectListAPI = async (prefix: string): Promise<string[]> => {
  const credentials = await authApi();
  if (!credentials) {
    return [];
  }
  const requestUrl = new URL(PROJECT_LIST_URL);
  if (prefix.length > 0) {
    requestUrl.searchParams.append('filter', `name:${prefix}*`);
  }
  requestUrl.searchParams.append('pageSize', '200');
  const resp = await fetch(requestUrl.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': API_HEADER_CONTENT_TYPE,
      Authorization: API_HEADER_BEARER + credentials.access_token
    }
  });
  const { projects } = (await resp.json()) as {
    projects: IProject[] | undefined;
  };
  return (projects ?? []).map(project => project.projectId);
};
