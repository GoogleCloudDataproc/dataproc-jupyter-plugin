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
import React from 'react';
import {
  FormHelperText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { FormikProps, getIn } from 'formik';
import { formikAttributes } from './formikSchema';

type Props<T> = {
  formik: FormikProps<T>;
  path: string;
  label: string;
};

/**
 * Creates a Formik component for entering a duration value (see TTL or Idle TTL).
 */
export function DurationInputControl<T>(props: Props<T>) {
  const { formik, path, label } = props;

  const value: string = getIn(formik.values, path) ?? '';

  // Durations are of the format \d+[hms] (ie 10h or 3600s). So extract everything
  // before the last character as durationCount and the last char as durationUnit.
  const durationCount = value.substring(0, value.length - 1);
  const durationUnit = value.substring(value.length - 1);
  const { name, onBlur, error, helperText } = formikAttributes(formik, path);
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle1">{label}</Typography>
      <Stack direction="row" spacing={3}>
        <TextField
          fullWidth
          label="Duration Count"
          {...{ name, onBlur, error }}
          value={durationCount}
          onChange={e =>
            formik.setFieldValue(path, e.target.value + durationUnit)
          }
        />
        <Select
          {...{ name, onBlur, error }}
          value={durationUnit}
          onChange={e =>
            formik.setFieldValue(path, durationCount + e.target.value)
          }
        >
          <MenuItem value="h">Hours</MenuItem>
          <MenuItem value="m">Minutes</MenuItem>
          <MenuItem value="s">Seconds</MenuItem>
        </Select>
      </Stack>
      {error && <FormHelperText error>{helperText}</FormHelperText>}
    </Stack>
  );
}
