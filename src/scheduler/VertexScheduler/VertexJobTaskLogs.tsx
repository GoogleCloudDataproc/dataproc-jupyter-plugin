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
import React, { useEffect, useState } from 'react';
import { Typography, CircularProgress } from '@mui/material';
import { SchedulerService } from '../schedulerServices';
import { handleDebounce } from '../../utils/utils';
import { VertexServices } from './VertexServices';
import { IconExpandLess, IconExpandMore } from '../../utils/icons';

interface IDagRunList {
    dagRunId: string;
    startDate: string;
    endDate: string;
    gcsUrl: string;
    state: string;
    date: Date;
    time: string;
}

const VertexJobTaskLogs = ({
    composerName,
    dagId,
    dagRunId,
    jobRunsData,
}: {
    composerName: string;
    dagId: string;
    dagRunId: string;
    jobRunsData: IDagRunList | undefined;
}): JSX.Element => {
    const [dagTaskInstancesList, setDagTaskInstancesList] = useState<any>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [expanded, setExpanded] = useState<string | false>(false);
    const [loglist, setLogList] = useState('');

    const [height, setHeight] = useState(window.innerHeight - 320);
    console.log(dagTaskInstancesList)
    function handleUpdateHeight() {
        let updateHeight = window.innerHeight - 320;
        setHeight(updateHeight);
    }

    // Debounce the handleUpdateHeight function
    const debouncedHandleUpdateHeight = handleDebounce(handleUpdateHeight, 500);

    // Add event listener for window resize using useEffect
    useEffect(() => {
        window.addEventListener('resize', debouncedHandleUpdateHeight);

        // Cleanup function to remove event listener on component unmount
        return () => {
            window.removeEventListener('resize', debouncedHandleUpdateHeight);
        };
    }, []);

    const listDagTaskInstancesRunsList = async () => {
        await VertexServices.vertexJobTaskLogsListService(
            dagRunId,
            jobRunsData,
            setDagTaskInstancesList,
            setIsLoading
        );
    };

    useEffect(() => {
        if (dagRunId && jobRunsData) {
            listDagTaskInstancesRunsList();
            setExpanded(false);
        }
    }, [dagRunId, jobRunsData]);

    useEffect(() => {
        if (dagTaskInstancesList.length > 0) {
            setExpanded('0');
            listDagTaskLogList('0', dagTaskInstancesList[0].tryNumber);
        }
    }, [dagTaskInstancesList]);

    const handleChange = (
        index: string,
        iconIndex: number,
        fromClick: string
    ) => {
        if (`${index}` === expanded && fromClick === 'expandClick') {
            setExpanded(false);
        } else {
            setExpanded(`${index}`);
            listDagTaskLogList(index, iconIndex);
        }
    };

    const listDagTaskLogList = async (index: string, iconIndex: number) => {
        await SchedulerService.listDagTaskLogsListService(
            composerName,
            dagId,
            dagRunId,
            dagTaskInstancesList[index].taskId,
            iconIndex,
            setLogList,
            setIsLoadingLogs
        );
    };
    return (
        <div>
            {dagTaskInstancesList.length > 0 ? (
                <div>
                    <div className="accordion-vertex-row-parent-header">
                        <div className="accordion-vertex-row-data">Severity</div>
                        {/* <div className="accordion-vertex-row-data">Date</div> */}
                        <div className="accordion-vertex-row-data">Time Stamp</div>
                        <div className="accordion-vertex-row-data">Summary</div>
                        <div className="accordion-row-data-expand-logo"></div>
                    </div>
                    {dagTaskInstancesList.length > 0 &&
                        dagTaskInstancesList.map((taskInstance: { severity: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; date: string; time: string; textPayload: string; tryNumber: number; }, index: string) => (
                            <div>
                                <div className="accordion-vertex-row-parent">
                                    <div className="accordion-vertex-row-data">
                                        {taskInstance.severity}
                                    </div>
                                    <div className="accordion-vertex-row-data">
                                        {taskInstance.date + " " + taskInstance.time}
                                    </div>
                                    <div className="accordion-vertex-row-data">
                                        {taskInstance.textPayload.split(']')[1]}
                                    </div>
                                    {taskInstance.tryNumber !== 0 ? (
                                        <div
                                            className="accordion-row-data-expand-logo"
                                            onClick={() =>
                                                handleChange(
                                                    index,
                                                    taskInstance.tryNumber,
                                                    'expandClick'
                                                )
                                            }
                                        >
                                            {expanded === `${index}` ? (
                                                <IconExpandLess.react
                                                    tag="div"
                                                    className="icon-white logo-alignment-style-accordion"
                                                />
                                            ) : (
                                                <IconExpandMore.react
                                                    tag="div"
                                                    className="icon-white logo-alignment-style-accordion"
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <div className="accordion-row-data-expand-logo"></div>
                                    )}
                                </div>

                                {isLoadingLogs && expanded === `${index}` ? (
                                    <div className="spin-loader-main">
                                        <CircularProgress
                                            className="spin-loader-custom-style"
                                            color="primary"
                                            size={18}
                                        />
                                        Loading Dag Runs Task Logs
                                    </div>
                                ) : (
                                    expanded === `${index}` && (
                                        <div>
                                            {' '}
                                            <Typography>
                                                <pre
                                                    className="logs-content-style"
                                                    style={{ maxHeight: height }}
                                                >
                                                    {loglist}
                                                </pre>
                                            </Typography>{' '}
                                        </div>
                                    )
                                )}
                            </div>
                        ))}
                </div>
            ) : (
                <div>
                    {isLoading ? (
                        <div className="spin-loader-main">
                            <CircularProgress
                                className="spin-loader-custom-style"
                                color="primary"
                                size={18}
                            />
                            Loading Dag Runs Task Instances
                        </div>
                    ) : (
                        <div className="no-data-style">No rows to display</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default VertexJobTaskLogs;
