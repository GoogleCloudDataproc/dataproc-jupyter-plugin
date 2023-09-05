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

import React, { useEffect, useRef, useState } from 'react';
import { Autocomplete, Stack, TextField, Typography } from '@mui/material';
import { DynamicDropdown } from './DynamicDropdown';
import { listNetworksAPI, listSubNetworksAPI } from '../utils/networkService';
import { MuiChipsInput } from 'mui-chips-input';
import { FormikProps, getIn } from 'formik';
import { formikAttributes } from './formikSchema';
import { DurationInputControl } from './DurationInputControl';

type Props<T> = {
  formik: FormikProps<T>;
  path: string;
};

export function EditExecutionConfigControl<T>(props: Props<T>) {
  const { formik, path } = props;

  /**
   * List of subnetworks for the currently selected primary network.  Since
   * this updates whenever the primary network changes it needs to be a state.
   */
  const [subnetworkList, setSubNetworkList] = useState<string[]>([]);
  const currentNetwork = useRef<string | null | undefined>();

  const networkUri = getIn(formik.values, path + '.subnetworkUri');
  useEffect(() => {
    // useEffect to populate the subnetwork list whenever the network URI
    // changes.
    currentNetwork.current = networkUri;
    if (networkUri) {
      listSubNetworksAPI(networkUri).then(list => {
        if (currentNetwork.current != networkUri) {
          return;
        }
        // Throw it into a set to dedupe.
        const newSubnetworkList = [
          ...new Set(list.map(item => item.split('/').at(-1) ?? ''))
        ];
        setSubNetworkList(newSubnetworkList);
        formik.setFieldValue(path + '.subnetworkUri', undefined);
      });
    }
  }, [networkUri]);

  return (
    <Stack spacing={3}>
      <Typography variant="h6">Network Configuration</Typography>
      <Stack direction="row" spacing={3}>
        <DynamicDropdown
          fullWidth
          fetchFunc={async search => {
            return (await listNetworksAPI(search)).map(
              item => item.selfLink.split('/').at(-1) ?? ''
            );
          }}
          label="Primary Network"
          {...formikAttributes(formik, path + '.networkUri')}
        />
        <Autocomplete
          fullWidth
          options={subnetworkList}
          autoSelect
          renderInput={params => <TextField {...params} label="Sub Networks" />}
          {...formikAttributes(formik, path + '.subnetworkUri')}
        />
      </Stack>
      <MuiChipsInput
        fullWidth
        label="Network Tags"
        {...formikAttributes(formik, path + '.networkTags')}
        onChange={newValue =>
          // MuiChipsInput's onChange event doesn't fire an change event, so
          // let's call setFieldValue ourselves instead.
          formik.setFieldValue(path + '.networkTags', newValue)
        }
      />
      <DurationInputControl
        formik={formik}
        path={path + '.idleTtl'}
        label="Idle TTL"
      />
    </Stack>
  );
}
