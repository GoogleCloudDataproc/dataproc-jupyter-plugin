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
  HTTP_METHOD,
  DATAPROC_STANDARD_MACHINE_TYPES,
  DATAPROC_ACCELERATED_MACHINE_TYPES
} from '../utils/const';
import { authApi, authenticatedFetch, loggedFetch } from '../utils/utils';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';
import {
  ICreateRuntimeProfilePayload,
  IMachineTypeOption,
  IRegionOption,
  IRuntimeProfile,
  IRuntimeProfileService,
  ExecutorCategoryType
} from './runtimeProfileInterface';
import { IRuntimeProfileTemplate } from './runtimeProfileListMapper';

/**
 * Flag to enable mock mode for UI development/testing until the skeleton form
 * is fully connected to the Dataproc sessionTemplates API / Jupyter server endpoint.
 * Set to false when connecting to the real Google Cloud Dataproc sessionTemplates endpoint.
 */
export const RUNTIME_PROFILE_USE_MOCK = true;

/**
 * Mock regions with human-readable location descriptions
 */
export const MOCK_REGIONS: IRegionOption[] = [
  { name: 'us-central1', displayName: 'us-central1 (Iowa)' },
  { name: 'us-east1', displayName: 'us-east1 (South Carolina)' }
];

/**
 * Dataproc Serverless standard machine types (CPU only)
 */
export const STANDARD_MACHINE_TYPES: IMachineTypeOption[] =
  DATAPROC_STANDARD_MACHINE_TYPES;

/**
 * Dataproc Serverless accelerated machine types (GPUs attached)
 */
export const ACCELERATED_MACHINE_TYPES: IMachineTypeOption[] =
  DATAPROC_ACCELERATED_MACHINE_TYPES;

/**
 * Backward compatibility aliases for existing imports
 */
export const MOCK_GENERAL_MACHINE_TYPES = STANDARD_MACHINE_TYPES;
export const MOCK_ACCELERATED_MACHINE_TYPES = ACCELERATED_MACHINE_TYPES;

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
   * Retrieves available GCP regions with formatted display names
   */
  async getRegions(projectId?: string): Promise<IRegionOption[]> {
    if (this.useMock) {
      return MOCK_REGIONS;
    }

    try {
      const credentials = await authApi();
      const { REGION_URL } = await gcpServiceUrls;
      const targetProject = projectId || credentials?.project_id;
      if (targetProject && credentials?.access_token) {
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
        const result = await response.json();
        if (result?.items && Array.isArray(result.items)) {
          return result.items.map((item: { name: string }) => {
            const match = MOCK_REGIONS.find(r => r.name === item.name);
            return match ?? { name: item.name, displayName: item.name };
          });
        }
      }
      return MOCK_REGIONS;
    } catch (error) {
      safeLog(
        'Failed to fetch regions from API, falling back to default regions list: ' +
          error,
        LOG_LEVEL.WARN
      );
      return MOCK_REGIONS;
    }
  }

  /**
   * Retrieves available executor machine types based on executor category
   */
  async getMachineTypes(
    category: ExecutorCategoryType = 'general'
  ): Promise<IMachineTypeOption[]> {
    if (category === 'accelerated') {
      return MOCK_ACCELERATED_MACHINE_TYPES;
    }
    return MOCK_GENERAL_MACHINE_TYPES;
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
        executorAndDriverConfig:
          payload.executorAndDriverConfig ??
          payload.driverAndExecutorConfiguration,
        driverAndExecutorConfiguration:
          payload.driverAndExecutorConfiguration ??
          payload.executorAndDriverConfig,
        driverConfig:
          payload.driverConfig ??
          payload.executorAndDriverConfig ??
          payload.driverAndExecutorConfiguration,
        executorDiskConfig:
          payload.executorDiskConfig ??
          payload.executorAndDriverConfig ??
          payload.driverAndExecutorConfiguration,
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
      const targetRegion = region || payload.region;
      const url = `${DATAPROC}/projects/${targetProject}/locations/${targetRegion}/sessionTemplates`;

      const response = await loggedFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + (credentials?.access_token || '')
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.error) {
        throw new Error(
          result.error.message || 'Failed to create runtime profile'
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
