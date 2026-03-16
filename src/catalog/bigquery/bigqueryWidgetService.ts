/**
 * @license
 * Copyright 2024 Google LLC
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

import { Notification } from '@jupyterlab/apputils';
import { requestAPI } from 'handler/handler';
import {
  BIGQUERY_SERVICE_NAME,
} from 'utils/const';
import { authApi } from 'utils/utils';

export class BigQueryWidgetService {
  static getBigQueryProjectsListAPIService = async (
    setProjectNameInfo: any,
    setIsLoading: (value: boolean) => void,
    setApiError: (value: boolean) => void,
    setProjectName: any
  ) => {
    try {
      const credentials = await authApi();
      if (credentials) setProjectName(credentials.project_id || '');
      const result: any =
        await BigQueryWidgetService.checkBigQueryDatasetsAPIService();
      if (result?.is_enabled) {
        const data: any = await requestAPI(`bigQueryProjectsList`);
        setProjectNameInfo(data);
        setApiError(false);
      } else {
        setIsLoading(false);
        setProjectNameInfo([]);
        setApiError(true);
      }
    } catch (reason) {
      Notification.emit(
        `Error in calling BigQurey Project List API : ${reason}`,
        'error',
        {
          autoClose: 5000
        }
      );
    }
  };

  static checkBigQueryDatasetsAPIService = async () => {
    try {
      const data: any = await requestAPI(
        `checkApiEnabled?service_name=${BIGQUERY_SERVICE_NAME}`,
        {
          method: 'POST'
        }
      );
      return data;
    } catch (reason) {
      return reason;
    }
  };
}
