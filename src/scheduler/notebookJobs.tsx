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
import { JupyterLab } from '@jupyterlab/application';
// import {
//   FormControl,
//   FormControlLabel,
//   Radio,
//   RadioGroup,
//   Typography
// } from '@mui/material';
import { IThemeManager } from '@jupyterlab/apputils';
import ListNotebookScheduler from './listNotebookScheduler';
// import ListVertexScheduler from './VertexScheduler/ListVertexScheduler';
import ExecutionHistory from './executionHistory';
import { scheduleMode } from '../utils/const';
import { ISettingRegistry } from '@jupyterlab/settingregistry';


const NotebookJobComponent = ({
  app,
  settingRegistry,
  // composerSelectedFromCreate,
  setCreateCompleted,
  setJobNameSelected,
  setComposerSelected,
  setScheduleMode,
  setScheduleValue,

  setInputFileSelected,
  setParameterDetail,
  setParameterDetailUpdated,
  setSelectedMode,
  setClusterSelected,
  setServerlessSelected,
  setServerlessDataSelected,
  serverlessDataList,
  setServerlessDataList,
  setServerlessList,
  setRetryCount,
  setRetryDelay,
  setEmailOnFailure,
  setEmailonRetry,
  setEmailOnSuccess,
  setEmailList,
  setStopCluster,
  setTimeZoneSelected,
  setEditMode,
  setIsLoadingKernelDetail,
  notebookSelector
}: {
  app: JupyterLab;
  themeManager: IThemeManager;
  settingRegistry: ISettingRegistry;
  // composerSelectedFromCreate: string;
  setCreateCompleted?: (value: boolean) => void;
  setJobNameSelected?: (value: string) => void;
  setComposerSelected?: (value: string) => void;
  setScheduleMode?: (value: scheduleMode) => void;
  setScheduleValue?: (value: string) => void;

  setInputFileSelected?: (value: string) => void;
  setParameterDetail?: (value: string[]) => void;
  setParameterDetailUpdated?: (value: string[]) => void;
  setSelectedMode?: (value: string) => void;
  setClusterSelected?: (value: string) => void;
  setServerlessSelected?: (value: string) => void;
  setServerlessDataSelected?: (value: {}) => void;
  serverlessDataList?: any;
  setServerlessDataList?: (value: string[]) => void;
  setServerlessList?: (value: string[]) => void;
  setRetryCount?: (value: number) => void;
  setRetryDelay?: (value: number) => void;
  setEmailOnFailure?: (value: boolean) => void;
  setEmailonRetry?: (value: boolean) => void;
  setEmailOnSuccess?: (value: boolean) => void;
  setEmailList?: (value: string[]) => void;
  setStopCluster?: (value: boolean) => void;
  setTimeZoneSelected?: (value: string) => void;
  setEditMode?: (value: boolean) => void;
  setIsLoadingKernelDetail?: (value: boolean) => void;
  notebookSelector:string;
}): React.JSX.Element => {
  const [showExecutionHistory, setShowExecutionHistory] = useState(false);
  const [composerName, setComposerName] = useState('');
  const [bucketName, setBucketName] = useState('');
  const [dagId, setDagId] = useState('');
  const [backComposerName, setBackComposerName] = useState('');
  // const [schedulerSelector, setSchedulerSelector] = useState<string>('vertex');

  const handleDagIdSelection = (composerName: string, dagId: string) => {
    setShowExecutionHistory(true);
    setComposerName(composerName);
    setDagId(dagId);
  };

  const handleBackButton = () => {
    setShowExecutionHistory(false);
    setBackComposerName(composerName);
  };

  // const handleSchedulerSelector = (
  //   event: React.ChangeEvent<HTMLInputElement>
  // ) => {
  //   const newValue = (event.target as HTMLInputElement).value;
  //   setSchedulerSelector(newValue);
  // };


  return (
    <>
      {showExecutionHistory ? (
        <ExecutionHistory
          composerName={composerName}
          dagId={dagId}
          handleBackButton={handleBackButton}
          bucketName={bucketName}
        />
      ) : (
        <div>
          {/* <div className="clusters-list-overlay" role="tab">
            <div className="cluster-details-title">Scheduled Jobs</div>
          </div> */}
          {/* <div className="create-scheduler-form-element sub-para">
            <FormControl>
              <RadioGroup
                className='schedule-radio-btn'
                aria-labelledby="demo-controlled-radio-buttons-group"
                name="controlled-radio-buttons-group"
                value={schedulerSelector}
                onChange={handleSchedulerSelector}
              >
                <FormControlLabel
                  value="vertex"
                  className="create-scheduler-label-style"
                  control={<Radio size="small" />}
                  label={
                    <Typography sx={{ fontSize: 13 }}>Vertex</Typography>
                  }
                />
                <FormControlLabel
                  value="composer"
                  className="create-scheduler-label-style"
                  control={<Radio size="small" />}
                  label={
                    <Typography sx={{ fontSize: 13 }}>Composer</Typography>
                  }
                />
              </RadioGroup>
            </FormControl>
          </div> */}
          <div>
            {
              // notebookSelector === 'composer' 
              // &&
                <ListNotebookScheduler
                  app={app}
                  settingRegistry={settingRegistry}
                  handleDagIdSelection={handleDagIdSelection}
                  backButtonComposerName={backComposerName}
                  // composerSelectedFromCreate={composerSelectedFromCreate}
                  setCreateCompleted={setCreateCompleted}
                  setJobNameSelected={setJobNameSelected}
                  setComposerSelected={setComposerSelected}
                  setScheduleMode={setScheduleMode}
                  setScheduleValue={setScheduleValue}
                  setInputFileSelected={setInputFileSelected}
                  setParameterDetail={setParameterDetail}
                  setParameterDetailUpdated={setParameterDetailUpdated}
                  setSelectedMode={setSelectedMode}
                  setClusterSelected={setClusterSelected}
                  setServerlessSelected={setServerlessSelected}
                  setServerlessDataSelected={setServerlessDataSelected}
                  serverlessDataList={serverlessDataList}
                  setServerlessDataList={setServerlessDataList}
                  setServerlessList={setServerlessList}
                  setRetryCount={setRetryCount}
                  setRetryDelay={setRetryDelay}
                  setEmailOnFailure={setEmailOnFailure}
                  setEmailonRetry={setEmailonRetry}
                  setEmailOnSuccess={setEmailOnSuccess}
                  setEmailList={setEmailList}
                  setStopCluster={setStopCluster}
                  setTimeZoneSelected={setTimeZoneSelected}
                  setEditMode={setEditMode}
                  bucketName={bucketName}
                  setBucketName={setBucketName}
                  setIsLoadingKernelDetail={setIsLoadingKernelDetail}
                /> 
                // :
                // <ListVertexScheduler
                //   app={app}
                //   settingRegistry={settingRegistry}
                //   handleDagIdSelection={handleDagIdSelection}
                //   backButtonComposerName={backComposerName}
                //   composerSelectedFromCreate={composerSelectedFromCreate}
                //   setCreateCompleted={setCreateCompleted}
                //   setJobNameSelected={setJobNameSelected}
                //   setComposerSelected={setComposerSelected}
                //   setScheduleMode={setScheduleMode}
                //   setScheduleValue={setScheduleValue}
                //   setInputFileSelected={setInputFileSelected}
                //   setParameterDetail={setParameterDetail}
                //   setParameterDetailUpdated={setParameterDetailUpdated}
                //   setSelectedMode={setSelectedMode}
                //   setClusterSelected={setClusterSelected}
                //   setServerlessSelected={setServerlessSelected}
                //   setServerlessDataSelected={setServerlessDataSelected}
                //   serverlessDataList={serverlessDataList}
                //   setServerlessDataList={setServerlessDataList}
                //   setServerlessList={setServerlessList}
                //   setRetryCount={setRetryCount}
                //   setRetryDelay={setRetryDelay}
                //   setEmailOnFailure={setEmailOnFailure}
                //   setEmailonRetry={setEmailonRetry}
                //   setEmailOnSuccess={setEmailOnSuccess}
                //   setEmailList={setEmailList}
                //   setStopCluster={setStopCluster}
                //   setTimeZoneSelected={setTimeZoneSelected}
                //   setEditMode={setEditMode}
                //   bucketName={bucketName}
                //   setBucketName={setBucketName}
                //   setIsLoadingKernelDetail={setIsLoadingKernelDetail}
                // />
            }

          </div>
        </div>
      )}
    </>
  );
};

export class NotebookJobs extends DataprocWidget {
  app: JupyterLab;
  settingRegistry: ISettingRegistry;
  // composerSelectedFromCreate: string;
  notebookSelector: string;

  constructor(
    app: JupyterLab,
    settingRegistry: ISettingRegistry,
    themeManager: IThemeManager,
    // composerSelectedFromCreate: string,
    notebookSelector: string
  ) {
    super(themeManager);
    this.app = app;
    this.settingRegistry = settingRegistry;
    // this.composerSelectedFromCreate = composerSelectedFromCreate;
    this.notebookSelector = notebookSelector;
  }
  renderInternal(): React.JSX.Element {
    return (
      <NotebookJobComponent
        app={this.app}
        settingRegistry={this.settingRegistry}
        themeManager={this.themeManager}
        // composerSelectedFromCreate={this.composerSelectedFromCreate}
        notebookSelector={this.notebookSelector}
      />
    );
  }
}

export default NotebookJobComponent;
