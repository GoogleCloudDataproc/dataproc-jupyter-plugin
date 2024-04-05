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


import { useEffect, useRef, useState } from 'react';
import { API_HEADER_BEARER, API_HEADER_CONTENT_TYPE, gcpServiceUrls } from '../utils/const';
import { authApi, toastifyCustomStyle } from '../utils/utils';
import { toast } from 'react-toastify';

interface IRegions {
  name: string;
}

const regionListAPI = async (projectId: string, credentials: any) => {
  const { REGION_URL } = await gcpServiceUrls;
  if(projectId !== ''){
  try {
    const resp = await fetch(`${REGION_URL}/${projectId}/regions`, {
      method: 'GET',
      headers: {
        'Content-Type': API_HEADER_CONTENT_TYPE,
        Authorization: API_HEADER_BEARER + credentials.access_token,
      },
    });
   const responseResult = await resp.json()
    if (responseResult?.error?.code)
   {
      throw new Error(responseResult?.error?.message);
    }

    const { items } = (responseResult) as { items: IRegions[] | undefined };
    return items ?? [];
  } catch (error) {
    console.error(error);
    throw error; 
  }
  }
  else{
    return [];
  }
};

export function useRegion(projectId: string) {
  const [regions, setRegions] = useState<IRegions[]>([]);
  const currentRegion = useRef(projectId);

  useEffect(() => {
    currentRegion.current = projectId;
    authApi()
      .then((credentials) => regionListAPI(projectId, credentials))
      .then((items) => {
        if (currentRegion.current !== projectId) {
          // The project changed while the network request was pending
          // so we should throw away these results.
          return;
        }
        setRegions(items);
      })
      .catch((error) => {
        console.error(error);
        toast.error(error.message,toastifyCustomStyle)
      });
  }, [projectId]);

  return regions;
}
