/**
 * @license
 * Copyright 2024 Google LLC
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
};

/**
 * Component to render a region selector dropdown.
 */
export function BigQueryRegionDropdown(props: Props) {
  const { projectId, region, onRegionChange } = props;
  const regions = useRegion(projectId);

  let regionStrList = useMemo(
    () => regions.map(region => region.name),
    [regions]
  );

  let bigQueryRegionOptions: any = [];

  if (regionStrList.length > 0) {
    let exceptRegions = ['us-central2', 'us-east7', 'us-west8'];
    let bqRegionsList: string[] = [];
    bqRegionsList = regionStrList.filter(
      element => !exceptRegions.includes(element)
    );

    let multiRegionList = ['US', 'EU'];
    let omniRegionList = [
      'aws-us-east-1',
      'aws-us-west-2',
      'aws-ap-northeast-2',
      'aws-eu-west-1',
      'azure-eastus2'
    ];

    bqRegionsList = multiRegionList
      .concat(omniRegionList)
      .concat(bqRegionsList);
    regionStrList = bqRegionsList;

    bigQueryRegionOptions = regionStrList.map((option: string) => {
      const categoryType = 'Regions';
      let object = { title: option };
      return {
        categoryType: multiRegionList.includes(option)
          ? 'Multi Regions'
          : omniRegionList.includes(option)
          ? 'Omni Locations'
          : categoryType,
        ...object
      };
    });
  }

  const handleRegionChange = (value: any) => {
    if (value.title) {
      onRegionChange(value.title);
    }
  };

  return (
    <Autocomplete
      value={{ title: region }}
      options={bigQueryRegionOptions}
      groupBy={(option: any) => option.categoryType}
      getOptionLabel={(option: any) => {
        return option.title ? option.title : option;
      }}
      onChange={(_, value) => handleRegionChange(value ?? '')}
      PaperComponent={(props: PaperProps) => <Paper elevation={8} {...props} />}
      renderInput={params => (
        <TextField {...params} label={'BigQuery Region*'} />
      )}
    />
  );
}
