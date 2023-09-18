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
import { TextField, styled } from '@mui/material';
import React from 'react';
import type { InputProps } from 'semantic-ui-react';

function InputInternal(props: InputProps) {
  const { className, value, onChange, placeholder, disabled, defaultValue ,onBlur} = props;
  return (
    <TextField
      className={className}
      value={value}
      onChange={e =>
        onChange?.(e as React.ChangeEvent<HTMLInputElement>, {
          value: e.target.value
        })
      }
      onBlur={onBlur}
      placeholder={placeholder}
      disabled = {disabled}
      defaultValue={defaultValue}
    ></TextField>
  );
}

export const Input = styled(InputInternal)<InputProps>({
  marginTop: '10px',
  '& .MuiInputBase-input': {
    padding: '9.5px 14px'
  }
});
