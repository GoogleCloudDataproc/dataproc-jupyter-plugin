import React, { useState } from 'react';
import { DataprocWidget } from '../../controls/DataprocWidget';
import { JupyterLab } from '@jupyterlab/application';
import { IThemeManager } from '@jupyterlab/apputils';
import ListVertexScheduler from '../VertexScheduler/ListVertexScheduler';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import VertexExecutionHistory from './VertexExecutionHistory';


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
    const [schedulerData, setScheduleData] = useState('');
    const [bucketName,
        //setBucketName
    ] = useState('');
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
