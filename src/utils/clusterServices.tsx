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

import { toast } from 'react-toastify';
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  BASE_URL
} from '../utils/const';
import { authApi, toastifyCustomStyle } from '../utils/utils';

export const deleteClusterApi = async (selectedcluster: string) => {
  const credentials = await authApi();
  if (credentials) {
    fetch(
      `${BASE_URL}/projects/${credentials.project_id}/regions/${credentials.region_id}/clusters/${selectedcluster}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token
        }
      }
    )
      .then((response: Response) => {
        response
          .json()
          .then((responseResult: Response) => {
            console.log(responseResult);
            toast.success(`Cluster ${selectedcluster} deleted successfully`, toastifyCustomStyle);
          })
          .catch((e: Error) => console.log(e));
      })
      .catch((err: Error) => {
        console.error('Error deleting cluster', err);
      });
  }
};

export const startStopAPI = async (
  selectedcluster: string,
  operation: 'start' | 'stop'
) => {
  const credentials = await authApi();
  if (credentials) {
    fetch(
      `${BASE_URL}/projects/${credentials.project_id}/regions/${credentials.region_id}/clusters/${selectedcluster}:${operation}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token
        }
      }
    )
      .then((response: Response) => {
        response
          .json()
          .then((responseResult: Response) => {
            console.log(responseResult);
          })
          .catch((e: Error) => console.log(e));
      })
      .catch((err: Error) => {
        console.error(`Error ${operation} cluster`, err);
        toast.error(`Failed to ${operation} the cluster ${selectedcluster}`, toastifyCustomStyle);
      });
  }
};

export const startClusterApi = async (selectedcluster: string) => {
  startStopAPI(selectedcluster, 'start');
};
export const stopClusterApi = async (selectedcluster: string) => {
  startStopAPI(selectedcluster, 'stop');
};
