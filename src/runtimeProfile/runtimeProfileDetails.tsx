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
import ExpandLessIcon from '../../style/icons/expand_less.svg';
import ExpandMoreIcon from '../../style/icons/expand_more.svg';
import {
  formatLastUsed,
  IRuntimeProfileTemplate,
  parseRuntimeProfileResourceName
} from './runtimeProfileListMapper';
import { RuntimeProfileService } from './runtimeProfileService';
import { LOG_LEVEL, safeLog } from '../utils/loggingService';
import { DATAPROC_LIGHTNING_ENGINE_PROPERTY } from '../utils/const';

const makeIcon = (name: string, svgstr: string) =>
  new LabIcon({ name: `runtime-profile-details:${name}`, svgstr });
const iconLeftArrow = makeIcon('left-arrow-icon', LeftArrowIcon);
const iconEdit = makeIcon('edit-icon', EditIcon);
const iconDelete = makeIcon('delete-icon', DeleteClusterIcon);
const iconCopy = makeIcon('copy-icon', CloneIcon);
const iconExpandLess = makeIcon('expand-less-icon', ExpandLessIcon);
const iconExpandMore = makeIcon('expand-more-icon', ExpandMoreIcon);

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

export const stripPropertyPrefix = (key: string): string =>
  key.replace(/^(?:spark|dataproc):/, '');

const getPropertyValue = (props: Record<string, string>, key: string): string =>
  props[key] ?? props[`spark:${key}`] ?? props[`dataproc:${key}`] ?? '';

export const formatDiskConfig = (tier?: string, size?: string): string => {
  const trimmedTier = tier?.trim() || '';
  const trimmedSize = size?.trim() || '';
  if (!trimmedTier && !trimmedSize) {
    return '';
  }
  const formattedTier = trimmedTier
    ? `${trimmedTier.charAt(0).toUpperCase()}${trimmedTier
        .slice(1)
        .toLowerCase()} persistent disk`
    : '';
  const formattedSize = trimmedSize
    ? trimmedSize.replace(
        /^(\d+)\s*([gGmMtT])[bB]?$/,
        (_, num, unit) => `${num}${unit.toUpperCase()}B`
      )
    : '';
  return formattedTier && formattedSize
    ? `${formattedTier}, ${formattedSize}`
    : formattedTier || formattedSize;
};

export const formatDurationTtl = (ttl?: string): string => {
  const trimmed = ttl?.trim() || '';
  const match = /^(\d+)\s*s$/i.exec(trimmed);
  if (!match) {
    return trimmed;
  }
  const secs = Number(match[1]);
  if (secs <= 0) {
    return '0 sec';
  }
  const units: Array<[number, string, string]> = [
    [86400, 'day', 'days'],
    [3600, 'hr', 'hrs'],
    [60, 'min', 'mins'],
    [1, 'sec', 'secs']
  ];
  for (const [divisor, singular, plural] of units) {
    if (secs % divisor === 0) {
      const count = secs / divisor;
      return `${count} ${count === 1 ? singular : plural}`;
    }
  }
  return `${secs} secs`;
};

const HANDLED_SPARK_PROPERTY_KEYS = new Set<string>([
  DATAPROC_LIGHTNING_ENGINE_PROPERTY,
  'spark.dataproc.driver.disk.tier',
  'spark.dataproc.driver.disk.size',
  'spark.dataproc.executor.disk.tier',
  'spark.dataproc.executor.disk.size',
  'spark.dynamicAllocation.enabled',
  'spark.dynamicAllocation.initialExecutors',
  'spark.dynamicAllocation.minExecutors',
  'spark.dynamicAllocation.maxExecutors'
]);

export interface IDeleteConfirmationModalProps {
  profileName: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmationModal({
  profileName,
  isDeleting,
  onCancel,
  onConfirm
}: IDeleteConfirmationModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDeleting, onCancel]);

  return createPortal(
    <div
      className="delete-profile-modal-backdrop"
      onClick={() => !isDeleting && onCancel()}
    >
      <div
        className="delete-profile-modal"
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        <div className="delete-profile-modal-title">Delete Runtime Profile</div>
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
          Do you want to delete runtime profile {profileName}?
        </div>
        <div className="delete-profile-modal-actions">
          <button
            type="button"
            className="delete-profile-modal-btn"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="delete-profile-modal-btn"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export interface IRuntimeProfileDetailsProps {
  profile: IRuntimeProfileTemplate;
  onBack: () => void;
  onDeleteSuccess?: () => void;
}

/** Renders resource details for a selected Serverless Runtime Profile. */
export default function RuntimeProfileDetails({
  profile,
  onBack,
  onDeleteSuccess
}: IRuntimeProfileDetailsProps) {
  const [isConfigExpanded, setIsConfigExpanded] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { region, profileId: shortName } = parseRuntimeProfileResourceName(
    profile.name
  );
  const displayName = profile.jupyterSession?.displayName || shortName;
  const properties = profile.runtimeConfig?.properties || {};
  const executionConfig = profile.environmentConfig?.executionConfig;
  const getProp = (key: string) => getPropertyValue(properties, key);

  const encryptionType = executionConfig?.kmsKey
    ? 'Customer-managed'
    : 'Google-managed';
  const lightningEngine =
    getProp(DATAPROC_LIGHTNING_ENGINE_PROPERTY) === 'lightningEngine'
      ? 'Enabled'
      : 'Disabled';
  const driverDisk = formatDiskConfig(
    getProp('spark.dataproc.driver.disk.tier'),
    getProp('spark.dataproc.driver.disk.size')
  );
  const executorDisk = formatDiskConfig(
    getProp('spark.dataproc.executor.disk.tier'),
    getProp('spark.dataproc.executor.disk.size')
  );
  const autoscalingStatus =
    getProp('spark.dynamicAllocation.enabled').toLowerCase() === 'false'
      ? 'Off'
      : 'On';

  const sparkPropertyMap = new Map<string, string>();
  Object.entries(properties).forEach(([rawKey, value]) => {
    const normalizedKey = stripPropertyPrefix(rawKey);
    if (!HANDLED_SPARK_PROPERTY_KEYS.has(normalizedKey)) {
      sparkPropertyMap.set(normalizedKey, value);
    }
  });

  const handleCopyName = async () => {
    if (!shortName) {
      Notification.emit('No profile name to copy', 'warning', {
        autoClose: 3000
      });
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shortName);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shortName;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!copied) {
          throw new Error('execCommand copy failed');
        }
      }
      Notification.emit('Name copied to clipboard', 'success', {
        autoClose: 2000
      });
    } catch (error) {
      safeLog(`Failed to copy runtime profile name: ${error}`, LOG_LEVEL.WARN);
      Notification.emit('Failed to copy name to clipboard', 'error', {
        autoClose: 3000
      });
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
      setIsDeleting(false);
    }
  };

  const ExpandChevron = isConfigExpanded
    ? iconExpandLess.react
    : iconExpandMore.react;

  const basicInfoRows = [
    { label: 'Name', value: shortName },
    { label: 'Region', value: region },
    { label: 'Create time', value: formatCreateTime(profile.createTime) },
    { label: 'Creator', value: profile.creator || '' },
    { label: 'Last used', value: formatLastUsed(profile.updateTime, true) },
    { label: 'Description', value: profile.description || '' },
    { label: 'Display name', value: profile.jupyterSession?.displayName || '' },
    { label: 'Jupyter kernel', value: profile.jupyterSession?.kernel || '' }
  ];

  const runtimeVersion = profile.runtimeConfig?.version || '';
  const configType = profile.jupyterSession ? 'Jupyter' : '';
  const initialExec = getProp('spark.dynamicAllocation.initialExecutors');
  const minExec = getProp('spark.dynamicAllocation.minExecutors');
  const maxExec = getProp('spark.dynamicAllocation.maxExecutors');
  const metastore =
    profile.environmentConfig?.peripheralsConfig?.metastoreService || 'None';
  const maxIdleTime = formatDurationTtl(executionConfig?.idleTtl);
  const maxSessionTime = formatDurationTtl(executionConfig?.ttl);

  const configSections: Array<{
    title: string;
    editable?: boolean;
    rows: Array<{ label: string; value: React.ReactNode }>;
  }> = [
    {
      title: 'Runtime configuration',
      editable: true,
      rows: [
        { label: 'Spark runtime version', value: runtimeVersion },
        { label: 'Configuration type', value: configType }
      ]
    },
    {
      title: 'Executor and driver configuration',
      rows: [
        { label: 'Lightning Engine', value: lightningEngine },
        { label: 'Driver disk', value: driverDisk },
        { label: 'Executor disk', value: executorDisk }
      ]
    },
    {
      title: 'Autoscaling',
      editable: true,
      rows:
        autoscalingStatus === 'Off'
          ? [{ label: 'Autoscaling', value: autoscalingStatus }]
          : [
              { label: 'Autoscaling', value: autoscalingStatus },
              { label: 'Initial executors', value: initialExec },
              { label: 'Minimum executors', value: minExec },
              { label: 'Maximum executors', value: maxExec }
            ]
    },
    {
      title: 'Metastore configuration',
      rows: [{ label: 'Metastore', value: metastore }]
    },
    {
      title: 'Network and security',
      rows: [{ label: 'Encryption type', value: encryptionType }]
    },
    {
      title: 'Session lifecycle',
      editable: true,
      rows: [
        { label: 'Max idle time', value: maxIdleTime },
        { label: 'Max session time', value: maxSessionTime }
      ]
    },
    {
      title: 'Other customizations',
      rows: [
        {
          label: 'Spark properties',
          value:
            sparkPropertyMap.size > 0
              ? Array.from(sparkPropertyMap.entries()).map(([key, value]) => (
                  <div
                    key={key}
                    className="runtime-profile-details-spark-prop-line"
                  >
                    {`${key}=${value}`}
                  </div>
                ))
              : 'None'
        },
        {
          label: 'Labels',
          value:
            Object.keys(profile.labels || {}).length > 0
              ? Object.entries(profile.labels || {}).map(([key, value]) => (
                  <div
                    key={key}
                    className="runtime-profile-details-spark-prop-line"
                  >
                    {`${key}=${value}`}
                  </div>
                ))
              : 'None'
        }
      ]
    }
  ];

  return (
    <div className="runtime-profile-details-wrapper">
      {showDeleteModal && (
        <DeleteConfirmationModal
          profileName={displayName}
          isDeleting={isDeleting}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={() => void confirmDelete()}
        />
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
          <button type="button" className="secondary-action-btn" disabled>
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
            <div className="runtime-profile-details-label level-1">
              {row.label}
            </div>
            <div className="runtime-profile-details-value">{row.value}</div>
          </div>
        ))}

        <div
          className="runtime-profile-details-section-header collapsible configuration-header"
          onClick={() => setIsConfigExpanded(prev => !prev)}
          role="button"
          tabIndex={0}
          aria-expanded={isConfigExpanded}
          aria-controls="runtime-profile-config-content"
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsConfigExpanded(prev => !prev);
            }
          }}
        >
          <span>Configuration</span>
          <span
            className="runtime-profile-details-expand-icon"
            aria-hidden="true"
          >
            <ExpandChevron tag="div" aria-hidden="true" />
          </span>
        </div>

        {isConfigExpanded && (
          <div id="runtime-profile-config-content">
            {configSections.map(section => (
              <React.Fragment key={section.title}>
                <div className="runtime-profile-details-subsection-header">
                  <span>{section.title}</span>
                  {section.editable && (
                    <button
                      type="button"
                      className="runtime-profile-details-subsection-edit-btn"
                      aria-label={`Edit ${section.title}`}
                      title={`Edit ${section.title}`}
                      disabled
                    >
                      <iconEdit.react tag="div" aria-hidden="true" />
                    </button>
                  )}
                </div>
                {section.rows.map(row => (
                  <div
                    className="runtime-profile-details-row"
                    key={`${section.title}-${row.label}`}
                  >
                    <div className="runtime-profile-details-label level-2">
                      {row.label}
                    </div>
                    <div className="runtime-profile-details-value">
                      {row.value}
                    </div>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
