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
import { DataprocWidget } from '../controls/DataprocWidget';
import { ILabShell } from '@jupyterlab/application';
import { requestAPI } from '../handler/handler';

const NotebookSchedulerComponent = ({
  themeManager,
  labShell
}: {
  themeManager: IThemeManager;
  labShell: ILabShell;
}): JSX.Element => {
  const [jobNameSelected, setJobNameSelected] = useState('');
  const [inputFileSelected, setInputFileSelected] = useState('');

  const [clusterList, setClusterList] = useState([{}]);
  const [serverlessList, setServerlessList] = useState([{}]);
  const [clusterSelected, setClusterSelected] = useState('');
  const [serverlessSelected, setServerlessSelected] = useState('');
  const [retryCount, setRetryCount] = useState<number | undefined>(2);
  const [retryDelay, setRetryDelay] = useState<number | undefined>(5);

  const [emailOnFailure, setEmailOnFailure] = useState(true);
  const [emailOnRetry, setEmailonRetry] = useState(true);
  const [emailList, setEmailList] = useState<string[]>([]);

  const [selectedMode, setSelectedMode] = useState('cluster');

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

  const handleSelectedModeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSelectedMode((event.target as HTMLInputElement).value);
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

  // useEffect(() => {
  //   listClustersAPI();
  //   listSessionTemplatesAPI();
  //   console.log(labShell)

  //   labShell.activeChanged.connect(async (_, change) => {
  //     const { oldValue } = change;
  //     console.log(oldValue?.title.label)
  //   })
  // }, [labShell]);

  useEffect(() => {
    listClustersAPI();
    listSessionTemplatesAPI();
    const handleActiveChanged = async (_: any, change: any) => {
      const { oldValue } = change;
      console.log(oldValue?.title.label);
      setInputFileSelected(oldValue?.title.label);
    };

    labShell.activeChanged.connect(handleActiveChanged);

    // Clean up the connection when the component is unmounted
    return () => {
      labShell.activeChanged.disconnect(handleActiveChanged);
    };
  }, [labShell]);
  return (
    <div className="select-text-overlay-scheduler">
      <h1 className="jp-jobs-Heading">Create Job Scheduler</h1>
      <div>
        <div className="create-scheduler-form-element">
          <Input
            className="create-batch-style "
            value={jobNameSelected}
            onChange={(e => setJobNameSelected(e.target.value)}
            type="text"
            placeholder=""
            Label="Job name"
          />
        </div>
        <div className="create-scheduler-form-element">
          <Input
            className="input-style-scheduler"
            value={inputFileSelected}
            // type="text"
            // placeholder=""
            // Label="Input file"
            readOnly
          />
        </div>
        <div className="create-scheduler-form-element">
          {serverlessList.length === 0 ? (
            <Input
              className="input-style-scheduler"
              value="No session templates available"
              readOnly
            />
          ) : (
            <Autocomplete
              options={serverlessList}
              value={serverlessSelected}
              onChange={(_event, val) => handleServerlessSelected(val)}
              renderInput={params => (
                <TextField {...params} label="Environment" />
              )}
            />
          )}
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
              label={<Typography sx={{ fontSize: 13 }}>Notebook</Typography>}
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
              label={<Typography sx={{ fontSize: 13 }}>HTML</Typography>}
            />
          </FormGroup>
        </div>
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
                readOnly
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
                readOnly
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
      </div>
    </div>
  );
};

export class NotebookScheduler extends DataprocWidget {
  labShell: ILabShell;
  constructor(labShell: ILabShell, themeManager: IThemeManager) {
    super(themeManager);
    this.labShell = labShell;
  }

  renderInternal(): React.JSX.Element {
    return (
      <NotebookSchedulerComponent
        themeManager={this.themeManager}
        labShell={this.labShell}
      />
    );
  }
}
