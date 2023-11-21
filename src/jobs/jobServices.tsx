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

import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  BASE_URL,
  API_HEADER_CONTENT_TYPE,
  API_HEADER_BEARER,
  LABEL_TEXT,
  ClusterStatus,
  HTTP_METHOD
} from '../utils/const';
import {
  authApi,
  toastifyCustomStyle,
  loggedFetch,
  statusMessage,
  elapsedTime,
  jobTimeFormat,
  jobTypeValue,
  jobTypeDisplay,
  authenticatedFetch,
  statusValue
} from '../utils/utils';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';
import { IJobDetails } from '../utils/jobDetailsInterface';

interface IJobList {
  error: {
    code: number;
    message: string;
  };
  jobs: Array<{
    reference: {
      jobId: string;
    };
    statusHistory: Array<{
      stateStartTime: string;
    }>;
    status: {
      stateStartTime: string;
    };
    labels?: {
      [key: string]: string;
    };
  }>;
  nextPageToken?: string;
}

interface IRenderActionsData {
  reference: { jobId: string };
  status: { state: ClusterStatus };
  clusterName: string;
}
export class JobService {
  static stopJobApi = async (jobId: string) => {
    const credentials = await authApi();
    if (credentials) {
      loggedFetch(
        `${BASE_URL}/projects/${credentials.project_id}/regions/${credentials.region_id}/jobs/${jobId}:cancel`,
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
                toast.error(
                  formattedResponse?.error?.message,
                  toastifyCustomStyle
                );
              }
            })
            .catch((e: Error) => console.log(e));
        })
        .catch((err: Error) => {
          console.error('Error to  stop job', err);
          DataprocLoggingService.log('Error to  stop job', LOG_LEVEL.ERROR);
          toast.error(`Failed to stop job ${jobId}`, toastifyCustomStyle);
        });
    }
  };
  static deleteJobApi = async (jobId: string) => {
    const credentials = await authApi();
    if (credentials) {
      loggedFetch(
        `${BASE_URL}/projects/${credentials.project_id}/regions/${credentials.region_id}/jobs/${jobId}`,
        {
          method: 'DELETE',
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

              toast.success(
                `Job ${jobId} deleted successfully`,
                toastifyCustomStyle
              );
            })
            .catch((e: Error) => console.log(e));
        })
        .catch((err: Error) => {
          console.error('Error Deleting Job', err);
          DataprocLoggingService.log('Error Deleting Job', LOG_LEVEL.ERROR);
          toast.error(`Failed to delete the job ${jobId}`, toastifyCustomStyle);
        });
    }
  };
  static getJobDetailsService = async (
    jobSelected: string,
    setErrorView: (value: boolean) => void,
    setIsLoading: (value: boolean) => void,
    setjobInfoResponse: (value: IJobDetails) => void,
    setjobInfo: (value: IJobDetails) => void,
    setLabelDetail: (value: string[]) => void,
    setSelectedJobClone: any
  ) => {
    const credentials = await authApi();
    if (credentials) {
      loggedFetch(
        `${BASE_URL}/projects/${credentials.project_id}/regions/${credentials.region_id}/jobs/${jobSelected}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      )
        .then((response: Response) => {
          response
            .json()
            .then((responseResult: any) => {
              if (responseResult.error && responseResult.error.code === 404) {
                setErrorView(true);
              }
              setjobInfoResponse(responseResult);
              const labelValue: string[] = [];
              if (responseResult.labels) {
                for (const [key, value] of Object.entries(
                  responseResult.labels
                )) {
                  labelValue.push(`${key}:${value}`);
                }
              }
              setjobInfo(responseResult);
              setLabelDetail(labelValue);
              setIsLoading(false);
              setSelectedJobClone(responseResult);
              if (responseResult?.error?.code) {
                toast.error(
                  responseResult?.error?.message,
                  toastifyCustomStyle
                );
              }
            })
            .catch((e: Error) => {
              console.error(e);
              setIsLoading(false);
            });
        })
        .catch((err: Error) => {
          setIsLoading(false);
          console.error('Error in getting job details', err);
          DataprocLoggingService.log(
            'Error in getting job details',
            LOG_LEVEL.ERROR
          );
          toast.error(
            `Failed to fetch job details ${jobSelected}`,
            toastifyCustomStyle
          );
        });
    }
  };
  static updateJobDetailsService = async (
    payloadJob: object,
    jobSelected: string
  ) => {
    const credentials = await authApi();
    if (credentials) {
      loggedFetch(
        `${BASE_URL}/projects/${credentials.project_id}/regions/${credentials.region_id}/jobs/${jobSelected}?updateMask=${LABEL_TEXT}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payloadJob),
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      )
        .then((response: Response) => {
          response
            .json()
            .then(async (responseResultJob: Response) => {
              const formattedResponse = await responseResultJob.json();
              if (formattedResponse?.error?.code) {
                toast.error(
                  formattedResponse?.error?.message,
                  toastifyCustomStyle
                );
              }

              console.log(responseResultJob);
              toast.success(
                `Request to update job ${jobSelected} submitted`,
                toastifyCustomStyle
              );
            })
            .catch((e: Error) => console.error(e));
        })
        .catch((err: Error) => {
          console.error('Error in updating job', err);
          DataprocLoggingService.log('Error in updating job', LOG_LEVEL.ERROR);
          toast.error(
            `Failed to update the job ${jobSelected}`,
            toastifyCustomStyle
          );
        });
    }
  };
  static listJobsAPIService = async (
    clusterSelected: string,
    setIsLoading: (value: boolean) => void,
    setjobsList: any,
    renderActions: (value: IRenderActionsData) => React.JSX.Element,
    nextPageToken?: string,
    previousJobsList?: object
  ) => {
    const credentials = await authApi();
    const clusterName = clusterSelected ?? '';
    const pageToken = nextPageToken ?? '';
    if (credentials) {
      loggedFetch(
        `${BASE_URL}/projects/${credentials.project_id}/regions/${credentials.region_id}/jobs?pageSize=50&pageToken=${pageToken}&&clusterName=${clusterName}`,
        {
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      )
        .then((response: Response) => {
          response
            .json()
            .then((responseResult: IJobList) => {
              let transformJobListData: {
                jobid: number;
                status: string;
                region: string | undefined;
                type: string | undefined;
                starttime: string;
                elapsedtime: string;
                labels: string[];
                actions: React.JSX.Element;
              }[] = [];
              if (responseResult?.error?.code) {
                toast.error(
                  responseResult?.error?.message,
                  toastifyCustomStyle
                );
              }
              if (responseResult && responseResult.jobs) {
                transformJobListData = responseResult.jobs.map((data: any) => {
                  const startTime = jobTimeFormat(
                    data.statusHistory[0].stateStartTime
                  );
                  const job = jobTypeValue(data);
                  const jobType = jobTypeDisplay(job);
                  const endTime = data.status.stateStartTime;
                  const jobStartTime = new Date(
                    data.statusHistory[0].stateStartTime
                  );

                  const elapsedTimeString = elapsedTime(endTime, jobStartTime);

                  const statusMsg = statusMessage(data);

                  const labelvalue = [];
                  if (data.labels) {
                    for (const [key, value] of Object.entries(data.labels)) {
                      labelvalue.push(`${key} : ${value}`);
                    }
                  } else {
                    labelvalue.push('None');
                  }
                  return {
                    jobid: data.reference.jobId,
                    status: statusMsg,
                    region: credentials.region_id,
                    type: jobType,
                    starttime: startTime,
                    elapsedtime: elapsedTimeString,
                    labels: labelvalue,
                    actions: renderActions(data)
                  };
                });
              }
              const existingJobsData = previousJobsList ?? [];
              //setStateAction never type issue
              let allJobsData: any = [
                ...(existingJobsData as []),
                ...transformJobListData
              ];

              if (responseResult.nextPageToken) {
                this.listJobsAPIService(
                  clusterSelected,
                  setIsLoading,
                  setjobsList,
                  renderActions,
                  responseResult.nextPageToken,
                  allJobsData
                );
              } else {
                setjobsList(allJobsData);
                setIsLoading(false);
              }
            })
            .catch((e: Error) => {
              console.error(e);
              setIsLoading(false);
            });
        })
        .catch((err: Error) => {
          setIsLoading(false);
          console.error('Error listing jobs', err);
          DataprocLoggingService.log('Error listing jobs', LOG_LEVEL.ERROR);
          toast.error('Failed to fetch jobs', toastifyCustomStyle);
        });
    }
  };
  static listClustersAPIService = async (
    setClusterResponse: any,
    nextPageToken?: string,
    previousClustersList?: object
  ) => {
    const pageToken = nextPageToken ?? '';
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('pageSize', '50');
      queryParams.append('pageToken', pageToken);

      const response = await authenticatedFetch({
        uri: 'clusters',
        regionIdentifier: 'regions',
        method: HTTP_METHOD.GET,
        queryParams: queryParams
      });
      const formattedResponse = await response.json();
      let transformClusterListData = [];
      if (formattedResponse && formattedResponse.clusters) {
        transformClusterListData = formattedResponse.clusters.map(
          (data: any) => {
            const statusVal = statusValue(data);
            // Extracting zone from zoneUri
            // Example: "projects/{project}/zones/{zone}"
            return {
              clusterUuid: data.clusterUuid,
              status: statusVal,
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
        this.listClustersAPIService(
          setClusterResponse,
          formattedResponse.nextPageToken,
          allClustersData
        );
      } else {
        setClusterResponse(allClustersData);
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
  static submitJobService = async (
    payload: any, 
    jobIdSelected: string,
    credentials: any
  ) => {
    loggedFetch(
      `${BASE_URL}/projects/${credentials.project_id}/regions/${credentials.region_id}/jobs:submit`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token
        }
      }
    )
      .then(async (response: Response) => {
        if (response.status === 200) {
          response
            .json()
            .then((responseResult: unknown) => {
              console.log(responseResult);
              toast.success(
                `Job ${jobIdSelected} successfully submitted`,
                toastifyCustomStyle
              );
            })
            .catch((e: Error) => {
              console.log(e);
            });
        } else {
          const errorResponse = await response.json();
          toast.error(errorResponse?.error?.message, toastifyCustomStyle);
          throw new Error(`API failed with status: ${response.status}`);
        }
      })
      .catch((err: Error) => {
        console.error('Error submitting job', err);
        DataprocLoggingService.log('Error submitting job', LOG_LEVEL.ERROR);
        toast.error('Failed to submit the job', toastifyCustomStyle);
      });
  }
}
