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

export interface INotificationEvent {
  id: string;
  created: string;
  message: string;
}

export interface INotificationsViewerProps {
  warnings: INotificationEvent[];
}

export const downloadNotificationsReport = (warnings: INotificationEvent[]): void => {
  try {
    const blob = new Blob([JSON.stringify(warnings, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dataproc_jupyter_plugin_report.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error) {
    console.error('Failed to download the report:', error);
  }
};

export const NotificationsViewer = ({
  warnings
}: INotificationsViewerProps): React.JSX.Element => {
  if (!warnings || warnings.length === 0) {
    return (
      <div className="dp-notifications-empty">
        <p>No active warnings or issues reported.</p>
      </div>
    );
  }

  return (
    <div className="dp-notifications-container">
      <div className="dp-notifications-header">
        <p>The following issues were encountered while connecting to the Managed Service for Apache Spark:</p>
      </div>

      <ul className="dp-notifications-list">
        {warnings.map((w, i) => {
          // Format timestamp for premium readability if it's a valid date string
          let displayTime = w.created || '';
          if (w.created) {
            try {
              const date = new Date(w.created);
              if (!isNaN(date.getTime())) {
                displayTime = date.toLocaleString();
              }
            } catch (e) {
              // Fallback to raw string
            }
          }

          return (
            <li key={w.id || i} className="dp-notifications-item">
              <div className="dp-notifications-item-content">
                <div className="dp-notifications-item-time">{displayTime}</div>
                <div className="dp-notifications-item-message">{w.message}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
