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
import {
  LAKEHOUSE_RUNTIME_CATALOG,
  METASTORE_NONE,
  isAcceleratedMachine,
  normalizeMachineTypeName
} from './runtimeProfileMapper';
import '../../style/runtimeProfile.css';
import {
  AutoscalingEditDrawer,
  ExecutorAndDriverEditDrawer,
  NetworkSecurityEditDrawer,
  OtherCustomizationEditDrawer,
  RuntimeEnvironmentEditDrawer,
  RUNTIME_VERSION_OPTIONS,
  SelectBucketEditDrawer,
  SessionLifecycleEditDrawer
} from './runtimeProfileEditDrawers';
import { MetastoreEditDrawer } from './metastoreEditDrawer';
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
  EXECUTOR_ACCELERATED_SHAPES_SUBHEADING,
  DATAPROC_STANDARD_MACHINE_TYPES,
  DATAPROC_ACCELERATED_MACHINE_TYPES,
  DEFAULT_GENERAL_EXECUTOR_TYPE,
  DEFAULT_ACCELERATED_EXECUTOR_TYPE,
  DEFAULT_STANDARD_TIER_EXECUTOR_TYPE,
  SETTINGS_COMMAND_ID,
  SETTINGS_WIDGET_TITLE
} from '../utils/const';
import {
  DEFAULT_HDD_DISK_SIZE,
  DEFAULT_SSD_DISK_SIZE,
  DISK_TIER_HDD,
  DISK_TIER_SSD,
  ExecutorCategoryType,
  IAutoscalingConfig,
  ICreateRuntimeProfilePayload,
  IExecutorAndDriverConfig,
  IMachineTypeOption,
  IMetastoreConfig,
  INetworkAndSecurityConfig,
  IRegionOption,
  IRuntimeEnvironmentConfig,
  IRuntimeProfileFormInitialValues,
  ISessionLifecycleConfig,
  ProfileLabels,
  RuntimeProfileFormMode,
  SparkProperties
} from './runtimeProfileInterface';
import { IRuntimeProfileTemplate } from './runtimeProfileListMapper';
import { mapSessionTemplateToFormValues } from './runtimeProfileMapper';
import {
  RUNTIME_PROFILE_UPDATED_EVENT,
  RuntimeProfileService,
  runtimeProfileService
} from './runtimeProfileService';
import { registerSessionKernelsInLauncher } from './sessionKernelLauncher';
import { authApi, IAuthCredentials } from '../utils/utils';
import { requestRuntimeProfileListTab } from './runtimeProfileNavigation';
import {
  ALL_MACHINE_TYPES,
  calculateDcu,
  DEFAULT_INITIAL_EXECUTORS,
  DEFAULT_MAX_EXECUTORS,
  DEFAULT_MIN_EXECUTORS,
  formatCompactDiskLabel,
  formatDcuNumber,
  getMachineTypeLabel,
  getShapeDcu,
  MACHINE_SHAPE_DCU,
  MACHINE_SHAPE_RESOURCES,
  MSG_EXECUTOR_TIER_PREMIUM,
  MSG_EXECUTOR_TIER_PREMIUM_LIGHTNING,
  MSG_EXECUTOR_TIER_STANDARD,
  parseExecutorCount,
  TIER_PREMIUM
} from './runtimeProfileConstants';
import {
  formatRuntimeProfileSummaryProperties,
  IRuntimeProfileSummaryProps,
  RuntimeProfileSummary
} from './runtimeProfileSummary';
import {
  calculateRuntimePricingEstimate,
  IRuntimePricingEstimateProps,
  RuntimePricingEstimate
} from './runtimePricingEstimate';
import { eventEmitter } from '../utils/signalEmitter';

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
  '2.3': '2.3 LTS (Spark 3.5, Java 17, Scala 2.13)',
  '2.3 LTS (Spark 3.5.1, Python 3.12)':
    '2.3 LTS (Spark 3.5, Java 17, Scala 2.13)',
  '3.0': '3.0 (Spark 4.0, Java 21, Scala 2.13)'
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
  runtimeVersion: '2.3 LTS (Spark 3.5, Java 17, Scala 2.13)',
  customSparkImage: '',
  stagingBucket: '',
  pythonPackageRepository: ''
};

export const DEFAULT_EXECUTOR_AND_DRIVER_CONFIG: IExecutorAndDriverConfig = {
  tier: 'Premium',
  lightningEngineEnabled: true,
  useDifferentDriverConfig: false,
  driverMachineType: DEFAULT_GENERAL_EXECUTOR_TYPE,
  driverDiskTier: DISK_TIER_HDD,
  driverDiskSize: DEFAULT_HDD_DISK_SIZE,
  driverDisk: `${DISK_TIER_HDD}, ${DEFAULT_HDD_DISK_SIZE}`,
  executorType: DEFAULT_GENERAL_EXECUTOR_TYPE,
  executorDiskTier: DISK_TIER_HDD,
  executorDiskSize: DEFAULT_HDD_DISK_SIZE,
  executorDisk: `${DISK_TIER_HDD}, ${DEFAULT_HDD_DISK_SIZE}`
};

export const DEFAULT_AUTOSCALING_CONFIG: IAutoscalingConfig = {
  autoscalingEnabled: true,
  initialExecutors: DEFAULT_INITIAL_EXECUTORS,
  minExecutors: DEFAULT_MIN_EXECUTORS,
  maxExecutors: DEFAULT_MAX_EXECUTORS
};

// No metastoreType: nothing is sent until the user saves the Metastore drawer,
// so the service uses the Lakehouse runtime catalog by default.
export const DEFAULT_METASTORE_CONFIG: IMetastoreConfig = {
  metastore: '',
  hiveEndpointEnabled: false
};

export const DEFAULT_NETWORK_SECURITY_CONFIG: INetworkAndSecurityConfig = {
  executionIdentity: 'service_account',
  networkInThisProject: 'default',
  subnetwork: 'default',
  encryption: 'google_managed'
};

export const DEFAULT_SESSION_LIFECYCLE_CONFIG: ISessionLifecycleConfig = {
  maxIdleTime: 'None',
  maxSessionTime: 'None'
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
      label: 'Runtime profile ID',
      value: config.runtimeProfileId || '-'
    },
    {
      label: 'Spark runtime version',
      value: RUNTIME_VERSION_DISPLAY_MAP[versionKey] || versionKey
    },
    {
      label: 'Custom spark image',
      value: config.customSparkImage || 'None'
    },
    {
      label: 'Cloud storage staging bucket',
      value: config.stagingBucket || 'Auto'
    },
    {
      label: 'Python package repository',
      value:
        config.pythonPackageRepository ||
        'Google managed PyPI pull-through cache'
    }
  ];
};

export const formatExecutorAndDriverProperties = (
  config?: IExecutorAndDriverConfig
): ISectionProperty[] => {
  if (!config) {
    return [];
  }
  const resolvedTier = config.tier || DEFAULT_EXECUTOR_AND_DRIVER_CONFIG.tier;
  const isPremium =
    (resolvedTier || '').toUpperCase() === TIER_PREMIUM ||
    resolvedTier === 'Premium';
  const tierDisplay = isPremium
    ? config.lightningEngineEnabled
      ? MSG_EXECUTOR_TIER_PREMIUM_LIGHTNING
      : MSG_EXECUTOR_TIER_PREMIUM
    : resolvedTier || MSG_EXECUTOR_TIER_STANDARD;

  return [
    {
      label: 'Tier',
      value: tierDisplay
    },
    {
      label: 'Driver machine type',
      value: getMachineTypeLabel(
        config.driverMachineType ||
          DEFAULT_EXECUTOR_AND_DRIVER_CONFIG.driverMachineType
      )
    },
    {
      label: 'Driver disk',
      value: config.driverDisk || DEFAULT_EXECUTOR_AND_DRIVER_CONFIG.driverDisk
    },
    {
      label: 'Executor type',
      value: getMachineTypeLabel(
        config.executorType || DEFAULT_EXECUTOR_AND_DRIVER_CONFIG.executorType
      )
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
      value: isEnabled ? 'On' : 'Off'
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

/**
 * Project of the metastore in use, defaulting to the profile's own project.
 * With only the Hive endpoint enabled, that is the Hive endpoint's project.
 */
const getMetastoreProjectId = (
  config: IMetastoreConfig,
  defaultProjectId?: string
): string | undefined => {
  const isHiveOnly =
    config.metastoreType === 'lakehouse' &&
    config.icebergRestEndpointEnabled === false &&
    Boolean(config.hiveEndpointEnabled);
  return (
    (isHiveOnly ? config.hiveProjectId : config.projectId) || defaultProjectId
  );
};

/**
 * Metastore rows of the form. `defaultProjectId` is the profile's own project,
 * shown when the config has no project of its own.
 */
export const formatMetastoreProperties = (
  config?: IMetastoreConfig,
  defaultProjectId?: string
): ISectionProperty[] => {
  if (!config) {
    return [];
  }
  const isDataprocMetastore = config.metastoreType === 'dataproc';
  const lakehouseLabel = config.metastore || LAKEHOUSE_RUNTIME_CATALOG;
  const lakehouseProjectId = getMetastoreProjectId(config, defaultProjectId);
  const metastoreLabel = isDataprocMetastore
    ? config.dataprocMetastoreService || METASTORE_NONE
    : lakehouseLabel !== METASTORE_NONE && lakehouseProjectId
    ? `${lakehouseLabel} (project: ${lakehouseProjectId})`
    : lakehouseLabel;

  const properties: ISectionProperty[] = [
    {
      label: 'Metastore',
      value: metastoreLabel
    }
  ];

  // Hive endpoint is a Lakehouse runtime catalog option; it does not apply to
  // Dataproc Metastore.
  if (!isDataprocMetastore) {
    const isHiveEnabled =
      config.hiveEndpointEnabled ??
      DEFAULT_METASTORE_CONFIG.hiveEndpointEnabled;
    properties.push({
      label: 'Hive endpoint',
      value: isHiveEnabled ? 'Enabled' : 'Disabled'
    });
  }

  return properties;
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
  const isSharedNetwork = config.networkSource === 'shared_from_host';
  return [
    {
      label: 'Execution identity',
      value: EXECUTION_IDENTITY_DISPLAY_MAP[identityKey] || identityKey
    },
    {
      label: isSharedNetwork
        ? 'Network shared from host'
        : 'Network in this project',
      value: isSharedNetwork
        ? config.sharedSubnetwork || 'default'
        : config.primaryNetwork ||
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

export interface ICreateRuntimeProfileComponentProps
  extends IRuntimeProfileFormInitialValues {
  app?: JupyterLab;
  launcher?: ILauncher;
  themeManager?: IThemeManager;
  settingRegistry?: ISettingRegistry;
  service?: RuntimeProfileService;
  onBack?: () => void;
  onSuccess?: () => void;
  SummaryComponent?: React.ComponentType<IRuntimeProfileSummaryProps>;
  PricingComponent?: React.ComponentType<IRuntimePricingEstimateProps>;
  /**
   * 'create' (default) opens an empty form that creates a new profile.
   * 'edit' pre-fills the form from `profile` and saves changes to it.
   */
  mode?: RuntimeProfileFormMode;
  /** Runtime profile (session template) to edit when mode is 'edit'. */
  profile?: IRuntimeProfileTemplate;
}

const MACHINE_TYPE_GROUPS: Record<
  ExecutorCategoryType,
  { prefix: string; label: string }[]
> = {
  general: [
    { prefix: 'standard', label: 'Standard' },
    { prefix: 'highmem', label: 'High memory' }
  ],
  accelerated: [
    { prefix: 'l4', label: 'L4' },
    { prefix: 'a100', label: 'A100' }
  ]
};

/**
 * Renders machine types grouped under subheaders (by name prefix);
 * anything unmatched is listed under "Other".
 */
export const renderGroupedMachineOptions = (
  machineTypes: IMachineTypeOption[],
  category: ExecutorCategoryType
): React.JSX.Element[] => {
  const items: React.JSX.Element[] = [];
  const matched = new Set<string>();
  const pushGroup = (
    key: string,
    label: string,
    types: IMachineTypeOption[]
  ) => {
    if (types.length === 0) {
      return;
    }
    items.push(
      <ListSubheader
        key={`header-${key}`}
        className="machine-type-group-header"
        disableSticky
      >
        {label}
      </ListSubheader>
    );
    types.forEach(m =>
      items.push(
        <MenuItem key={m.name} value={m.name}>
          {m.label}
        </MenuItem>
      )
    );
  };

  MACHINE_TYPE_GROUPS[category].forEach(({ prefix, label }) => {
    const types = machineTypes.filter(m =>
      m.name.toLowerCase().startsWith(prefix)
    );
    types.forEach(m => matched.add(m.name));
    pushGroup(prefix, label, types);
  });
  pushGroup(
    'other',
    'Other',
    machineTypes.filter(m => !matched.has(m.name))
  );
  return items;
};

export const CreateRuntimeProfileComponent: React.FC<
  ICreateRuntimeProfileComponentProps
> = (props): React.JSX.Element => {
  const isEditMode = props.mode === 'edit' && Boolean(props.profile);
  // Edit mode seeds the same initial values the create flow accepts from the
  // selected profile; explicitly passed props still take precedence.
  const editInitialValues = useMemo<IRuntimeProfileFormInitialValues>(
    () =>
      isEditMode && props.profile
        ? mapSessionTemplateToFormValues(props.profile)
        : {},
    [isEditMode, props.profile]
  );
  const {
    app,
    launcher,
    themeManager,
    service = runtimeProfileService,
    profile,
    onBack,
    onSuccess,
    initialDisplayName,
    initialRegion,
    initialDescription,
    initialTier,
    initialLightningEngineEnabled,
    initialExecutorCategory,
    initialExecutorType,
    initialRuntimeEnvironmentConfig,
    initialExecutorAndDriverConfig,
    initialAutoscalingConfig,
    initialMetastoreConfig,
    initialNetworkAndSecurityConfig,
    initialSessionLifecycleConfig,
    initialSparkProperties,
    initialLabels,
    SummaryComponent = RuntimeProfileSummary,
    PricingComponent = RuntimePricingEstimate
  } = { ...editInitialValues, ...props };

  // Options & Data State
  const [regions, setRegions] = useState<IRegionOption[]>([]);
  const [projectId, setProjectId] = useState<string | undefined>(
    initialMetastoreConfig?.projectId
  );
  const [isLoadingOptions, setIsLoadingOptions] = useState<boolean>(true);
  // Collapsed by default; the summary panel already shows these settings.
  const [expandAdditionalConfig, setExpandAdditionalConfig] =
    useState<boolean>(false);
  const [isRuntimeConfigDrawerOpen, setIsRuntimeConfigDrawerOpen] =
    useState<boolean>(false);
  const [isMetastoreDrawerOpen, setIsMetastoreDrawerOpen] =
    useState<boolean>(false);
  const [isExecutorDriverDrawerOpen, setIsExecutorDriverDrawerOpen] =
    useState<boolean>(false);
  const formScrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [isNetworkSecurityDrawerOpen, setIsNetworkSecurityDrawerOpen] =
    useState<boolean>(false);
  const [isAutoscalingDrawerOpen, setIsAutoscalingDrawerOpen] =
    useState<boolean>(false);
  const [isSessionLifecycleDrawerOpen, setIsSessionLifecycleDrawerOpen] =
    useState<boolean>(false);
  const [isOtherCustomizationDrawerOpen, setIsOtherCustomizationDrawerOpen] =
    useState<boolean>(false);

  // Tier and Lightning Engine state
  const initialTierValue =
    initialTier || initialExecutorAndDriverConfig?.tier || 'Premium';
  const [tier, setTier] = useState<string>(initialTierValue);
  const [lightningEngineEnabled, setLightningEngineEnabled] = useState<boolean>(
    initialLightningEngineEnabled !== undefined
      ? initialLightningEngineEnabled
      : true
  );

  // Executor category and machine type state. Seeded from explicit props,
  // then from a known machine id in the initial config, then defaults.
  const initialConfigMachine = ALL_MACHINE_TYPES.find(
    m => m.name === initialExecutorAndDriverConfig?.executorType
  );
  const resolvedInitialCategory: ExecutorCategoryType =
    initialExecutorCategory || initialConfigMachine?.category || 'general';
  const [executorCategory, setExecutorCategory] =
    useState<ExecutorCategoryType>(resolvedInitialCategory);
  const [executorType, setExecutorType] = useState<string>(
    initialExecutorType ||
      (initialConfigMachine?.category === resolvedInitialCategory
        ? initialConfigMachine.name
        : undefined) ||
      (resolvedInitialCategory === 'accelerated'
        ? DEFAULT_ACCELERATED_EXECUTOR_TYPE
        : initialTierValue === 'Standard'
        ? DEFAULT_STANDARD_TIER_EXECUTOR_TYPE
        : DEFAULT_GENERAL_EXECUTOR_TYPE)
  );
  // Standard tier supports neither accelerated nor highmem executor shapes,
  // so its dropdown lists only the standard-* machine types.
  const machineTypes = useMemo<IMachineTypeOption[]>(() => {
    if (executorCategory === 'accelerated') {
      return DATAPROC_ACCELERATED_MACHINE_TYPES;
    }
    return tier === 'Standard'
      ? DATAPROC_STANDARD_MACHINE_TYPES.filter(
          m => !m.name.toLowerCase().includes('highmem')
        )
      : DATAPROC_STANDARD_MACHINE_TYPES;
  }, [executorCategory, tier]);

  const defaultRuntimeId = useMemo<string>(
    () =>
      initialRuntimeEnvironmentConfig?.runtimeProfileId || generateRandomHex(),
    [initialRuntimeEnvironmentConfig?.runtimeProfileId]
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
      displayName: initialDisplayName ?? defaultRuntimeId,
      region: initialRegion ?? '',
      description: initialDescription ?? ''
    }
  });

  const selectedRegion = watch('region');
  const hasFormErrors = Object.keys(errors).length > 0;

  // Configuration values derived from initial props or defaults.
  // TODO: Validation on runtimeProfileId / displayName field will be handled in upcoming PRs.
  const [runtimeEnvironmentConfig, setRuntimeEnvironmentConfig] =
    useState<IRuntimeEnvironmentConfig>(() => {
      const baseConfig = {
        ...DEFAULT_RUNTIME_ENVIRONMENT_CONFIG,
        ...initialRuntimeEnvironmentConfig
      };
      return {
        ...baseConfig,
        runtimeProfileId:
          baseConfig.runtimeProfileId && baseConfig.runtimeProfileId !== '-'
            ? baseConfig.runtimeProfileId
            : defaultRuntimeId
      };
    });

  const [executorAndDriverConfigState, setExecutorAndDriverConfigState] =
    useState<IExecutorAndDriverConfig>(() => {
      const defaultDiskTier =
        resolvedInitialCategory === 'accelerated'
          ? DISK_TIER_SSD
          : DISK_TIER_HDD;
      const defaultDiskSize =
        resolvedInitialCategory === 'accelerated'
          ? DEFAULT_SSD_DISK_SIZE
          : DEFAULT_HDD_DISK_SIZE;
      const defaultDisk = `${defaultDiskTier}, ${defaultDiskSize}`;

      if (!initialExecutorAndDriverConfig) {
        return {
          ...DEFAULT_EXECUTOR_AND_DRIVER_CONFIG,
          executorDiskTier: defaultDiskTier,
          executorDiskSize: defaultDiskSize,
          executorDisk: defaultDisk,
          driverDiskTier: defaultDiskTier,
          driverDiskSize: defaultDiskSize,
          driverDisk: defaultDisk
        };
      }

      const resolvedExecDisk =
        initialExecutorAndDriverConfig.executorDisk ?? defaultDisk;
      const resolvedDrvDisk =
        initialExecutorAndDriverConfig.driverDisk ?? resolvedExecDisk;
      const hasCustomDriver =
        initialExecutorAndDriverConfig.useDifferentDriverConfig ??
        Boolean(
          (initialExecutorAndDriverConfig.driverMachineType &&
            normalizeMachineTypeName(
              initialExecutorAndDriverConfig.driverMachineType,
              ALL_MACHINE_TYPES
            ) !==
              normalizeMachineTypeName(
                initialExecutorAndDriverConfig.executorMachineType ||
                  initialExecutorAndDriverConfig.executorType ||
                  executorType,
                ALL_MACHINE_TYPES
              )) ||
            (initialExecutorAndDriverConfig.driverDisk &&
              initialExecutorAndDriverConfig.driverDisk !== resolvedExecDisk)
        );

      return {
        ...DEFAULT_EXECUTOR_AND_DRIVER_CONFIG,
        ...initialExecutorAndDriverConfig,
        useDifferentDriverConfig: hasCustomDriver,
        driverMachineType:
          initialExecutorAndDriverConfig.driverMachineType ?? executorType,
        executorType:
          initialExecutorAndDriverConfig.executorType ?? executorType,
        executorDiskTier:
          initialExecutorAndDriverConfig.executorDiskTier ?? defaultDiskTier,
        executorDiskSize:
          initialExecutorAndDriverConfig.executorDiskSize ?? defaultDiskSize,
        executorDisk: resolvedExecDisk,
        driverDiskTier:
          initialExecutorAndDriverConfig.driverDiskTier ?? defaultDiskTier,
        driverDiskSize:
          initialExecutorAndDriverConfig.driverDiskSize ?? defaultDiskSize,
        driverDisk: resolvedDrvDisk
      };
    });

  const activeRuntimeEnvironmentConfig = useMemo<IRuntimeEnvironmentConfig>(
    () => ({
      ...runtimeEnvironmentConfig,
      lightningEngineEnabled:
        tier === 'Premium' && Boolean(lightningEngineEnabled)
    }),
    [runtimeEnvironmentConfig, tier, lightningEngineEnabled]
  );
  const executorAndDriverConfig = useMemo<IExecutorAndDriverConfig>(() => {
    const isSameDriver = !executorAndDriverConfigState.useDifferentDriverConfig;
    const resolvedExecutorDiskTier =
      executorAndDriverConfigState.executorDiskTier || DISK_TIER_HDD;
    const resolvedExecutorDiskSize =
      executorAndDriverConfigState.executorDiskSize || DEFAULT_HDD_DISK_SIZE;
    const resolvedExecutorDisk =
      executorAndDriverConfigState.executorDisk ||
      `${resolvedExecutorDiskTier}, ${resolvedExecutorDiskSize}`;

    return {
      ...executorAndDriverConfigState,
      tier,
      executorType,
      executorMachineType: executorType,
      executorDiskTier: resolvedExecutorDiskTier,
      executorDiskSize: resolvedExecutorDiskSize,
      executorDisk: resolvedExecutorDisk,
      ...(isSameDriver && {
        driverMachineType: executorType,
        driverDiskTier: resolvedExecutorDiskTier,
        driverDiskSize: resolvedExecutorDiskSize,
        driverDisk: resolvedExecutorDisk
      }),
      lightningEngineEnabled: Boolean(lightningEngineEnabled)
    };
  }, [executorAndDriverConfigState, tier, executorType, lightningEngineEnabled]);
  const [autoscalingConfig, setAutoscalingConfig] =
    useState<IAutoscalingConfig>(
      () => initialAutoscalingConfig || DEFAULT_AUTOSCALING_CONFIG
    );
  const [metastoreConfig, setMetastoreConfig] = useState<IMetastoreConfig>(
    () => initialMetastoreConfig || DEFAULT_METASTORE_CONFIG
  );
  const [networkAndSecurityConfig, setNetworkAndSecurityConfig] =
    useState<INetworkAndSecurityConfig>(
      () => initialNetworkAndSecurityConfig || DEFAULT_NETWORK_SECURITY_CONFIG
    );
  const [sessionLifecycleConfig, setSessionLifecycleConfig] =
    useState<ISessionLifecycleConfig>(
      () => initialSessionLifecycleConfig || DEFAULT_SESSION_LIFECYCLE_CONFIG
    );
  const [sparkProperties, setSparkProperties] = useState<SparkProperties>(
    () => initialSparkProperties || DEFAULT_SPARK_PROPERTIES
  );
  const [labels, setLabels] = useState<ProfileLabels>(
    () => initialLabels || DEFAULT_PROFILE_LABELS
  );

  /** The save payload for the form's current values. */
  const buildPayload = (
    data: IRuntimeProfileFormData
  ): ICreateRuntimeProfilePayload => {
    const isLightningEngineActive =
      tier === 'Premium' && Boolean(lightningEngineEnabled);
    return {
      displayName: data.displayName.trim(),
      region: data.region,
      description: data.description.trim() || undefined,
      tier,
      lightningEngineEnabled: isLightningEngineActive,
      executorConfig: {
        executorType: executorCategory,
        machineType: executorType
      },
      runtimeEnvironmentConfig: activeRuntimeEnvironmentConfig,
      executorAndDriverConfig,
      autoscalingConfig,
      metastoreConfig,
      networkAndSecurityConfig,
      sessionLifecycleConfig,
      sparkProperties,
      labels
    };
  };

  // The form's values when an existing profile is opened. Saving applies only
  // the changes made since then, so settings the user didn't touch (including
  // ones the form can't show) keep their saved values.
  // Every value buildPayload reads is set from the initial values above when
  // its state is created; no effect fills one in after the first render (the
  // loading effect only sets the region in create mode). Keep it that way, or
  // this snapshot would hold defaults instead of the opened profile.
  const [initialPayload] = useState<ICreateRuntimeProfilePayload | undefined>(
    () =>
      isEditMode
        ? buildPayload({
            displayName: initialDisplayName ?? defaultRuntimeId,
            region: initialRegion ?? '',
            description: initialDescription ?? ''
          })
        : undefined
  );

  useEffect(() => {
    setAutoscalingConfig(
      initialAutoscalingConfig || DEFAULT_AUTOSCALING_CONFIG
    );
  }, [initialAutoscalingConfig]);

  useEffect(() => {
    setMetastoreConfig(initialMetastoreConfig || DEFAULT_METASTORE_CONFIG);
  }, [initialMetastoreConfig]);

  useEffect(() => {
    setSessionLifecycleConfig(
      initialSessionLifecycleConfig || DEFAULT_SESSION_LIFECYCLE_CONFIG
    );
  }, [initialSessionLifecycleConfig]);

  useEffect(() => {
    setSparkProperties(initialSparkProperties || DEFAULT_SPARK_PROPERTIES);
  }, [initialSparkProperties]);

  useEffect(() => {
    setLabels(initialLabels || DEFAULT_PROFILE_LABELS);
  }, [initialLabels]);

  const additionalConfigSections = useMemo(
    () => [
      {
        title: 'Runtime configuration',
        properties: formatRuntimeEnvironmentProperties(
          activeRuntimeEnvironmentConfig
        ),
        isEditDisabled: false,
        onEdit: () => setIsRuntimeConfigDrawerOpen(true)
      },
      {
        title: 'Executor and driver configuration',
        properties: formatExecutorAndDriverProperties(executorAndDriverConfig),
        isEditDisabled: false,
        onEdit: () => setIsExecutorDriverDrawerOpen(true)
      },
      {
        title: 'Autoscaling',
        properties: formatAutoscalingProperties(autoscalingConfig),
        isEditDisabled: false,
        onEdit: () => setIsAutoscalingDrawerOpen(true)
      },
      {
        title: 'Metastore configuration',
        properties: formatMetastoreProperties(metastoreConfig, projectId),
        isEditDisabled: false,
        onEdit: () => setIsMetastoreDrawerOpen(true)
      },
      {
        title: 'Network and security',
        properties: formatNetworkSecurityProperties(networkAndSecurityConfig),
        isEditDisabled: false,
        onEdit: () => setIsNetworkSecurityDrawerOpen(true)
      },
      {
        title: 'Session lifecycle',
        properties: formatSessionLifecycleProperties(sessionLifecycleConfig),
        isEditDisabled: false,
        onEdit: () => setIsSessionLifecycleDrawerOpen(true)
      },
      {
        title: 'Other customizations',
        properties: formatOtherCustomizationProperties(sparkProperties, labels),
        isEditDisabled: false,
        onEdit: () => setIsOtherCustomizationDrawerOpen(true)
      }
    ],
    [
      activeRuntimeEnvironmentConfig,
      executorAndDriverConfig,
      autoscalingConfig,
      metastoreConfig,
      projectId,
      networkAndSecurityConfig,
      sessionLifecycleConfig,
      sparkProperties,
      labels
    ]
  );

  const handleExecutorCategoryChange = (category: ExecutorCategoryType) => {
    if (tier === 'Standard' && category === 'accelerated') {
      return;
    }
    // Re-selecting the current category should preserve the chosen machine type
    if (category === executorCategory) {
      return;
    }
    setExecutorCategory(category);
    // Selecting a category resets the machine type to that category's default.
    // On Standard tier the General default is standard-4, because highmem shapes
    // exceed the Standard tier per-core memory limit.
    if (category === 'accelerated') {
      setExecutorType(DEFAULT_ACCELERATED_EXECUTOR_TYPE);
      setExecutorAndDriverConfigState(prev => ({
        ...prev,
        executorDiskTier: DISK_TIER_SSD,
        executorDiskSize: DEFAULT_SSD_DISK_SIZE,
        executorDisk: `${DISK_TIER_SSD}, ${DEFAULT_SSD_DISK_SIZE}`
      }));
    } else {
      setExecutorType(
        tier === 'Standard'
          ? DEFAULT_STANDARD_TIER_EXECUTOR_TYPE
          : DEFAULT_GENERAL_EXECUTOR_TYPE
      );
    }
  };

  const handleTierChange = (selectedTier: string) => {
    setTier(selectedTier);
    // Standard tier supports neither accelerated nor highmem executor shapes.
    if (
      selectedTier === 'Standard' &&
      (executorCategory === 'accelerated' || executorType.includes('highmem'))
    ) {
      setExecutorCategory('general');
      setExecutorType(DEFAULT_STANDARD_TIER_EXECUTOR_TYPE);
    }
    if (selectedTier === 'Standard') {
      setExecutorAndDriverConfigState(prev => {
        // Standard tier supports neither accelerated nor highmem driver shapes.
        const driverName = normalizeMachineTypeName(
          prev.driverMachineType,
          ALL_MACHINE_TYPES
        );
        const isDriverUnsupported =
          isAcceleratedMachine(driverName, ALL_MACHINE_TYPES) ||
          driverName.includes('highmem');
        return {
          ...prev,
          ...(isDriverUnsupported && {
            driverMachineType: getMachineTypeLabel(
              DEFAULT_STANDARD_TIER_EXECUTOR_TYPE
            )
          }),
          tier: 'Standard',
          executorDiskTier: DISK_TIER_HDD,
          executorDiskSize: DEFAULT_HDD_DISK_SIZE,
          executorDisk: `${DISK_TIER_HDD}, ${DEFAULT_HDD_DISK_SIZE}`,
          driverDiskTier: DISK_TIER_HDD,
          driverDiskSize: DEFAULT_HDD_DISK_SIZE,
          driverDisk: `${DISK_TIER_HDD}, ${DEFAULT_HDD_DISK_SIZE}`
        };
      });
    } else {
      setExecutorAndDriverConfigState(prev => ({
        ...prev,
        tier: 'Premium'
      }));
    }
  };

  const selectedRegionValue = watch('region');
  const selectedRegionDisplayName = React.useMemo(() => {
    if (!selectedRegionValue) {
      return '';
    }
    const matched = regions.find(r => r.name === selectedRegionValue);
    return matched ? matched.displayName : selectedRegionValue;
  }, [regions, selectedRegionValue]);

  const metastoreProjectId = getMetastoreProjectId(metastoreConfig, projectId);

  const summaryInput = React.useMemo(
    () => ({
      tier,
      lightningEngineEnabled,
      regionDisplayName: selectedRegionDisplayName,
      runtimeVersion:
        RUNTIME_VERSION_DISPLAY_MAP[
          activeRuntimeEnvironmentConfig.runtimeVersion || ''
        ] || activeRuntimeEnvironmentConfig.runtimeVersion,
      executorMachineType: executorType,
      executorDisk: executorAndDriverConfig.executorDisk,
      driverMachineType: executorAndDriverConfig.driverMachineType,
      driverDisk: executorAndDriverConfig.driverDisk,
      useDifferentDriverConfig:
        executorAndDriverConfig.useDifferentDriverConfig,
      autoscalingEnabled: autoscalingConfig.autoscalingEnabled,
      initialExecutors: autoscalingConfig.initialExecutors,
      minExecutors: autoscalingConfig.minExecutors,
      maxExecutors: autoscalingConfig.maxExecutors,
      metastore: metastoreConfig.metastore || 'Lakehouse runtime catalog',
      projectId: metastoreProjectId
    }),
    [
      tier,
      lightningEngineEnabled,
      selectedRegionDisplayName,
      activeRuntimeEnvironmentConfig.runtimeVersion,
      executorType,
      executorAndDriverConfig.executorDisk,
      executorAndDriverConfig.driverMachineType,
      executorAndDriverConfig.driverDisk,
      executorAndDriverConfig.useDifferentDriverConfig,
      autoscalingConfig.autoscalingEnabled,
      autoscalingConfig.initialExecutors,
      autoscalingConfig.minExecutors,
      autoscalingConfig.maxExecutors,
      metastoreConfig.metastore,
      metastoreProjectId
    ]
  );

  const pricingInput = React.useMemo(
    () => ({
      executorMachineType: executorType,
      driverMachineType: executorAndDriverConfig.driverMachineType,
      useDifferentDriverConfig:
        executorAndDriverConfig.useDifferentDriverConfig,
      autoscalingEnabled: autoscalingConfig.autoscalingEnabled,
      initialExecutors: autoscalingConfig.initialExecutors,
      minExecutors: autoscalingConfig.minExecutors,
      maxExecutors: autoscalingConfig.maxExecutors
    }),
    [
      executorType,
      executorAndDriverConfig.driverMachineType,
      executorAndDriverConfig.useDifferentDriverConfig,
      autoscalingConfig.autoscalingEnabled,
      autoscalingConfig.initialExecutors,
      autoscalingConfig.minExecutors,
      autoscalingConfig.maxExecutors
    ]
  );
  // Load Regions from service
  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => {
      setIsLoadingOptions(true);
      let credentials: IAuthCredentials | undefined;
      try {
        credentials = await authApi();
        const loadedRegions = await service.getRegions();

        if (isMounted) {
          if (credentials?.project_id) {
            setProjectId(prev => prev || credentials?.project_id);
          }
          setRegions(loadedRegions);

          // Pre-select the region saved in Settings, else the first region.
          // An edited profile keeps its own region, which can't change.
          const defaultRegion =
            loadedRegions.find(r => r.name === credentials?.region_id) ??
            loadedRegions[0];
          if (defaultRegion && !isEditMode) {
            setValue('region', defaultRegion.name, { shouldValidate: true });
          }
        }
      } catch (error) {
        console.error('Failed to load runtime profile initial data', error);
        // Same as the Settings region dropdown: skip the popup when there is
        // already a login/config error.
        if (
          isMounted &&
          !credentials?.login_error &&
          !credentials?.config_error
        ) {
          Notification.emit((error as Error).message, 'error', {
            autoClose: 5000
          });
        }
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
  }, [service, setValue, isEditMode]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (app?.shell?.activeWidget) {
      app.shell.activeWidget.close();
    }
  };

  /**
   * Closes the form and shows the runtime profile listing page: the Spark tab
   * of the Google Cloud Settings widget. Any Settings widget that is already
   * open is replaced by a fresh one, so the listing reloads and includes the
   * new profile.
   */
  const navigateToRuntimeProfileList = () => {
    const shell = app?.shell;
    if (!shell) {
      return;
    }
    const formWidget = shell.activeWidget;
    if (typeof shell.widgets === 'function') {
      Array.from(shell.widgets('main'))
        .filter(widget => widget.title.label === SETTINGS_WIDGET_TITLE)
        .forEach(widget => widget.close());
    }
    // The new Settings layout reads this request when it mounts.
    requestRuntimeProfileListTab();
    void app?.commands.execute(SETTINGS_COMMAND_ID);
    formWidget?.close();
  };

  const onSubmit = async (data: IRuntimeProfileFormData) => {
    try {
      const payload = buildPayload(data);

      if (isEditMode && profile) {
        const updatedProfile = await service.updateRuntimeProfile(
          profile,
          payload,
          initialPayload ?? payload
        );
        Notification.emit(
          `Runtime profile "${data.displayName}" updated successfully.`,
          'success',
          { autoClose: 5000 }
        );
        eventEmitter.emit(RUNTIME_PROFILE_UPDATED_EVENT, updatedProfile);
      } else {
        await service.createRuntimeProfile(payload, undefined, data.region);

        Notification.emit(
          `Runtime profile "${data.displayName}" created successfully.`,
          'success',
          { autoClose: 5000 }
        );
      }

      if (app && launcher) {
        try {
          await registerSessionKernelsInLauncher(app, launcher, themeManager);
        } catch (kernelError) {
          console.error(
            'Failed to refresh session kernels in launcher',
            kernelError
          );
        }
      }

      if (onSuccess) {
        onSuccess();
      } else {
        navigateToRuntimeProfileList();
      }
    } catch (error: any) {
      const errorMessage =
        error?.message ||
        (isEditMode
          ? 'Failed to update runtime profile.'
          : 'Failed to create runtime profile.');
      Notification.emit(errorMessage, 'error', { autoClose: 5000 });
    }
  };

  const ExpandIconComponent = expandAdditionalConfig
    ? iconExpandLess.react
    : iconExpandMore.react;

  // An edited profile can't move to another region, so only its own is listed.
  const regionOptions: IRegionOption[] =
    isEditMode && initialRegion
      ? [{ name: initialRegion, displayName: initialRegion }]
      : regions;

  const handleMainWrapperWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target || !formScrollContainerRef.current) {
      return;
    }
    // When scrolling inside an open EditDrawer, modal, or portaled popup outside the wrapper DOM, do not scroll the create form
    if (
      !event.currentTarget.contains(target) ||
      target.closest(
        '.edit-drawer-paper, .edit-drawer-container, .MuiDrawer-root, .MuiModal-root'
      )
    ) {
      return;
    }
    // When scrolling over the Summary and Pricing Estimate card, let the right panel scroll itself
    if (
      target.closest('[data-testid="runtime-profile-summary-pricing-card"]')
    ) {
      return;
    }
    // When scrolling directly inside the form container, let native scrolling handle it
    if (formScrollContainerRef.current.contains(target)) {
      return;
    }
    // Otherwise (scrolling anywhere outside Summary & Pricing Estimate), scroll the create form container
    formScrollContainerRef.current.scrollTop += event.deltaY;
  };

  return (
    <div
      className="runtime-profile-main-wrapper"
      onWheel={handleMainWrapperWheel}
    >
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
        <div className="cluster-details-title">
          {isEditMode ? 'Edit Runtime Profile' : 'Create a runtime profile'}
        </div>
      </div>

      <div className="runtime-profile-content-layout">
        <div ref={formScrollContainerRef} className="runtime-profile-container">
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
                        disabled={isLoadingOptions || isEditMode}
                      >
                        {regionOptions.map(r => (
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
                  <div className="node-config-card-desc">
                    {TIER_PREMIUM_DESC}
                  </div>
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
                      e.preventDefault();
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
                  onClick={() => handleExecutorCategoryChange('accelerated')}
                  role="button"
                  tabIndex={tier === 'Standard' ? -1 : 0}
                  aria-disabled={tier === 'Standard'}
                  aria-pressed={executorCategory === 'accelerated'}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
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
                    onChange={(e: SelectChangeEvent) => {
                      const newType = e.target.value as string;
                      setExecutorType(newType);
                      const match = ALL_MACHINE_TYPES.find(
                        m => m.name === newType
                      );
                      const isAcc =
                        match?.category === 'accelerated' ||
                        Boolean(match?.acceleratorType);
                      setExecutorAndDriverConfigState(prev => {
                        const nextDiskTier = isAcc
                          ? DISK_TIER_SSD
                          : prev.executorDiskTier || DISK_TIER_HDD;
                        const nextDiskSize = isAcc
                          ? DEFAULT_SSD_DISK_SIZE
                          : prev.executorDiskSize || DEFAULT_HDD_DISK_SIZE;
                        return {
                          ...prev,
                          executorType: newType,
                          executorMachineType: newType,
                          ...(isAcc && {
                            executorDiskTier: nextDiskTier,
                            executorDiskSize: nextDiskSize,
                            executorDisk: `${nextDiskTier}, ${nextDiskSize}`
                          })
                        };
                      });
                    }}
                    notched
                  >
                    {renderGroupedMachineOptions(
                      machineTypes,
                      executorCategory
                    )}
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
                onClick={() =>
                  setExpandAdditionalConfig(!expandAdditionalConfig)
                }
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
                      isEditDisabled={section.isEditDisabled}
                      onEdit={section.onEdit}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="runtime-profile-buttons">
              <button
                type="submit"
                disabled={isSubmitting || hasFormErrors}
                className={`runtime-profile-submit-btn ${
                  isSubmitting || hasFormErrors
                    ? 'submit-button-disable-style'
                    : 'submit-button-style'
                }`}
              >
                {isSubmitting ? (
                  <CircularProgress size={16} color="inherit" />
                ) : isEditMode ? (
                  'Save'
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

        {/* Right Side Panel: Display Summary and Pricing Estimate by default */}
        <div className="runtime-profile-right-panel">
          <div
            className="runtime-profile-summary-pricing-card"
            data-testid="runtime-profile-summary-pricing-card"
          >
            <SummaryComponent summaryInput={summaryInput} />
            <div className="runtime-summary-pricing-section-divider" />
            <PricingComponent pricingInput={pricingInput} />
          </div>
        </div>
      </div>

      <RuntimeEnvironmentEditDrawer
        open={isRuntimeConfigDrawerOpen}
        config={activeRuntimeEnvironmentConfig}
        service={service}
        isProfileIdDisabled={isEditMode}
        onClose={() => setIsRuntimeConfigDrawerOpen(false)}
        onSave={(updatedConfig: IRuntimeEnvironmentConfig) => {
          setRuntimeEnvironmentConfig(updatedConfig);
          setIsRuntimeConfigDrawerOpen(false);
        }}
      />
      <MetastoreEditDrawer
        open={isMetastoreDrawerOpen}
        config={metastoreConfig}
        region={watch('region')}
        onClose={() => setIsMetastoreDrawerOpen(false)}
        onSave={(updatedConfig: IMetastoreConfig) => {
          setMetastoreConfig(updatedConfig);
          setIsMetastoreDrawerOpen(false);
        }}
      />
      <ExecutorAndDriverEditDrawer
        open={isExecutorDriverDrawerOpen}
        config={executorAndDriverConfig}
        onClose={() => setIsExecutorDriverDrawerOpen(false)}
        onSave={(updatedConfig: IExecutorAndDriverConfig) => {
          setTier(updatedConfig.tier || 'Premium');
          setLightningEngineEnabled(
            Boolean(updatedConfig.lightningEngineEnabled)
          );
          const execMachineName =
            updatedConfig.executorMachineType ||
            normalizeMachineTypeName(
              updatedConfig.executorType,
              ALL_MACHINE_TYPES
            );
          const execObj = ALL_MACHINE_TYPES.find(
            m => m.name === execMachineName
          );
          const isAcc =
            execObj?.category === 'accelerated' ||
            Boolean(execObj?.acceleratorType);
          setExecutorCategory(isAcc ? 'accelerated' : 'general');
          setExecutorType(execMachineName);
          setExecutorAndDriverConfigState({
            ...updatedConfig,
            executorType: execMachineName,
            executorMachineType: execMachineName
          });
          setIsExecutorDriverDrawerOpen(false);
        }}
      />

      <NetworkSecurityEditDrawer
        open={isNetworkSecurityDrawerOpen}
        config={networkAndSecurityConfig}
        region={selectedRegion}
        service={service}
        onClose={() => setIsNetworkSecurityDrawerOpen(false)}
        onSave={updatedConfig => {
          setNetworkAndSecurityConfig(updatedConfig);
          setIsNetworkSecurityDrawerOpen(false);
        }}
      />

      <AutoscalingEditDrawer
        open={isAutoscalingDrawerOpen}
        config={autoscalingConfig}
        onClose={() => setIsAutoscalingDrawerOpen(false)}
        onSave={updatedConfig => {
          setAutoscalingConfig(updatedConfig);
          setIsAutoscalingDrawerOpen(false);
        }}
      />

      <SessionLifecycleEditDrawer
        open={isSessionLifecycleDrawerOpen}
        config={sessionLifecycleConfig}
        onClose={() => setIsSessionLifecycleDrawerOpen(false)}
        onSave={updatedConfig => {
          setSessionLifecycleConfig(updatedConfig);
          setIsSessionLifecycleDrawerOpen(false);
        }}
      />

      <OtherCustomizationEditDrawer
        open={isOtherCustomizationDrawerOpen}
        sparkProperties={sparkProperties}
        labels={labels}
        onClose={() => setIsOtherCustomizationDrawerOpen(false)}
        onSave={(updatedSparkProperties, updatedLabels) => {
          setSparkProperties(updatedSparkProperties);
          setLabels(updatedLabels);
          setIsOtherCustomizationDrawerOpen(false);
        }}
      />
    </div>
  );
};

export class CreateRuntimeProfile extends DataprocWidget {
  app: JupyterLab;
  launcher: ILauncher;
  settingRegistry: ISettingRegistry;
  profile?: IRuntimeProfileTemplate;

  /** Pass `profile` to open the form in edit mode for that runtime profile. */
  constructor(
    app: JupyterLab,
    launcher: ILauncher,
    themeManager: IThemeManager,
    settingRegistry: ISettingRegistry,
    profile?: IRuntimeProfileTemplate
  ) {
    super(themeManager);
    this.app = app;
    this.launcher = launcher;
    this.settingRegistry = settingRegistry;
    this.profile = profile;
  }

  renderInternal(): React.JSX.Element {
    return (
      <CreateRuntimeProfileComponent
        app={this.app}
        launcher={this.launcher}
        themeManager={this.themeManager}
        settingRegistry={this.settingRegistry}
        mode={this.profile ? 'edit' : 'create'}
        profile={this.profile}
      />
    );
  }
}
export {
  SectionDetail,
  RuntimeEnvironmentEditDrawer,
  ExecutorAndDriverEditDrawer,
  AutoscalingEditDrawer,
  SessionLifecycleEditDrawer,
  OtherCustomizationEditDrawer,
  SelectBucketEditDrawer,
  NetworkSecurityEditDrawer,
  MetastoreEditDrawer,
  RUNTIME_VERSION_OPTIONS,
  RuntimeProfileSummary,
  RuntimePricingEstimate,
  formatRuntimeProfileSummaryProperties,
  calculateRuntimePricingEstimate,
  ALL_MACHINE_TYPES,
  calculateDcu,
  getMachineTypeLabel,
  getShapeDcu,
  formatDcuNumber,
  formatCompactDiskLabel,
  parseExecutorCount,
  MACHINE_SHAPE_DCU,
  MACHINE_SHAPE_RESOURCES,
  MSG_EXECUTOR_TIER_PREMIUM,
  MSG_EXECUTOR_TIER_PREMIUM_LIGHTNING,
  MSG_EXECUTOR_TIER_STANDARD,
  DEFAULT_INITIAL_EXECUTORS,
  DEFAULT_MIN_EXECUTORS,
  DEFAULT_MAX_EXECUTORS
};
