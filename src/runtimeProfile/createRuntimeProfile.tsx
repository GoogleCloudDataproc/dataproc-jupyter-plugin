/**
 * @license
 * Copyright 2026 Google LLC
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
import { Controller, useForm } from 'react-hook-form';
import { JupyterLab } from '@jupyterlab/application';
import { IThemeManager, Notification } from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { LabIcon } from '@jupyterlab/ui-components';
import {
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField
} from '@mui/material';

import { DataprocWidget } from '../controls/DataprocWidget';
import LeftArrowIcon from '../../style/icons/left_arrow_icon.svg';
import expandLessIcon from '../../style/icons/expand_less.svg';
import expandMoreIcon from '../../style/icons/expand_more.svg';
import { SectionDetail, ISectionProperty } from '../controls/SectionDetail';
import '../../style/runtimeProfile.css';
import {
  IAutoscalingConfig,
  ICreateRuntimeProfilePayload,
  IDriverAndExecutorConfiguration,
  IDriverConfig,
  IExecutorDiskConfig,
  IMetastoreConfig,
  INetworkAndSecurityConfig,
  IRegionOption,
  IRuntimeEnvironmentConfig,
  ISessionLifecycleConfig,
  ProfileLabels,
  SparkProperties
} from './runtimeProfileInterface';
import {
  RuntimeProfileService,
  runtimeProfileService
} from './runtimeProfileService';

interface IRuntimeProfileFormData {
  displayName: string;
  region: string;
  description: string;
}

const iconLeftArrow = new LabIcon({
  name: 'launcher:left-arrow-icon',
  svgstr: LeftArrowIcon
});

const iconExpandLess = new LabIcon({
  name: 'launcher:expand-less-icon',
  svgstr: expandLessIcon
});

const iconExpandMore = new LabIcon({
  name: 'launcher:expand-more-icon',
  svgstr: expandMoreIcon
});

export const DEFAULT_RUNTIME_ENVIRONMENT_CONFIG: IRuntimeEnvironmentConfig = {
  runtimeProfileId: 'Name of the runtime profile',
  runtimeVersion: '2.3 LTS (Spark 3.5.1, Python 3.12)',
  customSparkImage: 'None',
  stagingBucket: 'Auto',
  pythonPackageRepository: 'Google Managed PyPI pull through cache'
};

export const DEFAULT_DRIVER_AND_EXECUTOR_CONFIG: IDriverAndExecutorConfiguration =
{
  tier: 'Standard',
  driverMachineType: 'Standard-4',
  driverDisk: 'standard persistent disk',
  executorType: 'standard',
  executorDisk: 'Standard persistent disk (HDD), 100 GB',
  machineType: 'Standard-4',
  disk: 'standard persistent disk',
  diskType: 'Standard persistent disk (HDD), 100 GB'
};

export const DEFAULT_DRIVER_CONFIG: IDriverConfig =
  DEFAULT_DRIVER_AND_EXECUTOR_CONFIG;

export const DEFAULT_EXECUTOR_DISK_CONFIG: IExecutorDiskConfig =
  DEFAULT_DRIVER_AND_EXECUTOR_CONFIG;

export const DEFAULT_AUTOSCALING_CONFIG: IAutoscalingConfig = {
  autoscalingEnabled: true,
  initialExecutors: 2,
  minExecutors: 2,
  maxExecutors: 10
};

export const DEFAULT_METASTORE_CONFIG: IMetastoreConfig = {
  metastore: 'Lakehouse runtime catalog',
  hiveEndpointEnabled: false
};

export const DEFAULT_NETWORK_SECURITY_CONFIG: INetworkAndSecurityConfig = {
  executionIdentity: 'service_account',
  networkInThisProject: 'default',
  encryption: 'google_managed'
};

export const DEFAULT_SESSION_LIFECYCLE_CONFIG: ISessionLifecycleConfig = {
  maxIdleTime: '60 minutes',
  maxSessionTime: '3 days'
};

export const DEFAULT_SPARK_PROPERTIES: SparkProperties = {};

export const DEFAULT_PROFILE_LABELS: ProfileLabels = {};

export const formatRuntimeEnvironmentProperties = (
  config?: IRuntimeEnvironmentConfig
): ISectionProperty[] => {
  if (!config) {
    return [];
  }
  return [
    {
      label: 'Runtime Profile ID',
      value: config.runtimeProfileId || 'Name of the runtime profile'
    },
    {
      label: 'Dataproc Runtime Version',
      value: config.runtimeVersion || '2.3 LTS (Spark 3.5.1, Python 3.12)'
    },
    {
      label: 'Custom spark image',
      value: config.customSparkImage || 'None'
    },
    {
      label: 'Cloud Storage Staging bucket',
      value: config.stagingBucket || 'Auto'
    },
    {
      label: 'Python package repository',
      value:
        config.pythonPackageRepository ||
        'Google Managed PyPI pull through cache'
    }
  ];
};

export const formatExecutorAndDriverProperties = (
  config?: IDriverAndExecutorConfiguration
): ISectionProperty[] => {
  if (!config) {
    return [];
  }
  return [
    {
      label: 'Tier',
      value: config.tier || 'Standard'
    },
    {
      label: 'Driver machine type',
      value: config.driverMachineType || config.machineType || 'Standard-4'
    },
    {
      label: 'Driver disk',
      value: config.driverDisk || config.disk || 'standard persistent disk'
    },
    {
      label: 'Executor type',
      value: config.executorType || 'standard'
    },
    {
      label: 'Executor disk',
      value:
        config.executorDisk ||
        config.diskType ||
        'Standard persistent disk (HDD), 100 GB'
    }
  ];
};

export const formatDriverAndExecutorProperties =
  formatExecutorAndDriverProperties;

export const formatDriverConfigProperties = (
  config?: IDriverConfig
): ISectionProperty[] => {
  if (!config) {
    return [];
  }
  return [
    {
      label: 'Machine type',
      value: config.driverMachineType || config.machineType || 'Standard-4'
    },
    {
      label: 'Disk',
      value: config.driverDisk || config.disk || 'standard persistent disk'
    }
  ];
};

export const formatExecutorDiskProperties = (
  config?: IExecutorDiskConfig
): ISectionProperty[] => {
  if (!config) {
    return [];
  }
  return [
    {
      label: 'Disk type',
      value:
        config.executorDisk ||
        config.diskType ||
        'Standard persistent disk (HDD), 100 GB'
    }
  ];
};

export const formatAutoscalingProperties = (
  config?: IAutoscalingConfig
): ISectionProperty[] => {
  if (!config) {
    return [];
  }
  return [
    {
      label: 'Autoscaling',
      value:
        config.autoscalingEnabled !== undefined
          ? config.autoscalingEnabled
            ? 'Enabled'
            : 'Disabled'
          : 'Enabled'
    },
    {
      label: 'Initial executors',
      value: config.initialExecutors ?? 2
    },
    {
      label: 'Minimum executors',
      value: config.minExecutors ?? 2
    },
    {
      label: 'Maximum executors',
      value: config.maxExecutors ?? 10
    }
  ];
};

export const formatMetastoreProperties = (
  config?: IMetastoreConfig
): ISectionProperty[] => {
  if (!config) {
    return [];
  }
  return [
    {
      label: 'Metastore',
      value: config.metastore || 'None'
    },
    {
      label: 'Hive endpoint',
      value:
        config.hiveEndpointEnabled !== undefined
          ? config.hiveEndpointEnabled
            ? 'Enabled'
            : 'Disabled'
          : 'Disabled'
    }
  ];
};

export const formatNetworkSecurityProperties = (
  config?: INetworkAndSecurityConfig
): ISectionProperty[] => {
  if (!config) {
    return [];
  }
  const executionIdentityDisplayMap: Record<string, string> = {
    service_account: 'Service account',
    user_account: 'User account'
  };
  const encryptionDisplayMap: Record<string, string> = {
    google_managed: 'Google-managed key',
    customer_managed_key: 'Customer-managed key'
  };
  return [
    {
      label: 'Execution identity',
      value:
        (config.executionIdentity &&
          executionIdentityDisplayMap[config.executionIdentity]) ||
        config.executionIdentity ||
        'Service account'
    },
    {
      label: 'Network in this project',
      value: config.networkInThisProject || 'default'
    },
    {
      label: 'Encryption',
      value:
        (config.encryption && encryptionDisplayMap[config.encryption]) ||
        config.encryption ||
        'Google-managed key'
    }
  ];
};

export const formatSessionLifecycleProperties = (
  config?: ISessionLifecycleConfig
): ISectionProperty[] => {
  if (!config) {
    return [];
  }
  return [
    {
      label: 'Maximum idle time',
      value: config.maxIdleTime || '60 minutes'
    },
    {
      label: 'Maximum session time',
      value: config.maxSessionTime || '3 days'
    }
  ];
};

export const formatSparkProperties = (
  properties?: SparkProperties
): ISectionProperty[] => {
  if (!properties || Object.keys(properties).length === 0) {
    return [
      {
        label: 'Spark properties',
        value: 'None'
      }
    ];
  }
  return Object.entries(properties).map(([key, value]) => ({
    label: key,
    value
  }));
};

export const formatOtherCustomizationProperties = (
  sparkProperties?: SparkProperties,
  labels?: ProfileLabels
): ISectionProperty[] => {
  const sparkEntries = sparkProperties ? Object.entries(sparkProperties) : [];
  const labelEntries = labels ? Object.entries(labels) : [];

  return [
    {
      label: 'Spark properties',
      value:
        sparkEntries.length === 0
          ? 'None'
          : sparkEntries.map(([k, v]) => `${k}: ${v}`).join(', ')
    },
    {
      label: 'Labels',
      value:
        labelEntries.length === 0
          ? 'None'
          : labelEntries.map(([k, v]) => `${k}: ${v}`).join(', ')
    }
  ];
};

export const formatProfileLabels = (
  labels?: ProfileLabels
): ISectionProperty[] => {
  if (!labels || Object.keys(labels).length === 0) {
    return [
      {
        label: 'Labels',
        value: 'None'
      }
    ];
  }
  return Object.entries(labels).map(([key, value]) => ({
    label: key,
    value
  }));
};

export interface IRuntimeEnvironmentSectionProps {
  config?: IRuntimeEnvironmentConfig;
  onEdit?: () => void;
  showEdit?: boolean;
  isEditDisabled?: boolean;
}

export const RuntimeEnvironmentSection: React.FC<
  IRuntimeEnvironmentSectionProps
> = ({ config, onEdit, showEdit = true, isEditDisabled = false }) => {
  const properties = React.useMemo(
    () => formatRuntimeEnvironmentProperties(config),
    [config]
  );
  return (
    <SectionDetail
      title="Runtime Environment"
      properties={properties}
      onEdit={onEdit}
      showEdit={showEdit}
      isEditDisabled={isEditDisabled}
    />
  );
};

export interface IExecutorAndDriverSectionProps {
  config?: IDriverAndExecutorConfiguration;
  onEdit?: () => void;
  showEdit?: boolean;
  isEditDisabled?: boolean;
}

export const ExecutorAndDriverSection: React.FC<
  IExecutorAndDriverSectionProps
> = ({ config, onEdit, showEdit = true, isEditDisabled = false }) => {
  const properties = React.useMemo(
    () => formatExecutorAndDriverProperties(config),
    [config]
  );
  return (
    <SectionDetail
      title="Executor & Driver Configuration"
      properties={properties}
      onEdit={onEdit}
      showEdit={showEdit}
      isEditDisabled={isEditDisabled}
    />
  );
};

export const DriverAndExecutorSection = ExecutorAndDriverSection;

export interface IDriverConfigSectionProps {
  config?: IDriverConfig;
  onEdit?: () => void;
  showEdit?: boolean;
  isEditDisabled?: boolean;
}

export const DriverConfigSection: React.FC<IDriverConfigSectionProps> = ({
  config,
  onEdit,
  showEdit = true,
  isEditDisabled = false
}) => {
  const properties = React.useMemo(
    () => formatDriverConfigProperties(config),
    [config]
  );
  return (
    <SectionDetail
      title="Driver Configuration"
      properties={properties}
      onEdit={onEdit}
      showEdit={showEdit}
      isEditDisabled={isEditDisabled}
    />
  );
};

export interface IExecutorDiskSectionProps {
  config?: IExecutorDiskConfig;
  onEdit?: () => void;
  showEdit?: boolean;
  isEditDisabled?: boolean;
}

export const ExecutorDiskSection: React.FC<IExecutorDiskSectionProps> = ({
  config,
  onEdit,
  showEdit = true,
  isEditDisabled = false
}) => {
  const properties = React.useMemo(
    () => formatExecutorDiskProperties(config),
    [config]
  );
  return (
    <SectionDetail
      title="Executor Disk"
      properties={properties}
      onEdit={onEdit}
      showEdit={showEdit}
      isEditDisabled={isEditDisabled}
    />
  );
};

export interface IAutoscalingSectionProps {
  config?: IAutoscalingConfig;
  onEdit?: () => void;
  showEdit?: boolean;
  isEditDisabled?: boolean;
}

export const AutoscalingSection: React.FC<IAutoscalingSectionProps> = ({
  config,
  onEdit,
  showEdit = true,
  isEditDisabled = false
}) => {
  const properties = React.useMemo(
    () => formatAutoscalingProperties(config),
    [config]
  );
  return (
    <SectionDetail
      title="Autoscaling"
      properties={properties}
      onEdit={onEdit}
      showEdit={showEdit}
      isEditDisabled={isEditDisabled}
    />
  );
};

export interface IMetastoreSectionProps {
  config?: IMetastoreConfig;
  onEdit?: () => void;
  showEdit?: boolean;
  isEditDisabled?: boolean;
}

export const MetastoreSection: React.FC<IMetastoreSectionProps> = ({
  config,
  onEdit,
  showEdit = true,
  isEditDisabled = false
}) => {
  const properties = React.useMemo(
    () => formatMetastoreProperties(config),
    [config]
  );
  return (
    <SectionDetail
      title="Metastore Configuration"
      properties={properties}
      onEdit={onEdit}
      showEdit={showEdit}
      isEditDisabled={isEditDisabled}
    />
  );
};

export interface INetworkSecuritySectionProps {
  config?: INetworkAndSecurityConfig;
  onEdit?: () => void;
  showEdit?: boolean;
  isEditDisabled?: boolean;
}

export const NetworkSecuritySection: React.FC<INetworkSecuritySectionProps> = ({
  config,
  onEdit,
  showEdit = true,
  isEditDisabled = false
}) => {
  const properties = React.useMemo(
    () => formatNetworkSecurityProperties(config),
    [config]
  );
  return (
    <SectionDetail
      title="Network and Security"
      properties={properties}
      onEdit={onEdit}
      showEdit={showEdit}
      isEditDisabled={isEditDisabled}
    />
  );
};

export interface ISessionLifecycleSectionProps {
  config?: ISessionLifecycleConfig;
  onEdit?: () => void;
  showEdit?: boolean;
  isEditDisabled?: boolean;
}

export const SessionLifecycleSection: React.FC<
  ISessionLifecycleSectionProps
> = ({ config, onEdit, showEdit = true, isEditDisabled = false }) => {
  const properties = React.useMemo(
    () => formatSessionLifecycleProperties(config),
    [config]
  );
  return (
    <SectionDetail
      title="Session Lifecycle"
      properties={properties}
      onEdit={onEdit}
      showEdit={showEdit}
      isEditDisabled={isEditDisabled}
    />
  );
};

export interface ISparkPropertiesSectionProps {
  properties?: SparkProperties;
  onEdit?: () => void;
  showEdit?: boolean;
  isEditDisabled?: boolean;
}

export const SparkPropertiesSection: React.FC<ISparkPropertiesSectionProps> = ({
  properties,
  onEdit,
  showEdit = true,
  isEditDisabled = false
}) => {
  const sectionProperties = React.useMemo(
    () => formatSparkProperties(properties),
    [properties]
  );
  return (
    <SectionDetail
      title="Spark Properties"
      properties={sectionProperties}
      onEdit={onEdit}
      showEdit={showEdit}
      isEditDisabled={isEditDisabled}
    />
  );
};

export interface IOtherCustomizationSectionProps {
  sparkProperties?: SparkProperties;
  labels?: ProfileLabels;
  onEdit?: () => void;
  showEdit?: boolean;
  isEditDisabled?: boolean;
}

export const OtherCustomizationSection: React.FC<
  IOtherCustomizationSectionProps
> = ({
  sparkProperties,
  labels,
  onEdit,
  showEdit = true,
  isEditDisabled = false
}) => {
    const properties = React.useMemo(
      () => formatOtherCustomizationProperties(sparkProperties, labels),
      [sparkProperties, labels]
    );
    return (
      <SectionDetail
        title="Other Customization"
        properties={properties}
        onEdit={onEdit}
        showEdit={showEdit}
        isEditDisabled={isEditDisabled}
      />
    );
  };

export interface IProfileLabelsSectionProps {
  labels?: ProfileLabels;
  onEdit?: () => void;
  showEdit?: boolean;
  isEditDisabled?: boolean;
}

export const ProfileLabelsSection: React.FC<IProfileLabelsSectionProps> = ({
  labels,
  onEdit,
  showEdit = true,
  isEditDisabled = false
}) => {
  const properties = React.useMemo(() => formatProfileLabels(labels), [labels]);
  return (
    <SectionDetail
      title="Labels"
      properties={properties}
      onEdit={onEdit}
      showEdit={showEdit}
      isEditDisabled={isEditDisabled}
    />
  );
};

export interface ICreateRuntimeProfileComponentProps {
  app?: JupyterLab;
  launcher?: ILauncher;
  themeManager?: IThemeManager;
  settingRegistry?: ISettingRegistry;
  service?: RuntimeProfileService;
  onBack?: () => void;
  onSuccess?: () => void;
  initialRuntimeEnvironmentConfig?: IRuntimeEnvironmentConfig;
  initialDriverAndExecutorConfiguration?: IDriverAndExecutorConfiguration;
  initialDriverConfig?: IDriverConfig;
  initialExecutorDiskConfig?: IExecutorDiskConfig;
  initialAutoscalingConfig?: IAutoscalingConfig;
  initialMetastoreConfig?: IMetastoreConfig;
  initialNetworkAndSecurityConfig?: INetworkAndSecurityConfig;
  initialSessionLifecycleConfig?: ISessionLifecycleConfig;
  initialSparkProperties?: SparkProperties;
  initialLabels?: ProfileLabels;
}

export const CreateRuntimeProfileComponent: React.FC<
  ICreateRuntimeProfileComponentProps
> = ({
  app,
  service = runtimeProfileService,
  onBack,
  onSuccess,
  initialRuntimeEnvironmentConfig,
  initialDriverAndExecutorConfiguration,
  initialDriverConfig,
  initialExecutorDiskConfig,
  initialAutoscalingConfig,
  initialMetastoreConfig,
  initialNetworkAndSecurityConfig,
  initialSessionLifecycleConfig,
  initialSparkProperties,
  initialLabels
}): React.JSX.Element => {
    // Options & Data State
    const [regions, setRegions] = useState<IRegionOption[]>([]);
    const [isLoadingOptions, setIsLoadingOptions] = useState<boolean>(true);
    const [expandAdditionalConfig, setExpandAdditionalConfig] =
      useState<boolean>(true);

    // Configuration states using domain interfaces
  const [runtimeEnvironmentConfig] = useState<IRuntimeEnvironmentConfig>(
    initialRuntimeEnvironmentConfig || DEFAULT_RUNTIME_ENVIRONMENT_CONFIG
  );
  const [driverAndExecutorConfiguration] =
    useState<IDriverAndExecutorConfiguration>(
      initialDriverAndExecutorConfiguration || {
        ...DEFAULT_DRIVER_AND_EXECUTOR_CONFIG,
        ...(initialDriverConfig || {}),
        ...(initialExecutorDiskConfig || {})
      }
    );
  const [autoscalingConfig] = useState<IAutoscalingConfig>(
    initialAutoscalingConfig || DEFAULT_AUTOSCALING_CONFIG
  );
  const [metastoreConfig] = useState<IMetastoreConfig>(
    initialMetastoreConfig || DEFAULT_METASTORE_CONFIG
  );
  const [networkAndSecurityConfig] = useState<INetworkAndSecurityConfig>(
    initialNetworkAndSecurityConfig || DEFAULT_NETWORK_SECURITY_CONFIG
  );
  const [sessionLifecycleConfig] = useState<ISessionLifecycleConfig>(
    initialSessionLifecycleConfig || DEFAULT_SESSION_LIFECYCLE_CONFIG
  );
  const [sparkProperties] = useState<SparkProperties>(
    initialSparkProperties || DEFAULT_SPARK_PROPERTIES
  );
  const [labels] = useState<ProfileLabels>(
    initialLabels || DEFAULT_PROFILE_LABELS
  );

    // React Hook Form initialization
    const {
      control,
      handleSubmit,
      setValue,
      formState: { errors, isSubmitting, isValid }
    } = useForm<IRuntimeProfileFormData>({
      mode: 'onChange',
      defaultValues: {
        displayName: '',
        region: '',
        description: ''
      }
    });

    // Load Regions from service
    useEffect(() => {
      let isMounted = true;
      const loadInitialData = async () => {
        setIsLoadingOptions(true);
        try {
          const loadedRegions = await service.getRegions();

          if (isMounted) {
            setRegions(loadedRegions);

            if (loadedRegions.length > 0) {
              setValue('region', loadedRegions[0].name, { shouldValidate: true });
            }
          }
        } catch (error) {
          console.error('Failed to load runtime profile initial data', error);
        } finally {
          if (isMounted) {
            setIsLoadingOptions(false);
          }
        }
      };

      loadInitialData();

      return () => {
        isMounted = false;
      };
    }, [service, setValue]);

    const handleBack = () => {
      if (onBack) {
        onBack();
      } else if (app?.shell?.activeWidget) {
        app.shell.activeWidget.close();
      }
    };

    const onSubmit = async (data: IRuntimeProfileFormData) => {
      try {
        const payload: ICreateRuntimeProfilePayload = {
          displayName: data.displayName.trim(),
          region: data.region,
          description: data.description.trim() || undefined,
          tier: driverAndExecutorConfiguration.tier,
          runtimeEnvironmentConfig,
          driverAndExecutorConfiguration,
          driverConfig: driverAndExecutorConfiguration,
          executorDiskConfig: driverAndExecutorConfiguration,
          autoscalingConfig,
          metastoreConfig,
          networkAndSecurityConfig,
          sessionLifecycleConfig,
          sparkProperties,
          labels
        };
        console.log("Payload", payload)

        await service.createRuntimeProfile(payload, undefined, data.region);

        Notification.emit(
          `Runtime profile "${data.displayName}" created successfully.`,
          'success',
          { autoClose: 5000 }
        );

        if (onSuccess) {
          onSuccess();
        } else {
          handleBack();
        }
      } catch (error: any) {
        const errorMessage =
          error?.message || 'Failed to create runtime profile.';
        Notification.emit(errorMessage, 'error', { autoClose: 5000 });
      }
    };

    return (
      <div className="runtime-profile-main-wrapper">
        <div className="cluster-details-header">
          <div
            className="back-arrow-icon"
            onClick={handleBack}
            role="button"
            tabIndex={0}
            aria-label="Back"
          >
            <iconLeftArrow.react
              tag="div"
              className="icon-white logo-alignment-style"
            />
          </div>
          <div className="cluster-details-title">Create a runtime profile</div>
        </div>

        <div className="runtime-profile-container">
          <div className="runtime-profile-intro-text">
            A runtime profile is a named, reusable set of Serverless Spark runtime
            settings — image version, engine identity, networking, autoscaling,
            libraries and more. Once you configure it you can use it to submit
            batches effortlessly.
          </div>

          <form className="runtime-profile-form" onSubmit={handleSubmit(onSubmit)}>
            {/* Row 1: Display name & Region */}
            <div className="runtime-profile-row">
              <div className="runtime-profile-col">
                <Controller
                  name="displayName"
                  control={control}
                  rules={{
                    required: 'Display name is required',
                    validate: value =>
                      value.trim().length > 0 || 'Display name is required'
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      id="runtime-profile-display-name"
                      label="Display name"
                      placeholder="e.g. my-runtime-profile"
                      variant="outlined"
                      size="small"
                      fullWidth
                      error={Boolean(errors.displayName)}
                      helperText={errors.displayName?.message}
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
              </div>
              <div className="runtime-profile-col">
                <FormControl size="small" fullWidth variant="outlined">
                  <InputLabel id="runtime-profile-region-label" shrink>
                    Region *
                  </InputLabel>
                  <Controller
                    name="region"
                    control={control}
                    rules={{ required: 'Region is required' }}
                    render={({ field }) => (
                      <Select
                        {...field}
                        labelId="runtime-profile-region-label"
                        id="runtime-profile-region"
                        label="Region *"
                        notched
                        disabled={isLoadingOptions}
                      >
                        {regions.map(r => (
                          <MenuItem key={r.name} value={r.name}>
                            {r.displayName}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                </FormControl>
              </div>
            </div>

            {/* Row 2: Description */}
            <div className="runtime-profile-full-row">
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    id="runtime-profile-description"
                    label="Description"
                    placeholder="Optional description"
                    variant="outlined"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
            </div>
            {/* TO DO:-
          Executor configuration
          API integration of the form fields
          Will be taken care as part of upcoming development task */}

            {/* Additional configuration (70% width) */}
            <div className="additional-config-section">
              <div
                className="additional-config-header-container"
                style={{
                  marginBottom: expandAdditionalConfig ? '16px' : '0px'
                }}
                onClick={() => setExpandAdditionalConfig(!expandAdditionalConfig)}
                role="button"
                tabIndex={0}
                aria-expanded={expandAdditionalConfig}
              >
                <div className="additional-config-header">
                  Additional configuration
                </div>
                <div
                  className="expand-icon"
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  {expandAdditionalConfig ? (
                    <iconExpandLess.react
                      tag="div"
                      className="logo-alignment-style"
                    />
                  ) : (
                    <iconExpandMore.react
                      tag="div"
                      className="logo-alignment-style"
                    />
                  )}
                </div>
              </div>

              {expandAdditionalConfig && (
                <div className="additional-config-content">
                  {/* Section 1: Runtime environment */}
                  <RuntimeEnvironmentSection
                    config={runtimeEnvironmentConfig}
                    onEdit={() => {
                      console.log('Edit Runtime Environment clicked');
                    }}
                  />

                  {/* Section 2: Executor & Driver Configuration */}
                  <ExecutorAndDriverSection
                    config={driverAndExecutorConfiguration}
                    onEdit={() => {
                      console.log(
                        'Edit Executor & Driver Configuration clicked'
                      );
                    }}
                  />

                  {/* Section 3: Autoscaling */}
                  <AutoscalingSection
                    config={autoscalingConfig}
                    onEdit={() => {
                      console.log('Edit Autoscaling clicked');
                    }}
                  />

                  {/* Section 4: Metastore */}
                  <MetastoreSection
                    config={metastoreConfig}
                    onEdit={() => {
                      console.log('Edit Metastore Configuration clicked');
                    }}
                  />

                  {/* Section 5: Network and Security */}
                  <NetworkSecuritySection
                    config={networkAndSecurityConfig}
                    onEdit={() => {
                      console.log('Edit Network and Security clicked');
                    }}
                  />

                  {/* Section 6: Session Lifecycle */}
                  <SessionLifecycleSection
                    config={sessionLifecycleConfig}
                    onEdit={() => {
                      console.log('Edit Session Lifecycle clicked');
                    }}
                  />

                  {/* Section 7: Other Customization */}
                  <OtherCustomizationSection
                    sparkProperties={sparkProperties}
                    labels={labels}
                    onEdit={() => {
                      console.log('Edit Other Customization clicked');
                    }}
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="runtime-profile-buttons">
              <button
                type="submit"
                disabled={!isValid || isSubmitting}
                className={
                  !isValid || isSubmitting
                    ? 'submit-button-disable-style'
                    : 'submit-button-style'
                }
              >
                {isSubmitting ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  'CREATE'
                )}
              </button>
              <button
                type="button"
                className="job-cancel-button-style"
                onClick={handleBack}
              >
                CANCEL
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

export class CreateRuntimeProfile extends DataprocWidget {
  app: JupyterLab;
  launcher: ILauncher;
  settingRegistry: ISettingRegistry;

  constructor(
    app: JupyterLab,
    launcher: ILauncher,
    themeManager: IThemeManager,
    settingRegistry: ISettingRegistry
  ) {
    super(themeManager);
    this.app = app;
    this.launcher = launcher;
    this.settingRegistry = settingRegistry;
  }

  renderInternal(): React.JSX.Element {
    return (
      <CreateRuntimeProfileComponent
        app={this.app}
        launcher={this.launcher}
        themeManager={this.themeManager}
        settingRegistry={this.settingRegistry}
      />
    );
  }
}

export { SectionDetail };

