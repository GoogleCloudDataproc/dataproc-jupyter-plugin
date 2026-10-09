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

import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  gcpServiceUrls,
  HTTP_METHOD
} from '../utils/const';
import { authApi, authenticatedFetch, loggedFetch } from '../utils/utils';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';
import {
  ICreateRuntimeProfilePayload,
  IRegionOption,
  IRuntimeProfile,
  IRuntimeProfileService
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

const safeLog = (message: string, level: LOG_LEVEL = LOG_LEVEL.INFO) => {
  if (process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID)) {
    return;
  }
  try {
    DataprocLoggingService.log(message, level).catch(() => {
      // Ignore background log transport errors
    });
  } catch {
    // Ignore synchronous logging errors
  }
};

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
      `${bucketsEndpoint}/${encodeURIComponent(bucketName)}/o`,
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
   * Creates a new Runtime Profile.
   * Uses mock simulation or sends request to Dataproc API when live.
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
