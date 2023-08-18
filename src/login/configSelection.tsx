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
  PROJECT_LIST_URL,
  REGION_URL,
  USER_INFO_URL
} from '../utils/const';
import { authApi } from '../utils/utils';
import { Select } from 'semantic-ui-react';
import 'semantic-ui-css/semantic.min.css';
import { requestAPI } from '../handler/handler';
import ClipLoader from 'react-spinners/ClipLoader';
import { ToastContainer, ToastOptions, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import THIRD_PARTY_LICENSES from '../../third-party-licenses.txt';
import ListRuntimeTemplates from '../runtime/listRuntimeTemplates';
import expandLessIcon from '../../style/icons/expand_less.svg';
import expandMoreIcon from '../../style/icons/expand_more.svg';
import CreateRuntime from '../runtime/createRunTime';
import { SessionTemplateDisplay } from '../utils/listRuntimeTemplateInterface';

const iconExpandLess = new LabIcon({
  name: 'launcher:expand-less-icon',
  svgstr: expandLessIcon
});
const iconExpandMore = new LabIcon({
  name: 'launcher:expand-more-icon',
  svgstr: expandMoreIcon
});

function ConfigSelection({ loginState, configError, setConfigError }: any) {
  const Iconsettings = new LabIcon({
    name: 'launcher:settings_icon',
    svgstr: settingsIcon
  });

  const [projectId, setProjectId] = useState('');
  const [region, setRegion] = useState('');
  const [projectList, setProjectList] = useState([{}]);
  const [regionList, setRegionList] = useState([{}]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isLoadingRegion, setIsLoadingRegion] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [regionEmpty, SetRegionEmpty] = useState(true);
  const [isSaveDisabled, setIsSaveDisabled] = useState(true);
  const [userInfo, setUserInfo] = useState({
    email: '',
    picture: ''
  });
  const [expandRuntimeTemplate, setExpandRuntimeTemplate] = useState(true);
  const [openCreateTemplate, setOpenCreateTemplate] = useState(false);
  const [runtimeTemplateSelected, setRuntimeTemplateSelected] = useState<SessionTemplateDisplay>();

  const handleProjectIdChange = (event: any, data: any) => {
    setRegionList([]);
    SetRegionEmpty(true);
    if (data.value === undefined) {
      regionListAPI(data);
    } else {
      regionListAPI(data.value);
      setProjectId(data.value);
    }
    if (projectId.length !== 0) {
      setIsSaveDisabled(false);
    }
  };

  const handleRegionChange = (event: any, data: any) => {
    setRegion(data.value);
    if (projectId) {
      setIsSaveDisabled(false);
    }
    setIsDropdownOpen(false);
  };

  const handleSave = async () => {
    setIsLoading(true);
    setIsSaveDisabled(true);
    const dataToSend = { projectId: projectId, region: region };
    try {
      const data = await requestAPI<any>('configuration', {
        body: JSON.stringify(dataToSend),
        method: 'POST'
      });
      if (typeof data === 'object' && data !== null) {
        const configStatus = (data as { config: string }).config;
        setIsLoading(false);
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
            toast.success(configStatus, toastifyCustomStyle);
          }
        }
      }
    } catch (reason) {
      console.error(`Error on POST {dataToSend}.\n${reason}`);
    }
  };

  const displayUserInfo = async () => {
    const credentials = await authApi();
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

  const projectListAPI = async () => {
    const credentials = await authApi();
    if (credentials) {
      fetch(PROJECT_LIST_URL, {
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
              let transformedProjectList = [];
              transformedProjectList = responseResult.projects.map(
                (data: any) => {
                  return {
                    value: data.projectId,
                    key: data.projectId,
                    text: data.projectId
                  };
                }
              );
              setProjectList(transformedProjectList);
              setIsLoadingProject(false);
            })
            .catch((e: any) => console.log(e));
        })
        .catch((err: any) => {
          setIsLoadingProject(false);
          console.error('Error fetching project list', err);
          toast.error('Failed to fetch the projects');
        });
    }
  };
  const regionListAPI = async (projectId: any) => {
    try {
      const credentials = await authApi();
      if (credentials) {
        fetch(`${REGION_URL}${projectId}/regions`, {
          method: 'GET',
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        })
          .then((response: any) => {
            if (response.ok) {
              SetRegionEmpty(true);
              return response.json();
            } else {
              setIsDropdownOpen(false);
              setIsSaveDisabled(true);
              SetRegionEmpty(false);
              if (!toast.isActive('custom-toast-error')) {
                toast.error(response.status + ' Permission Denied', {
                  position: toast.POSITION.BOTTOM_CENTER,
                  toastId: 'custom-toast-error'
                });
              }
              throw new Error(`Request failed with status ${response.status}`);
            }
          })
          .then((responseResult: any) => {
            let transformedRegionList = [];
            transformedRegionList = responseResult.items.map((data: any) => {
              return {
                value: data.name,
                key: data.name,
                text: data.name
              };
            });
            setRegionList(transformedRegionList);
            setIsDropdownOpen(false);
            SetRegionEmpty(false);
            setIsLoadingRegion(false);
          })
          .catch((error: any) => {
            setIsLoadingRegion(false);
            console.error('Error fetching region list:', error.message);
          });
      }
    } catch (error) {
      setIsLoadingRegion(false);
      console.error('Error fetching region list:');
      toast.error('Failed to fetch the regions');
    }
  };
  const handleDropdownOpen = () => {
    if (regionEmpty) {
      setIsDropdownOpen(true);
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

  const fetchProjectRegion = async () => {
    const credentials = await authApi();
    if (credentials && credentials.project_id && credentials.region_id) {
      handleProjectIdChange(Event, credentials.project_id);
      setProjectId(credentials.project_id);
      setRegion(credentials.region_id);
      setConfigError(false);
    } else if (credentials && credentials.config_error === 1) {
      setConfigError(true);
    }
  };

  const handleRuntimeExpand = () => {
    let runTimeMode = !expandRuntimeTemplate;
    setExpandRuntimeTemplate(runTimeMode);
  };

  useEffect(() => {
    if (loginState) {
      fetchProjectRegion();
      projectListAPI();
      displayUserInfo();
    } else {
      projectListAPI();
      displayUserInfo();
    }
  }, []);
  return (
    <div>
      <ToastContainer />
      {isLoadingUser && isLoadingProject && isLoadingRegion && !configError ? (
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
          runtimeTemplateSelected={runtimeTemplateSelected}
          setOpenCreateTemplate={setOpenCreateTemplate}
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
                <label className="project-text" htmlFor="project-id">
                  Project ID
                </label>
                <Select
                  search
                  placeholder={projectId}
                  className="project-select"
                  value={projectId}
                  onChange={handleProjectIdChange}
                  options={projectList}
                />
              </div>

              <div className="region-overlay">
                <label className="region-text" htmlFor="region-id">
                  Region
                </label>

                <Select
                  search
                  onClick={handleDropdownOpen}
                  placeholder={region}
                  className="region-select"
                  value={region}
                  onChange={handleRegionChange}
                  options={regionList}
                  isDisabled={isDropdownOpen}
                />
              </div>
              <div className="save-overlay">
                <button
                  className={
                    isSaveDisabled ? 'save-button disabled' : 'save-button'
                  }
                  disabled={isSaveDisabled}
                  onClick={handleSave}
                >
                  Save
                </button>
                {isLoading && (
                  <div className="save-loader">
                    <ClipLoader
                      loading={true}
                      size={25}
                      aria-label="Loading Spinner"
                      data-testid="loader"
                    />
                  </div>
                )}
              </div>
            </div>
            {isDropdownOpen && (
              <div className="region-loader">
                <ClipLoader
                  loading={true}
                  size={15}
                  aria-label="Loading Spinner"
                  data-testid="loader"
                />
              </div>
            )}
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
                Serverless Runtime configurations
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
                setRuntimeTemplateSelected={setRuntimeTemplateSelected}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ConfigSelection;
