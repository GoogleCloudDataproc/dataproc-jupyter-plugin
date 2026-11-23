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

jest.mock('@jupyterlab/apputils', () => ({
  ...jest.requireActual('@jupyterlab/apputils'),
  Notification: {
    emit: jest.fn()
  }
}));

jest.mock('../utils/utils', () => ({
  ...jest.requireActual('../utils/utils'),
  authApi: jest.fn()
}));

import { Notification } from '@jupyterlab/apputils';
import { requestAPI } from '../handler/handler';
import { authApi } from '../utils/utils';
import { BigQueryService } from './bigQueryService';
import {
  BIGQUERY_SERVICE_NAME,
  DEFAULT_PUBLIC_PROJECT_ID,
  PLUGIN_ID
} from '../utils/const';

describe('BigQueryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockSettingsRegistry = (region: string) =>
    ({
      load: jest.fn().mockResolvedValue({
        get: jest.fn().mockReturnValue({ composite: region })
      })
    } as any);

  describe('bigQueryPreviewAPIService', () => {
    const cols = [
      { Header: 'id', accessor: 'id' },
      { Header: 'meta', accessor: 'meta' }
    ];

    it('transforms rows including object values and updates preview state', async () => {
      (requestAPI as jest.Mock).mockResolvedValue({
        totalRows: '2',
        rows: [
          { f: [{ v: '1' }, { v: { nested: true } }] },
          { f: [{ v: '2' }, { v: 'plain' }] }
        ]
      });

      const setIsLoading = jest.fn();
      const setTotalRowSize = jest.fn();
      const setPreviewDataList = jest.fn();

      await BigQueryService.bigQueryPreviewAPIService(
        cols,
        'tbl',
        'ds',
        setIsLoading,
        'proj',
        50,
        1,
        setTotalRowSize,
        setPreviewDataList
      );

      expect(requestAPI).toHaveBeenCalledWith(
        'bigQueryPreview?project_id=proj&dataset_id=ds&table_id=tbl&max_results=50&start_index=50'
      );
      expect(setPreviewDataList).toHaveBeenCalledWith([
        { id: '1', meta: '{"nested":true}' },
        { id: '2', meta: 'plain' }
      ]);
      expect(setTotalRowSize).toHaveBeenCalledWith('2');
      expect(setIsLoading).toHaveBeenLastCalledWith(false);
    });

    it('emits error notification when API returns data.error', async () => {
      (requestAPI as jest.Mock).mockResolvedValue({ error: 'Preview failed' });
      const setIsLoading = jest.fn();

      await BigQueryService.bigQueryPreviewAPIService(
        cols,
        'tbl',
        'ds',
        setIsLoading,
        'proj',
        50,
        0,
        jest.fn(),
        jest.fn()
      );

      expect(Notification.emit).toHaveBeenCalledWith(
        'Preview failed',
        'error',
        {
          autoClose: 5000
        }
      );
      expect(setIsLoading).toHaveBeenLastCalledWith(false);
    });

    it('stops loading without setting rows when totalRows is 0', async () => {
      (requestAPI as jest.Mock).mockResolvedValue({ totalRows: 0 });
      const setIsLoading = jest.fn();
      const setPreviewDataList = jest.fn();

      await BigQueryService.bigQueryPreviewAPIService(
        cols,
        'tbl',
        'ds',
        setIsLoading,
        'proj',
        50,
        0,
        jest.fn(),
        setPreviewDataList
      );

      expect(setPreviewDataList).not.toHaveBeenCalled();
      expect(setIsLoading).toHaveBeenLastCalledWith(false);
    });

    it('emits notification when bigQueryPreviewAPIService rejects', async () => {
      (requestAPI as jest.Mock).mockRejectedValue(new Error('Network error'));

      await BigQueryService.bigQueryPreviewAPIService(
        cols,
        'tbl',
        'ds',
        jest.fn(),
        'proj',
        50,
        0,
        jest.fn(),
        jest.fn()
      );

      expect(Notification.emit).toHaveBeenCalledWith(
        expect.stringContaining('Error in calling BigQuery Preview API'),
        'error',
        { autoClose: 5000 }
      );
    });
  });

  describe('getBigQueryColumnDetailsAPIService and getBigQuerySchemaInfoAPIService', () => {
    it('fetches column details and handles error', async () => {
      const schemaPayload = { tableReference: { tableId: 'tbl' } };
      (requestAPI as jest.Mock).mockResolvedValueOnce(schemaPayload);
      const setIsIconLoading = jest.fn();
      const setSchemaResponse = jest.fn();

      await BigQueryService.getBigQueryColumnDetailsAPIService(
        'ds',
        'tbl',
        'proj',
        setIsIconLoading,
        setSchemaResponse
      );
      expect(setSchemaResponse).toHaveBeenCalledWith(schemaPayload);
      expect(setIsIconLoading).toHaveBeenCalledWith(false);

      (requestAPI as jest.Mock).mockRejectedValueOnce(new Error('Fail'));
      await BigQueryService.getBigQueryColumnDetailsAPIService(
        'ds',
        'tbl',
        'proj',
        setIsIconLoading,
        setSchemaResponse
      );
      expect(Notification.emit).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch big query schema'),
        'error',
        { autoClose: 5000 }
      );
    });

    it('fetches schema fields, falls back to empty array, and notifies on rejection', async () => {
      const setSchemaInfoResponse = jest.fn();
      (requestAPI as jest.Mock).mockResolvedValueOnce({
        schema: { fields: [{ name: 'id', type: 'STRING' }] }
      });
      await BigQueryService.getBigQuerySchemaInfoAPIService(
        'ds',
        'tbl',
        'proj',
        setSchemaInfoResponse
      );
      expect(setSchemaInfoResponse).toHaveBeenCalledWith([
        { name: 'id', type: 'STRING' }
      ]);

      (requestAPI as jest.Mock).mockResolvedValueOnce({});
      await BigQueryService.getBigQuerySchemaInfoAPIService(
        'ds',
        'tbl',
        'proj',
        setSchemaInfoResponse
      );
      expect(setSchemaInfoResponse).toHaveBeenCalledWith([]);

      (requestAPI as jest.Mock).mockRejectedValueOnce(new Error('Schema err'));
      await BigQueryService.getBigQuerySchemaInfoAPIService(
        'ds',
        'tbl',
        'proj',
        setSchemaInfoResponse
      );
      expect(Notification.emit).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch big query schema'),
        'error',
        { autoClose: 5000 }
      );
    });
  });

  describe('getBigQueryDatasetsAPIService', () => {
    it('does nothing when notebookValue is empty', async () => {
      await BigQueryService.getBigQueryDatasetsAPIService(
        '',
        mockSettingsRegistry('US'),
        jest.fn(),
        jest.fn(),
        'proj',
        jest.fn(),
        jest.fn(),
        jest.fn()
      );
      expect(requestAPI).not.toHaveBeenCalled();
    });

    it('filters user project entries by region, deduplicates names, and updates pagination token', async () => {
      const registry = mockSettingsRegistry('us-central1');
      (requestAPI as jest.Mock).mockResolvedValue({
        entries: [
          {
            entrySource: {
              location: 'us-central1',
              resource: 'projects/p/datasets/ds_one',
              description: 'First'
            }
          },
          {
            entrySource: {
              location: 'us-central1',
              resource: 'projects/p/datasets/ds_one'
            }
          },
          {
            entrySource: {
              location: 'eu',
              resource: 'projects/p/datasets/ds_eu'
            }
          }
        ],
        nextPageToken: 'tok-2'
      });

      const setDatabaseNames = jest.fn();
      const setDataSetResponse = jest.fn();
      const setUpdatedDatasetList = jest.fn();
      const setNextPageToken = jest.fn();
      const setIsLoading = jest.fn();
      const setIsIconLoading = jest.fn();
      const setIsLoadMoreLoading = jest.fn();

      await BigQueryService.getBigQueryDatasetsAPIService(
        'bigframes',
        registry,
        setDatabaseNames,
        setDataSetResponse,
        'my-proj',
        setIsIconLoading,
        setIsLoading,
        setIsLoadMoreLoading,
        [],
        setUpdatedDatasetList,
        'tok-1',
        setNextPageToken
      );

      expect(registry.load).toHaveBeenCalledWith(PLUGIN_ID);
      expect(requestAPI).toHaveBeenCalledWith(
        'bigQueryDataset?project_id=my-proj&location=us-central1&pageToken=tok-1'
      );
      expect(setUpdatedDatasetList).toHaveBeenCalledWith(expect.any(Array));
      expect(setNextPageToken).toHaveBeenCalledWith('my-proj', 'tok-2');
      expect(setDatabaseNames).toHaveBeenCalledWith(['ds_one']);
      expect(setDataSetResponse).toHaveBeenCalledWith([
        {
          entrySource: {
            location: 'us-central1',
            resource: 'projects/p/datasets/ds_one',
            description: 'First'
          }
        },
        {
          entrySource: {
            location: 'us-central1',
            resource: 'projects/p/datasets/ds_one'
          }
        }
      ]);
      expect(setIsLoading).toHaveBeenCalledWith(false);
      expect(setIsIconLoading).toHaveBeenCalledWith(false);
      expect(setIsLoadMoreLoading).toHaveBeenCalledWith(false);
    });

    it('handles public datasets without location filtering and clears token when absent', async () => {
      (requestAPI as jest.Mock).mockResolvedValue({
        datasets: [
          { datasetReference: { datasetId: 'pub_ds', description: 'Public' } }
        ]
      });

      const setDatabaseNames = jest.fn();
      const setDataSetResponse = jest.fn();
      const setNextPageToken = jest.fn();

      await BigQueryService.getBigQueryDatasetsAPIService(
        'bigframes',
        mockSettingsRegistry('US'),
        setDatabaseNames,
        setDataSetResponse,
        DEFAULT_PUBLIC_PROJECT_ID,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        undefined,
        jest.fn(),
        undefined,
        setNextPageToken
      );

      expect(setNextPageToken).toHaveBeenCalledWith(
        DEFAULT_PUBLIC_PROJECT_ID,
        null
      );
      expect(setDatabaseNames).toHaveBeenCalledWith(['pub_ds']);
      expect(setDataSetResponse).toHaveBeenCalledWith([
        { datasetReference: { datasetId: 'pub_ds', description: 'Public' } }
      ]);
    });

    it('resets state on empty entries or empty location match and notifies on error', async () => {
      const setDatabaseNames = jest.fn();
      const setDataSetResponse = jest.fn();
      (requestAPI as jest.Mock).mockResolvedValueOnce({});

      await BigQueryService.getBigQueryDatasetsAPIService(
        'bigframes',
        mockSettingsRegistry('US'),
        setDatabaseNames,
        setDataSetResponse,
        'proj',
        jest.fn(),
        jest.fn(),
        jest.fn()
      );
      expect(setDatabaseNames).toHaveBeenCalledWith([]);
      expect(setDataSetResponse).toHaveBeenCalledWith([]);

      (requestAPI as jest.Mock).mockRejectedValueOnce(new Error('DS err'));
      await BigQueryService.getBigQueryDatasetsAPIService(
        'bigframes',
        mockSettingsRegistry('US'),
        setDatabaseNames,
        setDataSetResponse,
        'proj',
        jest.fn(),
        jest.fn(),
        jest.fn()
      );
      expect(Notification.emit).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch datasets'),
        'error',
        { autoClose: 5000 }
      );
    });
  });

  describe('getBigQueryTableAPIService', () => {
    it('fetches paginated tables, falls back to datasetId when missing, and handles errors', async () => {
      (requestAPI as jest.Mock)
        .mockResolvedValueOnce({
          tables: [{ tableReference: { tableId: 't1', datasetId: 'ds' } }],
          nextPageToken: 'p2'
        })
        .mockResolvedValueOnce({
          tables: [
            {
              tableReference: {
                tableId: 't2',
                datasetId: 'ds',
                description: 'Desc'
              }
            }
          ]
        });

      const setTableResponse = jest.fn();
      const setIsIconLoading = jest.fn();

      await BigQueryService.getBigQueryTableAPIService(
        'bigframes',
        'ds',
        jest.fn(),
        setTableResponse,
        'proj',
        setIsIconLoading
      );
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(setTableResponse).toHaveBeenCalledWith([
        { tableReference: { tableId: 't1', datasetId: 'ds' } },
        {
          tableReference: {
            tableId: 't2',
            datasetId: 'ds',
            description: 'Desc'
          }
        }
      ]);
      expect(setIsIconLoading).toHaveBeenCalledWith(false);

      (requestAPI as jest.Mock).mockResolvedValueOnce({});
      await BigQueryService.getBigQueryTableAPIService(
        'bigframes',
        'ds',
        jest.fn(),
        setTableResponse,
        'proj',
        setIsIconLoading
      );
      expect(setTableResponse).toHaveBeenCalledWith('ds');

      (requestAPI as jest.Mock).mockRejectedValueOnce(new Error('Table err'));
      await BigQueryService.getBigQueryTableAPIService(
        'bigframes',
        'ds',
        jest.fn(),
        setTableResponse,
        'proj',
        setIsIconLoading
      );
      expect(Notification.emit).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch datasets'),
        'error',
        { autoClose: 5000 }
      );
    });
  });

  describe('metadata info, projects list, search, and API check services', () => {
    it('fetches dataset info and dataset details', async () => {
      (requestAPI as jest.Mock).mockResolvedValueOnce({
        isCaseInsensitive: true
      });
      const setDatasetInfo = jest.fn();
      await BigQueryService.getBigQueryDatasetInfoAPIService(
        'ds',
        'proj',
        setDatasetInfo
      );
      expect(setDatasetInfo).toHaveBeenCalledWith({ 'Case insensitive': true });

      (requestAPI as jest.Mock).mockResolvedValueOnce({
        id: 'proj:ds',
        creationTime: '1700000000000',
        defaultTableExpirationMs: 172800000,
        lastModifiedTime: '1700000001000',
        location: 'US',
        description: 'Dataset desc',
        defaultCollation: 'und:ci',
        defaultRoundingMode: 'ROUND_HALF_EVEN',
        maxTimeTravelHours: 168,
        storageBillingModel: 'LOGICAL',
        isCaseInsensitive: true
      });
      const setDetails = jest.fn();
      const setIsLoading = jest.fn();
      await BigQueryService.getBigQueryDatasetDetailsAPIService(
        'ds',
        setDetails,
        'proj',
        setIsLoading
      );
      expect(setDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          'Dataset ID': 'proj:ds',
          'Default table expiration': '2 days',
          'Time travel window': '7 days',
          'Case insensitive': 'true'
        })
      );
      expect(setIsLoading).toHaveBeenCalledWith(false);
    });

    it('fetches table info and emits errors on dataset/table metadata failure', async () => {
      (requestAPI as jest.Mock).mockResolvedValueOnce({
        id: 'proj:ds.tbl',
        creationTime: '1700000000000',
        location: 'US'
      });
      const setTableInfo = jest.fn();
      const setIsLoading = jest.fn();
      await BigQueryService.getBigQueryTableInfoAPIService(
        'tbl',
        'ds',
        setTableInfo,
        { 'Case insensitive': true },
        'proj',
        setIsLoading
      );
      expect(setTableInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          'Table ID': 'proj:ds.tbl',
          'Data location': 'US',
          'Case insensitive': 'true'
        })
      );
      expect(setIsLoading).toHaveBeenCalledWith(false);

      (requestAPI as jest.Mock).mockRejectedValueOnce(
        new Error('Tbl info err')
      );
      await BigQueryService.getBigQueryTableInfoAPIService(
        'tbl',
        'ds',
        setTableInfo,
        {},
        'proj',
        setIsLoading
      );
      expect(Notification.emit).toHaveBeenCalledWith(
        expect.stringContaining('Error in calling BigQurey Table API'),
        'error',
        { autoClose: 5000 }
      );
    });

    it('fetches projects list when API is enabled and handles disabled/error states', async () => {
      (authApi as jest.Mock).mockResolvedValue({ project_id: 'active-proj' });
      (requestAPI as jest.Mock)
        .mockResolvedValueOnce({ is_enabled: true })
        .mockResolvedValueOnce(['proj-1', 'proj-2']);

      const setProjectNameInfo = jest.fn();
      const setIsLoading = jest.fn();
      const setApiError = jest.fn();
      const setProjectName = jest.fn();

      await BigQueryService.getBigQueryProjectsListAPIService(
        setProjectNameInfo,
        setIsLoading,
        setApiError,
        setProjectName
      );
      expect(requestAPI).toHaveBeenCalledWith(
        `checkApiEnabled?service_name=${BIGQUERY_SERVICE_NAME}`,
        { method: 'POST' }
      );
      expect(setProjectName).toHaveBeenCalledWith('active-proj');
      expect(setProjectNameInfo).toHaveBeenCalledWith(['proj-1', 'proj-2']);
      expect(setApiError).toHaveBeenCalledWith(false);

      (requestAPI as jest.Mock).mockResolvedValueOnce({ is_enabled: false });
      await BigQueryService.getBigQueryProjectsListAPIService(
        setProjectNameInfo,
        setIsLoading,
        setApiError,
        setProjectName
      );
      expect(setProjectNameInfo).toHaveBeenCalledWith([]);
      expect(setApiError).toHaveBeenCalledWith(true);
      expect(setIsLoading).toHaveBeenCalledWith(false);

      (requestAPI as jest.Mock).mockRejectedValueOnce(
        new Error('Check failed')
      );
      const result = await BigQueryService.checkBigQueryDatasetsAPIService();
      expect(result).toBeInstanceOf(Error);
    });

    it('performs BigQuery search and handles rejection', async () => {
      (requestAPI as jest.Mock).mockResolvedValueOnce({ results: [{ id: 1 }] });
      const setSearchLoading = jest.fn();
      const setSearchResponse = jest.fn();

      await BigQueryService.getBigQuerySearchAPIService(
        'orders',
        setSearchLoading,
        setSearchResponse
      );
      expect(setSearchLoading).toHaveBeenCalledWith(true);
      expect(requestAPI).toHaveBeenCalledWith(
        'bigQuerySearch?search_string=orders&type=(table|dataset)&system=bigquery',
        { method: 'POST' }
      );
      expect(setSearchResponse).toHaveBeenCalledWith({ results: [{ id: 1 }] });

      (requestAPI as jest.Mock).mockRejectedValueOnce(new Error('Search err'));
      await BigQueryService.getBigQuerySearchAPIService(
        'orders',
        setSearchLoading,
        setSearchResponse
      );
      expect(Notification.emit).toHaveBeenCalledWith(
        expect.stringContaining('Error in calling BigQurey Project List API'),
        'error',
        { autoClose: 5000 }
      );
    });
  });
});
