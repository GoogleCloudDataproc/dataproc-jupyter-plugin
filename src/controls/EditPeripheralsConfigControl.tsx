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

import React, { useState } from 'react';
import { Stack, Typography } from '@mui/material';
import { DynamicDropdown } from './DynamicDropdown';
import { metastoreServiceListAPI } from '../utils/metastoreService';
import { projectListAPI } from '../utils/projectService';
import { FormikProps, getIn } from 'formik';
import { formikAttributes } from './formikSchema';

type Props<T> = {
  formik: FormikProps<T>;
  path: string;
};

const METASTORE_REGEX =
  /^projects\/([a-z0-9\-]+)\/locations\/([a-z0-9\-]+)\/services\/([a-z0-9\-]+)$/;
export function EditPeripheralsConfigControl<T>(props: Props<T>) {
  const { formik, path } = props;
  const [projectId, setProjectId] = useState(() => {
    const capturedResults = METASTORE_REGEX.exec(
      getIn(formik.values, path + '.metastoreService') ?? ''
    );
    return capturedResults ? capturedResults[1] : '';
  });

  return (
    <Stack spacing={3}>
      <Typography variant="subtitle1">Metastore Configuration</Typography>
      <DynamicDropdown
        value={projectId}
        onChange={(_, projectId) => {
          setProjectId(projectId ?? '');
          formik.setFieldValue(path + '.metastoreService', undefined);
        }}
        fetchFunc={projectListAPI}
        label="Project ID"
      />
      <DynamicDropdown
        fullWidth
        fetchFunc={async search =>
          await metastoreServiceListAPI(projectId, search)
        }
        getOptionLabel={option => option.split('/').at(-1) ?? ''}
        label="Metastore Service"
        {...formikAttributes(formik, path + '.metastoreService')}
      />
    </Stack>
  );
}
