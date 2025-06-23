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
import Button from '@mui/material/Button';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';

interface IErrorPopupProps {
  onCancel: () => void;
  errorPopupOpen: boolean;
  errorMsg: string;
}

function ErrorPopup({ onCancel, errorPopupOpen, errorMsg }: IErrorPopupProps) {
  const isDataprocPermissionError = errorMsg.includes(
    'Dataproc does not have the necessary permissions to run your workload using end user credentials'
  );

  const urlMatch = errorMsg.match(/(https:\/\/[^\s]+)/);
  const authorizationUrl = urlMatch ? urlMatch[0] : '';

  const getDisplayMessage = () => {
    if (isDataprocPermissionError && authorizationUrl) {
      return errorMsg
        .replace(
          'Please visit the following link to grant the permissions and retry:',
          'Please Authorize to grant permissions and retry.'
        )
        .replace(authorizationUrl, '')
        .trim();
    }
    return authorizationUrl
      ? errorMsg.replace(authorizationUrl, '').trim()
      : errorMsg;
  };

  const displayMessage = getDisplayMessage();

  const handleAuthorize = () => {
    if (authorizationUrl) {
      window.open(authorizationUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog open={errorPopupOpen} onClose={onCancel}>
      <DialogTitle>Error</DialogTitle>
      <DialogContent>
        <DialogContentText>{displayMessage}</DialogContentText>
      </DialogContent>
      <DialogActions>
        {authorizationUrl && (
          <Button
            onClick={handleAuthorize}
            color="primary"
            variant="contained"
            style={{ marginRight: '8px' }}
          >
            Authorize
          </Button>
        )}
        <Button onClick={onCancel}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default ErrorPopup;
