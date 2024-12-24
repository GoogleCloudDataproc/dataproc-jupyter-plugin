/**
 * @license
 * Copyright 2024 Google LLC
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
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import VertexExecutionHistory from './VertexExecutionHistory';
import { ISchedulerData } from './VertexInterfaces';


const NotebookJobComponent = ({
    app,
    settingRegistry,
    setExecutionPageFlag
}: {
    app: JupyterLab;
    themeManager: IThemeManager;
    settingRegistry: ISettingRegistry;
    setExecutionPageFlag: (value: boolean) => void;
}): React.JSX.Element => {
    const [showExecutionHistory, setShowExecutionHistory] = useState(false);
    const [region, setRegion] = useState<string>('');
    const [schedulerData, setScheduleData] = useState<ISchedulerData>();
    const [bucketName] = useState('');
    const [scheduleName, setScheduleName] = useState('');

    const handleBackButton = () => {
        setShowExecutionHistory(false);
        setExecutionPageFlag(true);
    };

    const handleDagIdSelection = (schedulerData: any, scheduleName: string) => {
        setShowExecutionHistory(true);
        setScheduleName(scheduleName)
        setScheduleData(schedulerData);
    };

    return (
        <>
            {showExecutionHistory ? (
                <VertexExecutionHistory
                    region={region}
                    setRegion={setRegion}
                    schedulerData={schedulerData}
                    scheduleName={scheduleName}
                    handleBackButton={handleBackButton}
                    bucketName={bucketName}
                    setExecutionPageFlag={setExecutionPageFlag}
                />
            ) : (
                <div>
                    <ListVertexScheduler
                        region={region}
                        setRegion={setRegion}
                        app={app}
                        settingRegistry={settingRegistry}
                        handleDagIdSelection={handleDagIdSelection}
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
