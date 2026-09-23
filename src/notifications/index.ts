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

import { JupyterFrontEnd } from '@jupyterlab/application';
import { Dialog, Notification, showDialog } from '@jupyterlab/apputils';
import React from 'react';
import { INotificationEvent, NotificationsViewer, downloadNotificationsReport } from './NotificationsViewer';

// Note: In JupyterLab 4, event types might be under specific namespaces or just any.
// To ensure maximum compatibility and avoid strict compilation issues without node_modules,
// we type it as any but follow the exact schema structure.
type IEvent = any;

const NOTIFICATION_SCHEMA_ID = 'http://cloud.google.com/dataproc-jupyter/notification';

const SHOW_WARNINGS_COMMAND = 'dataproc:show-warnings';

const SHOW_WARNINGS_COMMAND_LABEL =
  'View Dataproc Jupyter Plugin Notifications';
const NOTIFICATIONS_DIALOG_TITLE = 'Managed Service for Apache Spark';
const VIEW_DETAILS_LABEL = 'View Details';
const VIEW_DETAILS_CAPTION = 'Show the full text of all reported issues';
const CLEAR_MESSAGES_LABEL = 'Clear Messages';
const DOWNLOAD_REPORT_LABEL = 'Download Report';
const CLOSE_LABEL = 'Close';

const CLEAR_MESSAGES_BUTTON = Dialog.createButton({
  label: CLEAR_MESSAGES_LABEL,
  className: 'jp-Dialog-button jp-mod-reject'
});
const DOWNLOAD_REPORT_BUTTON = Dialog.createButton({
  label: DOWNLOAD_REPORT_LABEL,
  className: 'jp-Dialog-button jp-mod-reject'
});

/**
 * Sets up listeners for server-sent Jupyter Events and registers the
 * command to view the aggregated notifications report.
 */
export function setupNotificationSystem(app: JupyterFrontEnd): void {
  if (!app.serviceManager.events) {
    console.warn('JupyterLab EventManager service is not available.');
    return;
  }

  const seenEventIds = new Set<string>();
  const latestReport: INotificationEvent[] = [];

  const clearReport = (): void => {
    latestReport.length = 0;
    seenEventIds.clear();
  };

  app.serviceManager.events.stream.connect((sender, event: IEvent) => {
    if (event.schema_id === NOTIFICATION_SCHEMA_ID) {
      const eventId = (event.id || event.data?.id) as string;
      const message = (event.message || event.data?.message) as string;
      const created = (event.created || event.data?.created) as string;

      if (eventId && message && !seenEventIds.has(eventId)) {
        seenEventIds.add(eventId);

        latestReport.push({
          id: eventId,
          created,
          message,
        });

        // JupyterLab truncates toast messages at 140 characters, so the full
        // text is only available through the report dialog.
        Notification.warning(message, {
          autoClose: false,
          actions: [
            {
              label: VIEW_DETAILS_LABEL,
              caption: VIEW_DETAILS_CAPTION,
              displayType: 'link',
              callback: (clickEvent: MouseEvent) => {
                // Keep the toast open so it is not lost behind the dialog.
                clickEvent.preventDefault();
                void app.commands
                  .execute(SHOW_WARNINGS_COMMAND)
                  .catch(error =>
                    console.error(
                      'Failed to open the Dataproc notifications report:',
                      error
                    )
                  );
              }
            }
          ]
        });
      }
    }
  });

  app.commands.addCommand(SHOW_WARNINGS_COMMAND, {
    label: SHOW_WARNINGS_COMMAND_LABEL,
    execute: () => {
      showDialog({
        title: NOTIFICATIONS_DIALOG_TITLE,
        body: React.createElement(NotificationsViewer, { warnings: latestReport }),
        buttons: [
          CLEAR_MESSAGES_BUTTON,
          DOWNLOAD_REPORT_BUTTON,
          Dialog.okButton({ label: CLOSE_LABEL })
        ]
      }).then(result => {
        if (result.button === DOWNLOAD_REPORT_BUTTON) {
          downloadNotificationsReport(latestReport);
        } else if (result.button === CLEAR_MESSAGES_BUTTON) {
          clearReport();
        }
      });
    }
  });
}
