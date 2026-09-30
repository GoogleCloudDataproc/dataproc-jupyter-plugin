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
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField
} from '@mui/material';

import { DataprocWidget } from '../controls/DataprocWidget';
import LeftArrowIcon from '../../style/icons/left_arrow_icon.svg';
import expandLessIcon from '../../style/icons/expand_less.svg';
import expandMoreIcon from '../../style/icons/expand_more.svg';
import { SectionDetail, ISectionProperty } from '../controls/SectionDetail';
import '../../style/runtimeProfile.css';
import {
  DATAPROC_TIER_DOC,
  LIGHTNING_ENGINE_DOC,
  RUNTIME_PROFILE_INTRO_TEXT,
  TIER_SECTION_TITLE,
  TIER_SECTION_SUBTITLE,
  TIER_PREMIUM_TITLE,
  TIER_PREMIUM_DESC,
  TIER_STANDARD_TITLE,
  TIER_STANDARD_DESC,
  TIER_STANDARD_INFO_BANNER,
  LIGHTNING_ENGINE_CHECKBOX_LABEL,
  LIGHTNING_ENGINE_CHECKBOX_DESC,
  EXECUTOR_CONFIG_SECTION_TITLE,
  EXECUTOR_CONFIG_SECTION_SUBTITLE,
  EXECUTOR_CATEGORY_GENERAL_TITLE,
  EXECUTOR_CATEGORY_GENERAL_SUB1,
  EXECUTOR_CATEGORY_GENERAL_SUB2,
  EXECUTOR_CATEGORY_ACCELERATED_TITLE,
  EXECUTOR_CATEGORY_ACCELERATED_SUB1,
  EXECUTOR_CATEGORY_ACCELERATED_SUB2,
  EXECUTOR_CATEGORY_ACCELERATED_SUB3,
  EXECUTOR_SHAPES_SUBHEADING,
  EXECUTOR_ACCELERATED_SHAPES_SUBHEADING
} from '../utils/const';
import {
  ExecutorCategoryType,
  IAutoscalingConfig,
  ICreateRuntimeProfilePayload,
  IDriverAndExecutorConfiguration,
  IDriverConfig,
  IExecutorAndDriverConfig,
  IExecutorDiskConfig,
  IMachineTypeOption,
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
  runtimeProfileService,
  STANDARD_MACHINE_TYPES,
  ACCELERATED_MACHINE_TYPES,
  MOCK_GENERAL_MACHINE_TYPES,
  MOCK_ACCELERATED_MACHINE_TYPES
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

const RUNTIME_VERSION_DISPLAY_MAP: Record<string, string> = {
  '2.3': '2.3 LTS (Spark 3.5.1, Python 3.12)'
};

export const generateRandomHex = (): string => {
  const cryptoObj = window.crypto || (window as any).Crypto;
  const array = new Uint32Array(1);
  cryptoObj.getRandomValues(array);
  const hex = array[0].toString(16);
  const paddedHex = hex.padStart(12, '0');
  return `runtime-${paddedHex}`;
};

/**
 * Initial default Serverless Spark runtime configuration for a new Runtime Profile.
 * Unset optional fields default to empty strings ('') so UI display placeholders
 * (e.g., 'None', 'Auto') are not sent to the backend API.
 * Note: Dynamic options (such as staging buckets, subnetworks, metastore instances,
 * and service accounts) will be fetched from the backend APIs in subsequent
 * edit-drawer and API-integration PRs.
 */
export const DEFAULT_RUNTIME_ENVIRONMENT_CONFIG: IRuntimeEnvironmentConfig = {
  runtimeProfileId: '',
  runtimeVersion: '2.3',
  customSparkImage: '',
  stagingBucket: '',
  pythonPackageRepository: ''
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
  metastore: '',
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
  const versionKey =
    config.runtimeVersion ||
    DEFAULT_RUNTIME_ENVIRONMENT_CONFIG.runtimeVersion ||
    '';
  return [
    {
      label: 'Runtime Profile ID',
      value: config.runtimeProfileId || '-'
    },
    {
      label: 'Dataproc Runtime Version',
      value: RUNTIME_VERSION_DISPLAY_MAP[versionKey] || versionKey
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
      value: config.metastore || 'Lakehouse runtime catalog'
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

/**
 * Generates an auto-populated display name for a new runtime profile
 */
export const generateAutoDisplayName = (): string => {
  const cryptoObj =
    typeof window !== 'undefined'
      ? window.crypto || (window as any).Crypto
      : undefined;
  if (cryptoObj?.getRandomValues) {
    const array = new Uint32Array(1);
    cryptoObj.getRandomValues(array);
    const hex = array[0].toString(16).padStart(6, '0').slice(-6);
    return `runtime-profile-${hex}`;
  }
  return `runtime-profile-${Math.random().toString(16).substring(2, 8)}`;
};

export interface ICreateRuntimeProfileComponentProps {
  app?: JupyterLab;
  launcher?: ILauncher;
  themeManager?: IThemeManager;
  settingRegistry?: ISettingRegistry;
  service?: RuntimeProfileService;
  onBack?: () => void;
  onSuccess?: () => void;
  initialDisplayName?: string;
  initialTier?: string;
  initialLightningEngineEnabled?: boolean;
  initialExecutorCategory?: ExecutorCategoryType;
  initialExecutorType?: string;
  initialRuntimeEnvironmentConfig?: IRuntimeEnvironmentConfig;
  initialExecutorAndDriverConfig?: IExecutorAndDriverConfig;
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
  initialDisplayName,
  initialTier,
  initialLightningEngineEnabled,
  initialExecutorCategory,
  initialExecutorType,
  initialRuntimeEnvironmentConfig,
  initialExecutorAndDriverConfig,
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

  // Tier and Lightning Engine state
  const [tier, setTier] = useState<string>(
    initialTier ||
      initialExecutorAndDriverConfig?.tier ||
      initialDriverAndExecutorConfiguration?.tier ||
      'Premium'
  );
  const [lightningEngineEnabled, setLightningEngineEnabled] = useState<boolean>(
    initialLightningEngineEnabled !== undefined
      ? initialLightningEngineEnabled
      : true
  );

  // Executor category and machine type state
  const [executorCategory, setExecutorCategory] =
    useState<ExecutorCategoryType>(initialExecutorCategory || 'general');
  const [executorType, setExecutorType] = useState<string>(
    initialExecutorType || 'highmem-4'
  );
  const [machineTypes, setMachineTypes] = useState<IMachineTypeOption[]>(
    (initialExecutorCategory || 'general') === 'accelerated'
      ? MOCK_ACCELERATED_MACHINE_TYPES
      : MOCK_GENERAL_MACHINE_TYPES
  );

  const defaultRuntimeId = useMemo<string>(
    () =>
      initialDisplayName ||
      initialRuntimeEnvironmentConfig?.runtimeProfileId ||
      generateRandomHex(),
    [initialDisplayName, initialRuntimeEnvironmentConfig?.runtimeProfileId]
  );

  // React Hook Form initialization
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<IRuntimeProfileFormData>({
    mode: 'onChange',
    defaultValues: {
      displayName: defaultRuntimeId,
      region: '',
      description: ''
    }
  });

  const watchedDisplayName = watch('displayName');

  // Configuration values derived from initial props or defaults.
  // TODO: Validation on runtimeProfileId / displayName field will be handled in upcoming PRs.
  const runtimeEnvironmentConfig = useMemo<IRuntimeEnvironmentConfig>(
    () => ({
      ...DEFAULT_RUNTIME_ENVIRONMENT_CONFIG,
      ...initialRuntimeEnvironmentConfig,
      runtimeProfileId: watchedDisplayName?.trim() || defaultRuntimeId,
      lightningEngineEnabled:
        tier === 'Premium' && Boolean(lightningEngineEnabled)
    }),
    [
      initialRuntimeEnvironmentConfig,
      watchedDisplayName,
      defaultRuntimeId,
      tier,
      lightningEngineEnabled
    ]
  );
  const executorAndDriverConfig = useMemo<IExecutorAndDriverConfig>(() => {
    const base =
      initialExecutorAndDriverConfig ||
      initialDriverAndExecutorConfiguration ||
      initialDriverConfig ||
      initialExecutorDiskConfig ||
      DEFAULT_EXECUTOR_AND_DRIVER_CONFIG;
    const allTypes = [...STANDARD_MACHINE_TYPES, ...ACCELERATED_MACHINE_TYPES];
    const selectedMachine = allTypes.find(m => m.name === executorType);
    return {
      ...base,
      tier,
      executorType:
        initialExecutorAndDriverConfig?.executorType ||
        (selectedMachine ? selectedMachine.label : executorType)
    };
  }, [
    initialExecutorAndDriverConfig,
    initialDriverAndExecutorConfiguration,
    initialDriverConfig,
    initialExecutorDiskConfig,
    tier,
    executorType
  ]);
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

  const handleTierChange = (selectedTier: string) => {
    setTier(selectedTier);
    if (selectedTier === 'Standard') {
      if (executorCategory === 'accelerated') {
        setExecutorCategory('general');
        setExecutorType('highmem-4');
        setMachineTypes(MOCK_GENERAL_MACHINE_TYPES);
      }
    }
  };
  const handleExecutorCategoryChange = (category: ExecutorCategoryType) => {
    if (tier === 'Standard' && category === 'accelerated') {
      return;
    }
    setExecutorCategory(category);
    if (category === 'general') {
      setExecutorType('highmem-4');
      setMachineTypes(MOCK_GENERAL_MACHINE_TYPES);
    } else if (category === 'accelerated') {
      setExecutorType('l4-4');
      setMachineTypes(MOCK_ACCELERATED_MACHINE_TYPES);
    }
  };

  // Load machine types when executorCategory changes
  useEffect(() => {
    let isMounted = true;
    const loadMachineTypes = async () => {
      if (service?.getMachineTypes) {
        try {
          const types = await service.getMachineTypes(executorCategory);
          if (isMounted && types && types.length > 0) {
            setMachineTypes(types);
          }
        } catch (error) {
          console.error('Failed to load machine types', error);
        }
      }
    };

    loadMachineTypes();

    return () => {
      isMounted = false;
    };
  }, [service, executorCategory]);

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
      const isLightningEngineActive =
        tier === 'Premium' && Boolean(lightningEngineEnabled);
      const payload: ICreateRuntimeProfilePayload = {
        displayName: data.displayName.trim(),
        region: data.region,
        description: data.description.trim() || undefined,
        tier,
        lightningEngineEnabled: isLightningEngineActive,
        executorConfig: {
          executorType: executorCategory,
          machineType: executorType
        },
        runtimeEnvironmentConfig,
        executorAndDriverConfig,
        driverAndExecutorConfiguration: executorAndDriverConfig,
        driverConfig: executorAndDriverConfig,
        executorDiskConfig: executorAndDriverConfig,
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
          {RUNTIME_PROFILE_INTRO_TEXT}
        </div>

        <form
          className="runtime-profile-form"
          onSubmit={handleSubmit(onSubmit)}
        >
          {/* Row 1: Display name & Region */}
          <div className="runtime-profile-row">
            <div className="runtime-profile-col">
              {/* TODO: Full validation on runtime-id / displayName field will be added in upcoming PRs */}
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
                    label="Display name *"
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

          {/* Section: Tier */}
          <div className="runtime-profile-section">
            <div className="runtime-profile-section-title">
              {TIER_SECTION_TITLE}
            </div>
            <div className="runtime-profile-section-subtitle">
              {TIER_SECTION_SUBTITLE}{' '}
              <span
                role="button"
                tabIndex={0}
                className="runtime-profile-learn-more"
                onClick={() => window.open(DATAPROC_TIER_DOC, '_blank')}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    window.open(DATAPROC_TIER_DOC, '_blank');
                  }
                }}
              >
                Learn more
              </span>
            </div>

            {/* Tier Cards: Premium & Standard */}
            <div className="node-config-cards-container">
              <div
                className={`node-config-card ${
                  tier === 'Premium' ? 'selected' : ''
                }`}
                onClick={() => handleTierChange('Premium')}
                role="button"
                tabIndex={0}
                aria-pressed={tier === 'Premium'}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleTierChange('Premium');
                  }
                }}
              >
                <div className="node-config-card-title">
                  {TIER_PREMIUM_TITLE}
                </div>
                <div className="node-config-card-desc">{TIER_PREMIUM_DESC}</div>
              </div>

              <div
                className={`node-config-card ${
                  tier === 'Standard' ? 'selected' : ''
                }`}
                onClick={() => handleTierChange('Standard')}
                role="button"
                tabIndex={0}
                aria-pressed={tier === 'Standard'}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleTierChange('Standard');
                  }
                }}
              >
                <div className="node-config-card-title">
                  {TIER_STANDARD_TITLE}
                </div>
                <div className="node-config-card-desc">
                  {TIER_STANDARD_DESC}
                </div>
              </div>
            </div>

            {/* Premium: Enable Lightning Engine Checkbox / Standard: Info Banner */}
            {tier === 'Premium' ? (
              <div className="runtime-profile-checkbox-section">
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={lightningEngineEnabled}
                      onChange={e =>
                        setLightningEngineEnabled(e.target.checked)
                      }
                      name="lightningEngine"
                      color="primary"
                    />
                  }
                  label={
                    <span className="runtime-profile-checkbox-title">
                      {LIGHTNING_ENGINE_CHECKBOX_LABEL}
                    </span>
                  }
                />
                <div className="runtime-profile-checkbox-desc">
                  {LIGHTNING_ENGINE_CHECKBOX_DESC}{' '}
                  <span
                    className="runtime-profile-learn-more"
                    onClick={e => {
                      e.preventDefault();
                      window.open(LIGHTNING_ENGINE_DOC, '_blank');
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        window.open(LIGHTNING_ENGINE_DOC, '_blank');
                      }
                    }}
                  >
                    Learn more
                  </span>
                </div>
              </div>
            ) : (
              <div className="runtime-profile-tier-info-banner">
                <div className="runtime-profile-tier-info-icon" />
                <div className="runtime-profile-tier-info-text">
                  {TIER_STANDARD_INFO_BANNER}
                </div>
              </div>
            )}
          </div>

          {/* Section: Executor configuration */}
          <div className="runtime-profile-section">
            <div className="runtime-profile-section-title">
              {EXECUTOR_CONFIG_SECTION_TITLE}
            </div>
            <div className="runtime-profile-section-subtitle">
              {EXECUTOR_CONFIG_SECTION_SUBTITLE}
            </div>

            {/* Executor Category Cards: General & Accelerated */}
            <div className="node-config-cards-container">
              <div
                className={`node-config-card ${
                  executorCategory === 'general' ? 'selected' : ''
                }`}
                onClick={() => handleExecutorCategoryChange('general')}
                role="button"
                tabIndex={0}
                aria-pressed={executorCategory === 'general'}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleExecutorCategoryChange('general');
                  }
                }}
              >
                <div className="node-config-card-title">
                  {EXECUTOR_CATEGORY_GENERAL_TITLE}
                </div>
                <div className="node-config-card-sub1">
                  {EXECUTOR_CATEGORY_GENERAL_SUB1}
                </div>
                <div className="node-config-card-sub2">
                  {EXECUTOR_CATEGORY_GENERAL_SUB2}
                </div>
              </div>

              <div
                className={`node-config-card ${
                  executorCategory === 'accelerated' ? 'selected' : ''
                } ${tier === 'Standard' ? 'disabled' : ''}`}
                onClick={() => {
                  if (tier !== 'Standard') {
                    handleExecutorCategoryChange('accelerated');
                  }
                }}
                role="button"
                tabIndex={tier === 'Standard' ? -1 : 0}
                aria-disabled={tier === 'Standard'}
                aria-pressed={executorCategory === 'accelerated'}
                onKeyDown={e => {
                  if (
                    tier !== 'Standard' &&
                    (e.key === 'Enter' || e.key === ' ')
                  ) {
                    handleExecutorCategoryChange('accelerated');
                  }
                }}
              >
                <div className="node-config-card-title">
                  {EXECUTOR_CATEGORY_ACCELERATED_TITLE}
                </div>
                <div className="node-config-card-sub1">
                  {EXECUTOR_CATEGORY_ACCELERATED_SUB1}
                </div>
                <div className="node-config-card-sub2">
                  {EXECUTOR_CATEGORY_ACCELERATED_SUB2}
                </div>
                <div className="node-config-card-sub3">
                  {EXECUTOR_CATEGORY_ACCELERATED_SUB3}
                </div>
              </div>
            </div>

            {/* Machine Type Subheading & Select */}
            <div className="machine-type-subheading">
              {executorCategory === 'accelerated'
                ? EXECUTOR_ACCELERATED_SHAPES_SUBHEADING
                : EXECUTOR_SHAPES_SUBHEADING}
            </div>
            <div className="machine-type-select-wrapper">
              <FormControl size="small" fullWidth variant="outlined">
                <InputLabel id="runtime-profile-executor-type-label" shrink>
                  Executor type
                </InputLabel>
                <Select
                  labelId="runtime-profile-executor-type-label"
                  id="runtime-profile-executor-type"
                  value={executorType}
                  label="Executor type"
                  onChange={(e: SelectChangeEvent) =>
                    setExecutorType(e.target.value as string)
                  }
                  notched
                >
                  {executorCategory === 'accelerated'
                    ? (() => {
                        const l4Types = machineTypes.filter(
                          m =>
                            m.acceleratorType === 'l4' ||
                            m.name.toLowerCase().startsWith('l4')
                        );
                        const a100Types = machineTypes.filter(
                          m =>
                            m.acceleratorType?.startsWith('a100') ||
                            m.name.toLowerCase().startsWith('a100')
                        );
                        const otherTypes = machineTypes.filter(
                          m => !l4Types.includes(m) && !a100Types.includes(m)
                        );
                        const items: React.JSX.Element[] = [];

                        if (l4Types.length > 0) {
                          items.push(
                            <ListSubheader
                              key="header-l4"
                              className="machine-type-group-header"
                              disableSticky
                            >
                              L4
                            </ListSubheader>
                          );
                          l4Types.forEach(m => {
                            items.push(
                              <MenuItem key={m.name} value={m.name}>
                                {m.label}
                              </MenuItem>
                            );
                          });
                        }

                        if (a100Types.length > 0) {
                          items.push(
                            <ListSubheader
                              key="header-a100"
                              className="machine-type-group-header"
                              disableSticky
                            >
                              A100
                            </ListSubheader>
                          );
                          a100Types.forEach(m => {
                            items.push(
                              <MenuItem key={m.name} value={m.name}>
                                {m.label}
                              </MenuItem>
                            );
                          });
                        }

                        if (otherTypes.length > 0) {
                          items.push(
                            <ListSubheader
                              key="header-other"
                              className="machine-type-group-header"
                              disableSticky
                            >
                              Other
                            </ListSubheader>
                          );
                          otherTypes.forEach(m => {
                            items.push(
                              <MenuItem key={m.name} value={m.name}>
                                {m.label}
                              </MenuItem>
                            );
                          });
                        }

                        return items;
                      })()
                    : (() => {
                        const standardTypes = machineTypes.filter(m =>
                          m.name.toLowerCase().startsWith('standard')
                        );
                        const highmemTypes = machineTypes.filter(m =>
                          m.name.toLowerCase().startsWith('highmem')
                        );
                        const otherTypes = machineTypes.filter(
                          m =>
                            !m.name.toLowerCase().startsWith('standard') &&
                            !m.name.toLowerCase().startsWith('highmem')
                        );
                        if (
                          standardTypes.length > 0 ||
                          highmemTypes.length > 0
                        ) {
                          const items: React.JSX.Element[] = [];
                          if (standardTypes.length > 0) {
                            items.push(
                              <ListSubheader
                                key="header-standard"
                                className="machine-type-group-header"
                                disableSticky
                              >
                                Standard
                              </ListSubheader>
                            );
                            standardTypes.forEach(m => {
                              items.push(
                                <MenuItem key={m.name} value={m.name}>
                                  {m.label}
                                </MenuItem>
                              );
                            });
                          }
                          if (highmemTypes.length > 0) {
                            items.push(
                              <ListSubheader
                                key="header-highmem"
                                className="machine-type-group-header"
                                disableSticky
                              >
                                High memory
                              </ListSubheader>
                            );
                            highmemTypes.forEach(m => {
                              items.push(
                                <MenuItem key={m.name} value={m.name}>
                                  {m.label}
                                </MenuItem>
                              );
                            });
                          }
                          if (otherTypes.length > 0) {
                            items.push(
                              <ListSubheader
                                key="header-general-other"
                                className="machine-type-group-header"
                                disableSticky
                              >
                                Other
                              </ListSubheader>
                            );
                            otherTypes.forEach(m => {
                              items.push(
                                <MenuItem key={m.name} value={m.name}>
                                  {m.label}
                                </MenuItem>
                              );
                            });
                          }
                          return items;
                        }
                        return machineTypes.map(m => (
                          <MenuItem key={m.name} value={m.name}>
                            {m.label}
                          </MenuItem>
                        ));
                      })()}
                </Select>
              </FormControl>
            </div>
          </div>

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
              className="runtime-profile-submit-btn submit-button-disable-style"
            >
              {isSubmitting ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                'Create a runtime profile'
              )}
            </button>
            <button
              type="button"
              className="runtime-profile-cancel-btn job-cancel-button-style"
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
