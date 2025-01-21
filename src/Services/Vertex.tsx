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
import { toast } from "react-toastify";
import { requestAPI } from "../handler/handler";
import { DataprocLoggingService, LOG_LEVEL } from "../utils/loggingService";
import { toastifyCustomStyle } from "../utils/utils";
import {
  IMachineType,
  ICreatePayload
} from "../scheduler/VertexScheduler/VertexInterfaces";

export class VertexServices {
  static machineTypeAPIService = async (
    region: string,
    setMachineTypeList: (value: IMachineType[]) => void,
    setMachineTypeLoading: (value: boolean) => void,
  ) => {
    try {
      setMachineTypeLoading(true)
      const formattedResponse: any = await requestAPI(`api/vertex/uiConfig?region_id=${region}`);
      if (formattedResponse.length > 0) {
        setMachineTypeList(formattedResponse);
      } else {
        setMachineTypeList([])
      }
      setMachineTypeLoading(false)
    } catch (error) {
      setMachineTypeList([])
      setMachineTypeLoading(false)
      DataprocLoggingService.log(
        'Error listing machine type',
        LOG_LEVEL.ERROR
      );
      toast.error(
        `Failed to fetch machine type list`,
        toastifyCustomStyle
      );
    }
  };
  static createVertexSchedulerService = async (
    payload: ICreatePayload,
    setCreateCompleted: (value: boolean) => void,
    setCreatingVertexScheduler: (value: boolean) => void,
  ) => {
    setCreatingVertexScheduler(true);
    try {
      const data: any = await requestAPI('api/vertex/createJobScheduler', {
        body: JSON.stringify(payload),
        method: 'POST'
      });
      if (data.error) {
        toast.error(data.error, toastifyCustomStyle);
        setCreatingVertexScheduler(false);
      } else {
        toast.success(
          `Job ${payload.display_name} successfully created`,
          toastifyCustomStyle
        );
        setCreatingVertexScheduler(false);
        setCreateCompleted(true);
      }
    } catch (reason) {
      setCreatingVertexScheduler(false);
      toast.error(
        `Error on POST {dataToSend}.\n${reason}`,
        toastifyCustomStyle
      );
    }
  };
}