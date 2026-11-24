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

jest.mock('../utils/utils', () => ({
  loggedFetch: jest.fn()
}));

import React from 'react';
import { setImmediate } from 'timers';
import NotebookTemplateService from './notebookTemplatesService';
import { loggedFetch } from '../utils/utils';
import { NOTEBOOK_TEMPLATES_LIST_URL } from '../utils/const';

const flushPromises = () => new Promise<void>(resolve => setImmediate(resolve));

const EXPECTED_REQUEST_OPTIONS = {
  method: 'GET',
  headers: {
    Accept: 'application/vnd.github.raw'
  }
};

const createMockResponse = ({
  ok = true,
  status = 200,
  data = []
}: {
  ok?: boolean;
  status?: number;
  data?: unknown;
} = {}) => ({
  ok,
  status,
  json: jest.fn().mockResolvedValue(data)
});

describe('NotebookTemplateService', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('listNotebookTemplateAPIService', () => {
    const sampleApiResponse = [
      {
        category: 'BigQuery',
        title: 'PySpark BigQuery Template',
        description: 'Read and write BigQuery tables using PySpark'
      },
      {
        category: 'GCS',
        title: 'GCS Data Processing',
        description: 'Process files in Cloud Storage'
      }
    ];

    let mockSetTemplateList: jest.Mock;
    let mockRenderActions: jest.Mock;
    let mockSetIsLoading: jest.Mock;
    let mockActionElement: React.JSX.Element;

    const invokeListService = async () => {
      await NotebookTemplateService.listNotebookTemplateAPIService(
        mockSetTemplateList,
        mockRenderActions,
        mockSetIsLoading
      );
      await flushPromises();
    };

    beforeEach(() => {
      mockActionElement = React.createElement('div', null, 'use-template');
      mockSetTemplateList = jest.fn();
      mockRenderActions = jest.fn().mockReturnValue(mockActionElement);
      mockSetIsLoading = jest.fn();
    });

    it('requests templates from NOTEBOOK_TEMPLATES_LIST_URL with the GitHub raw Accept header', async () => {
      (loggedFetch as jest.Mock).mockResolvedValue(
        createMockResponse({ data: sampleApiResponse })
      );

      await invokeListService();

      expect(loggedFetch).toHaveBeenCalledTimes(1);
      expect(loggedFetch).toHaveBeenCalledWith(
        NOTEBOOK_TEMPLATES_LIST_URL,
        EXPECTED_REQUEST_OPTIONS
      );
    });

    it('transforms API template items and passes them to setTemplateList', async () => {
      (loggedFetch as jest.Mock).mockResolvedValue(
        createMockResponse({ data: sampleApiResponse })
      );

      await invokeListService();

      expect(mockRenderActions).toHaveBeenCalledTimes(2);
      expect(mockRenderActions).toHaveBeenNthCalledWith(
        1,
        sampleApiResponse[0]
      );
      expect(mockRenderActions).toHaveBeenNthCalledWith(
        2,
        sampleApiResponse[1]
      );
      expect(mockSetTemplateList).toHaveBeenCalledWith([
        {
          category: 'BigQuery',
          name: 'PySpark BigQuery Template',
          description: 'Read and write BigQuery tables using PySpark',
          actions: mockActionElement
        },
        {
          category: 'GCS',
          name: 'GCS Data Processing',
          description: 'Process files in Cloud Storage',
          actions: mockActionElement
        }
      ]);
    });

    it('clears loading state after successfully fetching templates', async () => {
      (loggedFetch as jest.Mock).mockResolvedValue(
        createMockResponse({ data: sampleApiResponse })
      );

      await invokeListService();

      expect(mockSetIsLoading).toHaveBeenCalledTimes(1);
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
    });

    it('updates template list with an empty array when the API returns no templates', async () => {
      (loggedFetch as jest.Mock).mockResolvedValue(
        createMockResponse({ data: [] })
      );

      await invokeListService();

      expect(mockRenderActions).not.toHaveBeenCalled();
      expect(mockSetTemplateList).toHaveBeenCalledWith([]);
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
    });

    it('logs an error with HTTP status when the response is not ok', async () => {
      (loggedFetch as jest.Mock).mockResolvedValue(
        createMockResponse({ ok: false, status: 404 })
      );

      await invokeListService();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching data:',
        expect.objectContaining({
          message: 'Failed to fetch notebook content. Status: 404'
        })
      );
    });

    it('clears loading state without updating template list when the response is not ok', async () => {
      (loggedFetch as jest.Mock).mockResolvedValue(
        createMockResponse({ ok: false, status: 404 })
      );

      await invokeListService();

      expect(mockSetTemplateList).not.toHaveBeenCalled();
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
    });

    it('logs the error when loggedFetch rejects', async () => {
      const networkError = new Error('Network failure');
      (loggedFetch as jest.Mock).mockRejectedValue(networkError);

      await invokeListService();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching data:',
        networkError
      );
    });

    it('clears loading state without updating template list when loggedFetch rejects', async () => {
      (loggedFetch as jest.Mock).mockRejectedValue(
        new Error('Network failure')
      );

      await invokeListService();

      expect(mockSetTemplateList).not.toHaveBeenCalled();
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
    });
  });

  describe('handleClickService', () => {
    const mockTemplate = {
      url: 'https://raw.githubusercontent.com/GoogleCloudPlatform/dataproc/main/template.ipynb'
    };
    const mockNotebookJson = { cells: [], metadata: {}, nbformat: 4 };

    let mockDownloadNotebook: jest.Mock;

    const invokeClickService = async () => {
      await NotebookTemplateService.handleClickService(
        mockTemplate,
        mockDownloadNotebook
      );
      await flushPromises();
    };

    beforeEach(() => {
      mockDownloadNotebook = jest.fn();
    });

    it('requests notebook content from the template URL with the GitHub raw Accept header', async () => {
      (loggedFetch as jest.Mock).mockResolvedValue(
        createMockResponse({ data: mockNotebookJson })
      );

      await invokeClickService();

      expect(loggedFetch).toHaveBeenCalledTimes(1);
      expect(loggedFetch).toHaveBeenCalledWith(
        mockTemplate.url,
        EXPECTED_REQUEST_OPTIONS
      );
    });

    it('invokes downloadNotebook with parsed JSON content and URL on success', async () => {
      (loggedFetch as jest.Mock).mockResolvedValue(
        createMockResponse({ data: mockNotebookJson })
      );

      await invokeClickService();

      expect(mockDownloadNotebook).toHaveBeenCalledTimes(1);
      expect(mockDownloadNotebook).toHaveBeenCalledWith(
        mockNotebookJson,
        mockTemplate.url
      );
    });

    it('logs an error with HTTP status when the response is not ok', async () => {
      (loggedFetch as jest.Mock).mockResolvedValue(
        createMockResponse({ ok: false, status: 500 })
      );

      await invokeClickService();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching notebook content',
        expect.objectContaining({
          message: 'Failed to fetch notebook content. Status: 500'
        })
      );
    });

    it('does not invoke downloadNotebook when the response is not ok', async () => {
      (loggedFetch as jest.Mock).mockResolvedValue(
        createMockResponse({ ok: false, status: 500 })
      );

      await invokeClickService();

      expect(mockDownloadNotebook).not.toHaveBeenCalled();
    });

    it('logs the error when loggedFetch rejects', async () => {
      const fetchError = new Error('Failed to connect');
      (loggedFetch as jest.Mock).mockRejectedValue(fetchError);

      await invokeClickService();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching notebook content',
        fetchError
      );
    });

    it('does not invoke downloadNotebook when loggedFetch rejects', async () => {
      (loggedFetch as jest.Mock).mockRejectedValue(
        new Error('Failed to connect')
      );

      await invokeClickService();

      expect(mockDownloadNotebook).not.toHaveBeenCalled();
    });

    it('logs an error and skips downloadNotebook when JSON parsing rejects', async () => {
      const parseError = new SyntaxError('Unexpected token');
      (loggedFetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockRejectedValue(parseError)
      });

      await invokeClickService();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching notebook content',
        parseError
      );
      expect(mockDownloadNotebook).not.toHaveBeenCalled();
    });
  });
});
