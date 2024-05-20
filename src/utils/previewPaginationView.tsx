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

import React from 'react';
import { Select } from '../controls/MuiWrappedSelect';
import { LabIcon } from '@jupyterlab/ui-components';
import PreviousIcon from '../../style/icons/previous_page.svg';
import NextIcon from '../../style/icons/next_page.svg';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import LastPageIcon from '@mui/icons-material/LastPage';

interface IPreviewPaginationViewProps {
  pageSize: number;
  setPageSize: (value: number) => void;
  pageIndex: number;
  totalRowSize?: string;
  canPreviousPage: boolean;
  canNextPage: boolean;
  onPageChange: (newPageIndex: number) => void;
}
const iconPrevious = new LabIcon({
  name: 'launcher:previous-icon',
  svgstr: PreviousIcon
});
const iconNext = new LabIcon({
  name: 'launcher:next-icon',
  svgstr: NextIcon
});

export const PreviewPaginationView = ({
  pageSize,
  setPageSize,
  pageIndex,
  totalRowSize,
  canPreviousPage,
  canNextPage,
  onPageChange
}: IPreviewPaginationViewProps) => {
  return (
    <div className="pagination-parent-view">
      <div>Rows per page: </div>
      <Select
        className="page-size-selection"
        value={pageSize.toString()} // Convert pageSize to string for compatibility
        onChange={(e, { value }) => {
          const selectedPageSize = parseInt(value as string, 10); // Parse the value to a number
          setPageSize(selectedPageSize); // Use the parsed number as the new pageSize
          onPageChange(0);
        }}
        options={[
          { key: '50', value: '50', text: '50' },
          { key: '100', value: '100', text: '100' },
          { key: '200', value: '200', text: '200' }
        ]}
      />

      {(pageIndex + 1) * pageSize > Number(totalRowSize) ? (
        <div className="page-display-part">
          {pageIndex * pageSize + 1} - {totalRowSize} of {totalRowSize}
        </div>
      ) : (
        <div className="page-display-part">
          {pageIndex * pageSize + 1} - {(pageIndex + 1) * pageSize} of{' '}
          {totalRowSize}
        </div>
      )}

      <div
        role="button"
        className={
          !canPreviousPage
            ? 'page-move-button-preview disabled'
            : 'page-move-button-preview'
        }
        onClick={() => {
          const newPageIndex = 0;
          onPageChange(newPageIndex);
        }}
      >
        <FirstPageIcon className="logo-alignment-style" />
      </div>

      <div
        role="button"
        className={
          !canPreviousPage ? 'page-move-button disabled' : 'page-move-button'
        }
        onClick={() => {
          const newPageIndex = pageIndex - 1;
          onPageChange(newPageIndex);
        }}
      >
        <iconPrevious.react
          tag="div"
          className="icon-white logo-alignment-style"
        />
      </div>

      <div
        role="button"
        onClick={() => {
          const newPageIndex = pageIndex + 1;
          onPageChange(newPageIndex);
        }}
        className={
          !canNextPage ? 'page-move-button disabled' : 'page-move-button'
        }
      >
        <iconNext.react tag="div" className="icon-white logo-alignment-style" />
      </div>

      <div
        role="button"
        onClick={() => {
          const newPageIndex = Math.floor(
            (Number(totalRowSize) - 1) / pageSize
          );
          onPageChange(newPageIndex);
        }}
        className={
          !canNextPage
            ? 'page-move-button-preview disabled'
            : 'page-move-button-preview'
        }
      >
        <LastPageIcon className="logo-alignment-style" />
      </div>
    </div>
  );
};
