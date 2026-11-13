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
  authApi: jest.fn()
}));

jest.mock('mui-chips-input', () => {
  const React = require('react');
  return {
    MuiChipsInput: ({ label, value = [], onChange }: any) => {
      const id = `chips-${String(label).replace(/\s+/g, '-').toLowerCase()}`;
      return React.createElement(
        'div',
        null,
        React.createElement('label', { htmlFor: id }, label),
        React.createElement('input', {
          id,
          onKeyDown: (e: any) => {
            if (e.key === 'Enter' && e.currentTarget.value !== '') {
              onChange([...value, e.currentTarget.value]);
              e.currentTarget.value = '';
            }
          }
        }),
        ...(value || []).map((chip: string, i: number) =>
          React.createElement('span', { key: `${chip}-${i}` }, chip)
        )
      );
    }
  };
});

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import SubmitJob from './submitJob';
import { JobService } from './jobServices';
import { authApi } from '../utils/utils';
import { RESTART_JOB_URL, STATUS_RUNNING } from '../utils/const';

const mockClusters = [
  { clusterName: 'cluster-run-1', status: STATUS_RUNNING },
  { clusterName: 'cluster-stop-1', status: 'STOPPED' },
  { clusterName: 'cluster-run-2', status: STATUS_RUNNING }
];

const mockCredentials = {
  project_id: 'test-project',
  region_id: 'us-central1',
  access_token: 'tok'
};

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

const blurInput = async (element: HTMLInputElement) => {
  await act(async () => {
    element.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  });
};

const findInputByLabel = (container: HTMLElement, labelText: string) => {
  const label = Array.from(container.querySelectorAll('label')).find(l =>
    l.textContent?.includes(labelText)
  );
  const forId = label?.getAttribute('for');
  if (forId) {
    return document.getElementById(forId) as HTMLInputElement;
  }
  return label?.parentElement?.querySelector('input') as HTMLInputElement;
};

const selectAutocompleteOption = async (
  container: HTMLElement,
  labelText: string,
  optionText: string
) => {
  const input = findInputByLabel(container, labelText);
  await act(async () => {
    input.focus();
    input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  });
  const option = Array.from(
    document.body.querySelectorAll('[role="option"]')
  ).find(el => el.textContent?.trim() === optionText) as HTMLElement;
  expect(option).toBeTruthy();
  await act(async () => {
    option.click();
  });
};

const addChip = async (
  container: HTMLElement,
  labelText: string,
  value: string
) => {
  const input = findInputByLabel(container, labelText);
  await typeInto(input, value);
  await act(async () => {
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );
  });
};

describe('SubmitJob Component', () => {
  let container: HTMLDivElement;
  let root: Root;
  let setSubmitJobView: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    setSubmitJobView = jest.fn();

    (authApi as jest.Mock).mockResolvedValue(mockCredentials);
    jest.spyOn(JobService, 'submitJobService').mockResolvedValue(undefined);

    Object.defineProperty(window, 'crypto', {
      configurable: true,
      value: {
        getRandomValues: (arr: Uint32Array) => {
          arr[0] = 0x0000002a;
          return arr;
        }
      }
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  const renderSubmitJob = async (
    selectedJobClone: any = '',
    clusterResponse: any[] = mockClusters
  ) => {
    await act(async () => {
      root.render(
        <SubmitJob
          setSubmitJobView={setSubmitJobView}
          selectedJobClone={selectedJobClone}
          clusterResponse={clusterResponse}
        />
      );
    });
  };

  it('shows "No clusters running" when no clusters are running and generates a random Job ID', async () => {
    await renderSubmitJob('', [{ clusterName: 'c-stop', status: 'STOPPED' }]);

    const noClusterInput = container.querySelector(
      'input[value="No clusters running"]'
    ) as HTMLInputElement;
    expect(noClusterInput).toBeTruthy();
    expect(noClusterInput.value).toBe('No clusters running');

    const jobIdInput = findInputByLabel(container, 'Job ID');
    expect(jobIdInput.value).toBe('job-0000002a');
  });

  it('validates Job ID, Main class or jar, back arrow, cancel button, and Learn more link', async () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    await renderSubmitJob();

    const jobIdInput = findInputByLabel(container, 'Job ID');
    await typeInto(jobIdInput, '');
    expect(container.textContent).toContain('ID is required');

    await typeInto(jobIdInput, 'invalid@id');
    expect(container.textContent).toContain(
      'ID must contain only letters, numbers, hyphens, and underscores'
    );

    const mainClassInput = findInputByLabel(container, 'Main class or jar');
    await blurInput(mainClassInput);
    expect(container.textContent).toContain('Main class or jar is required');

    const learnMore = Array.from(container.querySelectorAll('div')).find(
      el => el.textContent === 'Learn more'
    ) as HTMLElement;
    await act(async () => {
      learnMore.click();
    });
    expect(openSpy).toHaveBeenCalledWith(RESTART_JOB_URL, '_blank');
    openSpy.mockRestore();

    const cancelBtn = Array.from(
      container.querySelectorAll('[role="button"]')
    ).find(el => el.textContent === 'CANCEL') as HTMLElement;
    await act(async () => {
      cancelBtn.click();
    });
    expect(setSubmitJobView).toHaveBeenCalledWith(false);

    setSubmitJobView.mockClear();
    const backArrow = container.querySelector(
      '.back-arrow-icon'
    ) as HTMLElement;
    await act(async () => {
      backArrow.click();
    });
    expect(setSubmitJobView).toHaveBeenCalledWith(false);
  });

  it('validates URI schemes and duplicate paths for PySpark and Arguments', async () => {
    await renderSubmitJob();
    await selectAutocompleteOption(container, 'Job type', 'PySpark');

    const mainPyInput = findInputByLabel(container, 'Main Python file');
    await typeInto(mainPyInput, 'invalid/path.py');
    expect(container.textContent).toContain(
      "File must include a valid scheme prefix: 'file://', 'gs://', or 'hdfs://'"
    );
    await typeInto(mainPyInput, 'gs://bucket/main.py');
    expect(container.textContent).not.toContain(
      "File must include a valid scheme prefix: 'file://', 'gs://', or 'hdfs://'"
    );

    await addChip(container, 'Additional python files', 'bad.py');
    expect(container.textContent).toContain(
      "All files must include a valid scheme prefix: 'file://', 'gs://', or 'hdfs://'"
    );

    await addChip(container, 'Jar files', 'gs://bucket/a.jar');
    await addChip(container, 'Jar files', 'gs://bucket/a.jar');
    expect(container.textContent).toContain('Duplicate paths are not allowed');

    await addChip(container, 'Arguments', '--arg1');
    await addChip(container, 'Arguments', '--arg1');
    expect(container.textContent).toContain('Duplicate paths are not allowed');
  });

  it('submits a Spark job with mainClass and a Spark jar job', async () => {
    await renderSubmitJob();

    // Disabled initially -> clicking SUBMIT should not invoke submitJobService
    const getSubmitBtn = () =>
      Array.from(container.querySelectorAll('[role="button"]')).find(
        el => el.textContent === 'SUBMIT'
      ) as HTMLElement;

    await act(async () => {
      getSubmitBtn().click();
    });
    expect(JobService.submitJobService).not.toHaveBeenCalled();

    await selectAutocompleteOption(container, 'Cluster', 'cluster-run-1');
    const mainClassInput = findInputByLabel(container, 'Main class or jar');
    await typeInto(mainClassInput, 'org.example.Main');

    await act(async () => {
      getSubmitBtn().click();
    });

    expect(JobService.submitJobService).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'test-project',
        region: 'us-central1',
        job: expect.objectContaining({
          placement: { clusterName: 'cluster-run-1' },
          reference: { jobId: 'job-0000002a', projectId: '' },
          sparkJob: expect.objectContaining({
            mainClass: 'org.example.Main'
          })
        })
      }),
      'job-0000002a',
      mockCredentials
    );
    expect(setSubmitJobView).toHaveBeenCalledWith(false);
  });

  it('submits a SparkR job and hides Jar/Archive inputs', async () => {
    await renderSubmitJob();
    await selectAutocompleteOption(container, 'Cluster', 'cluster-run-2');
    await selectAutocompleteOption(container, 'Job type', 'SparkR');

    expect(findInputByLabel(container, 'Jar files')).toBeUndefined();
    expect(findInputByLabel(container, 'Archive files')).toBeUndefined();

    const mainRInput = findInputByLabel(container, 'Main R file');
    await typeInto(mainRInput, 'bad_r_file.R');
    expect(container.textContent).toContain(
      "File must include a valid scheme prefix: 'file://', 'gs://', or 'hdfs://'"
    );
    await typeInto(mainRInput, 'gs://bucket/script.R');

    const maxRestartInput = findInputByLabel(
      container,
      'Max restarts per hour'
    );
    await typeInto(maxRestartInput, '3');

    const submitBtn = Array.from(
      container.querySelectorAll('[role="button"]')
    ).find(el => el.textContent === 'SUBMIT') as HTMLElement;
    await act(async () => {
      submitBtn.click();
    });

    expect(JobService.submitJobService).toHaveBeenCalledWith(
      expect.objectContaining({
        job: expect.objectContaining({
          scheduling: { maxFailuresPerHour: '3' },
          sparkRJob: expect.objectContaining({
            mainRFileUri: 'gs://bucket/script.R'
          })
        })
      }),
      'job-0000002a',
      mockCredentials
    );
  });

  it('submits SparkSql jobs for both Query file and Query text modes', async () => {
    await renderSubmitJob();
    await selectAutocompleteOption(container, 'Cluster', 'cluster-run-1');
    await selectAutocompleteOption(container, 'Job type', 'SparkSql');

    await selectAutocompleteOption(
      container,
      'Query source type',
      'Query file'
    );
    expect(container.textContent).toContain('Query parameters');
    const queryFileInput = findInputByLabel(container, 'Query file');
    await typeInto(queryFileInput, 'gs://bucket/query.sql');

    const submitBtn = Array.from(
      container.querySelectorAll('[role="button"]')
    ).find(el => el.textContent === 'SUBMIT') as HTMLElement;
    await act(async () => {
      submitBtn.click();
    });
    expect(JobService.submitJobService).toHaveBeenCalledWith(
      expect.objectContaining({
        job: expect.objectContaining({
          sparkSqlJob: expect.objectContaining({
            queryFileUri: 'gs://bucket/query.sql'
          })
        })
      }),
      'job-0000002a',
      mockCredentials
    );

    // Query text mode
    jest.clearAllMocks();
    await renderSubmitJob();
    await selectAutocompleteOption(container, 'Cluster', 'cluster-run-1');
    await selectAutocompleteOption(container, 'Job type', 'SparkSql');
    await selectAutocompleteOption(
      container,
      'Query source type',
      'Query text'
    );

    const queryTextInput = findInputByLabel(container, 'Query text');
    await typeInto(queryTextInput, 'SELECT * FROM table');

    const submitBtn2 = Array.from(
      container.querySelectorAll('[role="button"]')
    ).find(el => el.textContent === 'SUBMIT') as HTMLElement;
    await act(async () => {
      submitBtn2.click();
    });
    expect(JobService.submitJobService).toHaveBeenCalledWith(
      expect.objectContaining({
        job: expect.objectContaining({
          sparkSqlJob: expect.objectContaining({
            queryList: { queries: ['SELECT * FROM table'] }
          })
        })
      }),
      'job-0000002a',
      mockCredentials
    );
  });

  it('pre-fills and submits cloned PySpark and SparkSql jobs', async () => {
    const clonedPySpark = {
      placement: { clusterName: 'cluster-run-1' },
      labels: { env: 'staging' },
      scheduling: { maxFailuresPerHour: '2' },
      pysparkJob: {
        mainPythonFileUri: 'gs://bucket/cloned.py',
        pythonFileUris: ['gs://bucket/dep.py'],
        jarFileUris: ['gs://bucket/lib.jar'],
        fileUris: ['gs://bucket/data.csv'],
        archiveUris: ['gs://bucket/env.zip'],
        args: ['--flag'],
        properties: { 'spark.driver.memory': '2g' }
      }
    };

    await renderSubmitJob(clonedPySpark);

    expect(findInputByLabel(container, 'Cluster').value).toBe('cluster-run-1');
    expect(findInputByLabel(container, 'Job type').value).toBe('PySpark');
    expect(findInputByLabel(container, 'Main Python file').value).toBe(
      'gs://bucket/cloned.py'
    );
    expect(findInputByLabel(container, 'Max restarts per hour').value).toBe(
      '2'
    );

    const submitBtn = Array.from(
      container.querySelectorAll('[role="button"]')
    ).find(el => el.textContent === 'SUBMIT') as HTMLElement;
    await act(async () => {
      submitBtn.click();
    });

    expect(JobService.submitJobService).toHaveBeenCalledWith(
      expect.objectContaining({
        job: expect.objectContaining({
          labels: { env: 'staging' },
          pysparkJob: expect.objectContaining({
            mainPythonFileUri: 'gs://bucket/cloned.py',
            properties: { 'spark.driver.memory': '2g' },
            args: ['--flag']
          })
        })
      }),
      'job-0000002a',
      mockCredentials
    );
  });

  it('submits a Spark job with mainJarFileUri and a PySpark job with optional URIs', async () => {
    await renderSubmitJob();
    await selectAutocompleteOption(container, 'Cluster', 'cluster-run-1');
    await typeInto(
      findInputByLabel(container, 'Main class or jar'),
      'gs://bucket/app.jar'
    );

    const getSubmitBtn = () =>
      Array.from(container.querySelectorAll('[role="button"]')).find(
        el => el.textContent === 'SUBMIT'
      ) as HTMLElement;

    await act(async () => {
      getSubmitBtn().click();
    });

    expect(JobService.submitJobService).toHaveBeenCalledWith(
      expect.objectContaining({
        job: expect.objectContaining({
          sparkJob: expect.objectContaining({
            mainJarFileUri: 'gs://bucket/app.jar'
          })
        })
      }),
      'job-0000002a',
      mockCredentials
    );

    jest.clearAllMocks();
    await renderSubmitJob();
    await selectAutocompleteOption(container, 'Cluster', 'cluster-run-2');
    await selectAutocompleteOption(container, 'Job type', 'PySpark');
    await typeInto(
      findInputByLabel(container, 'Main Python file'),
      'gs://bucket/main.py'
    );
    await addChip(container, 'Additional python files', 'gs://bucket/lib.py');
    await addChip(container, 'Jar files', 'gs://bucket/dep.jar');
    await addChip(container, 'Files', 'gs://bucket/cfg.txt');
    await addChip(container, 'Archive files', 'gs://bucket/env.tgz');
    await addChip(container, 'Arguments', '--run');

    await act(async () => {
      getSubmitBtn().click();
    });

    expect(JobService.submitJobService).toHaveBeenCalledWith(
      expect.objectContaining({
        job: expect.objectContaining({
          pysparkJob: expect.objectContaining({
            mainPythonFileUri: 'gs://bucket/main.py',
            jarFileUris: ['gs://bucket/dep.jar'],
            fileUris: ['gs://bucket/cfg.txt'],
            archiveUris: ['gs://bucket/env.tgz'],
            args: ['--run']
          })
        })
      }),
      'job-0000002a',
      mockCredentials
    );
  });

  it('pre-fills cloned SparkSql queryFileUri job', async () => {
    await renderSubmitJob({
      placement: { clusterName: 'cluster-run-1' },
      sparkSqlJob: { queryFileUri: 'gs://bucket/q.sql' }
    });
    expect(findInputByLabel(container, 'Job type').value).toBe('SparkSql');
    expect(findInputByLabel(container, 'Query source type').value).toBe(
      'Query file'
    );
    expect(findInputByLabel(container, 'Query file').value).toBe(
      'gs://bucket/q.sql'
    );
  });

  it('pre-fills cloned SparkSql queryList job', async () => {
    await renderSubmitJob({
      placement: { clusterName: 'cluster-run-2' },
      sparkSqlJob: { queryList: { queries: ['SELECT 42'] } }
    });
    expect(findInputByLabel(container, 'Query source type').value).toBe(
      'Query text'
    );
    expect(findInputByLabel(container, 'Query text').value).toBe('SELECT 42');
  });
});
