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

jest.mock('../utils/projectService', () => ({
  listProjectsWithDetailsAPI: jest.fn()
}));

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ProjectSelectorModal } from './ProjectSelectorModal';
import { listProjectsWithDetailsAPI } from '../utils/projectService';

const mockListProjects = listProjectsWithDetailsAPI as jest.Mock;
const PROJECTS = [
  { projectId: 'alpha-project', name: 'Alpha', projectNumber: '111' },
  { projectId: 'beta-project', name: 'Beta', projectNumber: '222' }
];

describe('ProjectSelectorModal', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mockListProjects.mockReset();
    mockListProjects.mockResolvedValue(PROJECTS);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  const wait = () =>
    act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

  const click = async (element: Element | null) => {
    await act(async () => {
      (element as HTMLElement).click();
    });
  };

  // Sets an input's value the way React expects, so onChange fires.
  const typeInto = async (element: HTMLInputElement, value: string) => {
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    )?.set;
    await act(async () => {
      setValue?.call(element, value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };

  const rows = () =>
    Array.from(document.body.querySelectorAll('.project-selector-item'));
  const rowText = (text: string) =>
    rows().some(row => row.textContent?.includes(text));
  const searchInput = () =>
    document.body.querySelector(
      '.project-selector-search-input'
    ) as HTMLInputElement;
  const selectButton = () =>
    document.body.querySelector(
      '.project-selector-submit-btn'
    ) as HTMLButtonElement;
  const cancelButton = () =>
    document.body.querySelector(
      '.project-selector-cancel-btn'
    ) as HTMLButtonElement;

  const renderModal = async (selectedProjectId = '') => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    await act(async () => {
      root.render(
        <ProjectSelectorModal
          open
          selectedProjectId={selectedProjectId}
          onClose={onClose}
          onSelect={onSelect}
        />
      );
    });
    await wait();
    return { onSelect, onClose };
  };

  it('loads and lists the projects when opened', async () => {
    await renderModal();

    expect(mockListProjects).toHaveBeenCalledTimes(1);
    expect(
      rows().map(
        row => row.querySelector('.project-selector-item-id')?.textContent
      )
    ).toEqual(['alpha-project', 'beta-project']);
    expect(rows()[1].textContent).toContain('#222');
  });

  it('returns the chosen project and closes', async () => {
    const { onSelect, onClose } = await renderModal();
    expect(selectButton().disabled).toBe(true);

    await click(rows()[1]);
    expect(selectButton().disabled).toBe(false);
    await click(selectButton());

    expect(onSelect).toHaveBeenCalledWith('beta-project', PROJECTS[1]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('pre-selects the current project', async () => {
    await renderModal('alpha-project');

    expect(rows()[0].classList.contains('selected')).toBe(true);
    expect(selectButton().disabled).toBe(false);
  });

  it('filters by name, ID or project number', async () => {
    await renderModal();

    await typeInto(searchInput(), 'beta');
    expect(rowText('Alpha')).toBe(false);
    expect(rowText('Beta')).toBe(true);

    await typeInto(searchInput(), '111');
    expect(rowText('Alpha')).toBe(true);
    expect(rowText('Beta')).toBe(false);
  });

  it('offers the typed text as a project ID', async () => {
    const { onSelect } = await renderModal();

    await typeInto(searchInput(), 'my-other-project');
    const customRow = rows()[0];
    expect(customRow.textContent).toContain('Use "my-other-project"');

    await click(customRow);
    await click(selectButton());
    expect(onSelect).toHaveBeenCalledWith('my-other-project', undefined);
  });

  it('shows an empty state when there are no projects', async () => {
    mockListProjects.mockResolvedValue([]);
    await renderModal();

    expect(rows()).toHaveLength(0);
    expect(document.body.textContent).toContain('No projects found.');
  });

  it('closes without selecting on Cancel', async () => {
    const { onSelect, onClose } = await renderModal();

    await click(cancelButton());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
