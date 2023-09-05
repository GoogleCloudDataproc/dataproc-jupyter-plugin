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
import { array, object, string } from 'yup';
import { FormikProps, getIn } from 'formik';

export const executionConfigSchema = object().shape({
  serviceAccount: string().optional(),
  networkUri: string().url().optional(),
  subnetworkUri: string().url().optional(),
  networkTags: array()
    .of(
      string()
        .required()
        .matches(
          /^[a-z0-9\-]{3,63}$/,
          'Tags can only contain lowercase letters, numbers, and dashes.'
        )
    )
    .optional(),
  kmsKey: string().optional(),
  ttl: string().optional(),
  idleTtl: string()
    .matches(/^\d+[hms]$/)
    .optional(),
  stagingBucket: string().optional()
});

export const sessionTemplateSchema = object().shape({
  /**
   * In gcloud JSON representation this is the fully qualified name with
   * region and project ID like:
   * projects/{project}/locations/{region}/sessionTemplates/{short-id}
   * This is just the short id.
   */
  name: string()
    .matches(
      /^[a-z0-9\-]{3,63}$/,
      'Runtime ID must contain only lowercase letters, numbers, and hyphens and be between 3 and 63 characters long.'
    )
    .transform(original => original.split('/').at(-1))
    .required('Runtime ID must be specified.'),
  description: string().optional(),
  creator: string().email().optional(),
  createTime: string().optional(),
  /**
   * Note that this is different from gcloud JSON representation which
   * is {[key: string]: string}, but making it {key: string, value: string}[]
   * makes Yup and Formik happier so we'll clean this up on submit.
   */
  labels: array()
    .of(
      object().shape({
        key: string()
          .matches(/^[a-z0-9\-]{3,63}$/)
          .required(),
        value: string()
          .matches(/^[a-z0-9\-]{3,63}$/)
          .required()
      })
      // TODO: add lazy validation to prevent dupes.
    )
    .optional(),
  updateTime: string().optional(),
  jupyterSession: object()
    .shape({
      kernel: string().optional().default('PYTHON'),
      displayName: string().required()
    })
    .required(),
  environmentConfig: object()
    .shape({
      executionConfig: executionConfigSchema.optional(),
      peripheralsConfig: object().shape({}).optional() // TODO: Define this.
    })
    .required(),
  runtimeConfig: object().optional() // TODO: Define this.
});

/**
 * Helper method for generating a number of boilerplate-ish formik attributes.
 * @param formik The formik object for the current form.
 * @param fieldName The fully qualified formik path to the field.
 * @returns A object of attributes to be attached to the form input.
 */
export function formikAttributes<T>(formik: FormikProps<T>, fieldName: string) {
  return {
    id: fieldName,
    name: fieldName,
    value: getIn(formik.values, fieldName),
    onChange: formik.handleChange,
    onBlur: formik.handleBlur,
    error:
      getIn(formik.touched, fieldName) &&
      Boolean(getIn(formik.errors, fieldName)),
    helperText: (getIn(formik.touched, fieldName) &&
      getIn(formik.errors, fieldName)) as unknown as string
  };
}
