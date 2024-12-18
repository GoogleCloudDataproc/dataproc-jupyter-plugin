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
import { DataprocWidget } from '../../controls/DataprocWidget';
import { JupyterLab } from '@jupyterlab/application';
import { IThemeManager } from '@jupyterlab/apputils';
import ListVertexScheduler from '../VertexScheduler/ListVertexScheduler';
// import ExecutionHistory from '../executionHistory';
// import { scheduleMode } from '../../utils/const';
import { ISettingRegistry } from '@jupyterlab/settingregistry';


const NotebookJobComponent = ({
    app,
    settingRegistry,
    setExecutionPageFlag
    // composerSelectedFromCreate,
    // setCreateCompleted,
    // setJobNameSelected,
    // setComposerSelected,
    // setScheduleMode,
    // setScheduleValue,

    // setInputFileSelected,
    // setParameterDetail,
    // setParameterDetailUpdated,
    // setSelectedMode,
    // setClusterSelected,
    // setServerlessSelected,
    // setServerlessDataSelected,
    // serverlessDataList,
    // setServerlessDataList,
    // setServerlessList,
    // setRetryCount,
    // setRetryDelay,
    // setEmailOnFailure,
    // setEmailonRetry,
    // setEmailOnSuccess,
    // setEmailList,
    // setStopCluster,
    // setTimeZoneSelected,
    // setEditMode,
    // setIsLoadingKernelDetail
}: {
    app: JupyterLab;
    themeManager: IThemeManager;
    settingRegistry: ISettingRegistry;
    setExecutionPageFlag: (value: boolean) => void;
    // composerSelectedFromCreate: string;
    // setCreateCompleted?: (value: boolean) => void;
    // setJobNameSelected?: (value: string) => void;
    // setComposerSelected?: (value: string) => void;
    // setScheduleMode?: (value: scheduleMode) => void;
    // setScheduleValue?: (value: string) => void;

    // setInputFileSelected?: (value: string) => void;
    // setParameterDetail?: (value: string[]) => void;
    // setParameterDetailUpdated?: (value: string[]) => void;
    // setSelectedMode?: (value: string) => void;
    // setClusterSelected?: (value: string) => void;
    // setServerlessSelected?: (value: string) => void;
    // setServerlessDataSelected?: (value: {}) => void;
    // serverlessDataList?: any;
    // setServerlessDataList?: (value: string[]) => void;
    // setServerlessList?: (value: string[]) => void;
    // setRetryCount?: (value: number) => void;
    // setRetryDelay?: (value: number) => void;
    // setEmailOnFailure?: (value: boolean) => void;
    // setEmailonRetry?: (value: boolean) => void;
    // setEmailOnSuccess?: (value: boolean) => void;
    // setEmailList?: (value: string[]) => void;
    // setStopCluster?: (value: boolean) => void;
    // setTimeZoneSelected?: (value: string) => void;
    // setEditMode?: (value: boolean) => void;
    // setIsLoadingKernelDetail?: (value: boolean) => void;
}): React.JSX.Element => {
    const [showExecutionHistory] = useState(false);
    const [region, setRegion] = useState<string>('');


    return (
        <>
            {showExecutionHistory ? (
                ''
            ) : (
                <div>
                    <ListVertexScheduler
                        region={region}
                        setRegion={setRegion}
                        app={app}
                        settingRegistry={settingRegistry}
                    />
                </div>
            )}
        </>
    );
};

export class NotebookJobs extends DataprocWidget {
    app: JupyterLab;
    settingRegistry: ISettingRegistry;
    setExecutionPageFlag: (value: boolean) => void;

    constructor(
        app: JupyterLab,
        settingRegistry: ISettingRegistry,
        themeManager: IThemeManager,
        setExecutionPageFlag: (value: boolean) => void
    ) {
        super(themeManager);
        this.app = app;
        this.settingRegistry = settingRegistry;
        this.setExecutionPageFlag = setExecutionPageFlag
    }
    renderInternal(): React.JSX.Element {
        return (
            <NotebookJobComponent
                app={this.app}
                settingRegistry={this.settingRegistry}
                themeManager={this.themeManager}
                setExecutionPageFlag={this.setExecutionPageFlag}
            />
        );
    }
}

export default NotebookJobComponent;
