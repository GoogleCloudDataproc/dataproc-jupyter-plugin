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
import { IconButton, Stack, TextField } from '@mui/material';
import { FormikProps, getIn } from 'formik';
import { formikAttributes } from './formikSchema';
import DeleteIcon from '@mui/icons-material/Delete';

type Props<T> = {
  formik: FormikProps<T>;
  path: string;
};

export function KeyValueInputControl<T>(props: Props<T>) {
  const { formik, path } = props;
  const val =
    (getIn(formik.values, path) as { key: string; value: string }[]) ?? [];
  return (
    <Stack spacing={3}>
      {val.map((_, index) => {
        return (
          <Stack direction="row" spacing={3}>
            <TextField
              fullWidth
              label="Key"
              {...formikAttributes(formik, `${path}[${index}].key`)}
            />
            <TextField
              fullWidth
              label="Value"
              {...formikAttributes(formik, `${path}[${index}].value`)}
            />
            <IconButton
              aria-label="delete"
              onClick={() => {
                val.splice(index, 1);
                formik.setFieldValue(path, val);
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Stack>
        );
      })}
    </Stack>
  );
}
