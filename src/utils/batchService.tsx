import {
  API_HEADER_CONTENT_TYPE,
  BASE_URL,
  API_HEADER_BEARER
} from '../utils/const';
import { authApi } from '../utils/utils';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const deleteBatchAPI = async (selectedBatch: string) => {
  const credentials = await authApi();
  if (credentials) {
    fetch(
      `${BASE_URL}/projects/${credentials.project_id}/locations/${credentials.region_id}/batches/${selectedBatch}`,
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
          })
          .catch((e: Error) => console.log(e));
      })
      .catch((err: Error) => {
        console.error('Error deleting batches', err);
        toast.error('Failed to Delete the Batch ');
      });
  }
};
