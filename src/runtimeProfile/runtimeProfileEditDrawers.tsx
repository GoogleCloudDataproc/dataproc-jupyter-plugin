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
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField
} from '@mui/material';
import { EditDrawer } from '../controls/EditDrawer';
import {
  IRuntimeEnvironmentConfig,
  IRuntimeProfileService
} from './runtimeProfileInterface';
import { runtimeProfileService } from './runtimeProfileService';
import {
  CUSTOM_CONTAINERS,
  CUSTOM_CONTAINER_MESSAGE,
  CUSTOM_CONTAINER_MESSAGE_PART
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

