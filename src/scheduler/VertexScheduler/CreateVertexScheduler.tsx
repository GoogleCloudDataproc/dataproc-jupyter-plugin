import React, { useEffect, useState } from 'react';
import { Input } from '../../controls/MuiWrappedInput';
import {
    Autocomplete,
    TextField,
    Radio,
    Button,
    FormControl,
    RadioGroup,
    FormControlLabel,
    Typography
} from '@mui/material';
import { IThemeManager } from '@jupyterlab/apputils';
import { JupyterLab } from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import LabelProperties from '../../jobs/labelProperties';
import LearnMore from '../common/LearnMore';
import { Cron } from 'react-js-cron';
import tzdata from 'tzdata';
// import Scheduler from '../common/Scheduler';
import { RegionDropdown } from '../../controls/RegionDropdown';
import { authApi } from '../../utils/utils';
import VertexScheduleJobs from './VertexScheduleJobs';
import { internalScheduleMode, scheduleMode, scheduleValueExpression } from '../../utils/const';
import { VertexServices } from './VertexServices';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
// import { DesktopDateTimePicker } from '@mui/x-date-pickers/DesktopDateTimePicker';
import dayjs from 'dayjs';
import { LabIcon } from '@jupyterlab/ui-components';
import errorIcon from '../../../style/icons/error_icon.svg';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

const iconError = new LabIcon({
    name: 'launcher:error-icon',
    svgstr: errorIcon
});

const CreateVertexScheduler = ({
    themeManager,
    app,
    context,
    settingRegistry,
    createCompleted,
    setCreateCompleted,
    jobNameSelected,
    setJobNameSelected,
    inputFileSelected,
    setInputFileSelected,
    editMode,
    setEditMode,
    jobNameValidation,
    jobNameSpecialValidation,
    jobNameUniqueValidation,
    setJobNameUniqueValidation,
    notebookSelector
}: {
    themeManager: IThemeManager;
    app: JupyterLab;
    context: any;
    settingRegistry: ISettingRegistry;
    createCompleted: boolean;
    setCreateCompleted: React.Dispatch<React.SetStateAction<boolean>>;
    jobNameSelected: string;
    setJobNameSelected: React.Dispatch<React.SetStateAction<string>>;
    inputFileSelected: string;
    setInputFileSelected: React.Dispatch<React.SetStateAction<string>>;
    editMode: boolean;
    setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
    jobNameValidation: boolean;
    jobNameSpecialValidation: boolean;
    jobNameUniqueValidation: boolean;
    setJobNameUniqueValidation: React.Dispatch<React.SetStateAction<boolean>>;
    notebookSelector: string;
}) => {
    const [vertexScheduler] = useState(false);
    const [dummyList] = useState(['1', '2', '3']);

    const [parameterDetail, setParameterDetail] = useState(['']);
    const [parameterDetailUpdated, setParameterDetailUpdated] = useState(['']);
    const [keyValidation, setKeyValidation] = useState(-1);
    const [valueValidation, setValueValidation] = useState(-1);
    const [duplicateKeyError, setDuplicateKeyError] = useState(-1);

    const [kernel] = useState(['python3', 'pytorch', 'tensorflow']);
    const [kernelSelected, setKernelSelected] = useState('');
    const [cloudStorageList, setCloudStorageList] = useState<string[]>([]);
    const [cloudStorage, setCloudStorage] = useState('');
    const [machineTypeList, setMachineTypeList] = useState<string[]>([]);
    const [machineTypeSelected, setMachineTypeSelected] = useState('');
    const [primaryNetworkList, setPrimaryNetworkList] = useState<string[]>([]);
    const [primaryNetworkSelected, setPrimaryNetworkSelected] = useState('');
    const [subNetworkList, setSubNetworkList] = useState<string[]>([]);
    const [subNetworkSelected, setSubNetworkSelected] = useState('');
    const [sharedNetworkList, setSharedNetworkList] = useState<string[]>([]);
    const [sharedNetworkSelected, setSharedNetworkSelected] = useState('');
    const [acceleratorType, setAcceleratorType] = useState('');
    const [acceleratedCount, setAcceleratedCount] = useState(null);
    const [networkSelected, setNetworkSelected] = useState('networkInThisProject');
    const [region, setRegion] = useState('');
    const [projectId, setProjectId] = useState('');
    const [maxRuns, setMaxRuns] = useState('');
    const [scheduleField, setScheduleField] = useState('');
    const [scheduleMode, setScheduleMode] = useState<scheduleMode>('runNow');
    const [internalScheduleMode, setInternalScheduleMode] = useState<internalScheduleMode>('cronFormat');
    const [scheduleValue, setScheduleValue] = useState(scheduleValueExpression);
    const [timeZoneSelected, setTimeZoneSelected] = useState(
        Intl.DateTimeFormat().resolvedOptions().timeZone
    );

    const timezones = Object.keys(tzdata.zones).sort();
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [endDateError, setEndDateError] = useState(false)

    const minDateStart = dayjs();
    const minDateEnd = startDate ? dayjs(startDate) : minDateStart;
    // const [composerSelected, setComposerSelected] = useState('');

    const handleRegionChange = (value: React.SetStateAction<string>) => {
        setRegion(value)
        setMachineTypeSelected('')
    }
    /**
   * Kernel selection
   * @param {string} kernelSelected seleted kernel
   */
    const handleKernel = (kernelValue: any) => {
        setKernelSelected(kernelValue)
    }

    const handleSchedule = (e: any | React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;

    // Prevent space as the first character
    if (newValue === '' || newValue[0] !== ' ' || scheduleField !== '') {
        setScheduleField(newValue);
    }
        // setScheduleField(e.target.value)
    }

    /**
   * Primary Network selection
   * @param {string} primaryNetworkSelected seleted kernel
   */
    const handlePrimaryNetwork = (primaryValue: any) => {
        setPrimaryNetworkSelected(primaryValue)
    }

    /**
   * Sub Network selection
   * @param {string} subNetworkSelected seleted kernel
   */
    const handleSubNetwork = (subNetworkValue: any) => {
        setSubNetworkSelected(subNetworkValue)
    }

    /**
   * Primary Network selection
   * @param {string} primaryNetworkSelected seleted kernel
   */
    const handleSharedNetwork = (shredNetworkValue: any) => {
        setSharedNetworkSelected(shredNetworkValue)
    }

    /**
   * Kernel selection
   * @param {string} cloudStorage seleted kernel
   */
    const handleCloudStorageSelected = (cloudStorageValue: any) => {
        setCloudStorage(cloudStorageValue)
    }

    /**
    * Machine Type selection
    * @param {string} machineTypeSelected seleted machine type
    */
    const handleMachineType = (machineType: any) => {
        setMachineTypeSelected(machineType);
        setAcceleratedCount(null)
        setAcceleratorType('')
    }

    /**
    * Max Runs
    * @param {string} maxRuns seleted machine type
    */
    const handleMaxRuns = (e: any | React.ChangeEvent<HTMLInputElement>) => {
        const re = /^[1-9][0-9]*$/;
        if (e.target.value === '' || re.test(e.target.value)) {
            setMaxRuns(e.target.value);
        }
    };

    /**
    * Acceleration Type listing
    * @param {Array} acceleratorConfig acceleratorConfigs data
    */
    const getAcceleratedType = (acceleratorConfig: any) => {
        return acceleratorConfig.map((item: any) => item.acceleratorType);
    }

    /**
    * Acceleration Count listing
    * @param {Array} allowedCounts allowedCounts data
    */
    // const getAcceleratedCount = (allowedCounts: any) => {
    //   return allowedCounts.map((item: any) => item.allowedCounts);
    // }

    /**
    * Acceleration Type selection
    * @param {string} acceleratorType accelerationType type selected
    */
    const handleAccelerationType = (acceleratorType: any) => {
        setAcceleratorType(acceleratorType);
    }

    /**
    * Acceleration Count selection
    * @param {string} acceleratorCount accelerationType count selected
    */
    const handleAcceleratorCount = (acceleratorCount: any) => {
        setAcceleratedCount(acceleratorCount);
    }

    const handleNetworkSelection = (eventValue: any) => {
        console.log('network', eventValue);
        setNetworkSelected(eventValue.target.value);
    }

    const handleStartDate = (val: any) => {
        // console.log('startDate', val)
        // setStartDate(val.$d)
        setStartDate(val);

        if (val && endDate && dayjs(endDate).isBefore(dayjs(val))) {
            setEndDateError(true);
        } else {
            setEndDateError(false);
        }
    }

    const handleEndDate = (val: any) => {
        if (startDate && (dayjs(val).isBefore(dayjs(startDate)) || dayjs(val).isSame(dayjs(startDate), 'minute'))) {
            setEndDateError(true);
        } else {
            setEndDateError(false);
        }
        setEndDate(val);
        // console.log('endDate', val)
        // setEndDate(val.$d)
    }

    /**
    * Create a job schedule
    */
    // const handleCreateJobScheduler = () => {
    //   const payload = {
    //     //scheduler: string,
    //     //input_filename: string,
    //     //display_name: string,
    //     machine_spec: {
    //       machine_type: machineTypeSelected,
    //       accelerator_type: acceleratorType,
    //       accelerator_count: acceleratedCount
    //     },
    //     kernel_name: kernelSelected,
    //     //schedule_value: string,
    //     //region: string,
    //     //cloud_storage_bucket: string,
    //     //parameters: [

    //     //],
    //     //service_account: string,
    //     //network_spec: {
    //     //enable_internet_access: True, //this will always be true
    //     //network: string,
    //     //subnetwork: string
    //     //}
    //   }
    // }

    const machineTypeAPI = async () => {
        await VertexServices.machineTypeAPIService(region, setMachineTypeList);
    };

    const cloudStorageAPI = async () => {
        await VertexServices.cloudStorageAPIService(setCloudStorageList);
    };

    const primaryNetworkAPI = async () => {
        await VertexServices.primaryNetworkAPIService(setPrimaryNetworkList);
    };

    const subNetworkAPI = async () => {
        await VertexServices.subNetworkAPIService(region, setSubNetworkList);
    };

    const sharedNetworkAPI = async () => {
        await VertexServices.sharedNetworkAPIService(setSharedNetworkList);
    };

    const handleCancel = async () => {
        if (!editMode) {
            setCreateCompleted(false);
            app.shell.activeWidget?.close();
        } else {
            setCreateCompleted(true);
        }
    };

    useEffect(() => {
        if (!createCompleted) {
            if (region !== '') {
                machineTypeAPI()
                subNetworkAPI()
            }
            cloudStorageAPI()
            primaryNetworkAPI()
            sharedNetworkAPI()
        }
        authApi()
            .then((credentials) => {
                if (credentials && credentials?.region_id && credentials.project_id) {
                    setRegion(credentials.region_id);
                    setProjectId(credentials.project_id);
                }
            })
            .catch((error) => {
                console.error(error);
            });
    }, [projectId]);

    const handleSchedulerModeChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const newValue = (event.target as HTMLInputElement).value;
        setScheduleMode(newValue as scheduleMode);
        if (newValue === 'runSchedule' && scheduleValue === '') {
            setScheduleValue(scheduleValueExpression);
        }
        if (newValue === 'runSchedule') {
            setInternalScheduleMode("cronFormat");
        }
    };

    const handleInternalSchedulerModeChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const newValue = (event.target as HTMLInputElement).value;
        setInternalScheduleMode(newValue as internalScheduleMode);
        // if (newValue === 'cronFormat' && scheduleValue === '') {
        //     setScheduleValue(scheduleValueExpression);
        // }
    };

    const handleTimeZoneSelected = (data: string | null) => {
        if (data) {
            const selectedTimeZone = data.toString();
            setTimeZoneSelected(selectedTimeZone);
        }
    };
    console.log({ 'startDate': startDate, 'endDate': endDate });

    return (
        <>
            {
                createCompleted ?
                    <VertexScheduleJobs
                        app={app}
                        themeManager={themeManager}
                        settingRegistry={settingRegistry}
                    // composerSelectedFromCreate='vertex'
                    // setCreateCompleted={setCreateCompleted}
                    // setJobNameSelected={setJobNameSelected}
                    // setComposerSelected={setComposerSelected}
                    // setScheduleMode={setScheduleMode}
                    // setScheduleValue={setScheduleValue}
                    // setInputFileSelected={setInputFileSelected}
                    // setParameterDetail={setParameterDetail}
                    // setParameterDetailUpdated={setParameterDetailUpdated}
                    // setSelectedMode={setSelectedMode}
                    // setClusterSelected={setClusterSelected}
                    // setServerlessSelected={setServerlessSelected}
                    // setServerlessDataSelected={setServerlessDataSelected}
                    // serverlessDataList={serverlessDataList}
                    // setServerlessDataList={setServerlessDataList}
                    // setServerlessList={setServerlessList}
                    // setRetryCount={setRetryCount}
                    // setRetryDelay={setRetryDelay}
                    // setEmailOnFailure={setEmailOnFailure}
                    // setEmailonRetry={setEmailonRetry}
                    // setEmailOnSuccess={setEmailOnSuccess}
                    // setEmailList={setEmailList}
                    // setStopCluster={setStopCluster}
                    // setTimeZoneSelected={setTimeZoneSelected}
                    // setEditMode={setEditMode}
                    // setIsLoadingKernelDetail={setIsLoadingKernelDetail}
                    />
                    :
                    <div className='submit-job-container'>

                        <div className="region-overlay create-scheduler-form-element">
                            <RegionDropdown
                                projectId={projectId}
                                region={region}
                                onRegionChange={region => handleRegionChange(region)}
                            />
                        </div>

                        <div className="create-scheduler-form-element">
                            <Autocomplete
                                className="create-scheduler-style"
                                options={machineTypeList && machineTypeList.map((item: any) => item.machineType)}
                                // options={machineTypeList && machineTypeList}
                                value={machineTypeSelected}
                                onChange={(_event, val) => handleMachineType(val)}
                                renderInput={params => (
                                    <TextField {...params} label="Machine type*" />
                                )}
                            //disabled={editMode}
                            />
                        </div>

                        {
                            machineTypeList && machineTypeList.map((item: any) => {
                                if ("acceleratorConfigs" in item && item.machineType === machineTypeSelected && item.acceleratorConfigs !== null) {
                                    return (
                                        // console.log('getAcceleratedType(item.acceleratorConfigs)', getAcceleratedType(item.acceleratorConfigs)),
                                        <div className="execution-history-main-wrapper">
                                            <div className="create-scheduler-form-element create-scheduler-form-element-input-fl create-pr">
                                                <Autocomplete
                                                    className="create-scheduler-style create-scheduler-form-element-input-fl"
                                                    options={getAcceleratedType(item.acceleratorConfigs)}
                                                    value={acceleratorType}
                                                    onChange={(_event, val) => handleAccelerationType(val)}
                                                    renderInput={params => (
                                                        <TextField {...params} label="Accelerator type*" />
                                                    )}
                                                //disabled={editMode}
                                                />
                                            </div>

                                            {
                                                item?.acceleratorConfigs?.map((element: { allowedCounts: any[]; acceleratorType: string; }) => {
                                                    return (
                                                        // console.log("element.allowedCounts", element.allowedCounts),
                                                        <>
                                                            {
                                                                element.acceleratorType === acceleratorType ? <div className="create-scheduler-form-element create-scheduler-form-element-input-fl">
                                                                    <Autocomplete
                                                                        className="create-scheduler-style create-scheduler-form-element-input-fl"
                                                                        options={element.allowedCounts.map(item => item.toString())}
                                                                        value={acceleratedCount}
                                                                        onChange={(_event, val) => handleAcceleratorCount(val)}
                                                                        renderInput={params => (
                                                                            <TextField {...params} label="Accelerator count*" />
                                                                        )}
                                                                    //disabled={editMode}
                                                                    />
                                                                </div> : null
                                                            }
                                                        </>
                                                    )
                                                })
                                            }

                                        </div>
                                    )
                                }
                            })
                        }


                        <div className="create-scheduler-form-element">
                            <Autocomplete
                                className="create-scheduler-style"
                                options={kernel}
                                value={kernelSelected}
                                onChange={(_event, val) => handleKernel(val)}
                                renderInput={params => (
                                    <TextField {...params} label="Kernel*" />
                                )}
                            //disabled={editMode}
                            />
                        </div>

                        <div className="create-scheduler-form-element">
                            <Autocomplete
                                className="create-scheduler-style"
                                options={cloudStorageList}
                                value={cloudStorage}
                                onChange={(_event, val) => handleCloudStorageSelected(val)}
                                renderInput={params => (
                                    <TextField {...params} label="Cloud Storage Bucket*" />
                                )}
                            //disabled={editMode}
                            />
                        </div>
                        <span className="tab-description tab-text-sub-cl">Where results are stored. Select an existing bucket or create a new one.</span>

                        <>
                            <div className="create-job-scheduler-title sub-title-heading ">
                                Parameters
                            </div>
                            <LabelProperties
                                labelDetail={parameterDetail}
                                setLabelDetail={setParameterDetail}
                                labelDetailUpdated={parameterDetailUpdated}
                                setLabelDetailUpdated={setParameterDetailUpdated}
                                buttonText="ADD PARAMETER"
                                keyValidation={keyValidation}
                                setKeyValidation={setKeyValidation}
                                valueValidation={valueValidation}
                                setValueValidation={setValueValidation}
                                duplicateKeyError={duplicateKeyError}
                                setDuplicateKeyError={setDuplicateKeyError}
                            />
                        </>

                        <div className="create-scheduler-form-element panel-margin">
                            <Autocomplete
                                className="create-scheduler-style"
                                options={dummyList}
                                //value={composerSelected}
                                //onChange={(_event, val) => handleComposerSelected(val)}
                                renderInput={params => (
                                    <TextField {...params} label="Service account" />
                                )}
                            //disabled={editMode}
                            />
                        </div>

                        <div className="create-job-scheduler-text-para create-job-scheduler-sub-title">
                            Network Configuration
                        </div>

                        <p>Establishes connectivity for VM instances in the cluster</p>

                        <div className="create-scheduler-form-element panel-margin">
                            <FormControl>
                                <RadioGroup
                                    aria-labelledby="demo-controlled-radio-buttons-group"
                                    name="controlled-radio-buttons-group"
                                    value={networkSelected}
                                    onChange={handleNetworkSelection}
                                >
                                    <FormControlLabel
                                        value="networkInThisProject"
                                        className="create-scheduler-label-style"
                                        control={<Radio size="small" />}
                                        label={
                                            <Typography sx={{ fontSize: 13 }}>
                                                Network in this project
                                            </Typography>
                                        }
                                    />
                                    <div>
                                        <span className="sub-para tab-text-sub-cl">Choose a shared VPC network from the project that is different from the clusters project</span>
                                        <LearnMore />
                                    </div>
                                    <FormControlLabel
                                        value="networkShared"
                                        className="create-scheduler-label-style"
                                        control={<Radio size="small" />}
                                        label={
                                            <Typography sx={{ fontSize: 13 }}>Network shared from host project</Typography>
                                        }
                                    />
                                    <span className="sub-para tab-text-sub-cl">Choose a shared VPC network from the project that is different from the clusters project</span>
                                    <LearnMore />
                                </RadioGroup>
                            </FormControl>
                        </div>

                        {/* Network in this project  */}
                        {
                            networkSelected === 'networkInThisProject' ?
                                <>
                                    <div className="execution-history-main-wrapper">
                                        <div className="create-scheduler-form-element create-scheduler-form-element-input-fl create-pr">
                                            <Autocomplete
                                                className="create-scheduler-style create-scheduler-form-element-input-fl"
                                                options={primaryNetworkList}
                                                value={primaryNetworkSelected}
                                                onChange={(_event, val) => handlePrimaryNetwork(val)}
                                                renderInput={params => (
                                                    <TextField {...params} label="Primary network" />
                                                )}
                                            //disabled={editMode}
                                            />
                                        </div>
                                        <div className="create-scheduler-form-element create-scheduler-form-element-input-fl">
                                            <Autocomplete
                                                className="create-scheduler-style create-scheduler-form-element-input-fl"
                                                options={subNetworkList}
                                                value={subNetworkSelected}
                                                onChange={(_event, val) => handleSubNetwork(val)}
                                                renderInput={params => (
                                                    <TextField {...params} label="Sub network" />
                                                )}
                                            //disabled={editMode}
                                            />
                                        </div>
                                    </div>

                                    <div className="create-scheduler-form-element">
                                        <Input
                                            className="create-scheduler-style"
                                            //value={jobNameSelected}
                                            //onChange={e => handleJobNameChange(e)}
                                            type="text"
                                            placeholder=""
                                            Label="Network tags"
                                        //disabled={editMode}
                                        />
                                    </div>
                                    <span className="tab-description tab-text-sub-cl">Network tabs are text attributes you can add to make firewall rules and routes applicable to specify VM instances</span>
                                </> :
                                <>
                                    {/* Network shared from host project */}
                                    <div className="create-scheduler-form-element">
                                        <Autocomplete
                                            className="create-scheduler-style"
                                            options={sharedNetworkList}
                                            value={sharedNetworkSelected}
                                            onChange={(_event, val) => handleSharedNetwork(val)}
                                            renderInput={params => (
                                                <TextField {...params} label="Share subnetwork" />
                                            )}
                                        //disabled={editMode}
                                        />
                                    </div>
                                </>
                        }

                        {/* <Scheduler /> */}
                        <div className="create-scheduler-label">Schedule</div>
                        <div className="create-scheduler-form-element">
                            <FormControl>
                                <RadioGroup
                                    aria-labelledby="demo-controlled-radio-buttons-group"
                                    name="controlled-radio-buttons-group"
                                    value={scheduleMode}
                                    onChange={handleSchedulerModeChange}
                                >
                                    <FormControlLabel
                                        value="runNow"
                                        className="create-scheduler-label-style"
                                        control={<Radio size="small" />}
                                        label={
                                            <Typography sx={{ fontSize: 13 }}>Run now</Typography>
                                        }
                                    />
                                    <FormControlLabel
                                        value="runSchedule"
                                        className="create-scheduler-label-style"
                                        control={<Radio size="small" />}
                                        label={
                                            <Typography sx={{ fontSize: 13 }}>
                                                Run on a schedule
                                            </Typography>
                                        }
                                    />
                                </RadioGroup>
                            </FormControl>
                        </div>
                        <div className="schedule-child-section">
                            {
                                scheduleMode === 'runSchedule' &&
                                <div className="create-scheduler-radio-element">
                                    <FormControl>
                                        <RadioGroup
                                            aria-labelledby="demo-controlled-radio-buttons-group"
                                            name="controlled-radio-buttons-group"
                                            value={internalScheduleMode}
                                            onChange={handleInternalSchedulerModeChange}
                                        >
                                            <FormControlLabel
                                                value="cronFormat"
                                                className="create-scheduler-label-style"
                                                control={<Radio size="small" />}
                                                label={
                                                    <Typography sx={{ fontSize: 13 }}>Use UNIX cron format</Typography>
                                                }
                                            />
                                            <FormControlLabel
                                                value="userFriendly"
                                                className="create-scheduler-label-style"
                                                control={<Radio size="small" />}
                                                label={
                                                    <Typography sx={{ fontSize: 13 }}>
                                                        Use user-friendly scheduler
                                                    </Typography>
                                                }
                                            />
                                        </RadioGroup>
                                    </FormControl>
                                </div>
                            }
                            {
                                scheduleMode === 'runSchedule' && internalScheduleMode === 'cronFormat' &&
                                <div className="create-scheduler-form-element schedule-input-field">
                                    <Input
                                        className="create-scheduler-style"
                                        value={scheduleField}
                                        onChange={e => handleSchedule(e)}
                                        type="text"
                                        placeholder=""
                                        Label="Schedule"
                                    />
                                    <span className="tab-description tab-text-sub-cl">Schedule is specified using unix-cron format. You can define a schedule so that your execution runs multiple times a day, or runs on specific days and months.</span>
                                </div>
                            }
                            {scheduleMode === 'runSchedule' && internalScheduleMode === 'userFriendly' && (
                                <>
                                    <div className="execution-history-main-wrapper">
                                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                                            <div className="create-scheduler-form-element create-scheduler-form-element-input-fl create-pr">
                                                <DateTimePicker
                                                    className="create-scheduler-style create-scheduler-form-element-input-fl"
                                                    label="Start Date"
                                                    value={startDate}
                                                    onChange={(newValue) => handleStartDate(newValue)}
                                                    slots={{
                                                        openPickerIcon: CalendarMonthIcon
                                                    }}
                                                    slotProps={{
                                                        actionBar: {
                                                            actions: ['clear']
                                                        },
                                                        tabs: {
                                                            hidden: true,
                                                        },
                                                    }}
                                                    minDate={minDateStart}
                                                    closeOnSelect={true}
                                                />
                                            </div>
                                            <div className="create-scheduler-form-element create-scheduler-form-element-input-fl create-pr">
                                                <DateTimePicker
                                                    className="create-scheduler-style create-scheduler-form-element-input-fl"
                                                    label="End Date"
                                                    value={endDate}
                                                    onChange={(newValue) => handleEndDate(newValue)}
                                                    slotProps={{
                                                        field: { clearable: true },
                                                        actionBar: {
                                                            actions: ['clear']
                                                        }
                                                    }}
                                                    minDate={minDateEnd}
                                                />
                                            </div>
                                        </LocalizationProvider>
                                    </div>
                                    {
                                        endDateError &&
                                        <div className="error-key-time">
                                            <iconError.react tag="div" className="logo-alignment-style" />
                                            <div className="error-key-missing">End date should be greater than Start date</div>
                                        </div>
                                    }
                                    <div className="create-scheduler-form-element">
                                        <Cron value={scheduleValue} setValue={setScheduleValue} />
                                    </div>
                                </>
                            )}
                            {
                                scheduleMode === 'runSchedule' &&
                                <>
                                    <div className="create-scheduler-form-element">
                                        <Autocomplete
                                            className="create-scheduler-style"
                                            options={timezones}
                                            value={timeZoneSelected}
                                            onChange={(_event, val) => handleTimeZoneSelected(val)}
                                            renderInput={params => (
                                                <TextField {...params} label="Time Zone" />
                                            )}
                                        />
                                    </div>
                                    <div className="create-scheduler-form-element">
                                        <Input
                                            className="create-scheduler-style"
                                            value={maxRuns}
                                            onChange={e => handleMaxRuns(e)}
                                            type="number"
                                            placeholder=""
                                            Label="Max runs"
                                        // disabled={scheduleMode === 'runNow'}
                                        />
                                    </div>
                                </>

                            }
                        </div>
                        <div className="save-overlay">
                            <Button
                                //onClick={
                                //() => {
                                //   if (!isSaveDisabled()) {
                                // handleCreateJobScheduler()}
                                //   }
                                // }}
                                variant="contained"
                                //disabled={isSaveDisabled()}
                                aria-label={editMode ? ' Update Schedule' : 'Create Schedule'}
                            >
                                <div>
                                    {editMode
                                        ? vertexScheduler
                                            ? 'UPDATING'
                                            : 'UPDATE'
                                        : vertexScheduler
                                            ? 'CREATING'
                                            : 'CREATE'}
                                </div>
                            </Button>
                            <Button
                                variant="outlined"
                                disabled={vertexScheduler}
                                aria-label="cancel Batch"
                                onClick={!vertexScheduler ? handleCancel : undefined}
                            >
                                <div>CANCEL</div>
                            </Button>
                        </div>

                    </div>
            }

        </>

    );
};

export default CreateVertexScheduler;

