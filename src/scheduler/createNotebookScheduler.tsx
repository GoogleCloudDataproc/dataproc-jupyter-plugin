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
  FormControl,
  FormControlLabel,
  FormGroup,
  Radio,
  RadioGroup,
  TextField,
  Typography
} from '@mui/material';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';
import { toastifyCustomStyle } from '../utils/utils';
import { toast } from 'react-toastify';
import { MuiChipsInput } from 'mui-chips-input';

import { IThemeManager } from '@jupyterlab/apputils';
import { JupyterLab } from '@jupyterlab/application';
import { requestAPI } from '../handler/handler';
import LabelProperties from '../jobs/labelProperties';

import { DocumentRegistry } from '@jupyterlab/docregistry';
import { INotebookModel } from '@jupyterlab/notebook';

import { v4 as uuidv4 } from 'uuid';

import { Cron } from 'react-js-cron';
import 'react-js-cron/dist/styles.css';

const CreateNotebookScheduler = ({
  themeManager,
  app,
  context
}: {
  themeManager: IThemeManager;
  app: JupyterLab;
  context: DocumentRegistry.IContext<INotebookModel>;
}): JSX.Element => {
  const [jobNameSelected, setJobNameSelected] = useState('');
  const [inputFileSelected, setInputFileSelected] = useState('');
  const [composerList, setComposerList] = useState<string[]>([]);
  const [composerSelected, setComposerSelected] = useState('');
  const [outputNotebook, setOutputNotebook] = useState(true);
  const [outputHtml, setOutputHtml] = useState(true);

  const [parameterDetail, setParameterDetail] = useState(['']);
  const [parameterDetailUpdated, setParameterDetailUpdated] = useState(['']);
  const [keyValidation, setKeyValidation] = useState(-1);
  const [valueValidation, setValueValidation] = useState(-1);
  const [duplicateKeyError, setDuplicateKeyError] = useState(-1);

  const [selectedMode, setSelectedMode] = useState('cluster');
  const [clusterList, setClusterList] = useState<string[]>([]);
  const [serverlessList, setServerlessList] = useState<string[]>([]);
  const [clusterSelected, setClusterSelected] = useState('');
  const [serverlessSelected, setServerlessSelected] = useState('');
  const [retryCount, setRetryCount] = useState<number | undefined>(2);
  const [retryDelay, setRetryDelay] = useState<number | undefined>(5);
  const [emailOnFailure, setEmailOnFailure] = useState(true);
  const [emailOnRetry, setEmailonRetry] = useState(true);
  const [emailList, setEmailList] = useState<string[]>([]);

  const [scheduleMode, setScheduleMode] = useState('runNow');
  const [scheduleValue, setScheduleValue] = useState('30 17 * * 1-5');

  const listClustersAPI = async (
    nextPageToken?: string,
    previousClustersList?: object
  ) => {
    const pageToken = nextPageToken ?? '';
    try {
      const serviceURL = `clusterList?pageSize=50&pageToken=${pageToken}`;

      const formattedResponse: any = await requestAPI(serviceURL);
      let transformClusterListData = [];
      if (formattedResponse && formattedResponse.clusters) {
        transformClusterListData = formattedResponse.clusters.map(
          (data: any) => {
            return {
              clusterName: data.clusterName
            };
          }
        );
      }
      const existingClusterData = previousClustersList ?? [];
      //setStateAction never type issue
      const allClustersData: any = [
        ...(existingClusterData as []),
        ...transformClusterListData
      ];

      if (formattedResponse.nextPageToken) {
        listClustersAPI(formattedResponse.nextPageToken, allClustersData);
      } else {
        let transformClusterListData = allClustersData;

        const keyLabelStructure = transformClusterListData.map(
          (obj: { clusterName: string }) => obj.clusterName
        );

        setClusterList(keyLabelStructure);
      }
      if (formattedResponse?.error?.code) {
        toast.error(formattedResponse?.error?.message, toastifyCustomStyle);
      }
    } catch (error) {
      DataprocLoggingService.log('Error listing clusters', LOG_LEVEL.ERROR);
      console.error('Error listing clusters', error);
      toast.error('Failed to fetch clusters', toastifyCustomStyle);
    }
  };

  const listSessionTemplatesAPI = async (
    nextPageToken?: string,
    previousSessionTemplatesList?: object
  ) => {
    const pageToken = nextPageToken ?? '';
    try {
      const serviceURL = `runtimeList?pageSize=50&pageToken=${pageToken}`;

      const formattedResponse: any = await requestAPI(serviceURL);
      let transformSessionTemplateListData = [];
      if (formattedResponse && formattedResponse.sessionTemplates) {
        transformSessionTemplateListData =
          formattedResponse.sessionTemplates.map((data: any) => {
            return {
              serverlessName: data.jupyterSession.displayName
            };
          });
      }
      const existingSessionTemplateData = previousSessionTemplatesList ?? [];
      //setStateAction never type issue
      const allSessionTemplatesData: any = [
        ...(existingSessionTemplateData as []),
        ...transformSessionTemplateListData
      ];

      if (formattedResponse.nextPageToken) {
        listSessionTemplatesAPI(
          formattedResponse.nextPageToken,
          allSessionTemplatesData
        );
      } else {
        let transformSessionTemplateListData = allSessionTemplatesData;

        const keyLabelStructure = transformSessionTemplateListData.map(
          (obj: { serverlessName: string }) => obj.serverlessName
        );

        setServerlessList(keyLabelStructure);
      }
      if (formattedResponse?.error?.code) {
        toast.error(formattedResponse?.error?.message, toastifyCustomStyle);
      }
    } catch (error) {
      DataprocLoggingService.log(
        'Error listing session templates',
        LOG_LEVEL.ERROR
      );
      console.error('Error listing session templates', error);
      toast.error('Failed to fetch session templates', toastifyCustomStyle);
    }
  };

  const listComposersAPI = async () => {
    try {
      const formattedResponse: any = await requestAPI('composer');
      let composerEnvironmentList: string[] = [];
      formattedResponse.forEach((data: any) => {
        composerEnvironmentList.push(data.name);
      });

      setComposerList(composerEnvironmentList);
    } catch (error) {
      DataprocLoggingService.log(
        'Error listing composer environment list',
        LOG_LEVEL.ERROR
      );
      console.error('Error listing composer environment list', error);
      toast.error(
        'Failed to fetch composer environment list',
        toastifyCustomStyle
      );
    }
  };

  const handleComposerSelected = (data: string | null) => {
    if (data) {
      const selectedComposer = data.toString();
      setComposerSelected(selectedComposer);
    }
  };

  const handleOutputNotebookChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setOutputNotebook(event.target.checked);
  };

  const handleOutputHtmlChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setOutputHtml(event.target.checked);
  };

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

  const handleServerlessSelected = (data: string | null) => {
    if (data) {
      const selectedServerless = data.toString();
      setServerlessSelected(selectedServerless);
    }
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

  const handleEmailList = (data: string[]) => {
    setEmailList(data);
  };

  const handleCreateJobScheduler = async () => {
    let outputFormats = [];
    if (outputNotebook) {
      outputFormats.push('ipynb');
    }
    if (outputHtml) {
      outputFormats.push('html');
    }

    let randomDagId = uuidv4();

    const payload = {
      input_filename: inputFileSelected,
      composer_environment_name: composerSelected,
      output_formats: outputFormats,
      parameters: parameterDetailUpdated,
      cluster_name: clusterSelected,
      serverless_name: serverlessSelected,
      mode_selected: selectedMode,
      retry_count: retryCount,
      retry_delay: retryDelay,
      email_failure: emailOnFailure,
      email_delay: emailOnRetry,
      email: emailList,
      name: jobNameSelected,
      schedule_value: scheduleValue,
      dag_id: randomDagId
    };

    try {
      const data = await requestAPI('createJobScheduler', {
        body: JSON.stringify(payload),
        method: 'POST'
      });
      app.shell.activeWidget?.close();
      console.log(data);
    } catch (reason) {
      console.error(`Error on POST {dataToSend}.\n${reason}`);
    }
  };

  const isSaveDisabled = () => {
    return (
      jobNameSelected === '' ||
      inputFileSelected === '' ||
      composerSelected === '' ||
      (clusterSelected === '' && serverlessSelected === '')
    );
  };

  const handleCancelButton = async () => {
    app.shell.activeWidget?.close();
  };

  useEffect(() => {
    listComposersAPI();
    listClustersAPI();
    listSessionTemplatesAPI();

    setInputFileSelected(context.path);
    if (context.contentsModel?.name) {
      setJobNameSelected(context.contentsModel?.name);
    }
  }, []);

  return (
    <div className="select-text-overlay-scheduler">
      <div className="create-job-scheduler-title">Create Job Scheduler</div>
      <div>
        <div className="create-scheduler-form-element">
          <Input
            className="create-batch-style "
            value={jobNameSelected}
            onChange={e => setJobNameSelected(e.target.value)}
            type="text"
            placeholder=""
            Label="Job name*"
          />
        </div>
        <div className="create-scheduler-form-element">
          <Input
            className="input-style-scheduler"
            value={inputFileSelected}
            Label="Input file*"
            disabled={true}
          />
        </div>
        <div className="create-scheduler-form-element">
          <Autocomplete
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
                  checked={outputNotebook}
                  onChange={handleOutputNotebookChange}
                />
              }
              className="create-scheduler-label-style"
              label={<Typography sx={{ fontSize: 13 }}>Notebook</Typography>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={outputHtml}
                  onChange={handleOutputHtmlChange}
                />
              }
              className="create-scheduler-label-style"
              label={<Typography sx={{ fontSize: 13 }}>HTML</Typography>}
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
                className="create-scheduler-label-style"
                control={<Radio size="small" />}
                label={<Typography sx={{ fontSize: 13 }}>Cluster</Typography>}
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
              options={clusterList}
              value={clusterSelected}
              onChange={(_event, val) => handleClusterSelected(val)}
              renderInput={params => <TextField {...params} label="Cluster*" />}
            />
          )}
          {selectedMode === 'serverless' && (
            <Autocomplete
              options={serverlessList}
              value={serverlessSelected}
              onChange={(_event, val) => handleServerlessSelected(val)}
              renderInput={params => (
                <TextField {...params} label="Serverless*" />
              )}
            />
          )}
        </div>
        <div className="create-scheduler-form-element">
          <Input
            className="input-style-scheduler"
            onChange={e => handleRetryCount(Number(e.target.value))}
            value={retryCount}
            Label="Retry count"
            type="number"
          />
        </div>
        <div className="create-scheduler-form-element">
          <Input
            className="input-style-scheduler"
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
                <Typography sx={{ fontSize: 13 }}>Email on failure</Typography>
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
                <Typography sx={{ fontSize: 13 }}>Email on retry</Typography>
              }
            />
          </FormGroup>
        </div>
        <div className="create-scheduler-form-element">
          {(emailOnFailure || emailOnRetry) && (
            <MuiChipsInput
              className="select-job-style-scheduler"
              onChange={e => handleEmailList(e)}
              addOnBlur={true}
              value={emailList}
              inputProps={{ placeholder: '' }}
              label="Email recipients"
            />
          )}
        </div>
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
                label={<Typography sx={{ fontSize: 13 }}>Run now</Typography>}
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
        <div className="create-scheduler-form-element">
          <Cron value={scheduleValue} setValue={setScheduleValue} />
        </div>)}
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
            <div>CREATE</div>
          </div>
          <div
            className="job-cancel-button-style"
            aria-label="cancel Batch"
            onClick={handleCancelButton}
          >
            <div>CANCEL</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateNotebookScheduler;
