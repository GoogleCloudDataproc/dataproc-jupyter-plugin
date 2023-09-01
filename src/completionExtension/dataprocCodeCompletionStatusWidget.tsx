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

import React, { useState } from 'react';
import { DataprocWidget } from '../controls/DataprocWidget';
import {
  DataprocCodeCompletionFetcherService,
  Status
} from './dataprocCodeCompletionFetcherService';
import { IThemeManager } from '@jupyterlab/apputils';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';

type CodeCompletionStatusDialogProps = {
  status: Status;
  open: boolean;
  onClose: () => void;
};

function CodeCompletionStatusDialog(props: CodeCompletionStatusDialogProps) {
  let contentText = '';
  switch (props.status.state) {
    case 'idle':
      contentText = 'Code Completion is Idle.';
      break;
    case 'running':
      contentText = 'Code Completion is actively processing.';
      break;
    case 'error':
      contentText = `Code Completion is encountered an issue: "${props.status.errorMsg}"`;
      break;
  }
  return (
    <Dialog open={props.open}>
      <DialogTitle>Vertex AI Status</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {contentText}
        </DialogContentText>
        <DialogActions>
          <Button onClick={props.onClose}>Close</Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}

type CodeCompletionStatusBarImplProps = {
  status: Status;
};

function CodeCompletionStatusBarImpl({
  status
}: CodeCompletionStatusBarImplProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  console.log({ isDialogOpen });
  return (
    <>
      <div
        className="jp-StatusBar-GroupItem"
        role="button"
        onClick={() => setIsDialogOpen(true)}
      >
        <div className="jp-StatusBar-TextItem">Vertex AI - {status.state}</div>
      </div>
      <CodeCompletionStatusDialog
        status={status}
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}

export class CodeCompletionStatusBar extends DataprocWidget {
  constructor(themeManager: IThemeManager) {
    super(themeManager);
    DataprocCodeCompletionFetcherService.addEventListener(
      'status-updated',
      this.updateStatus
    );
  }

  dispose(): void {
    DataprocCodeCompletionFetcherService.removeEventListener(
      'status-updated',
      this.updateStatus
    );
  }

  private updateStatus = () => {
    this.update();
  };

  renderInternal(): React.JSX.Element {
    return (
      <CodeCompletionStatusBarImpl
        status={DataprocCodeCompletionFetcherService.status}
      />
    );
  }
}
