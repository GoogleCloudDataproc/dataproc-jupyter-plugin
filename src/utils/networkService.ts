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
  gcpServiceUrls
} from './const';
import { authApi, loggedFetch } from './utils';

type Network = {
  selfLink: string;
  network: string;
  subnetworks: string;
};

/**
 * Return a list of VPC Networks that matches the search term specified
 * for the current project.
 * @param search Search to feed to the name filter
 * @returns List of Networks that matches the search term.
 */
export const listNetworksAPI = async (search: string) => {
  const credentials = await authApi();
  const { COMPUTE } = await gcpServiceUrls;
  if (!credentials) {
    return [];
  }
  const requestUrl = new URL(
    `${COMPUTE}/projects/${credentials.project_id}/global/networks`
  );
  if (search.length > 0) {
    requestUrl.searchParams.append('filter', `name:${search}*`);
  }
  const resp = await loggedFetch(requestUrl.toString(), {
    headers: {
      'Content-Type': API_HEADER_CONTENT_TYPE,
      Authorization: API_HEADER_BEARER + credentials.access_token
    }
  });
  const json = (await resp.json()) as { items: Network[] };
  return json.items;
};

/**
 * Fetches all the subnetwork URIs for a given network.
 * @param network The networkURI to fetch all the subnetworks for.
 * @returns A list of subnetworksURI.
 */
export const listSubNetworksAPI = async (network: string) => {
  const credentials = await authApi();
  const { COMPUTE } = await gcpServiceUrls;
  if (!credentials) return [];
  const resp = await loggedFetch(
    `${COMPUTE}/projects/${credentials.project_id}/global/networks/${network}`,
    {
      headers: {
        'Content-Type': API_HEADER_CONTENT_TYPE,
        Authorization: API_HEADER_BEARER + credentials.access_token
      }
    }
  );
  const json: { subnetworks: string[] | null | undefined } = await resp.json();
  return json.subnetworks ?? [];
};
