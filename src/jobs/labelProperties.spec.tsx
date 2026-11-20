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

import React, { act, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import LabelProperties from './labelProperties';
import {
  DATAPROC_LIGHTNING_ENGINE_PROPERTY,
  DATAPROC_TIER_PROPERTY,
  DEFAULT_LABEL_DETAIL
} from '../utils/const';

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

function Harness({
  initialLabels = [] as string[],
  buttonText = 'ADD LABEL',
  selectedJobClone = false,
  labelEditMode = false,
  fromPage = '',
  selectedRuntimeClone = undefined as any,
  createBatch = false
}) {
  const [labelDetail, setLabelDetail] = useState<string[]>(initialLabels);
  const [labelDetailUpdated, setLabelDetailUpdated] =
    useState<string[]>(initialLabels);
  const [keyValidation, setKeyValidation] = useState(-1);
  const [valueValidation, setValueValidation] = useState(-1);
  const [duplicateKeyError, setDuplicateKeyError] = useState(-1);

  return (
    <LabelProperties
      labelDetail={labelDetail}
      setLabelDetail={setLabelDetail}
      labelDetailUpdated={labelDetailUpdated}
      setLabelDetailUpdated={setLabelDetailUpdated}
      selectedJobClone={selectedJobClone}
      buttonText={buttonText}
      keyValidation={keyValidation}
      setKeyValidation={setKeyValidation}
      valueValidation={valueValidation}
      setValueValidation={setValueValidation}
      duplicateKeyError={duplicateKeyError}
      setDuplicateKeyError={setDuplicateKeyError}
      labelEditMode={labelEditMode}
      selectedRuntimeClone={selectedRuntimeClone}
      createBatch={createBatch}
      fromPage={fromPage}
    />
  );
}

describe('LabelProperties Component', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
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

  it('initializes with default label when in ADD LABEL mode without clone/edit/scheduler', async () => {
    await act(async () => {
      root.render(<Harness />);
    });

    const inputs = Array.from(container.querySelectorAll('input'));
    expect(inputs).toHaveLength(2);
    expect(inputs[0].value).toBe(DEFAULT_LABEL_DETAIL.split(':')[0]);
    expect(inputs[1].value).toBe(DEFAULT_LABEL_DETAIL.split(':')[1]);
    expect(inputs[0].disabled).toBe(true);
    expect(inputs[1].disabled).toBe(true);
    expect(container.querySelector('.labels-delete-icon-hide')).toBeTruthy();
  });

  it('does not auto-populate default label when labelEditMode or fromPage=scheduler or ADD PROPERTY', async () => {
    await act(async () => {
      root.render(<Harness buttonText="ADD PROPERTY" />);
    });
    expect(container.querySelectorAll('input')).toHaveLength(0);

    await act(async () => {
      root.render(<Harness fromPage="scheduler" />);
    });
    expect(container.querySelectorAll('input')).toHaveLength(0);
  });

  it('adds a new label row, edits key and value, commits on blur, and deletes it', async () => {
    await act(async () => {
      root.render(<Harness />);
    });

    const addBtn = container.querySelector('button') as HTMLButtonElement;
    expect(addBtn.className).toContain('job-add-label-button');

    await act(async () => {
      addBtn.click();
    });

    const inputs = Array.from(container.querySelectorAll('input'));
    expect(inputs).toHaveLength(4);
    expect(inputs[2].disabled).toBe(false);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'key is required'
    );

    await typeInto(inputs[2], 'env');
    await blurInput(inputs[2]);
    await typeInto(inputs[3], 'prod');
    await blurInput(inputs[3]);

    const updatedInputs = Array.from(container.querySelectorAll('input'));
    expect(updatedInputs[2].value).toBe('env');
    expect(updatedInputs[3].value).toBe('prod');

    const deleteButtons = container.querySelectorAll('.labels-delete-icon');
    expect(deleteButtons).toHaveLength(1);
    await act(async () => {
      (deleteButtons[0] as HTMLElement).click();
    });
    expect(container.querySelectorAll('input')).toHaveLength(2);
  });

  it('validates invalid key format, invalid value format, and duplicate keys in ADD LABEL mode', async () => {
    await act(async () => {
      root.render(
        <Harness labelEditMode={true} initialLabels={['env:dev', ':']} />
      );
    });

    const inputs = Array.from(container.querySelectorAll('input'));
    await typeInto(inputs[2], 'InvalidKey');
    expect(container.textContent).toContain(
      'Keys must start with a lowercase character'
    );

    await typeInto(inputs[2], 'env');
    expect(container.textContent).toContain('The key is already present');

    await typeInto(inputs[3], 'BAD VALUE!');
    expect(container.textContent).toContain(
      'Only hyphens (-), underscores (_), lowercase characters, and numbers are allowed.'
    );
  });

  it('disables editing and deleting for tier and lightning engine properties', async () => {
    await act(async () => {
      root.render(
        <Harness
          buttonText="ADD PROPERTY"
          initialLabels={[
            `${DATAPROC_TIER_PROPERTY}:premium`,
            `${DATAPROC_LIGHTNING_ENGINE_PROPERTY}:lightningEngine`,
            'spark.executor.memory:4g'
          ]}
        />
      );
    });

    const inputs = Array.from(container.querySelectorAll('input'));
    expect(inputs[0].disabled).toBe(true);
    expect(inputs[1].disabled).toBe(true);
    expect(inputs[2].disabled).toBe(true);
    expect(inputs[3].disabled).toBe(true);
    expect(inputs[4].disabled).toBe(false);
    expect(inputs[5].disabled).toBe(false);
    expect(container.querySelectorAll('.labels-delete-icon-hide')).toHaveLength(
      2
    );
    expect(container.querySelectorAll('.labels-delete-icon')).toHaveLength(1);

    await typeInto(inputs[5], '8g');
    await blurInput(inputs[5]);
    expect(Array.from(container.querySelectorAll('input'))[5].value).toBe('8g');
  });

  it('allows adding property when buttonText is ADD PROPERTY and prevents adding when disabled', async () => {
    await act(async () => {
      root.render(
        <Harness
          buttonText="ADD PROPERTY"
          initialLabels={['spark.app.name:test']}
        />
      );
    });

    const addBtn = container.querySelector('button') as HTMLButtonElement;
    expect(addBtn.className).toBe('job-add-property-button');

    await act(async () => {
      addBtn.click();
    });
    expect(container.querySelectorAll('input')).toHaveLength(4);

    // Last property now has an empty key, so button becomes disabled
    const disabledBtn = container.querySelector('button') as HTMLButtonElement;
    expect(disabledBtn.className).toBe('job-add-property-button-disabled');

    await act(async () => {
      disabledBtn.click();
    });
    expect(container.querySelectorAll('input')).toHaveLength(4);
  });
});
