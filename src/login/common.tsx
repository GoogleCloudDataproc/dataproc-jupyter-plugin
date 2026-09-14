import React, { useState, useEffect } from 'react';
import { LabIcon } from '@jupyterlab/ui-components';
import googleCloudIcon from '../../style/icons/google-cloud.svg';
import helpIcon from '../../style/icons/help_icon.svg';
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  PLUGIN_ID,
  USER_INFO_URL,
  VERSION_DETAIL
} from '../utils/const';
import { IAuthCredentials, authApi, loggedFetch } from '../utils/utils';
import { IThemeManager, Notification } from '@jupyterlab/apputils';
import THIRD_PARTY_LICENSES from '../../third-party-licenses.txt';
import { Button, CircularProgress } from '@mui/material';
import { RegionDropdown } from '../controls/RegionDropdown';
import { projectListAPI } from '../utils/projectService';
import { DynamicDropdown } from '../controls/DynamicDropdown';
import { JupyterLab } from '@jupyterlab/application';
import { ILauncher } from '@jupyterlab/launcher';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { BigQueryRegionDropdown } from '../controls/BigQueryRegionDropdown';
import { eventEmitter } from '../utils/signalEmitter';
import { requestAPI } from '../handler/handler';

interface ICommonProps {
  configError: boolean;
  setConfigError: (error: boolean) => void;
  app?: JupyterLab;
  launcher?: ILauncher;
  settingRegistry?: ISettingRegistry;
  themeManager: IThemeManager;
}

export default function Common({
  configError,
  setConfigError,
  app,
  launcher,
  settingRegistry,
  themeManager
}: ICommonProps) {
  const [bigQueryFeatureEnable, setbigQueryFeatureEnable] = useState(false);
  const [isProjectIdEditable, setIsProjectIdEditable] = useState(true);
  const [projectId, setProjectId] = useState('');
  const [region, setRegion] = useState('');
  const [bigQueryRegion, setBigQueryRegion] = useState<any>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userInfo, setUserInfo] = useState({ email: '', picture: '' });

  const IconGoogleCloud = new LabIcon({ name: 'launcher:google_cloud_icon', svgstr: googleCloudIcon });
  const iconHelp = new LabIcon({ name: 'launcher:help-spark-icon', svgstr: helpIcon });

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
        if (configStatus) {
          if (configStatus.includes('Failed')) {
            Notification.emit(configStatus, 'error', { autoClose: 5000 });
          } else {
            if (bigQueryFeatureEnable) {
              const settings = await settingRegistry?.load(PLUGIN_ID);
              settings?.set('bqRegion', bigQueryRegion);
            }
            Notification.emit(
              `${configStatus} - You will need to restart Jupyter in order for the new project and region to fully take effect.`,
              'success',
              { autoClose: 5000 }
            );
            eventEmitter.emit('dataprocConfigChange', `${configStatus} - Configuration updated successfully.`);
            window.location.reload();
          }
        }
      }
    } catch (reason) {
      Notification.emit(`Error on POST {dataToSend}.\n${reason}`, 'error', { autoClose: 5000 });
      DataprocLoggingService.log(`Error on POST {dataToSend}.\n${reason}`, LOG_LEVEL.ERROR);
    } finally {
      setIsSaving(false);
    }
  };

  const displayUserInfo = async (credentials: IAuthCredentials | undefined) => {
    if (credentials) {
      loggedFetch(USER_INFO_URL, {
        method: 'GET',
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token
        }
      })
        .then((response: Response) => response.json().then((res: any) => {
          if (res?.error?.code && !credentials?.login_error && !credentials?.config_error) {
            Notification.emit(res?.error?.message, 'error', { autoClose: 5000 });
          } else {
            setUserInfo(res);
            setIsLoadingUser(false);
          }
        }))
        .catch((err: Error) => {
          setIsLoadingUser(false);
          Notification.emit(`Failed to fetch user information : ${err}`, 'error', { autoClose: 5000 });
        });
    }
  };

  const handleLicenseClick = async () => {
    const licenseWindow = window.open('about:blank');
    if (licenseWindow) {
      const preEle = licenseWindow.document.createElement('pre');
      preEle.textContent = THIRD_PARTY_LICENSES;
      licenseWindow.document.body.appendChild(preEle);
    }
  };

  useEffect(() => {
    const init = async () => {
      const settings = await settingRegistry?.load(PLUGIN_ID);
      setBigQueryRegion(settings?.get('bqRegion')?.['composite']);
      const bqFeature: any = await requestAPI('settings');
      if (bqFeature.enable_bigquery_integration) setbigQueryFeatureEnable(true);
      if (bqFeature.kernel_gateway_project_number) setIsProjectIdEditable(false);
    };
    init();

    authApi().then(credentials => {
      displayUserInfo(credentials);
      if (credentials) {
        if (credentials.project_id) setProjectId(credentials.project_id);
        if (credentials.region_id) setRegion(credentials.region_id);
        setConfigError(!!(credentials.config_error || credentials.login_error));
      }
    });
  }, []);

  if (isLoadingUser && !configError) {
    return (
      <div className="spin-loader-main">
        <CircularProgress className="spin-loader-custom-style" size={20} />
        Loading Config Setup
      </div>
    );
  }

  return (
    <div className="settings-component">
      <div className="settings-overlay">
        <div><IconGoogleCloud.react tag="div" className="logo-alignment-style" /></div>
        <div className="settings-text">Settings</div>
      </div>
      <div className="settings-separator"></div>
      <div className="project-header">Google Cloud Project Settings </div>
      <div className="config-overlay">
        <div className="config-form">
          <div className="project-overlay">
            <DynamicDropdown
              value={projectId ?? ''}
              onChange={(_, projectId) => setProjectId(projectId ?? '')}
              fetchFunc={projectListAPI}
              label="Project ID*"
              disabled={!isProjectIdEditable}
              sx={{ '& .MuiAutocomplete-clearIndicator': { visibility: 'visible' } }}
              popupIcon={null}
            />
            {!isProjectIdEditable && (
              <div className="info-icon-container" title="Project Id is set at Jupyter Lab startup">
                <div className="info-icon"><iconHelp.react tag="div" className="logo-alignment-style" /></div>
              </div>
            )}
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
              <div className="bigquery-region-header">BigQuery Settings </div>
              <div className="region-overlay">
                <BigQueryRegionDropdown
                  projectId={projectId}
                  region={bigQueryRegion}
                  onRegionChange={bigQueryRegion => setBigQueryRegion(bigQueryRegion)}
                />
              </div>
            </>
          )}
          <div className="save-overlay">
            <Button
              variant="contained"
              disabled={isSaving || projectId.length === 0 || region.length === 0}
              onClick={handleSave}
            >
              {isSaving ? 'Saving' : 'Save'}
            </Button>
          </div>
        </div>
        <div className="user-info-card">
          <div className="user-overlay">
            <div className="user-image-overlay">
              {userInfo.picture && <img src={userInfo.picture} alt="User" className="user-image" />}
            </div>
            <div className="user-details"><div className="user-email">{userInfo.email}</div></div>
          </div>
          <div className="separator"></div>
          <div className="google-header">
            <a href="https://policies.google.com/privacy?hl=en" target="_blank" rel="noreferrer">Privacy Policy</a>
            <span className="privacy-terms"> &bull; </span>
            <a href="https://policies.google.com/terms?hl=en" target="_blank" rel="noreferrer">Terms of Service</a>
            <span className="footer-divider"> &bull; </span>
            <a onClick={handleLicenseClick} href="#">Licenses</a>
          </div>
          <div className="feedback-version-container">
            <div className="google-header">
              <a className="feedback-container" href="https://forms.gle/wnEnH3fL4JRjPwbr7" target="_blank" rel="noreferrer">Provide Feedback</a>
              <span className="privacy-terms"> &bull; </span>
              <a href="https://github.com/GoogleCloudDataproc/dataproc-jupyter-plugin" target="_blank" rel="noreferrer">Version {VERSION_DETAIL}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
