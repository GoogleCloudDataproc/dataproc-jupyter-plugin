/**
 * @license
 * Copyright 2026 Google LLC
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

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../handler/handler', () => ({
  requestAPI: jest.fn().mockResolvedValue({
    dataproc_url: 'https://dataproc.googleapis.com/',
    compute_url: 'https://compute.googleapis.com/compute',
    metastore_url: 'https://metastore.googleapis.com/',
    cloudkms_url: 'https://cloudkms.googleapis.com/',
    cloudresourcemanager_url: 'https://cloudresourcemanager.googleapis.com/',
    datacatalog_url: 'https://datacatalog.googleapis.com/',
    storage_url: 'https://storage.googleapis.com/'
  })
}));

jest.mock('../utils/regionService', () => ({
  useRegion: jest.fn()
}));

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { BigQueryRegionDropdown } from './BigQueryRegionDropdown';
import { useRegion } from '../utils/regionService';

describe('BigQueryRegionDropdown Component', () => {
  let container: HTMLDivElement;
  let root: Root;
  let onRegionChange: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    onRegionChange = jest.fn();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    jest.restoreAllMocks();
  });

  const openDropdown = async () => {
    const input = container.querySelector('input') as HTMLInputElement;
    await act(async () => {
      input.focus();
      input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
  };

  it('renders current region and empty options when useRegion returns empty list', async () => {
    (useRegion as jest.Mock).mockReturnValue([]);

    await act(async () => {
      root.render(
        <BigQueryRegionDropdown
          projectId="test-project"
          region="US"
          onRegionChange={onRegionChange}
        />
      );
    });

    expect(useRegion).toHaveBeenCalledWith('test-project');
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('US');
    expect(container.textContent).toContain('BigQuery Region*');

    await openDropdown();
    expect(document.body.querySelectorAll('[role="option"]')).toHaveLength(0);
  });

  it('excludes unsupported regions and prepends Multi Regions and Omni Locations', async () => {
    (useRegion as jest.Mock).mockReturnValue([
      { name: 'us-central1' },
      { name: 'us-central2' },
      { name: 'us-east7' },
      { name: 'us-west8' },
      { name: 'europe-west1' }
    ]);

    await act(async () => {
      root.render(
        <BigQueryRegionDropdown
          projectId="test-project"
          region="us-central1"
          onRegionChange={onRegionChange}
        />
      );
    });

    await openDropdown();

    const options = Array.from(
      document.body.querySelectorAll('[role="option"]')
    ).map(el => el.textContent?.trim());
    expect(options).toEqual([
      'US',
      'EU',
      'aws-us-east-1',
      'aws-us-west-2',
      'aws-ap-northeast-2',
      'aws-eu-west-1',
      'azure-eastus2',
      'us-central1',
      'europe-west1'
    ]);

    const groupHeaders = Array.from(
      document.body.querySelectorAll('.MuiAutocomplete-groupLabel')
    ).map(el => el.textContent?.trim());
    expect(groupHeaders).toEqual([
      'Multi Regions',
      'Omni Locations',
      'Regions'
    ]);
  });

  it('calls onRegionChange when selecting an option and ignores clearing when title is absent', async () => {
    (useRegion as jest.Mock).mockReturnValue([{ name: 'us-central1' }]);

    await act(async () => {
      root.render(
        <BigQueryRegionDropdown
          projectId="test-project"
          region="us-central1"
          onRegionChange={onRegionChange}
        />
      );
    });

    await openDropdown();
    const euOption = Array.from(
      document.body.querySelectorAll('[role="option"]')
    ).find(el => el.textContent?.trim() === 'EU') as HTMLElement;
    await act(async () => {
      euOption.click();
    });
    expect(onRegionChange).toHaveBeenCalledWith('EU');

    onRegionChange.mockClear();
    const clearButton = container.querySelector(
      'button[aria-label="Clear"]'
    ) as HTMLButtonElement;
    if (clearButton) {
      await act(async () => {
        clearButton.click();
      });
    }
    expect(onRegionChange).not.toHaveBeenCalled();
  });
});
