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
import { authApi, toastifyCustomStyle } from '../utils/utils';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const deleteRuntimeTemplateAPI = async (
  selectedRuntimeTemplate: string,
  selectedRuntimeTemplateDisplayName: string
) => {
  const credentials = await authApi();
  if (credentials) {
    fetch(`${BASE_URL}/${selectedRuntimeTemplate}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': API_HEADER_CONTENT_TYPE,
        Authorization: API_HEADER_BEARER + credentials.access_token
      }
    })
      .then((response: Response) => {
        toast.success(
          `${selectedRuntimeTemplateDisplayName} is deleted successfully`,
          toastifyCustomStyle
        );
        console.log(response);
      })
      .catch((err: Error) => {
        console.error('Error deleting session', err);
        toast.error(
          `Failed to delete the session ${selectedRuntimeTemplateDisplayName}`,
          toastifyCustomStyle
        );
      });
  }
};
