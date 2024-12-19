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
import { SchedulerService } from '../schedulerServices';
import { IconDownload } from '../../utils/icons';
import { IDagRunList } from './VertexInterfaces';
import { VertexServices } from '../../Services/Vertex';

const VertexJobRuns = ({
    region,
    schedulerData,
    dagId,
    setJobRunsData,
    setDagRunId,
    selectedMonth,
    selectedDate,
    setBlueListDates,
    setGreyListDates,
    setOrangeListDates,
    setRedListDates,
    setGreenListDates,
    setDarkGreenListDates,
    bucketName,
    setIsLoading,
    isLoading,
    dagRunsList,
    setDagRunsList
}: {
    region: string;
    schedulerData: string;
    dagId: string;
    setJobRunsData: React.Dispatch<React.SetStateAction<IDagRunList | undefined>>;
    setDagRunId: (value: string) => void;
    selectedMonth: Dayjs | null;
    selectedDate: Dayjs | null;
    setBlueListDates: (value: string[]) => void;
    setGreyListDates: (value: string[]) => void;
    setOrangeListDates: (value: string[]) => void;
    setRedListDates: (value: string[]) => void;
    setGreenListDates: (value: string[]) => void;
    setDarkGreenListDates: (value: string[]) => void;
    bucketName: string;
    setIsLoading: (value: boolean) => void;
    isLoading: boolean;
    dagRunsList: IDagRunList[];
    setDagRunsList: (value: IDagRunList[]) => void;
}): JSX.Element => {
    const [downloadOutputDagRunId, setDownloadOutputDagRunId] = useState('');
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
        return dagRunsList;
    }, [dagRunsList, selectedDate]);

    // Sync filtered data with the parent component's state
    useEffect(() => {
        if (filteredData.length > 0) {
            setJobRunsData(filteredData[0]);
            setDagRunId(filteredData[0].dagRunId)
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

    const handleDagRunStateClick = (data: { id?: string; status?: string; dagRunId?: string; }) => {
        if (data.dagRunId) {
            setDagRunId(data.dagRunId);
        }
    };

    const handleDownloadOutput = async (event: React.MouseEvent) => {
        const dagRunId = event.currentTarget.getAttribute('data-dag-run-id')!;
        await SchedulerService.handleDownloadOutputNotebookAPIService(
            schedulerData,
            dagRunId,
            bucketName,
            dagId,
            setDownloadOutputDagRunId
        );
    };

    const renderActions = (data: { id?: string; status?: string; dagRunId?: string; state?: string; }) => {
        return (
            <div className="actions-icon">
                {data.dagRunId === downloadOutputDagRunId ? (
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
                        data-dag-run-id={data.dagRunId}
                        onClick={
                            data.state === 'succeeded'
                                ? e => handleDownloadOutput(e)
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
