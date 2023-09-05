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
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { EditRuntimeConfigControl } from './EditRuntimeConfigControl';
import { EditExecutionConfigControl } from './EditExecutionConfigControl';
import { EditPeripheralsConfigControl } from './EditPeripheralsConfigControl';
import { useFormik } from 'formik';
import { sessionTemplateSchema, formikAttributes } from './formikSchema';
import { InferType } from 'yup';
import { KeyValueInputControl } from './KeyValueInputControl';

type SessionTemplateForm = InferType<typeof sessionTemplateSchema>;

export function EditSessionTemplateControl({
  template
}: {
  template: SessionTemplateForm | undefined;
}) {
  const formik = useFormik<SessionTemplateForm>({
    initialValues: sessionTemplateSchema.cast(structuredClone(template)) ?? {
      name: `runtime-${Date.now().toString(36)}`
    },
    validationSchema: sessionTemplateSchema,
    onSubmit: values => {
      console.log(JSON.stringify(values, null, 2));
    }
  });
  return (
    <Box component={'form'} sx={{ m: 3 }} onSubmit={formik.handleSubmit}>
      <Stack spacing={3} maxWidth="sm">
        <Typography variant="h5">Add a Runtime Template</Typography>
        <TextField
          required
          label="Interactive Session Name"
          fullWidth
          {...formikAttributes(formik, 'jupyterSession.displayName')}
        />
        <TextField
          label="Runtime ID"
          fullWidth
          {...formikAttributes(formik, 'name')}
        />
        <TextField
          label="Description"
          fullWidth
          {...formikAttributes(formik, 'description')}
        />
        <EditRuntimeConfigControl formik={formik} path={'runtimeConfig'} />
        <EditExecutionConfigControl
          formik={formik}
          path={'environmentConfig.executionConfig'}
        />
        <EditPeripheralsConfigControl
          formik={formik}
          path={'environmentConfig.peripheralsConfig'}
        />
        <Typography variant="h6">Labels</Typography>
        <KeyValueInputControl formik={formik} path={'labels'} />
        <Button color="primary" variant="contained" fullWidth type="submit">
          Submit
        </Button>
      </Stack>
    </Box>
  );
}
