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
  listBigLakeCatalogsAPI: jest
    .fn()
    .mockResolvedValue(['catalog-a', 'catalog-b'])
}));

jest.mock('../utils/metastoreService', () => ({
  metastoreServiceListAPI: jest
    .fn()
    .mockResolvedValue([
      'projects/my-project/locations/us-central1/services/dpms-a'
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
import { listBigLakeCatalogsAPI } from '../utils/biglakeService';

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

    expect(listBigLakeCatalogsAPI).toHaveBeenCalledTimes(1);
    expect(listBigLakeCatalogsAPI).toHaveBeenCalledWith(
      'my-project',
      'us-central1'
    );

    await chooseOption('existing-catalog-select', 'catalog-b');
    await wait();
    expect(listBigLakeCatalogsAPI).toHaveBeenCalledTimes(1);

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
    (listBigLakeCatalogsAPI as jest.Mock).mockClear();

    await typeInto(input('hive-project-id'), 'other-pro');
    await typeInto(input('hive-project-id'), 'other-project');
    expect(listBigLakeCatalogsAPI).not.toHaveBeenCalled();

    await wait(PROJECT_INPUT_DEBOUNCE_MS + 100);
    expect(listBigLakeCatalogsAPI).toHaveBeenCalledTimes(1);
    expect(listBigLakeCatalogsAPI).toHaveBeenCalledWith(
      'other-project',
      'us-central1'
    );
  });
});
