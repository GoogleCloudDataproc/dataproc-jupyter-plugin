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
import { IThemeManager } from '@jupyterlab/apputils';
import ListNotebookScheduler from './listNotebookScheduler';
import ExecutionHistory from './executionHistory';

const NotebookJobComponent = ({
  app,
  composerSelectedFromCreate,
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
  setRetryCount,
  setRetryDelay,
  setEmailOnFailure,
  setEmailonRetry,
  setEmailOnSuccess,
  setEmailList,
  setStopCluster,
  setTimeZoneSelected
}: {
  app: JupyterLab;
  themeManager: IThemeManager;
  composerSelectedFromCreate: string;
  setCreateCompleted?: (value: boolean) => void;
  setJobNameSelected?: (value: string) => void;
  setComposerSelected?: (value: string) => void;
  setScheduleMode?: (value: string) => void;
  setScheduleValue?: (value: string) => void;

  setInputFileSelected?: (value: string) => void;
  setParameterDetail?: (value: string[]) => void;
  setParameterDetailUpdated?: (value: string[]) => void;
  setSelectedMode?: (value: string) => void;
  setClusterSelected?: (value: string) => void;
  setServerlessSelected?: (value: string) => void;
  setRetryCount?: (value: number) => void;
  setRetryDelay?: (value: number) => void;
  setEmailOnFailure?: (value: boolean) => void;
  setEmailonRetry?: (value: boolean) => void;
  setEmailOnSuccess?: (value: boolean) => void;
  setEmailList?: (value: string[]) => void;
  setStopCluster?: (value: boolean) => void;
  setTimeZoneSelected?: (value: string) => void;
}): React.JSX.Element => {
  const [showExecutionHistory, setShowExecutionHistory] = useState(false);
  const [composerName, setComposerName] = useState('');
  const [dagId, setDagId] = useState('');
  const [backComposerName, setBackComposerName] = useState('');
  const handleDagIdSelection = (composerName: string, dagId: string) => {
    setShowExecutionHistory(true);
    setComposerName(composerName);
    setDagId(dagId);
  };

  const handleBackButton = () => {
    setShowExecutionHistory(false);
    setBackComposerName(composerName);
  };

  return (
    <div className="component-level">
      {showExecutionHistory ? (
        <ExecutionHistory
          composerName={composerName}
          dagId={dagId}
          handleBackButton={handleBackButton}
        />
      ) : (
        <div>
          <div className="clusters-list-overlay" role="tab">
            <div className="cluster-details-title">Notebook Job Scheduler</div>
          </div>
          <div>
            <ListNotebookScheduler
              app={app}
              handleDagIdSelection={handleDagIdSelection}
              backButtonComposerName={backComposerName}
              composerSelectedFromCreate={composerSelectedFromCreate}
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
              setRetryCount={setRetryCount}
              setRetryDelay={setRetryDelay}
              setEmailOnFailure={setEmailOnFailure}
              setEmailonRetry={setEmailonRetry}
              setEmailOnSuccess={setEmailOnSuccess}
              setEmailList={setEmailList}
              setStopCluster={setStopCluster}
              setTimeZoneSelected={setTimeZoneSelected}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export class NotebookJobs extends DataprocWidget {
  app: JupyterLab;
  composerSelectedFromCreate: string;

  constructor(
    app: JupyterLab,
    themeManager: IThemeManager,
    composerSelectedFromCreate: string
  ) {
    super(themeManager);
    this.app = app;
    this.composerSelectedFromCreate = composerSelectedFromCreate;
  }
  renderInternal(): React.JSX.Element {
    return (
      <NotebookJobComponent
        app={this.app}
        themeManager={this.themeManager}
        composerSelectedFromCreate={this.composerSelectedFromCreate}
      />
    );
  }
}

export default NotebookJobComponent;
