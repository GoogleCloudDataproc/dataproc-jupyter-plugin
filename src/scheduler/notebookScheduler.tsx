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

import React, { useEffect, useState } from 'react';
import { Input } from '../controls/MuiWrappedInput';
import {
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography
} from '@mui/material';

import { IThemeManager } from '@jupyterlab/apputils';
import { DataprocWidget } from '../controls/DataprocWidget';
import { JupyterLab } from '@jupyterlab/application';
import { LabIcon } from '@jupyterlab/ui-components';
import CreateNotebookScheduler from './createNotebookScheduler';
import LeftArrowIcon from '../../style/icons/left_arrow_icon.svg';
import errorIcon from '../../style/icons/error_icon.svg';

import { DocumentRegistry } from '@jupyterlab/docregistry';
import { INotebookModel } from '@jupyterlab/notebook';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import CreateVertexScheduler from './VertexScheduler/CreateVertexScheduler';

const iconError = new LabIcon({
  name: 'launcher:error-icon',
  svgstr: errorIcon
});

const iconLeftArrow = new LabIcon({
  name: 'launcher:left-arrow-icon',
  svgstr: LeftArrowIcon
});

const NotebookSchedulerComponent = ({
  themeManager,
  app,
  context,
  settingRegistry
}: {
  themeManager: IThemeManager;
  app: JupyterLab;
  context: DocumentRegistry.IContext<INotebookModel> | any;
  settingRegistry: ISettingRegistry;
}): JSX.Element => {
  const [jobNameSelected, setJobNameSelected] = useState<string>('');
  const [inputFileSelected, setInputFileSelected] = useState<string>('');
  const [editMode, setEditMode] = useState<boolean>(false);
  const [jobNameValidation, setJobNameValidation] = useState<boolean>(true);
  const [jobNameSpecialValidation, setJobNameSpecialValidation] =
    useState<boolean>(false);
  const [jobNameUniqueValidation, setJobNameUniqueValidation] = useState<boolean>(true);
  const [notebookSelector, setNotebookSelector] = useState<string>('composer');
  const [createCompleted, setCreateCompleted] =
    context !== '' ? useState(false) : useState(true);

  useEffect(() => {
    if (context !== '') {
      setInputFileSelected(context.path);
    }
  }, []);

  const handleJobNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.target.value.length > 0
      ? setJobNameValidation(true)
      : setJobNameValidation(false);

    //Regex to check job name must contain only letters, numbers, hyphens, and underscores
    const regexp = /^[a-zA-Z0-9-_]+$/;
    event.target.value.search(regexp)
      ? setJobNameSpecialValidation(true)
      : setJobNameSpecialValidation(false);
    setJobNameSelected(event.target.value);

    // setJobNameSelected(event.target.value);
  };

  const handleSchedulerModeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = (event.target as HTMLInputElement).value;
    setNotebookSelector(newValue);
  };

  const handleCancel = async () => {
    if (!editMode) {
      setCreateCompleted(false);
      app.shell.activeWidget?.close();
    } else {
      setCreateCompleted(true);
    }
  };

  return (
    <div className="component-level">
      <div className="cluster-details-header">
        <div
          role="button"
          className="back-arrow-icon"
          onClick={handleCancel}
        >
          <iconLeftArrow.react
            tag="div"
            className="icon-white logo-alignment-style"
          />
        </div>
        <div className="create-job-scheduler-title">
          {editMode ? 'Update A Scheduled Job' : 'Create A Scheduled Job'}
        </div>
      </div>
      <div className="common-fields">
        <div className="create-scheduler-form-element">
          <Input
            className="create-scheduler-style"
            value={jobNameSelected}
            onChange={e => handleJobNameChange(e)}
            type="text"
            placeholder=""
            Label="Job name*"
            disabled={editMode}
          />
        </div>
        {!jobNameValidation && !editMode && (
          <div className="error-key-parent">
            <iconError.react tag="div" className="logo-alignment-style" />
            <div className="error-key-missing">Name is required</div>
          </div>
        )}
        {jobNameSpecialValidation && jobNameValidation && !editMode && (
          <div className="error-key-parent">
            <iconError.react tag="div" className="logo-alignment-style" />
            <div className="error-key-missing">
              Name must contain only letters, numbers, hyphens, and
              underscores
            </div>
          </div>
        )}
        {!jobNameUniqueValidation && !editMode && (
          <div className="error-key-parent">
            <iconError.react tag="div" className="logo-alignment-style" />
            <div className="error-key-missing">
              Job name must be unique for the selected environment
            </div>
          </div>
        )}

        <div className="create-scheduler-form-element-input-file">
          <Input
            className="create-scheduler-style"
            value={inputFileSelected}
            Label="Input file*"
            disabled={true}
          />
        </div>
        <div className="create-scheduler-form-element ">
          <FormControl>
            <RadioGroup
              className='schedule-radio-btn'
              aria-labelledby="demo-controlled-radio-buttons-group"
              name="controlled-radio-buttons-group"
              value={notebookSelector}
              onChange={handleSchedulerModeChange}
            >
              <FormControlLabel
                value="composer"
                className="create-scheduler-label-style"
                control={<Radio size="small" />}
                label={
                  <Typography sx={{ fontSize: 13 }}>Composer</Typography>
                }
              />
              <FormControlLabel
                value="vertex"
                className="create-scheduler-label-style"
                control={<Radio size="small" />}
                label={
                  <Typography sx={{ fontSize: 13 }}>Vertex</Typography>
                }
              />
            </RadioGroup>
          </FormControl>
        </div>
      </div>
      {
        notebookSelector === 'composer' ?
          <CreateNotebookScheduler
            themeManager={themeManager}
            app={app}
            context={context}
            settingRegistry={settingRegistry}
            createCompleted={createCompleted}
            setCreateCompleted={setCreateCompleted}
            jobNameSelected={jobNameSelected}
            setJobNameSelected={setJobNameSelected}
            inputFileSelected={inputFileSelected}
            setInputFileSelected={setInputFileSelected}
            editMode={editMode}
            setEditMode={setEditMode}
            jobNameValidation={jobNameValidation}
            jobNameSpecialValidation={jobNameSpecialValidation}
            jobNameUniqueValidation={jobNameUniqueValidation}
            setJobNameUniqueValidation={setJobNameUniqueValidation}
          />
          :
          <CreateVertexScheduler />
      }
    </div>
  );
};

export class NotebookScheduler extends DataprocWidget {
  app: JupyterLab;
  context: DocumentRegistry.IContext<INotebookModel> | string;
  settingRegistry: ISettingRegistry;

  constructor(
    app: JupyterLab,
    themeManager: IThemeManager,
    settingRegistry: ISettingRegistry,
    context: DocumentRegistry.IContext<INotebookModel> | string
  ) {
    super(themeManager);
    this.app = app;
    this.context = context;
    this.settingRegistry = settingRegistry;
  }

  renderInternal(): React.JSX.Element {
    return (
      <NotebookSchedulerComponent
        themeManager={this.themeManager}
        app={this.app}
        context={this.context}
        settingRegistry={this.settingRegistry}
      />
    );
  }
}
