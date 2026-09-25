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

import React, { useEffect, useMemo, useState } from 'react';
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
  IExecutorAndDriverConfig,
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

const EXECUTION_IDENTITY_DISPLAY_MAP: Record<string, string> = {
  service_account: 'Service account',
  user_account: 'User account'
};

const ENCRYPTION_DISPLAY_MAP: Record<string, string> = {
  google_managed: 'Google-managed key',
  customer_managed_key: 'Customer-managed key'
};

/**
 * Initial default Serverless Spark runtime configuration for a new Runtime Profile.
 * Note: Dynamic options (such as staging buckets, subnetworks, metastore instances,
 * and service accounts) will be fetched from the backend APIs in subsequent
 * edit-drawer and API-integration PRs.
 */
export const DEFAULT_RUNTIME_ENVIRONMENT_CONFIG: IRuntimeEnvironmentConfig = {
  runtimeProfileId: 'Name of the runtime profile',
  runtimeVersion: '2.3 LTS (Spark 3.5.1, Python 3.12)',
  customSparkImage: 'None',
  stagingBucket: 'Auto',
  pythonPackageRepository: 'Google Managed PyPI pull through cache'
};

export const DEFAULT_EXECUTOR_AND_DRIVER_CONFIG: IExecutorAndDriverConfig = {
  tier: 'Standard',
  driverMachineType: 'Standard-4',
  driverDisk: 'standard persistent disk',
  executorType: 'standard',
  executorDisk: 'Standard persistent disk (HDD), 100 GB'
};

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
      value:
        config.runtimeProfileId ||
        DEFAULT_RUNTIME_ENVIRONMENT_CONFIG.runtimeProfileId
    },
    {
      label: 'Dataproc Runtime Version',
      value:
        config.runtimeVersion ||
        DEFAULT_RUNTIME_ENVIRONMENT_CONFIG.runtimeVersion
    },
    {
      label: 'Custom spark image',
      value:
        config.customSparkImage ||
        DEFAULT_RUNTIME_ENVIRONMENT_CONFIG.customSparkImage
    },
    {
      label: 'Cloud Storage Staging bucket',
      value:
        config.stagingBucket || DEFAULT_RUNTIME_ENVIRONMENT_CONFIG.stagingBucket
    },
    {
      label: 'Python package repository',
      value:
        config.pythonPackageRepository ||
        DEFAULT_RUNTIME_ENVIRONMENT_CONFIG.pythonPackageRepository
    }
  ];
};

export const formatExecutorAndDriverProperties = (
  config?: IExecutorAndDriverConfig
): ISectionProperty[] => {
  if (!config) {
    return [];
  }
  return [
    {
      label: 'Tier',
      value: config.tier || DEFAULT_EXECUTOR_AND_DRIVER_CONFIG.tier
    },
    {
      label: 'Driver machine type',
      value:
        config.driverMachineType ||
        DEFAULT_EXECUTOR_AND_DRIVER_CONFIG.driverMachineType
    },
    {
      label: 'Driver disk',
      value: config.driverDisk || DEFAULT_EXECUTOR_AND_DRIVER_CONFIG.driverDisk
    },
    {
      label: 'Executor type',
      value:
        config.executorType || DEFAULT_EXECUTOR_AND_DRIVER_CONFIG.executorType
    },
    {
      label: 'Executor disk',
      value:
        config.executorDisk || DEFAULT_EXECUTOR_AND_DRIVER_CONFIG.executorDisk
    }
  ];
};

export const formatAutoscalingProperties = (
  config?: IAutoscalingConfig
): ISectionProperty[] => {
  if (!config) {
    return [];
  }
  const isEnabled =
    config.autoscalingEnabled ?? DEFAULT_AUTOSCALING_CONFIG.autoscalingEnabled;
  return [
    {
      label: 'Autoscaling',
      value: isEnabled ? 'Enabled' : 'Disabled'
    },
    {
      label: 'Initial executors',
      value:
        config.initialExecutors ?? DEFAULT_AUTOSCALING_CONFIG.initialExecutors
    },
    {
      label: 'Minimum executors',
      value: config.minExecutors ?? DEFAULT_AUTOSCALING_CONFIG.minExecutors
    },
    {
      label: 'Maximum executors',
      value: config.maxExecutors ?? DEFAULT_AUTOSCALING_CONFIG.maxExecutors
    }
  ];
};

export const formatMetastoreProperties = (
  config?: IMetastoreConfig
): ISectionProperty[] => {
  if (!config) {
    return [];
  }
  const isHiveEnabled =
    config.hiveEndpointEnabled ?? DEFAULT_METASTORE_CONFIG.hiveEndpointEnabled;
  return [
    {
      label: 'Metastore',
      value: config.metastore || DEFAULT_METASTORE_CONFIG.metastore
    },
    {
      label: 'Hive endpoint',
      value: isHiveEnabled ? 'Enabled' : 'Disabled'
    }
  ];
};

export const formatNetworkSecurityProperties = (
  config?: INetworkAndSecurityConfig
): ISectionProperty[] => {
  if (!config) {
    return [];
  }
  const identityKey =
    config.executionIdentity ||
    DEFAULT_NETWORK_SECURITY_CONFIG.executionIdentity ||
    '';
  const encryptionKey =
    config.encryption || DEFAULT_NETWORK_SECURITY_CONFIG.encryption || '';
  return [
    {
      label: 'Execution identity',
      value: EXECUTION_IDENTITY_DISPLAY_MAP[identityKey] || identityKey
    },
    {
      label: 'Network in this project',
      value:
        config.networkInThisProject ||
        DEFAULT_NETWORK_SECURITY_CONFIG.networkInThisProject
    },
    {
      label: 'Encryption',
      value: ENCRYPTION_DISPLAY_MAP[encryptionKey] || encryptionKey
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
      value: config.maxIdleTime || DEFAULT_SESSION_LIFECYCLE_CONFIG.maxIdleTime
    },
    {
      label: 'Maximum session time',
      value:
        config.maxSessionTime || DEFAULT_SESSION_LIFECYCLE_CONFIG.maxSessionTime
    }
  ];
};

export const formatOtherCustomizationProperties = (
  sparkProperties?: SparkProperties,
  labels?: ProfileLabels
): ISectionProperty[] => {
  const formatKeyValueMap = (map?: Record<string, string>) => {
    const entries = map ? Object.entries(map) : [];
    return entries.length === 0
      ? 'None'
      : entries.map(([k, v]) => `${k}: ${v}`).join(', ');
  };

  return [
    {
      label: 'Spark properties',
      value: formatKeyValueMap(sparkProperties)
    },
    {
      label: 'Labels',
      value: formatKeyValueMap(labels)
    }
  ];
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
  initialExecutorAndDriverConfig?: IExecutorAndDriverConfig;
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
  initialExecutorAndDriverConfig,
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

  // Configuration values derived from initial props or defaults
  const runtimeEnvironmentConfig = useMemo<IRuntimeEnvironmentConfig>(
    () => initialRuntimeEnvironmentConfig || DEFAULT_RUNTIME_ENVIRONMENT_CONFIG,
    [initialRuntimeEnvironmentConfig]
  );
  const executorAndDriverConfig = useMemo<IExecutorAndDriverConfig>(
    () => initialExecutorAndDriverConfig || DEFAULT_EXECUTOR_AND_DRIVER_CONFIG,
    [initialExecutorAndDriverConfig]
  );
  const autoscalingConfig = useMemo<IAutoscalingConfig>(
    () => initialAutoscalingConfig || DEFAULT_AUTOSCALING_CONFIG,
    [initialAutoscalingConfig]
  );
  const metastoreConfig = useMemo<IMetastoreConfig>(
    () => initialMetastoreConfig || DEFAULT_METASTORE_CONFIG,
    [initialMetastoreConfig]
  );
  const networkAndSecurityConfig = useMemo<INetworkAndSecurityConfig>(
    () => initialNetworkAndSecurityConfig || DEFAULT_NETWORK_SECURITY_CONFIG,
    [initialNetworkAndSecurityConfig]
  );
  const sessionLifecycleConfig = useMemo<ISessionLifecycleConfig>(
    () => initialSessionLifecycleConfig || DEFAULT_SESSION_LIFECYCLE_CONFIG,
    [initialSessionLifecycleConfig]
  );
  const sparkProperties = useMemo<SparkProperties>(
    () => initialSparkProperties || DEFAULT_SPARK_PROPERTIES,
    [initialSparkProperties]
  );
  const labels = useMemo<ProfileLabels>(
    () => initialLabels || DEFAULT_PROFILE_LABELS,
    [initialLabels]
  );

  const additionalConfigSections = useMemo(
    () => [
      {
        title: 'Runtime configuration',
        properties: formatRuntimeEnvironmentProperties(runtimeEnvironmentConfig)
      },
      {
        title: 'Executor and driver configuration',
        properties: formatExecutorAndDriverProperties(executorAndDriverConfig)
      },
      {
        title: 'Autoscaling',
        properties: formatAutoscalingProperties(autoscalingConfig)
      },
      {
        title: 'Metastore configuration',
        properties: formatMetastoreProperties(metastoreConfig)
      },
      {
        title: 'Network and security',
        properties: formatNetworkSecurityProperties(networkAndSecurityConfig)
      },
      {
        title: 'Session lifecycle',
        properties: formatSessionLifecycleProperties(sessionLifecycleConfig)
      },
      {
        title: 'Other customizations',
        properties: formatOtherCustomizationProperties(sparkProperties, labels)
      }
    ],
    [
      runtimeEnvironmentConfig,
      executorAndDriverConfig,
      autoscalingConfig,
      metastoreConfig,
      networkAndSecurityConfig,
      sessionLifecycleConfig,
      sparkProperties,
      labels
    ]
  );

  // React Hook Form initialization
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
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
        tier: executorAndDriverConfig.tier,
        runtimeEnvironmentConfig,
        executorAndDriverConfig,
        autoscalingConfig,
        metastoreConfig,
        networkAndSecurityConfig,
        sessionLifecycleConfig,
        sparkProperties,
        labels
      };

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

  const ExpandIconComponent = expandAdditionalConfig
    ? iconExpandLess.react
    : iconExpandMore.react;

  return (
    <div className="runtime-profile-main-wrapper">
      <div className="cluster-details-header">
        <div
          className="back-arrow-icon"
          onClick={handleBack}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleBack();
            }
          }}
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
          A runtime profile is a reusable set of Serverless Spark runtime
          settings, such as executor configuration. You can create interactive
          notebooks and submit workloads with a runtime profile.
        </div>

        <form
          className="runtime-profile-form"
          onSubmit={handleSubmit(onSubmit)}
        >
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
              className={`additional-config-header-container${
                expandAdditionalConfig ? ' expanded' : ''
              }`}
              onClick={() => setExpandAdditionalConfig(!expandAdditionalConfig)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setExpandAdditionalConfig(!expandAdditionalConfig);
                }
              }}
              role="button"
              tabIndex={0}
              aria-expanded={expandAdditionalConfig}
            >
              <div className="additional-config-header">
                Additional configuration
              </div>
              <div className="expand-icon">
                <ExpandIconComponent
                  tag="div"
                  className="logo-alignment-style"
                />
              </div>
            </div>

            {expandAdditionalConfig && (
              <div className="additional-config-content">
                {/* TODO: Wire up onEdit handlers for each section in upcoming edit drawer tasks */}
                {additionalConfigSections.map(section => (
                  <SectionDetail
                    key={section.title}
                    title={section.title}
                    properties={section.properties}
                    isEditDisabled={true}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="runtime-profile-buttons">
            {/* TODO - create functionality to be enabled during API integration process */}
            <button
              type="submit"
              disabled={true}
              className="submit-button-disable-style"
            >
              {isSubmitting ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                'Create a runtime profile'
              )}
            </button>
            <button
              type="button"
              className="job-cancel-button-style"
              onClick={handleBack}
            >
              Cancel
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
