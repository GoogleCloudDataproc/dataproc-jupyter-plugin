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
import { useTable, useGlobalFilter } from 'react-table';
import { CircularProgress } from '@mui/material';
import { Dayjs } from 'dayjs';

import TableData from '../../utils/tableData';
import { ICellProps, handleDebounce } from '../../utils/utils';
import { IconDownload } from '../../utils/icons';
import { IDagRunList, ISchedulerData } from './VertexInterfaces';
import { VertexServices } from '../../Services/Vertex';
import { StorageServices } from '../../Services/Storage';

const VertexJobRuns = ({
    region,
    schedulerData,
    scheduleName,
    dagId,
    setJobRunsData,
    setJobRunId,
    selectedMonth,
    selectedDate,
    setBlueListDates,
    setGreyListDates,
    setOrangeListDates,
    setRedListDates,
    setGreenListDates,
    setDarkGreenListDates,
    setIsLoading,
    isLoading,
    dagRunsList,
    setDagRunsList
}: {
    region: string;
    schedulerData: ISchedulerData | undefined;
    scheduleName: string;
    dagId: string;
    setJobRunsData: React.Dispatch<React.SetStateAction<IDagRunList | undefined>>;
    setJobRunId: (value: string) => void;
    selectedMonth: Dayjs | null;
    selectedDate: Dayjs | null;
    setBlueListDates: (value: string[]) => void;
    setGreyListDates: (value: string[]) => void;
    setOrangeListDates: (value: string[]) => void;
    setRedListDates: (value: string[]) => void;
    setGreenListDates: (value: string[]) => void;
    setDarkGreenListDates: (value: string[]) => void;
    setIsLoading: (value: boolean) => void;
    isLoading: boolean;
    dagRunsList: IDagRunList[];
    setDagRunsList: (value: IDagRunList[]) => void;
}): JSX.Element => {
    const [jobDownloadLoading, setJobDownloadLoading] = useState(false);
    const [downloadOutputDagRunId, setDownloadOutputDagRunId] = useState<string | undefined>('');
    const [listDagRunHeight, setListDagRunHeight] = useState(
        window.innerHeight - 485
    );

    function handleUpdateHeight() {
        let updateHeight = window.innerHeight - 485;
        setListDagRunHeight(updateHeight);
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

    /** 
     * Filters dagRunsList based on the selected date.
     */
    const filteredData = React.useMemo(() => {
        if (selectedDate) {
            const selectedDateString = selectedDate.toDate().toDateString(); // Only date, ignoring time
            return dagRunsList.filter((dagRun) => {
                return new Date(dagRun.date).toDateString() === selectedDateString;
            });
        }
        return [];
    }, [dagRunsList, selectedDate]);

    // Sync filtered data with the parent component's state
    useEffect(() => {
        if (filteredData.length > 0) {
            setJobRunsData(filteredData[0]);
            setJobRunId(filteredData[0].jobRunId)
        }
    }, [filteredData, setJobRunsData]);

    const columns = React.useMemo(
        () => [
            {
                Header: 'State',
                accessor: 'state'
            },
            {
                Header: 'Date',
                accessor: 'date'
            },
            {
                Header: 'Time',
                accessor: 'time'
            },
            {
                Header: 'Actions',
                accessor: 'actions'
            }
        ],
        []
    );

    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        rows,
        prepareRow,
        page,
    } = useTable(
        //@ts-ignore react-table 'columns' which is declared here on type 'TableOptions<ICluster>'
        { columns, data: filteredData, autoResetPage: false, initialState: { pageSize: filteredData.length } },
        useGlobalFilter,
    );

    const tableDataCondition = (cell: ICellProps) => {
        if (cell.column.Header === 'Actions') {
            return (
                <td {...cell.getCellProps()} className="clusters-table-data">
                    {renderActions(cell.row.original)}
                </td>
            );
        } else if (cell.column.Header === 'State') {
            if (cell.value === 'succeeded') {
                return (
                    <div className="dag-run-state-parent">
                        <td
                            {...cell.getCellProps()}
                            className="dag-runs-table-data-state-success"
                            onClick={() => handleDagRunStateClick(cell.row.original)}
                        >
                            {cell.render('Cell')}
                        </td>
                    </div>
                );
            } else if (cell.value === 'failed') {
                return (
                    <div className="dag-run-state-parent">
                        <td
                            {...cell.getCellProps()}
                            className="dag-runs-table-data-state-failure"
                            onClick={() => handleDagRunStateClick(cell.row.original)}
                        >
                            {cell.render('Cell')}
                        </td>
                    </div>
                );
            } else if (cell.value === 'running') {
                return (
                    <div className="dag-run-state-parent">
                        <td
                            {...cell.getCellProps()}
                            className="dag-runs-table-data-state-running"
                            onClick={() => handleDagRunStateClick(cell.row.original)}
                        >
                            {cell.render('Cell')}
                        </td>
                    </div>
                );
            } else if (cell.value === 'queued') {
                return (
                    <div className="dag-run-state-parent">
                        <td
                            {...cell.getCellProps()}
                            className="dag-runs-table-data-state-queued"
                            onClick={() => handleDagRunStateClick(cell.row.original)}
                        >
                            {cell.render('Cell')}
                        </td>
                    </div>
                );
            }
        }
        return (
            <td {...cell.getCellProps()} className="notebook-template-table-data">
                {cell.render('Cell')}
            </td>
        );
    };

    /** 
     * @param {Object} data - The data object containing information about the DAG run.
     * @param {string} data.id - The optional ID of the DAG run.
     * @param {string} data.status - The optional status of the DAG run.
     * @param {string} data.jobRunId - The optional jobRunId of the DAG run.
     * 
     * @description Updates the jobRunId state if a jobRunId is provided in the data object.
     * Triggered when a DAG run state is clicked.
     */
    const handleDagRunStateClick = (data: { id?: string; status?: string; jobRunId?: string; }) => {
        if (data.jobRunId) {
            setJobRunId(data.jobRunId);
        }
    };
    /** 
     * Handles the download of a job's output by triggering the download API service.
     * @param {Object} data - The data related to the job run and output.
     * @param {string} data.id - The optional ID of the job run.
     * @param {string} data.status - The optional status of the job run.
     * @param {string} data.jobRunId - The optional job run ID associated with the job output.
     * @param {string} data.state - The optional state of the job run.
     * @param {string} data.gcsUrl - The URL of the output file in Google Cloud Storage (GCS).
     * @param {string} data.fileName - The name of the file to be downloaded.
     */
    const handleDownloadOutput = async (data: { id?: string; status?: string; jobRunId?: string; state?: string; gcsUrl?: string; fileName?: string; }) => {
        setDownloadOutputDagRunId(data.jobRunId)
        await StorageServices.downloadJobAPIService(
            data.gcsUrl,
            data.fileName,
            data.jobRunId,
            setJobDownloadLoading,
            scheduleName
        );
    };

    const renderActions = (data: { id?: string; status?: string; jobRunId?: string; state?: string; }) => {
        return (
            <div className="actions-icon">
                {jobDownloadLoading && data.jobRunId === downloadOutputDagRunId ? (
                    <div className="icon-buttons-style">
                        <CircularProgress
                            size={18}
                            aria-label="Loading Spinner"
                            data-testid="loader"
                        />
                    </div>
                ) : (
                    <div
                        role="button"
                        className={
                            data.state === 'succeeded'
                                ? 'icon-buttons-style'
                                : 'icon-buttons-style-disable'
                        }
                        title="Download Output"
                        data-dag-run-id={data}
                        onClick={
                            data.state === 'succeeded'
                                ? e => handleDownloadOutput(data)
                                : undefined
                        }
                    >
                        <IconDownload.react
                            tag="div"
                            className="icon-white logo-alignment-style"
                        />
                    </div>
                )}
            </div>
        );
    };

    const scheduleRunsList = async () => {
        await VertexServices.executionHistoryServiceList(
            region,
            schedulerData,
            selectedMonth,
            setIsLoading,
            setDagRunsList,
            setBlueListDates,
            setGreyListDates,
            setOrangeListDates,
            setRedListDates,
            setGreenListDates,
            setDarkGreenListDates,
        );
    };

    useEffect(() => {
        if (selectedMonth !== null) {
            scheduleRunsList();
        }
    }, [selectedMonth]);


    return (
        <div>
            <>
                {(!isLoading && filteredData && filteredData.length > 0) ? (
                    <div>
                        <div
                            className="dag-runs-list-table-parent"
                            style={{ maxHeight: listDagRunHeight }}
                        >
                            <TableData
                                getTableProps={getTableProps}
                                headerGroups={headerGroups}
                                getTableBodyProps={getTableBodyProps}
                                rows={rows}
                                page={page}
                                prepareRow={prepareRow}
                                tableDataCondition={tableDataCondition}
                                fromPage="Dag Runs"
                            />
                        </div>
                    </div>
                ) : (
                    <div>
                        {
                            isLoading &&
                            <div className="spin-loader-main">
                                <CircularProgress
                                    className="spin-loader-custom-style"
                                    size={18}
                                    aria-label="Loading Spinner"
                                    data-testid="loader"
                                />
                                Loading History
                            </div>
                        }
                        {!isLoading && filteredData.length === 0 && (
                            <div className="no-data-style">No rows to display</div>
                        )}
                    </div>
                )}
            </>
        </div>
    );
};

export default VertexJobRuns;
