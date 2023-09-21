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
  return (
    <Dialog open={errorPopupOpen} onClose={onCancel}>
      <DialogTitle>Error</DialogTitle>
      <DialogContent>
        <DialogContentText>{errorMsg}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default ErrorPopup;
