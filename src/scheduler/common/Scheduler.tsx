import React from 'react';
import {
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography
} from '@mui/material';

const Scheduler: React.FC = () => {
  return (
    <>
      <div className="create-scheduler-label">Schedule</div>
      <div className="create-scheduler-form-element">
        <FormControl>
          <RadioGroup
            aria-labelledby="demo-controlled-radio-buttons-group"
            name="controlled-radio-buttons-group"
            // value={scheduleMode}
            // onChange={handleSchedulerModeChange}
          >
            <FormControlLabel
              value="runNow"
              className="create-scheduler-label-style"
              control={<Radio size="small" />}
              label={
                <Typography sx={{ fontSize: 13 }}>Run now</Typography>
              }
            />
            <FormControlLabel
              value="runSchedule"
              className="create-scheduler-label-style"
              control={<Radio size="small" />}
              label={
                <Typography sx={{ fontSize: 13 }}>
                  Run on a schedule
                </Typography>
              }
            />
          </RadioGroup>
        </FormControl>
      </div>
    </>

  )
}

export default Scheduler;