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
import React, { useEffect, useState } from 'react';
import { IThemeManager } from '@jupyterlab/apputils';
import { JupyterLab } from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
    Autocomplete,
    TextField,
    Radio,
    Button,
    FormControl,
    RadioGroup,
    FormControlLabel,
    Typography,
    Box,
    CircularProgress
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { Cron } from 'react-js-cron';
import tzdata from 'tzdata';
import dayjs from 'dayjs';

import { Input } from '../../controls/MuiWrappedInput';
import { RegionDropdown } from '../../controls/RegionDropdown';
import { authApi } from '../../utils/utils';
import VertexScheduleJobs from './VertexScheduleJobs';
import { CORN_EXP_DOC_URL, DISK_TYPE_VALUE, internalScheduleMode, KERNEL_VALUE, scheduleMode, scheduleValueExpression } from '../../utils/const';
import LabelProperties from '../../jobs/labelProperties';
import LearnMore from '../common/LearnMore';
import ErrorMessage from '../common/ErrorMessage';
import { VertexServices } from '../../Services/Vertex';
import { ComputeServices } from '../../Services/Compute';
import { IamServices } from '../../Services/Iam';
import { StorageServices } from '../../Services/Storage';
import { AcceleratorConfig, IMachineType } from './VertexInterfaces';
import { toast } from 'react-toastify';

const CreateVertexScheduler = ({
    themeManager,
    app,
    settingRegistry,
    createCompleted,
    setCreateCompleted,
    jobNameSelected,
    setJobNameSelected,
    inputFileSelected,
    setInputFileSelected,
    editMode,
    setEditMode,
    setExecutionPageFlag
}: {
    themeManager: IThemeManager;
    app: JupyterLab;
    settingRegistry: ISettingRegistry;
    createCompleted: boolean;
    setCreateCompleted: React.Dispatch<React.SetStateAction<boolean>>;
    jobNameSelected: string;
    setJobNameSelected: React.Dispatch<React.SetStateAction<string>>;
    inputFileSelected: string;
    setInputFileSelected: React.Dispatch<React.SetStateAction<string>>;
    editMode: boolean;
    setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
    setExecutionPageFlag: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
    const [parameterDetail, setParameterDetail] = useState<string[]>([]);
    const [parameterDetailUpdated, setParameterDetailUpdated] = useState<string[]>([]);
    const [keyValidation, setKeyValidation] = useState(-1);
    const [valueValidation, setValueValidation] = useState(-1);
    const [duplicateKeyError, setDuplicateKeyError] = useState(-1);
    const [creatingVertexScheduler, setCreatingVertexScheduler] = useState<boolean>(false);

    const [machineTypeLoading, setMachineTypeLoading] = useState<boolean>(false)
    const [cloudStorageLoading, setCloudStorageLoading] = useState<boolean>(false)
    const [serviceAccountLoading, setServiceAccountLoading] = useState<boolean>(false)
    const [primaryNetworkLoading, setPrimaryNetworkLoading] = useState<boolean>(false)
    const [subNetworkLoading, setSubNetworkLoading] = useState<boolean>(false)
    const [sharedNetworkLoading, setSharedNetworkLoading] = useState<boolean>(false)

    const [jobId, setJobId] = useState<string>('');
    const [hostProject, setHostProject] = useState<string>('');
    const [region, setRegion] = useState<string>('');
    const [projectId, setProjectId] = useState<string>('');
    const [kernelSelected, setKernelSelected] = useState<string | null>(null);
    const [machineTypeList, setMachineTypeList] = useState<IMachineType[]>([]);
    const [machineTypeSelected, setMachineTypeSelected] = useState<string | null>(null);
    const [acceleratorType, setAcceleratorType] = useState<string | null>(null);
    const [acceleratedCount, setAcceleratedCount] = useState<string | null>(null);
    const [networkSelected, setNetworkSelected] = useState<string>('networkInThisProject');
    const [cloudStorageList, setCloudStorageList] = useState<string[]>([]);
    const [cloudStorage, setCloudStorage] = useState<string | null>(null);
    const [searchValue, setSearchValue] = useState<string>('');
    const [isCreatingNewBucket, setIsCreatingNewBucket] = useState(false);
    const [bucketError, setBucketError] = useState<string>('');
    const [diskTypeSelected, setDiskTypeSelected] = useState<string | null>(DISK_TYPE_VALUE[0]);
    const [diskSize, setDiskSize] = useState<string>('100');
    const [serviceAccountList, setServiceAccountList] = useState<{ displayName: string; email: string }[]>([]);
    const [serviceAccountSelected, setServiceAccountSelected] = useState<{ displayName: string; email: string } | null>(null);
    const [primaryNetworkList, setPrimaryNetworkList] = useState<{ name: string; link: string }[]>([]);
    const [primaryNetworkSelected, setPrimaryNetworkSelected] = useState<{ name: string; link: string } | null>(null);
    const [subNetworkList, setSubNetworkList] = useState<{ name: string; link: string }[]>([]);
    const [subNetworkSelected, setSubNetworkSelected] = useState<{ name: string; link: string } | null>(null);
    const [sharedNetworkList, setSharedNetworkList] = useState<{ name: string; network: string, subnetwork: string }[]>([]);
    const [sharedNetworkSelected, setSharedNetworkSelected] = useState<{ name: string; network: string, subnetwork: string } | null>(null);
    const [maxRuns, setMaxRuns] = useState<string>('');
    const [scheduleField, setScheduleField] = useState<string>('');
    const [scheduleMode, setScheduleMode] = useState<scheduleMode>('runNow');
    const [internalScheduleMode, setInternalScheduleMode] = useState<internalScheduleMode>('cronFormat');
    const [scheduleValue, setScheduleValue] = useState(scheduleValueExpression);
    const [timeZoneSelected, setTimeZoneSelected] = useState(
        Intl.DateTimeFormat().resolvedOptions().timeZone
    );
    const timezones = Object.keys(tzdata.zones).sort();
    const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(dayjs());
    const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(dayjs());
    const [endDateError, setEndDateError] = useState<boolean>(false)

    /**
    * Changing the region value and empyting the value of machineType, accelratorType and accelratorCount
    * @param {string} value selected region
    */
    const handleRegionChange = (value: React.SetStateAction<string>) => {
        setRegion(value)
        setMachineTypeSelected(null)
        setAcceleratedCount(null)
        setAcceleratorType(null)
    }

    /**
    * Handles Kernel selection
    * @param {React.SetStateAction<string | null>} kernelValue selected kernel
    */
    const handleKernel = (kernelValue: React.SetStateAction<string | null>) => {
        setKernelSelected(kernelValue)
    }

    /**
    * Handles Disk type selection
    * @param {React.SetStateAction<string | null>} diskValue selected Disk type
    */
    const handleDiskType = (diskValue: React.SetStateAction<string | null>) => {
        setDiskTypeSelected(diskValue)
    }

    /**
    * Setting the default value for Disk type when this field is empty
    */
    const handleDefaultDiskType = () => {
        setDiskTypeSelected(DISK_TYPE_VALUE[0])
    }

    /**
    * Handles Disk size selection
    * @param {React.ChangeEvent<HTMLInputElement>} e - The change event triggered by the input field.
    */
    const handleDiskSize = (e: React.ChangeEvent<HTMLInputElement>) => {
        const re = /^[1-9][0-9]*$/;
        if (e.target.value === '' || re.test(e.target.value)) {
            setDiskSize(e.target.value);
        }
    };

    /**
    * Handles changes to the Disk Size input field when it is empty.
    * @param {React.ChangeEvent<HTMLInputElement>} e - The change event triggered by the input field.
    */
    const handleDefaultDiskSize = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value === '') {
            setDiskSize('100');
        }
    };

    /**
    * Handles changes to the Schedule input field.
    * @param {React.ChangeEvent<HTMLInputElement>} e - The change event triggered by the input field.
    */
    const handleSchedule = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;

        // Prevent space as the first character
        if (newValue === '' || newValue[0] !== ' ' || scheduleField !== '') {
            setScheduleField(newValue);
        }
    }

    /**
     * Handles primary network selection.
     * @param {{ name: string; link: string; } | null} primaryValue - The selected network kernel or `null` if none is selected.
     */
    const handlePrimaryNetwork = (primaryValue: React.SetStateAction<{ name: string; link: string; } | null>) => {
        setPrimaryNetworkSelected(primaryValue)
        subNetworkAPI(primaryValue?.name)
    }

    /**
    * Handles Service account selection
    * @param {{ displayName: string; email: string; } | null} value selected service account
    */
    const handleServiceAccountChange = (value: { displayName: string; email: string; } | ((prevState: { displayName: string; email: string; } | null) => { displayName: string; email: string; } | null) | null) => {
        setServiceAccountSelected(value);
    };

    /**
    * Handles Sub Network selection
    * @param {{ name: string; link: string; } | null} subNetworkValue - The selected network kernel or `null` if none is selected.
    */
    const handleSubNetwork = (subNetworkValue: React.SetStateAction<{ name: string; link: string; } | null>) => {
        setSubNetworkSelected(subNetworkValue)
    }

    /**
    * Handles Shared Network selection
    * @param {{ name: string; network: string; subnetwork: string; } | null} shredNetworkValue - The selected network kernel or `null` if none is selected.
    */
    const handleSharedNetwork = (shredNetworkValue: React.SetStateAction<{ name: string; network: string; subnetwork: string; } | null>) => {
        setSharedNetworkSelected(shredNetworkValue)
    }

    /** 
     * Creates a new cloud storage bucket.
     * It calls an API to create the bucket, updates the state with the bucket name,
     * and then refetches the list of cloud storage buckets.
     */
    const createNewBucket = () => {
        if (!searchValue.trim()) {
            // If search value is empty
            return;
        }
        // calling an API to create a new cloud storage bucket here
        newCloudStorageAPI()
        // Reset the cloud storage value
        setCloudStorage(searchValue);
        // fetch the cloud storage API again to list down all the values with newly created bucket name
        cloudStorageAPI()
    };

    /**
    * Handles Cloud storage selection
    * @param {React.SetStateAction<string | null>} value - Selected cloud storage or "Create and Select" option.
    * @returns {void}
    */
    const handleCloudStorageSelected = (value: string | null) => {
        if (value === `Create and Select "${searchValue}"`) {
            createNewBucket();
        } else {
            setCloudStorage(value);
        }
    };

    /**
     * Handles the change in the search input value.
     * Updates the search value state based on the user's input.
     *
     * @param {React.ChangeEvent<{}>} event - The event triggered by the input field change.
     * @param {string} newValue - The new value entered by the user in the search field.
     */
    const handleSearchChange = (event: React.ChangeEvent<{}>, newValue: string) => {
        setSearchValue(newValue);
    };

    /**
     * Filters the cloud storage bucket options based on the user's search input.
     * If no matches are found, adds the option to create a new bucket.
     * @param {string[]} options - The list of available cloud storage buckets.
     * @param {any} state - The state object containing the search input value.
     */
    const filterOptions = (options: string[], state: any) => {
        // Filter out the list based on the search value
        const filteredOptions = options.filter(option =>
            option.toLowerCase().includes(state.inputValue.toLowerCase())
        );

        // If no match found, add the "Create new bucket" option
        if (filteredOptions.length === 0 && state.inputValue.trim() !== '') {
            filteredOptions.push(`Create and Select "${searchValue}"`);
        }

        return filteredOptions;
    };

    /**
    * Handles Machine type selection
    * @param {React.SetStateAction<string | null>} machineType selected machine type
    */
    const handleMachineType = (machineType: React.SetStateAction<string | null>) => {
        setMachineTypeSelected(machineType)
        setAcceleratedCount(null)
        setAcceleratorType(null)
    }

    /**
    * Handles changes to the Max Runs input field.
    * @param {React.ChangeEvent<HTMLInputElement>} e - The change event triggered by the input field.
    */
    const handleMaxRuns = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Regular expression to validate positive integers without leading zeros
        const re = /^[1-9][0-9]*$/;
        if (e.target.value === '' || re.test(e.target.value)) {
            setMaxRuns(e.target.value);
        }
    };

    /**
    * Handles Acceleration Type listing
    * @param {AcceleratorConfig} acceleratorConfig acceleratorConfigs data
    */
    const getAcceleratedType = (acceleratorConfig: AcceleratorConfig[]) => {
        return acceleratorConfig.map((item: { acceleratorType: string; }) => item.acceleratorType);
    }

    /**
    * Handles Acceleration Type selection
    * @param {React.SetStateAction<string | null>} acceleratorType accelerationType selected
    */
    const handleAccelerationType = (acceleratorType: React.SetStateAction<string | null>) => {
        setAcceleratorType(acceleratorType);
    }

    /**
    * Handles Acceleration Count selection
    * @param {React.SetStateAction<string | null>} acceleratorCount accelerationType count selected
    */
    const handleAcceleratorCount = (acceleratorCount: React.SetStateAction<string | null>) => {
        setAcceleratedCount(acceleratorCount);
    }

    /**
    * Handles Network selection
    * @param {{ target: { value: React.SetStateAction<string>; }; }} eventValue network selected
    */
    const handleNetworkSelection = (eventValue: { target: { value: React.SetStateAction<string>; }; }) => {
        if (networkSelected === 'networkInThisProject') {
            setSharedNetworkSelected(null)
        } if (networkSelected === 'networkShared') {
            setPrimaryNetworkSelected(null)
            setSubNetworkSelected(null)
        }
        setNetworkSelected(eventValue.target.value);
    }

    /**
    * Handles start date selection and set the endDateError to true if end date is greater than start date
    * @param {string | null | any} val Start date selected
    */
    const handleStartDate = (val: string | null | any) => {
        const startDateValue = dayjs(val.$d); // Ensure it's a dayjs object
        setStartDate(startDateValue);
        if (val && endDate && dayjs(endDate).isBefore(dayjs(val))) {
            setEndDateError(true);
        } else {
            setEndDateError(false);
        }
    }

    /**
    * Handles end date selection and set the endDateError to true if end date is greater than start date
    * @param {string | null | any} val End date selected
    */
    const handleEndDate = (val: string | null | any) => {
        const endDateValue = dayjs(val.$d);
        if (startDate && (dayjs(val).isBefore(dayjs(startDate)) || dayjs(val).isSame(dayjs(startDate), 'minute'))) {
            setEndDateError(true);
        } else {
            setEndDateError(false);
        }
        setEndDate(endDateValue)
    }

    /**
    * Handles schedule mode selection
    * @param {React.ChangeEvent<HTMLInputElement>} event - The change event triggered by the radio button field.
    */
    const handleSchedulerModeChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const newValue = (event.target as HTMLInputElement).value;
        setScheduleMode(newValue as scheduleMode);
        if (newValue === 'runNow') {
            setStartDate(null)
            setEndDate(null)
            setScheduleField('')
        }
        if (newValue === 'runSchedule' && scheduleValue === '') {
            setScheduleValue(scheduleField);
        }
        if (newValue === 'runSchedule') {
            setInternalScheduleMode("cronFormat");
        }
    };

    /**
    * Handles Internal schedule mode selection
    * @param {React.ChangeEvent<HTMLInputElement>} event - The change event triggered by the radio button field.
    */
    const handleInternalSchedulerModeChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const newValue = (event.target as HTMLInputElement).value;
        if (newValue === 'userFriendly') {
            setScheduleValue(scheduleValueExpression);
        } if (newValue === 'cronFormat') {
            setScheduleField('')
        }
        setInternalScheduleMode(newValue as internalScheduleMode);
        setStartDate(null)
        setEndDate(null)
        setMaxRuns('')
    };

    /**
    * Handles Time zone selection
    * @param {string | null} data time zone selected
    */
    const handleTimeZoneSelected = (data: string | null) => {
        if (data) {
            const selectedTimeZone = data.toString();
            setTimeZoneSelected(selectedTimeZone);
        }
    };

    /**
    * Hosts the parent project API service
    */
    const hostProjectAPI = async () => {
        await ComputeServices.getParentProjectAPIService(setHostProject);
    };

    /**
    * Hosts the machine type API service
    */
    const machineTypeAPI = async () => {
        await VertexServices.machineTypeAPIService(region, setMachineTypeList, setMachineTypeLoading);
    };

    /**
    * Hosts the cloud storage API service
    */
    const cloudStorageAPI = async () => {
        await StorageServices.cloudStorageAPIService(setCloudStorageList, setCloudStorageLoading);
    };

    /**
    * To create the new cloud storage bucket API service
    */
    const newCloudStorageAPI = async () => {
        await StorageServices.newCloudStorageAPIService(searchValue, setIsCreatingNewBucket, setBucketError);
    };

    /**
    * Hosts the service account API service
    */
    const serviceAccountAPI = async () => {
        await IamServices.serviceAccountAPIService(setServiceAccountList, setServiceAccountLoading);
    };

    /**
    * Hosts the primary network API service
    */
    const primaryNetworkAPI = async () => {
        await ComputeServices.primaryNetworkAPIService(setPrimaryNetworkList, setPrimaryNetworkLoading);
    };

    /**
    * Hosts the sub network API service based on the primary network
    */
    const subNetworkAPI = async (primaryNetwork: string | undefined) => {
        await ComputeServices.subNetworkAPIService(region, primaryNetwork, setSubNetworkList, setSubNetworkLoading);
    };

    /**
    * Hosts the shared network API service
    */
    const sharedNetworkAPI = async () => {
        await ComputeServices.sharedNetworkAPIService(setSharedNetworkList, setSharedNetworkLoading);
    };

    const selectedMachineType = machineTypeList && machineTypeList.find((item) => item.machineType === machineTypeSelected);
    /**
    * Disable the create button when the mandatory fields are not filled and the validations is not proper.
    */
    const isSaveDisabled = () => {
        return (
            !selectedMachineType ||
            selectedMachineType.acceleratorConfigs !== null && !(acceleratorType && acceleratedCount) ||
            jobNameSelected === '' ||
            region === null ||
            creatingVertexScheduler ||
            machineTypeSelected === null ||
            kernelSelected === null ||
            cloudStorage === null ||
            serviceAccountSelected === null ||
            (parameterDetailUpdated.some(item => item.length === 1)) ||
            (networkSelected === 'networkInThisProject' && (primaryNetworkSelected === null || subNetworkSelected === null)) ||
            (networkSelected === 'networkShared' && (sharedNetworkSelected === null)) ||
            ((scheduleMode === 'runSchedule' && internalScheduleMode === 'cronFormat') && (scheduleField === '')) ||
            inputFileSelected === '' || endDateError
        );
    };

    /**
    * Handles the schedule mode for the schedule_value field
    */
    const getScheduleValues = () => {
        if (scheduleMode === 'runNow') {
            return ''
        } if (scheduleMode === 'runSchedule' && internalScheduleMode === 'cronFormat') {
            return scheduleField
        } if (scheduleMode === 'runSchedule' && internalScheduleMode === 'userFriendly') {
            return scheduleValue
        }
    }

    /**
    * Create a job schedule
    */
    const handleCreateJobScheduler = async () => {
        const payload = {
            input_filename: inputFileSelected,
            display_name: jobNameSelected,
            machine_type: machineTypeSelected,
            accelerator_type: acceleratorType,
            accelerator_count: acceleratedCount,
            kernel_name: kernelSelected,
            schedule_value: getScheduleValues(),
            time_zone: timeZoneSelected,
            max_run_count: scheduleMode === 'runNow' ? 1 : maxRuns,
            region: region,
            cloud_storage_bucket: `gs://${cloudStorage}`,
            parameters: parameterDetailUpdated,
            service_account: serviceAccountSelected?.email,
            network: networkSelected === "networkInThisProject" ? (editMode? primaryNetworkSelected?.link : primaryNetworkSelected?.link.split('/v1/')[1]) : sharedNetworkSelected?.network.split('/v1/')[1],
            subnetwork: networkSelected === "networkInThisProject" ? (editMode ? subNetworkSelected?.link : subNetworkSelected?.link.split('/v1/')[1]) : sharedNetworkSelected?.subnetwork.split('/v1/')[1],
            start_time: startDate,
            end_time: endDate,
            disk_type: diskTypeSelected,
            disk_size: diskSize
        }

        if (editMode) {
            await VertexServices.editVertexJobSchedulerService(
                jobId,
                region,
                payload,
                setCreateCompleted,
                setCreatingVertexScheduler,
            );
        } else {
            await VertexServices.createVertexSchedulerService(
                payload,
                setCreateCompleted,
                setCreatingVertexScheduler,
            );
        }
        setEditMode(false);
    }

    /**
    * Cancel a job schedule
    */
    const handleCancel = async () => {
        if (!editMode) {
            setCreateCompleted(false);
            app.shell.activeWidget?.close();
        } else {
            setCreateCompleted(true);
        }
    };

    useEffect(() => {
        setServiceAccountSelected(serviceAccountList[0])
    }, [serviceAccountList.length > 0]);

    useEffect(() => {
        if (parameterDetail.length > 0) {
            setParameterDetail(prevDetails => [...prevDetails, ...parameterDetail]);
            setParameterDetailUpdated(prevDetails => [...prevDetails, ...parameterDetailUpdated]);
        }
    }, [createCompleted]);

    useEffect(() => {
        if (region !== '') {
            machineTypeAPI()
        }
        if (Object.keys(hostProject).length > 0) {
            sharedNetworkAPI()
        }
        hostProjectAPI()
        cloudStorageAPI()
        serviceAccountAPI()
        primaryNetworkAPI()
        authApi()
            .then((credentials) => {
                if (credentials && credentials?.region_id && credentials.project_id) {
                    setRegion(credentials.region_id);
                    setProjectId(credentials.project_id);
                }
            })
            .catch((error) => {
                toast.error(error);
            });
    }, [projectId]);

    useEffect(() => {
        if (editMode && machineTypeSelected) {
            const matchedMachine = machineTypeList.find(item => item.machineType.includes(machineTypeSelected))
            if (matchedMachine) {
                setMachineTypeSelected(matchedMachine.machineType);
            }
        }
    }, [editMode]);

    useEffect(() => {
        if(editMode) {
            setStartDate(null);
            setEndDate(null);
        }
    },[])

    return (
        <>
            {
                createCompleted ?
                    <VertexScheduleJobs
                        app={app}
                        themeManager={themeManager}
                        settingRegistry={settingRegistry}
                        setJobId={setJobId}
                        setExecutionPageFlag={setExecutionPageFlag}
                        setCreateCompleted={setCreateCompleted}
                        setInputFileSelected={setInputFileSelected}
                        region={region}
                        setRegion={setRegion}
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
                        setJobNameSelected={setJobNameSelected}
                        setServiceAccountList={setServiceAccountList}
                        setPrimaryNetworkList={setPrimaryNetworkList}
                        setNetworkSelected={setNetworkSelected}
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
                        {
                            !region && <ErrorMessage message="Region is required" />
                        }
                        <div className="create-scheduler-form-element">
                            <Autocomplete
                                className="create-scheduler-style"
                                options={machineTypeList && machineTypeList.map((item) => item.machineType)}
                                value={machineTypeSelected}
                                onChange={(_event, val) => handleMachineType(val)}
                                renderInput={params => (
                                    <TextField {...params} label="Machine type*" />
                                )}
                                clearIcon={false}
                                loading={machineTypeLoading}
                            />
                        </div>
                        {
                            !machineTypeSelected && <ErrorMessage message="Machine type is required" />
                        }

                        {
                            machineTypeList.length > 0 && machineTypeList.map((item) => {
                                if (("acceleratorConfigs" in item && item.machineType === machineTypeSelected && item.acceleratorConfigs !== null) || ("acceleratorConfigs" in item && machineTypeSelected && item.machineType.split(' ')[0] === machineTypeSelected && item.acceleratorConfigs !== null)) {
                                    return (
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
                                                />
                                                {
                                                    !acceleratorType && <ErrorMessage message="Accelerator type is required" />
                                                }
                                            </div>

                                            {
                                                item?.acceleratorConfigs?.map((element: { allowedCounts: number[]; acceleratorType: string; }) => {
                                                    return (
                                                        <>
                                                            {
                                                                element.acceleratorType === acceleratorType ?
                                                                    <div className="create-scheduler-form-element create-scheduler-form-element-input-fl">
                                                                        <Autocomplete
                                                                            className="create-scheduler-style create-scheduler-form-element-input-fl"
                                                                            options={element.allowedCounts.map(item => item.toString())}
                                                                            value={acceleratedCount}
                                                                            onChange={(_event, val) => handleAcceleratorCount(val)}
                                                                            renderInput={params => (
                                                                                <TextField {...params} label="Accelerator count*" />
                                                                            )}
                                                                        />
                                                                        {
                                                                            !acceleratedCount && <ErrorMessage message="Accelerator count is required" />
                                                                        }
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
                                options={KERNEL_VALUE}
                                value={kernelSelected}
                                onChange={(_event, val) => handleKernel(val)}
                                renderInput={params => (
                                    <TextField {...params} label="Kernel*" />
                                )}
                                clearIcon={false}
                            />
                        </div>
                        {
                            !kernelSelected && <ErrorMessage message="Kernel is required" />
                        }

                        <div className="create-scheduler-form-element">
                            <Autocomplete
                                className="create-scheduler-style"
                                options={cloudStorageList}
                                value={cloudStorage}
                                onChange={(_event, val) => handleCloudStorageSelected(val)}
                                onInputChange={handleSearchChange}
                                filterOptions={filterOptions}
                                renderInput={params => (
                                    <TextField
                                        {...params}
                                        label="Cloud Storage Bucket*"
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <>
                                                    {isCreatingNewBucket ? (
                                                        <CircularProgress aria-label="Loading Spinner"
                                                            data-testid="loader" size={18} />
                                                    ) : null}
                                                    {params.InputProps.endAdornment}
                                                </>
                                            ),
                                        }}
                                    />
                                )}
                                clearIcon={false}
                                loading={cloudStorageLoading}
                                getOptionLabel={(option) => option}
                                renderOption={(props, option) => {
                                    // Custom rendering for the "Create new bucket" option
                                    if (option === `Create and Select`) {
                                        return (
                                            <li {...props} className='custom-add-bucket'>
                                                {option}
                                            </li>
                                        );
                                    }

                                    return <li {...props}>{option}</li>;
                                }}
                            />
                        </div>
                        {
                            !cloudStorage && <ErrorMessage message="Cloud storage bucket is required" />
                        }
                        <span className="tab-description tab-text-sub-cl">
                            {
                                bucketError && bucketError !== "" ?
                                    <span className='error-message'>{bucketError}</span> :
                                    <span>Where results are stored. Select an existing bucket or create a new one.</span>
                            }
                        </span>
                        <div className="execution-history-main-wrapper">
                            <div className="create-scheduler-form-element create-scheduler-form-element-input-fl create-pr">
                                <Autocomplete
                                    className="create-scheduler-style create-scheduler-form-element-input-fl"
                                    options={DISK_TYPE_VALUE}
                                    value={diskTypeSelected}
                                    onChange={(_event, val) => handleDiskType(val)}
                                    renderInput={params => (
                                        <TextField {...params} label="Disk Type" />
                                    )}
                                    onBlur={() => handleDefaultDiskType()}
                                    clearIcon={false}
                                />
                            </div>
                            <div className="create-scheduler-form-element create-scheduler-form-element-input-fl create-pr">
                                <Input
                                    className="create-scheduler-style create-scheduler-form-element-input-fl"
                                    value={diskSize}
                                    onChange={e => handleDiskSize(e)}
                                    onBlur={(e: React.ChangeEvent<HTMLInputElement>) => handleDefaultDiskSize(e)}
                                    type="number"
                                    placeholder=""
                                    Label="Disk Size (in GB)"
                                />
                            </div>
                        </div>
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

                        <div className="create-scheduler-form-element panel-margin">
                            <Autocomplete
                                className="create-scheduler-style-trigger"
                                options={serviceAccountList}
                                getOptionLabel={option => option.displayName}
                                value={
                                    serviceAccountList.find(
                                        option => option.email === serviceAccountSelected?.email
                                    ) || null
                                }
                                clearIcon={false}
                                loading={serviceAccountLoading}
                                onChange={(_event, val) => handleServiceAccountChange(val)}
                                renderInput={params => (
                                    <TextField {...params} label="Service account*" />
                                )}
                                renderOption={(props, option) => (
                                    <Box
                                        component="li"
                                        {...props}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'flex-start'
                                        }}
                                    >
                                        <Typography variant="body1">
                                            {option.displayName}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            {option.email}
                                        </Typography>
                                    </Box>
                                )}
                            />
                        </div>
                        {
                            !serviceAccountSelected && <ErrorMessage message="Service account is required" />
                        }
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
                                        <div className="learn-more-a-tag learn-more-url">
                                            <LearnMore />
                                        </div>
                                    </div>
                                    <FormControlLabel
                                        value="networkShared"
                                        className="create-scheduler-label-style"
                                        control={<Radio size="small" />}
                                        label={
                                            <Typography sx={{ fontSize: 13 }}>Network shared from host project {`${Object.keys(hostProject).length !== 0 ? `"${hostProject}"` : ''}`}</Typography>
                                        }
                                    />
                                    <span className="sub-para tab-text-sub-cl">Choose a shared VPC network from the project that is different from the clusters project</span>
                                    <div className="learn-more-a-tag learn-more-url">
                                        <LearnMore />
                                    </div>
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
                                                getOptionLabel={option => option.name}
                                                value={primaryNetworkList.find(
                                                    option => option.name === primaryNetworkSelected?.name
                                                ) || null}
                                                onChange={(_event, val) => handlePrimaryNetwork(val)}
                                                renderInput={params => (
                                                    <TextField {...params} label="Primary network*" />
                                                )}
                                                clearIcon={false}
                                                loading={primaryNetworkLoading}
                                            />
                                            {
                                                !primaryNetworkSelected && <ErrorMessage message="Primary network is required" />
                                            }
                                        </div>
                                        <div className="create-scheduler-form-element create-scheduler-form-element-input-fl">
                                            <Autocomplete
                                                className="create-scheduler-style create-scheduler-form-element-input-fl"
                                                options={subNetworkList}
                                                getOptionLabel={option => option.name}
                                                value={subNetworkList.find(
                                                    option => option.name === subNetworkSelected?.name
                                                ) || null}
                                                onChange={(_event, val) => handleSubNetwork(val)}
                                                renderInput={params => (
                                                    <TextField {...params} label="Sub network*" />
                                                )}
                                                clearIcon={false}
                                                loading={subNetworkLoading}
                                            />
                                            {
                                                !subNetworkSelected && <ErrorMessage message="Sub network is required" />
                                            }
                                        </div>
                                    </div>
                                </> :
                                <>
                                    {/* Network shared from host project */}
                                    <div className="create-scheduler-form-element">
                                        <Autocomplete
                                            className="create-scheduler-style"
                                            options={sharedNetworkList}
                                            getOptionLabel={option => option.name}
                                            value={sharedNetworkList.find(
                                                option => option.name === sharedNetworkSelected?.name
                                            ) || null}
                                            onChange={(_event, val) => handleSharedNetwork(val)}
                                            renderInput={params => (
                                                <TextField {...params} label="Shared subnetwork*" />
                                            )}
                                            clearIcon={false}
                                            loading={sharedNetworkLoading}
                                            disabled={Object.keys(hostProject).length === 0}
                                        />
                                    </div>
                                    {Object.keys(hostProject).length === 0 && (
                                        <ErrorMessage message="No shared subnetworks are available in this region." />
                                    )}
                                </>
                        }
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
                                scheduleMode === 'runSchedule' &&
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
                                                    textField: {
                                                        error: false,
                                                    },
                                                }}
                                                disablePast
                                                closeOnSelect={true}
                                            />
                                        </div>
                                        <div className="create-scheduler-form-element create-scheduler-form-element-input-fl create-pr">
                                            <DateTimePicker
                                                className="create-scheduler-style create-scheduler-form-element-input-fl"
                                                label="End Date"
                                                value={endDate}
                                                onChange={(newValue) => handleEndDate(newValue)}
                                                slots={{
                                                    openPickerIcon: CalendarMonthIcon
                                                }}
                                                slotProps={{
                                                    actionBar: {
                                                        actions: ['clear']
                                                    },
                                                    field: { clearable: true },
                                                    tabs: {
                                                        hidden: true,
                                                    },
                                                    textField: {
                                                        error: false,
                                                    },
                                                }}
                                                disablePast
                                                closeOnSelect={true}
                                            />
                                            {
                                                endDateError &&
                                                <ErrorMessage message="End date should be greater than Start date" />
                                            }
                                        </div>
                                    </LocalizationProvider>
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
                                        Label="Schedule*"
                                    />
                                    {
                                        scheduleField === '' &&
                                        <ErrorMessage message="Schedule field is required" />
                                    }
                                    <div>
                                        <span className="tab-description tab-text-sub-cl">Schedules are specified using unix-cron format. E.g. every minute: "* * * * *", every 3 hours: "0 */3 * * *", every Monday at 9:00: "0 9 * * 1".
                                        </span>
                                        <div className="learn-more-url">
                                            <LearnMore path={CORN_EXP_DOC_URL} />
                                        </div>
                                    </div>
                                </div>
                            }
                            {scheduleMode === 'runSchedule' && internalScheduleMode === 'userFriendly' && (
                                <div className="create-scheduler-form-element">
                                    <Cron value={scheduleValue} setValue={setScheduleValue} />
                                </div>
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
                                                <TextField {...params} label="Time Zone*" />
                                            )}
                                            clearIcon={false}
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
                                        />
                                    </div>
                                </>

                            }
                        </div>
                        <div className="save-overlay">
                            <Button
                                onClick={() => handleCreateJobScheduler()}
                                variant="contained"
                                disabled={isSaveDisabled()}
                                aria-label={editMode ? ' Update Schedule' : 'Create Schedule'}
                            >
                                <div>
                                    {editMode
                                        ? creatingVertexScheduler
                                            ? 'UPDATING'
                                            : 'UPDATE'
                                        : creatingVertexScheduler
                                            ? 'CREATING'
                                            : 'CREATE'}
                                </div>
                            </Button>
                            <Button
                                variant="outlined"
                                disabled={creatingVertexScheduler}
                                aria-label="cancel Batch"
                                onClick={!creatingVertexScheduler ? handleCancel : undefined}
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

