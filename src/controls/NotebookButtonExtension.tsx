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
import { JupyterLab } from '@jupyterlab/application';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { IDisposable } from '@lumino/disposable';
import { ILauncher } from '@jupyterlab/launcher';
import logsIcon from '../../style/icons/logs_icon.svg';
import sessionLogsIcon from '../../style/icons/session_logs_icon.svg';
import { LabIcon } from '@jupyterlab/ui-components';
import { NotebookPanel, INotebookModel } from '@jupyterlab/notebook';
import { ToolbarButton, ISessionContext } from '@jupyterlab/apputils';
import { MainAreaWidget, IThemeManager } from '@jupyterlab/apputils';
import { KernelAPI } from '@jupyterlab/services';
import { authenticatedFetch } from '../utils/utils';
import { HTTP_METHOD, SPARK_HISTORY_SERVER } from '../utils/const';
import { SessionTemplate } from '../sessions/sessionTemplate';

const iconLogs = new LabIcon({
  name: 'launcher:logs-icon',
  svgstr: logsIcon
});
const iconSessionLogs = new LabIcon({
  name: 'launcher:session-logs-icon',
  svgstr: sessionLogsIcon
});

/**
 * A disposable class to track the toolbar widget for a single notebook.
 */
class NotebookButtonExtensionPoint implements IDisposable {
  // IDisposable required.
  isDisposed: boolean;
  private readonly sparkLogsButton: ToolbarButton;
  private readonly sessionDetailsButton: ToolbarButton;
  private sessionId?: string;

  /**
   * The Spark History Server URI if available,
   */
  private shsUri?: string;

  constructor(
    private readonly panel: NotebookPanel,
    private readonly context: DocumentRegistry.IContext<INotebookModel>,
    private readonly app: JupyterLab,
    private readonly launcher: ILauncher,
    private readonly themeManager: IThemeManager
  ) {
    this.isDisposed = false;
    this.context.sessionContext.sessionChanged.connect(this.onSessionChanged);

    this.sparkLogsButton = new ToolbarButton({
      icon: iconLogs,
      onClick: this.onSparkLogsClick,
      tooltip: 'Spark Logs'
    });
    // TODO: we want to use the registry to specify a rank:
    // https://jupyterlab.readthedocs.io/en/stable/extension/extension_points.html#document-widgets
    // but for now we are just inserting at index 1000 to ensure it's at the end.
    this.panel.toolbar.insertItem(1000, 'session-logs', this.sparkLogsButton);
    this.sessionDetailsButton = new ToolbarButton({
      icon: iconSessionLogs,
      onClick: this.onSessionDetailsClick,
      tooltip: 'Session Details'
    });
    this.panel.toolbar.insertItem(
      1000,
      'session-details',
      this.sessionDetailsButton
    );
  }

  private onSessionDetailsClick = () => {
    if (!this.sessionId) {
      //TODO: log error.
      return;
    }
    const content = new SessionTemplate(
      this.app as JupyterLab,
      this.launcher as ILauncher,
      this.themeManager,
      this.sessionId
    );
    const widget = new MainAreaWidget<SessionTemplate>({ content });
    widget.title.label = 'Serverless';
    this.app.shell.add(widget, 'main');
  };

  private onSparkLogsClick = () => {
    if (!this.shsUri) {
      //TODO: log error.
      return;
    }
    window.open(this.shsUri, '_blank');
  };

  /**
   * Event handler for when the kernel changes.  Whenever this happens we need to determine:
   *  1) What is the session id (if relevant)
   *  2) what is the SHS url (if relevant)
   *  3) Show or hide the log and session details buttons as necessary.
   */
  private onKernelChanged = async (session: ISessionContext) => {
    // Get the current kernel ID and look for the kernel in the kernel API.
    const currentId = session.session?.kernel?.id;
    const runningKernels = await KernelAPI.listRunning();
    const runningKernel = runningKernels.find(kernel => kernel.id == currentId);

    // Apparently metadata could exist, so casting to any for now.
    const parentResource = (runningKernel as any)?.metadata
      ?.endpointParentResource as string;

    if (!parentResource) {
      // endpointParentResource not specified (ie not a dataproc session),
      // hide everything and abort.
      this.sparkLogsButton.hide();
      this.sessionDetailsButton.hide();
      this.sessionId = undefined;
      this.shsUri = undefined;
      return;
    }

    const matches =
      /^\/\/dataproc.googleapis.com\/projects\/(?<project>[\w\-]+)\/locations\/(?<location>[\w\-]+)\/sessions\/(?<session>[\w\-]+)/.exec(
        parentResource
      )?.groups;

    this.sessionId = matches?.['session'];
    if (!this.sessionId) {
      // session id not specified (ie not a dataproc session),
      // hide everything and abort.
      // TODO: fix this for Cluster Notebooks.
      this.sparkLogsButton.hide();
      this.sessionDetailsButton.hide();
      this.sessionId = undefined;
      this.shsUri = undefined;
      return;
    }

    // If session ID is specified, show session detail button.
    this.sessionDetailsButton.show();

    // Fetch session details (we care about the SHS URL) from OnePlatform.
    const response = await authenticatedFetch({
      uri: `sessions/${this.sessionId}`,
      method: HTTP_METHOD.GET,
      regionIdentifier: 'locations'
    });
    const formattedResponse = await response.json();
    this.shsUri =
      formattedResponse?.runtimeInfo?.endpoints?.[SPARK_HISTORY_SERVER];
    if (this.shsUri) {
      this.sparkLogsButton.show();
    } else {
      this.sparkLogsButton.hide();
    }
  };

  /**
   * Event handler for when the session changes, we need to reattach kernel change events.
   */
  private onSessionChanged = async (session: ISessionContext) => {
    session.kernelChanged.connect(this.onKernelChanged);
  };

  dispose() {
    this.context.sessionContext.sessionChanged.disconnect(
      this.onSessionChanged
    );
    this.isDisposed = true;
  }
}

export class NotebookButtonExtension
  implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel>
{
  constructor(
    private app: JupyterLab,
    private launcher: ILauncher,
    private themeManager: IThemeManager
  ) {}

  createNew(
    panel: NotebookPanel,
    context: DocumentRegistry.IContext<INotebookModel>
  ): IDisposable {
    return new NotebookButtonExtensionPoint(
      panel,
      context,
      this.app,
      this.launcher,
      this.themeManager
    );
  }
}
