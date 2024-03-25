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

import 'react-toastify/dist/ReactToastify.css';
import { requestAPI } from '../handler/handler';

export class DpmsService {
  static bigQueryPreviewAPIService = async (
    columns: any,
    setIsLoading: (value: boolean) => void,
    setSessionsList: any
  ) => {
    try {
      const data: any = await requestAPI(
        'bigQueryPreview?dataset_id=bike_share&table_id=bike_sharestations'
      );
      let transformRowInfoList: any = [];
      data.rows.forEach((rowInfo: any) => {
        let transformRowInfo: any = {};
        rowInfo['f'].forEach((fieldInfo: any, index: number) => {
          transformRowInfo[columns[index].Header] = fieldInfo['v'];
        });
        console.log(transformRowInfo);
        transformRowInfoList.push(transformRowInfo);
      });
      console.log(transformRowInfoList);
      setSessionsList(transformRowInfoList);
      setIsLoading(false);
    } catch (reason) {
      console.error(`Error on GET credentials.\n${reason}`);
    }
  };
}
