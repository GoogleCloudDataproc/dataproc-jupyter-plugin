/**
 * @license
 * Copyright 2025 Google LLC
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

interface ApiEnabledResponse {
  success: boolean;
  is_enabled: boolean;
}

export class BigQueryWidgetService {
  static getBigQueryProjectsListAPIService = async (
    setProjectNameList: (value: string[]) => void,
    setIsLoading: (value: boolean) => void,
    setApiError: (value: boolean) => void,
    setProjectName: (value : string) => void,
  ) => {
    try {
      const credentials = await authApi();
      if (credentials) setProjectName(credentials.project_id || '');
      const result: ApiEnabledResponse =
        await BigQueryWidgetService.checkBigQueryDatasetsAPIService();
      if (result?.is_enabled) {
        const data: string[] = await requestAPI(`bigQueryProjectsList`);
        setProjectNameList(data);
        setApiError(false);
      } else {
        setProjectNameList([]);
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
    finally{
      setIsLoading(false);
    }
  };

  static checkBigQueryDatasetsAPIService = async (): Promise<ApiEnabledResponse> => {
    try {
      const data: ApiEnabledResponse = await requestAPI(
        `checkApiEnabled?service_name=${BIGQUERY_SERVICE_NAME}`,
        {
          method: 'POST'
        }
      );
      return data;
    } catch (reason) {
      return { success: false, is_enabled: false };
    }
  };
}
