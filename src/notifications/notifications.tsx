/**
 * @license
 * Copyright 2023 Google LLC
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
import { JupyterFrontEnd } from '@jupyterlab/application';
import { Dialog, showDialog, Notification, ReactWidget } from '@jupyterlab/apputils';
import { Event } from '@jupyterlab/services';

export const NOTIFICATION_SCHEMA_ID = 'jupyter.org/dataproc/notification';
export const REPORT_SCHEMA_ID = 'jupyter.org/dataproc/report';

const seenEventIds = new Set<string>();
const notificationHistory: any[] = [];

export function setupNotificationListener(app: JupyterFrontEnd): void {
  app.serviceManager.events.stream.connect(
    (sender: Event.IManager, event: Event.Emission) => {
      const emission = event || (sender as any);
      if (!emission || !emission.schema_id) {
        return;
      }

      if (emission.schema_id === NOTIFICATION_SCHEMA_ID) {
        const data = (emission.data || emission) as any;
        const eventId = (data.id as string) || `notif-${Date.now()}-${Math.random()}`;

        if (!seenEventIds.has(eventId)) {
          seenEventIds.add(eventId);
          notificationHistory.push({
            created: new Date().toLocaleString(),
            message: data.message || ''
          });

          Notification.warning((data.message as string) || '', {
            autoClose: false
          });
        }
      }
    }
  );
}

export const NotificationsViewer = ({ warnings }: { warnings: any[] }): React.ReactElement => {
  const downloadJson = (): void => {
    const blob = new Blob([JSON.stringify(warnings, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dataproc_jupyter_notifications.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <p>The following issues were encountered connecting to Dataproc:</p>
      {warnings.length === 0 ? (
        <p><em>No warnings recorded.</em></p>
      ) : (
        <ul>
          {warnings.map((w: any, i: number) => (
            <li key={i}>
              <strong>{w.created}:</strong> {w.message}
            </li>
          ))}
        </ul>
      )}
      <button onClick={downloadJson}>Download as JSON</button>
    </div>
  );
};

let latestReport: any[] = [];

export function setupReportListener(app: JupyterFrontEnd): void {
  app.serviceManager.events.stream.connect(
    (sender: Event.IManager, event: Event.Emission) => {
      const emission = event || (sender as any);
      if (!emission || !emission.schema_id) {
        return;
      }

      if (emission.schema_id === REPORT_SCHEMA_ID) {
        const data = (emission.data || emission) as any;
        latestReport = (data.sticky_events as any[]) || [];
      }
    }
  );

  app.commands.addCommand('dataproc:show-warnings', {
    label: 'View Dataproc Notifications',
    execute: () => {
      const warningsToShow = latestReport.length > 0 ? latestReport : notificationHistory;
      showDialog({
        title: 'Dataproc Notifications',
        body: ReactWidget.create(<NotificationsViewer warnings={warningsToShow} />),
        buttons: [Dialog.okButton({ label: 'Close' })]
      });
    }
  });
}

