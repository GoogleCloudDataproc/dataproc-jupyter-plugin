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

import React, { useEffect, useState } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { PickersDayProps, PickersDay } from '@mui/x-date-pickers/PickersDay';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import dayjs, { Dayjs } from 'dayjs';
import ListDagRuns from './listDagRuns';
import { LabIcon } from '@jupyterlab/ui-components';
import LeftArrowIcon from '../../style/icons/left_arrow_icon.svg';
import ListDagTaskInstances from './listDagTaskInstances';
import { Box, LinearProgress } from '@mui/material';
import { handleDebounce } from '../utils/utils';

const iconLeftArrow = new LabIcon({
  name: 'launcher:left-arrow-icon',
  svgstr: LeftArrowIcon
});

const ExecutionHistory = ({
  composerName,
  dagId,
  handleBackButton,
  bucketName
}: {
  composerName: string;
  dagId: string;
  handleBackButton: () => void;
  bucketName: string;
}): JSX.Element => {
  const [dagRunId, setDagRunId] = useState('');
  const currentDate = new Date().toLocaleDateString();
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
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

  const handleDateSelection = (selectedValue: any) => {
    setDagRunId('');
    setSelectedDate(selectedValue);
  };

  const CustomDay = (props: PickersDayProps<Dayjs>) => {
    const { day, isFirstVisibleCell, isLastVisibleCell } = props;
    if (isFirstVisibleCell) {
      setStartDate(new Date(day.toDate()).toISOString());
    }
    if (isLastVisibleCell) {
      const nextDate = new Date(day.toDate());
      nextDate.setDate(day.toDate().getDate() + 1);
      setEndDate(nextDate.toISOString());
    }

    const totalViewDates = day.date();
    const formattedTotalViewDate = totalViewDates.toString().padStart(2, '0');

    //Color codes to highlight dates in calendar
    //Blue color code for running status
    const isBlueExecution =
      blueListDates.length > 0 &&
      blueListDates.includes(formattedTotalViewDate);
    //Grey color code for queued status
    const isGreyExecution =
      greyListDates.length > 0 &&
      greyListDates.includes(formattedTotalViewDate);
    //Orange color code for combination of failed and success status
    const isOrangeExecution =
      orangeListDates.length > 0 &&
      orangeListDates.includes(formattedTotalViewDate);
    //Red color code for only with failed status
    const isRedExecution =
      redListDates.length > 0 && redListDates.includes(formattedTotalViewDate);
    //Green color code for only one with success status
    const isGreenExecution =
      greenListDates.length > 0 &&
      greenListDates.includes(formattedTotalViewDate);
    //Green color code for multiple success status
    const isDarkGreenExecution =
      darkGreenListDates.length > 0 &&
      darkGreenListDates.includes(formattedTotalViewDate);

    const isSelectedExecution =
      [selectedDate?.date()].includes(totalViewDates) &&
      selectedDate?.month() === day?.month();
    const currentDataExecution =
      [dayjs(currentDate)?.date()].includes(totalViewDates) &&
      [dayjs(currentDate)?.month()].includes(day.month());

    return (
      <PickersDay
        {...props}
        style={{
          border: 'none',
          borderRadius:
            isSelectedExecution ||
            isDarkGreenExecution ||
            isGreenExecution ||
            isRedExecution ||
            isOrangeExecution ||
            isGreyExecution ||
            isBlueExecution
              ? '50%'
              : 'none',
          backgroundColor: isSelectedExecution
            ? '#3B78E7'
            : isDarkGreenExecution
            ? '#1E6631'
            : isGreenExecution
            ? '#34A853'
            : isOrangeExecution
            ? '#FFA52C'
            : isRedExecution
            ? '#EA3323'
            : isBlueExecution
            ? '#00BFA5'
            : isGreyExecution
            ? '#AEAEAE'
            : 'transparent',
          color:
            isSelectedExecution ||
            isDarkGreenExecution ||
            isGreenExecution ||
            isRedExecution ||
            isOrangeExecution ||
            isGreyExecution ||
            isBlueExecution
              ? 'white'
              : currentDataExecution
              ? '#3367D6'
              : 'inherit'
        }}
      />
    );
  };

  useEffect(() => {
    setSelectedDate(dayjs(currentDate));
  }, []);

  return (
    <>
      <>
        <div className="execution-history-header">
          <div
            role="button"
            className="scheduler-back-arrow-icon"
            onClick={() => handleBackButton()}
          >
            <iconLeftArrow.react
              tag="div"
              className="icon-white logo-alignment-style"
            />
          </div>
          <div className="create-job-scheduler-title">
            Execution History: {dagId}
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
                minDate={dayjs().year(2024).startOf('year')}
                maxDate={dayjs(currentDate)}
                referenceDate={dayjs(currentDate)}
                onChange={newValue => handleDateSelection(newValue)}
                slots={{
                  day: CustomDay
                }}
              />
            </LocalizationProvider>
            {startDate !== '' && endDate !== '' && (
              <ListDagRuns
                composerName={composerName}
                dagId={dagId}
                startDate={startDate}
                endDate={endDate}
                setDagRunId={setDagRunId}
                selectedDate={selectedDate}
                setBlueListDates={setBlueListDates}
                setGreyListDates={setGreyListDates}
                setOrangeListDates={setOrangeListDates}
                setRedListDates={setRedListDates}
                setGreenListDates={setGreenListDates}
                setDarkGreenListDates={setDarkGreenListDates}
                bucketName={bucketName}
                setIsLoading={setIsLoading}
                isLoading={isLoading}
              />
            )}
          </div>
          <div className="execution-history-right-wrapper">
            {dagRunId !== '' && (
              <ListDagTaskInstances
                composerName={composerName}
                dagId={dagId}
                dagRunId={dagRunId}
              />
            )}
          </div>
        </div>
      </>
    </>
  );
};

export default ExecutionHistory;
