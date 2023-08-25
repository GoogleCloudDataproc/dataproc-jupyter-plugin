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

import { useEffect, useRef, useState } from 'react';
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  PROJECT_LIST_URL
} from '../utils/const';
import { authApi } from '../utils/utils';

interface Project {
  projectId: string;
  name: string;
}

const projectListAPI = async (prefix: string): Promise<Project[]> => {
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
  const { projects } = (await resp.json()) as { projects: Project[] };
  return projects;
};

/**
 * Hook for returning a list of Cloud Project Names with the prefix
 * specified.
 * @param prefix The prefix string to search for.
 * @returns List of projects that matches the prefix.  If the results
 *   are pending, an empty list is returned.
 */
export function useProjectList(prefix: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const currentPrefix = useRef(prefix);
  useEffect(() => {
    currentPrefix.current = prefix;
    projectListAPI(prefix).then(projects => {
      if (currentPrefix.current != prefix) {
        // The prefix changed while the network request was pending
        // so we should throw away these results.
        return;
      }
      setProjects(projects);
    });
  }, [prefix]);
  return projects;
}
