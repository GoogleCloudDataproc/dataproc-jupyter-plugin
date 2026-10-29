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
import {
  PROJECT_SEARCH_DEBOUNCE_MS,
  ProjectSelectorModal
} from './ProjectSelectorModal';
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

  const wait = (ms = 0) =>
    act(async () => {
      await new Promise(resolve => setTimeout(resolve, ms));
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
  const rowId = (row: Element) =>
    row.querySelector('.project-selector-item-id')?.textContent;
  const rowIds = () => rows().map(rowId);
  const checkedRowIds = () =>
    rows()
      .filter(row => row.getAttribute('aria-checked') === 'true')
      .map(rowId);
  const pressKey = async (element: Element, key: string) => {
    await act(async () => {
      element.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true })
      );
    });
  };

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

  it('searches the API as the user types and adds the matches', async () => {
    const gamma = { projectId: 'gamma-project', name: 'Gamma' };
    mockListProjects
      .mockResolvedValueOnce(PROJECTS)
      .mockResolvedValueOnce([gamma]);
    await renderModal();
    expect(mockListProjects).toHaveBeenCalledWith('');

    // Gamma isn't in the first page; only the API search finds it.
    await typeInto(searchInput(), 'gam');
    await wait(PROJECT_SEARCH_DEBOUNCE_MS + 100);

    expect(mockListProjects).toHaveBeenLastCalledWith('gam');
    expect(rowIds()).toContain('gamma-project');
  });

  it('shows a spinner while searching and keeps the list', async () => {
    let resolveSearch: (projects: typeof PROJECTS) => void = () => undefined;
    mockListProjects.mockResolvedValueOnce(PROJECTS).mockReturnValueOnce(
      new Promise(resolve => {
        resolveSearch = resolve;
      })
    );
    const spinner = () =>
      document.body.querySelector('[aria-label="Searching projects"]');
    await renderModal();

    await typeInto(searchInput(), 'alpha');
    // Shown from the first keystroke, before the debounced request is sent.
    expect(spinner()).not.toBeNull();
    expect(mockListProjects).toHaveBeenCalledTimes(1);

    await wait(PROJECT_SEARCH_DEBOUNCE_MS + 100);
    expect(mockListProjects).toHaveBeenLastCalledWith('alpha');
    expect(spinner()).not.toBeNull();
    expect(rowText('Alpha')).toBe(true);

    await act(async () => {
      resolveSearch([]);
    });
    expect(spinner()).toBeNull();
  });

  it('ignores a project list from an older request', async () => {
    let resolveFirst: (projects: typeof PROJECTS) => void = () => undefined;
    mockListProjects
      .mockReturnValueOnce(
        new Promise(resolve => {
          resolveFirst = resolve;
        })
      )
      .mockResolvedValueOnce([PROJECTS[1]]);

    await renderModal();
    // Searching starts a second request while the first is still pending.
    await typeInto(searchInput(), 'beta');
    await wait(PROJECT_SEARCH_DEBOUNCE_MS + 100);
    expect(mockListProjects).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveFirst(PROJECTS);
    });
    // "project" matches every listed project: the late first page was dropped.
    await typeInto(searchInput(), 'project');
    expect(rowText('Beta')).toBe(true);
    expect(rowText('Alpha')).toBe(false);
  });

  it('Enter picks the top match and a second Enter confirms it', async () => {
    const { onSelect, onClose } = await renderModal();

    await typeInto(searchInput(), 'beta');
    await pressKey(searchInput(), 'Enter');
    expect(checkedRowIds()).toEqual(['beta-project']);
    expect(onSelect).not.toHaveBeenCalled();

    await pressKey(searchInput(), 'Enter');
    expect(onSelect).toHaveBeenCalledWith('beta-project', PROJECTS[1]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Enter on an empty search confirms the current project', async () => {
    const { onSelect } = await renderModal('beta-project');

    await pressKey(searchInput(), 'Enter');
    expect(onSelect).toHaveBeenCalledWith('beta-project', PROJECTS[1]);
  });

  it('Enter prefers an exact project ID, else uses the typed ID', async () => {
    mockListProjects.mockResolvedValue([
      { projectId: 'beta-project-dev', name: 'Dev', projectNumber: '333' },
      PROJECTS[1]
    ]);
    const { onSelect } = await renderModal();

    await typeInto(searchInput(), 'beta-project');
    await pressKey(searchInput(), 'Enter');
    expect(checkedRowIds()).toEqual(['beta-project']);

    await typeInto(searchInput(), 'my-other-project');
    await pressKey(searchInput(), 'Enter');
    await pressKey(searchInput(), 'Enter');
    expect(onSelect).toHaveBeenCalledWith('my-other-project', undefined);
  });

  it('uses the rows as radios and hides the inner radio inputs', async () => {
    await renderModal('alpha-project');
    // "project" matches both projects and also adds the typed-ID row.
    await typeInto(searchInput(), 'project');

    expect(rows().map(row => row.getAttribute('aria-checked'))).toEqual([
      'false',
      'true',
      'false'
    ]);
    rows().forEach(row => {
      expect(row.getAttribute('role')).toBe('radio');
      expect(row.getAttribute('tabindex')).toBe('0');
      const radioInput = row.querySelector('input[type="radio"]');
      expect(radioInput?.getAttribute('tabindex')).toBe('-1');
      expect(radioInput?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('selects a row with the keyboard or by clicking its radio', async () => {
    await renderModal();

    await pressKey(rows()[1], ' ');
    expect(checkedRowIds()).toEqual(['beta-project']);

    await click(rows()[0].querySelector('input[type="radio"]'));
    expect(checkedRowIds()).toEqual(['alpha-project']);
  });
});
