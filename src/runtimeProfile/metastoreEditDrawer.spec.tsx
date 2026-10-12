
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
  authApi: jest.fn().mockResolvedValue({
    project_id: 'my-project',
    region_id: 'us-central1',
    access_token: 'token'
  })
}));

jest.mock('../utils/biglakeService', () => ({
  ...jest.requireActual('../utils/biglakeService'),
  listIcebergCatalogsAPI: jest
    .fn()
    .mockResolvedValue(['catalog-a', 'catalog-b']),
  listHiveCatalogsAPI: jest.fn().mockResolvedValue(['catalog-a', 'catalog-b'])
}));

jest.mock('../utils/metastoreService', () => ({
  metastoreServiceListAPI: jest
    .fn()
    .mockResolvedValue([
      'projects/my-project/locations/us-central1/services/dpms-a'
    ])
}));

jest.mock('../utils/projectService', () => ({
  ...jest.requireActual('../utils/projectService'),
  listProjectsWithDetailsAPI: jest
    .fn()
    .mockResolvedValue([
      { projectId: 'picked-project', name: 'Picked', projectNumber: '999' }
    ])
}));

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  CATALOG_NAME_INVALID_ERROR,
  MetastoreEditDrawer,
  PROJECT_INPUT_DEBOUNCE_MS
} from './metastoreEditDrawer';
import { LAKEHOUSE_RUNTIME_CATALOG } from './runtimeProfileMapper';
import { IMetastoreConfig } from './runtimeProfileInterface';
import {
  listHiveCatalogsAPI,
  listIcebergCatalogsAPI
} from '../utils/biglakeService';

describe('MetastoreEditDrawer & Metastore Flow', () => {
  const initialLakehouseConfig: IMetastoreConfig = {
    metastore: 'Lakehouse runtime catalog',
    metastoreType: 'lakehouse',
    projectId: 'test-project',
    icebergRestEndpointEnabled: true,
    catalogSelectionMode: 'new',
    catalogName: 'standard-lh-catalog-us-central1',
    hiveEndpointEnabled: false
  };

  const initialDpmsConfig: IMetastoreConfig = {
    metastore: 'Dataproc Metastore',
    metastoreType: 'dataproc',
    projectId: 'test-project',
    dataprocMetastoreService:
      'projects/test-project/locations/us-central1/services/dpms-service'
  };

  it('should export MetastoreEditDrawer component and instantiate with Lakehouse props', () => {
    expect(MetastoreEditDrawer).toBeDefined();
    expect(typeof MetastoreEditDrawer).toBe('function');

    const handleSave = jest.fn();
    const handleClose = jest.fn();

    const element = React.createElement(MetastoreEditDrawer, {
      open: true,
      config: initialLakehouseConfig,
      region: 'us-central1',
      onClose: handleClose,
      onSave: handleSave
    });

    expect(element).toBeDefined();
    expect(element.type).toBe(MetastoreEditDrawer);
    expect(element.props.open).toBe(true);
    expect(element.props.config.metastoreType).toBe('lakehouse');
    expect(element.props.config.catalogName).toBe(
      'standard-lh-catalog-us-central1'
    );
    expect(element.props.region).toBe('us-central1');
  });

  it('should instantiate MetastoreEditDrawer with Dataproc Metastore props', () => {
    const element = React.createElement(MetastoreEditDrawer, {
      open: true,
      config: initialDpmsConfig,
      region: 'us-central1',
      onClose: jest.fn(),
      onSave: jest.fn()
    });

    expect(element).toBeDefined();
    expect(element.props.config.metastoreType).toBe('dataproc');
    expect(element.props.config.dataprocMetastoreService).toBe(
      'projects/test-project/locations/us-central1/services/dpms-service'
    );
  });
});

describe('MetastoreEditDrawer interactions', () => {
  const DPMS_SERVICE =
    'projects/my-project/locations/us-central1/services/dpms-a';
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
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

  const click = async (element: HTMLElement) => {
    await act(async () => {
      element.click();
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

  const cards = () =>
    Array.from(
      document.body.querySelectorAll<HTMLElement>('.node-config-card')
    );

  const checkbox = (label: string) =>
    Array.from(document.body.querySelectorAll('label'))
      .find(el => el.textContent?.trim() === label)
      ?.querySelector('input[type="checkbox"]') as HTMLInputElement;

  const radio = (value: string) =>
    document.body.querySelector(
      `input[type="radio"][value="${value}"]`
    ) as HTMLInputElement;

  const input = (id: string) => document.getElementById(id) as HTMLInputElement;

  // Save is the first footer button; its class changes when disabled.
  const saveButton = () =>
    document.body.querySelector(
      '.edit-drawer-footer button'
    ) as HTMLButtonElement;

  const chooseOption = async (selectId: string, value: string) => {
    const select = document.getElementById(selectId) as HTMLElement;
    await act(async () => {
      select.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, button: 0 })
      );
    });
    await click(
      document.body.querySelector(
        `li[role="option"][data-value="${value}"]`
      ) as HTMLElement
    );
  };

  // A real click on Save moves focus off the field first, so it blurs.
  const blur = async (element: HTMLElement) => {
    await act(async () => {
      element.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    });
  };

  const renderDrawer = async () => {
    const onSave = jest.fn();
    await act(async () => {
      root.render(
        <MetastoreEditDrawer
          open
          config={{ metastore: '', hiveEndpointEnabled: false }}
          region="us-central1"
          onClose={jest.fn()}
          onSave={onSave}
        />
      );
    });
    await wait();
    return onSave;
  };

  // Configures Lakehouse with both endpoints, then switches card without saving.
  const enableBothEndpointsThenSwitchToDataproc = async () => {
    await click(cards()[0]);
    expect(checkbox('Iceberg REST Endpoint').checked).toBe(true);
    await click(checkbox('Hive Endpoint'));
    await wait();
    expect(checkbox('Hive Endpoint').checked).toBe(true);
    await click(cards()[1]);
    await wait();
  };

  it('allows saving Dataproc Metastore with None and drops Lakehouse values', async () => {
    const onSave = await renderDrawer();
    await enableBothEndpointsThenSwitchToDataproc();

    expect(saveButton().disabled).toBe(false);
    await click(saveButton());

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toStrictEqual({
      metastore: 'Dataproc Metastore',
      metastoreType: 'dataproc',
      projectId: undefined,
      dataprocMetastoreService: undefined
    });
  });

  it('drops Lakehouse values when saving with a Dataproc Metastore service', async () => {
    const onSave = await renderDrawer();
    await enableBothEndpointsThenSwitchToDataproc();
    await chooseOption('dpms-service-select', DPMS_SERVICE);
    await click(saveButton());

    expect(onSave.mock.calls[0][0]).toStrictEqual({
      metastore: 'Dataproc Metastore',
      metastoreType: 'dataproc',
      projectId: undefined,
      dataprocMetastoreService: DPMS_SERVICE
    });
  });

  it('keeps Iceberg and Hive values when saving with Lakehouse selected', async () => {
    const onSave = await renderDrawer();
    await click(checkbox('Hive Endpoint'));
    await wait();
    await click(saveButton());

    // The profile's own project and the region's default catalog name are
    // not saved, so they follow later changes.
    expect(onSave.mock.calls[0][0]).toEqual({
      metastore: LAKEHOUSE_RUNTIME_CATALOG,
      metastoreType: 'lakehouse',
      projectId: undefined,
      icebergRestEndpointEnabled: true,
      catalogSelectionMode: 'new',
      catalogId: undefined,
      catalogName: undefined,
      hiveEndpointEnabled: true,
      hiveProjectId: 'my-project',
      hiveCatalogId: 'catalog-a',
      hiveCatalogName: 'catalog-a'
    });
  });

  it('drops hidden Iceberg values when only the Hive endpoint is enabled', async () => {
    const onSave = await renderDrawer();
    // Pick an existing catalog first, so hidden Iceberg values exist.
    await click(radio('existing'));
    await wait();
    await click(checkbox('Iceberg REST Endpoint'));
    await click(checkbox('Hive Endpoint'));
    await wait();
    await click(saveButton());

    expect(onSave.mock.calls[0][0]).toEqual({
      metastore: LAKEHOUSE_RUNTIME_CATALOG,
      metastoreType: 'lakehouse',
      icebergRestEndpointEnabled: false,
      hiveEndpointEnabled: true,
      hiveProjectId: 'my-project',
      hiveCatalogId: 'catalog-a',
      hiveCatalogName: 'catalog-a'
    });
  });

  it('does not refetch catalogs when a catalog is selected', async () => {
    const onSave = await renderDrawer();
    await click(radio('existing'));
    await wait();

    expect(listIcebergCatalogsAPI).toHaveBeenCalledTimes(1);
    expect(listIcebergCatalogsAPI).toHaveBeenCalledWith('my-project');
    // The Hive endpoint is off, so its catalogs are not fetched.
    expect(listHiveCatalogsAPI).not.toHaveBeenCalled();

    await chooseOption('existing-catalog-select', 'catalog-b');
    await wait();
    expect(listIcebergCatalogsAPI).toHaveBeenCalledTimes(1);

    await click(saveButton());
    expect(onSave.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        catalogSelectionMode: 'existing',
        catalogId: 'catalog-b'
      })
    );
  });

  it('rejects catalog names that would break property keys', async () => {
    const onSave = await renderDrawer();

    await typeInto(input('new-catalog-name'), 'bad.name');
    expect(saveButton().disabled).toBe(true);
    expect(document.body.textContent).toContain(CATALOG_NAME_INVALID_ERROR);

    await typeInto(input('new-catalog-name'), 'sales_catalog');
    expect(saveButton().disabled).toBe(false);
    await click(saveButton());
    expect(onSave.mock.calls[0][0].catalogName).toBe('sales_catalog');
  });

  it('fetches catalogs for a typed project ID only after a pause', async () => {
    await renderDrawer();
    await click(checkbox('Hive Endpoint'));
    await wait();
    (listHiveCatalogsAPI as jest.Mock).mockClear();

    await typeInto(input('hive-project-id'), 'other-pro');
    await typeInto(input('hive-project-id'), 'other-project');
    expect(listHiveCatalogsAPI).not.toHaveBeenCalled();

    await wait(PROJECT_INPUT_DEBOUNCE_MS + 100);
    expect(listHiveCatalogsAPI).toHaveBeenCalledTimes(1);
    expect(listHiveCatalogsAPI).toHaveBeenCalledWith('other-project');
  });

  it('saves a typed project right away and drops the old project service', async () => {
    const onSave = await renderDrawer();
    await click(cards()[1]);
    await wait();
    await chooseOption('dpms-service-select', DPMS_SERVICE);

    await typeInto(input('dpms-project-id'), 'other-project');
    // Clicking Save moves focus off the field first, which commits the value.
    await blur(input('dpms-project-id'));
    await click(saveButton());

    expect(onSave.mock.calls[0][0]).toStrictEqual({
      metastore: 'Dataproc Metastore',
      metastoreType: 'dataproc',
      projectId: 'other-project',
      dataprocMetastoreService: undefined
    });
  });

  it('clears the catalog picked for the previous project', async () => {
    const onSave = await renderDrawer();
    await click(radio('existing'));
    await wait();
    await chooseOption('existing-catalog-select', 'catalog-b');
    expect(saveButton().disabled).toBe(false);

    let resolveCatalogs: (catalogs: string[]) => void = () => undefined;
    (listIcebergCatalogsAPI as jest.Mock).mockReturnValueOnce(
      new Promise(resolve => {
        resolveCatalogs = resolve;
      })
    );
    await typeInto(input('metastore-project-id'), 'other-project');
    await blur(input('metastore-project-id'));
    // catalog-b belongs to the old project; Save waits for the new list.
    expect(saveButton().disabled).toBe(true);

    await act(async () => {
      resolveCatalogs(['other-catalog']);
    });
    expect(saveButton().disabled).toBe(false);
    await click(saveButton());
    expect(onSave.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        projectId: 'other-project',
        catalogSelectionMode: 'existing',
        catalogId: 'other-catalog'
      })
    );
  });

  it('keeps a typed Hive catalog name when the Hive project changes', async () => {
    const onSave = await renderDrawer();
    await click(checkbox('Hive Endpoint'));
    await wait();
    await typeInto(input('hive-catalog-name'), 'my_hive');

    let resolveCatalogs: (catalogs: string[]) => void = () => undefined;
    (listHiveCatalogsAPI as jest.Mock).mockReturnValueOnce(
      new Promise(resolve => {
        resolveCatalogs = resolve;
      })
    );
    await typeInto(input('hive-project-id'), 'other-project');
    await blur(input('hive-project-id'));
    // The typed name alone must not save before the new catalog is picked.
    expect(saveButton().disabled).toBe(true);

    await act(async () => {
      resolveCatalogs(['hive-catalog']);
    });
    await click(saveButton());
    expect(onSave.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        hiveProjectId: 'other-project',
        hiveCatalogId: 'hive-catalog',
        hiveCatalogName: 'my_hive'
      })
    );
  });

  it('clears the Hive catalog when a project is picked with Browse', async () => {
    const onSave = await renderDrawer();
    await click(checkbox('Hive Endpoint'));
    await wait();

    (listHiveCatalogsAPI as jest.Mock).mockResolvedValueOnce([
      'picked-catalog'
    ]);
    await click(
      document.querySelector(
        '.metastore-drawer-hive-fields .edit-drawer-browse-btn'
      ) as HTMLElement
    );
    await wait();
    await click(
      document.querySelector('.project-selector-item') as HTMLElement
    );
    await click(
      document.querySelector('.project-selector-submit-btn') as HTMLElement
    );
    await wait();
    await click(saveButton());

    // The name only mirrored the old catalog ID, so it follows the new one.
    expect(onSave.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        hiveProjectId: 'picked-project',
        hiveCatalogId: 'picked-catalog',
        hiveCatalogName: 'picked-catalog'
      })
    );
  });

  it('disables Save when Hive catalog fetch fails even if a catalog name is typed', async () => {
    (listHiveCatalogsAPI as jest.Mock).mockRejectedValueOnce(
      new Error('network error')
    );
    await renderDrawer();
    await click(checkbox('Hive Endpoint'));
    await wait();

    await typeInto(input('hive-catalog-name'), 'my_hive');
    expect(saveButton().disabled).toBe(true);
  });

  it('disables Save when Iceberg existing catalog fetch fails', async () => {
    (listIcebergCatalogsAPI as jest.Mock).mockRejectedValueOnce(
      new Error('network error')
    );
    await renderDrawer();
    await click(radio('existing'));
    await wait();

    expect(saveButton().disabled).toBe(true);
  });
});
