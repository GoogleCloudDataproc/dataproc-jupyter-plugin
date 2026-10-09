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

import React from 'react';
import { Drawer } from '@mui/material';
import '../../style/editDrawer.css';

export interface IEditDrawerProps {
  /**
   * Whether the drawer is open.
   */
  open: boolean;

  /**
   * Title displayed in the drawer header.
   */
  title: string;

  /**
   * Optional subtitle or description displayed below the header title.
   */
  subtitle?: React.ReactNode;

  /**
   * Callback triggered when the close icon, Cancel button, or backdrop is clicked.
   */
  onClose: () => void;

  /**
   * Callback triggered when the Save button is clicked.
   */
  onSave?: () => void;

  /**
   * Label for the primary Save button. Defaults to 'Save'.
   */
  saveLabel?: string;

  /**
   * Label for the Cancel button. Defaults to 'Cancel'.
   */
  cancelLabel?: string;

  /**
   * Whether the Save button is disabled.
   */
  isSaveDisabled?: boolean;

  /**
   * Whether to display the footer section. Defaults to true.
   */
  showFooter?: boolean;

  /**
   * Custom footer action elements (replaces the default Save/Cancel buttons if provided).
   */
  footerActions?: React.ReactNode;

  /**
   * Width of the drawer paper (e.g., '420px', 500). Defaults to '420px'.
   */
  width?: string | number;

  /**
   * Custom CSS class name for the Drawer Paper element.
   */
  paperClassName?: string;

  /**
   * Custom CSS class name for the inner drawer container.
   */
  className?: string;

  /**
   * Custom CSS class name for the header container.
   */
  headerClassName?: string;

  /**
   * Custom CSS class name for the scrollable body container.
   */
  bodyClassName?: string;

  /**
   * Custom CSS class name for the footer container.
   */
  footerClassName?: string;

  /**
   * Custom inline styles for the Drawer Paper element.
   */
  paperStyle?: React.CSSProperties;

  /**
   * Drawer body form fields and content.
   */
  children: React.ReactNode;
}

export const EditDrawer: React.FC<IEditDrawerProps> = ({
  open,
  title,
  subtitle,
  onClose,
  onSave,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  isSaveDisabled = false,
  showFooter = true,
  footerActions,
  width = '420px',
  paperClassName,
  className,
  headerClassName,
  bodyClassName,
  footerClassName,
  paperStyle,
  children
}) => {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        className: `edit-drawer-paper ${paperClassName || ''}`,
        style: { width, ...paperStyle }
      }}
    >
      <div className={`edit-drawer-container ${className || ''}`}>
        <div className={`edit-drawer-header ${headerClassName || ''}`}>
          <div className="edit-drawer-header-top">
            <div className="edit-drawer-title">{title}</div>
            <button
              type="button"
              className="edit-drawer-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              &times;
            </button>
          </div>
          {subtitle && <div className="edit-drawer-subtitle">{subtitle}</div>}
        </div>

        <div className={`edit-drawer-body ${bodyClassName || ''}`}>
          {children}
        </div>

        {showFooter && (
          <div className={`edit-drawer-footer ${footerClassName || ''}`}>
            {footerActions ? (
              footerActions
            ) : (
              <>
                <button
                  type="button"
                  disabled={isSaveDisabled}
                  className={
                    isSaveDisabled
                      ? 'submit-button-disable-style'
                      : 'submit-button-style'
                  }
                  onClick={onSave}
                >
                  {saveLabel}
                </button>
                <button
                  type="button"
                  className="job-cancel-button-style"
                  onClick={onClose}
                >
                  {cancelLabel}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
};

export default EditDrawer;
