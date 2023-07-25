import { toast } from 'react-toastify';
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  BASE_URL
} from '../utils/const';
import { authApi } from '../utils/utils';

export const deleteClusterApi = async (selectedcluster: string) => {
  const credentials = await authApi();
  if (credentials) {
    fetch(
      `${BASE_URL}/projects/${credentials.project_id}/regions/${credentials.region_id}/clusters/${selectedcluster}`,
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
            // listClustersAPI();
          })
          .catch((e: Error) => console.log(e));
      })
      .catch((err: Error) => {
        console.error('Error deleting cluster', err);
      });
  }
};

export const startStopAPI = async (
  selectedcluster: string,
  operation: string
) => {
  const credentials = await authApi();
  if (credentials) {
    fetch(
      `${BASE_URL}/projects/${credentials.project_id}/regions/${credentials.region_id}/clusters/${selectedcluster}:${operation}`,
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
        console.error('Error starting/stopping cluster', err);
        toast.error('Failed to Start/Stop the Cluster');
      });

    // listClustersAPI();
  }
};

export const startClusterApi = async (selectedcluster: string) => {
  startStopAPI(selectedcluster, 'start');
};
export const stopClusterApi = async (selectedcluster: string) => {
  startStopAPI(selectedcluster, 'stop');
};
