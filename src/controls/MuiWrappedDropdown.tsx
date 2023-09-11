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
import {
  Autocomplete,
  AutocompleteProps,
  TextField,
  styled
} from '@mui/material';
import React from 'react';

type Props = Omit<
  AutocompleteProps<string, undefined, undefined, undefined>,
  'renderInput'
>;

function DropdownInternal(props: Props) {
  const { className, value, onChange, options } = props;
  return (
    <Autocomplete
      className={className}
      value={value}
      onChange={onChange}
      options={options}
      renderInput={params => <TextField {...params} placeholder="Search..." />}
    />
  );
}

export const Dropdown = styled(DropdownInternal)<Props>({
  '& .MuiInputBase-root': {
    padding: 0
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderStyle: 'none'
  }
});
