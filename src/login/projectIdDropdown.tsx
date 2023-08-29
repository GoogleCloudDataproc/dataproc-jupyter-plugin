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
import { useProjectList } from '../utils/projectService';
import { Select } from 'semantic-ui-react';
import { DropdownItemProps } from 'semantic-ui-react/dist/commonjs/modules/Dropdown/DropdownItem';

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
  const { projectId, onProjectIdChange } = props;
  const [projectPrefix, setProjectPrefix] = useState('');
  const prefixedProjectList = useProjectList(projectPrefix);

  /**
   * This is the last selected project when the dropdown is opened.  We
   * always ensure that the current ID exists in the dropdown list,
   * preppending it if necessary.
   */
  const [hoistedProjectId, setHoistedProjectId] = useState(projectId);

  const finalProjectList = useMemo<DropdownItemProps[]>(() => {
    const prefixedDropdownItems = prefixedProjectList.map(project => ({
      value: project.projectId,
      key: project.projectId,
      text: project.projectId
    }));
    if (
      projectId.length > 0 &&
      !prefixedProjectList.find(
        project => project.projectId === hoistedProjectId
      )
    ) {
      // If the hoisted project ID is not in the results from the API
      // call, prepend it.
      return [
        {
          value: hoistedProjectId,
          key: hoistedProjectId,
          text: hoistedProjectId
        },
        ...prefixedDropdownItems
      ];
    }
    return prefixedDropdownItems;
  }, [prefixedProjectList, hoistedProjectId]);

  return (
    <Select
      search
      placeholder={projectId}
      className="project-region-select"
      value={projectId}
      onClose={() => setProjectPrefix('')}
      // Update the hoisted project ID everytime the dropdown is open.
      onOpen={() => setHoistedProjectId(projectId)}
      onChange={(_, data) => onProjectIdChange(data.value as string)}
      onSearchChange={(_, data) => setProjectPrefix(data.searchQuery)}
      options={finalProjectList}
    />
  );
}
