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

import React, { useState } from 'react';
import { DataprocWidget } from '../../controls/DataprocWidget';
import { JupyterLab } from '@jupyterlab/application';
import { IThemeManager } from '@jupyterlab/apputils';
import ListVertexScheduler from '../VertexScheduler/ListVertexScheduler';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import VertexExecutionHistory from './VertexExecutionHistory';
import { scheduleMode } from '../../utils/const';
import dayjs from 'dayjs';


const VertexScheduleJobs = ({
    app,
    settingRegistry,
    setJobId,
    setExecutionPageFlag,
    setCreateCompleted,
    setInputFileSelected,
    region,
    setRegion,
    setMachineTypeSelected,
    setAcceleratedCount,
    setAcceleratorType,
    setKernelSelected,
    setCloudStorage,
    setDiskTypeSelected,
    setDiskSize,
    setParameterDetail,
    setParameterDetailUpdated,
    setServiceAccountSelected,
    setPrimaryNetworkSelected,
    setSubNetworkSelected,
    setSubNetworkList,
    setSharedNetworkSelected,
    setScheduleMode,
    setScheduleField,
    setStartDate,
    setEndDate,
    setMaxRuns,
    setTimeZoneSelected,
    setEditMode,
    setJobNameSelected,
    setServiceAccountList,
    setPrimaryNetworkList,
    setNetworkSelected
}: {
    app: JupyterLab;
    themeManager: IThemeManager;
    settingRegistry: ISettingRegistry;
    setJobId: (value: string) => void;
    setExecutionPageFlag: (value: boolean) => void;
    setCreateCompleted: (value: boolean) => void;
    setInputFileSelected: (value: string) => void;
    region: string;
    setRegion: (value: string) => void;
    setMachineTypeSelected: (value: string | null) => void;
    setAcceleratedCount: (value: string | null) => void;
    setAcceleratorType: (value: string | null) => void;
    setKernelSelected: (value: string | null) => void;
    setCloudStorage: (value: string | null) => void;
    setDiskTypeSelected: (value: string | null) => void;
    setDiskSize: (value: string) => void;
    setParameterDetail: (value: string[]) => void;
    setParameterDetailUpdated: (value: string[]) => void;
    setServiceAccountSelected: (value: { displayName: string; email: string } | null) => void;
    setPrimaryNetworkSelected: (value: { name: string; link: string } | null) => void;
    setPrimaryNetworkList: (value: { name: string; link: string }[]) => void;
    setSubNetworkSelected: (value: { name: string; link: string } | null) => void;
    setSubNetworkList: (value: { name: string; link: string }[]) => void;
    setSharedNetworkSelected: (value: { name: string; network: string, subnetwork: string } | null) => void;
    setScheduleMode: (value: scheduleMode) => void;
    setScheduleField: (value: string) => void;
    setStartDate: (value: dayjs.Dayjs | null) => void;
    setEndDate: (value: dayjs.Dayjs | null) => void;
    setMaxRuns: (value: string) => void;
    setTimeZoneSelected: (value: string) => void;
    setEditMode: (value: boolean) => void;
    setJobNameSelected?: (value: string) => void;
    setServiceAccountList: (value: { displayName: string; email: string }[]) => void;
    setNetworkSelected: (value: string) => void;
}): React.JSX.Element => {
    const [showExecutionHistory, setShowExecutionHistory] = useState<boolean>(false);
    const [schedulerData, setScheduleData] = useState<string>('');
    const [bucketName,
    ] = useState<string>('');
    const [scheduleName, setScheduleName] = useState<string>('');

    /**
    * Handler to move back page back
    */
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
                        setJobId={setJobId}
                        settingRegistry={settingRegistry}
                        handleDagIdSelection={handleDagIdSelection}
                        setCreateCompleted={setCreateCompleted}
                        setInputFileSelected={setInputFileSelected}
                        setMachineTypeSelected={setMachineTypeSelected}
                        setAcceleratedCount={setAcceleratedCount}
                        setAcceleratorType={setAcceleratorType}
                        setKernelSelected={setKernelSelected}
                        setCloudStorage={setCloudStorage}
                        setDiskTypeSelected={setDiskTypeSelected}
                        setDiskSize={setDiskSize}
                        setParameterDetail={setParameterDetail}
                        setParameterDetailUpdated={setParameterDetailUpdated}
                        setServiceAccountSelected={setServiceAccountSelected}
                        setPrimaryNetworkSelected={setPrimaryNetworkSelected}
                        setSubNetworkSelected={setSubNetworkSelected}
                        setSubNetworkList={setSubNetworkList}
                        setSharedNetworkSelected={setSharedNetworkSelected}
                        setScheduleMode={setScheduleMode}
                        setScheduleField={setScheduleField}
                        setStartDate={setStartDate}
                        setEndDate={setEndDate}
                        setMaxRuns={setMaxRuns}
                        setTimeZoneSelected={setTimeZoneSelected}
                        setEditMode={setEditMode}
                        setJobNameSelected={setJobNameSelected!}
                        setServiceAccountList={setServiceAccountList}
                        setPrimaryNetworkList={setPrimaryNetworkList}
                        setNetworkSelected={setNetworkSelected}
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
            <VertexScheduleJobs
                app={this.app}
                settingRegistry={this.settingRegistry}
                themeManager={this.themeManager}
                setExecutionPageFlag={this.setExecutionPageFlag} setCreateCompleted={function (value: boolean): void {
                    throw new Error('Function not implemented.');
                } } setInputFileSelected={function (value: string): void {
                    throw new Error('Function not implemented.');
                } } region={''} setRegion={function (value: string): void {
                    throw new Error('Function not implemented.');
                } } setMachineTypeSelected={function (value: string | null): void {
                    throw new Error('Function not implemented.');
                } } setAcceleratedCount={function (value: string | null): void {
                    throw new Error('Function not implemented.');
                } } setAcceleratorType={function (value: string | null): void {
                    throw new Error('Function not implemented.');
                } } setKernelSelected={function (value: string | null): void {
                    throw new Error('Function not implemented.');
                } } setCloudStorage={function (value: string | null): void {
                    throw new Error('Function not implemented.');
                } } setDiskTypeSelected={function (value: string | null): void {
                    throw new Error('Function not implemented.');
                } } setDiskSize={function (value: string): void {
                    throw new Error('Function not implemented.');
                } } setParameterDetail={function (value: string[]): void {
                    throw new Error('Function not implemented.');
                } } setParameterDetailUpdated={function (value: string[]): void {
                    throw new Error('Function not implemented.');
                } } setServiceAccountSelected={function (value: { displayName: string; email: string; } | null): void {
                    throw new Error('Function not implemented.');
                } } setNetworkSelected={function (value: string): void {
                    throw new Error('Function not implemented.');
                } } setPrimaryNetworkSelected={function (value: { name: string; link: string; } | null): void {
                    throw new Error('Function not implemented.');
                } } setPrimaryNetworkList={function (value: { name: string; link: string; }[]): void {
                    throw new Error('Function not implemented.');
                } } setSubNetworkSelected={function (value: { name: string; link: string; } | null): void {
                    throw new Error('Function not implemented.');
                } } setSubNetworkList={function (value: { name: string; link: string; }[]): void {
                    throw new Error('Function not implemented.');
                } } setSharedNetworkSelected={function (value: { name: string; network: string; subnetwork: string; } | null): void {
                    throw new Error('Function not implemented.');
                } } setScheduleMode={function (value: scheduleMode): void {
                    throw new Error('Function not implemented.');
                } } setScheduleField={function (value: string): void {
                    throw new Error('Function not implemented.');
                } } setStartDate={function (value: dayjs.Dayjs | null): void {
                    throw new Error('Function not implemented.');
                } } setEndDate={function (value: dayjs.Dayjs | null): void {
                    throw new Error('Function not implemented.');
                } } setMaxRuns={function (value: string): void {
                    throw new Error('Function not implemented.');
                } } setTimeZoneSelected={function (value: string): void {
                    throw new Error('Function not implemented.');
                } } setEditMode={function (value: boolean): void {
                    throw new Error('Function not implemented.');
                } } setServiceAccountList={function (value: { displayName: string; email: string; }[]): void {
                    throw new Error('Function not implemented.');
                } } setJobId={function (value: string): void {
                    throw new Error('Function not implemented.');
                } }/>
        );
    }
}

export default VertexScheduleJobs;
