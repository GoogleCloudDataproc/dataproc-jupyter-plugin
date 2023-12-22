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
import { HTTP_METHOD } from '../utils/const';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';
import { authenticatedFetch, toastifyCustomStyle } from '../utils/utils';
import { toast } from 'react-toastify';
import { DropdownProps } from 'semantic-ui-react';
import { MuiChipsInput } from 'mui-chips-input';

import { IThemeManager } from '@jupyterlab/apputils';
import { ILabShell } from '@jupyterlab/application';
import { requestAPI } from '../handler/handler';

const CreateNotebookScheduler = ({
  themeManager,
  labShell
}: {
  themeManager: IThemeManager;
  labShell: ILabShell;
}): JSX.Element => {
  const [jobNameSelected, setJobNameSelected] = useState('');
  const [inputFileSelected, setInputFileSelected] = useState('');
  const [composerList, setComposerList] = useState([{}]);
  const [composerSelected, setComposerSelected] = useState('');
  const [outputNotebook, setOutputNotebook] = useState(true);
  const [outputHtml, setOutputHtml] = useState(true);

  const [selectedMode, setSelectedMode] = useState('cluster');
  const [clusterList, setClusterList] = useState([{}]);
  const [serverlessList, setServerlessList] = useState([{}]);
  const [clusterSelected, setClusterSelected] = useState('');
  const [serverlessSelected, setServerlessSelected] = useState('');
  const [retryCount, setRetryCount] = useState<number | undefined>(2);
  const [retryDelay, setRetryDelay] = useState<number | undefined>(5);
  const [emailOnFailure, setEmailOnFailure] = useState(true);
  const [emailOnRetry, setEmailonRetry] = useState(true);
  const [emailList, setEmailList] = useState<string[]>([]);

  const [scheduleMode, setScheduleMode] = useState('runNow');

  const listClustersAPI = async (
    nextPageToken?: string,
    previousClustersList?: object
  ) => {
    const pageToken = nextPageToken ?? '';
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('pageSize', '50');
      queryParams.append('pageToken', pageToken);

      // const response = await authenticatedFetch({
      //   uri: 'clusters',
      //   regionIdentifier: 'regions',
      //   method: HTTP_METHOD.GET,
      //   queryParams: queryParams
      // });
      const formattedResponse: any = await requestAPI('clusterList');
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
      const queryParams = new URLSearchParams();
      queryParams.append('pageSize', '50');
      queryParams.append('pageToken', pageToken);

      const response = await authenticatedFetch({
        uri: 'sessionTemplates',
        regionIdentifier: 'locations',
        method: HTTP_METHOD.GET,
        queryParams: queryParams
      });
      const formattedResponse = await response.json();
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

  const listComposersAPI = async (
    nextPageToken?: string,
    previousSessionTemplatesList?: object
  ) => {
    const pageToken = nextPageToken ?? '';
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('pageSize', '50');
      queryParams.append('pageToken', pageToken);

      const response = await authenticatedFetch({
        uri: 'sessionTemplates',
        regionIdentifier: 'locations',
        method: HTTP_METHOD.GET,
        queryParams: queryParams
      });
      const formattedResponse = await response.json();
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
        listComposersAPI(
          formattedResponse.nextPageToken,
          allSessionTemplatesData
        );
      } else {
        let transformSessionTemplateListData = allSessionTemplatesData;

        const keyLabelStructure = transformSessionTemplateListData.map(
          (obj: { serverlessName: string }) => obj.serverlessName
        );

        setComposerList(keyLabelStructure);
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

  const handleComposerSelected = (data: DropdownProps | null) => {
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

  const handleClusterSelected = (data: DropdownProps | null) => {
    if (data) {
      const selectedCluster = data.toString();
      setClusterSelected(selectedCluster);
    }
  };

  const handleServerlessSelected = (data: DropdownProps | null) => {
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
    let outputFormats = []
    if(outputNotebook) {
      outputFormats.push('ipynb')
    }
    if(outputHtml) {
      outputFormats.push('html')
    }

    const payload = {
      input_filename: inputFileSelected,
      composer_environment_name: composerSelected,
      output_formats: outputFormats,
      parameters: 'none',
      cluster_name: clusterSelected,
      retry_count: retryCount,
      retry_delay: retryDelay,
      email_failure: emailOnFailure,
      email_delay: emailOnRetry,
      email: emailList,
      name: jobNameSelected,
      dag_id: '83dfd16c-e09d-4791-a589-a1dfe5240e9c'
    };
    try {
      const data = await requestAPI('createJobScheduler', {
        body: JSON.stringify(payload),
        method: 'POST'
      });
      console.log(data)
    } catch (reason) {
      console.error(`Error on POST {dataToSend}.\n${reason}`);
    } finally {
      // setIsSaving(false);
    }
  };

  useEffect(() => {
    listComposersAPI();
    listClustersAPI();
    listSessionTemplatesAPI();
    const handleActiveChanged = async (_: any, change: any) => {
      const { oldValue } = change;
      if (oldValue?.title.label.includes(".ipynb")) {
        setInputFileSelected(oldValue?.title.label);
      }
    };

    labShell.activeChanged.connect(handleActiveChanged);

    // Clean up the connection when the component is unmounted
    return () => {
      labShell.activeChanged.disconnect(handleActiveChanged);
    };
  }, [labShell]);

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
            Label="Job name"
          />
        </div>
        <div className="create-scheduler-form-element">
          <Input
            className="input-style-scheduler"
            value={inputFileSelected}
            Label="Input file"
            disabled={true}
          />
        </div>
        <div className="create-scheduler-form-element">
          {composerList.length === 0 ? (
            <Input
              className="input-style-scheduler"
              value="No composer data available"
              disabled={true}
            />
          ) : (
            <Autocomplete
              options={composerList}
              value={composerSelected}
              onChange={(_event, val) => handleComposerSelected(val)}
              renderInput={params => (
                <TextField {...params} label="Environment" />
              )}
            />
          )}
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
          {selectedMode === 'cluster' &&
            (clusterList.length === 0 ? (
              <Input
                className="input-style-scheduler"
                value="No clusters available"
                disabled={true}
              />
            ) : (
              <Autocomplete
                options={clusterList}
                value={clusterSelected}
                onChange={(_event, val) => handleClusterSelected(val)}
                renderInput={params => (
                  <TextField {...params} label="Cluster" />
                )}
              />
            ))}
          {selectedMode === 'serverless' &&
            (serverlessList.length === 0 ? (
              <Input
                className="input-style-scheduler"
                value="No session templates available"
                disabled={true}
              />
            ) : (
              <Autocomplete
                options={serverlessList}
                value={serverlessSelected}
                onChange={(_event, val) => handleServerlessSelected(val)}
                renderInput={params => (
                  <TextField {...params} label="Serverless" />
                )}
              />
            ))}
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
        <div className="job-button-style-parent">
          <div
            onClick={() => {
              // if (!isSaveDisabled()) {
              //   handleSave();
              // }
              console.log('Save clicked');
              handleCreateJobScheduler();
            }}
            className={
              // isSaveDisabled()
              //   ? 'submit-button-disable-style'
              // :
              'submit-button-style'
            }
            aria-label="submit Batch"
          >
            <div>SAVE</div>
          </div>
          <div
            className="job-cancel-button-style"
            aria-label="cancel Batch"
            // onClick={handleCancelButton}
          >
            <div>CANCEL</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateNotebookScheduler;
