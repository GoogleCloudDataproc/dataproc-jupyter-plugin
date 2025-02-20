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
import React, { useEffect, useState } from 'react';
import { Input } from '../controls/MuiWrappedInput';
import {
  Autocomplete,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormGroup,
  Radio,
  RadioGroup,
  TextField,
  Typography
} from '@mui/material';
import { MuiChipsInput } from 'mui-chips-input';
import { IThemeManager } from '@jupyterlab/apputils';
import { JupyterLab } from '@jupyterlab/application';
import LabelProperties from '../jobs/labelProperties';
import { v4 as uuidv4 } from 'uuid';
import { Cron } from 'react-js-cron';
import 'react-js-cron/dist/styles.css';
import { KernelSpecAPI } from '@jupyterlab/services';
import tzdata from 'tzdata';
import { SchedulerService } from './schedulerServices';
import NotebookJobComponent from './notebookJobs';
import LeftArrowIcon from '../../style/icons/left_arrow_icon.svg';
import { LabIcon } from '@jupyterlab/ui-components';
import errorIcon from '../../style/icons/error_icon.svg';
import { Button } from '@mui/material';
import { scheduleMode } from '../utils/const';
import { scheduleValueExpression } from '../utils/const';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { extractUrl } from '../utils/utils';

interface IDagList {
  jobid: string;
  notebookname: string;
  schedule: string;
  scheduleInterval: string;
}

const iconLeftArrow = new LabIcon({
  name: 'launcher:left-arrow-icon',
  svgstr: LeftArrowIcon
});

const iconError = new LabIcon({
  name: 'launcher:error-icon',
  svgstr: errorIcon
});

const CreateNotebookScheduler = ({
  themeManager,
  app,
  context,
  settingRegistry
}: {
  themeManager: IThemeManager;
  app: JupyterLab;
  context: any;
  settingRegistry: ISettingRegistry;
}): JSX.Element => {
  const [jobNameSelected, setJobNameSelected] = useState('');
  const [inputFileSelected, setInputFileSelected] = useState('');
  const [composerList, setComposerList] = useState<string[]>([]);
  const [composerSelected, setComposerSelected] = useState('');

  const [parameterDetail, setParameterDetail] = useState(['']);
  const [parameterDetailUpdated, setParameterDetailUpdated] = useState(['']);
  const [keyValidation, setKeyValidation] = useState(-1);
  const [valueValidation, setValueValidation] = useState(-1);
  const [duplicateKeyError, setDuplicateKeyError] = useState(-1);

  const [selectedMode, setSelectedMode] = useState('cluster');
  const [clusterList, setClusterList] = useState<string[]>([]);
  const [serverlessList, setServerlessList] = useState<string[]>([]);
  const [serverlessDataList, setServerlessDataList] = useState<string[]>([]);
  const [clusterSelected, setClusterSelected] = useState('');
  const [serverlessSelected, setServerlessSelected] = useState('');
  const [serverlessDataSelected, setServerlessDataSelected] = useState({});
  const [stopCluster, setStopCluster] = useState(false);

  const [retryCount, setRetryCount] = useState<number | undefined>(2);
  const [retryDelay, setRetryDelay] = useState<number | undefined>(5);
  const [emailOnFailure, setEmailOnFailure] = useState(false);
  const [emailOnRetry, setEmailonRetry] = useState(false);
  const [emailOnSuccess, setEmailOnSuccess] = useState(false);
  const [emailList, setEmailList] = useState<string[]>([]);

  const [scheduleMode, setScheduleMode] = useState<scheduleMode>('runNow');
  const [scheduleValue, setScheduleValue] = useState(scheduleValueExpression);
  const [timeZoneSelected, setTimeZoneSelected] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  const timezones = Object.keys(tzdata.zones).sort();

  const [createCompleted, setCreateCompleted] =
    context !== '' ? useState(false) : useState(true);
  const [creatingScheduler, setCreatingScheduler] = useState(false);
  const [jobNameValidation, setJobNameValidation] = useState(true);
  const [jobNameSpecialValidation, setJobNameSpecialValidation] =
    useState(false);
  const [jobNameUniqueValidation, setJobNameUniqueValidation] = useState(true);
  const [dagList, setDagList] = useState<IDagList[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [dagListCall, setDagListCall] = useState(false);
  const [isLoadingKernelDetail, setIsLoadingKernelDetail] = useState(false);

  const [isBigQueryNotebook, setIsBigQueryNotebook] = useState(false);

  const [isApiError, setIsApiError] = useState(false);
  const [apiError, setApiError] = useState('');

  const listClustersAPI = async () => {
    await SchedulerService.listClustersAPIService(
      setClusterList,
      setIsLoadingKernelDetail
    );
  };

  const listSessionTemplatesAPI = async () => {
    await SchedulerService.listSessionTemplatesAPIService(
      setServerlessDataList,
      setServerlessList,
      setIsLoadingKernelDetail
    );
  };

  const listComposersAPI = async () => {
    await SchedulerService.listComposersAPIService(
      setComposerList,
      setIsApiError,
      setApiError
    );
  };

  const handleComposerSelected = (data: string | null) => {
    if (data) {
      const selectedComposer = data.toString();
      setComposerSelected(selectedComposer);
      if (selectedComposer) {
        const unique = getDaglist(selectedComposer);
        if (!unique) {
          setJobNameUniqueValidation(true);
        }
      }
    }
  };
  const getDaglist = async (composer: string) => {
    setDagListCall(true);
    try {
      await SchedulerService.listDagInfoAPIServiceForCreateNotebook(
        setDagList,
        composer
      );
      setDagListCall(false);
      return true;
    } catch (error) {
      setDagListCall(false);
      console.error('Error checking job name uniqueness:', error);
      return false;
    }
  };

  const handleSelectedModeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSelectedMode((event.target as HTMLInputElement).value);
  };

  const handleSchedulerModeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = (event.target as HTMLInputElement).value;
    setScheduleMode(newValue as scheduleMode);
    if (newValue === 'runSchedule' && scheduleValue === '') {
      setScheduleValue(scheduleValueExpression);
    }
  };

  const handleClusterSelected = (data: string | null) => {
    if (data) {
      const selectedCluster = data.toString();
      setClusterSelected(selectedCluster);
    }
  };

  const handleTimeZoneSelected = (data: string | null) => {
    if (data) {
      const selectedTimeZone = data.toString();
      setTimeZoneSelected(selectedTimeZone);
    }
  };

  const handleServerlessSelected = (data: string | null) => {
    if (data) {
      const selectedServerless = data.toString();
      const selectedData: any = serverlessDataList.filter((serverless: any) => {
        return serverless.serverlessName === selectedServerless;
      });
      setServerlessDataSelected(selectedData[0].serverlessData);
      setServerlessSelected(selectedServerless);
    }
  };

  const handleStopCluster = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStopCluster(event.target.checked);
  };

  const handleRetryCount = (data: number) => {
    if (data >= 0) {
      setRetryCount(data);
    }
  };

  const handleRetryDelay = (data: number) => {
    if (data >= 0) {
      setRetryDelay(data);
    }
  };

  const handleFailureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmailOnFailure(event.target.checked);
  };

  const handleRetryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmailonRetry(event.target.checked);
  };

  const handleSuccessChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmailOnSuccess(event.target.checked);
  };

  const handleEmailList = (data: string[]) => {
    setEmailList(data);
  };

  const handleCreateJobScheduler = async () => {
    let outputFormats = [];
    outputFormats.push('ipynb');

    let randomDagId = uuidv4();

    const payload = {
      input_filename: inputFileSelected,
      composer_environment_name: composerSelected,
      output_formats: outputFormats,
      parameters: parameterDetailUpdated,
      mode_selected: selectedMode,
      retry_count: retryCount,
      retry_delay: retryDelay,
      email_failure: emailOnFailure,
      email_delay: emailOnRetry,
      email_success: emailOnSuccess,
      email: emailList,
      name: jobNameSelected,
      schedule_value: scheduleMode === 'runNow' ? '' : scheduleValue,
      stop_cluster: stopCluster,
      dag_id: randomDagId,
      time_zone: scheduleMode !== 'runNow' ? timeZoneSelected : '',
      [selectedMode === 'cluster' ? 'cluster_name' : 'serverless_name']:
        selectedMode === 'cluster' ? clusterSelected : serverlessDataSelected
    };

    await SchedulerService.createJobSchedulerService(
      payload,
      app,
      setCreateCompleted,
      setCreatingScheduler,
      editMode
    );
    setEditMode(false);
  };

  const handleJobNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.target.value.length > 0
      ? setJobNameValidation(true)
      : setJobNameValidation(false);

    //Regex to check job name must contain only letters, numbers, hyphens, and underscores
    const regexp = /^[a-zA-Z0-9-_]+$/;
    event.target.value.search(regexp)
      ? setJobNameSpecialValidation(true)
      : setJobNameSpecialValidation(false);
    setJobNameSelected(event.target.value);

    setJobNameSelected(event.target.value);
  };

  const isSaveDisabled = () => {
    return (
      dagListCall ||
      creatingScheduler ||
      jobNameSelected === '' ||
      (!jobNameValidation && !editMode) ||
      (jobNameSpecialValidation && !editMode) ||
      (!jobNameUniqueValidation && !editMode) ||
      inputFileSelected === '' ||
      composerSelected === '' ||
      (selectedMode === 'cluster' && clusterSelected === '') ||
      (selectedMode === 'serverless' && serverlessSelected === '') ||
      ((emailOnFailure || emailOnRetry || emailOnSuccess) &&
        emailList.length === 0)
    );
  };

  const handleCancel = async () => {
    if (!editMode) {
      setCreateCompleted(false);
      app.shell.activeWidget?.close();
    } else {
      setCreateCompleted(true);
    }
  };

  const getKernelDetail = async () => {
    const kernelSpecs: any = await KernelSpecAPI.getSpecs();
    const kernels = kernelSpecs.kernelspecs;

    if (kernels && context.sessionContext.kernelPreference.name) {
      if (
        kernels[context.sessionContext.kernelPreference.name].resources
          .endpointParentResource
      ) {
        if (
          kernels[
            context.sessionContext.kernelPreference.name
          ].resources.endpointParentResource.includes('/sessions')
        ) {
          const selectedData: any = serverlessDataList.filter(
            (serverless: any) => {
              return context.sessionContext.kernelDisplayName.includes(
                serverless.serverlessName
              );
            }
          );
          if (selectedData.length > 0) {
            setServerlessDataSelected(selectedData[0].serverlessData);
            setServerlessSelected(selectedData[0].serverlessName);
          } else {
            setServerlessDataSelected({});
            setServerlessSelected('');
          }
        } else {
          const selectedData: any = clusterList.filter((cluster: string) => {
            return context.sessionContext.kernelDisplayName.includes(cluster);
          });
          if (selectedData.length > 0) {
            setClusterSelected(selectedData[0]);
          } else {
            setClusterSelected('');
          }
        }
      }
    }
  };

  const extractLink = (message: string) => {
    const url = extractUrl();
    if (!url) return message;
    const beforeLink = message.split('Click here ')[0] || '';
    return (
      <>
        {beforeLink}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'blue', textDecoration: 'underline' }}
        >
          Click here
        </a>{' '}
        to enable it.
      </>
    );
  };

  useEffect(() => {
    listComposersAPI();

    if (context !== '') {
      setInputFileSelected(context.path);
      if (context.path.toLowerCase().startsWith('bigframes')) {
        setIsBigQueryNotebook(true);
        setSelectedMode('serverless');
      }
    }
    setJobNameSelected('');
    if (!editMode) {
      setParameterDetail([]);
      setParameterDetailUpdated([]);
    }
  }, []);

  useEffect(() => {
    if (composerSelected !== '' && dagList.length > 0) {
      const isUnique = !dagList.some(
        dag => dag.notebookname === jobNameSelected
      );
      setJobNameUniqueValidation(isUnique);
    }
  }, [dagList, jobNameSelected, composerSelected]);

  useEffect(() => {
    if (context !== '') {
      getKernelDetail();
    }
  }, [serverlessDataList, clusterList]);

  useEffect(() => {
    if (selectedMode === 'cluster') {
      listClustersAPI();
    } else {
      listSessionTemplatesAPI();
    }
  }, [selectedMode]);

  return (
    <>
      {createCompleted ? (
        <NotebookJobComponent
          app={app}
          themeManager={themeManager}
          settingRegistry={settingRegistry}
          composerSelectedFromCreate={composerSelected}
          setCreateCompleted={setCreateCompleted}
          setJobNameSelected={setJobNameSelected}
          setComposerSelected={setComposerSelected}
          setScheduleMode={setScheduleMode}
          setScheduleValue={setScheduleValue}
          setInputFileSelected={setInputFileSelected}
          setParameterDetail={setParameterDetail}
          setParameterDetailUpdated={setParameterDetailUpdated}
          setSelectedMode={setSelectedMode}
          setClusterSelected={setClusterSelected}
          setServerlessSelected={setServerlessSelected}
          setServerlessDataSelected={setServerlessDataSelected}
          serverlessDataList={serverlessDataList}
          setServerlessDataList={setServerlessDataList}
          setServerlessList={setServerlessList}
          setRetryCount={setRetryCount}
          setRetryDelay={setRetryDelay}
          setEmailOnFailure={setEmailOnFailure}
          setEmailonRetry={setEmailonRetry}
          setEmailOnSuccess={setEmailOnSuccess}
          setEmailList={setEmailList}
          setStopCluster={setStopCluster}
          setTimeZoneSelected={setTimeZoneSelected}
          setEditMode={setEditMode}
          setIsLoadingKernelDetail={setIsLoadingKernelDetail}
        />
      ) : (
        <div>
          <div className="cluster-details-header">
            <div
              role="button"
              className="back-arrow-icon"
              onClick={handleCancel}
            >
              <iconLeftArrow.react
                tag="div"
                className="icon-white logo-alignment-style"
              />
            </div>
            {editMode ? (
              <div className="create-job-scheduler-title">
                Update A Scheduled Job
              </div>
            ) : (
              <div className="create-job-scheduler-title">
                Create A Scheduled Job
              </div>
            )}
          </div>
          <div className="submit-job-container">
            <div className="create-scheduler-form-element">
              <Input
                className="create-scheduler-style"
                value={jobNameSelected}
                onChange={e => handleJobNameChange(e)}
                type="text"
                placeholder=""
                Label="Job name*"
                disabled={editMode}
              />
            </div>
            {!jobNameValidation && !editMode && (
              <div className="error-key-parent">
                <iconError.react tag="div" className="logo-alignment-style" />
                <div className="error-key-missing">Name is required</div>
              </div>
            )}
            {jobNameSpecialValidation && jobNameValidation && !editMode && (
              <div className="error-key-parent">
                <iconError.react tag="div" className="logo-alignment-style" />
                <div className="error-key-missing">
                  Name must contain only letters, numbers, hyphens, and
                  underscores
                </div>
              </div>
            )}
            {!jobNameUniqueValidation && !editMode && (
              <div className="error-key-parent">
                <iconError.react tag="div" className="logo-alignment-style" />
                <div className="error-key-missing">
                  Job name must be unique for the selected environment
                </div>
              </div>
            )}

            <div className="create-scheduler-form-element-input-file">
              <Input
                className="create-scheduler-style"
                value={inputFileSelected}
                Label="Input file*"
                disabled={true}
              />
            </div>
            <div className="create-scheduler-form-element">
              <Autocomplete
                className="create-scheduler-style"
                options={composerList}
                value={composerSelected}
                onChange={(_event, val) => handleComposerSelected(val)}
                renderInput={params => (
                  <TextField {...params} label="Environment*" />
                )}
                disabled={editMode}
              />
            </div>
            {isApiError && (
              <div className="error-key-parent">
                <iconError.react tag="div" className="logo-alignment-style" />
                <div className="error-key-missing">{extractLink(apiError)}</div>
              </div>
            )}
            <div className="create-scheduler-label">Output formats</div>
            <div className="create-scheduler-form-element">
              <FormGroup row={true}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      readOnly
                      checked={true}
                      defaultChecked={true}
                    />
                  }
                  className="create-scheduler-label-style"
                  label={
                    <Typography sx={{ fontSize: 13 }}>Notebook</Typography>
                  }
                />
              </FormGroup>
            </div>
            <div className="create-scheduler-label">Parameters</div>
            <>
              <LabelProperties
                labelDetail={parameterDetail}
                setLabelDetail={setParameterDetail}
                labelDetailUpdated={parameterDetailUpdated}
                setLabelDetailUpdated={setParameterDetailUpdated}
                buttonText="ADD PARAMETER"
                keyValidation={keyValidation}
                setKeyValidation={setKeyValidation}
                valueValidation={valueValidation}
                setValueValidation={setValueValidation}
                duplicateKeyError={duplicateKeyError}
                setDuplicateKeyError={setDuplicateKeyError}
                fromPage="scheduler"
              />
            </>
            {!isBigQueryNotebook && (
              <div className="create-scheduler-form-element">
                <FormControl>
                  <RadioGroup
                    aria-labelledby="demo-controlled-radio-buttons-group"
                    name="controlled-radio-buttons-group"
                    value={selectedMode}
                    onChange={handleSelectedModeChange}
                    row={true}
                  >
                    <FormControlLabel
                      value="cluster"
                      control={<Radio size="small" />}
                      label={
                        <Typography sx={{ fontSize: 13 }}>Cluster</Typography>
                      }
                    />
                    <FormControlLabel
                      value="serverless"
                      className="create-scheduler-label-style"
                      control={<Radio size="small" />}
                      label={
                        <Typography sx={{ fontSize: 13 }}>
                          Serverless
                        </Typography>
                      }
                    />
                  </RadioGroup>
                </FormControl>
              </div>
            )}
            <div className="create-scheduler-form-element">
              {isLoadingKernelDetail && (
                <CircularProgress
                  size={18}
                  aria-label="Loading Spinner"
                  data-testid="loader"
                />
              )}
              {!isBigQueryNotebook &&
                selectedMode === 'cluster' &&
                !isLoadingKernelDetail && (
                  <Autocomplete
                    className="create-scheduler-style"
                    options={clusterList}
                    value={clusterSelected}
                    onChange={(_event, val) => handleClusterSelected(val)}
                    renderInput={params => (
                      <TextField {...params} label="Cluster*" />
                    )}
                  />
                )}
              {selectedMode === 'serverless' && !isLoadingKernelDetail && (
                <Autocomplete
                  className="create-scheduler-style"
                  options={serverlessList}
                  value={serverlessSelected}
                  onChange={(_event, val) => handleServerlessSelected(val)}
                  renderInput={params => (
                    <TextField {...params} label="Serverless*" />
                  )}
                />
              )}
            </div>
            {!isBigQueryNotebook && selectedMode === 'cluster' && (
              <div className="create-scheduler-form-element">
                <FormGroup row={true}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={stopCluster}
                        onChange={handleStopCluster}
                      />
                    }
                    className="create-scheduler-label-style"
                    label={
                      <Typography
                        sx={{ fontSize: 13 }}
                        title="Stopping cluster abruptly will impact if any other job is running on the cluster at the moment"
                      >
                        Stop the cluster after notebook execution
                      </Typography>
                    }
                  />
                </FormGroup>
              </div>
            )}
            <div className="create-scheduler-form-element">
              <Input
                className="create-scheduler-style"
                onChange={e => handleRetryCount(Number(e.target.value))}
                value={retryCount}
                Label="Retry count"
                type="number"
              />
            </div>
            <div className="create-scheduler-form-element">
              <Input
                className="create-scheduler-style"
                onChange={e => handleRetryDelay(Number(e.target.value))}
                value={retryDelay}
                Label="Retry delay (minutes)"
                type="number"
              />
            </div>
            <div className="create-scheduler-form-element">
              <FormGroup row={true}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={emailOnFailure}
                      onChange={handleFailureChange}
                    />
                  }
                  className="create-scheduler-label-style"
                  label={
                    <Typography sx={{ fontSize: 13 }}>
                      Email on failure
                    </Typography>
                  }
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={emailOnRetry}
                      onChange={handleRetryChange}
                    />
                  }
                  className="create-scheduler-label-style"
                  label={
                    <Typography sx={{ fontSize: 13 }}>
                      Email on retry
                    </Typography>
                  }
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={emailOnSuccess}
                      onChange={handleSuccessChange}
                    />
                  }
                  className="create-scheduler-label-style"
                  label={
                    <Typography sx={{ fontSize: 13 }}>
                      Email on success
                    </Typography>
                  }
                />
              </FormGroup>
            </div>
            <div className="create-scheduler-form-element">
              {(emailOnFailure || emailOnRetry || emailOnSuccess) && (
                <MuiChipsInput
                  className="select-job-style"
                  onChange={e => handleEmailList(e)}
                  addOnBlur={true}
                  value={emailList}
                  inputProps={{ placeholder: '' }}
                  label="Email recipients"
                />
              )}
            </div>
            {(emailOnFailure || emailOnRetry || emailOnSuccess) &&
              !emailList.length && (
                <div className="error-key-parent">
                  <iconError.react tag="div" className="logo-alignment-style" />
                  <div className="error-key-missing">
                    Email recipients is required field
                  </div>
                </div>
              )}
            <div className="create-scheduler-label">Schedule</div>
            <div className="create-scheduler-form-element">
              <FormControl>
                <RadioGroup
                  aria-labelledby="demo-controlled-radio-buttons-group"
                  name="controlled-radio-buttons-group"
                  value={scheduleMode}
                  onChange={handleSchedulerModeChange}
                >
                  <FormControlLabel
                    value="runNow"
                    className="create-scheduler-label-style"
                    control={<Radio size="small" />}
                    label={
                      <Typography sx={{ fontSize: 13 }}>Run now</Typography>
                    }
                  />
                  <FormControlLabel
                    value="runSchedule"
                    className="create-scheduler-label-style"
                    control={<Radio size="small" />}
                    label={
                      <Typography sx={{ fontSize: 13 }}>
                        Run on a schedule
                      </Typography>
                    }
                  />
                </RadioGroup>
              </FormControl>
            </div>
            {scheduleMode === 'runSchedule' && (
              <>
                <div className="create-scheduler-form-element">
                  <Cron value={scheduleValue} setValue={setScheduleValue} />
                </div>
                <div className="create-scheduler-form-element">
                  <Autocomplete
                    className="create-scheduler-style"
                    options={timezones}
                    value={timeZoneSelected}
                    onChange={(_event, val) => handleTimeZoneSelected(val)}
                    renderInput={params => (
                      <TextField {...params} label="Time Zone" />
                    )}
                  />
                </div>
              </>
            )}
            <div className="save-overlay">
              <Button
                onClick={() => {
                  if (!isSaveDisabled()) {
                    handleCreateJobScheduler();
                  }
                }}
                variant="contained"
                disabled={isSaveDisabled()}
                aria-label={editMode ? ' Update Schedule' : 'Create Schedule'}
              >
                <div>
                  {editMode
                    ? creatingScheduler
                      ? 'UPDATING'
                      : 'UPDATE'
                    : creatingScheduler
                    ? 'CREATING'
                    : 'CREATE'}
                </div>
              </Button>
              <Button
                variant="outlined"
                disabled={creatingScheduler}
                aria-label="cancel Batch"
                onClick={!creatingScheduler ? handleCancel : undefined}
              >
                <div>CANCEL</div>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateNotebookScheduler;
