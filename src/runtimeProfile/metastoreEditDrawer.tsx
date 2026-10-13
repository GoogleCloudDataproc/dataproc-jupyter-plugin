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

import React, { useEffect, useRef, useState } from 'react';
import {
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField
} from '@mui/material';
import { EditDrawer } from '../controls/EditDrawer';
import { ProjectSelectorModal } from '../controls/ProjectSelectorModal';
import {
  CatalogSelectionMode,
  IMetastoreConfig,
  MetastoreType
} from './runtimeProfileInterface';
import {
  getDefaultLakehouseCatalogName,
  LAKEHOUSE_RUNTIME_CATALOG,
  METASTORE_NONE
} from './runtimeProfileMapper';
import { listBigLakeCatalogsAPI } from '../utils/biglakeService';
import { metastoreServiceListAPI } from '../utils/metastoreService';
import { authApi } from '../utils/utils';

const DATAPROC_METASTORE = 'Dataproc Metastore';
// Delay before a typed project ID is used to fetch catalogs or services.
export const PROJECT_INPUT_DEBOUNCE_MS = 500;
// Catalog names become part of property keys, so dots and spaces are not allowed.
const CATALOG_NAME_REGEX = /^[A-Za-z0-9_-]+$/;
export const CATALOG_NAME_INVALID_ERROR =
  'Use only letters, numbers, hyphens (-) and underscores (_).';

interface IMetastoreTypeCardProps {
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}

/** Selectable card, styled like the tier cards. */
const MetastoreTypeCard: React.FC<IMetastoreTypeCardProps> = ({
  title,
  description,
  selected,
  onSelect
}) => (
  <div
    className={`node-config-card ${selected ? 'selected' : ''}`}
    onClick={onSelect}
    role="button"
    tabIndex={0}
    aria-pressed={selected}
    onKeyDown={e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect();
      }
    }}
  >
    <div className="node-config-card-title">{title}</div>
    <div className="node-config-card-desc">{description}</div>
  </div>
);

interface IProjectIdFieldProps {
  id: string;
  label: string;
  value: string;
  className?: string;
  onChange: (projectId: string) => void;
  onBrowse: () => void;
}

/**
 * Project ID input with a Browse button. Typed values reach onChange after a
 * short pause or on blur, so callers don't fetch on every keystroke.
 */
const ProjectIdField: React.FC<IProjectIdFieldProps> = ({
  id,
  label,
  value,
  className,
  onChange,
  onBrowse
}) => {
  const [draft, setDraft] = useState<string>(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Pick up values set outside the input (signed-in project).
  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (draft.trim() === value) {
      return;
    }
    const timer = setTimeout(
      () => onChangeRef.current(draft.trim()),
      PROJECT_INPUT_DEBOUNCE_MS
    );
    return () => clearTimeout(timer);
  }, [draft, value]);

  return (
    <div className={`edit-drawer-input-with-button ${className ?? ''}`}>
      <TextField
        id={id}
        label={label}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => {
          if (draft.trim() !== value) {
            onChange(draft.trim());
          }
        }}
        variant="outlined"
        size="small"
        fullWidth
        InputLabelProps={{ shrink: true }}
      />
      <button
        type="button"
        className="edit-drawer-browse-btn"
        onClick={onBrowse}
      >
        Browse
      </button>
    </div>
  );
};

interface IAsyncOptionsSelectProps {
  id: string;
  label: string;
  value: string;
  options: string[];
  isLoading: boolean;
  loadingText: string;
  emptyText: string;
  onChange: (value: string) => void;
  /** Options listed before the fetched ones, e.g. "None". */
  fixedOptions?: string[];
}

/** Select whose options are fetched, with loading and empty states. */
const AsyncOptionsSelect: React.FC<IAsyncOptionsSelectProps> = ({
  id,
  label,
  value,
  options,
  isLoading,
  loadingText,
  emptyText,
  onChange,
  fixedOptions = []
}) => (
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
      disabled={isLoading}
    >
      {fixedOptions.map(option => (
        <MenuItem key={option} value={option}>
          {option}
        </MenuItem>
      ))}
      {isLoading ? (
        <MenuItem value="" disabled>
          <CircularProgress
            size={16}
            className="metastore-drawer-option-spinner"
          />
          {loadingText}
        </MenuItem>
      ) : options.length === 0 ? (
        <MenuItem value="" disabled>
          {emptyText}
        </MenuItem>
      ) : (
        options.map(option => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))
      )}
    </Select>
  </FormControl>
);

interface IMetastoreDrawerState {
  metastoreType: MetastoreType;
  projectId: string;
  icebergRestEndpointEnabled: boolean;
  catalogSelectionMode: CatalogSelectionMode;
  catalogId: string;
  catalogName: string;
  dataprocMetastoreService: string;
  hiveEndpointEnabled: boolean;
  hiveProjectId: string;
  hiveCatalogId: string;
  hiveCatalogName: string;
}

/** Drawer field values for a saved config; unset fields get their defaults. */
const deriveDrawerState = (
  config: IMetastoreConfig,
  region: string
): IMetastoreDrawerState => ({
  metastoreType: config.metastoreType ?? 'lakehouse',
  projectId: config.projectId ?? '',
  icebergRestEndpointEnabled: config.icebergRestEndpointEnabled ?? true,
  catalogSelectionMode: config.catalogSelectionMode ?? 'new',
  catalogId: config.catalogId ?? '',
  catalogName: config.catalogName ?? getDefaultLakehouseCatalogName(region),
  dataprocMetastoreService: config.dataprocMetastoreService || METASTORE_NONE,
  hiveEndpointEnabled: Boolean(config.hiveEndpointEnabled),
  hiveProjectId: config.hiveProjectId ?? config.projectId ?? '',
  hiveCatalogId: config.hiveCatalogId ?? '',
  hiveCatalogName: config.hiveCatalogName ?? ''
});

const isInvalidCatalogName = (name: string): boolean =>
  name.trim() !== '' && !CATALOG_NAME_REGEX.test(name.trim());

export interface IMetastoreEditDrawerProps {
  open: boolean;
  config: IMetastoreConfig;
  /** Region of the runtime profile. */
  region?: string;
  onClose: () => void;
  onSave: (updatedConfig: IMetastoreConfig) => void;
}

export const MetastoreEditDrawer: React.FC<IMetastoreEditDrawerProps> = ({
  open,
  config,
  region = '',
  onClose,
  onSave
}) => {
  const [state, setState] = useState<IMetastoreDrawerState>(() =>
    deriveDrawerState(config, region)
  );
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [projectModalTarget, setProjectModalTarget] = useState<
    'project' | 'hive' | null
  >(null);
  const [catalogsList, setCatalogsList] = useState<string[]>([]);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState<boolean>(false);
  const [hiveCatalogsList, setHiveCatalogsList] = useState<string[]>([]);
  const [isLoadingHiveCatalogs, setIsLoadingHiveCatalogs] =
    useState<boolean>(false);
  const [dpmsServicesList, setDpmsServicesList] = useState<string[]>([]);
  const [isLoadingDpmsServices, setIsLoadingDpmsServices] =
    useState<boolean>(false);

  const update = (changes: Partial<IMetastoreDrawerState>) =>
    setState(prev => ({ ...prev, ...changes }));

  // Another project has other catalogs and services, so drop what was picked
  // for the previous one; the list effects below pick again for the new one.
  const changeProjectId = (projectId: string) =>
    setState(prev =>
      prev.projectId === projectId
        ? prev
        : {
            ...prev,
            projectId,
            catalogId: '',
            dataprocMetastoreService: METASTORE_NONE
          }
    );

  const changeHiveProjectId = (hiveProjectId: string) =>
    setState(prev =>
      prev.hiveProjectId === hiveProjectId
        ? prev
        : {
            ...prev,
            hiveProjectId,
            hiveCatalogId: '',
            // A name that only mirrored the old catalog ID follows the new one.
            hiveCatalogName:
              prev.hiveCatalogName === prev.hiveCatalogId
                ? ''
                : prev.hiveCatalogName
          }
    );

  // Reset the fields from the saved config each time the drawer opens, and
  // default empty project fields to the signed-in project.
  useEffect(() => {
    if (!open) {
      return;
    }
    setState(deriveDrawerState(config, region));
    let cancelled = false;
    authApi()
      .then(credentials => {
        const signedInProject = credentials?.project_id;
        if (cancelled || !signedInProject) {
          return;
        }
        setActiveProjectId(signedInProject);
        setState(prev => ({
          ...prev,
          projectId: prev.projectId || signedInProject,
          hiveProjectId: prev.hiveProjectId || signedInProject
        }));
      })
      .catch(err => {
        console.error('Failed to get active project ID', err);
      });
    return () => {
      cancelled = true;
    };
  }, [open, config, region]);

  // Catalogs for "Choose existing catalog in project".
  useEffect(() => {
    if (
      !open ||
      state.metastoreType !== 'lakehouse' ||
      !state.icebergRestEndpointEnabled ||
      state.catalogSelectionMode !== 'existing' ||
      !state.projectId
    ) {
      return;
    }
    let cancelled = false;
    setIsLoadingCatalogs(true);
    listBigLakeCatalogsAPI(state.projectId, region).then(catalogs => {
      if (cancelled) {
        return;
      }
      setCatalogsList(catalogs);
      setIsLoadingCatalogs(false);
      // Pre-select the first catalog when none is chosen yet.
      setState(prev => ({
        ...prev,
        catalogId: prev.catalogId || catalogs[0] || ''
      }));
    });
    return () => {
      cancelled = true;
      setIsLoadingCatalogs(false);
    };
  }, [
    open,
    state.metastoreType,
    state.icebergRestEndpointEnabled,
    state.catalogSelectionMode,
    state.projectId,
    region
  ]);

  // Catalogs for the Hive endpoint.
  useEffect(() => {
    if (
      !open ||
      state.metastoreType !== 'lakehouse' ||
      !state.hiveEndpointEnabled ||
      !state.hiveProjectId
    ) {
      return;
    }
    let cancelled = false;
    setIsLoadingHiveCatalogs(true);
    listBigLakeCatalogsAPI(state.hiveProjectId, region).then(catalogs => {
      if (cancelled) {
        return;
      }
      setHiveCatalogsList(catalogs);
      setIsLoadingHiveCatalogs(false);
      // Pre-select the first catalog when none is chosen yet.
      setState(prev =>
        prev.hiveCatalogId || !catalogs[0]
          ? prev
          : {
              ...prev,
              hiveCatalogId: catalogs[0],
              hiveCatalogName: prev.hiveCatalogName || catalogs[0]
            }
      );
    });
    return () => {
      cancelled = true;
      setIsLoadingHiveCatalogs(false);
    };
  }, [
    open,
    state.metastoreType,
    state.hiveEndpointEnabled,
    state.hiveProjectId,
    region
  ]);

  // Dataproc Metastore services.
  useEffect(() => {
    if (!open || state.metastoreType !== 'dataproc' || !state.projectId) {
      return;
    }
    let cancelled = false;
    setIsLoadingDpmsServices(true);
    metastoreServiceListAPI(state.projectId, '')
      .then(services => {
        if (!cancelled) {
          setDpmsServicesList(services);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDpmsServicesList([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingDpmsServices(false);
        }
      });
    return () => {
      cancelled = true;
      setIsLoadingDpmsServices(false);
    };
  }, [open, state.metastoreType, state.projectId]);

  const catalogNameError = isInvalidCatalogName(state.catalogName);
  const hiveCatalogNameError = isInvalidCatalogName(state.hiveCatalogName);

  const isSaveDisabled = (() => {
    // "None" is a valid Dataproc Metastore selection.
    if (state.metastoreType === 'dataproc') {
      return false;
    }
    if (!state.icebergRestEndpointEnabled && !state.hiveEndpointEnabled) {
      return true;
    }
    // Both endpoints wait while their catalogs load, so a quick Save after a
    // project change can't go out before that project's catalog is picked.
    if (state.icebergRestEndpointEnabled) {
      if (
        state.catalogSelectionMode === 'existing' &&
        (isLoadingCatalogs || !state.catalogId)
      ) {
        return true;
      }
      // An empty new catalog name means the region's default name.
      if (state.catalogSelectionMode === 'new' && catalogNameError) {
        return true;
      }
    }
    if (
      state.hiveEndpointEnabled &&
      (isLoadingHiveCatalogs ||
        !state.hiveProjectId.trim() ||
        !state.hiveCatalogName.trim() ||
        hiveCatalogNameError)
    ) {
      return true;
    }
    return false;
  })();

  // Save only the fields of the selected metastore and enabled endpoints.
  // Hidden fields keep their values while the drawer is open, but are dropped.
  const handleSave = () => {
    const projectId = state.projectId.trim();
    // Unset means the runtime profile's own project.
    const otherProjectId =
      projectId && projectId !== activeProjectId ? projectId : undefined;

    if (state.metastoreType === 'dataproc') {
      onSave({
        metastore: DATAPROC_METASTORE,
        metastoreType: 'dataproc',
        projectId: otherProjectId,
        dataprocMetastoreService:
          state.dataprocMetastoreService !== METASTORE_NONE
            ? state.dataprocMetastoreService
            : undefined
      });
      return;
    }

    const isIcebergEnabled = state.icebergRestEndpointEnabled;
    const isNewCatalog = state.catalogSelectionMode === 'new';
    const catalogName = state.catalogName.trim();
    const isHiveEnabled = state.hiveEndpointEnabled;
    onSave({
      metastore: LAKEHOUSE_RUNTIME_CATALOG,
      metastoreType: 'lakehouse',
      projectId: isIcebergEnabled ? otherProjectId : undefined,
      icebergRestEndpointEnabled: isIcebergEnabled,
      catalogSelectionMode: isIcebergEnabled
        ? state.catalogSelectionMode
        : undefined,
      catalogId:
        isIcebergEnabled && !isNewCatalog
          ? state.catalogId || undefined
          : undefined,
      // The region's default name isn't saved, so it follows region changes.
      catalogName:
        isIcebergEnabled &&
        isNewCatalog &&
        catalogName &&
        catalogName !== getDefaultLakehouseCatalogName(region)
          ? catalogName
          : undefined,
      hiveEndpointEnabled: isHiveEnabled,
      hiveProjectId: isHiveEnabled
        ? state.hiveProjectId.trim() || undefined
        : undefined,
      hiveCatalogId: isHiveEnabled
        ? state.hiveCatalogId || undefined
        : undefined,
      hiveCatalogName: isHiveEnabled
        ? state.hiveCatalogName.trim() || undefined
        : undefined
    });
  };

  return (
    <>
      <EditDrawer
        open={open}
        title="Metastore configuration"
        width="560px"
        subtitle="Choose the metastore that manages your dataset. By default, a runtime profile will use the Lakehouse runtime catalog in the same project as the runtime profile, but you can choose a Lakehouse runtime catalog in a different project or a Dataproc Metastore instance."
        onClose={onClose}
        onSave={handleSave}
        isSaveDisabled={isSaveDisabled}
      >
        <div className="edit-drawer-field-group">
          <div className="runtime-profile-section-title">
            Select metastore and project
          </div>
          <div className="node-config-cards-container metastore-drawer-cards">
            <MetastoreTypeCard
              title={LAKEHOUSE_RUNTIME_CATALOG}
              description="Modern, serverless metastore for your Lakehouse"
              selected={state.metastoreType === 'lakehouse'}
              onSelect={() => update({ metastoreType: 'lakehouse' })}
            />
            <MetastoreTypeCard
              title={DATAPROC_METASTORE}
              description="Legacy-managed Hive Metastore (HMS)"
              selected={state.metastoreType === 'dataproc'}
              onSelect={() => update({ metastoreType: 'dataproc' })}
            />
          </div>
        </div>

        {state.metastoreType === 'lakehouse' && (
          <>
            <div className="edit-drawer-field-group">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={state.icebergRestEndpointEnabled}
                    onChange={e =>
                      update({ icebergRestEndpointEnabled: e.target.checked })
                    }
                    size="small"
                  />
                }
                label="Iceberg REST Endpoint"
              />

              {state.icebergRestEndpointEnabled && (
                <>
                  <div className="edit-drawer-helper-text">
                    Specify the Iceberg REST Catalog endpoints.
                  </div>

                  <ProjectIdField
                    id="metastore-project-id"
                    className="metastore-drawer-row"
                    label="Project ID"
                    value={state.projectId}
                    onChange={changeProjectId}
                    onBrowse={() => setProjectModalTarget('project')}
                  />

                  <div className="edit-drawer-field-group metastore-drawer-subsection">
                    <div className="runtime-profile-section-title">
                      Choose your default catalog
                    </div>
                    <div className="edit-drawer-helper-text">
                      Managed Service for Apache Spark will automatically create
                      a default catalog for you unless you designate an existing
                      one from your metastore.
                    </div>

                    <RadioGroup
                      value={state.catalogSelectionMode}
                      onChange={e =>
                        update({
                          catalogSelectionMode: e.target
                            .value as CatalogSelectionMode
                        })
                      }
                    >
                      <FormControlLabel
                        value="existing"
                        control={<Radio size="small" />}
                        label="Choose existing catalog in project"
                      />

                      {state.catalogSelectionMode === 'existing' && (
                        <div className="metastore-drawer-indented">
                          <AsyncOptionsSelect
                            id="existing-catalog-select"
                            label="Catalog ID"
                            value={state.catalogId}
                            options={catalogsList}
                            isLoading={isLoadingCatalogs}
                            loadingText="Loading catalogs..."
                            emptyText="No catalogs found in project"
                            onChange={catalogId => update({ catalogId })}
                          />
                        </div>
                      )}

                      <FormControlLabel
                        value="new"
                        control={<Radio size="small" />}
                        label="Create new default catalog"
                      />

                      {state.catalogSelectionMode === 'new' && (
                        <div className="metastore-drawer-indented">
                          <TextField
                            id="new-catalog-name"
                            label="Default catalog name"
                            value={state.catalogName}
                            onChange={e =>
                              update({ catalogName: e.target.value })
                            }
                            placeholder={
                              getDefaultLakehouseCatalogName(region) ||
                              'standard-lh-catalog-<region>'
                            }
                            error={catalogNameError}
                            helperText={
                              catalogNameError
                                ? CATALOG_NAME_INVALID_ERROR
                                : undefined
                            }
                            variant="outlined"
                            size="small"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                          />
                        </div>
                      )}
                    </RadioGroup>
                  </div>
                </>
              )}
            </div>

            <div className="edit-drawer-field-group">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={state.hiveEndpointEnabled}
                    onChange={e =>
                      update({ hiveEndpointEnabled: e.target.checked })
                    }
                    size="small"
                  />
                }
                label="Hive Endpoint"
              />
              <div className="edit-drawer-helper-text metastore-drawer-checkbox-helper">
                Specify the Hive endpoint.
              </div>

              {state.hiveEndpointEnabled && (
                <div className="metastore-drawer-hive-fields">
                  <ProjectIdField
                    id="hive-project-id"
                    label="Project ID *"
                    value={state.hiveProjectId}
                    onChange={changeHiveProjectId}
                    onBrowse={() => setProjectModalTarget('hive')}
                  />

                  <AsyncOptionsSelect
                    id="hive-catalog-id-select"
                    label="Catalog ID"
                    value={state.hiveCatalogId}
                    options={hiveCatalogsList}
                    isLoading={isLoadingHiveCatalogs}
                    loadingText="Loading catalogs..."
                    emptyText="No catalogs found in project"
                    onChange={hiveCatalogId =>
                      update({
                        hiveCatalogId,
                        // Keep the name in sync with the ID unless it was edited.
                        hiveCatalogName:
                          !state.hiveCatalogName ||
                          state.hiveCatalogName === state.hiveCatalogId
                            ? hiveCatalogId
                            : state.hiveCatalogName
                      })
                    }
                  />

                  <TextField
                    id="hive-catalog-name"
                    label="Catalog Name *"
                    value={state.hiveCatalogName}
                    onChange={e => update({ hiveCatalogName: e.target.value })}
                    error={hiveCatalogNameError}
                    helperText={
                      hiveCatalogNameError
                        ? CATALOG_NAME_INVALID_ERROR
                        : undefined
                    }
                    variant="outlined"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {state.metastoreType === 'dataproc' && (
          <>
            <div className="edit-drawer-helper-text metastore-drawer-intro">
              Configure the cluster to use Dataproc Metastore as its Hive
              metastore.{' '}
              <a
                href="https://cloud.google.com/dataproc-metastore/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="runtime-profile-learn-more"
              >
                Learn more
              </a>
            </div>

            <div className="edit-drawer-field-group">
              <ProjectIdField
                id="dpms-project-id"
                label="Selected project"
                value={state.projectId}
                onChange={changeProjectId}
                onBrowse={() => setProjectModalTarget('project')}
              />
            </div>

            <div className="edit-drawer-field-group">
              <AsyncOptionsSelect
                id="dpms-service-select"
                label="Metastore service"
                value={state.dataprocMetastoreService}
                fixedOptions={[METASTORE_NONE]}
                options={dpmsServicesList}
                isLoading={isLoadingDpmsServices}
                loadingText="Loading services..."
                emptyText="No services found in project"
                onChange={dataprocMetastoreService =>
                  update({ dataprocMetastoreService })
                }
              />
              <div className="edit-drawer-helper-text metastore-drawer-row">
                We recommend this option to persist table metadata when a
                cluster is shut down, for a metastore shared by different
                clusters, or for metadata operability across GCP products.
              </div>
            </div>
          </>
        )}
      </EditDrawer>

      <ProjectSelectorModal
        open={projectModalTarget !== null}
        selectedProjectId={
          projectModalTarget === 'hive' ? state.hiveProjectId : state.projectId
        }
        onClose={() => setProjectModalTarget(null)}
        onSelect={selectedId =>
          projectModalTarget === 'hive'
            ? changeHiveProjectId(selectedId)
            : changeProjectId(selectedId)
        }
      />
    </>
  );
};
