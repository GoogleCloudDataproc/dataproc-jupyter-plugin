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
import React, { useEffect, useMemo, useState } from 'react';
import { Input } from '../controls/MuiWrappedInput';
import {
  Autocomplete,
  Checkbox,
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
import EditIcon from '../../style/icons/edit_icon_disable.svg';

const iconLeftArrow = new LabIcon({
  name: 'launcher:left-arrow-icon',
  svgstr: LeftArrowIcon
});

const iconError = new LabIcon({
  name: 'launcher:error-icon',
  svgstr: errorIcon
});
const iconEdit = new LabIcon({
  name: 'launcher:edit-disable-icon',
  svgstr: EditIcon
});

const CreateNotebookScheduler = ({
  themeManager,
  app,
  context
}: {
  themeManager: IThemeManager;
  app: JupyterLab;
  context: any;
}): JSX.Element => {
  const [jobNameSelected, setJobNameSelected] = useState('');
  const [inputFileSelected, setInputFileSelected] = useState('');
  const [composerList, setComposerList] = useState<string[]>([]);
  const [composerSelected, setComposerSelected] = useState('');
  // const [outputNotebook, setOutputNotebook] = useState(true);
  // const [outputHtml, setOutputHtml] = useState(true);

  const [parameterDetail, setParameterDetail] = useState(['']);
  const [parameterDetailUpdated, setParameterDetailUpdated] = useState(['']);
  console.log(parameterDetail, parameterDetailUpdated);
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

  const [scheduleMode, setScheduleMode] = useState('runNow');
  const [scheduleValue, setScheduleValue] = useState('30 17 * * 1-5');
  const [timeZoneSelected, setTimeZoneSelected] = useState('UTC');

  const timezones = useMemo(() => Object.keys(tzdata.zones).sort(), []);

  const [createCompleted, setCreateCompleted] =
    context !== '' ? useState(false) : useState(true);
  const [creatingScheduler, setCreatingScheduler] = useState(false);
  const [jobNameValidation, setJobNameValidation] = useState(true);
  const [jobNameSpecialValidation, setJobNameSpecialValidation] =
    useState(false);
  const listClustersAPI = async () => {
    await SchedulerService.listClustersAPIService(setClusterList);
  };

  const listSessionTemplatesAPI = async () => {
    await SchedulerService.listSessionTemplatesAPIService(
      setServerlessDataList,
      setServerlessList
    );
  };

  const listComposersAPI = async () => {
    await SchedulerService.listComposersAPIService(setComposerList);
  };

  const handleComposerSelected = (data: string | null) => {
    if (data) {
      const selectedComposer = data.toString();
      setComposerSelected(selectedComposer);
    }
  };

  // const handleOutputNotebookChange = (
  //   event: React.ChangeEvent<HTMLInputElement>
  // ) => {
  //   setOutputNotebook(event.target.checked);
  // };

  // const handleOutputHtmlChange = (
  //   event: React.ChangeEvent<HTMLInputElement>
  // ) => {
  //   setOutputHtml(event.target.checked);
  // };

  const handleSelectedModeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSelectedMode((event.target as HTMLInputElement).value);
  };

  const handleSchedulerModeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setScheduleMode((event.target as HTMLInputElement).value);
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
    // if (outputNotebook) {
    outputFormats.push('ipynb');
    // }
    // if (outputHtml) {
    //   outputFormats.push('html');
    // }

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
      setCreatingScheduler
    );
  };

  const handleJobNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.target.value.length > 0
      ? setJobNameValidation(true)
      : setJobNameValidation(false);

    const regexp = /^[a-zA-Z0-9-_]+$/;
    event.target.value.search(regexp)
      ? setJobNameSpecialValidation(true)
      : setJobNameSpecialValidation(false);
    setJobNameSelected(event.target.value);
  };

  const isSaveDisabled = () => {
    return (
      creatingScheduler ||
      jobNameSelected === '' ||
      !jobNameValidation ||
      jobNameSpecialValidation ||
      inputFileSelected === '' ||
      composerSelected === '' ||
      (selectedMode === 'cluster' && clusterSelected === '') ||
      (selectedMode === 'serverless' && serverlessSelected === '') ||
      ((emailOnFailure || emailOnRetry || emailOnSuccess) &&
        emailList.length === 0)
    );
  };

  const handleCancel = async () => {
    app.shell.activeWidget?.close();
  };

  const getKernelDetail = async () => {
    const kernelSpecs: any = await KernelSpecAPI.getSpecs();
    const kernels = kernelSpecs.kernelspecs;
    if (
      kernels &&
      context.sessionContext.kernelPreference.name &&
      clusterList.length > 0 &&
      serverlessDataList.length > 0
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
        setServerlessDataSelected(selectedData[0].serverlessData);
        setServerlessSelected(selectedData[0].serverlessName);
      } else {
        const selectedData: any = clusterList.filter((cluster: string) => {
          return context.sessionContext.kernelDisplayName.includes(cluster);
        });
        setClusterSelected(selectedData[0]);
      }
    }
  };

  const handleEditNotebookData = async () => {
    let filePath = inputFileSelected.replace('gs://', 'gs:');
    app.commands.execute('docmanager:open', {
      path: filePath
    });
  };

  useEffect(() => {
    listComposersAPI();
    listClustersAPI();
    listSessionTemplatesAPI();
    console.log(context);
    if (context !== '') {
      setInputFileSelected(context.path);
    }
    setJobNameSelected('');
  }, []);

  useEffect(() => {
    console.log(context);
    if (context !== '') {
      getKernelDetail();
    }
  }, [serverlessDataList]);

  return (
    <>
      {createCompleted ? (
        <NotebookJobComponent
          app={app}
          themeManager={themeManager}
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
            <div className="create-job-scheduler-title">
              Create Job Scheduler
            </div>
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
              />
            </div>
            {!jobNameValidation && (
              <div className="error-key-parent">
                <iconError.react tag="div" className="logo-alignment-style" />
                <div className="error-key-missing">Name is required</div>
              </div>
            )}
            {jobNameSpecialValidation && jobNameValidation && (
              <div className="error-key-parent">
                <iconError.react tag="div" className="logo-alignment-style" />
                <div className="error-key-missing">
                  Name must contain only letters, numbers, hyphens, and
                  underscores
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
              {inputFileSelected.includes('gs://') && (
                <div
                  role="button"
                  className="edit-notebook-style"
                  title="Edit Notebook"
                  onClick={handleEditNotebookData}
                >
                  <iconEdit.react
                    tag="div"
                    className="icon-white logo-alignment-style"
                  />
                </div>
              )}
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
              />
            </div>
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
                      // onChange={handleOutputNotebookChange}
                    />
                  }
                  className="create-scheduler-label-style"
                  label={
                    <Typography sx={{ fontSize: 13 }}>Notebook</Typography>
                  }
                />
                {/* <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={outputHtml}
                      onChange={handleOutputHtmlChange}
                    />
                  }
                  className="create-scheduler-label-style"
                  label={<Typography sx={{ fontSize: 13 }}>HTML</Typography>}
                /> */}
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
              />
            </>
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
                      <Typography sx={{ fontSize: 13 }}>Serverless</Typography>
                    }
                  />
                </RadioGroup>
              </FormControl>
            </div>
            <div className="create-scheduler-form-element">
              {selectedMode === 'cluster' && (
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
              {selectedMode === 'serverless' && (
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
            {selectedMode === 'cluster' && (
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
            <div className="job-button-style-parent">
              <div
                onClick={() => {
                  if (!isSaveDisabled()) {
                    handleCreateJobScheduler();
                  }
                }}
                className={
                  isSaveDisabled()
                    ? 'submit-button-disable-style'
                    : 'submit-button-style'
                }
                aria-label="submit Batch"
              >
                <div>{creatingScheduler ? 'CREATING' : 'CREATE'}</div>
              </div>
              <div
                className="job-cancel-button-style"
                aria-label="cancel Batch"
                onClick={handleCancel}
              >
                <div>CANCEL</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateNotebookScheduler;
