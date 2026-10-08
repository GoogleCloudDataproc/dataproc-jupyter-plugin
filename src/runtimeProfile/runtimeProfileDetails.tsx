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

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LabIcon } from '@jupyterlab/ui-components';
import { Notification } from '@jupyterlab/apputils';
import LeftArrowIcon from '../../style/icons/left_arrow_icon.svg';
import EditIcon from '../../style/icons/edit_icon.svg';
import DeleteClusterIcon from '../../style/icons/delete_cluster_icon.svg';
import CloneIcon from '../../style/icons/clone_icon.svg';
import {
  IRuntimeProfileTemplate,
  parseRuntimeProfileResourceName
} from './runtimeProfileListMapper';
import { RuntimeProfileService } from './runtimeProfileService';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';

const makeIcon = (name: string, svgstr: string) =>
  new LabIcon({ name: `runtime-profile-details:${name}`, svgstr });
const iconLeftArrow = makeIcon('left-arrow-icon', LeftArrowIcon);
const iconEdit = makeIcon('edit-icon', EditIcon);
const iconDelete = makeIcon('delete-icon', DeleteClusterIcon);
const iconCopy = makeIcon('copy-icon', CloneIcon);

const safeLog = (message: string, level: LOG_LEVEL = LOG_LEVEL.INFO): void => {
  if (process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID)) {
    return;
  }
  DataprocLoggingService.log(message, level).catch(() => {
    // Ignore background logging transport errors
  });
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec'.split(',');

export const formatCreateTime = (dateString?: string): string => {
  const date = dateString ? new Date(dateString) : null;
  if (!date || isNaN(date.getTime())) {
    return '';
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  const datePart = `${DAY_NAMES[date.getUTCDay()]} ${
    MONTHS[date.getUTCMonth()]
  } ${pad(date.getUTCDate())} ${date.getUTCFullYear()}`;
  const timePart = `${pad(date.getUTCHours())}:${pad(
    date.getUTCMinutes()
  )}:${pad(date.getUTCSeconds())}`;
  return `${datePart} ${timePart} GMT+0000 (Coordinated Universal Time)`;
};

export const formatDetailsLastUsed = (dateString?: string): string => {
  const date = dateString ? new Date(dateString) : null;
  if (!date || isNaN(date.getTime())) {
    return '';
  }
  const now = new Date();
  const isSameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, now)) {
    const diffMs = Math.max(0, now.getTime() - date.getTime());
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / 60000);
      return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
    }
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }
  if (isSameDay(date, yesterday)) {
    return 'yesterday';
  }
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

export interface IRuntimeProfileDetailsProps {
  profile: IRuntimeProfileTemplate;
  onBack: () => void;
  onDeleteSuccess?: () => void;
}

export default function RuntimeProfileDetails({
  profile,
  onBack,
  onDeleteSuccess
}: IRuntimeProfileDetailsProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!showDeleteModal) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) {
        setShowDeleteModal(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDeleteModal, isDeleting]);

  const { region, profileId: shortName } = parseRuntimeProfileResourceName(
    profile.name
  );
  const displayName = profile.jupyterSession?.displayName || shortName;

  const handleCopyName = async () => {
    try {
      if (shortName && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shortName);
      }
    } catch (error) {
      safeLog(`Failed to copy runtime profile name: ${error}`, LOG_LEVEL.WARN);
    }
  };

  const confirmDelete = async () => {
    if (isDeleting) {
      return;
    }
    setIsDeleting(true);
    try {
      await RuntimeProfileService.deleteRuntimeProfile(
        profile.name,
        displayName
      );
      Notification.emit(`${displayName} is deleted successfully`, 'success', {
        autoClose: 5000
      });
      setShowDeleteModal(false);
      if (onDeleteSuccess) {
        onDeleteSuccess();
      } else {
        onBack();
      }
    } catch (error) {
      safeLog(`Error deleting profile: ${error}`, LOG_LEVEL.ERROR);
      Notification.emit(`Failed to delete ${displayName}: ${error}`, 'error', {
        autoClose: 5000
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const basicInfoRows = [
    { label: 'Name', value: shortName },
    { label: 'Region', value: region },
    { label: 'Create time', value: formatCreateTime(profile.createTime) },
    { label: 'Creator', value: profile.creator || '' },
    { label: 'Last used', value: formatDetailsLastUsed(profile.updateTime) },
    { label: 'Description', value: profile.description || '' },
    { label: 'Display name', value: profile.jupyterSession?.displayName || '' },
    { label: 'Jupyter kernel', value: profile.jupyterSession?.kernel || '' }
  ];

  return (
    <div className="runtime-profile-details-wrapper">
      {showDeleteModal &&
        createPortal(
          <div
            className="delete-profile-modal-backdrop"
            onClick={() => !isDeleting && setShowDeleteModal(false)}
          >
            <div
              className="delete-profile-modal"
              role="dialog"
              aria-modal="true"
              onClick={e => e.stopPropagation()}
            >
              <div className="delete-profile-modal-title">
                Delete Runtime Profile
              </div>
              <div className="delete-profile-modal-banner">
                <svg
                  className="delete-profile-modal-info-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
                <span>This operation cannot be undone.</span>
              </div>
              <div className="delete-profile-modal-body">
                Do you want to delete runtime profile {displayName}?
              </div>
              <div className="delete-profile-modal-actions">
                <button
                  type="button"
                  className="delete-profile-modal-btn"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="delete-profile-modal-btn"
                  onClick={() => void confirmDelete()}
                  disabled={isDeleting}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      <div className="runtime-profile-details-header">
        <button
          type="button"
          className="runtime-profile-details-back-btn"
          onClick={onBack}
          aria-label="Back"
        >
          <iconLeftArrow.react tag="div" aria-hidden="true" />
        </button>
        <div className="runtime-profile-details-header-title">
          Resource details
        </div>
        <div className="runtime-profile-details-header-actions">
          <button type="button" className="secondary-action-btn">
            <iconEdit.react tag="div" aria-hidden="true" />
            Edit
          </button>
          <button
            type="button"
            className="secondary-action-btn"
            onClick={() => setShowDeleteModal(true)}
          >
            <iconDelete.react tag="div" aria-hidden="true" />
            Delete
          </button>
        </div>
      </div>

      <div className="runtime-profile-details-body">
        <div className="runtime-profile-details-title-row">
          <span className="runtime-profile-details-name">{shortName}</span>
          <button
            type="button"
            className="runtime-profile-details-copy-btn"
            onClick={() => void handleCopyName()}
            title="Copy name"
            aria-label="Copy name"
          >
            <iconCopy.react tag="div" aria-hidden="true" />
          </button>
        </div>

        <div className="runtime-profile-details-section-header">
          <span>Basic Information</span>
        </div>

        {basicInfoRows.map(row => (
          <div className="runtime-profile-details-row" key={row.label}>
            <div className="runtime-profile-details-label">{row.label}</div>
            <div className="runtime-profile-details-value">{row.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
