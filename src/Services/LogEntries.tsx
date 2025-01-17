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
import { requestAPI } from "../handler/handler";
import { IDagRunList } from "../scheduler/VertexScheduler/VertexInterfaces";

export class LogEntriesServices {

    static vertexJobTaskLogsListService = async (
        dagRunId: string | undefined,
        jobRunsData: IDagRunList | undefined,
        setDagTaskInstancesList: (value: any) => void,
        setIsLoading: (value: boolean) => void
    ) => {
        setDagTaskInstancesList([]);
        setIsLoading(true);
        const start_date = encodeURIComponent(jobRunsData?.startDate || '');
        const end_date = encodeURIComponent(jobRunsData?.endDate || '');
        try {
            const data: any = await requestAPI(
                `api/logEntries/listEntries?filter_query=timestamp >= \"${start_date}" AND timestamp <= \"${end_date}" AND SEARCH(\"${dagRunId}\")`
            );
            if (data.length > 0) {
                let transformDagRunTaskInstanceListData = [];
                transformDagRunTaskInstanceListData = data.map(
                    (dagRunTask: any) => {
                        return {
                            severity: dagRunTask.severity,
                            textPayload: dagRunTask.textPayload && dagRunTask.textPayload ? dagRunTask.textPayload : '',
                            date: new Date(dagRunTask.timestamp).toDateString(),
                            time: new Date(dagRunTask.timestamp).toTimeString().split(' ')[0],
                            fullData: dagRunTask,
                        };
                    }
                );
                setDagTaskInstancesList(transformDagRunTaskInstanceListData);
            } else {
                setDagTaskInstancesList([])
            }
            setIsLoading(false);
        } catch (reason) {
            setIsLoading(false);
            setDagTaskInstancesList([]);
        }
    };
}
