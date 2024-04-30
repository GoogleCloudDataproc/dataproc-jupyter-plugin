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
import { ISessionTemplateDisplay } from './listRuntimeTemplateInterface';
import { Select } from '../controls/MuiWrappedSelect';
import { LabIcon } from '@jupyterlab/ui-components';
import PreviousIcon from '../../style/icons/previous_page.svg';
import NextIcon from '../../style/icons/next_page.svg';
interface IBatch {
  batchID: string;
  status: string;
  location: string;
  creationTime: string;
  elapsedTime: string;
  type: string | undefined;
  actions: JSX.Element;
}
interface ITemplate {
  title: string;
  category: string;
  description: string;
}
interface ICluster {
  clusterName: string;
  status: string;
  clusterImage: string;
  region: string;
  zone: string;
  totalWorkersNode: string;
  schedulesDeletion: string;
  actions: React.ReactNode;
}
interface IDagList {
  jobid: string;
  notebookname: string;
  schedule: string;
  scheduleInterval: string;
}

interface IPaginationViewProps {
  pageSize: number;
  setPageSize: (value: number) => void;
  pageIndex: number;
  allData:
    | IBatch[]
    | ITemplate[]
    | ICluster[]
    | ISessionTemplateDisplay[]
    | IDagList[];
  previousPage: () => void;
  nextPage: () => void;
  canPreviousPage: boolean;
  canNextPage: boolean;
}
const iconPrevious = new LabIcon({
  name: 'launcher:previous-icon',
  svgstr: PreviousIcon
});
const iconNext = new LabIcon({
  name: 'launcher:next-icon',
  svgstr: NextIcon
});

export const PaginationView = ({
  pageSize,
  setPageSize,
  pageIndex,
  allData,
  previousPage,
  nextPage,
  canPreviousPage,
  canNextPage
}: IPaginationViewProps) => {
  return (
    <div className="pagination-parent-view">
      <div>Rows per page: </div>
      <Select
        className="page-size-selection"
        value={pageSize.toString()} // Convert pageSize to string for compatibility
        onChange={(e, { value }) => {
          const selectedPageSize = parseInt(value as string, 10); // Parse the value to a number
          setPageSize(selectedPageSize); // Use the parsed number as the new pageSize
        }}
        options={[
          { key: '50', value: '50', text: '50' },
          { key: '100', value: '100', text: '100' },
          { key: '200', value: '200', text: '200' }
        ]}
      />
      {(pageIndex + 1) * pageSize > allData.length ? (
        <div className="page-display-part">
          {pageIndex * pageSize + 1} - {allData.length} of {allData.length}
        </div>
      ) : (
        <div className="page-display-part">
          {pageIndex * pageSize + 1} - {(pageIndex + 1) * pageSize} of{' '}
          {allData.length}
        </div>
      )}
      <div
        role="button"
        className={
          !canPreviousPage ? 'page-move-button disabled' : 'page-move-button'
        }
        onClick={() => previousPage()}
      >
        <iconPrevious.react tag="div" className="icon-white logo-alignment-style" />
      </div>
      <div
        role="button"
        onClick={() => nextPage()}
        className={
          !canNextPage ? 'page-move-button disabled' : 'page-move-button'
        }
      >
        <iconNext.react tag="div" className="icon-white logo-alignment-style" />
      </div>
    </div>
  );
};
