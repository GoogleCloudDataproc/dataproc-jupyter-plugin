/**
 * @license
 * Copyright 2024 Google LLC
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

import React, { useMemo } from 'react';
import { LabIcon } from '@jupyterlab/ui-components';
import EditIcon from '../../style/icons/edit_icon.svg';
import EditIconDisable from '../../style/icons/edit_icon_disable.svg';
import '../../style/sectionDetail.css';

const iconEdit = new LabIcon({
  name: 'launcher:section-edit-icon',
  svgstr: EditIcon
});

const iconEditDisable = new LabIcon({
  name: 'launcher:section-edit-disable-icon',
  svgstr: EditIconDisable
});

export interface ISectionProperty {
  /**
   * Display label / key name for the property (left column).
   */
  label: string;

  /**
   * Property value (right column). Can be a string, number, or custom ReactNode (badges, chips, etc.).
   */
  value?: React.ReactNode;

  /**
   * Optional secondary text displayed below the value.
   */
  subValue?: React.ReactNode;

  /**
   * Optional tooltip text for the label.
   */
  tooltip?: string;

  /**
   * If true, renders the value as a clickable link.
   */
  isLink?: boolean;

  /**
   * Click handler when isLink is true.
   */
  onLinkClick?: () => void;

  /**
   * Optional CSS class name for this specific row.
   */
  className?: string;
}

export interface ISectionDetailProps {
  /**
   * Section title displayed on the leftmost side.
   */
  title: string;

  /**
   * List of properties to display. Can be provided as an array of ISectionProperty objects
   * or a simple key-value Record/Map object.
   */
  properties?: ISectionProperty[] | Record<string, React.ReactNode>;

  /**
   * Handler triggered when clicking the edit icon on the rightmost side.
   */
  onEdit?: () => void;

  /**
   * Whether to display the edit icon. Defaults to true.
   */
  showEdit?: boolean;

  /**
   * Whether the edit icon is disabled.
   */
  isEditDisabled?: boolean;

  /**
   * Optional tooltip message when hovering over the edit button.
   */
  editTooltip?: string;

  /**
   * Optional text label next to the edit icon (e.g. "EDIT").
   */
  editLabel?: string;

  /**
   * Optional action elements placed beside or before the edit icon.
   */
  headerActions?: React.ReactNode;

  /**
   * Placeholder rendered when a value is empty, null, or undefined. Defaults to '-'.
   */
  emptyPlaceholder?: React.ReactNode;

  /**
   * Optional children rendered below the key-value rows.
   */
  children?: React.ReactNode;

  /**
   * Custom CSS class name for the root wrapper.
   */
  className?: string;

  /**
   * Custom style overrides for the root wrapper.
   */
  style?: React.CSSProperties;
}

export const SectionDetail: React.FC<ISectionDetailProps> = ({
  title,
  properties,
  onEdit,
  showEdit = true,
  isEditDisabled = false,
  editTooltip,
  editLabel,
  headerActions,
  emptyPlaceholder = '-',
  children,
  className,
  style
}) => {
  const normalizedProperties: ISectionProperty[] = useMemo(() => {
    if (!properties) {
      return [];
    }
    if (Array.isArray(properties)) {
      return properties;
    }
    return Object.entries(properties).map(([label, value]) => ({
      label,
      value
    }));
  }, [properties]);

  const handleEditClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (!isEditDisabled && onEdit) {
      onEdit();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (
      !isEditDisabled &&
      onEdit &&
      (event.key === 'Enter' || event.key === ' ')
    ) {
      event.preventDefault();
      onEdit();
    }
  };

  return (
    <div className={`section-detail-wrapper ${className || ''}`} style={style}>
      {/* Header with Title on Left and Edit Icon on Right in the same line */}
      <div className="section-detail-header">
        <div className="section-detail-title">{title}</div>
        <div className="section-detail-header-actions">
          {headerActions}
          {showEdit && (
            <div
              role="button"
              tabIndex={isEditDisabled ? -1 : 0}
              aria-label={editTooltip || `Edit ${title}`}
              title={editTooltip || `Edit ${title}`}
              className={`section-detail-edit-button ${
                isEditDisabled ? 'disabled' : ''
              }`}
              onClick={handleEditClick}
              onKeyDown={handleKeyDown}
            >
              {isEditDisabled ? (
                <iconEditDisable.react
                  tag="div"
                  className="logo-alignment-style"
                />
              ) : (
                <iconEdit.react tag="div" className="logo-alignment-style" />
              )}
              {editLabel && (
                <span
                  className={
                    isEditDisabled
                      ? 'edit-label-text disabled'
                      : 'edit-label-text'
                  }
                >
                  {editLabel}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Divider Line */}
      <div className="section-detail-divider" />

      {/* Key-Value Pairs List: Key (Label) and Value in the same line */}
      <div className="section-detail-content">
        {normalizedProperties.map((prop, idx) => {
          const isValueEmpty =
            prop.value === undefined ||
            prop.value === null ||
            prop.value === '';

          const displayValue = isValueEmpty ? emptyPlaceholder : prop.value;

          return (
            <div
              key={`${prop.label}-${idx}`}
              className={`section-detail-row ${prop.className || ''}`}
            >
              <div
                className="section-detail-label"
                title={prop.tooltip || prop.label}
              >
                {prop.label}
              </div>
              <div className="section-detail-value">
                {prop.isLink && typeof displayValue === 'string' ? (
                  <span
                    role="button"
                    tabIndex={0}
                    className="section-detail-link"
                    onClick={prop.onLinkClick}
                  >
                    {displayValue}
                  </span>
                ) : (
                  displayValue
                )}
                {prop.subValue && (
                  <div className="section-detail-subvalue">{prop.subValue}</div>
                )}
              </div>
            </div>
          );
        })}
        {children}
      </div>
    </div>
  );
};

export default SectionDetail;
