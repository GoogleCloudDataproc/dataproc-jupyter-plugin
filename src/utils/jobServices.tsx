import { toast } from 'react-toastify';
import { BASE_URL, API_HEADER_CONTENT_TYPE, API_HEADER_BEARER } from './const';
import { authApi } from './utils';

export const stopJobApi = async (jobId: string) => {
  const credentials = await authApi();
  if (credentials) {
    fetch(
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
          .then((responseResult: Response) => {
            console.log(responseResult);
          })
          .catch((e: Error) => console.log(e));
      })
      .catch((err: Error) => {
        console.error('Error Stoping jobs', err);
        toast.error('Failed to Stop job');
      });
  }
};
export const deleteJobApi = async (jobId: string) => {
  const credentials = await authApi();
  if (credentials) {
    fetch(
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
          .then((responseResult: Response) => {
            console.log(responseResult);
            // listJobsAPI();
          })
          .catch((e: Error) => console.log(e));
      })
      .catch((err: Error) => {
        console.error('Error Deleting Job', err);
        toast.error('Failed to Delete the job');
      });
  }
};
