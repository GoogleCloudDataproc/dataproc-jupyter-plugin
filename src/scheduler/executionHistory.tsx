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

const iconLeftArrow = new LabIcon({
  name: 'launcher:left-arrow-icon',
  svgstr: LeftArrowIcon
});

const ExecutionHistory = ({
  composerName,
  dagId,
  handleBackButton
}: {
  composerName: string;
  dagId: string;
  handleBackButton: () => void;
}): JSX.Element => {
  const [dagRunId, setDagRunId] = useState('');
  const currentDate = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [blueListDates, setBlueListDates] = useState<string[]>([]);
  const [greyListDates, setGreyListDates] = useState<string[]>([]);
  const [orangeListDates, setOrangeListDates] = useState<string[]>([]);
  const [redListDates, setRedListDates] = useState<string[]>([]);
  const [greenListDates, setGreenListDates] = useState<string[]>([]);
  const [darkGreenListDates, setDarkGreenListDates] = useState<string[]>([]);

  const handleMonthChange = () => {
    setDagRunId('');
    // setStartDate('');
    // setEndDate('');
    setSelectedDate(null);
  };

  const handleDateSelection = (selectedValue: any) => {
    setDagRunId('');
    // setStartDate('');
    // setEndDate('');
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

    const isBlueExecution =
      blueListDates.length > 0 &&
      blueListDates.includes(totalViewDates.toString().padStart(2, '0'));
    const isGreyExecution =
      greyListDates.length > 0 &&
      greyListDates.includes(totalViewDates.toString().padStart(2, '0'));
    const isOrangeExecution =
      orangeListDates.length > 0 &&
      orangeListDates.includes(totalViewDates.toString().padStart(2, '0'));
    const isRedExecution =
      redListDates.length > 0 &&
      redListDates.includes(totalViewDates.toString().padStart(2, '0'));
    const isGreenExecution =
      greenListDates.length > 0 &&
      greenListDates.includes(totalViewDates.toString().padStart(2, '0'));
    const isDarkGreenExecution =
      darkGreenListDates.length > 0 &&
      darkGreenListDates.includes(totalViewDates.toString().padStart(2, '0'));

    const isSelectedExecution = [selectedDate?.date()].includes(totalViewDates);

    return (
      <PickersDay
        {...props}
        style={{
          border: isSelectedExecution
            ? '3px solid var(--jp-ui-font-color0)'
            : 'none',
          borderRadius:
            isGreenExecution ||
            isRedExecution ||
            isSelectedExecution ||
            isOrangeExecution ||
            isGreyExecution ||
            isBlueExecution ||
            isDarkGreenExecution
              ? '50%'
              : 'none',
          backgroundColor: isDarkGreenExecution
            ? '#188038'
            : isGreenExecution
            ? '#34A853'
            : isOrangeExecution
            ? '#FFA500'
            : isRedExecution
            ? '#EA3323'
            : isBlueExecution
            ? '#1A73E8'
            : isGreyExecution
            ? '#808080'
            : 'transparent',
          color:
            isGreenExecution ||
            isRedExecution ||
            // isSelectedExecution ||
            isOrangeExecution ||
            isGreyExecution ||
            isBlueExecution ||
            isDarkGreenExecution
              ? 'white'
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
      <div>
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
            {dagId} - Execution History
          </div>
        </div>
        <div className="execution-history-main-wrapper">
          <div className="execution-history-left-wrapper">
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateCalendar
                // value={selectedDate}
                maxDate={dayjs(currentDate)}
                referenceDate={dayjs(currentDate)}
                onChange={newValue => handleDateSelection(newValue)}
                slots={{
                  day: CustomDay
                }}
                onMonthChange={() => handleMonthChange()}
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
      </div>
    </>
  );
};

export default ExecutionHistory;
