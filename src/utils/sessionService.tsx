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
  API_HEADER_CONTENT_TYPE,
  BASE_URL,
  API_HEADER_BEARER
} from '../utils/const';
import { authApi, toastifyCustomStyle, loggedFetch } from '../utils/utils';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';

export const deleteSessionAPI = async (selectedSession: string) => {
  const credentials = await authApi();
  if (credentials) {
    loggedFetch(
      `${BASE_URL}/projects/${credentials.project_id}/locations/${credentials.region_id}/sessions/${selectedSession}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token
        }
      }
    )
      .then(async (response: Response) => {
        console.log(response);
        const formattedResponse = await response.json()
        if (formattedResponse?.error?.code) {
          toast.error(formattedResponse?.error?.message, toastifyCustomStyle);
        }
        else{
        toast.success(
          `Session ${selectedSession} deleted successfully`,
          toastifyCustomStyle
        );
        }
      })
      .catch((err: Error) => {
        console.error('Error deleting session', err);
        DataprocLoggingService.log('Error deleting session', LOG_LEVEL.ERROR);
        toast.error(
          `Failed to delete the session ${selectedSession}`,
          toastifyCustomStyle
        );
      });
  }
};
export const terminateSessionAPI = async (selectedSession: string) => {
  const credentials = await authApi();
  if (credentials) {
    loggedFetch(
      `${BASE_URL}/projects/${credentials.project_id}/locations/${credentials.region_id}/sessions/${selectedSession}:terminate`,
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
          .then(async (responseResult: Response) => {
            console.log(responseResult);
            const formattedResponse = await responseResult.json()
            if (formattedResponse?.error?.code) {
              toast.error(formattedResponse?.error?.message, toastifyCustomStyle);
            }
          })
          .catch((e: Error) => console.log(e));
      })
      .catch((err: Error) => {
        console.error('Error terminating session', err);
        DataprocLoggingService.log('Error terminating session', LOG_LEVEL.ERROR);
        toast.error(
          `Failed to terminate session ${selectedSession}`,
          toastifyCustomStyle
        );
      });
  }
};
