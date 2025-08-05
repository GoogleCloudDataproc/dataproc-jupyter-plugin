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

import { Notification } from '@jupyterlab/apputils';
import {
  API_HEADER_CONTENT_TYPE,
  API_HEADER_BEARER,
  HTTP_METHOD,
  STATUS_FAIL,
  STATUS_TERMINATED,
  ClusterStatus,
  gcpServiceUrls
} from '../utils/const';
import {
  authApi,
  loggedFetch,
  authenticatedFetch,
  jobTimeFormat,
  elapsedTime,
  handleApiError
} from '../utils/utils';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';

interface IRenderActionsData {
  state: ClusterStatus;
  name: string;
}

export class SessionService {
  static deleteSessionAPI = async (selectedSession: string) => {
    const credentials = await authApi();
    const { DATAPROC } = await gcpServiceUrls;
    if (credentials) {
      loggedFetch(
        `${DATAPROC}/projects/${credentials.project_id}/locations/${credentials.region_id}/sessions/${selectedSession}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      )
        .then(async (response: Response) => {
          console.log(response);
          const formattedResponse = await response.json();
          if (formattedResponse?.error?.code) {
            Notification.emit(formattedResponse?.error?.message, 'error', {
              autoClose: 5000
            });
          } else {
            Notification.emit(
              `Session ${selectedSession} deleted successfully`,
              'success',
              {
                autoClose: 5000
              }
            );
          }
        })
        .catch((err: Error) => {
          DataprocLoggingService.log('Error deleting session', LOG_LEVEL.ERROR);
          Notification.emit(
            `Failed to delete the session ${selectedSession} : ${err}`,
            'error',
            {
              autoClose: 5000
            }
          );
        });
    }
  };
  static terminateSessionAPI = async (selectedSession: string) => {
    const credentials = await authApi();
    const { DATAPROC } = await gcpServiceUrls;
    if (credentials) {
      loggedFetch(
        `${DATAPROC}/projects/${credentials.project_id}/locations/${credentials.region_id}/sessions/${selectedSession}:terminate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      )
        .then((response: Response) => {
          response
            .json()
            .then(async (responseResult: Response) => {
              console.log(responseResult);
              const formattedResponse = await responseResult.json();
              if (formattedResponse?.error?.code) {
                Notification.emit(
                  `Failed to terminate session ${selectedSession} : ${formattedResponse?.error?.message}`,
                  'error',
                  {
                    autoClose: 5000
                  }
                );
              }
            })
            .catch((e: Error) => console.log(e));
        })
        .catch((err: Error) => {
          DataprocLoggingService.log(
            'Error terminating session',
            LOG_LEVEL.ERROR
          );

          Notification.emit(
            `Failed to terminate session ${selectedSession} : ${err}`,
            'error',
            {
              autoClose: 5000
            }
          );
        });
    }
  };

  static getSessionDetailsService = async (
    sessionSelected: string,
    setErrorView: (value: boolean) => void,
    setIsLoading: (value: boolean) => void,
    setLabelDetail: (value: string[]) => void,
    setSessionInfo: any
  ) => {
    try {
      const response = await authenticatedFetch({
        uri: `sessions/${sessionSelected}`,
        method: HTTP_METHOD.GET,
        regionIdentifier: 'locations'
      });

      const formattedResponse = await response.json();
      if (formattedResponse.error && formattedResponse.error.code === 404) {
        setErrorView(true);
      }
      setSessionInfo(formattedResponse);
      const labelValue: string[] = [];
      if (formattedResponse.labels) {
        for (const [key, value] of Object.entries(formattedResponse.labels)) {
          labelValue.push(`${key}:${value}`);
        }
      }
      setLabelDetail(labelValue);
      setIsLoading(false);
      if (formattedResponse?.error?.code) {
        Notification.emit(
          `Failed to fetch session details ${sessionSelected} : ${formattedResponse?.error?.message}`,
          'error',
          {
            autoClose: 5000
          }
        );
      }
    } catch (error) {
      setIsLoading(false);
      DataprocLoggingService.log(
        'Error loading session details',
        LOG_LEVEL.ERROR
      );

      Notification.emit(
        `Failed to fetch session details ${sessionSelected} : ${error}`,
        'error',
        {
          autoClose: 5000
        }
      );
    }
  };

  static listSessionsAPIService = async (
    renderActions: (value: IRenderActionsData) => React.JSX.Element,
    setIsLoading: (value: boolean) => void,
    setSessionsList: any,
    setApiDialogOpen: (open: boolean) => void,
    setPollingDisable: (value: boolean) => void,
    setEnableLink: (link: string) => void,
    nextPageToken?: string,
    previousSessionsList?: object
  ) => {
    try {
      const pageToken = nextPageToken ?? '';
      const queryParams = new URLSearchParams();
      queryParams.append('pageSize', '50');
      queryParams.append('pageToken', pageToken);

      const response = await authenticatedFetch({
        uri: 'sessions',
        method: HTTP_METHOD.GET,
        regionIdentifier: 'locations',
        queryParams: queryParams
      });
      const credentials = await authApi();
      const formattedResponse = await response.json();
      let transformSessionListData: React.SetStateAction<never[]> = [];
      if (formattedResponse && formattedResponse.sessions) {
        let sessionsListNew = formattedResponse.sessions;

        const existingSessionsData = previousSessionsList ?? [];
        // setStateAction never type issue
        let allSessionsData: any = [
          ...(existingSessionsData as []),
          ...sessionsListNew
        ];

        if (formattedResponse.nextPageToken) {
          this.listSessionsAPIService(
            renderActions,
            setIsLoading,
            setSessionsList,
            setApiDialogOpen,
            setPollingDisable,
            setEnableLink,
            formattedResponse.nextPageToken,
            allSessionsData
          );
        } else {
          allSessionsData.sort(
            (a: { createTime: string }, b: { createTime: string }) => {
              const dateA = new Date(a.createTime);
              const dateB = new Date(b.createTime);
              return Number(dateB) - Number(dateA);
            }
          );
          transformSessionListData = allSessionsData.map((data: any) => {
            const startTimeDisplay = jobTimeFormat(data.createTime);
            const startTime = new Date(data.createTime);
            let elapsedTimeString = '';
            if (
              data.state === STATUS_TERMINATED ||
              data.state === STATUS_FAIL
            ) {
              elapsedTimeString = elapsedTime(data.stateTime, startTime);
            }

            // Extracting sessionID, location from sessionInfo.name
            // Example: "projects/{project}/locations/{location}/sessions/{sessionID}"

            return {
              sessionID: data.name.split('/')[5],
              status: data.state,
              location: data.name.split('/')[3],
              creator: data.creator,
              creationTime: startTimeDisplay,
              elapsedTime: elapsedTimeString,
              actions: renderActions(data)
            };
          });
          setSessionsList(transformSessionListData);
          setIsLoading(false);
        }
      } else {
        setSessionsList([]);
        setIsLoading(false);
      }
      if (formattedResponse?.error?.code) {
        handleApiError(
          formattedResponse,
          credentials,
          setApiDialogOpen,
          setEnableLink,
          setPollingDisable,
          'sessions');
      }
    } catch (error) {
      setIsLoading(false);
      DataprocLoggingService.log('Error listing Sessions', LOG_LEVEL.ERROR);

      Notification.emit(`Failed to fetch sessions : ${error}`, 'error', {
        autoClose: 5000
      });
    }
  };
}
