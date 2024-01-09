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
  const [value, setValue] = useState<Dayjs | null>(dayjs('2024-01-08'));

  const CustomDay = (props: PickersDayProps<Dayjs>) => {
    const { day } = props;
    const totalViewDates = day.date();

    const isSuccessfulExecution = [1, 2, 15].includes(totalViewDates);
    const isFailureExecution = [11, 12].includes(totalViewDates);
    const isSelectedExecution = [value?.date()].includes(totalViewDates);

    return (
      <PickersDay
        {...props}
        style={{
          borderRadius:
            isSuccessfulExecution || isFailureExecution || isSelectedExecution
              ? '50%'
              : 'none',
          backgroundColor: isSelectedExecution
            ? '#188038'
            : isSuccessfulExecution
            ? '#34A853'
            : isFailureExecution
            ? '#EA3323'
            : 'transparent',
          color:
            isSuccessfulExecution || isFailureExecution || isSelectedExecution
              ? 'white'
              : 'inherit'
        }}
      />
    );
  };

  useEffect(() => {}, []);

  return (
    <div className="execution-history-parent">
      <div className="create-job-scheduler-title">
        <div
          role="button"
          className="back-arrow-icon"
          onClick={() => handleBackButton()}
        >
          <iconLeftArrow.react
            tag="div"
            className="icon-white logo-alignment-style"
          />
        </div>
        Execution History
      </div>
      <div className="execution-history-main-wrapper">
        <div className="execution-history-left-wrapper">
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateCalendar
              value={value}
              onChange={newValue => setValue(newValue)}
              slots={{
                day: CustomDay
              }}
            />
          </LocalizationProvider>
          <ListDagRuns composerName={composerName} dagId={dagId} />
        </div>
        <div className="execution-history-right-wrapper"></div>
      </div>
    </div>
  );
};

export default ExecutionHistory;
