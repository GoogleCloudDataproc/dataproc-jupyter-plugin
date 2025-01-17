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
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { PickersDayProps, PickersDay } from '@mui/x-date-pickers/PickersDay';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { Box, LinearProgress } from '@mui/material';
import dayjs, { Dayjs } from 'dayjs';

import { authApi, handleDebounce } from '../../utils/utils';
import VertexJobRuns from './VertexJobRuns';
import VertexJobTaskLogs from './VertexJobTaskLogs';
import { IconLeftArrow } from '../../utils/icons';
import { IDagRunList, ISchedulerData } from './VertexInterfaces';

const VertexExecutionHistory = ({
    region,
    setRegion,
    schedulerData,
    scheduleName,
    handleBackButton,
    setExecutionPageFlag
}: {
    region: string;
    setRegion: (value: string) => void;
    schedulerData: ISchedulerData | undefined;
    scheduleName: string;
    handleBackButton: () => void;
    setExecutionPageFlag: (value: boolean) => void;
}): JSX.Element => {

    const today = dayjs()

    const [jobRunId, setJobRunId] = useState<string>('');
    const [dagRunsList, setDagRunsList] = useState<IDagRunList[]>([]);
    const [jobRunsData, setJobRunsData] = useState<IDagRunList | undefined>();
    const currentDate = new Date().toLocaleDateString();
    const [selectedMonth, setSelectedMonth] = useState<Dayjs | null>(null);
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [blueListDates, setBlueListDates] = useState<string[]>([]);
    const [greyListDates, setGreyListDates] = useState<string[]>([]);
    const [orangeListDates, setOrangeListDates] = useState<string[]>([]);
    const [redListDates, setRedListDates] = useState<string[]>([]);
    const [greenListDates, setGreenListDates] = useState<string[]>([]);
    const [darkGreenListDates, setDarkGreenListDates] = useState<string[]>([]);

    const [height, setHeight] = useState(window.innerHeight - 145);

    function handleUpdateHeight() {
        let updateHeight = window.innerHeight - 145;
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

    useEffect(() => {
        authApi()
            .then((credentials) => {
                if (credentials && credentials?.region_id && credentials.project_id) {
                    setRegion(credentials.region_id);
                }
            })
            .catch((error) => {
                console.error(error);
            });
        setSelectedMonth(dayjs(currentDate));
        setSelectedDate(dayjs(currentDate));
        setExecutionPageFlag(false);
    }, []);

    /**
    * Handles Date selection
    * @param {React.SetStateAction<dayjs.Dayjs | null>} selectedValue selected kernel
    */
    const handleDateSelection = (selectedValue: React.SetStateAction<dayjs.Dayjs | null>) => {
        setJobRunId('');
        setSelectedDate(selectedValue);
    };

    /**
    * Handles Month selection
    * @param {React.SetStateAction<dayjs.Dayjs | null>} newMonth selected kernel
    */
    const handleMonthChange = (newMonth: React.SetStateAction<dayjs.Dayjs | null>) => {
        const resolvedMonth = typeof newMonth === 'function' ? newMonth(today) : newMonth;

        if (!resolvedMonth) {
            setSelectedDate(null);
            setSelectedMonth(null);
            return;
        }

        if (resolvedMonth.month() !== today.month()) {
            setSelectedDate(null);
        } else {
            setSelectedDate(today);
        }
        setJobRunId('')
        setDagRunsList([])
        setSelectedMonth(resolvedMonth);
    };


    /**
     * Checks if the given day is included in the provided date list.
     * @param {string[]} dateList - List of dates in any valid date string/format.
     * @param {string | number | Date | dayjs.Dayjs | null | undefined} day - The date to format and check.
     * @returns {boolean} - Whether the formatted day exists in the date list.
     */
    const getFormattedDate = (dateList: string[], day: string | number | Date | dayjs.Dayjs | null | undefined) => {
        const formattedDay = dayjs(day).format('YYYY-MM-DD');
        const date_list = dateList.map((dateStr: string | number | Date) => new Date(dateStr).toISOString().split('T')[0]).includes(formattedDay);
        return date_list
    }

    /**
     * CustomDay component for rendering a styled day in a date picker.
     * @param {PickersDayProps<Dayjs>} props
     * @returns JSX.Element
     */
    const CustomDay = (props: PickersDayProps<Dayjs>) => {
        const { day, disabled } = props;

        // Format day into a string that matches the date strings in the lists
        const isSelectedExecution = selectedDate ? selectedDate.date() === day.date() && selectedDate.month() === day.month() : false;

        // Check if the date matches the respective statuses
        const isBlueExecution = getFormattedDate(blueListDates, day)
        const isGreyExecution = getFormattedDate(greyListDates, day);
        const isOrangeExecution = getFormattedDate(orangeListDates, day);
        const isRedExecution = getFormattedDate(redListDates, day);
        const isGreenExecution = getFormattedDate(greenListDates, day);
        const isDarkGreenExecution = getFormattedDate(darkGreenListDates, day);
        // Check if the day is today
        const isToday = day.isSame(new Date(), 'day');

        // Background and text color based on conditions
        let backgroundColor = 'transparent'; // Default transparent
        let borderColor = 'none';
        let textColor = 'inherit';
        let opacity = 1;

        // Case 1: If today is selected
        if (isToday && isSelectedExecution) {
            backgroundColor = '#3B78E7';
            borderColor = 'none';
            textColor = 'white';
        }
        // Case 2: If today is not selected but it's today
        else if (isToday) {
            backgroundColor = '#3B78E7';
            textColor = 'white';
        }
        // Case 3: If selected date has a background color (blue, green, etc.)
        else if (isBlueExecution) {
            backgroundColor = '#00BFA5';
            textColor = 'white';
        } else if (isDarkGreenExecution) {
            backgroundColor = '#1E6631';
            textColor = 'white';
        } else if (isGreenExecution) {
            backgroundColor = '#34A853';
            textColor = 'white';
        } else if (isOrangeExecution) {
            backgroundColor = '#FFA52C';
            textColor = 'white';
        } else if (isRedExecution) {
            backgroundColor = '#EA3323';
            textColor = 'white';
        } else if (isGreyExecution) {
            backgroundColor = '#AEAEAE';
            textColor = 'white';
        }

        // Case 4: If the day is selected but without a background color (i.e., transparent background)
        if (isSelectedExecution && backgroundColor === 'transparent') {
            backgroundColor = 'transparent';
            borderColor = '2px solid #3B78E7';
        }

        // Case 5: If the day is selected and has an existing background color (e.g., blue, green, etc.)
        if (isSelectedExecution && backgroundColor !== 'transparent') {
            borderColor = '2px solid #3B78E7';
            textColor = 'white';
        }

        // Reduce opacity for past and future dates
        if (disabled) {
            opacity = 0.5;
        }

        return (
            <PickersDay
                {...props}
                style={{
                    background: backgroundColor,
                    border: borderColor,
                    borderRadius:
                        backgroundColor !== 'transparent' || isSelectedExecution || isToday
                            ? '50%'
                            : 'none',
                    color: textColor,
                    opacity: opacity,
                }}
            />
        );
    };

    return (
        <>
            <>
                <div className="execution-history-header">
                    <div
                        role="button"
                        className="scheduler-back-arrow-icon"
                        onClick={() => handleBackButton()}
                    >
                        <IconLeftArrow.react
                            tag="div"
                            className="icon-white logo-alignment-style"
                        />
                    </div>
                    <div className="create-job-scheduler-title">
                        Execution History: {scheduleName}
                    </div>
                </div>
                <div
                    className="execution-history-main-wrapper"
                    style={{ height: height }}
                >
                    <div className="execution-history-left-wrapper">
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            {isLoading ? (
                                <div className="spin-loader-main-calender">
                                    <Box sx={{ width: '100%' }}>
                                        <LinearProgress />
                                    </Box>
                                </div>
                            ) : (
                                <div
                                    className="spin-loader-main-calender"
                                    style={{ height: '4px' }}
                                ></div>
                            )}
                            <DateCalendar
                                minDate={dayjs(schedulerData?.createTime)}
                                maxDate={dayjs(currentDate)}
                                defaultValue={today}
                                onChange={newValue => handleDateSelection(newValue)}
                                onMonthChange={handleMonthChange}
                                slots={{
                                    day: CustomDay
                                }}
                            />
                        </LocalizationProvider>
                        <VertexJobRuns
                            region={region}
                            schedulerData={schedulerData}
                            dagId={scheduleName}
                            setJobRunsData={setJobRunsData}
                            setJobRunId={setJobRunId}
                            selectedMonth={selectedMonth}
                            selectedDate={selectedDate}
                            setBlueListDates={setBlueListDates}
                            setGreyListDates={setGreyListDates}
                            setOrangeListDates={setOrangeListDates}
                            setRedListDates={setRedListDates}
                            setGreenListDates={setGreenListDates}
                            setDarkGreenListDates={setDarkGreenListDates}
                            setIsLoading={setIsLoading}
                            isLoading={isLoading}
                            dagRunsList={dagRunsList}
                            setDagRunsList={setDagRunsList}
                        />
                    </div>
                    <div className="execution-history-right-wrapper">
                        {jobRunId !== '' && (
                            <VertexJobTaskLogs
                                jobRunId={jobRunId}
                                jobRunsData={jobRunsData}
                            />
                        )}
                    </div>
                </div>
            </>
        </>
    );
};

export default VertexExecutionHistory;
