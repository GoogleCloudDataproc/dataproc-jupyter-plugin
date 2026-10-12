/**
 * @license
 * Copyright 2026 Google LLC
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
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  gcpServiceUrls,
  HTTP_METHOD
} from '../utils/const';
import { authApi, authenticatedFetch, loggedFetch } from '../utils/utils';
import { LOG_LEVEL, safeLog } from '../utils/loggingService';
import {
  ICreateRuntimeProfilePayload,
  IRegionOption,
  IRuntimeProfile,
  IRuntimeProfileService,
  ISharedVpcSubnetworksResult
} from './runtimeProfileInterface';
import { IRuntimeProfileTemplate } from './runtimeProfileListMapper';
import { mapRuntimeProfileToSessionTemplate } from './runtimeProfileMapper';

/**
 * Flag to enable mock mode for UI development/testing.
 * When false, runtime profiles are created via the Dataproc sessionTemplates API.
 */
export const RUNTIME_PROFILE_USE_MOCK = false;

/**
 * Mock regions with human-readable location descriptions
 */
export const MOCK_REGIONS: IRegionOption[] = [
  { name: 'us-central1', displayName: 'us-central1 (Iowa)' },
  { name: 'us-east1', displayName: 'us-east1 (South Carolina)' }
];

export const MOCK_STORAGE_BUCKETS: string[] = [
  'dataproc-staging-bucket',
  'spark-notebooks-bucket',
  'analytics-data-bucket'
];

export const MOCK_BUCKET_OBJECTS: string[] = [
  'notebooks/sample_analysis.ipynb',
  'notebooks/etl_pipeline.ipynb',
  'scripts/spark_job.py'
];

const DEFAULT_RUNTIME_PROFILE_PAGE_SIZE = 50;
const MAX_EMPTY_PAGE_HOPS = 10;

/**
 * Service to manage Dataproc Runtime Profiles.
 * Provides mock data for current UI prototyping and integrates cleanly with GCP Dataproc APIs.
 */
export class RuntimeProfileService implements IRuntimeProfileService {
  private useMock: boolean;
  private inMemoryProfiles: IRuntimeProfile[] = [];

  static async fetchRuntimeProfiles(
    pageToken: string = '',
    pageSize: number = DEFAULT_RUNTIME_PROFILE_PAGE_SIZE
  ): Promise<{ templates: IRuntimeProfileTemplate[]; nextPageToken?: string }> {
    let currentToken: string | undefined = pageToken;
    let validTemplates: IRuntimeProfileTemplate[] = [];
    let hops = 0;

    do {
      const queryParams = new URLSearchParams({
        pageSize: pageSize.toString(),
        pageToken: currentToken || ''
      });
      const response = await authenticatedFetch({
        uri: 'sessionTemplates',
        method: HTTP_METHOD.GET,
        regionIdentifier: 'locations',
        queryParams: queryParams
      });
      if (!response.ok) {
        const errorData = await response.json().catch((err: unknown) => {
          safeLog(
            `Failed to parse error response JSON: ${err}`,
            LOG_LEVEL.WARN
          );
          return null;
        });
        throw new Error(
          errorData?.error?.message ||
          `Failed to fetch runtime profiles: ${response.statusText}`
        );
      }

      const data: any = await response.json();
      if (data?.error) {
        throw new Error(
          data.error.message || 'Failed to fetch runtime profiles'
        );
      }

      const rawTemplates: IRuntimeProfileTemplate[] =
        data?.sessionTemplates || [];
      validTemplates = rawTemplates.filter((t: IRuntimeProfileTemplate) =>
        Boolean(t.jupyterSession)
      );
      currentToken = data?.nextPageToken;
      hops += 1;
    } while (
      validTemplates.length === 0 &&
      Boolean(currentToken) &&
      hops < MAX_EMPTY_PAGE_HOPS
    );

    return {
      templates: validTemplates,
      nextPageToken: currentToken
    };
  }

  static async deleteRuntimeProfile(
    id: string,
    displayName: string = id
  ): Promise<void> {
    const credentials = await authApi();
    const { DATAPROC } = await gcpServiceUrls;
    if (!credentials) {
      throw new Error('Authentication failed');
    }
    const response = await loggedFetch(`${DATAPROC}/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': API_HEADER_CONTENT_TYPE,
        Authorization: API_HEADER_BEARER + credentials.access_token
      }
    });

    const data = await response.json().catch((err: unknown) => {
      safeLog(
        `Response body for DELETE ${displayName} is not JSON: ${err}`,
        LOG_LEVEL.INFO
      );
      return null;
    });

    if (!response.ok || data?.error) {
      throw new Error(
        data?.error?.message ||
        `Failed to delete runtime profile ${displayName}`
      );
    }
  }

  static async updateRuntimeProfile(
    id: string,
    payload: IRuntimeProfileTemplate,
    displayName: string = id
  ): Promise<IRuntimeProfileTemplate> {
    const credentials = await authApi();
    const { DATAPROC } = await gcpServiceUrls;
    if (!credentials) {
      throw new Error('Authentication failed');
    }
    const response = await loggedFetch(`${DATAPROC}/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': API_HEADER_CONTENT_TYPE,
        Authorization: API_HEADER_BEARER + credentials.access_token
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch((err: unknown) => {
      safeLog(
        `Response body for PATCH ${displayName} is not JSON: ${err}`,
        LOG_LEVEL.WARN
      );
      return null;
    });

    if (!response.ok || data?.error) {
      throw new Error(
        data?.error?.message ||
          `Failed to update runtime profile ${displayName}`
      );
    }

    return data?.name ? (data as IRuntimeProfileTemplate) : payload;
  }

  constructor(useMock: boolean = RUNTIME_PROFILE_USE_MOCK) {
    this.useMock = useMock;
  }

  /**
   * Retrieves available GCP regions for the project.
   * Mirrors the Settings region dropdown: returns an empty list when there is
   * no project or access token, and throws on API errors (no mock fallback).
   */
  async getRegions(projectId?: string): Promise<IRegionOption[]> {
    if (this.useMock) {
      return MOCK_REGIONS;
    }

    const credentials = await authApi();
    const targetProject = projectId || credentials?.project_id;
    if (!targetProject || !credentials?.access_token) {
      return [];
    }

    const { REGION_URL } = await gcpServiceUrls;
    const response = await loggedFetch(
      `${REGION_URL}/${targetProject}/regions`,
      {
        method: 'GET',
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token
        }
      }
    );
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.error) {
      throw new Error(
        result?.error?.message ||
        `Failed to fetch regions: ${response.statusText}`
      );
    }

    const items: { name: string }[] = result?.items ?? [];
    return items.map(item => ({ name: item.name, displayName: item.name }));
  }

  private getBucketsEndpoint(storageUrl: string): string {
    const trimmed = storageUrl.replace(/\/+$/, '');
    return trimmed.endsWith('/b') ? trimmed : `${trimmed}/b`;
  }

  /**
   * Retrieves available Cloud Storage buckets for the project.
   */
  async getStorageBuckets(projectId?: string): Promise<string[]> {
    if (this.useMock) {
      return MOCK_STORAGE_BUCKETS;
    }

    const credentials = await authApi().catch(() => undefined);
    const targetProject = projectId || credentials?.project_id;
    if (!targetProject || !credentials?.access_token) {
      return [];
    }

    const { STORAGE } = await gcpServiceUrls;
    const bucketsEndpoint = this.getBucketsEndpoint(STORAGE);
    const response = await loggedFetch(
      `${bucketsEndpoint}?project=${encodeURIComponent(targetProject)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token
        }
      }
    );
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.error) {
      throw new Error(
        result?.error?.message ||
        `Failed to fetch buckets: ${response.statusText}`
      );
    }

    const items: { name: string }[] = result?.items ?? [];
    return items.map(item => item.name);
  }

  /**
   * Retrieves objects (notebooks/files/folders) inside a given Cloud Storage bucket.
   */
  async getBucketObjects(bucketName: string): Promise<string[]> {
    if (this.useMock) {
      return MOCK_BUCKET_OBJECTS;
    }

    const credentials = await authApi().catch(() => undefined);
    if (!bucketName || !credentials?.access_token) {
      return [];
    }

    const { STORAGE } = await gcpServiceUrls;
    const bucketsEndpoint = this.getBucketsEndpoint(STORAGE);
    const response = await loggedFetch(
      `${bucketsEndpoint}/${encodeURIComponent(bucketName)}/o?delimiter=%2F`,
      {
        method: 'GET',
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token
        }
      }
    );
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.error) {
      throw new Error(
        result?.error?.message ||
        `Failed to fetch objects for bucket ${bucketName}: ${response.statusText}`
      );
    }

    const prefixes: string[] = result?.prefixes ?? [];
    const items: { name: string }[] = result?.items ?? [];
    const itemNames = items.map(item => item.name);
    return Array.from(new Set([...prefixes, ...itemNames]));
  }

  /**
   * Creates a new Cloud Storage bucket in the project.
   */
  async createStorageBucket(
    bucketName: string,
    projectId?: string
  ): Promise<string> {
    const trimmedName = bucketName.trim();
    if (this.useMock) {
      return trimmedName;
    }

    const credentials = await authApi().catch(() => undefined);
    const targetProject = projectId || credentials?.project_id;
    if (!targetProject || !credentials?.access_token) {
      throw new Error('Authentication failed or GCP Project ID missing.');
    }

    const { STORAGE } = await gcpServiceUrls;
    const bucketsEndpoint = this.getBucketsEndpoint(STORAGE);
    const response = await loggedFetch(
      `${bucketsEndpoint}?project=${encodeURIComponent(targetProject)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token
        },
        body: JSON.stringify({ name: trimmedName })
      }
    );
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.error) {
      throw new Error(
        result?.error?.message ||
        `Failed to create bucket ${trimmedName}: ${response.statusText}`
      );
    }

    return result?.name || trimmedName;
  }

  /**
   * Lists VPC networks in the project (references RunTimeSerive.listNetworksAPIService)
   */
  async getNetworks(projectId?: string): Promise<string[]> {
    if (this.useMock) {
      return ['default'];
    }
    try {
      const { COMPUTE } = await gcpServiceUrls;
      let response: Response;
      if (projectId) {
        const credentials = await authApi();
        response = await loggedFetch(
          `${COMPUTE}/projects/${projectId}/global/networks`,
          {
            method: 'GET',
            headers: {
              'Content-Type': API_HEADER_CONTENT_TYPE,
              Authorization:
                API_HEADER_BEARER + (credentials?.access_token || '')
            }
          }
        );
      } else {
        response = await authenticatedFetch({
          baseUrl: COMPUTE,
          uri: 'networks',
          method: HTTP_METHOD.GET,
          regionIdentifier: 'global'
        });
      }

      const formattedResponse: {
        items?: Array<{ selfLink?: string; name?: string }>;
        error?: { message: string; code: number };
      } = await response.json();

      console.log('[RuntimeProfileService] getNetworks API response:', {
        projectId: projectId || 'default',
        rawResponse: formattedResponse
      });

      if (formattedResponse?.error?.code) {
        Notification.emit(formattedResponse.error.message, 'error', {
          autoClose: 5000
        });
        return [];
      }

      if (formattedResponse?.items && formattedResponse.items.length > 0) {
        const parsedNetworks = formattedResponse.items
          .map(data => {
            const uriMatch = data.selfLink
              ? /\/networks\/(?<network>[\w-]+)$/.exec(data.selfLink)?.groups?.[
                  'network'
                ] || data.selfLink.split('/')[9]
              : '';
            return uriMatch || data.name || '';
          })
          .filter(Boolean);
        console.log(
          '[RuntimeProfileService] getNetworks parsed list:',
          parsedNetworks
        );
        return parsedNetworks;
      }

      safeLog(
        'No networks found. Account may lack access to list networks',
        LOG_LEVEL.ERROR
      );
      Notification.emit(
        'No networks found. Account may lack access to list networks.',
        'error',
        { autoClose: 5000 }
      );
      return [];
    } catch (error) {
      console.error('[RuntimeProfileService] getNetworks error:', error);
      safeLog('Error listing Networks: ' + error, LOG_LEVEL.ERROR);
      Notification.emit(`Error listing Networks : ${error}`, 'error', {
        autoClose: 5000
      });
      return [];
    }
  }

  /**
   * Resolves the parent VPC network name from a subnetwork name or URI
   * (references RunTimeSerive.listNetworksFromSubNetworkAPIService)
   */
  async getNetworkFromSubnetwork(
    subnetwork: string,
    projectId?: string,
    region?: string
  ): Promise<string> {
    if (!subnetwork || this.useMock) {
      return 'default';
    }
    try {
      const credentials = await authApi();
      const { COMPUTE } = await gcpServiceUrls;
      const targetProject = projectId || credentials?.project_id;
      const targetRegion = region || credentials?.region_id;
      if (!targetProject || !targetRegion || !credentials?.access_token) {
        return '';
      }

      const subnetworkName =
        /projects\/(?<project>[\w-]+)\/regions\/(?<region>[\w-]+)\/subnetworks\/(?<subnetwork>[\w-]+)/.exec(
          subnetwork
        )?.groups?.['subnetwork'] || subnetwork;

      const response = await loggedFetch(
        `${COMPUTE}/projects/${targetProject}/regions/${targetRegion}/subnetworks/${subnetworkName}`,
        {
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      );
      const responseResult: {
        network?: string;
        error?: { message: string; code: number };
      } = await response.json();

      if (responseResult?.error?.code) {
        Notification.emit(responseResult.error.message, 'error', {
          autoClose: 5000
        });
        return '';
      }

      return (
        (responseResult?.network &&
          (/\/networks\/(?<network>[\w-]+)$/.exec(responseResult.network)
            ?.groups?.['network'] ||
            responseResult.network.split('/')[9])) ||
        ''
      );
    } catch (error) {
      safeLog('Error selecting Network: ' + error, LOG_LEVEL.ERROR);
      Notification.emit(`Error selecting Network : ${error}`, 'error', {
        autoClose: 5000
      });
      return '';
    }
  }

  /**
   * Lists subnetworks with Private Google Access enabled for a given network and region
   * (references RunTimeSerive.listSubNetworksAPIService)
   */
  async getSubnetworks(
    network: string,
    projectId?: string,
    region?: string
  ): Promise<string[]> {
    if (!network) {
      return [];
    }
    if (this.useMock) {
      return ['default'];
    }
    try {
      const credentials = await authApi();
      const { COMPUTE } = await gcpServiceUrls;
      const targetProject = projectId || credentials?.project_id;
      const targetRegion = region || credentials?.region_id;
      if (!targetProject || !targetRegion || !credentials?.access_token) {
        return [];
      }

      const normalizedTargetNetwork =
        /\/networks\/(?<network>[\w-]+)$/.exec(network)?.groups?.['network'] ||
        network;

      const response = await loggedFetch(
        `${COMPUTE}/projects/${targetProject}/regions/${targetRegion}/subnetworks`,
        {
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      );
      const responseResult: {
        items?: Array<{
          name: string;
          selfLink?: string;
          network: string;
          privateIpGoogleAccess: boolean;
        }>;
        error?: { message: string; code: number };
      } = await response.json();

      console.log('[RuntimeProfileService] getSubnetworks API response:', {
        network: normalizedTargetNetwork,
        targetProject,
        targetRegion,
        rawResponse: responseResult,
        allSubnetworksInRegion: responseResult?.items?.map(item => ({
          name: item.name,
          selfLink: item.selfLink,
          networkUrl: item.network,
          extractedNetwork:
            /\/networks\/(?<network>[\w-]+)$/.exec(item.network)?.groups?.[
              'network'
            ] || item.network?.split('/')[9],
          privateIpGoogleAccess: item.privateIpGoogleAccess
        }))
      });

      if (responseResult?.error?.code) {
        Notification.emit(responseResult.error.message, 'error', {
          autoClose: 5000
        });
        return [];
      }

      const filteredServices = responseResult?.items?.filter(item => {
        const itemNetworkName =
          /\/networks\/(?<network>[\w-]+)$/.exec(item.network)?.groups?.[
            'network'
          ] || item.network?.split('/')[9];
        return (
          itemNetworkName === normalizedTargetNetwork &&
          item.privateIpGoogleAccess === true
        );
      });

      console.log(
        `[RuntimeProfileService] getSubnetworks filtered for network "${normalizedTargetNetwork}":`,
        filteredServices
      );

      if (filteredServices) {
        const transformedServiceList = filteredServices
          .map(data => {
            if (data.selfLink) {
              const matches =
                /\/compute\/v1\/projects\/(?<project>[\w-]+)\/regions\/(?<region>[\w-]+)\/subnetworks\/(?<subnetwork>[\w-]+)/.exec(
                  data.selfLink
                )?.groups;
              if (matches?.['subnetwork']) {
                return matches['subnetwork'];
              }
            }
            return data.name;
          })
          .filter(Boolean);
        if (transformedServiceList.length === 0) {
          const errorMessage = `There are no subnetworks with Google Private Access enabled for network "${normalizedTargetNetwork}"`;
          Notification.emit(errorMessage, 'error', { autoClose: 5000 });
          safeLog(errorMessage, LOG_LEVEL.ERROR);
        }
        return transformedServiceList;
      } else {
        const errorMessage = `No subNetworks found for network ${normalizedTargetNetwork}`;
        Notification.emit(errorMessage, 'error', { autoClose: 5000 });
        safeLog(errorMessage, LOG_LEVEL.ERROR);
        return [];
      }
    } catch (error) {
      console.error('[RuntimeProfileService] getSubnetworks error:', error);
      safeLog('Error listing subNetworks: ' + error, LOG_LEVEL.ERROR);
      Notification.emit(`Error listing subNetworks : ${error}`, 'error', {
        autoClose: 5000
      });
      return [];
    }
  }

  /**
   * Retrieves Shared VPC host project and usable subnetworks in the target region
   * (references RunTimeSerive.runtimeSharedProjectService & listSharedVPCService)
   */
  async getSharedVpcSubnetworks(
    projectId?: string,
    region?: string
  ): Promise<ISharedVpcSubnetworksResult> {
    if (this.useMock) {
      return { hostProjectId: '', subnetworks: [] };
    }
    try {
      const credentials = await authApi();
      const { REGION_URL } = await gcpServiceUrls;
      const targetProject = projectId || credentials?.project_id;
      const targetRegion = region || credentials?.region_id;
      if (!targetProject || !credentials?.access_token) {
        return { hostProjectId: '', subnetworks: [] };
      }

      const hostResponse = await loggedFetch(
        `${REGION_URL}/${targetProject}/getXpnHost`,
        {
          method: 'GET',
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      );
      const hostText = await hostResponse.text();
      if (!hostText || !hostText.trim()) {
        console.log(
          '[RuntimeProfileService] getSharedVpcSubnetworks getXpnHost returned empty body (no Shared VPC host project).'
        );
        return { hostProjectId: '', subnetworks: [] };
      }

      const hostResult: {
        name?: string;
        error?: { message: string; code: number };
      } = JSON.parse(hostText);

      console.log(
        '[RuntimeProfileService] getSharedVpcSubnetworks getXpnHost response:',
        {
          targetProject,
          targetRegion,
          hostResult
        }
      );

      if (hostResult?.error?.code) {
        Notification.emit(hostResult.error.message, 'error', {
          autoClose: 5000
        });
        return { hostProjectId: '', subnetworks: [] };
      }

      const hostProjectName = hostResult?.name;
      if (!hostProjectName) {
        return { hostProjectId: '', subnetworks: [] };
      }

      const subnetworksResponse = await loggedFetch(
        `${REGION_URL}/${hostProjectName}/aggregated/subnetworks/listUsable`,
        {
          method: 'GET',
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      );
      const subnetworksResult: {
        items?: Array<{ subnetwork: string }>;
        error?: { message: string; code: number };
      } = await subnetworksResponse.json();

      console.log(
        '[RuntimeProfileService] getSharedVpcSubnetworks listUsable response:',
        {
          hostProjectName,
          targetRegion,
          subnetworksResult
        }
      );

      if (subnetworksResult?.error?.code) {
        Notification.emit(subnetworksResult.error.message, 'error', {
          autoClose: 5000
        });
      }

      const transformedSharedvpcSubNetworkList: string[] =
        subnetworksResult?.items
          ?.map((data: { subnetwork: string }) => {
            const matches =
              /\/compute\/v1\/projects\/(?<project>[\w-]+)\/regions\/(?<region>[\w-]+)\/subnetworks\/(?<subnetwork>[\w-]+)/.exec(
                data.subnetwork
              )?.groups;
            if (targetRegion && matches?.['region'] !== targetRegion) {
              return undefined;
            }
            return matches?.['subnetwork'];
          })
          .filter((subNetwork): subNetwork is string => Boolean(subNetwork)) ||
        [];

      console.log(
        '[RuntimeProfileService] getSharedVpcSubnetworks parsed result:',
        {
          hostProjectId: hostProjectName,
          subnetworks: transformedSharedvpcSubNetworkList
        }
      );

      return {
        hostProjectId: hostProjectName,
        subnetworks: transformedSharedvpcSubNetworkList
      };
    } catch (error) {
      console.error(
        '[RuntimeProfileService] getSharedVpcSubnetworks error:',
        error
      );
      safeLog(
        'Error displaying sharedVPC subNetwork: ' + error,
        LOG_LEVEL.ERROR
      );
      Notification.emit(
        `Failed to fetch sharedVPC subNetwork : ${error}`,
        'error',
        { autoClose: 5000 }
      );
      return { hostProjectId: '', subnetworks: [] };
    }
  }

  /**
   * Lists Cloud KMS Key Rings in the target project and region
   * (references RunTimeSerive.listKeyRingsAPIService)
   */
  async getKeyRings(projectId?: string, region?: string): Promise<string[]> {
    if (this.useMock) {
      return [];
    }
    try {
      const credentials = await authApi();
      const { CLOUD_KMS } = await gcpServiceUrls;
      const targetProject = projectId || credentials?.project_id;
      const targetRegion = region || credentials?.region_id;
      if (!targetProject || !targetRegion || !credentials?.access_token) {
        return [];
      }

      const response = await loggedFetch(
        `${CLOUD_KMS}/projects/${targetProject}/locations/${targetRegion}/keyRings`,
        {
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      );
      const responseResult: {
        keyRings?: Array<{ name: string }>;
        error?: { message: string; code: number };
      } = await response.json();

      console.log('[RuntimeProfileService] getKeyRings API response:', {
        targetProject,
        targetRegion,
        rawResponse: responseResult
      });

      if (responseResult?.error?.code) {
        Notification.emit(responseResult.error.message, 'error', {
          autoClose: 5000
        });
        return [];
      }

      const parsedKeyRings = (responseResult?.keyRings || [])
        .map(data => data.name?.split('/')[5] || '')
        .filter(Boolean);

      console.log(
        '[RuntimeProfileService] getKeyRings parsed list:',
        parsedKeyRings
      );
      return parsedKeyRings;
    } catch (error) {
      console.error('[RuntimeProfileService] getKeyRings error:', error);
      safeLog('Error listing KeyRings: ' + error, LOG_LEVEL.ERROR);
      Notification.emit(`Error listing KeyRings : ${error}`, 'error', {
        autoClose: 5000
      });
      return [];
    }
  }

  /**
   * Lists enabled Cloud KMS CryptoKeys for a given Key Ring
   * (references RunTimeSerive.listKeysAPIService)
   */
  async getCryptoKeys(
    keyRing: string,
    projectId?: string,
    region?: string
  ): Promise<string[]> {
    if (!keyRing || this.useMock) {
      return [];
    }
    try {
      const credentials = await authApi();
      const { CLOUD_KMS } = await gcpServiceUrls;
      const targetProject = projectId || credentials?.project_id;
      const targetRegion = region || credentials?.region_id;
      if (!targetProject || !targetRegion || !credentials?.access_token) {
        return [];
      }

      const response = await loggedFetch(
        `${CLOUD_KMS}/projects/${targetProject}/locations/${targetRegion}/keyRings/${keyRing}/cryptoKeys`,
        {
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      );
      const responseResult: {
        cryptoKeys?: Array<{
          name: string;
          primary?: { state: string };
        }>;
        error?: { message: string; code: number };
      } = await response.json();

      console.log('[RuntimeProfileService] getCryptoKeys API response:', {
        keyRing,
        targetProject,
        targetRegion,
        rawResponse: responseResult
      });

      if (responseResult?.error?.code) {
        Notification.emit(responseResult.error.message, 'error', {
          autoClose: 5000
        });
        return [];
      }

      const parsedKeys = (responseResult?.cryptoKeys || [])
        .filter(data => data.primary && data.primary.state === 'ENABLED')
        .map(data => data.name?.split('/')[7] || '')
        .filter(Boolean);

      console.log(
        '[RuntimeProfileService] getCryptoKeys parsed list:',
        parsedKeys
      );
      return parsedKeys;
    } catch (error) {
      console.error('[RuntimeProfileService] getCryptoKeys error:', error);
      safeLog('Error listing CryptoKeys: ' + error, LOG_LEVEL.ERROR);
      Notification.emit(`Error listing CryptoKeys : ${error}`, 'error', {
        autoClose: 5000
      });
      return [];
    }
  }

  /**
   * Creates a new Runtime Profile / Dataproc Session Template.
   * Sends POST request to Google Cloud Dataproc sessionTemplates endpoint or simulates in mock mode.
   */
  async createRuntimeProfile(
    payload: ICreateRuntimeProfilePayload,
    projectId?: string,
    region?: string
  ): Promise<IRuntimeProfile> {
    safeLog(
      `Creating runtime profile: ${payload.displayName} (mockMode=${this.useMock})`,
      LOG_LEVEL.INFO
    );

    if (this.useMock) {
      // Simulate network latency for mock response
      await new Promise(resolve => setTimeout(resolve, 600));

      const profileId = payload.displayName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-');
      const targetRegion = region || payload.region || 'us-central1';
      const targetProject = projectId || 'current-project';

      const newProfile: IRuntimeProfile = {
        name: `projects/${targetProject}/locations/${targetRegion}/runtimeProfiles/${profileId}`,
        id: profileId,
        displayName: payload.displayName,
        region: targetRegion,
        description: payload.description,
        tier: payload.tier ?? payload.executorAndDriverConfig?.tier,
        lightningEngineEnabled:
          payload.lightningEngineEnabled ??
          payload.runtimeEnvironmentConfig?.lightningEngineEnabled,
        executorConfig: payload.executorConfig,
        runtimeEnvironmentConfig: payload.runtimeEnvironmentConfig,
        executorAndDriverConfig: payload.executorAndDriverConfig,
        autoscalingConfig: payload.autoscalingConfig,
        metastoreConfig: payload.metastoreConfig,
        networkAndSecurityConfig: payload.networkAndSecurityConfig,
        sessionLifecycleConfig: payload.sessionLifecycleConfig,
        sparkProperties: payload.sparkProperties,
        labels: payload.labels,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
        state: 'ACTIVE'
      };

      this.inMemoryProfiles.push(newProfile);
      return newProfile;
    }

    // Live API integration path
    try {
      const credentials = await authApi();
      const { DATAPROC } = await gcpServiceUrls;
      const targetProject = projectId || credentials?.project_id;
      const targetRegion = region || payload.region || credentials?.region_id;

      if (!targetProject) {
        throw new Error(
          'GCP Project ID is required to create a runtime profile. Please log in or select a project.'
        );
      }
      if (!targetRegion) {
        throw new Error(
          'GCP Region is required to create a runtime profile. Please select a valid region.'
        );
      }

      const apiPayload = mapRuntimeProfileToSessionTemplate(
        payload,
        targetProject,
        targetRegion
      );
      const url = `${DATAPROC}/projects/${targetProject}/locations/${targetRegion}/sessionTemplates`;

      const response = await loggedFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + (credentials?.access_token || '')
        },
        body: JSON.stringify(apiPayload)
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || result?.error) {
        throw new Error(
          result?.error?.message ||
          `Failed to create runtime profile (${response.status}: ${response.statusText})`
        );
      }
      return result as IRuntimeProfile;
    } catch (error) {
      safeLog('Error creating runtime profile: ' + error, LOG_LEVEL.ERROR);
      throw error;
    }
  }
}

// Export singleton instance for easy import
export const runtimeProfileService = new RuntimeProfileService();
