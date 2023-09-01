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
import { SessionTemplateDisplay } from './listRuntimeTemplateInterface';

interface IBatch {
  batchID: string;
  status: string;
  location: string;
  creationTime: string;
  elapsedTime: string;
  type: string;
  actions: JSX.Element;
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
interface IPaginationViewProps {
  pageSize: number;
  setPageSize: (value: number) => void;
  pageIndex: number;
  allData: IBatch[] | ICluster[] | SessionTemplateDisplay[];
  previousPage: () => void;
  nextPage: () => void;
  canPreviousPage: boolean;
  canNextPage: boolean;
}

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
      <select
        className="page-size-selection"
        value={pageSize}
        onChange={e => {
          setPageSize(Number(e.target.value));
        }}
      >
        {[50, 100, 200].map(pageSize => (
          <option key={pageSize} value={pageSize}>
            {pageSize}
          </option>
        ))}
      </select>
      {(pageIndex + 1) * pageSize > allData.length ? (
        <div className="page-display-part">
          {pageIndex * pageSize + 1} -{' '} {allData.length} of {allData.length}
        </div>
      ) : (
        <div className="page-display-part">
          {pageIndex * pageSize + 1} -{' '} {(pageIndex + 1) * pageSize} of{' '}
          {allData.length}
        </div>
      )}
      <div role="button"
        className={
          !canPreviousPage ? 'page-move-button disabled' : 'page-move-button'
        }
        onClick={() => previousPage()}
      >
        {'<'}
      </div>
      <div role="button"
        onClick={() => nextPage()}
        className={
          !canNextPage ? 'page-move-button disabled' : 'page-move-button'
        }
      >
        {'>'}
      </div>
    </div>
  );
};
