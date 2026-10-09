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
  Select,
  TextField
} from '@mui/material';
import { EditDrawer } from '../controls/EditDrawer';
import {
  IExecutorAndDriverConfig,
  IMachineTypeOption,
  IRuntimeEnvironmentConfig,
  IRuntimeProfileService
} from './runtimeProfileInterface';
import { runtimeProfileService } from './runtimeProfileService';
import {
  CUSTOM_CONTAINERS,
  CUSTOM_CONTAINER_MESSAGE,
  CUSTOM_CONTAINER_MESSAGE_PART,
  DATAPROC_ACCELERATED_MACHINE_TYPES,
  DATAPROC_STANDARD_MACHINE_TYPES,
  DATAPROC_TIER_DOC,
  LIGHTNING_ENGINE_DOC
} from '../utils/const';

export const RUNTIME_VERSION_OPTIONS: string[] = [
  '2.3 LTS (Spark 3.5.1, Python 3.12)',
  '2.2 LTS (Spark 3.5, Java 17, Scala 2.13)',
  '1.2 LTS (Spark 3.5, Java 17, Scala 2.12)',
  '1.1 LTS (Spark 3.3, Java 11, Scala 2.12)'
];

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
    <path d="M3 6h18v2l-2 12H5L3 8V6zm3.5 4l1 3h9l1-3h-11z" />
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
    setSelectedBucket(bucketName);
    setCurrentBucket(bucketName);
    setBucketFiles([]);
    if (!service?.getBucketObjects) {
      return;
    }
    setIsLoadingFiles(true);
    try {
      const files = await service.getBucketObjects(bucketName);
      setBucketFiles(files);
    } catch (err) {
      console.error(`Failed to load files for bucket ${bucketName}:`, err);
      setBucketFiles([]);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleBackToBuckets = () => {
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
                      setSelectedBucket(bucketName);
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

              <button type="button" className="create-bucket-continue-btn">
                Continue
              </button>
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
  onClose: () => void;
  onSave: (updatedConfig: IRuntimeEnvironmentConfig) => void;
}

export const RuntimeEnvironmentEditDrawer: React.FC<
  IRuntimeEnvironmentEditDrawerProps
> = ({ open, config, service = runtimeProfileService, onClose, onSave }) => {
  const [draftConfig, setDraftConfig] =
    useState<IRuntimeEnvironmentConfig>(config);
  const [isSelectBucketOpen, setIsSelectBucketOpen] = useState<boolean>(false);
  const [existingBuckets, setExistingBuckets] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setDraftConfig(config);
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
  const runtimeProfileIdError = !trimmedProfileId
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
  const isBucketValid =
    !isBucketAutoOrEmpty &&
    VALID_BUCKET_NAME_REGEX.test(normalizedStagingBucket) &&
    existingBuckets.includes(normalizedStagingBucket);
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
            label="Runtime Profile ID"
            value={draftConfig.runtimeProfileId ?? ''}
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
            Dataproc Runtime Version
          </InputLabel>
          <Select
            labelId="edit-dataproc-runtime-version-label"
            id="edit-dataproc-runtime-version"
            label="Dataproc Runtime Version"
            notched
            value={draftConfig.runtimeVersion ?? ''}
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
          <div className="edit-drawer-input-with-button">
            <TextField
              id="edit-cloud-storage-staging-bucket"
              label="Cloud Storage Staging bucket"
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
                )
              }}
            />
            <button
              type="button"
              className="edit-drawer-browse-btn"
              onClick={() => setIsSelectBucketOpen(true)}
            >
              Browse
            </button>
          </div>
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
            default packages are installed to PyPI pull-through cache on Google
            Cloud.
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

export const DISK_TIER_OPTIONS: string[] = ['HDD (standard)', 'SSD (premium)'];

export const HDD_DISK_SIZES: string[] = [
  '200 GiB',
  '300 GiB',
  '400 GiB',
  '500 GiB',
  '600 GiB',
  '700 GiB',
  '800 GiB',
  '900 GiB',
  '1000 GiB',
  '1100 GiB',
  '1200 GiB',
  '1300 GiB',
  '1400 GiB',
  '1500 GiB'
];

export const SSD_DISK_SIZES: string[] = [
  '375 GiB',
  '750 GiB',
  '1500 GiB',
  '3000 GiB',
  '6000 GiB',
  '9000 GiB'
];

export const parseDiskTierAndSize = (
  diskStr?: string,
  defaultTier: string = 'HDD (standard)'
): { tier: string; size: string } => {
  if (!diskStr || diskStr.trim() === '') {
    return {
      tier: defaultTier,
      size: defaultTier === 'SSD (premium)' ? '375 GiB' : '200 GiB'
    };
  }
  const lower = diskStr.toLowerCase();
  const isSsd = lower.includes('ssd') || lower.includes('premium');
  const tier = isSsd ? 'SSD (premium)' : 'HDD (standard)';
  const match = diskStr.match(/(\d+)\s*(?:gib|gb|g)?/i);
  let size = isSsd ? '375 GiB' : '200 GiB';
  if (match) {
    const rawNum = match[1];
    const formatted = `${rawNum} GiB`;
    if (isSsd) {
      size = SSD_DISK_SIZES.includes(formatted) ? formatted : '375 GiB';
    } else {
      size = HDD_DISK_SIZES.includes(formatted) ? formatted : `${rawNum} GiB`;
    }
  }
  return { tier, size };
};

export const normalizeMachineTypeName = (
  raw?: string,
  allTypes: IMachineTypeOption[] = [
    ...DATAPROC_STANDARD_MACHINE_TYPES,
    ...DATAPROC_ACCELERATED_MACHINE_TYPES
  ]
): string => {
  if (!raw || raw.trim() === '') return 'highmem-4';
  const clean = raw.trim().toLowerCase();
  const byName = allTypes.find(m => m.name.toLowerCase() === clean);
  if (byName) return byName.name;
  const byLabel = allTypes.find(m => m.label.toLowerCase() === clean);
  if (byLabel) return byLabel.name;
  const firstWord = clean.split(' ')[0];
  const byFirstWord = allTypes.find(m => m.name.toLowerCase() === firstWord);
  if (byFirstWord) return byFirstWord.name;
  return firstWord || raw;
};

export const isAcceleratedMachine = (
  name: string,
  allTypes: IMachineTypeOption[] = [
    ...DATAPROC_STANDARD_MACHINE_TYPES,
    ...DATAPROC_ACCELERATED_MACHINE_TYPES
  ]
): boolean => {
  const match = allTypes.find(m => m.name === name);
  if (match) {
    return match.category === 'accelerated' || Boolean(match.acceleratorType);
  }
  const clean = name.toLowerCase();
  return (
    clean.startsWith('l4-') ||
    clean.startsWith('a100-') ||
    clean.startsWith('h100-') ||
    clean.startsWith('g2-') ||
    clean.startsWith('a2-')
  );
};

export interface IExecutorAndDriverEditDrawerProps {
  open: boolean;
  config: IExecutorAndDriverConfig;
  onClose: () => void;
  onSave: (updatedConfig: IExecutorAndDriverConfig) => void;
  availableMachineTypes?: IMachineTypeOption[];
}

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

  const [draftConfig, setDraftConfig] = useState<{
    tier: string;
    lightningEngineEnabled: boolean;
    executorType: string;
    executorDiskTier: string;
    executorDiskSize: string;
    useDifferentDriverConfig: boolean;
    driverMachineType: string;
    driverDiskTier: string;
    driverDiskSize: string;
  }>({
    tier: 'Premium',
    lightningEngineEnabled: true,
    executorType: 'highmem-4',
    executorDiskTier: 'HDD (standard)',
    executorDiskSize: '200 GiB',
    useDifferentDriverConfig: false,
    driverMachineType: 'highmem-4',
    driverDiskTier: 'HDD (standard)',
    driverDiskSize: '200 GiB'
  });

  const [executorSearch, setExecutorSearch] = useState<string>('');
  const [driverSearch, setDriverSearch] = useState<string>('');

  useEffect(() => {
    if (open) {
      const initialTier = config.tier || 'Premium';
      const initialExecType = normalizeMachineTypeName(
        config.executorMachineType ||
          (typeof config.executorType === 'string'
            ? config.executorType
            : undefined),
        allMachineTypes
      );
      const isExecAcc = isAcceleratedMachine(initialExecType, allMachineTypes);
      const defaultExecDiskTier = isExecAcc
        ? 'SSD (premium)'
        : initialTier === 'Standard'
        ? 'HDD (standard)'
        : 'HDD (standard)';
      const parsedExecDisk = parseDiskTierAndSize(
        config.executorDisk || config.diskType,
        defaultExecDiskTier
      );
      const initialDriverType = normalizeMachineTypeName(
        config.driverMachineType || config.machineType || initialExecType,
        allMachineTypes
      );
      const isDrvAcc = isAcceleratedMachine(initialDriverType, allMachineTypes);
      const defaultDrvDiskTier = isDrvAcc
        ? 'SSD (premium)'
        : initialTier === 'Standard'
        ? 'HDD (standard)'
        : 'HDD (standard)';
      const parsedDrvDisk = parseDiskTierAndSize(
        config.driverDisk || config.disk,
        defaultDrvDiskTier
      );
      const diffDriver = Boolean(config.useDifferentDriverConfig);

      const execDiskTier = isExecAcc
        ? 'SSD (premium)'
        : initialTier === 'Standard'
        ? 'HDD (standard)'
        : config.executorDiskTier || parsedExecDisk.tier;
      const execDiskSize =
        execDiskTier === 'SSD (premium)'
          ? SSD_DISK_SIZES.includes(
              config.executorDiskSize || parsedExecDisk.size
            )
            ? config.executorDiskSize || parsedExecDisk.size
            : '375 GiB'
          : config.executorDiskSize || parsedExecDisk.size;

      const drvDiskTier = diffDriver
        ? isDrvAcc
          ? 'SSD (premium)'
          : initialTier === 'Standard'
          ? 'HDD (standard)'
          : config.driverDiskTier || parsedDrvDisk.tier
        : execDiskTier;

      const drvDiskSize = diffDriver
        ? drvDiskTier === 'SSD (premium)'
          ? SSD_DISK_SIZES.includes(config.driverDiskSize || parsedDrvDisk.size)
            ? config.driverDiskSize || parsedDrvDisk.size
            : '375 GiB'
          : config.driverDiskSize || parsedDrvDisk.size
        : execDiskSize;

      setDraftConfig({
        tier: initialTier,
        lightningEngineEnabled:
          config.lightningEngineEnabled !== undefined
            ? config.lightningEngineEnabled
            : initialTier === 'Premium',
        executorType: initialExecType,
        executorDiskTier: execDiskTier,
        executorDiskSize: execDiskSize,
        useDifferentDriverConfig: diffDriver,
        driverMachineType: diffDriver ? initialDriverType : initialExecType,
        driverDiskTier: drvDiskTier,
        driverDiskSize: drvDiskSize
      });
      setExecutorSearch('');
      setDriverSearch('');
    }
  }, [open, config, allMachineTypes]);

  const handleTierChange = (selectedTier: string) => {
    setDraftConfig(prev => {
      if (selectedTier === 'Standard') {
        const fallbackExec =
          isAcceleratedMachine(prev.executorType, allMachineTypes) ||
          prev.executorType.includes('highmem')
            ? 'standard-4'
            : prev.executorType;
        const fallbackDriver =
          isAcceleratedMachine(prev.driverMachineType, allMachineTypes) ||
          prev.driverMachineType.includes('highmem')
            ? 'standard-4'
            : prev.driverMachineType;
        return {
          ...prev,
          tier: 'Standard',
          lightningEngineEnabled: false,
          executorType: fallbackExec,
          executorDiskTier: 'HDD (standard)',
          executorDiskSize: SSD_DISK_SIZES.includes(prev.executorDiskSize)
            ? '200 GiB'
            : prev.executorDiskSize,
          driverMachineType: prev.useDifferentDriverConfig
            ? fallbackDriver
            : fallbackExec,
          driverDiskTier: 'HDD (standard)',
          driverDiskSize: SSD_DISK_SIZES.includes(prev.driverDiskSize)
            ? '200 GiB'
            : prev.driverDiskSize
        };
      } else {
        return {
          ...prev,
          tier: 'Premium',
          lightningEngineEnabled: true
        };
      }
    });
  };

  const isExecutorAccelerated = isAcceleratedMachine(
    draftConfig.executorType,
    allMachineTypes
  );
  const isDriverAccelerated = isAcceleratedMachine(
    draftConfig.driverMachineType,
    allMachineTypes
  );

  const handleExecutorTypeChange = (selectedType: string) => {
    const isAcc = isAcceleratedMachine(selectedType, allMachineTypes);
    setDraftConfig(prev => {
      const nextDiskTier = isAcc ? 'SSD (premium)' : prev.executorDiskTier;
      let nextDiskSize = prev.executorDiskSize;
      if (isAcc && !SSD_DISK_SIZES.includes(nextDiskSize)) {
        nextDiskSize = '375 GiB';
      }
      return {
        ...prev,
        executorType: selectedType,
        executorDiskTier: nextDiskTier,
        executorDiskSize: nextDiskSize,
        driverMachineType: prev.useDifferentDriverConfig
          ? prev.driverMachineType
          : selectedType,
        driverDiskTier: prev.useDifferentDriverConfig
          ? prev.driverDiskTier
          : nextDiskTier,
        driverDiskSize: prev.useDifferentDriverConfig
          ? prev.driverDiskSize
          : nextDiskSize
      };
    });
  };

  const handleExecutorDiskTierChange = (selectedTier: string) => {
    setDraftConfig(prev => {
      let nextSize = prev.executorDiskSize;
      if (
        selectedTier === 'SSD (premium)' &&
        !SSD_DISK_SIZES.includes(nextSize)
      ) {
        nextSize = '375 GiB';
      } else if (
        selectedTier === 'HDD (standard)' &&
        !HDD_DISK_SIZES.includes(nextSize)
      ) {
        nextSize = '200 GiB';
      }
      return {
        ...prev,
        executorDiskTier: selectedTier,
        executorDiskSize: nextSize,
        driverDiskTier: prev.useDifferentDriverConfig
          ? prev.driverDiskTier
          : selectedTier,
        driverDiskSize: prev.useDifferentDriverConfig
          ? prev.driverDiskSize
          : nextSize
      };
    });
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
    const isAcc = isAcceleratedMachine(selectedType, allMachineTypes);
    setDraftConfig(prev => {
      const nextDiskTier = isAcc ? 'SSD (premium)' : prev.driverDiskTier;
      let nextDiskSize = prev.driverDiskSize;
      if (isAcc && !SSD_DISK_SIZES.includes(nextDiskSize)) {
        nextDiskSize = '375 GiB';
      }
      return {
        ...prev,
        driverMachineType: selectedType,
        driverDiskTier: nextDiskTier,
        driverDiskSize: nextDiskSize
      };
    });
  };

  const handleDriverDiskTierChange = (selectedTier: string) => {
    setDraftConfig(prev => {
      let nextSize = prev.driverDiskSize;
      if (
        selectedTier === 'SSD (premium)' &&
        !SSD_DISK_SIZES.includes(nextSize)
      ) {
        nextSize = '375 GiB';
      } else if (
        selectedTier === 'HDD (standard)' &&
        !HDD_DISK_SIZES.includes(nextSize)
      ) {
        nextSize = '200 GiB';
      }
      return {
        ...prev,
        driverDiskTier: selectedTier,
        driverDiskSize: nextSize
      };
    });
  };

  const handleDriverDiskSizeChange = (selectedSize: string) => {
    setDraftConfig(prev => ({
      ...prev,
      driverDiskSize: selectedSize
    }));
  };

  const handleSave = () => {
    const execObj = allMachineTypes.find(
      m => m.name === draftConfig.executorType
    );
    const drvObj = allMachineTypes.find(
      m => m.name === draftConfig.driverMachineType
    );

    const execLabel = execObj ? execObj.label : draftConfig.executorType;
    const drvLabel = draftConfig.useDifferentDriverConfig
      ? drvObj
        ? drvObj.label
        : draftConfig.driverMachineType
      : execLabel;

    const drvDiskTier = draftConfig.useDifferentDriverConfig
      ? draftConfig.driverDiskTier
      : draftConfig.executorDiskTier;
    const drvDiskSize = draftConfig.useDifferentDriverConfig
      ? draftConfig.driverDiskSize
      : draftConfig.executorDiskSize;

    const updated: IExecutorAndDriverConfig = {
      ...config,
      tier: draftConfig.tier,
      lightningEngineEnabled:
        draftConfig.tier === 'Premium'
          ? draftConfig.lightningEngineEnabled
          : false,
      executorCategory: isAcceleratedMachine(
        draftConfig.executorType,
        allMachineTypes
      )
        ? 'accelerated'
        : 'general',
      executorType: execLabel,
      executorMachineType: draftConfig.executorType,
      executorDiskTier: draftConfig.executorDiskTier,
      executorDiskSize: draftConfig.executorDiskSize,
      executorDisk: `${draftConfig.executorDiskTier}, ${draftConfig.executorDiskSize}`,
      useDifferentDriverConfig: draftConfig.useDifferentDriverConfig,
      driverMachineType: drvLabel,
      driverDiskTier: drvDiskTier,
      driverDiskSize: drvDiskSize,
      driverDisk: `${drvDiskTier}, ${drvDiskSize}`,
      machineType: drvLabel,
      disk: `${drvDiskTier}, ${drvDiskSize}`,
      diskType: `${draftConfig.executorDiskTier}, ${draftConfig.executorDiskSize}`
    };

    onSave(updated);
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
    const allowed =
      activeTier === 'Standard'
        ? allMachineTypes.filter(
            m =>
              m.category === 'general' &&
              !m.name.toLowerCase().includes('highmem')
          )
        : allMachineTypes;

    const filtered = searchQuery.trim()
      ? allowed.filter(
          m =>
            m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (m.subgroup &&
              m.subgroup.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : allowed;

    const groups: Record<string, IMachineTypeOption[]> = {};
    filtered.forEach(m => {
      const lowerName = m.name.toLowerCase();
      const g =
        m.subgroup ||
        (m.category === 'accelerated'
          ? lowerName.startsWith('a100')
            ? 'Accelerated (A100)'
            : lowerName.startsWith('l4')
            ? 'Accelerated (L4)'
            : 'Accelerated'
          : lowerName.startsWith('highmem')
          ? 'General (High memory)'
          : 'General (Standard)');
      if (!groups[g]) {
        groups[g] = [];
      }
      groups[g].push(m);
    });

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

  const getExecutorHelperText = () => {
    if (draftConfig.tier === 'Standard') {
      return 'HDD (standard) is used for batch workloads on standard tier.';
    }
    if (isExecutorAccelerated) {
      return 'SSD (premium) is used for accelerated machine types.';
    }
    return 'HDD (standard) suits most workloads. SSD (premium) costs more and pays off on shuffle-heavy or spill-heavy jobs.';
  };

  const getDriverHelperText = () => {
    if (draftConfig.tier === 'Standard') {
      return 'HDD (standard) is used for batch workloads on standard tier.';
    }
    if (isDriverAccelerated) {
      return 'SSD (premium) is used for accelerated machine types.';
    }
    return 'HDD (standard) suits most workloads. SSD (premium) costs more and pays off on shuffle-heavy or spill-heavy jobs.';
  };

  return (
    <EditDrawer
      open={open}
      title="Executor and driver configuration"
      subtitle="Customize compute tier, driver, and executor configuration for your workloads."
      onClose={onClose}
      onSave={handleSave}
    >
      {/* Tier Section */}
      <div className="edit-drawer-field-group">
        <div className="runtime-profile-section-title" style={{ fontSize: 14 }}>
          Tier
        </div>
        <div className="edit-drawer-helper-text">
          Managed Service for Apache Spark offers two tiers for workload
          execution. Use premium tier for accelerated machine types and faster
          workload execution.{' '}
          <span
            role="button"
            tabIndex={0}
            className="section-detail-link"
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
            <div className="node-config-card-title">Premium</div>
            <div className="node-config-card-desc">
              Optimized for complex or latency-sensitive queries with
              acceleration engines.
            </div>
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
            <div className="node-config-card-title">Standard</div>
            <div className="node-config-card-desc">
              Standard Spark execution environment for routine data processing.
            </div>
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
            <span>
              Standard tier will only affect batch execution. Interactive
              sessions always execute on premium tier.
            </span>
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
                  Enable Lightning Engine to accelerate performance
                </span>
              }
            />
            <div className="runtime-profile-checkbox-desc">
              Turn on to accelerate your Spark jobs with Lightning Engine.{' '}
              <span
                role="button"
                tabIndex={0}
                className="section-detail-link"
                onClick={() => window.open(LIGHTNING_ENGINE_DOC, '_blank')}
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
            ? 'Executor configuration'
            : 'Executor and driver configuration'}
        </div>
        <div className="edit-drawer-subtitle">
          {draftConfig.useDifferentDriverConfig
            ? 'Executors run your tasks.'
            : 'The driver and executors will share the same machine type and disk configuration.'}
        </div>

        {renderMachineTypeDropdown(
          'edit-executor-machine-type',
          'Executor type',
          draftConfig.executorType,
          handleExecutorTypeChange,
          executorSearch,
          setExecutorSearch,
          draftConfig.tier
        )}

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
            disabled={isExecutorAccelerated || draftConfig.tier === 'Standard'}
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
            {(draftConfig.executorDiskTier === 'SSD (premium)'
              ? SSD_DISK_SIZES
              : HDD_DISK_SIZES
            ).map(size => (
              <MenuItem key={size} value={size}>
                {size}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <div className="edit-drawer-helper-text">{getExecutorHelperText()}</div>
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
              Use different configuration for driver
            </span>
          }
        />
        <div
          className="edit-drawer-helper-text"
          style={{ marginLeft: 28, marginTop: -6 }}
        >
          Driver will match executor settings unless checked.
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
            Driver configuration
          </div>
          <div className="edit-drawer-subtitle">
            The driver coordinates your executors and manages metadata.
          </div>

          {renderMachineTypeDropdown(
            'edit-driver-machine-type',
            'Driver machine type',
            draftConfig.driverMachineType,
            handleDriverMachineTypeChange,
            driverSearch,
            setDriverSearch,
            draftConfig.tier
          )}

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
              disabled={isDriverAccelerated || draftConfig.tier === 'Standard'}
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
              {(draftConfig.driverDiskTier === 'SSD (premium)'
                ? SSD_DISK_SIZES
                : HDD_DISK_SIZES
              ).map(size => (
                <MenuItem key={size} value={size}>
                  {size}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <div className="edit-drawer-helper-text">{getDriverHelperText()}</div>
        </div>
      )}
    </EditDrawer>
  );
};
