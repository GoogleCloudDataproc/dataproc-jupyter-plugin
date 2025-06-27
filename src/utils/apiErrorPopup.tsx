/**
 * @license
 * Copyright 2025 Google LLC
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
import Button from '@mui/material/Button';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';

type IApiEnableDialogProps = Readonly<{
  onCancel: () => void;
  onEnable: () => void;
  open: boolean;
  title?: string;
  message?: string;
  enableLink: string;
}>;

function ApiEnableDialog({ 
  onCancel, 
  onEnable,
  open, 
  title = 'API Not Enabled',
  message = 'The Cloud Dataproc API is not enabled for this project.',
  enableLink
}: IApiEnableDialogProps) {
  
  const handleEnableClick = () => {
    window.open(enableLink, '_blank');
    onEnable();
  };

  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="inherit">
          Cancel
        </Button>
        <Button 
          onClick={handleEnableClick} 
          variant="contained" 
          color="primary"
        >
          Enable
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ApiEnableDialog;