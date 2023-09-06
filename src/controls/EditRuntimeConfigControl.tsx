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
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Stack,
  Typography
} from '@mui/material';
import { FormikProps } from 'formik';
import { formikAttributes } from './formikSchema';

type Props<T> = {
  formik: FormikProps<T>;
  path: string;
};

export function EditRuntimeConfigControl<T>(props: Props<T>) {
  const { formik, path } = props;
  return (
    <Stack spacing={3}>
      <Typography variant="h6">Runtime Configuration</Typography>
      <FormControl fullWidth>
        <InputLabel id="runtime-version-select-label">
          Runtime Version
        </InputLabel>
        <Select
          labelId="runtime-version-select-label"
          fullWidth
          required
          label="Runtime Version"
          {...formikAttributes(formik, path + '.version')}
        >
          <MenuItem value="2.1">2.1 (Spark 3.4, Java 17, Scala 2.13)</MenuItem>
          <MenuItem value="2.0">2.0 (Spark 3.3, Java 17, Scala 2.13)</MenuItem>
          <MenuItem value="1.1">1.1 (Spark 3.3, Java 11, Scala 2.12)</MenuItem>
        </Select>
      </FormControl>
      <TextField
        fullWidth
        label="Custom Container Image"
        {...formikAttributes(formik, path + '.containerImage')}
      />
    </Stack>
  );
}
