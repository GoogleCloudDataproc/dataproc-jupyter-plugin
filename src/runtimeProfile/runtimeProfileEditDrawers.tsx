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
import {
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  ListSubheader,
  MenuItem,
  Radio,
  Select,
  TextField,
  Tooltip
} from '@mui/material';
import { EditDrawer } from '../controls/EditDrawer';
import {
  DEFAULT_HDD_DISK_SIZE,
  DISK_TIER_HDD,
  DISK_TIER_OPTIONS,
  DISK_TIER_SSD,
  EncryptionType,
  ExecutionIdentityType,
  HDD_DISK_SIZES,
  IAutoscalingConfig,
  IExecutorAndDriverDraftConfig,
  IExecutorAndDriverEditDrawerProps,
  IMachineTypeOption,
  INetworkAndSecurityConfig,
  IRuntimeEnvironmentConfig,
  IRuntimeProfileService,
  ISessionLifecycleConfig,
  NetworkSourceType,
  ProfileLabels,
  SparkProperties,
  SSD_DISK_SIZES,
  TimeUnit
} from './runtimeProfileInterface';
import {
  applyDriverDiskTierChangeToDraft,
  applyDriverTypeChangeToDraft,
  applyExecutorDiskTierChangeToDraft,
  applyExecutorTypeChangeToDraft,
  applyTierChangeToDraft,
  buildInitialExecutorAndDriverDraft,
  buildSavedExecutorAndDriverConfig,
  getDiskHelperText,
  groupAndFilterMachineTypes,
  isAcceleratedMachine,
  normalizeMachineTypeName,
  parseDiskTierAndSize
} from './runtimeProfileMapper';
import { runtimeProfileService } from './runtimeProfileService';
import {
  CUSTOM_CONTAINERS,
  CUSTOM_CONTAINER_MESSAGE,
  CUSTOM_CONTAINER_MESSAGE_PART,
  DATAPROC_ACCELERATED_MACHINE_TYPES,
  DATAPROC_STANDARD_MACHINE_TYPES,
  DATAPROC_TIER_DOC,
  DEFAULT_GENERAL_EXECUTOR_TYPE,
  DIFFERENT_DRIVER_CHECKBOX_DESC,
  DIFFERENT_DRIVER_CHECKBOX_LABEL,
  DRIVER_CONFIG_SECTION_SUBTITLE,
  DRIVER_CONFIG_SECTION_TITLE,
  EXECUTOR_CONFIG_SECTION_TITLE,
  EXECUTOR_DRIVER_DRAWER_SUBTITLE,
  EXECUTOR_DRIVER_DRAWER_TITLE,
  EXECUTOR_ONLY_SUBTITLE,
  EXECUTOR_SHARED_SUBTITLE,
  KEY_MESSAGE,
  LIGHTNING_ENGINE_CHECKBOX_DESC,
  LIGHTNING_ENGINE_CHECKBOX_LABEL,
  LIGHTNING_ENGINE_DOC,
  NETWORK_TAG_MESSAGE,
  SECURITY_KEY,
  SERVICE_ACCOUNT,
  SHARED_VPC,
  TIER_PREMIUM_DESC,
  TIER_PREMIUM_TITLE,
  TIER_SECTION_SUBTITLE,
  TIER_SECTION_TITLE,
  TIER_STANDARD_DESC,
  TIER_STANDARD_INFO_BANNER,
  TIER_STANDARD_TITLE
} from '../utils/const';
import { authApi } from '../utils/utils';

export const RUNTIME_VERSION_OPTIONS: string[] = [
  '3.0 (Spark 4.0, Java 21, Scala 2.13)',
  '2.3 LTS (Spark 3.5, Java 17, Scala 2.13)',
  '2.2 LTS (Spark 3.5, Java 17, Scala 2.13)',
  '1.2 LTS (Spark 3.5, Java 17, Scala 2.12)',
  '1.1 LTS (Spark 3.3, Java 11, Scala 2.12)'
];

const DEFAULT_RUNTIME_VERSION = '2.3 LTS (Spark 3.5, Java 17, Scala 2.13)';

export const RUNTIME_PROFILE_ID_REGEX = /^[a-z0-9][a-z0-9-]{2,61}[a-z0-9]$/;
export const VALID_BUCKET_NAME_REGEX = /^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$/;
export const RUNTIME_PROFILE_REQUIRED_ERROR =
  'Runtime profile name is required.';
export const RUNTIME_PROFILE_FORMAT_ERROR =
  'A runtime profile name must start and end in a letter or a number, be between 4 and 63 characters long, and contain only lowercase letters, numbers, and hyphens.';
export const STAGING_BUCKET_ERROR =
  'Enter the name of an existing bucket. Try browsing for the bucket instead.';

const BucketItemIcon: React.FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M3 6h18v2l-2 12H5L3 8V6zM7 3h10v2H7V3z" />
  </svg>
);

const BucketValidIcon: React.FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M3 6h18v2l-2 12H5L3 8V6zm3.5 2l.7 2h9.6l.7-2H6.5z"
      fill="#188038"
    />
    <path
      d="M10.5 17.5l-3-3 1.4-1.4 1.6 1.6 4.6-4.6L16.5 11.5l-6 6z"
      fill="#ffffff"
    />
  </svg>
);

const BucketErrorIcon: React.FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M3 6h18v2l-2 12H5L3 8V6zm3.5 2l.7 2h9.6l.7-2H6.5z"
      fill="#d93025"
    />
    <path d="M11 11h2v4h-2v-4zm0 5h2v2h-2v-2z" fill="#ffffff" />
  </svg>
);

const FieldErrorIcon: React.FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
  </svg>
);

const CreateBucketIcon: React.FC = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M3 6h18v2l-2 12H5L3 8V6zm8 4v3H8v2h3v3h2v-3h3v-2h-3v-3h-2zM7 3h10v2H7V3z" />
  </svg>
);

const SearchBucketIcon: React.FC = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
);

const FileItemIcon: React.FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 7V3.5L18.5 9H13z" />
  </svg>
);

const ChevronLeftIcon: React.FC = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
  </svg>
);

const ChevronRightIcon: React.FC = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
  </svg>
);

export interface ISelectBucketEditDrawerProps {
  open: boolean;
  initialBucket?: string;
  service?: IRuntimeProfileService;
  onClose: () => void;
  onSelect: (bucketName: string) => void;
}

export const SelectBucketEditDrawer: React.FC<ISelectBucketEditDrawerProps> = ({
  open,
  initialBucket,
  service = runtimeProfileService,
  onClose,
  onSelect
}) => {
  const [buckets, setBuckets] = useState<string[]>([]);
  const [isLoadingBuckets, setIsLoadingBuckets] = useState<boolean>(false);
  const [selectedBucket, setSelectedBucket] = useState<string>('');
  const [currentBucket, setCurrentBucket] = useState<string | null>(null);
  const [bucketFiles, setBucketFiles] = useState<string[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCreateBucketOpen, setIsCreateBucketOpen] = useState<boolean>(false);
  const [newBucketName, setNewBucketName] = useState<string>('');
  const [expandBucketLabels, setExpandBucketLabels] = useState<boolean>(false);
  const [isCreatingBucket, setIsCreatingBucket] = useState<boolean>(false);
  const [createBucketError, setCreateBucketError] = useState<string>('');

  const isMountedRef = React.useRef(true);
  const activeBucketRef = React.useRef<string | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    setSelectedBucket(
      initialBucket && initialBucket !== 'Auto'
        ? initialBucket.replace(/^gs:\/\//, '')
        : ''
    );
    setCurrentBucket(null);
    setBucketFiles([]);
    setIsSearching(false);
    setSearchQuery('');

    let isMounted = true;
    const loadBuckets = async () => {
      if (!service?.getStorageBuckets) {
        return;
      }
      setIsLoadingBuckets(true);
      try {
        const fetchedBuckets = await service.getStorageBuckets();
        if (isMounted) {
          setBuckets(fetchedBuckets);
        }
      } catch (err) {
        console.error('Failed to load Cloud Storage buckets:', err);
        if (isMounted) {
          setBuckets([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingBuckets(false);
        }
      }
    };

    loadBuckets();
    return () => {
      isMounted = false;
    };
  }, [open, initialBucket, service]);

  const handleOpenBucket = async (bucketName: string) => {
    activeBucketRef.current = bucketName;
    setSelectedBucket(bucketName);
    setCurrentBucket(bucketName);
    setBucketFiles([]);
    if (!service?.getBucketObjects) {
      return;
    }
    setIsLoadingFiles(true);
    try {
      const files = await service.getBucketObjects(bucketName);
      if (isMountedRef.current && activeBucketRef.current === bucketName) {
        setBucketFiles(files);
      }
    } catch (err) {
      console.error(`Failed to load files for bucket ${bucketName}:`, err);
      if (isMountedRef.current && activeBucketRef.current === bucketName) {
        setBucketFiles([]);
      }
    } finally {
      if (isMountedRef.current && activeBucketRef.current === bucketName) {
        setIsLoadingFiles(false);
      }
    }
  };

  const handleBackToBuckets = () => {
    activeBucketRef.current = null;
    setCurrentBucket(null);
    setBucketFiles([]);
  };

  const filteredBuckets = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return buckets;
    }
    return buckets.filter(b => b.toLowerCase().includes(q));
  }, [buckets, searchQuery]);

  const filteredFiles = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return bucketFiles;
    }
    return bucketFiles.filter(f => f.toLowerCase().includes(q));
  }, [bucketFiles, searchQuery]);

  // Select is enabled when a bucket is selected in the root list, and disabled while viewing files inside a bucket
  const isSelectDisabled = !selectedBucket || Boolean(currentBucket);

  return (
    <>
      <EditDrawer
        open={open}
        title="Select bucket"
        saveLabel="Select"
        cancelLabel="Cancel"
        isSaveDisabled={isSelectDisabled}
        onClose={onClose}
        onSave={() => {
          if (selectedBucket && !currentBucket) {
            onSelect(selectedBucket);
          }
        }}
      >
        <div className="bucket-browser-toolbar">
          <button
            type="button"
            id="bucket-browser-back-btn"
            className="bucket-browser-icon-btn"
            disabled={!currentBucket}
            onClick={handleBackToBuckets}
            aria-label="Back to buckets"
          >
            <ChevronLeftIcon />
          </button>

          <div className="bucket-browser-hierarchy-wrapper">
            {isSearching ? (
              <TextField
                id="bucket-search-input"
                label="Search buckets"
                placeholder="Enter bucket name to search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                variant="outlined"
                size="small"
                fullWidth
                autoFocus
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <button
                        type="button"
                        id="bucket-search-clear-btn"
                        className="bucket-browser-icon-btn"
                        onClick={() => {
                          setSearchQuery('');
                          setIsSearching(false);
                        }}
                        aria-label="Close search"
                      >
                        &times;
                      </button>
                    </InputAdornment>
                  )
                }}
              />
            ) : (
              <FormControl
                size="small"
                fullWidth
                variant="outlined"
                disabled={!currentBucket}
              >
                <InputLabel
                  id="bucket-resource-hierarchy-label"
                  shrink
                  disabled={!currentBucket}
                >
                  Resource hierarchy
                </InputLabel>
                <Select
                  labelId="bucket-resource-hierarchy-label"
                  id="bucket-resource-hierarchy"
                  label="Resource hierarchy"
                  notched
                  disabled={!currentBucket}
                  value={currentBucket || 'Buckets'}
                  onChange={e => {
                    const val = e.target.value as string;
                    if (val === 'Buckets') {
                      handleBackToBuckets();
                    }
                  }}
                >
                  <MenuItem value="Buckets">Buckets</MenuItem>
                  {currentBucket && (
                    <MenuItem value={currentBucket}>{currentBucket}</MenuItem>
                  )}
                </Select>
              </FormControl>
            )}
          </div>

          <button
            type="button"
            id="bucket-browser-create-btn"
            className="bucket-browser-icon-btn"
            onClick={() => {
              setNewBucketName('');
              setCreateBucketError('');
              setExpandBucketLabels(false);
              setIsCreateBucketOpen(true);
            }}
            aria-label="Create bucket"
          >
            <CreateBucketIcon />
          </button>

          <button
            type="button"
            id="bucket-browser-search-btn"
            className="bucket-browser-icon-btn"
            onClick={() => {
              if (isSearching) {
                setSearchQuery('');
                setIsSearching(false);
              } else {
                setIsSearching(true);
              }
            }}
            aria-label="Search buckets"
          >
            <SearchBucketIcon />
          </button>
        </div>

        <div className="bucket-browser-list-container" role="listbox">
          {currentBucket ? (
            isLoadingFiles ? (
              <div className="bucket-browser-empty">
                <CircularProgress size={20} />
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="bucket-browser-empty">
                No notebooks or files found in {currentBucket}
              </div>
            ) : (
              filteredFiles.map(fileName => (
                <div
                  key={fileName}
                  className="bucket-browser-item"
                  role="option"
                  aria-selected={false}
                >
                  <div className="bucket-browser-item-left">
                    <span className="bucket-browser-item-icon">
                      <FileItemIcon />
                    </span>
                    <span className="bucket-browser-item-name">{fileName}</span>
                  </div>
                </div>
              ))
            )
          ) : isLoadingBuckets ? (
            <div className="bucket-browser-empty">
              <CircularProgress size={20} />
            </div>
          ) : filteredBuckets.length === 0 ? (
            <div className="bucket-browser-empty">No buckets found</div>
          ) : (
            filteredBuckets.map(bucketName => {
              const isSelected = selectedBucket === bucketName;
              return (
                <div
                  key={bucketName}
                  className={`bucket-browser-item ${
                    isSelected ? 'selected' : ''
                  }`}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={0}
                  onClick={() => {
                    if (isSelected) {
                      handleOpenBucket(bucketName);
                    } else {
                      setSelectedBucket(bucketName);
                    }
                  }}
                  onDoubleClick={() => handleOpenBucket(bucketName)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (isSelected) {
                        handleOpenBucket(bucketName);
                      } else {
                        setSelectedBucket(bucketName);
                      }
                    }
                  }}
                >
                  <div className="bucket-browser-item-left">
                    <span className="bucket-browser-item-icon">
                      <BucketItemIcon />
                    </span>
                    <span className="bucket-browser-item-name">
                      {bucketName}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="bucket-browser-open-btn"
                    aria-label={`Open bucket ${bucketName}`}
                    onClick={e => {
                      e.stopPropagation();
                      handleOpenBucket(bucketName);
                    }}
                  >
                    <ChevronRightIcon />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </EditDrawer>

      <EditDrawer
        open={isCreateBucketOpen}
        title="Create a bucket"
        saveLabel="Create"
        cancelLabel="Cancel"
        isSaveDisabled={!newBucketName.trim() || isCreatingBucket}
        onClose={() => setIsCreateBucketOpen(false)}
        onSave={async () => {
          const trimmed = newBucketName.trim();
          if (!trimmed) {
            return;
          }
          setIsCreatingBucket(true);
          setCreateBucketError('');
          try {
            const createdName = service?.createStorageBucket
              ? await service.createStorageBucket(trimmed)
              : trimmed;
            setBuckets(prev =>
              prev.includes(createdName) ? prev : [createdName, ...prev]
            );
            setSelectedBucket(createdName);
            setCurrentBucket(null);
            setIsCreateBucketOpen(false);
          } catch (err: any) {
            setCreateBucketError(
              err?.message || 'Failed to create Cloud Storage bucket.'
            );
          } finally {
            setIsCreatingBucket(false);
          }
        }}
      >
        <div className="create-bucket-steps">
          {/* Step 1: Get started */}
          <div className="create-bucket-step">
            <div className="create-bucket-step-header">
              <span className="create-bucket-step-dot active" />
              <span className="create-bucket-step-title">Get started</span>
            </div>
            <div className="create-bucket-step-body">
              <div className="create-bucket-subtitle">
                Pick a <strong>globally unique</strong>, permanent name.{' '}
                <span
                  role="button"
                  tabIndex={0}
                  className="section-detail-link"
                  onClick={() =>
                    window.open(
                      'https://cloud.google.com/storage/docs/buckets#naming',
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      window.open(
                        'https://cloud.google.com/storage/docs/buckets#naming',
                        '_blank',
                        'noopener,noreferrer'
                      );
                    }
                  }}
                >
                  Naming guidelines &#8599;
                </span>
              </div>

              <TextField
                id="create-bucket-name-input"
                placeholder="Ex. 'example', 'example_bucket-1', or 'example.com'"
                value={newBucketName}
                onChange={e => {
                  setNewBucketName(e.target.value);
                  if (createBucketError) {
                    setCreateBucketError('');
                  }
                }}
                variant="outlined"
                size="small"
                fullWidth
                error={Boolean(createBucketError)}
                helperText={createBucketError}
              />
              <div className="create-bucket-tip">
                Tip: Don&apos;t include any sensitive information
              </div>

              <div
                className="create-bucket-labels-header"
                role="button"
                tabIndex={0}
                onClick={() => setExpandBucketLabels(prev => !prev)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpandBucketLabels(prev => !prev);
                  }
                }}
              >
                <span>Labels (optional)</span>
                <span>{expandBucketLabels ? '▴' : '▾'}</span>
              </div>
            </div>
          </div>

          {/* Step 2: Choose where to store your data */}
          <div className="create-bucket-step">
            <div className="create-bucket-step-header">
              <span className="create-bucket-step-dot" />
              <span className="create-bucket-step-title">
                Choose where to store your data
              </span>
            </div>
            <div className="create-bucket-step-body">
              <div className="create-bucket-summary-line">
                <strong>Location:</strong> us (multiple regions in United
                States)
              </div>
              <div className="create-bucket-summary-line">
                <strong>Location type:</strong> Multi-region
              </div>
            </div>
          </div>

          {/* Step 3: Choose how to store your data */}
          <div className="create-bucket-step">
            <div className="create-bucket-step-header">
              <span className="create-bucket-step-dot" />
              <span className="create-bucket-step-title">
                Choose how to store your data
              </span>
            </div>
            <div className="create-bucket-step-body">
              <div className="create-bucket-summary-line">
                <strong>Default storage class:</strong> Standard
              </div>
              <div className="create-bucket-summary-line">
                <strong>Hierarchical namespace:</strong> Disabled
              </div>
              <div className="create-bucket-summary-line">
                <strong>Rapid Cache:</strong> Disabled
              </div>
            </div>
          </div>

          {/* Step 4: Choose how to control access to objects */}
          <div className="create-bucket-step">
            <div className="create-bucket-step-header">
              <span className="create-bucket-step-dot" />
              <span className="create-bucket-step-title">
                Choose how to control access to objects
              </span>
            </div>
            <div className="create-bucket-step-body">
              <div className="create-bucket-summary-line">
                <strong>Public access prevention:</strong> On
              </div>
              <div className="create-bucket-summary-line">
                <strong>Access control:</strong> Uniform
              </div>
              <div className="create-bucket-summary-line">
                <strong>IP filtering:</strong> Not configured
              </div>
            </div>
          </div>

          {/* Step 5: Choose how to protect object data */}
          <div className="create-bucket-step">
            <div className="create-bucket-step-header">
              <span className="create-bucket-step-dot" />
              <span className="create-bucket-step-title">
                Choose how to protect object data
              </span>
            </div>
            <div className="create-bucket-step-body">
              <div className="create-bucket-summary-line">
                <strong>Soft delete policy:</strong> Default
              </div>
              <div className="create-bucket-summary-line">
                <strong>Object versioning:</strong> Disabled
              </div>
              <div className="create-bucket-summary-line">
                <strong>Bucket retention policy:</strong> Disabled
              </div>
              <div className="create-bucket-summary-line">
                <strong>Object retention:</strong> Disabled
              </div>
              <div className="create-bucket-summary-line">
                <strong>Encryption type:</strong> Google-managed
              </div>
              <div className="create-bucket-summary-line">
                <strong>Allowed encryption rules:</strong> Google-managed and
                Cloud KMS
              </div>
            </div>
          </div>
        </div>
      </EditDrawer>
    </>
  );
};

export interface IRuntimeEnvironmentEditDrawerProps {
  open: boolean;
  config: IRuntimeEnvironmentConfig;
  service?: IRuntimeProfileService;
  /** Shows the Runtime Profile ID read-only, e.g. when editing an existing profile. */
  isProfileIdDisabled?: boolean;
  onClose: () => void;
  onSave: (updatedConfig: IRuntimeEnvironmentConfig) => void;
}

export const RuntimeEnvironmentEditDrawer: React.FC<
  IRuntimeEnvironmentEditDrawerProps
> = ({
  open,
  config,
  service = runtimeProfileService,
  isProfileIdDisabled = false,
  onClose,
  onSave
}) => {
  const [draftConfig, setDraftConfig] =
    useState<IRuntimeEnvironmentConfig>(config);
  const [isSelectBucketOpen, setIsSelectBucketOpen] = useState<boolean>(false);
  const [existingBuckets, setExistingBuckets] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const matchedVersionOption = config.runtimeVersion
      ? RUNTIME_VERSION_OPTIONS.find(
          opt =>
            opt === config.runtimeVersion ||
            opt.startsWith(`${config.runtimeVersion} `)
        )
      : undefined;
    const normalizedVersion =
      !config.runtimeVersion ||
      config.runtimeVersion === '2.3 LTS (Spark 3.5.1, Python 3.12)'
        ? DEFAULT_RUNTIME_VERSION
        : matchedVersionOption || config.runtimeVersion;
    setDraftConfig({
      ...config,
      runtimeVersion: normalizedVersion
    });
    setIsSelectBucketOpen(false);

    const initialBucket = (config.stagingBucket ?? '')
      .trim()
      .replace(/^gs:\/\//, '');
    const initialValidBuckets =
      initialBucket &&
      initialBucket.toLowerCase() !== 'auto' &&
      VALID_BUCKET_NAME_REGEX.test(initialBucket)
        ? [initialBucket]
        : [];
    setExistingBuckets(initialValidBuckets);

    let isMounted = true;
    const loadExistingBuckets = async () => {
      if (!service?.getStorageBuckets) {
        return;
      }
      try {
        const fetchedBuckets = await service.getStorageBuckets();
        if (isMounted) {
          setExistingBuckets(prev =>
            Array.from(new Set([...prev, ...fetchedBuckets]))
          );
        }
      } catch (err) {
        console.error('Failed to load Cloud Storage buckets:', err);
      }
    };

    loadExistingBuckets();
    return () => {
      isMounted = false;
    };
  }, [open, config, service]);

  const handleFieldChange = (
    field: keyof IRuntimeEnvironmentConfig,
    value: string
  ) => {
    setDraftConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const trimmedProfileId = (draftConfig.runtimeProfileId ?? '').trim();
  const runtimeProfileIdError = isProfileIdDisabled
    ? ''
    : !trimmedProfileId
    ? RUNTIME_PROFILE_REQUIRED_ERROR
    : !RUNTIME_PROFILE_ID_REGEX.test(trimmedProfileId)
    ? RUNTIME_PROFILE_FORMAT_ERROR
    : '';

  const normalizedStagingBucket = (draftConfig.stagingBucket ?? '')
    .trim()
    .replace(/^gs:\/\//, '');
  const isBucketAutoOrEmpty =
    !normalizedStagingBucket ||
    normalizedStagingBucket.toLowerCase() === 'auto';
  const isBucketRegexValid =
    isBucketAutoOrEmpty ||
    VALID_BUCKET_NAME_REGEX.test(normalizedStagingBucket);
  const isBucketValid =
    !isBucketAutoOrEmpty &&
    isBucketRegexValid &&
    (existingBuckets.length === 0 ||
      existingBuckets.includes(normalizedStagingBucket));
  const stagingBucketError =
    !isBucketAutoOrEmpty && !isBucketValid ? STAGING_BUCKET_ERROR : '';

  const versionOptions = React.useMemo(() => {
    const current = draftConfig.runtimeVersion;
    if (current && !RUNTIME_VERSION_OPTIONS.includes(current)) {
      return [current, ...RUNTIME_VERSION_OPTIONS];
    }
    return RUNTIME_VERSION_OPTIONS;
  }, [draftConfig.runtimeVersion]);

  const openExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <EditDrawer
        open={open}
        title="Runtime configuration"
        isSaveDisabled={
          Boolean(runtimeProfileIdError) || Boolean(stagingBucketError)
        }
        onClose={onClose}
        onSave={() => onSave(draftConfig)}
      >
        <div className="edit-drawer-field-group">
          <TextField
            id="edit-runtime-profile-id"
            label="Runtime profile ID *"
            value={draftConfig.runtimeProfileId ?? ''}
            disabled={isProfileIdDisabled}
            onChange={e =>
              handleFieldChange('runtimeProfileId', e.target.value)
            }
            variant="outlined"
            size="small"
            fullWidth
            error={Boolean(runtimeProfileIdError)}
            InputLabelProps={{ shrink: true }}
          />
          {runtimeProfileIdError && (
            <div
              className="edit-drawer-error-text"
              id="runtime-profile-id-error-text"
            >
              <span className="edit-drawer-error-icon">
                <FieldErrorIcon />
              </span>
              <span>{runtimeProfileIdError}</span>
            </div>
          )}
        </div>

        <FormControl size="small" fullWidth variant="outlined">
          <InputLabel id="edit-dataproc-runtime-version-label" shrink>
            Spark runtime version *
          </InputLabel>
          <Select
            labelId="edit-dataproc-runtime-version-label"
            id="edit-dataproc-runtime-version"
            label="Spark runtime version *"
            notched
            value={draftConfig.runtimeVersion || DEFAULT_RUNTIME_VERSION}
            onChange={e =>
              handleFieldChange('runtimeVersion', e.target.value as string)
            }
          >
            {versionOptions.map(version => (
              <MenuItem key={version} value={version}>
                {version}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <div className="edit-drawer-field-group">
          <TextField
            id="edit-custom-spark-image"
            label="Custom spark image"
            placeholder="None"
            value={draftConfig.customSparkImage ?? ''}
            onChange={e =>
              handleFieldChange('customSparkImage', e.target.value)
            }
            variant="outlined"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <div className="edit-drawer-helper-text">
            {CUSTOM_CONTAINER_MESSAGE} {CUSTOM_CONTAINER_MESSAGE_PART} Container
            Registry or Artifact Registry.{' '}
            <span
              role="button"
              tabIndex={0}
              className="section-detail-link"
              onClick={() => openExternalLink(CUSTOM_CONTAINERS)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openExternalLink(CUSTOM_CONTAINERS);
                }
              }}
            >
              Learn more
            </span>
          </div>
        </div>

        <div className="edit-drawer-field-group">
          <div className="edit-drawer-section-heading">
            Cloud storage staging bucket
          </div>
          <TextField
            id="edit-cloud-storage-staging-bucket"
            label="Staging bucket"
            placeholder="Auto"
            value={draftConfig.stagingBucket ?? ''}
            onChange={e => handleFieldChange('stagingBucket', e.target.value)}
            variant="outlined"
            size="small"
            fullWidth
            error={Boolean(stagingBucketError)}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <span
                    className={`bucket-input-adornment-icon${
                      isBucketValid
                        ? ' valid'
                        : stagingBucketError
                        ? ' invalid'
                        : ''
                    }`}
                  >
                    {isBucketValid ? (
                      <BucketValidIcon />
                    ) : stagingBucketError ? (
                      <BucketErrorIcon />
                    ) : (
                      <BucketItemIcon />
                    )}
                  </span>
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <button
                    type="button"
                    className="edit-drawer-browse-btn"
                    onClick={() => setIsSelectBucketOpen(true)}
                  >
                    Browse
                  </button>
                </InputAdornment>
              )
            }}
          />
          {stagingBucketError ? (
            <div
              className="edit-drawer-error-text"
              id="staging-bucket-error-text"
            >
              <span className="edit-drawer-error-icon">
                <FieldErrorIcon />
              </span>
              <span>{stagingBucketError}</span>
            </div>
          ) : (
            <div className="edit-drawer-helper-text">
              Cloud Storage bucket to be used for storing workload dependencies,
              job driver output, and config files.
            </div>
          )}
        </div>

        <div className="edit-drawer-field-group">
          <TextField
            id="edit-python-package-repository"
            label="Python package repository"
            placeholder="Google managed PyPI pull-through cache"
            value={draftConfig.pythonPackageRepository ?? ''}
            onChange={e =>
              handleFieldChange('pythonPackageRepository', e.target.value)
            }
            variant="outlined"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <div className="edit-drawer-helper-text">
            Enter the URI for the repository to install Python packages. By
            default, packages are installed from PyPI pull-through cache on
            Google Cloud.
          </div>
        </div>
      </EditDrawer>

      <SelectBucketEditDrawer
        open={isSelectBucketOpen}
        initialBucket={draftConfig.stagingBucket}
        service={service}
        onClose={() => setIsSelectBucketOpen(false)}
        onSelect={selectedBucket => {
          setExistingBuckets(prev =>
            prev.includes(selectedBucket) ? prev : [...prev, selectedBucket]
          );
          handleFieldChange('stagingBucket', selectedBucket);
          setIsSelectBucketOpen(false);
        }}
      />
    </>
  );
};

export {
  DISK_TIER_OPTIONS,
  HDD_DISK_SIZES,
  IExecutorAndDriverEditDrawerProps,
  SSD_DISK_SIZES,
  isAcceleratedMachine,
  normalizeMachineTypeName,
  parseDiskTierAndSize
};

export const ExecutorAndDriverEditDrawer: React.FC<
  IExecutorAndDriverEditDrawerProps
> = ({ open, config, onClose, onSave, availableMachineTypes }) => {
  const allMachineTypes = React.useMemo<IMachineTypeOption[]>(
    () =>
      availableMachineTypes && availableMachineTypes.length > 0
        ? availableMachineTypes
        : [
            ...DATAPROC_STANDARD_MACHINE_TYPES,
            ...DATAPROC_ACCELERATED_MACHINE_TYPES
          ],
    [availableMachineTypes]
  );

  const [draftConfig, setDraftConfig] = useState<IExecutorAndDriverDraftConfig>(
    {
      tier: 'Premium',
      lightningEngineEnabled: true,
      executorType: DEFAULT_GENERAL_EXECUTOR_TYPE,
      executorDiskTier: DISK_TIER_HDD,
      executorDiskSize: DEFAULT_HDD_DISK_SIZE,
      useDifferentDriverConfig: false,
      driverMachineType: DEFAULT_GENERAL_EXECUTOR_TYPE,
      driverDiskTier: DISK_TIER_HDD,
      driverDiskSize: DEFAULT_HDD_DISK_SIZE
    }
  );

  const [executorSearch, setExecutorSearch] = useState<string>('');
  const [driverSearch, setDriverSearch] = useState<string>('');

  useEffect(() => {
    if (open) {
      setDraftConfig(
        buildInitialExecutorAndDriverDraft(config, allMachineTypes)
      );
      setExecutorSearch('');
      setDriverSearch('');
    }
  }, [open, config, allMachineTypes]);

  const isExecutorAccelerated = isAcceleratedMachine(
    draftConfig.executorType,
    allMachineTypes
  );
  const isDriverAccelerated = isAcceleratedMachine(
    draftConfig.driverMachineType,
    allMachineTypes
  );

  const handleTierChange = (selectedTier: string) => {
    setDraftConfig(prev =>
      applyTierChangeToDraft(prev, selectedTier, allMachineTypes)
    );
  };

  const handleExecutorTypeChange = (selectedType: string) => {
    setDraftConfig(prev =>
      applyExecutorTypeChangeToDraft(prev, selectedType, allMachineTypes)
    );
  };

  const handleExecutorDiskTierChange = (selectedTier: string) => {
    setDraftConfig(prev =>
      applyExecutorDiskTierChangeToDraft(prev, selectedTier)
    );
  };

  const handleExecutorDiskSizeChange = (selectedSize: string) => {
    setDraftConfig(prev => ({
      ...prev,
      executorDiskSize: selectedSize,
      driverDiskSize: prev.useDifferentDriverConfig
        ? prev.driverDiskSize
        : selectedSize
    }));
  };

  const handleUseDifferentDriverConfigChange = (checked: boolean) => {
    setDraftConfig(prev => ({
      ...prev,
      useDifferentDriverConfig: checked,
      driverMachineType: checked ? prev.driverMachineType : prev.executorType,
      driverDiskTier: checked ? prev.driverDiskTier : prev.executorDiskTier,
      driverDiskSize: checked ? prev.driverDiskSize : prev.executorDiskSize
    }));
  };

  const handleDriverMachineTypeChange = (selectedType: string) => {
    setDraftConfig(prev =>
      applyDriverTypeChangeToDraft(prev, selectedType, allMachineTypes)
    );
  };

  const handleDriverDiskTierChange = (selectedTier: string) => {
    setDraftConfig(prev =>
      applyDriverDiskTierChangeToDraft(prev, selectedTier)
    );
  };

  const handleDriverDiskSizeChange = (selectedSize: string) => {
    setDraftConfig(prev => ({
      ...prev,
      driverDiskSize: selectedSize
    }));
  };

  const handleSave = () => {
    onSave(
      buildSavedExecutorAndDriverConfig(config, draftConfig, allMachineTypes)
    );
  };

  const renderMachineTypeDropdown = (
    id: string,
    label: string,
    value: string,
    onChange: (val: string) => void,
    searchQuery: string,
    onSearchChange: (q: string) => void,
    activeTier: string
  ) => {
    const groups = groupAndFilterMachineTypes(
      allMachineTypes,
      activeTier,
      searchQuery
    );

    return (
      <FormControl size="small" fullWidth variant="outlined">
        <InputLabel id={`${id}-label`} shrink>
          {label}
        </InputLabel>
        <Select
          labelId={`${id}-label`}
          id={id}
          label={label}
          notched
          value={value}
          onChange={e => onChange(e.target.value as string)}
          MenuProps={{
            autoFocus: false,
            PaperProps: {
              style: { maxHeight: 380 }
            }
          }}
        >
          <div
            style={{
              padding: '6px 12px',
              position: 'sticky',
              top: 0,
              background: 'var(--jp-layout-color1, #fff)',
              zIndex: 10,
              borderBottom: '1px solid var(--jp-border-color2, #e0e0e0)'
            }}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
          >
            <TextField
              size="small"
              placeholder="Filter machine types..."
              fullWidth
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => e.stopPropagation()}
              variant="outlined"
              inputProps={{ style: { fontSize: 12, padding: '5px 8px' } }}
            />
          </div>
          {Object.entries(groups).map(([groupTitle, items]) => [
            <ListSubheader
              key={`header-${groupTitle}`}
              style={{
                lineHeight: '26px',
                fontWeight: 600,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--jp-ui-font-color2, #5f6368)',
                backgroundColor: 'var(--jp-layout-color2, #f1f3f4)'
              }}
            >
              {groupTitle}
            </ListSubheader>,
            ...items.map(m => (
              <MenuItem key={m.name} value={m.name} style={{ fontSize: 13 }}>
                {m.label}
              </MenuItem>
            ))
          ])}
        </Select>
      </FormControl>
    );
  };

  return (
    <EditDrawer
      open={open}
      title={EXECUTOR_DRIVER_DRAWER_TITLE}
      subtitle={EXECUTOR_DRIVER_DRAWER_SUBTITLE}
      onClose={onClose}
      onSave={handleSave}
    >
      {/* Tier Section */}
      <div className="edit-drawer-field-group">
        <div className="runtime-profile-section-title" style={{ fontSize: 14 }}>
          {TIER_SECTION_TITLE}
        </div>
        <div className="edit-drawer-helper-text">
          {TIER_SECTION_SUBTITLE}{' '}
          <span
            role="button"
            tabIndex={0}
            className="section-detail-link"
            onClick={() =>
              window.open(DATAPROC_TIER_DOC, '_blank', 'noopener,noreferrer')
            }
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                window.open(DATAPROC_TIER_DOC, '_blank');
              }
            }}
          >
            Learn more
          </span>
        </div>

        <div
          className="node-config-cards-container"
          style={{
            marginBottom: 12,
            marginTop: 4,
            width: '100%',
            maxWidth: '100%'
          }}
        >
          <div
            className={`node-config-card ${
              draftConfig.tier === 'Premium' ? 'selected' : ''
            }`}
            style={{ width: '50%' }}
            onClick={() => handleTierChange('Premium')}
            role="button"
            tabIndex={0}
            aria-pressed={draftConfig.tier === 'Premium'}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleTierChange('Premium');
              }
            }}
          >
            <div className="node-config-card-title">{TIER_PREMIUM_TITLE}</div>
            <div className="node-config-card-desc">{TIER_PREMIUM_DESC}</div>
          </div>

          <div
            className={`node-config-card ${
              draftConfig.tier === 'Standard' ? 'selected' : ''
            }`}
            style={{ width: '50%' }}
            onClick={() => handleTierChange('Standard')}
            role="button"
            tabIndex={0}
            aria-pressed={draftConfig.tier === 'Standard'}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleTierChange('Standard');
              }
            }}
          >
            <div className="node-config-card-title">{TIER_STANDARD_TITLE}</div>
            <div className="node-config-card-desc">{TIER_STANDARD_DESC}</div>
          </div>
        </div>

        {draftConfig.tier === 'Standard' && (
          <div className="runtime-profile-info-banner">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ flexShrink: 0, marginRight: 8 }}
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
            <span>{TIER_STANDARD_INFO_BANNER}</span>
          </div>
        )}

        {draftConfig.tier === 'Premium' && (
          <div
            className="runtime-profile-checkbox-section"
            style={{ marginTop: 0, marginBottom: 8 }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={draftConfig.lightningEngineEnabled}
                  onChange={e =>
                    setDraftConfig(prev => ({
                      ...prev,
                      lightningEngineEnabled: e.target.checked
                    }))
                  }
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
                role="button"
                tabIndex={0}
                className="section-detail-link"
                onClick={() =>
                  window.open(
                    LIGHTNING_ENGINE_DOC,
                    '_blank',
                    'noopener,noreferrer'
                  )
                }
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
        )}
      </div>

      {/* Executor Configuration Section */}
      <div className="edit-drawer-field-group">
        <div className="runtime-profile-section-title" style={{ fontSize: 14 }}>
          {draftConfig.useDifferentDriverConfig
            ? EXECUTOR_CONFIG_SECTION_TITLE
            : EXECUTOR_DRIVER_DRAWER_TITLE}
        </div>
        <div className="edit-drawer-subtitle">
          {draftConfig.useDifferentDriverConfig
            ? EXECUTOR_ONLY_SUBTITLE
            : EXECUTOR_SHARED_SUBTITLE}
        </div>

        <div className="executor-driver-section-fields">
          {renderMachineTypeDropdown(
            'edit-executor-machine-type',
            'Executor type',
            draftConfig.executorType,
            handleExecutorTypeChange,
            executorSearch,
            setExecutorSearch,
            draftConfig.tier
          )}

          <div className="executor-driver-disk-row">
            <div className="executor-driver-disk-col">
              <FormControl size="small" fullWidth variant="outlined">
                <InputLabel id="edit-executor-disk-tier-label" shrink>
                  {draftConfig.useDifferentDriverConfig
                    ? 'Executor disk tier'
                    : 'Disk tier'}
                </InputLabel>
                <Select
                  labelId="edit-executor-disk-tier-label"
                  id="edit-executor-disk-tier"
                  label={
                    draftConfig.useDifferentDriverConfig
                      ? 'Executor disk tier'
                      : 'Disk tier'
                  }
                  notched
                  value={draftConfig.executorDiskTier}
                  disabled={
                    isExecutorAccelerated || draftConfig.tier === 'Standard'
                  }
                  onChange={e =>
                    handleExecutorDiskTierChange(e.target.value as string)
                  }
                >
                  {DISK_TIER_OPTIONS.map(opt => (
                    <MenuItem key={opt} value={opt}>
                      {opt}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            <div className="executor-driver-disk-col">
              <FormControl size="small" fullWidth variant="outlined">
                <InputLabel id="edit-executor-disk-size-label" shrink>
                  {draftConfig.useDifferentDriverConfig
                    ? 'Executor disk size'
                    : 'Disk size'}
                </InputLabel>
                <Select
                  labelId="edit-executor-disk-size-label"
                  id="edit-executor-disk-size"
                  label={
                    draftConfig.useDifferentDriverConfig
                      ? 'Executor disk size'
                      : 'Disk size'
                  }
                  notched
                  value={draftConfig.executorDiskSize}
                  onChange={e =>
                    handleExecutorDiskSizeChange(e.target.value as string)
                  }
                >
                  {(draftConfig.executorDiskTier === DISK_TIER_SSD
                    ? SSD_DISK_SIZES
                    : HDD_DISK_SIZES
                  ).map(size => (
                    <MenuItem key={size} value={size}>
                      {size}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
          </div>
        </div>

        <div className="edit-drawer-helper-text">
          {getDiskHelperText(draftConfig.tier, isExecutorAccelerated)}
        </div>
      </div>

      {/* Different configuration for driver checkbox */}
      <div className="edit-drawer-field-group" style={{ marginTop: -4 }}>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={draftConfig.useDifferentDriverConfig}
              onChange={e =>
                handleUseDifferentDriverConfigChange(e.target.checked)
              }
              color="primary"
            />
          }
          label={
            <span className="runtime-profile-checkbox-title">
              {DIFFERENT_DRIVER_CHECKBOX_LABEL}
            </span>
          }
        />
        <div
          className="edit-drawer-helper-text"
          style={{ marginLeft: 28, marginTop: -6 }}
        >
          {DIFFERENT_DRIVER_CHECKBOX_DESC}
        </div>
      </div>

      {/* Driver Configuration Sub-panel */}
      {draftConfig.useDifferentDriverConfig && (
        <div
          className="edit-drawer-field-group"
          style={{
            paddingTop: 12,
            borderTop: '1px solid var(--jp-border-color2, #e0e0e0)'
          }}
        >
          <div
            className="runtime-profile-section-title"
            style={{ fontSize: 14 }}
          >
            {DRIVER_CONFIG_SECTION_TITLE}
          </div>
          <div className="edit-drawer-subtitle">
            {DRIVER_CONFIG_SECTION_SUBTITLE}
          </div>

          <div className="executor-driver-section-fields">
            {renderMachineTypeDropdown(
              'edit-driver-machine-type',
              'Driver machine type',
              draftConfig.driverMachineType,
              handleDriverMachineTypeChange,
              driverSearch,
              setDriverSearch,
              draftConfig.tier
            )}

            <div className="executor-driver-disk-row">
              <div className="executor-driver-disk-col">
                <FormControl size="small" fullWidth variant="outlined">
                  <InputLabel id="edit-driver-disk-tier-label" shrink>
                    Driver disk tier
                  </InputLabel>
                  <Select
                    labelId="edit-driver-disk-tier-label"
                    id="edit-driver-disk-tier"
                    label="Driver disk tier"
                    notched
                    value={draftConfig.driverDiskTier}
                    disabled={
                      isDriverAccelerated || draftConfig.tier === 'Standard'
                    }
                    onChange={e =>
                      handleDriverDiskTierChange(e.target.value as string)
                    }
                  >
                    {DISK_TIER_OPTIONS.map(opt => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>

              <div className="executor-driver-disk-col">
                <FormControl size="small" fullWidth variant="outlined">
                  <InputLabel id="edit-driver-disk-size-label" shrink>
                    Driver disk size
                  </InputLabel>
                  <Select
                    labelId="edit-driver-disk-size-label"
                    id="edit-driver-disk-size"
                    label="Driver disk size"
                    notched
                    value={draftConfig.driverDiskSize}
                    onChange={e =>
                      handleDriverDiskSizeChange(e.target.value as string)
                    }
                  >
                    {(draftConfig.driverDiskTier === DISK_TIER_SSD
                      ? SSD_DISK_SIZES
                      : HDD_DISK_SIZES
                    ).map(size => (
                      <MenuItem key={size} value={size}>
                        {size}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
            </div>
          </div>

          <div className="edit-drawer-helper-text">
            {getDiskHelperText(draftConfig.tier, isDriverAccelerated)}
          </div>
        </div>
      )}
    </EditDrawer>
  );
};

export const DEFAULT_NETWORK_OPTIONS: string[] = ['default'];
export const DEFAULT_SUBNETWORK_OPTIONS: string[] = ['default'];
const INTERNAL_IP_DOC =
  'https://cloud.google.com/dataproc-serverless/docs/concepts/network';
const KMS_KEY_REGEX =
  /^projects\/[^/]+\/locations\/[^/]+\/keyRings\/[^/]+\/cryptoKeys\/[^/]+$/;

const extractSubnetShortName = (val?: string): string => {
  if (!val) {
    return '';
  }
  return (
    /projects\/(?<project>[^/]+)\/regions\/(?<region>[^/]+)\/subnetworks\/(?<subnetwork>[^/?#]+)/.exec(
      val
    )?.groups?.['subnetwork'] || val
  );
};

export interface INetworkSecurityEditDrawerProps {
  open: boolean;
  config: INetworkAndSecurityConfig;
  networkOptions?: string[];
  subnetworkOptions?: string[];
  sharedSubnetworkOptions?: string[];
  keyRingOptions?: string[];
  cryptoKeyOptions?: string[];
  region?: string;
  projectId?: string;
  service?: IRuntimeProfileService;
  onClose: () => void;
  onSave: (updatedConfig: INetworkAndSecurityConfig) => void;
}

export const NetworkSecurityEditDrawer: React.FC<
  INetworkSecurityEditDrawerProps
> = ({
  open,
  config,
  networkOptions,
  subnetworkOptions,
  sharedSubnetworkOptions,
  keyRingOptions,
  cryptoKeyOptions,
  region,
  projectId,
  service = runtimeProfileService,
  onClose,
  onSave
}) => {
  const shouldResolveNetworkFromSubnetwork = Boolean(
    (config.networkSource ?? 'project') === 'project' &&
      !config.primaryNetwork &&
      !config.networkInThisProject &&
      extractSubnetShortName(config.subnetwork) &&
      !networkOptions &&
      service?.getNetworkFromSubnetwork
  );

  const [networkSource, setNetworkSource] = useState<NetworkSourceType>(
    config.networkSource ?? 'project'
  );
  const [primaryNetwork, setPrimaryNetwork] = useState<string>(
    shouldResolveNetworkFromSubnetwork
      ? ''
      : config.primaryNetwork || config.networkInThisProject || 'default'
  );
  const [subnetwork, setSubnetwork] = useState<string>(
    extractSubnetShortName(config.subnetwork) || 'default'
  );
  const [sharedSubnetwork, setSharedSubnetwork] = useState<string>(
    extractSubnetShortName(config.sharedSubnetwork)
  );
  const [hostProjectId, setHostProjectId] = useState<string>(
    config.hostProjectId || ''
  );
  const [networkTagsText, setNetworkTagsText] = useState<string>(
    (config.networkTags || []).join(', ')
  );
  const [internalIpOnly, setInternalIpOnly] = useState<boolean>(
    Boolean(config.internalIpOnly)
  );
  const [executionIdentity, setExecutionIdentity] =
    useState<ExecutionIdentityType>(config.executionIdentity ?? 'user_account');
  const [serviceAccount, setServiceAccount] = useState<string>(
    config.serviceAccount || ''
  );
  const [encryption, setEncryption] = useState<EncryptionType>(
    config.encryption ?? 'google_managed'
  );
  const [kmsKeySelectionMode, setKmsKeySelectionMode] = useState<
    'select' | 'manual'
  >(
    config.kmsKeySelectionMode ??
      (config.kmsKeyName && !config.keyRing ? 'manual' : 'select')
  );
  const [keyRing, setKeyRing] = useState<string>(config.keyRing || '');
  const [cryptoKey, setCryptoKey] = useState<string>(config.cryptoKey || '');
  const [kmsKeyName, setKmsKeyName] = useState<string>(config.kmsKeyName ?? '');
  const [isValidManualKey, setIsValidManualKey] = useState<boolean>(true);

  const [fetchedNetworks, setFetchedNetworks] = useState<string[]>([]);
  const [fetchedSubnetworks, setFetchedSubnetworks] = useState<string[]>([]);
  const [fetchedSharedSubnetworks, setFetchedSharedSubnetworks] = useState<
    string[]
  >([]);
  const [fetchedKeyRings, setFetchedKeyRings] = useState<string[]>([]);
  const [fetchedCryptoKeys, setFetchedCryptoKeys] = useState<string[]>([]);

  const [isLoadingNetworks, setIsLoadingNetworks] = useState<boolean>(false);
  const [isLoadingSubnetworks, setIsLoadingSubnetworks] =
    useState<boolean>(false);
  const [isLoadingSharedSubnetworks, setIsLoadingSharedSubnetworks] =
    useState<boolean>(false);
  const [hasFetchedSubnetworks, setHasFetchedSubnetworks] =
    useState<boolean>(false);
  const [hasFetchedSharedSubnetworks, setHasFetchedSharedSubnetworks] =
    useState<boolean>(false);
  const [hasResolvedParentNetwork, setHasResolvedParentNetwork] =
    useState<boolean>(!shouldResolveNetworkFromSubnetwork);
  const [resolvedProject, setResolvedProject] = useState<string>(
    projectId || ''
  );
  const [resolvedRegion, setResolvedRegion] = useState<string>(region || '');

  useEffect(() => {
    if (!open) {
      setHasResolvedParentNetwork(false);
      return;
    }

    const nextSource = config.networkSource ?? 'project';
    const explicitNet =
      config.primaryNetwork || config.networkInThisProject || '';
    const cleanSub = extractSubnetShortName(config.subnetwork);
    const needsSubnetLookup = Boolean(
      nextSource === 'project' &&
        !explicitNet &&
        cleanSub &&
        !networkOptions &&
        service?.getNetworkFromSubnetwork
    );

    setNetworkSource(nextSource);
    setPrimaryNetwork(needsSubnetLookup ? '' : explicitNet || 'default');
    setHasResolvedParentNetwork(!needsSubnetLookup);
    setSubnetwork(cleanSub || 'default');
    setSharedSubnetwork(extractSubnetShortName(config.sharedSubnetwork));
    setHostProjectId(config.hostProjectId || '');
    setHasFetchedSubnetworks(false);
    setHasFetchedSharedSubnetworks(false);
    setNetworkTagsText((config.networkTags || []).join(', '));
    setInternalIpOnly(Boolean(config.internalIpOnly));
    setExecutionIdentity(config.executionIdentity ?? 'user_account');
    setServiceAccount(config.serviceAccount || '');
    setEncryption(config.encryption ?? 'google_managed');

    // Extract keyRing and cryptoKey from kmsKeyName if formatted and not explicitly stored
    let initialKeyRing = config.keyRing || '';
    let initialCryptoKey = config.cryptoKey || '';
    if (!initialKeyRing && config.kmsKeyName) {
      const parts = config.kmsKeyName.split('/');
      if (
        parts.length === 8 &&
        parts[0] === 'projects' &&
        parts[2] === 'locations' &&
        parts[4] === 'keyRings' &&
        parts[6] === 'cryptoKeys'
      ) {
        initialKeyRing = parts[5] || '';
        initialCryptoKey = parts[7] || '';
      }
    }

    const resolvedKmsMode: 'select' | 'manual' =
      config.kmsKeySelectionMode ??
      (config.kmsKeyName && !initialKeyRing ? 'manual' : 'select');
    setKmsKeySelectionMode(resolvedKmsMode);

    if (resolvedKmsMode === 'manual') {
      setKeyRing('');
      setCryptoKey('');
      setKmsKeyName(config.kmsKeyName ?? '');
      setIsValidManualKey(
        !config.kmsKeyName || KMS_KEY_REGEX.test(config.kmsKeyName)
      );
    } else {
      setKeyRing(initialKeyRing);
      setCryptoKey(initialCryptoKey);
      setKmsKeyName('');
      setIsValidManualKey(true);
    }
  }, [open, config, networkOptions, service]);

  // Load primary networks (and resolve parent network from subnetwork when unset)
  useEffect(() => {
    if (!open || networkSource !== 'project') {
      return;
    }
    let isMounted = true;

    const fetchProjectNetworks = async () => {
      const explicitNet =
        config.primaryNetwork || config.networkInThisProject || '';
      const cleanSub = extractSubnetShortName(config.subnetwork);
      const needsSubnetLookup = Boolean(
        !explicitNet &&
          cleanSub &&
          !networkOptions &&
          service?.getNetworkFromSubnetwork
      );

      if (needsSubnetLookup || (service?.getNetworks && !networkOptions)) {
        setIsLoadingNetworks(true);
      }

      try {
        const credentials = await authApi().catch(() => undefined);
        const targetProject = projectId || credentials?.project_id || '';
        const targetRegion = region || credentials?.region_id || '';

        if (isMounted) {
          setResolvedProject(targetProject);
          setResolvedRegion(targetRegion);
        }

        const [resolvedFromSubnet, networks] = await Promise.all([
          needsSubnetLookup && service?.getNetworkFromSubnetwork
            ? service
                .getNetworkFromSubnetwork(cleanSub, targetProject, targetRegion)
                .catch(error => {
                  console.error(
                    'Failed to resolve network from subnetwork:',
                    error
                  );
                  return '';
                })
            : Promise.resolve(''),
          service?.getNetworks && !networkOptions
            ? service.getNetworks(targetProject).catch(error => {
                console.error('Failed to load networks:', error);
                return null;
              })
            : Promise.resolve(null)
        ]);

        if (!isMounted) {
          return;
        }

        const targetNetwork = explicitNet || resolvedFromSubnet || 'default';

        if (Array.isArray(networks) && networks.length > 0) {
          setFetchedNetworks(networks);
          if (!networks.includes(targetNetwork)) {
            setPrimaryNetwork(networks[0]);
            setSubnetwork('');
          } else if (needsSubnetLookup) {
            setPrimaryNetwork(targetNetwork);
          }
        } else if (needsSubnetLookup) {
          setPrimaryNetwork(targetNetwork);
        }

        if (needsSubnetLookup) {
          setHasResolvedParentNetwork(true);
        }
      } finally {
        if (isMounted) {
          setIsLoadingNetworks(false);
        }
      }
    };

    fetchProjectNetworks();

    return () => {
      isMounted = false;
    };
  }, [
    open,
    networkSource,
    projectId,
    region,
    service,
    networkOptions,
    config.primaryNetwork,
    config.networkInThisProject,
    config.subnetwork
  ]);

  // Load Shared VPC subnetworks when drawer opens and 'shared_from_host' is selected
  useEffect(() => {
    if (
      !open ||
      networkSource !== 'shared_from_host' ||
      sharedSubnetworkOptions ||
      !service?.getSharedVpcSubnetworks
    ) {
      return;
    }
    let isMounted = true;

    const fetchSharedVpcResources = async () => {
      setIsLoadingSharedSubnetworks(true);
      try {
        const credentials = await authApi().catch(() => undefined);
        const targetProject = projectId || credentials?.project_id || '';
        const targetRegion = region || credentials?.region_id || '';

        if (isMounted) {
          setResolvedProject(targetProject);
          setResolvedRegion(targetRegion);
        }

        const sharedResult = await service.getSharedVpcSubnetworks!(
          targetProject,
          targetRegion
        );
        if (isMounted && sharedResult) {
          const subs = sharedResult.subnetworks || [];
          setFetchedSharedSubnetworks(subs);
          if (sharedResult.hostProjectId !== undefined) {
            setHostProjectId(sharedResult.hostProjectId);
          }
          if (subs.length > 0) {
            setSharedSubnetwork(prev =>
              prev && subs.includes(prev) ? prev : subs[0]
            );
          } else {
            setSharedSubnetwork('');
          }
          setHasFetchedSharedSubnetworks(true);
        }
      } catch (error) {
        console.error('Failed to load shared VPC subnetworks:', error);
        if (isMounted) {
          setHasFetchedSharedSubnetworks(true);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSharedSubnetworks(false);
        }
      }
    };

    fetchSharedVpcResources();

    return () => {
      isMounted = false;
    };
  }, [
    open,
    networkSource,
    projectId,
    region,
    service,
    sharedSubnetworkOptions
  ]);

  // Load KMS Key Rings only when 'customer_managed_key' radio option is selected
  useEffect(() => {
    if (
      !open ||
      encryption !== 'customer_managed_key' ||
      keyRingOptions ||
      !service?.getKeyRings
    ) {
      return;
    }
    let isMounted = true;

    const fetchKeyRings = async () => {
      try {
        const credentials = await authApi().catch(() => undefined);
        const targetProject = projectId || credentials?.project_id || '';
        const targetRegion = region || credentials?.region_id || '';

        if (isMounted) {
          setResolvedProject(targetProject);
          setResolvedRegion(targetRegion);
        }

        const rings = await service.getKeyRings!(targetProject, targetRegion);
        if (isMounted && Array.isArray(rings)) {
          setFetchedKeyRings(rings);
        }
      } catch (error) {
        console.error('Failed to load KMS key rings:', error);
      }
    };

    fetchKeyRings();

    return () => {
      isMounted = false;
    };
  }, [open, encryption, projectId, region, service, keyRingOptions]);

  // Load subnetworks whenever primaryNetwork changes while drawer is open
  useEffect(() => {
    if (
      !open ||
      networkSource !== 'project' ||
      !hasResolvedParentNetwork ||
      !primaryNetwork ||
      subnetworkOptions ||
      !service?.getSubnetworks
    ) {
      return;
    }
    let isMounted = true;

    const fetchSubnetworksForNetwork = async () => {
      setIsLoadingSubnetworks(true);
      try {
        const credentials = await authApi().catch(() => undefined);
        const targetProject = projectId || credentials?.project_id || '';
        const targetRegion = region || credentials?.region_id || '';

        const subs = await service.getSubnetworks!(
          primaryNetwork,
          targetProject,
          targetRegion
        );
        if (isMounted && Array.isArray(subs)) {
          setFetchedSubnetworks(subs);
          setHasFetchedSubnetworks(true);
          if (subs.length > 0) {
            setSubnetwork(prev =>
              prev && subs.includes(prev) ? prev : subs[0]
            );
          } else {
            setSubnetwork('');
          }
        }
      } catch (error) {
        console.error('Failed to load subnetworks:', error);
        if (isMounted) {
          setFetchedSubnetworks([]);
          setSubnetwork('');
          setHasFetchedSubnetworks(true);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSubnetworks(false);
        }
      }
    };

    fetchSubnetworksForNetwork();

    return () => {
      isMounted = false;
    };
  }, [
    open,
    networkSource,
    hasResolvedParentNetwork,
    primaryNetwork,
    projectId,
    region,
    service,
    subnetworkOptions
  ]);

  // Load KMS CryptoKeys whenever keyRing changes while drawer is open
  useEffect(() => {
    if (
      !open ||
      encryption !== 'customer_managed_key' ||
      !keyRing ||
      cryptoKeyOptions ||
      !service?.getCryptoKeys
    ) {
      return;
    }
    let isMounted = true;

    const fetchKeysForRing = async () => {
      try {
        const credentials = await authApi().catch(() => undefined);
        const targetProject = projectId || credentials?.project_id || '';
        const targetRegion = region || credentials?.region_id || '';

        const keys = await service.getCryptoKeys!(
          keyRing,
          targetProject,
          targetRegion
        );
        if (isMounted && Array.isArray(keys)) {
          setFetchedCryptoKeys(keys);
          if (keys.length > 0) {
            setCryptoKey(prev =>
              prev && keys.includes(prev) ? prev : keys[0]
            );
          } else {
            setCryptoKey('');
          }
        }
      } catch (error) {
        console.error('Failed to load KMS crypto keys:', error);
      }
    };

    fetchKeysForRing();

    return () => {
      isMounted = false;
    };
  }, [open, encryption, keyRing, projectId, region, service, cryptoKeyOptions]);

  const resolvedNetworkOptions = React.useMemo(() => {
    const source =
      networkOptions && networkOptions.length > 0
        ? networkOptions
        : fetchedNetworks.length > 0
        ? fetchedNetworks
        : DEFAULT_NETWORK_OPTIONS;
    if (primaryNetwork && !source.includes(primaryNetwork)) {
      return [primaryNetwork, ...source];
    }
    return source;
  }, [networkOptions, fetchedNetworks, primaryNetwork]);

  const resolvedSubnetworkOptions = React.useMemo(() => {
    const source =
      subnetworkOptions && subnetworkOptions.length > 0
        ? subnetworkOptions
        : hasFetchedSubnetworks
        ? fetchedSubnetworks
        : fetchedSubnetworks.length > 0
        ? fetchedSubnetworks
        : DEFAULT_SUBNETWORK_OPTIONS;
    if (subnetwork && !hasFetchedSubnetworks && !source.includes(subnetwork)) {
      return [subnetwork, ...source];
    }
    return source;
  }, [
    subnetworkOptions,
    fetchedSubnetworks,
    hasFetchedSubnetworks,
    subnetwork
  ]);

  const resolvedSharedSubnetworkOptions = React.useMemo(() => {
    const source =
      sharedSubnetworkOptions && sharedSubnetworkOptions.length > 0
        ? sharedSubnetworkOptions
        : fetchedSharedSubnetworks;
    if (sharedSubnetwork && !source.includes(sharedSubnetwork)) {
      return [sharedSubnetwork, ...source];
    }
    return source;
  }, [sharedSubnetworkOptions, fetchedSharedSubnetworks, sharedSubnetwork]);

  const hasNoSubnetworks =
    !isLoadingNetworks &&
    !isLoadingSubnetworks &&
    hasFetchedSubnetworks &&
    resolvedSubnetworkOptions.length === 0;

  const hasNoSharedSubnetworks =
    !isLoadingSharedSubnetworks &&
    (hasFetchedSharedSubnetworks || Boolean(sharedSubnetworkOptions)) &&
    resolvedSharedSubnetworkOptions.length === 0;

  const resolvedKeyRingOptions = React.useMemo(() => {
    const source =
      keyRingOptions && keyRingOptions.length > 0
        ? keyRingOptions
        : fetchedKeyRings;
    if (keyRing && !source.includes(keyRing)) {
      return [keyRing, ...source];
    }
    return source;
  }, [keyRingOptions, fetchedKeyRings, keyRing]);

  const resolvedCryptoKeyOptions = React.useMemo(() => {
    const source =
      cryptoKeyOptions && cryptoKeyOptions.length > 0
        ? cryptoKeyOptions
        : fetchedCryptoKeys;
    if (cryptoKey && !source.includes(cryptoKey)) {
      return [cryptoKey, ...source];
    }
    return source;
  }, [cryptoKeyOptions, fetchedCryptoKeys, cryptoKey]);

  const openExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const renderExternalLinkIcon = () => (
    <svg
      className="edit-drawer-external-link-icon"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
    </svg>
  );

  const renderFieldHelpIcon = (tooltipText: string) => (
    <InputAdornment
      position="end"
      className="edit-drawer-select-help"
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      <Tooltip title={tooltipText}>
        <span
          className="edit-drawer-help-icon"
          role="img"
          aria-label={tooltipText}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z" />
          </svg>
        </span>
      </Tooltip>
    </InputAdornment>
  );

  const handleManualKmsKeyChange = (value: string) => {
    setKmsKeySelectionMode('manual');
    setKmsKeyName(value);
    setIsValidManualKey(value === '' || KMS_KEY_REGEX.test(value.trim()));
  };

  const hasResolvedKmsKey =
    kmsKeySelectionMode === 'manual'
      ? Boolean(kmsKeyName.trim()) &&
        isValidManualKey &&
        KMS_KEY_REGEX.test(kmsKeyName.trim())
      : Boolean(keyRing.trim() && cryptoKey.trim());

  const isSaveDisabled =
    (networkSource === 'project' &&
      (hasNoSubnetworks ||
        isLoadingNetworks ||
        isLoadingSubnetworks ||
        !primaryNetwork.trim() ||
        !subnetwork.trim())) ||
    (networkSource === 'shared_from_host' &&
      (hasNoSharedSubnetworks ||
        isLoadingSharedSubnetworks ||
        !sharedSubnetwork.trim())) ||
    (encryption === 'customer_managed_key' && !hasResolvedKmsKey);

  const handleSave = () => {
    if (isSaveDisabled) {
      return;
    }

    const parsedTags = networkTagsText
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const isSelectKmsMode =
      encryption === 'customer_managed_key' && kmsKeySelectionMode === 'select';
    const isManualKmsMode =
      encryption === 'customer_managed_key' && kmsKeySelectionMode === 'manual';

    let finalKmsKeyName: string | undefined;
    if (isSelectKmsMode && keyRing && cryptoKey) {
      const proj = projectId || resolvedProject;
      const reg = region || resolvedRegion;
      finalKmsKeyName =
        proj && reg
          ? `projects/${proj}/locations/${reg}/keyRings/${keyRing}/cryptoKeys/${cryptoKey}`
          : undefined;
    } else if (isManualKmsMode) {
      finalKmsKeyName = kmsKeyName.trim() || undefined;
    }

    onSave({
      ...config,
      networkSource,
      primaryNetwork,
      networkInThisProject: primaryNetwork,
      subnetwork: subnetwork.trim(),
      sharedSubnetwork:
        networkSource === 'shared_from_host'
          ? sharedSubnetwork.trim() || undefined
          : undefined,
      hostProjectId:
        networkSource === 'shared_from_host'
          ? hostProjectId || undefined
          : undefined,
      networkTags: parsedTags,
      internalIpOnly,
      executionIdentity,
      serviceAccount:
        executionIdentity === 'service_account'
          ? serviceAccount.trim() || undefined
          : undefined,
      encryption,
      kmsKeySelectionMode:
        encryption === 'customer_managed_key' ? kmsKeySelectionMode : undefined,
      keyRing: isSelectKmsMode ? keyRing || undefined : undefined,
      cryptoKey: isSelectKmsMode ? cryptoKey || undefined : undefined,
      kmsKeyName: finalKmsKeyName
    });
  };

  return (
    <EditDrawer
      open={open}
      title="Network and security"
      onClose={onClose}
      onSave={handleSave}
      isSaveDisabled={isSaveDisabled}
    >
      {/* Connect your cluster */}
      <div className="edit-drawer-field-group">
        <div className="edit-drawer-section-heading">Connect your cluster</div>
        <div className="edit-drawer-helper-text">
          Establishes connectivity for the VM instances in this cluster.
        </div>

        <div className="edit-drawer-radio-group">
          {/* Option 1: Networks in this project */}
          <div>
            <div
              className="edit-drawer-radio-option"
              onClick={() => setNetworkSource('project')}
              role="radio"
              aria-checked={networkSource === 'project'}
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setNetworkSource('project');
                }
              }}
            >
              <Radio
                id="edit-network-source-project"
                checked={networkSource === 'project'}
                onChange={() => setNetworkSource('project')}
                size="small"
                color="primary"
              />
              <div className="edit-drawer-option-content">
                <div className="edit-drawer-option-title">
                  Networks in this project
                </div>
                <div className="edit-drawer-helper-text">
                  <span
                    role="button"
                    tabIndex={0}
                    className="section-detail-link"
                    onClick={e => {
                      e.stopPropagation();
                      openExternalLink(INTERNAL_IP_DOC);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        openExternalLink(INTERNAL_IP_DOC);
                      }
                    }}
                  >
                    Learn more
                    {renderExternalLinkIcon()}
                  </span>
                </div>
              </div>
            </div>

            {networkSource === 'project' && (
              <div className="edit-drawer-nested-fields">
                <div className="edit-drawer-row">
                  <FormControl
                    size="small"
                    fullWidth
                    variant="outlined"
                    className="edit-drawer-select-with-help"
                  >
                    <InputLabel id="edit-primary-network-label" shrink>
                      Primary network *
                    </InputLabel>
                    <Select
                      labelId="edit-primary-network-label"
                      id="edit-primary-network"
                      label="Primary network *"
                      notched
                      disabled={isLoadingNetworks}
                      value={primaryNetwork}
                      endAdornment={renderFieldHelpIcon(
                        'The Compute Engine network for the cluster VMs.'
                      )}
                      onChange={e => {
                        setPrimaryNetwork(e.target.value as string);
                        setSubnetwork('');
                      }}
                    >
                      {resolvedNetworkOptions.map(net => (
                        <MenuItem key={net} value={net}>
                          {net}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl
                    size="small"
                    fullWidth
                    variant="outlined"
                    error={hasNoSubnetworks}
                    className="edit-drawer-select-with-help"
                  >
                    <InputLabel
                      id="edit-subnetwork-label"
                      shrink
                      error={hasNoSubnetworks}
                    >
                      Subnetwork
                    </InputLabel>
                    <Select
                      labelId="edit-subnetwork-label"
                      id="edit-subnetwork"
                      label="Subnetwork"
                      notched
                      error={hasNoSubnetworks}
                      disabled={isLoadingSubnetworks}
                      value={
                        resolvedSubnetworkOptions.includes(subnetwork)
                          ? subnetwork
                          : ''
                      }
                      endAdornment={renderFieldHelpIcon(
                        'The Compute Engine subnetwork with Private Google Access enabled.'
                      )}
                      onChange={e => setSubnetwork(e.target.value as string)}
                    >
                      {resolvedSubnetworkOptions.length === 0 ? (
                        <MenuItem value="__no_items__" disabled>
                          No items to display
                        </MenuItem>
                      ) : (
                        resolvedSubnetworkOptions.map(sub => (
                          <MenuItem key={sub} value={sub}>
                            {sub}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                </div>

                {hasNoSubnetworks && (
                  <div className="edit-drawer-error-text">
                    Please select a valid network and subnetwork.
                  </div>
                )}

                <div className="edit-drawer-field-group">
                  <TextField
                    id="edit-network-tags"
                    label="Network tags"
                    placeholder="Network tags"
                    value={networkTagsText}
                    onChange={e => setNetworkTagsText(e.target.value)}
                    variant="outlined"
                    size="small"
                    fullWidth
                  />
                  <div className="edit-drawer-helper-text">
                    {NETWORK_TAG_MESSAGE}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Option 2: Networks shared from host project */}
          <div>
            <div
              className="edit-drawer-radio-option"
              onClick={() => setNetworkSource('shared_from_host')}
              role="radio"
              aria-checked={networkSource === 'shared_from_host'}
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setNetworkSource('shared_from_host');
                }
              }}
            >
              <Radio
                id="edit-network-source-shared"
                checked={networkSource === 'shared_from_host'}
                onChange={() => setNetworkSource('shared_from_host')}
                size="small"
                color="primary"
              />
              <div className="edit-drawer-option-content">
                <div className="edit-drawer-option-title">
                  {`Networks shared from host project: "${hostProjectId}"`}
                </div>
                <div className="edit-drawer-helper-text">
                  Choose a shared VPC network from project that is different
                  from this cluster&apos;s project.
                  <div>
                    <span
                      role="button"
                      tabIndex={0}
                      className="section-detail-link"
                      onClick={e => {
                        e.stopPropagation();
                        openExternalLink(SHARED_VPC);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          openExternalLink(SHARED_VPC);
                        }
                      }}
                    >
                      Learn more
                      {renderExternalLinkIcon()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {networkSource === 'shared_from_host' && (
              <div className="edit-drawer-nested-fields">
                <FormControl
                  size="small"
                  fullWidth
                  variant="outlined"
                  className="edit-drawer-select-with-help"
                >
                  <InputLabel id="edit-shared-subnetwork-label">
                    Shared subnetwork *
                  </InputLabel>
                  <Select
                    labelId="edit-shared-subnetwork-label"
                    id="edit-shared-subnetwork"
                    label="Shared subnetwork *"
                    disabled={isLoadingSharedSubnetworks}
                    value={
                      resolvedSharedSubnetworkOptions.includes(sharedSubnetwork)
                        ? sharedSubnetwork
                        : ''
                    }
                    endAdornment={renderFieldHelpIcon(
                      'The Compute Engine subnetwork with Private Google Access enabled.'
                    )}
                    onChange={e =>
                      setSharedSubnetwork(e.target.value as string)
                    }
                  >
                    {resolvedSharedSubnetworkOptions.length === 0 ? (
                      <MenuItem value="__no_items__" disabled>
                        No items to display
                      </MenuItem>
                    ) : (
                      resolvedSharedSubnetworkOptions.map(sub => (
                        <MenuItem key={sub} value={sub}>
                          {sub}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
                {hasNoSharedSubnetworks && (
                  <div className="edit-drawer-info-banner">
                    <div className="edit-drawer-info-banner-icon" />
                    <div className="edit-drawer-info-banner-text">
                      No shared subnetworks are available in this region.
                    </div>
                  </div>
                )}
                <div className="edit-drawer-field-group">
                  <TextField
                    id="edit-shared-network-tags"
                    label="Network tags"
                    placeholder="Network tags"
                    value={networkTagsText}
                    onChange={e => setNetworkTagsText(e.target.value)}
                    variant="outlined"
                    size="small"
                    fullWidth
                  />
                  <div className="edit-drawer-helper-text">
                    {NETWORK_TAG_MESSAGE}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Execute notebooks with */}
      <div className="edit-drawer-field-group">
        <div className="edit-drawer-section-heading">
          Execute notebooks with
        </div>
        <div className="edit-drawer-radio-group">
          <div
            className="edit-drawer-radio-option"
            onClick={() => setExecutionIdentity('user_account')}
            role="radio"
            aria-checked={executionIdentity === 'user_account'}
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setExecutionIdentity('user_account');
              }
            }}
          >
            <Radio
              id="edit-execution-identity-user-account"
              checked={executionIdentity === 'user_account'}
              onChange={() => setExecutionIdentity('user_account')}
              size="small"
              color="primary"
            />
            <div className="edit-drawer-option-content">
              <div className="edit-drawer-option-title">User Account</div>
            </div>
          </div>

          <div
            className="edit-drawer-radio-option"
            onClick={() => setExecutionIdentity('service_account')}
            role="radio"
            aria-checked={executionIdentity === 'service_account'}
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setExecutionIdentity('service_account');
              }
            }}
          >
            <Radio
              id="edit-execution-identity-service-account"
              checked={executionIdentity === 'service_account'}
              onChange={() => setExecutionIdentity('service_account')}
              size="small"
              color="primary"
            />
            <div className="edit-drawer-option-content">
              <div className="edit-drawer-option-title">Service Account</div>
            </div>
          </div>

          {executionIdentity === 'service_account' && (
            <div className="edit-drawer-nested-fields">
              <TextField
                id="edit-service-account"
                label="Service account"
                value={serviceAccount}
                onChange={e => setServiceAccount(e.target.value)}
                variant="outlined"
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <div className="edit-drawer-helper-text">
                If not provided, the default GCE service account will be used.{' '}
                <span
                  role="button"
                  tabIndex={0}
                  className="section-detail-link"
                  onClick={() => openExternalLink(SERVICE_ACCOUNT)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openExternalLink(SERVICE_ACCOUNT);
                    }
                  }}
                >
                  Learn more
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Encryption */}
      <div className="edit-drawer-field-group">
        <div className="edit-drawer-section-heading">Encryption</div>
        <div className="edit-drawer-helper-text">
          Encrypt cluster persistent disk data and optionally job argument data.
        </div>

        <div className="edit-drawer-radio-group">
          <div
            className="edit-drawer-radio-option"
            onClick={() => setEncryption('google_managed')}
            role="radio"
            aria-checked={encryption === 'google_managed'}
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setEncryption('google_managed');
              }
            }}
          >
            <Radio
              id="edit-encryption-google-managed"
              checked={encryption === 'google_managed'}
              onChange={() => setEncryption('google_managed')}
              size="small"
              color="primary"
            />
            <div className="edit-drawer-option-content">
              <div className="edit-drawer-option-title">
                Google-managed encryption key
              </div>
              <div className="edit-drawer-helper-text">
                Keys owned by Google
              </div>
            </div>
          </div>

          <div>
            <div
              className="edit-drawer-radio-option"
              onClick={() => setEncryption('customer_managed_key')}
              role="radio"
              aria-checked={encryption === 'customer_managed_key'}
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setEncryption('customer_managed_key');
                }
              }}
            >
              <Radio
                id="edit-encryption-customer-managed"
                checked={encryption === 'customer_managed_key'}
                onChange={() => setEncryption('customer_managed_key')}
                size="small"
                color="primary"
              />
              <div className="edit-drawer-option-content">
                <div className="edit-drawer-option-title">Cloud KMS key</div>
                <div className="edit-drawer-helper-text">
                  Keys owned by customers{' '}
                  <span
                    role="button"
                    tabIndex={0}
                    className="section-detail-link"
                    onClick={e => {
                      e.stopPropagation();
                      openExternalLink(SECURITY_KEY);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        openExternalLink(SECURITY_KEY);
                      }
                    }}
                  >
                    Learn more
                  </span>
                </div>
              </div>
            </div>

            {encryption === 'customer_managed_key' && (
              <div className="edit-drawer-nested-fields">
                <div
                  className="edit-drawer-radio-option"
                  onClick={() => setKmsKeySelectionMode('select')}
                >
                  <Radio
                    id="edit-kms-mode-select"
                    checked={kmsKeySelectionMode === 'select'}
                    onChange={() => setKmsKeySelectionMode('select')}
                    size="small"
                    color="primary"
                  />
                  <div className="edit-drawer-option-content">
                    <div className="edit-drawer-option-title">
                      Select a Cloud KMS key
                    </div>
                  </div>
                </div>

                {kmsKeySelectionMode === 'select' && (
                  <div
                    className="edit-drawer-row"
                    style={{ flex: 1, width: '100%' }}
                  >
                    <FormControl size="small" fullWidth variant="outlined">
                      <InputLabel id="edit-kms-keyring-label">
                        Key Ring *
                      </InputLabel>
                      <Select
                        labelId="edit-kms-keyring-label"
                        id="edit-kms-keyring"
                        label="Key Ring *"
                        value={keyRing}
                        onChange={e => {
                          setKmsKeySelectionMode('select');
                          setKeyRing(e.target.value as string);
                        }}
                      >
                        {resolvedKeyRingOptions.map(ring => (
                          <MenuItem key={ring} value={ring}>
                            {ring}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl size="small" fullWidth variant="outlined">
                      <InputLabel id="edit-kms-key-label">Key *</InputLabel>
                      <Select
                        labelId="edit-kms-key-label"
                        id="edit-kms-key"
                        label="Key *"
                        value={cryptoKey}
                        onChange={e => {
                          setKmsKeySelectionMode('select');
                          setCryptoKey(e.target.value as string);
                        }}
                      >
                        {resolvedCryptoKeyOptions.map(key => (
                          <MenuItem key={key} value={key}>
                            {key}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </div>
                )}

                <div
                  className="edit-drawer-radio-option"
                  onClick={() => setKmsKeySelectionMode('manual')}
                >
                  <Radio
                    id="edit-kms-mode-manual"
                    checked={kmsKeySelectionMode === 'manual'}
                    onChange={() => setKmsKeySelectionMode('manual')}
                    size="small"
                    color="primary"
                  />
                  <div className="edit-drawer-option-content">
                    <div className="edit-drawer-option-title">
                      Enter key manually
                    </div>
                  </div>
                </div>

                {kmsKeySelectionMode === 'manual' && (
                  <div className="edit-drawer-field-group">
                    <div className="edit-drawer-helper-text">
                      Enter the resource name of the key you want to use. Key
                      resource names can be found using the Key Management
                      Service.
                      <br />
                      {KEY_MESSAGE}
                    </div>
                    <TextField
                      id="edit-kms-key-name"
                      label="Cloud KMS key"
                      placeholder="Enter key manually"
                      value={kmsKeyName}
                      onChange={e => handleManualKmsKeyChange(e.target.value)}
                      error={!isValidManualKey}
                      variant="outlined"
                      size="small"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </EditDrawer>
  );
};

export const TIME_UNIT_OPTIONS: { value: TimeUnit; label: string }[] = [
  { value: 'minutes', label: 'minutes' },
  { value: 'hours', label: 'hours' },
  { value: 'days', label: 'days' },
  { value: 'seconds', label: 'seconds' }
];

export const INTEGER_REGEX = /^-?\d+$/;
export const LABEL_KEY_REGEX = /^[\p{Ll}][\p{Ll}\p{Lo}\p{N}_-]{0,62}$/u;
export const LABEL_VALUE_REGEX = /^[\p{Ll}\p{Lo}\p{N}_-]{0,63}$/u;
export const LABEL_KEY_FORMAT_ERROR =
  'Only hyphens (-), underscores (_), lowercase characters, and numbers are allowed. Keys must start with a lowercase character. International characters are allowed.';
export const LABEL_VALUE_FORMAT_ERROR =
  'Only hyphens (-), underscores (_), lowercase characters, and numbers are allowed. International characters are allowed.';

const validateAutoscalingField = (
  rawVal: string,
  fieldLabel: 'Initial executors' | 'Minimum executors' | 'Maximum executors'
): string => {
  const trimmed = rawVal.trim();
  if (!INTEGER_REGEX.test(trimmed)) {
    return `${fieldLabel} must be an integer.`;
  }
  const parsed = parseInt(trimmed, 10);
  if (parsed < 2) {
    return `${fieldLabel} must be greater than or equal to 2.`;
  }
  return '';
};

const UNIT_TO_SECONDS: Record<TimeUnit, number> = {
  seconds: 1,
  s: 1,
  minutes: 60,
  m: 60,
  hours: 3600,
  h: 3600,
  days: 86400,
  d: 86400
};
const MIN_LIFECYCLE_SECONDS = 10 * 60; // 10 minutes
const MAX_IDLE_TIME_SECONDS = 330 * 3600; // 330 hours
const MAX_SESSION_TIME_SECONDS = 14 * 86400; // 14 days

const validateLifecycleQuantity = (
  rawVal: string,
  unit: TimeUnit,
  fieldLabel: 'Max idle time quantity' | 'Max session time quantity'
): string => {
  const trimmed = rawVal.trim();
  if (!INTEGER_REGEX.test(trimmed)) {
    return `${fieldLabel} must be an integer.`;
  }
  const parsed = parseInt(trimmed, 10);
  const totalSeconds = parsed * UNIT_TO_SECONDS[unit];
  if (fieldLabel === 'Max idle time quantity') {
    if (
      totalSeconds < MIN_LIFECYCLE_SECONDS ||
      totalSeconds > MAX_IDLE_TIME_SECONDS
    ) {
      return 'Max idle time must be between 10 minutes and 330 hours.';
    }
  } else {
    if (
      totalSeconds < MIN_LIFECYCLE_SECONDS ||
      totalSeconds > MAX_SESSION_TIME_SECONDS
    ) {
      return 'Max session time must be between 10 minutes and 14 days.';
    }
  }
  return '';
};

export interface IAutoscalingEditDrawerProps {
  open: boolean;
  config: IAutoscalingConfig;
  onClose: () => void;
  onSave: (updatedConfig: IAutoscalingConfig) => void;
}

export const AutoscalingEditDrawer: React.FC<IAutoscalingEditDrawerProps> = ({
  open,
  config,
  onClose,
  onSave
}) => {
  const [draftConfig, setDraftConfig] = useState<IAutoscalingConfig>(config);
  const [initialExecutorsInput, setInitialExecutorsInput] = useState<string>(
    String(config.initialExecutors ?? 2)
  );
  const [minExecutorsInput, setMinExecutorsInput] = useState<string>(
    String(config.minExecutors ?? 2)
  );
  const [maxExecutorsInput, setMaxExecutorsInput] = useState<string>(
    String(config.maxExecutors ?? 1000)
  );

  useEffect(() => {
    if (open) {
      setDraftConfig(config);
      setInitialExecutorsInput(String(config.initialExecutors ?? 2));
      setMinExecutorsInput(String(config.minExecutors ?? 2));
      setMaxExecutorsInput(String(config.maxExecutors ?? 1000));
    }
  }, [open, config]);

  const isAutoscalingEnabled = draftConfig.autoscalingEnabled ?? true;

  const baseInitialError = validateAutoscalingField(
    initialExecutorsInput,
    'Initial executors'
  );
  const baseMinError = validateAutoscalingField(
    minExecutorsInput,
    'Minimum executors'
  );
  const baseMaxError = validateAutoscalingField(
    maxExecutorsInput,
    'Maximum executors'
  );

  const initVal = parseInt(initialExecutorsInput.trim(), 10);
  const minVal = parseInt(minExecutorsInput.trim(), 10);
  const maxVal = parseInt(maxExecutorsInput.trim(), 10);

  const initialRangeError =
    !baseInitialError &&
    !Number.isNaN(initVal) &&
    ((!baseMinError && !Number.isNaN(minVal) && initVal < minVal) ||
      (!baseMaxError && !Number.isNaN(maxVal) && initVal > maxVal))
      ? 'Initial executors must be between minimum and maximum executors.'
      : '';

  const minRangeError =
    !baseMinError &&
    !baseMaxError &&
    !Number.isNaN(minVal) &&
    !Number.isNaN(maxVal) &&
    minVal > maxVal
      ? 'Minimum executors must not exceed maximum executors.'
      : '';

  const initialExecutorsError = isAutoscalingEnabled
    ? baseInitialError || initialRangeError
    : '';
  const minExecutorsError = isAutoscalingEnabled
    ? baseMinError || minRangeError
    : '';
  const maxExecutorsError = isAutoscalingEnabled ? baseMaxError : '';

  const isAutoscalingSaveDisabled =
    isAutoscalingEnabled &&
    Boolean(initialExecutorsError || minExecutorsError || maxExecutorsError);

  const handleSave = () => {
    if (isAutoscalingSaveDisabled) {
      return;
    }
    onSave({
      ...draftConfig,
      initialExecutors:
        isAutoscalingEnabled || !Number.isNaN(initVal)
          ? initVal
          : config.initialExecutors ?? 2,
      minExecutors:
        isAutoscalingEnabled || !Number.isNaN(minVal)
          ? minVal
          : config.minExecutors ?? 2,
      maxExecutors:
        isAutoscalingEnabled || !Number.isNaN(maxVal)
          ? maxVal
          : config.maxExecutors ?? 1000
    });
  };

  return (
    <EditDrawer
      open={open}
      title="Autoscaling"
      isSaveDisabled={isAutoscalingSaveDisabled}
      onClose={onClose}
      onSave={handleSave}
    >
      <div className="edit-drawer-helper-text">
        Configure dynamic resource allocation to scale executors based on
        workload.
      </div>

      <FormControlLabel
        control={
          <Checkbox
            id="edit-autoscaling-enabled"
            checked={isAutoscalingEnabled}
            onChange={e =>
              setDraftConfig(prev => ({
                ...prev,
                autoscalingEnabled: e.target.checked
              }))
            }
            size="small"
          />
        }
        label="Enabled"
      />

      <div className="edit-drawer-field-group">
        <TextField
          id="edit-initial-executors"
          label="Initial executors"
          value={initialExecutorsInput}
          onChange={e => setInitialExecutorsInput(e.target.value)}
          variant="outlined"
          size="small"
          fullWidth
          disabled={!isAutoscalingEnabled}
          error={Boolean(initialExecutorsError)}
          InputLabelProps={{ shrink: true }}
        />
        {initialExecutorsError && (
          <div
            className="edit-drawer-error-text"
            id="initial-executors-error-text"
          >
            <span className="edit-drawer-error-icon">
              <FieldErrorIcon />
            </span>
            <span>{initialExecutorsError}</span>
          </div>
        )}
      </div>

      <div className="edit-drawer-field-group">
        <TextField
          id="edit-minimum-executors"
          label="Minimum executors"
          value={minExecutorsInput}
          onChange={e => setMinExecutorsInput(e.target.value)}
          variant="outlined"
          size="small"
          fullWidth
          disabled={!isAutoscalingEnabled}
          error={Boolean(minExecutorsError)}
          InputLabelProps={{ shrink: true }}
        />
        {minExecutorsError && (
          <div
            className="edit-drawer-error-text"
            id="minimum-executors-error-text"
          >
            <span className="edit-drawer-error-icon">
              <FieldErrorIcon />
            </span>
            <span>{minExecutorsError}</span>
          </div>
        )}
      </div>

      <div className="edit-drawer-field-group">
        <TextField
          id="edit-maximum-executors"
          label="Maximum executors"
          value={maxExecutorsInput}
          onChange={e => setMaxExecutorsInput(e.target.value)}
          variant="outlined"
          size="small"
          fullWidth
          disabled={!isAutoscalingEnabled}
          error={Boolean(maxExecutorsError)}
          InputLabelProps={{ shrink: true }}
        />
        {maxExecutorsError && (
          <div
            className="edit-drawer-error-text"
            id="maximum-executors-error-text"
          >
            <span className="edit-drawer-error-icon">
              <FieldErrorIcon />
            </span>
            <span>{maxExecutorsError}</span>
          </div>
        )}
      </div>
    </EditDrawer>
  );
};

const parseDurationString = (
  rawString: string | undefined,
  defaultQty: number,
  defaultUnit: TimeUnit
): { quantity: number; unit: TimeUnit } => {
  if (!rawString) {
    return { quantity: defaultQty, unit: defaultUnit };
  }
  const match = rawString.trim().match(/^(\d+)\s*([a-zA-Z]+)?$/);
  if (!match) {
    return { quantity: defaultQty, unit: defaultUnit };
  }
  const quantity = parseInt(match[1], 10);
  const rawUnit = (match[2] || '').toLowerCase();
  let unit: TimeUnit = defaultUnit;
  if (rawUnit.startsWith('m')) {
    unit = 'minutes';
  } else if (rawUnit.startsWith('h')) {
    unit = 'hours';
  } else if (rawUnit.startsWith('d')) {
    unit = 'days';
  } else if (rawUnit.startsWith('s')) {
    unit = 'seconds';
  }
  return { quantity: Number.isNaN(quantity) ? defaultQty : quantity, unit };
};

export interface ISessionLifecycleEditDrawerProps {
  open: boolean;
  config: ISessionLifecycleConfig;
  onClose: () => void;
  onSave: (updatedConfig: ISessionLifecycleConfig) => void;
}

export const SessionLifecycleEditDrawer: React.FC<
  ISessionLifecycleEditDrawerProps
> = ({ open, config, onClose, onSave }) => {
  const [idleQuantityInput, setIdleQuantityInput] = useState<string>('60');
  const [idleUnit, setIdleUnit] = useState<TimeUnit>('minutes');
  const [sessionQuantityInput, setSessionQuantityInput] = useState<string>('3');
  const [sessionUnit, setSessionUnit] = useState<TimeUnit>('days');

  useEffect(() => {
    if (open) {
      const parsedIdle = parseDurationString(
        config.maxIdleTime,
        config.maxIdleTimeQuantity ?? 60,
        config.maxIdleTimeUnit ?? 'minutes'
      );
      const parsedSession = parseDurationString(
        config.maxSessionTime,
        config.maxSessionTimeQuantity ?? 3,
        config.maxSessionTimeUnit ?? 'days'
      );
      setIdleQuantityInput(
        String(config.maxIdleTimeQuantity ?? parsedIdle.quantity)
      );
      setIdleUnit(config.maxIdleTimeUnit ?? parsedIdle.unit);
      setSessionQuantityInput(
        String(config.maxSessionTimeQuantity ?? parsedSession.quantity)
      );
      setSessionUnit(config.maxSessionTimeUnit ?? parsedSession.unit);
    }
  }, [open, config]);

  const idleQuantityError = validateLifecycleQuantity(
    idleQuantityInput,
    idleUnit,
    'Max idle time quantity'
  );
  const sessionQuantityError = validateLifecycleQuantity(
    sessionQuantityInput,
    sessionUnit,
    'Max session time quantity'
  );
  const isLifecycleSaveDisabled = Boolean(
    idleQuantityError || sessionQuantityError
  );

  const handleSave = () => {
    if (isLifecycleSaveDisabled) {
      return;
    }
    const safeIdleQty = parseInt(idleQuantityInput.trim(), 10);
    const safeSessionQty = parseInt(sessionQuantityInput.trim(), 10);
    onSave({
      ...config,
      maxIdleTimeQuantity: safeIdleQty,
      maxIdleTimeUnit: idleUnit,
      maxIdleTime: `${safeIdleQty} ${idleUnit}`,
      maxSessionTimeQuantity: safeSessionQty,
      maxSessionTimeUnit: sessionUnit,
      maxSessionTime: `${safeSessionQty} ${sessionUnit}`
    });
  };

  return (
    <EditDrawer
      open={open}
      title="Session lifecycle"
      isSaveDisabled={isLifecycleSaveDisabled}
      onClose={onClose}
      onSave={handleSave}
    >
      <div className="edit-drawer-field-group">
        <div className="edit-drawer-section-heading">Max idle time</div>
        <div className="edit-drawer-helper-text">
          Max notebook idle time before the session is auto-terminated. Can be
          anywhere between 10 minutes to 330 hours.
        </div>

        <div className="edit-drawer-row">
          <div className="edit-drawer-col">
            <TextField
              id="edit-max-idle-time-quantity"
              label="Max idle time quantity"
              value={idleQuantityInput}
              onChange={e => setIdleQuantityInput(e.target.value)}
              variant="outlined"
              size="small"
              fullWidth
              error={Boolean(idleQuantityError)}
              InputLabelProps={{ shrink: true }}
            />
            {idleQuantityError && (
              <div
                className="edit-drawer-error-text"
                id="max-idle-time-quantity-error-text"
              >
                <span className="edit-drawer-error-icon">
                  <FieldErrorIcon />
                </span>
                <span>{idleQuantityError}</span>
              </div>
            )}
          </div>
          <div className="edit-drawer-col">
            <FormControl size="small" fullWidth variant="outlined">
              <InputLabel id="edit-max-idle-time-unit-label" shrink>
                Max idle time unit
              </InputLabel>
              <Select
                labelId="edit-max-idle-time-unit-label"
                id="edit-max-idle-time-unit"
                label="Max idle time unit"
                notched
                value={idleUnit}
                onChange={e => setIdleUnit(e.target.value as TimeUnit)}
              >
                {TIME_UNIT_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </div>
      </div>

      <div className="edit-drawer-field-group">
        <div className="edit-drawer-section-heading">Max session time</div>
        <div className="edit-drawer-helper-text">
          Max lifetime of a session. Can be anywhere from 10 minutes to 14 days.
        </div>

        <div className="edit-drawer-row">
          <div className="edit-drawer-col">
            <TextField
              id="edit-max-session-time-quantity"
              label="Max session time quantity"
              value={sessionQuantityInput}
              onChange={e => setSessionQuantityInput(e.target.value)}
              variant="outlined"
              size="small"
              fullWidth
              error={Boolean(sessionQuantityError)}
              InputLabelProps={{ shrink: true }}
            />
            {sessionQuantityError && (
              <div
                className="edit-drawer-error-text"
                id="max-session-time-quantity-error-text"
              >
                <span className="edit-drawer-error-icon">
                  <FieldErrorIcon />
                </span>
                <span>{sessionQuantityError}</span>
              </div>
            )}
          </div>
          <div className="edit-drawer-col">
            <FormControl size="small" fullWidth variant="outlined">
              <InputLabel id="edit-max-session-time-unit-label" shrink>
                Max session time unit
              </InputLabel>
              <Select
                labelId="edit-max-session-time-unit-label"
                id="edit-max-session-time-unit"
                label="Max session time unit"
                notched
                value={sessionUnit}
                onChange={e => setSessionUnit(e.target.value as TimeUnit)}
              >
                {TIME_UNIT_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </div>
      </div>
    </EditDrawer>
  );
};

interface IKeyValueEntry {
  key: string;
  value: string;
}

const recordToEntries = (record?: Record<string, string>): IKeyValueEntry[] => {
  if (!record || Object.keys(record).length === 0) {
    return [];
  }
  return Object.entries(record).map(([key, value]) => ({ key, value }));
};

const entriesToRecord = (entries: IKeyValueEntry[]): Record<string, string> => {
  const result: Record<string, string> = {};
  entries.forEach(({ key, value }) => {
    const trimmedKey = key.trim();
    if (trimmedKey) {
      result[trimmedKey] = value.trim();
    }
  });
  return result;
};

export interface IOtherCustomizationEditDrawerProps {
  open: boolean;
  sparkProperties: SparkProperties;
  labels: ProfileLabels;
  onClose: () => void;
  onSave: (
    updatedSparkProperties: SparkProperties,
    updatedLabels: ProfileLabels
  ) => void;
}

export const OtherCustomizationEditDrawer: React.FC<
  IOtherCustomizationEditDrawerProps
> = ({ open, sparkProperties, labels, onClose, onSave }) => {
  const [sparkEntries, setSparkEntries] = useState<IKeyValueEntry[]>([]);
  const [labelEntries, setLabelEntries] = useState<IKeyValueEntry[]>([]);

  useEffect(() => {
    if (open) {
      setSparkEntries(recordToEntries(sparkProperties));
      setLabelEntries(recordToEntries(labels));
    }
  }, [open, sparkProperties, labels]);

  const handleEntryChange = (
    setList: React.Dispatch<React.SetStateAction<IKeyValueEntry[]>>,
    index: number,
    field: 'key' | 'value',
    newVal: string
  ) => {
    setList(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: newVal };
      return updated;
    });
  };

  const handleAddEntry = (
    setList: React.Dispatch<React.SetStateAction<IKeyValueEntry[]>>
  ) => {
    setList(prev => [...prev, { key: '', value: '' }]);
  };

  const handleRemoveEntry = (
    setList: React.Dispatch<React.SetStateAction<IKeyValueEntry[]>>,
    index: number
  ) => {
    setList(prev => prev.filter((_, i) => i !== index));
  };

  const getSparkKeyError = (keyVal: string, idx: number): string => {
    if (keyVal.trim() === '') {
      return 'Key is required';
    }
    const isDuplicate = sparkEntries.some(
      (entry, i) => i !== idx && entry.key.trim() === keyVal.trim()
    );
    if (isDuplicate) {
      return 'The key is already present';
    }
    return '';
  };

  const getLabelKeyError = (keyVal: string, idx: number): string => {
    if (keyVal.trim() === '') {
      return 'Key is required';
    }
    if (!LABEL_KEY_REGEX.test(keyVal)) {
      return LABEL_KEY_FORMAT_ERROR;
    }
    const isDuplicate = labelEntries.some(
      (entry, i) => i !== idx && entry.key.trim() === keyVal.trim()
    );
    if (isDuplicate) {
      return 'The key is already present';
    }
    return '';
  };

  const getLabelValueError = (valueVal: string): string => {
    if (valueVal !== '' && !LABEL_VALUE_REGEX.test(valueVal)) {
      return LABEL_VALUE_FORMAT_ERROR;
    }
    return '';
  };

  const hasInvalidLabelEntry = labelEntries.some(
    (entry, idx) =>
      Boolean(getLabelKeyError(entry.key, idx)) ||
      Boolean(getLabelValueError(entry.value))
  );

  const hasInvalidSparkEntry = sparkEntries.some((entry, idx) =>
    Boolean(getSparkKeyError(entry.key, idx))
  );

  return (
    <EditDrawer
      open={open}
      title="Other customizations"
      isSaveDisabled={hasInvalidLabelEntry || hasInvalidSparkEntry}
      onClose={onClose}
      onSave={() =>
        onSave(entriesToRecord(sparkEntries), entriesToRecord(labelEntries))
      }
    >
      {/* Spark Properties Section */}
      <div className="edit-drawer-field-group">
        <div className="edit-drawer-section-heading">Spark properties</div>
        <div className="edit-drawer-helper-text">
          Custom Spark properties applied to every workload that runs on this
          profile, for example spark.executor.memory.
        </div>
        <div className="edit-drawer-kv-list">
          {sparkEntries.map((entry, idx) => {
            const sparkKeyError = getSparkKeyError(entry.key, idx);
            return (
              <div key={`spark-prop-${idx}`} className="edit-drawer-kv-row">
                <div className="edit-drawer-kv-col">
                  <TextField
                    id={`edit-spark-property-key-${idx}`}
                    label={`Key ${idx + 1} *`}
                    value={entry.key}
                    onChange={e =>
                      handleEntryChange(
                        setSparkEntries,
                        idx,
                        'key',
                        e.target.value
                      )
                    }
                    variant="outlined"
                    size="small"
                    fullWidth
                    error={Boolean(sparkKeyError)}
                    InputLabelProps={{ shrink: true }}
                  />
                  {sparkKeyError && (
                    <div
                      className="edit-drawer-error-text"
                      id={`spark-key-error-${idx}`}
                    >
                      <span className="edit-drawer-error-icon">
                        <FieldErrorIcon />
                      </span>
                      <span>{sparkKeyError}</span>
                    </div>
                  )}
                </div>
                <div className="edit-drawer-kv-col">
                  <TextField
                    id={`edit-spark-property-value-${idx}`}
                    label={`Value ${idx + 1}`}
                    value={entry.value}
                    onChange={e =>
                      handleEntryChange(
                        setSparkEntries,
                        idx,
                        'value',
                        e.target.value
                      )
                    }
                    variant="outlined"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </div>
                <button
                  type="button"
                  className="edit-drawer-remove-btn"
                  aria-label={`Remove Spark property ${idx + 1}`}
                  onClick={() => handleRemoveEntry(setSparkEntries, idx)}
                >
                  &#x2715;
                </button>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="edit-drawer-add-btn"
          disabled={hasInvalidSparkEntry}
          onClick={() => handleAddEntry(setSparkEntries)}
        >
          + Add property
        </button>
      </div>

      {/* Labels Section */}
      <div className="edit-drawer-field-group">
        <div className="edit-drawer-section-heading">Labels</div>
        <div className="edit-drawer-helper-text">
          A list of key:value pairs to attach to the session template for
          tracking.
        </div>
        <div className="edit-drawer-kv-list">
          {labelEntries.map((entry, idx) => {
            const keyError = getLabelKeyError(entry.key, idx);
            const valueError = getLabelValueError(entry.value);
            return (
              <div key={`label-entry-${idx}`} className="edit-drawer-kv-row">
                <div className="edit-drawer-kv-col">
                  <TextField
                    id={`edit-label-key-${idx}`}
                    label={`Key ${idx + 1} *`}
                    value={entry.key}
                    onChange={e =>
                      handleEntryChange(
                        setLabelEntries,
                        idx,
                        'key',
                        e.target.value
                      )
                    }
                    variant="outlined"
                    size="small"
                    fullWidth
                    error={Boolean(keyError)}
                    InputLabelProps={{ shrink: true }}
                  />
                  {keyError && (
                    <div
                      className="edit-drawer-error-text"
                      id={`label-key-error-${idx}`}
                    >
                      <span className="edit-drawer-error-icon">
                        <FieldErrorIcon />
                      </span>
                      <span>{keyError}</span>
                    </div>
                  )}
                </div>
                <div className="edit-drawer-kv-col">
                  <TextField
                    id={`edit-label-value-${idx}`}
                    label={`Value ${idx + 1}`}
                    value={entry.value}
                    onChange={e =>
                      handleEntryChange(
                        setLabelEntries,
                        idx,
                        'value',
                        e.target.value
                      )
                    }
                    variant="outlined"
                    size="small"
                    fullWidth
                    error={Boolean(valueError)}
                    InputLabelProps={{ shrink: true }}
                  />
                  {valueError && (
                    <div
                      className="edit-drawer-error-text"
                      id={`label-value-error-${idx}`}
                    >
                      <span className="edit-drawer-error-icon">
                        <FieldErrorIcon />
                      </span>
                      <span>{valueError}</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="edit-drawer-remove-btn"
                  aria-label={`Remove label ${idx + 1}`}
                  onClick={() => handleRemoveEntry(setLabelEntries, idx)}
                >
                  &#x2715;
                </button>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="edit-drawer-add-btn"
          disabled={hasInvalidLabelEntry}
          onClick={() => handleAddEntry(setLabelEntries)}
        >
          + Add label
        </button>
      </div>
    </EditDrawer>
  );
};
