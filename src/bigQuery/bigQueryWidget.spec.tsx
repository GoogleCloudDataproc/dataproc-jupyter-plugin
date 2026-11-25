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

jest.mock('../utils/utils', () => ({
  ...jest.requireActual('../utils/utils'),
  checkConfig: jest.fn()
}));

jest.mock('./bigQueryDatasetInfoWrapper', () => ({
  BigQueryDatasetWrapper: jest.fn().mockImplementation((name, proj) => ({
    id: `ds-${name}`,
    title: { label: name },
    dataset: name,
    projectId: proj,
    dispose: jest.fn()
  }))
}));

jest.mock('./bigQueryTableInfoWrapper', () => ({
  BigQueryTableWrapper: jest.fn().mockImplementation((name, db, proj) => ({
    id: `tbl-${name}`,
    title: { label: name },
    table: name,
    database: db,
    projectId: proj,
    dispose: jest.fn()
  }))
}));

jest.mock('@jupyterlab/apputils', () => {
  const actual = jest.requireActual('@jupyterlab/apputils');
  return {
    ...actual,
    MainAreaWidget: jest.fn().mockImplementation(({ content }: any) => ({
      content,
      id: '',
      title: { label: '', closable: false, icon: null },
      disposed: { connect: jest.fn() }
    }))
  };
});

jest.mock('react-arborist', () => {
  const React = require('react');
  const Tree = ({ data = [], openByDefault = false, children }: any) => {
    const [openIds, setOpenIds] = React.useState(new Set<string>());
    const rootNode = { parent: null };

    const toggleId = (id: string) => {
      setOpenIds((prev: Set<string>) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    };

    const renderNodes = (items: any[], parent: any): any[] => {
      if (!Array.isArray(items)) {
        return [];
      }
      return items.flatMap(item => {
        const isOpen = openByDefault || openIds.has(item.id);
        const node: any = {
          id: item.id,
          data: item,
          parent,
          isOpen,
          children: Array.isArray(item.children) ? item.children : [],
          toggle: () => toggleId(item.id)
        };
        const rendered = React.createElement(
          'div',
          { key: item.id, 'data-node-id': item.id },
          children({ node, style: {} })
        );
        const childElements =
          isOpen && Array.isArray(item.children)
            ? renderNodes(item.children, node)
            : [];
        return [rendered, ...childElements];
      });
    };

    return React.createElement(
      'div',
      { className: 'mock-tree' },
      renderNodes(data, rootNode)
    );
  };
  return { Tree };
});

import { act } from 'react-dom/test-utils';
import { createRoot, Root } from 'react-dom/client';
import { BigQueryWidget } from './bigQueryWidget';
import { BigQueryService } from './bigQueryService';
import { checkConfig } from '../utils/utils';
import { BIGQUERY_API_URL } from '../utils/const';

describe('BigQueryWidget', () => {
  let container: HTMLDivElement;
  let root: Root;
  let mockApp: any;
  let mockSettingRegistry: any;
  let mockThemeManager: any;
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockApp = {
      shell: {
        add: jest.fn(),
        activateById: jest.fn()
      },
      commands: {
        execute: jest.fn().mockResolvedValue({ id: 'nb-panel-1' })
      }
    };
    mockSettingRegistry = {
      load: jest.fn().mockResolvedValue({
        get: jest.fn().mockReturnValue({ composite: 'US' })
      })
    };
    mockThemeManager = {
      theme: 'JupyterLab Light',
      isLight: jest.fn(() => true),
      themeChanged: { connect: jest.fn(), disconnect: jest.fn() }
    };

    (checkConfig as jest.Mock).mockImplementation(
      (setLoggedIn, setConfigError, setLoginError) => {
        setLoggedIn(true);
        setConfigError(false);
        setLoginError(false);
      }
    );

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: jest.fn() }
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard
    });
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const renderWidget = async () => {
    const widget = new BigQueryWidget(
      mockApp,
      mockSettingRegistry,
      true,
      mockThemeManager
    );
    await act(async () => {
      root.render(widget.renderInternal());
    });
    return widget;
  };

  it('shows loading spinner initially and renders BigQuery API disabled message on apiError', async () => {
    let triggerApiError: () => void = () => {};
    jest
      .spyOn(BigQueryService, 'getBigQueryProjectsListAPIService')
      .mockImplementation(
        (_setProjects, setIsLoading, setApiError, setProjectName) =>
          new Promise<void>(resolve => {
            triggerApiError = () => {
              setProjectName('proj-err');
              setApiError(true);
              setIsLoading(false);
              resolve();
            };
          })
      );

    await renderWidget();
    expect(container.textContent).toContain('Loading datasets');

    await act(async () => {
      triggerApiError();
    });

    expect(container.textContent).toContain(
      'Bigquery API is not enabled for this project.'
    );
    const link = container.querySelector('a.link-class') as HTMLAnchorElement;
    expect(link.href).toBe(`${BIGQUERY_API_URL}?project=proj-err`);
  });

  it('renders login error when checkConfig sets loginError', async () => {
    (checkConfig as jest.Mock).mockImplementation(
      (setLoggedIn, setConfigError, setLoginError) => {
        setLoggedIn(false);
        setConfigError(false);
        setLoginError(true);
      }
    );
    jest
      .spyOn(BigQueryService, 'getBigQueryProjectsListAPIService')
      .mockImplementation(async (_p, setIsLoading) => setIsLoading(false));

    await renderWidget();
    expect(container.textContent).toContain('Please login to continue');
  });

  it('expands project -> dataset -> table -> columns, loads more datasets, and handles refresh', async () => {
    jest
      .spyOn(BigQueryService, 'getBigQueryProjectsListAPIService')
      .mockImplementation(async (setProjects, setIsLoading) => {
        setProjects(['proj-b', 'proj-a']);
        setIsLoading(false);
      });

    jest
      .spyOn(BigQueryService, 'getBigQueryDatasetsAPIService')
      .mockImplementation(
        async (
          _nb,
          _sr,
          setDatabaseNames,
          setDataSetResponse,
          projectId,
          setIsIconLoading,
          setIsLoading,
          setIsLoadMoreLoading,
          _prev,
          setUpdatedDatasetList,
          pageToken,
          setNextPageToken
        ) => {
          if (!pageToken) {
            setUpdatedDatasetList?.([{ name: 'ds_1' }]);
            setNextPageToken?.(projectId, 'next-ds-tok');
            setDatabaseNames(['ds_1']);
            setDataSetResponse([{ name: 'ds_1' }]);
          } else {
            setUpdatedDatasetList?.([{ name: 'ds_1' }, { name: 'ds_2' }]);
            setNextPageToken?.(projectId, null);
            setDatabaseNames(['ds_1', 'ds_2']);
            setDataSetResponse([{ name: 'ds_1' }, { name: 'ds_2' }]);
          }
          setIsIconLoading(false);
          setIsLoading(false);
          setIsLoadMoreLoading(false);
        }
      );

    jest
      .spyOn(BigQueryService, 'getBigQueryTableAPIService')
      .mockImplementation(
        async (
          _nb,
          datasetId,
          _setDbNames,
          setTableResponse,
          _proj,
          setIconLoad
        ) => {
          setTableResponse([
            { tableReference: { datasetId, tableId: 'tbl_1' } }
          ]);
          setIconLoad(false);
        }
      );

    jest
      .spyOn(BigQueryService, 'getBigQueryColumnDetailsAPIService')
      .mockImplementation(
        async (datasetId, tableId, _proj, setIconLoad, setSchemaResponse) => {
          setSchemaResponse({
            tableReference: { datasetId, tableId },
            schema: { fields: [{ name: 'col_id', type: 'STRING' }] }
          });
          setIconLoad(false);
        }
      );

    await renderWidget();

    const projectItems = Array.from(
      container.querySelectorAll('.mock-tree [title]')
    ).map(el => el.getAttribute('title'));
    expect(projectItems).toContain('proj-a');
    expect(projectItems).toContain('proj-b');

    // Expand proj-a
    const caretIcons = container.querySelectorAll('.caret-icon');
    await act(async () => {
      (caretIcons[0] as HTMLElement).click();
    });
    expect(container.textContent).toContain('ds_1');
    expect(container.textContent).toContain('Load More...');

    // Click Load More...
    await act(async () => {
      (container.querySelector('.load-more-icon') as HTMLElement).click();
    });
    expect(container.textContent).toContain('ds_2');

    // Expand ds_1 -> loads tbl_1
    const dsNode = container
      .querySelector('[title="ds_1"]')
      ?.parentElement?.querySelector('.caret-icon') as HTMLElement;
    await act(async () => {
      dsNode.click();
    });
    expect(container.textContent).toContain('tbl_1');

    // Expand tbl_1 -> loads col_id
    const tblNode = container
      .querySelector('[title="tbl_1"]')
      ?.parentElement?.querySelector('.caret-icon') as HTMLElement;
    await act(async () => {
      tblNode.click();
    });
    expect(container.textContent).toContain('col_id');
    expect(container.textContent).toContain('STRING');

    // Click dataset and table nodes to open MainAreaWidgets
    await act(async () => {
      (container.querySelector('[title="ds_1"]') as HTMLElement).click();
      (container.querySelector('[title="tbl_1"]') as HTMLElement).click();
    });
    expect(mockApp.shell.add).toHaveBeenCalledTimes(2);

    const projectsSpy = jest.spyOn(
      BigQueryService,
      'getBigQueryProjectsListAPIService'
    );
    const callsBeforeRefresh = projectsSpy.mock.calls.length;

    // Refresh Dataset Explorer
    await act(async () => {
      (
        container.querySelector(
          '[aria-label="dataset-explorer-refresh"]'
        ) as HTMLElement
      ).click();
    });
    expect(projectsSpy).toHaveBeenCalledTimes(callsBeforeRefresh + 1);
  });

  it('handles table context menu actions: Copy table ID, Open table details, and Query table', async () => {
    jest.useFakeTimers();
    jest
      .spyOn(BigQueryService, 'getBigQueryProjectsListAPIService')
      .mockImplementation(async (setProjects, setIsLoading) => {
        setProjects(['proj-a']);
        setIsLoading(false);
      });
    jest
      .spyOn(BigQueryService, 'getBigQueryDatasetsAPIService')
      .mockImplementation(
        async (
          _nb,
          _sr,
          setDbNames,
          setDsResp,
          _p,
          setIconLoad,
          setLoad,
          setLmLoad
        ) => {
          setDbNames(['ds_1']);
          setDsResp([{ name: 'ds_1' }]);
          setIconLoad(false);
          setLoad(false);
          setLmLoad(false);
        }
      );
    jest
      .spyOn(BigQueryService, 'getBigQueryTableAPIService')
      .mockImplementation(
        async (_nb, datasetId, _s, setTableResponse, _p, setIconLoad) => {
          setTableResponse([
            { tableReference: { datasetId, tableId: 'tbl_1' } }
          ]);
          setIconLoad(false);
        }
      );

    await renderWidget();

    await act(async () => {
      (
        container
          .querySelector('[title="proj-a"]')
          ?.parentElement?.querySelector('.caret-icon') as HTMLElement
      ).click();
    });
    await act(async () => {
      (
        container
          .querySelector('[title="ds_1"]')
          ?.parentElement?.querySelector('.caret-icon') as HTMLElement
      ).click();
    });

    const tblText = container.querySelector('[title="tbl_1"]') as HTMLElement;

    const openContextMenu = async () => {
      await act(async () => {
        tblText.dispatchEvent(
          new MouseEvent('contextmenu', {
            bubbles: true,
            clientX: 10,
            clientY: 20
          })
        );
      });
    };

    await openContextMenu();
    const copyItem = Array.from(
      document.body.querySelectorAll('[role="menuitem"]')
    ).find(el => el.textContent === 'Copy table ID') as HTMLElement;
    await act(async () => {
      copyItem.click();
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'proj-a.ds_1.tbl_1'
    );

    await openContextMenu();
    const openDetailsItem = Array.from(
      document.body.querySelectorAll('[role="menuitem"]')
    ).find(el => el.textContent === 'Open table details') as HTMLElement;
    await act(async () => {
      openDetailsItem.click();
    });
    expect(mockApp.shell.add).toHaveBeenCalledTimes(1);

    await openContextMenu();
    const queryItem = Array.from(
      document.body.querySelectorAll('[role="menuitem"]')
    ).find(el => el.textContent === 'Query table') as HTMLElement;
    await act(async () => {
      queryItem.click();
      await jest.advanceTimersByTimeAsync(350);
    });
    expect(mockApp.commands.execute).toHaveBeenCalledWith(
      'notebook:create-new',
      { kernelName: 'python3' }
    );
    expect(mockApp.shell.activateById).toHaveBeenCalledWith('nb-panel-1');
    expect(mockApp.commands.execute).toHaveBeenCalledWith(
      'notebook:replace-selection',
      expect.objectContaining({
        text: expect.stringContaining('`proj-a.ds_1.tbl_1`')
      })
    );
  });

  it('debounces search input and resets tree on clear button click', async () => {
    jest.useFakeTimers();
    jest
      .spyOn(BigQueryService, 'getBigQueryProjectsListAPIService')
      .mockImplementation(async (setProjects, setIsLoading) => {
        setProjects(['proj-a']);
        setIsLoading(false);
      });
    const searchSpy = jest
      .spyOn(BigQueryService, 'getBigQuerySearchAPIService')
      .mockImplementation(
        async (_term, setSearchLoading, setSearchResponse) => {
          setSearchResponse({
            results: [
              {
                dataplexEntry: {
                  fullyQualifiedName: 'bigquery:proj-s.ds_s.tbl_s'
                }
              }
            ]
          });
          setSearchLoading(false);
        }
      );

    await renderWidget();

    const searchInput = container.querySelector(
      'input[placeholder="Enter your keyword to search"]'
    ) as HTMLInputElement;
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    )?.set;

    await act(async () => {
      setValue?.call(searchInput, 'tbl_s');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await jest.advanceTimersByTimeAsync(1000);
    });

    expect(searchSpy).toHaveBeenCalledWith(
      'tbl_s',
      expect.any(Function),
      expect.any(Function)
    );
    expect(container.textContent).toContain('proj-s');
    expect(container.textContent).toContain('ds_s');
    expect(container.textContent).toContain('tbl_s');

    const clearBtn = container
      .querySelector('.search-clear-icon')
      ?.closest('button') as HTMLButtonElement;
    await act(async () => {
      clearBtn.click();
    });
    expect(searchInput.value).toBe('');
    expect(container.textContent).toContain('proj-a');
  });
});
