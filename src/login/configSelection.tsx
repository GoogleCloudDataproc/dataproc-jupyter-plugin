/**
 * @license
 * Copyright 2023 Google LLC
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

import React, { useState, useEffect } from 'react';
import { LabIcon } from '@jupyterlab/ui-components';
import googleCloudIcon from '../../style/icons/google-cloud.svg';
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  PLUGIN_ID,
  USER_INFO_URL,
  VERSION_DETAIL
} from '../utils/const';
import {
  IAuthCredentials,
  authApi,
  toastifyCustomStyle,
  loggedFetch
} from '../utils/utils';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import THIRD_PARTY_LICENSES from '../../third-party-licenses.txt';
import ListRuntimeTemplates from '../runtime/listRuntimeTemplates';
import expandLessIcon from '../../style/icons/expand_less.svg';
import expandMoreIcon from '../../style/icons/expand_more.svg';
import { Button, CircularProgress } from '@mui/material';
import { RegionDropdown } from '../controls/RegionDropdown';
import { projectListAPI } from '../utils/projectService';
import { DynamicDropdown } from '../controls/DynamicDropdown';
import CreateRuntime from '../runtime/createRunTime';
import { ISessionTemplate } from '../utils/listRuntimeTemplateInterface';
import { JupyterLab } from '@jupyterlab/application';
import { ILauncher } from '@jupyterlab/launcher';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { BigQueryRegionDropdown } from '../controls/BigQueryRegionDropdown';
import { eventEmitter } from '../utils/signalEmitter';
import { requestAPI } from '../handler/handler';

const iconExpandLess = new LabIcon({
  name: 'launcher:expand-less-icon',
  svgstr: expandLessIcon
});
const iconExpandMore = new LabIcon({
  name: 'launcher:expand-more-icon',
  svgstr: expandMoreIcon
});
interface IConfigSelectionProps {
  configError: boolean;
  setConfigError: (error: boolean) => void;
  app: JupyterLab;
  launcher: ILauncher;
  settingRegistry: ISettingRegistry;
}

function ConfigSelection({
  configError,
  setConfigError,
  app,
  launcher,
  settingRegistry
}: IConfigSelectionProps) {
  const IconGoogleCloud = new LabIcon({
    name: 'launcher:google_cloud_icon',
    svgstr: googleCloudIcon
  });

  const [bigQueryFeatureEnable, setbigQueryFeatureEnable] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [region, setRegion] = useState('');
  const [bigQueryRegion, setBigQueryRegion] = useState<any>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userInfo, setUserInfo] = useState({
    email: '',
    picture: ''
  });
  const [expandRuntimeTemplate, setExpandRuntimeTemplate] = useState(true);
  const [openCreateTemplate, setOpenCreateTemplate] = useState(false);

  const [selectedRuntimeClone, setSelectedRuntimeClone] =
    useState<ISessionTemplate>();

  const handleSave = async () => {
    setIsSaving(true);
    const dataToSend = { projectId, region };
    try {
      const data = await requestAPI('configuration', {
        body: JSON.stringify(dataToSend),
        method: 'POST'
      });
      if (typeof data === 'object' && data !== null) {
        const configStatus = (data as { config: string }).config;
        if (configStatus && !toast.isActive('custom-toast')) {
          if (configStatus.includes('Failed')) {
            toast.error(configStatus, toastifyCustomStyle);
          } else {
            if (bigQueryFeatureEnable) {
              const settings = await settingRegistry.load(PLUGIN_ID);
              settings.set('bqRegion', bigQueryRegion);
            }
            toast.success(
              `${configStatus} - You will need to restart Jupyter in order for the new project and region to fully take effect.`,
              toastifyCustomStyle
            );
            // Emit signal after toast success
            eventEmitter.emit(
              'dataprocConfigChange',
              `${configStatus} - Configuration updated successfully.`
            );
          }
        }
      }
    } catch (reason) {
      toast.error(
        `Error on POST {dataToSend}.\n${reason}`,
        toastifyCustomStyle
      );
    } finally {
      setIsSaving(false);
    }
  };
  interface IUserInfoResponse {
    error: {
      code: number;
      message: string;
    };
    email: string;
    picture: string;
  }

  const displayUserInfo = async (credentials: IAuthCredentials | undefined) => {
    if (credentials) {
      loggedFetch(USER_INFO_URL, {
        method: 'GET',
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token
        }
      })
        .then((response: Response) => {
          response
            .json()
            .then((responseResult: IUserInfoResponse) => {
              if (responseResult?.error?.code) {
                toast.error(
                  responseResult?.error?.message,
                  toastifyCustomStyle
                );
              } else {
                setUserInfo(responseResult);
                setIsLoadingUser(false);
              }
            })
            .catch((e: Error) => console.error(e));
        })
        .catch((err: Error) => {
          setIsLoadingUser(false);
          DataprocLoggingService.log(
            'Error displaying user info',
            LOG_LEVEL.ERROR
          );
          toast.error(
            `Failed to fetch user information : ${err}`,
            toastifyCustomStyle
          );
        });
    }
  };
  /**
   * onClick handler for when user's click on the "license" link in
   * the user info box.
   */
  const handleLicenseClick = async () => {
    const licenseWindow = window.open('about:blank');
    if (licenseWindow) {
      const preEle = licenseWindow.document.createElement('pre');
      preEle.textContent = THIRD_PARTY_LICENSES;
      licenseWindow.document.body.appendChild(preEle);
    }
  };

  const handleRuntimeExpand = () => {
    let runTimeMode = !expandRuntimeTemplate;
    setExpandRuntimeTemplate(runTimeMode);
  };

  const handleSettingsRegistry = async () => {
    const settings = await settingRegistry.load(PLUGIN_ID);
    setBigQueryRegion(settings.get('bqRegion')['composite']);
  };

  const handleBigQueryFeature = async () => {
    interface SettingsResponse {
      enable_bigquery_integration?: boolean;
    }
    let bqFeature: SettingsResponse = await requestAPI('settings');

    if (bqFeature.enable_bigquery_integration) {
      setbigQueryFeatureEnable(true);
    }
  };

  useEffect(() => {
    handleSettingsRegistry();
    handleBigQueryFeature();

    authApi().then(credentials => {
      displayUserInfo(credentials);
      setSelectedRuntimeClone(undefined);

      if (credentials && credentials.project_id && credentials.region_id) {
        setProjectId(credentials.project_id);
        setRegion(credentials.region_id);
        setConfigError(false);
      } else {
        setConfigError(true);
      }
    });
  }, []);
  return (
    <div>
      {isLoadingUser && !configError ? (
        <div className="spin-loader-main">
          <CircularProgress
            className="spin-loader-custom-style"
            size={20}
            aria-label="Loading Spinner"
            data-testid="loader"
          />
          Loading Config Setup
        </div>
      ) : !configError && openCreateTemplate ? (
        <CreateRuntime
          setOpenCreateTemplate={setOpenCreateTemplate}
          selectedRuntimeClone={selectedRuntimeClone}
          launcher={launcher}
          app={app}
          fromPage="config"
        />
      ) : (
        <div className="settings-component">
          <div className="settings-overlay">
            <div>
              <IconGoogleCloud.react
                tag="div"
                className="logo-alignment-style"
              />
            </div>
            <div className="settings-text">Settings</div>
          </div>
          <div className="settings-separator"></div>
          <div className="project-header">Google Cloud Project Settings </div>
          <div className="config-overlay">
            <div className="config-form">
              <div className="project-overlay">
                <DynamicDropdown
                  value={projectId}
                  onChange={(_, projectId) => setProjectId(projectId ?? '')}
                  fetchFunc={projectListAPI}
                  label="Project ID*"
                  // Always show the clear indicator and hide the dropdown arrow
                  // make it very clear that this is an autocomplete.
                  sx={{
                    '& .MuiAutocomplete-clearIndicator': {
                      visibility: 'visible'
                    }
                  }}
                  popupIcon={null}
                />
              </div>

              <div className="region-overlay">
                <RegionDropdown
                  projectId={projectId}
                  region={region}
                  onRegionChange={region => setRegion(region)}
                />
              </div>
              {bigQueryFeatureEnable && (
                <>
                  <div className="bigquery-region-header">
                    BigQuery Settings{' '}
                  </div>
                  <div className="region-overlay">
                    <BigQueryRegionDropdown
                      projectId={projectId}
                      region={bigQueryRegion}
                      onRegionChange={bigQueryRegion =>
                        setBigQueryRegion(bigQueryRegion)
                      }
                    />
                  </div>
                </>
              )}
              <div className="save-overlay">
                <Button
                  variant="contained"
                  disabled={
                    isSaving || projectId.length === 0 || region.length === 0
                  }
                  onClick={handleSave}
                >
                  {isSaving ? 'Saving' : 'Save'}
                </Button>
              </div>
            </div>
            <div className="user-info-card">
              <div className="user-overlay">
                <div className="user-image-overlay">
                  <img
                    src={userInfo.picture}
                    alt="User Image"
                    className="user-image"
                  />
                </div>
                <div className="user-details">
                  <div className="user-email">{userInfo.email}</div>
                </div>
              </div>
              <div className="separator"></div>
              <div className="google-header">
                <a
                  href="https://policies.google.com/privacy?hl=en"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </a>
                <span className="privacy-terms"> • </span>
                <a
                  href="https://policies.google.com/terms?hl=en"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms of Service
                </a>
                <span className="footer-divider"> • </span>
                <a onClick={handleLicenseClick} href="#">
                  Licenses
                </a>
              </div>
              <div className="feedback-version-container">
                <div className="google-header">
                  <a
                    className="feedback-container"
                    href="https://forms.gle/wnEnH3fL4JRjPwbr7"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Provide Feedback
                  </a>
                  <span className="privacy-terms"> • </span>
                  <a
                    href="https://github.com/GoogleCloudDataproc/dataproc-jupyter-plugin"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Version {VERSION_DETAIL}
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="dataproc-settings-header">Dataproc Settings </div>
            <div className="runtime-title-section">
              <div className="runtime-title-part">
                Serverless Runtime Templates
              </div>
              <div
                className="expand-icon"
                onClick={() => handleRuntimeExpand()}
              >
                {expandRuntimeTemplate ? (
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
            {expandRuntimeTemplate && (
              <ListRuntimeTemplates
                openCreateTemplate={openCreateTemplate}
                setOpenCreateTemplate={setOpenCreateTemplate}
                setSelectedRuntimeClone={setSelectedRuntimeClone}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ConfigSelection;
