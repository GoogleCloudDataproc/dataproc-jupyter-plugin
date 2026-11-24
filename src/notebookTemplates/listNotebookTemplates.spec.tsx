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

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import * as path from 'path';
import ListNotebookTemplates from './listNotebookTemplates';
import NotebookTemplateService from './notebookTemplatesService';

describe('ListNotebookTemplates Component', () => {
  let container: HTMLDivElement;
  let root: Root;
  let consoleErrorSpy: jest.SpyInstance;

  const mockThemeManager: any = {};

  const createMockApp = (hasCurrentShellWidget = true) => {
    const mockSave = jest.fn().mockResolvedValue({});
    const mockUpdate = jest.fn();
    const mockExecute = jest.fn().mockResolvedValue({});
    const app: any = {
      serviceManager: {
        contents: {
          save: mockSave
        }
      },
      shell: {
        currentWidget: hasCurrentShellWidget ? { update: mockUpdate } : null
      },
      commands: {
        execute: mockExecute
      }
    };

    return { app, mockSave, mockUpdate, mockExecute };
  };

  const createMockFactory = (
    widgetPath: string | null = 'workspace/dir'
  ): any => ({
    tracker: {
      currentWidget:
        widgetPath !== null
          ? {
              model: {
                path: widgetPath
              }
            }
          : null
    }
  });

  const buildTemplateData = (index: number) => ({
    category: `Category-${index}`,
    title: `Template-${index}`,
    description: `Description for template ${index}`,
    created_at: '2026-01-01',
    sub_category: 'Spark',
    url: `https://example.com/templates/notebook_${index}.ipynb`
  });

  const buildTemplateRow = (
    renderActions: (data: any) => React.JSX.Element,
    index: number
  ) => {
    const rawData = buildTemplateData(index);
    return {
      category: rawData.category,
      name: rawData.title,
      title: rawData.title,
      description: rawData.description,
      actions: renderActions(rawData)
    };
  };

  const mockTemplateList = (count: number) =>
    jest
      .spyOn(NotebookTemplateService, 'listNotebookTemplateAPIService')
      .mockImplementation(
        async (setTemplateList, renderActions, setIsLoading) => {
          const rows = Array.from({ length: count }, (_, i) =>
            buildTemplateRow(renderActions, i + 1)
          );
          setTemplateList(rows);
          setIsLoading(false);
        }
      );

  const mockHandleClick = (notebookContent: object = { cells: [] }) =>
    jest
      .spyOn(NotebookTemplateService, 'handleClickService')
      .mockImplementation(async (template, downloadNotebook) => {
        await downloadNotebook(notebookContent, template.url);
      });

  const renderComponent = async (
    app = createMockApp().app,
    factory = createMockFactory()
  ) => {
    await act(async () => {
      root.render(
        <ListNotebookTemplates
          app={app}
          themeManager={mockThemeManager}
          factory={factory}
        />
      );
    });
  };

  const clickUseTemplateButton = async () => {
    const useTemplateBtn = container.querySelector(
      '.use-template-style'
    ) as HTMLElement;
    expect(useTemplateBtn).not.toBeNull();

    await act(async () => {
      useTemplateBtn.click();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    jest.restoreAllMocks();
  });

  describe('rendering states', () => {
    it('displays loading spinner while templates are being fetched', async () => {
      jest
        .spyOn(NotebookTemplateService, 'listNotebookTemplateAPIService')
        .mockImplementation(async () => undefined);

      await renderComponent();

      expect(container.querySelector('[data-testid="loader"]')).not.toBeNull();
      expect(container.textContent).toContain('Loading Notebook Templates');
    });

    it('displays "No rows to display" when template list is empty after loading', async () => {
      mockTemplateList(0);

      await renderComponent();

      expect(container.querySelector('.no-data-style')?.textContent).toBe(
        'No rows to display'
      );
      expect(container.querySelector('[data-testid="loader"]')).toBeNull();
    });

    it('renders the global filter section when templates are loaded', async () => {
      mockTemplateList(1);

      await renderComponent();

      expect(container.querySelector('.filter-cluster-overlay')).not.toBeNull();
      expect(container.querySelector('.filter-cluster-section')).not.toBeNull();
    });

    it('renders category, name, description, and action cells for each template row', async () => {
      mockTemplateList(1);

      await renderComponent();

      const cells = container.querySelectorAll(
        'td.notebook-template-table-data'
      );
      expect(cells.length).toBe(4);
      expect(cells[0].textContent).toBe('Category-1');
      expect(cells[1].textContent).toBe('Template-1');
      expect(cells[2].textContent).toBe('Description for template 1');

      const actionBtn = cells[3].querySelector('.use-template-style');
      expect(actionBtn?.textContent).toBe('Use this template');
      expect(actionBtn?.getAttribute('role')).toBe('button');
      expect(actionBtn?.getAttribute('aria-label')).toBe(
        'Use notebook template'
      );
    });

    it('does not render PaginationView when template count is 50 or fewer', async () => {
      mockTemplateList(50);

      await renderComponent();

      expect(container.querySelector('.pagination-parent-view')).toBeNull();
    });

    it('renders PaginationView when template count exceeds 50', async () => {
      mockTemplateList(55);

      await renderComponent();

      expect(container.querySelector('.pagination-parent-view')).not.toBeNull();
    });
  });

  describe('template download and open actions', () => {
    it('invokes NotebookTemplateService.handleClickService with template data on click', async () => {
      mockTemplateList(1);
      const clickSpy = jest
        .spyOn(NotebookTemplateService, 'handleClickService')
        .mockResolvedValue(undefined);

      await renderComponent();
      await clickUseTemplateButton();

      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledWith(
        buildTemplateData(1),
        expect.any(Function)
      );
    });

    it('saves the notebook to the active local folder path on download', async () => {
      const mockNotebookContent = { cells: [{ cell_type: 'code' }] };
      mockTemplateList(1);
      mockHandleClick(mockNotebookContent);
      const { app, mockSave } = createMockApp(true);

      await renderComponent(app, createMockFactory('local/folder'));
      await clickUseTemplateButton();

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(mockSave).toHaveBeenCalledWith(
        `local/folder${path.sep}notebook_1.ipynb`,
        {
          type: 'file',
          format: 'text',
          content: JSON.stringify(mockNotebookContent)
        }
      );
    });

    it('opens the saved notebook via docmanager:open after downloading', async () => {
      mockTemplateList(1);
      mockHandleClick({ cells: [] });
      const { app, mockExecute } = createMockApp(true);

      await renderComponent(app, createMockFactory('local/folder'));
      await clickUseTemplateButton();

      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockExecute).toHaveBeenCalledWith('docmanager:open', {
        path: `local/folder${path.sep}notebook_1.ipynb`
      });
    });

    it('refreshes the active shell widget after saving a downloaded notebook', async () => {
      mockTemplateList(1);
      mockHandleClick({ cells: [] });
      const { app, mockUpdate } = createMockApp(true);

      await renderComponent(app, createMockFactory('local/folder'));
      await clickUseTemplateButton();

      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    it('saves and opens the notebook at the workspace root when the browser path is a GCS (gs:) path', async () => {
      const mockNotebookContent = { cells: [] };
      mockTemplateList(1);
      mockHandleClick(mockNotebookContent);
      const { app, mockSave, mockExecute } = createMockApp(true);

      await renderComponent(app, createMockFactory('gs:my-bucket/notebooks'));
      await clickUseTemplateButton();

      const expectedPath = `${path.sep}notebook_1.ipynb`;
      expect(mockSave).toHaveBeenCalledWith(expectedPath, {
        type: 'file',
        format: 'text',
        content: JSON.stringify(mockNotebookContent)
      });
      expect(mockExecute).toHaveBeenCalledWith('docmanager:open', {
        path: expectedPath
      });
    });

    it('completes download cleanly without updating shell when no active shell widget exists', async () => {
      mockTemplateList(1);
      mockHandleClick({ cells: [] });
      const { app, mockSave, mockUpdate, mockExecute } = createMockApp(false);

      await renderComponent(app, createMockFactory('local/folder'));
      await clickUseTemplateButton();

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('logs an error and aborts download when no active file browser widget is found', async () => {
      mockTemplateList(1);
      mockHandleClick({ cells: [] });
      const { app, mockSave, mockExecute } = createMockApp(true);

      await renderComponent(app, createMockFactory(null));
      await clickUseTemplateButton();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'No active file browser widget found.'
      );
      expect(mockSave).not.toHaveBeenCalled();
      expect(mockExecute).not.toHaveBeenCalled();
    });
  });
});
