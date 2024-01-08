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

function GlobalFilter({
  globalFilter,
  setGlobalFilter,
  setPollingDisable,
  gcsBucket,
  fromPage
}: any) {
  const [value, setValue] = React.useState(globalFilter);
  const onChange = (value: string) => {
    setGlobalFilter(value || undefined);
  };
  if (fromPage !== 'notebook-templates') {
    if (value !== undefined) {
      if (value.length !== 0) {
        setPollingDisable(true);
      } else {
        setPollingDisable(false);
      }
    }
  }

  return (
    <span>
      <input
        value={value || ''}
        onChange={e => {
          setValue(e.target.value);
          onChange(e.target.value);
        }}
        placeholder={gcsBucket ? 'Filter files by name' : 'Filter Table'}
        aria-label="filterd value"
        className={
          gcsBucket ? 'gcs-filter-section-part' : 'filter-section-part'
        }
      />
    </span>
  );
}

export default GlobalFilter;
