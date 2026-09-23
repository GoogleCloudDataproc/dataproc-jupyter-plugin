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

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { SectionDetail, ISectionProperty } from './SectionDetail';

describe('SectionDetail Component', () => {
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

  it('renders title and array of ISectionProperty items', () => {
    const properties: ISectionProperty[] = [
      { label: 'Runtime Version', value: '2.3 LTS' },
      { label: 'Tier', value: 'Premium', subValue: 'Accelerated compute' }
    ];

    act(() => {
      root.render(
        <SectionDetail title="Runtime configuration" properties={properties} />
      );
    });

    const titleEl = container.querySelector('.section-detail-title');
    expect(titleEl?.textContent).toBe('Runtime configuration');

    const rows = container.querySelectorAll('.section-detail-row');
    expect(rows.length).toBe(2);

    const labels = container.querySelectorAll('.section-detail-label');
    expect(labels[0].textContent).toBe('Runtime Version');
    expect(labels[1].textContent).toBe('Tier');

    const values = container.querySelectorAll('.section-detail-value');
    expect(values[0].textContent).toBe('2.3 LTS');
    expect(values[1].textContent).toContain('Premium');

    const subValueEl = container.querySelector('.section-detail-subvalue');
    expect(subValueEl?.textContent).toBe('Accelerated compute');
  });

  it('normalizes properties passed as a Record<string, React.ReactNode>', () => {
    const propertiesRecord = {
      Network: 'default',
      Encryption: 'Google-managed key'
    };

    act(() => {
      root.render(
        <SectionDetail
          title="Network and security"
          properties={propertiesRecord}
        />
      );
    });

    const rows = container.querySelectorAll('.section-detail-row');
    expect(rows.length).toBe(2);

    const labels = container.querySelectorAll('.section-detail-label');
    expect(labels[0].textContent).toBe('Network');
    expect(labels[1].textContent).toBe('Encryption');

    const values = container.querySelectorAll('.section-detail-value');
    expect(values[0].textContent).toBe('default');
    expect(values[1].textContent).toBe('Google-managed key');
  });

  it('renders emptyPlaceholder when property values are empty, null, or undefined', () => {
    const properties: ISectionProperty[] = [
      { label: 'Empty String', value: '' },
      { label: 'Undefined Value', value: undefined },
      { label: 'Null Value', value: null },
      { label: 'Zero Number', value: 0 }
    ];

    act(() => {
      root.render(
        <SectionDetail
          title="Placeholders"
          properties={properties}
          emptyPlaceholder="N/A"
        />
      );
    });

    const values = container.querySelectorAll('.section-detail-value');
    expect(values[0].textContent).toBe('N/A');
    expect(values[1].textContent).toBe('N/A');
    expect(values[2].textContent).toBe('N/A');
    expect(values[3].textContent).toBe('0');
  });

  it('uses default "-" placeholder when emptyPlaceholder is not provided', () => {
    act(() => {
      root.render(
        <SectionDetail
          title="Default Placeholder"
          properties={[{ label: 'Staging Bucket', value: '' }]}
        />
      );
    });

    const valueEl = container.querySelector('.section-detail-value');
    expect(valueEl?.textContent).toBe('-');
  });

  it('triggers onEdit on click and keyboard Enter/Space when edit is enabled', () => {
    const onEditMock = jest.fn();

    act(() => {
      root.render(
        <SectionDetail
          title="Autoscaling"
          onEdit={onEditMock}
          editLabel="EDIT"
          editTooltip="Edit Autoscaling settings"
        />
      );
    });

    const editBtn = container.querySelector(
      '.section-detail-edit-button'
    ) as HTMLDivElement;
    expect(editBtn).not.toBeNull();
    expect(editBtn.getAttribute('aria-label')).toBe(
      'Edit Autoscaling settings'
    );
    expect(editBtn.getAttribute('tabindex')).toBe('0');
    expect(container.querySelector('.edit-label-text')?.textContent).toBe(
      'EDIT'
    );

    act(() => {
      editBtn.click();
    });
    expect(onEditMock).toHaveBeenCalledTimes(1);

    act(() => {
      editBtn.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
    });
    expect(onEditMock).toHaveBeenCalledTimes(2);

    act(() => {
      editBtn.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true })
      );
    });
    expect(onEditMock).toHaveBeenCalledTimes(3);
  });

  it('does not trigger onEdit when isEditDisabled is true', () => {
    const onEditMock = jest.fn();

    act(() => {
      root.render(
        <SectionDetail
          title="Metastore"
          onEdit={onEditMock}
          isEditDisabled={true}
          editLabel="EDIT"
        />
      );
    });

    const editBtn = container.querySelector(
      '.section-detail-edit-button'
    ) as HTMLDivElement;
    expect(editBtn).not.toBeNull();
    expect(editBtn.classList.contains('disabled')).toBe(true);
    expect(editBtn.getAttribute('aria-disabled')).toBe('true');
    expect(editBtn.getAttribute('tabindex')).toBe('-1');

    act(() => {
      editBtn.click();
      editBtn.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
    });

    expect(onEditMock).not.toHaveBeenCalled();
  });

  it('hides the edit button when showEdit is false', () => {
    act(() => {
      root.render(<SectionDetail title="Read Only" showEdit={false} />);
    });

    const editBtn = container.querySelector('.section-detail-edit-button');
    expect(editBtn).toBeNull();
  });

  it('renders clickable links and handles link click and keyboard events', () => {
    const onLinkClickMock = jest.fn();
    const properties: ISectionProperty[] = [
      {
        label: 'Cluster Link',
        value: 'cluster-1',
        isLink: true,
        onLinkClick: onLinkClickMock,
        tooltip: 'Click to view cluster',
        className: 'custom-row'
      },
      {
        label: 'Empty Link',
        value: '',
        isLink: true,
        onLinkClick: onLinkClickMock
      }
    ];

    act(() => {
      root.render(<SectionDetail title="Links" properties={properties} />);
    });

    const row = container.querySelector('.custom-row');
    expect(row).not.toBeNull();

    const labelEl = row?.querySelector('.section-detail-label');
    expect(labelEl?.getAttribute('title')).toBe('Click to view cluster');

    const linkEls = container.querySelectorAll('.section-detail-link');
    expect(linkEls.length).toBe(1);
    const linkEl = linkEls[0] as HTMLSpanElement;
    expect(linkEl.textContent).toBe('cluster-1');

    act(() => {
      linkEl.click();
    });
    expect(onLinkClickMock).toHaveBeenCalledTimes(1);

    act(() => {
      linkEl.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
    });
    expect(onLinkClickMock).toHaveBeenCalledTimes(2);
  });

  it('renders headerActions, children, custom className, style, and forwards ref to root div', () => {
    const ref = React.createRef<HTMLDivElement>();

    act(() => {
      root.render(
        <SectionDetail
          ref={ref}
          title="Custom Section"
          className="extra-wrapper-class"
          style={{ marginTop: '12px' }}
          headerActions={<button className="custom-action">Action</button>}
        >
          <div className="custom-child">Child content</div>
        </SectionDetail>
      );
    });

    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('DIV');
    expect(ref.current?.classList.contains('section-detail-wrapper')).toBe(
      true
    );
    expect(ref.current?.classList.contains('extra-wrapper-class')).toBe(true);
    expect(ref.current?.style.marginTop).toBe('12px');

    expect(container.querySelector('.custom-action')?.textContent).toBe(
      'Action'
    );
    expect(container.querySelector('.custom-child')?.textContent).toBe(
      'Child content'
    );
  });
});
