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

import React, { useMemo, useState } from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import { useProjectList } from '../utils/projectService';

type Props = {
  /** The currently selected project ID */
  projectId: string;
  /** Callback function for when the project ID is changed by the dropdown */
  onProjectIdChange: (projectId: string) => void;
};

/**
 * Component to render a Cloud Project selector dropdown.
 */
export function ProjectIDDropdown(props: Props) {
  console.log({ props });
  const { projectId, onProjectIdChange } = props;
  const [projectPrefix, setProjectPrefix] = useState('');
  const prefixedProjectList = useProjectList(projectPrefix);

  /**
   * This is the last selected project when the dropdown is opened.  We
   * always ensure that the current ID exists in the dropdown list,
   * preppending it if necessary.
   */
  const [hoistedProjectId, setHoistedProjectId] = useState(projectId);
  const finalProjectList = useMemo(() => {
    const prefixedDropdownItems = prefixedProjectList.map(
      project => project.projectId
    );
    if (
      projectId.length > 0 &&
      !prefixedProjectList.find(
        project => project.projectId === hoistedProjectId
      )
    ) {
      // If the hoisted project ID is not in the results from the API
      // call, prepend it.
      return [hoistedProjectId, ...prefixedDropdownItems];
    }
    return prefixedDropdownItems;
  }, [prefixedProjectList, hoistedProjectId]);
  return (
    <Autocomplete
      value={projectId}
      inputValue={projectPrefix}
      options={finalProjectList}
      onOpen={() => setHoistedProjectId(projectId)}
      getOptionLabel={projectId => projectId}
      onInputChange={(_, value) => setProjectPrefix(value)}
      onChange={(_, value) => onProjectIdChange(value ?? '')}
      filterOptions={options => options}
      renderInput={params => <TextField {...params} label="Project ID" />}
    />
  );
}
