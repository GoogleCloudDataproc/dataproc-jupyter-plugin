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
import '../../style/runtimeProfile.css';
import {
  ICreateRuntimeProfilePayload,
  IRegionOption
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

export interface ICreateRuntimeProfileComponentProps {
  app?: JupyterLab;
  launcher?: ILauncher;
  themeManager?: IThemeManager;
  settingRegistry?: ISettingRegistry;
  service?: RuntimeProfileService;
  onBack?: () => void;
  onSuccess?: () => void;
}

export const CreateRuntimeProfileComponent: React.FC<
  ICreateRuntimeProfileComponentProps
> = ({
  app,
  service = runtimeProfileService,
  onBack,
  onSuccess
}): React.JSX.Element => {
  // Options & Data State
  const [regions, setRegions] = useState<IRegionOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState<boolean>(true);

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
        description: data.description.trim() || undefined
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
          Additional Configuration and all the other fields as per Project Ignite Design document
          API integration of the form fields
          Will be taken care as part of upcoming development task */}
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
