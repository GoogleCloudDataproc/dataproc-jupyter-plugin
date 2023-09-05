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
import settingsIcon from '../../style/icons/settings_icon.svg';
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  USER_INFO_URL
} from '../utils/const';
import { IAuthCredentials, authApi } from '../utils/utils';
import 'semantic-ui-css/semantic.min.css';
import { requestAPI } from '../handler/handler';
import ClipLoader from 'react-spinners/ClipLoader';
import { ToastContainer, ToastOptions, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import THIRD_PARTY_LICENSES from '../../third-party-licenses.txt';
import ListRuntimeTemplates from '../runtime/listRuntimeTemplates';
import expandLessIcon from '../../style/icons/expand_less.svg';
import expandMoreIcon from '../../style/icons/expand_more.svg';
import { Button } from '@mui/material';
import { RegionDropdown } from '../controls/RegionDropdown';
import { projectListAPI } from '../utils/projectService';
import { DynamicDropdown } from '../controls/DynamicDropdown';
import CreateRuntime from '../runtime/createRunTime';
import { SessionTemplate } from '../utils/listRuntimeTemplateInterface';

const iconExpandLess = new LabIcon({
  name: 'launcher:expand-less-icon',
  svgstr: expandLessIcon
});
const iconExpandMore = new LabIcon({
  name: 'launcher:expand-more-icon',
  svgstr: expandMoreIcon
});

function ConfigSelection({ configError, setConfigError }: any) {
  const Iconsettings = new LabIcon({
    name: 'launcher:settings_icon',
    svgstr: settingsIcon
  });

  const [projectId, setProjectId] = useState('');
  const [region, setRegion] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userInfo, setUserInfo] = useState({
    email: '',
    picture: ''
  });
  const [expandRuntimeTemplate, setExpandRuntimeTemplate] = useState(true);
  const [openCreateTemplate, setOpenCreateTemplate] = useState(false);

  const [selectedRuntimeClone, setSelectedRuntimeClone] =
    useState<SessionTemplate>();

  const handleSave = async () => {
    setIsSaving(true);
    const dataToSend = { projectId, region };
    try {
      const data = await requestAPI<any>('configuration', {
        body: JSON.stringify(dataToSend),
        method: 'POST'
      });
      if (typeof data === 'object' && data !== null) {
        const configStatus = (data as { config: string }).config;
        if (configStatus && !toast.isActive('custom-toast')) {
          const toastifyCustomStyle: ToastOptions<{}> = {
            hideProgressBar: true,
            autoClose: false,
            theme: 'dark',
            position: toast.POSITION.BOTTOM_CENTER,
            toastId: 'custom-toast'
          };
          if (configStatus.includes('Failed')) {
            toast.error(configStatus, toastifyCustomStyle);
          } else {
            toast.success(
              `${configStatus} - You will need to restart Jupyter in order for the new project and region to fully take effect.`,
              toastifyCustomStyle
            );
          }
        }
      }
    } catch (reason) {
      console.error(`Error on POST {dataToSend}.\n${reason}`);
    } finally {
      setIsSaving(false);
    }
  };

  const displayUserInfo = async (credentials: IAuthCredentials | undefined) => {
    if (credentials) {
      fetch(USER_INFO_URL, {
        method: 'GET',
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token
        }
      })
        .then((response: any) => {
          response
            .json()
            .then((responseResult: any) => {
              setUserInfo(responseResult);
              setIsLoadingUser(false);
            })
            .catch((e: any) => console.log(e));
        })
        .catch((err: any) => {
          setIsLoadingUser(false);
          console.error('Error displaying user info', err);
          toast.error('Failed to fetch user information');
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

  useEffect(() => {
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
      <ToastContainer />
      {isLoadingUser && !configError ? (
        <div className="spin-loaderMain">
          <ClipLoader
            color="#8A8A8A"
            loading={true}
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
        />
      ) : (
        <div className="settings-component">
          <div className="settings-overlay">
            <div>
              <Iconsettings.react tag="div" />
            </div>
            <div className="settings-text">Settings</div>
          </div>
          <div className="settings-seperator"></div>
          <div className="config-overlay">
            <div className="config-form">
              <div className="project-overlay">
                <DynamicDropdown
                  value={projectId}
                  onChange={(_, projectId) => setProjectId(projectId ?? '')}
                  fetchFunc={projectListAPI}
                  label="Project ID"
                />
              </div>

              <div className="region-overlay">
                <RegionDropdown
                  projectId={projectId}
                  region={region}
                  onRegionChange={region => setRegion(region)}
                />
              </div>
              <div className="save-overlay">
                <Button
                  variant="contained"
                  disabled={
                    isSaving || projectId.length == 0 || region.length == 0
                  }
                  onClick={handleSave}
                >
                  {isSaving ? 'Saving' : 'Save'}
                </Button>
              </div>
            </div>
            <div className="user-info-card">
              <div className="google-header">
                This account is managed by google.com
              </div>
              <div className="seperator"></div>
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
              <div className="seperator"></div>
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
            </div>
          </div>
          <div>
            <div className="runtime-title-section">
              <div className="runtime-title-part">
                Serverless Runtime Templates
              </div>
              <div
                className="expand-icon"
                onClick={() => handleRuntimeExpand()}
              >
                {expandRuntimeTemplate ? (
                  <iconExpandLess.react tag="div" />
                ) : (
                  <iconExpandMore.react tag="div" />
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
