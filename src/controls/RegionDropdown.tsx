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

import React, { useMemo } from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import { useRegion } from '../utils/regionService';
import { Paper, PaperProps } from '@mui/material';

type Props = {
  /** The currently selected project ID */
  projectId: string;
  /** The currently selected Region */
  region: string;
  /** Callback function for when the project ID is changed by the dropdown */
  onRegionChange: (projectId: string) => void;
  fromSection?: string;
};

/**
 * Component to render a region selector dropdown.
 */
export function RegionDropdown(props: Props) {
  const { projectId, region, onRegionChange, fromSection } = props;
  const regions = useRegion(projectId);

  let regionStrList = useMemo(
    () => regions.map(region => region.name),
    [regions]
  );

  if (regionStrList.length > 0 && fromSection === 'bigQuery') {
    let exceptRegions = ['us-central2', 'us-east7', 'us-west8'];
    let bqRegionsList: string[] = [];
    bqRegionsList = regionStrList.filter(
      element => !exceptRegions.includes(element)
    );
    bqRegionsList = bqRegionsList.concat(['US', 'EU']);
    regionStrList = bqRegionsList;
  }

  const handleRegionChange = (value: string) => {
    onRegionChange(value);
    if (fromSection === 'bigQuery') {
      localStorage.setItem('bigQueryRegion', value);
    }
  };

  console.log(regionStrList);

  return (
    <Autocomplete
      value={region}
      options={regionStrList}
      onChange={(_, value) => handleRegionChange(value ?? '')}
      PaperComponent={(props: PaperProps) => <Paper elevation={8} {...props} />}
      renderInput={params => (
        <TextField
          {...params}
          label={fromSection === 'bigQuery' ? 'BigQuery Region' : 'Region'}
        />
      )}
    />
  );
}
