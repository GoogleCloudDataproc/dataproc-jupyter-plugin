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
  DATAPROC_LIGHTNING_ENGINE_PROPERTY,
  DATAPROC_TIER_PROPERTY,
  LightningEngineDisplayNameMap,
  TierDisplayNameMap
} from '../utils/const';

export interface IRuntimeProfileRow {
  name: string;
  region: string;
  runtimeVersion: string;
  tier: string;
  engine: string;
  lastUsed: string;
  creator: string;
  description: string;
  id: string;
}

export const formatLastUsed = (
  dateString?: string,
  useLongUnits: boolean = false
): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) {
    const diffMs = Math.max(0, now.getTime() - date.getTime());
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (useLongUnits) {
        return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
      }
      return diffMins <= 1 ? '1 min ago' : `${diffMins} mins ago`;
    }
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  } else if (isYesterday) {
    return 'yesterday';
  } else {
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    return `${
      monthNames[date.getMonth()]
    } ${date.getDate()}, ${date.getFullYear()}`;
  }
};

export interface IRuntimeProfileTemplate {
  name: string;
  description?: string;
  // session_config is a oneof in the Dataproc API: a template has either
  // jupyterSession or sparkConnectSession, never both.
  jupyterSession?: {
    displayName?: string;
    kernel?: string;
  };
  /** SparkConnectConfig is an empty message; presence alone selects Spark Connect. */
  sparkConnectSession?: Record<string, never>;
  runtimeConfig?: {
    version?: string;
    containerImage?: string;
    properties?: Record<string, string>;
    repositoryConfig?: {
      pypiRepositoryConfig?: {
        pypiRepository?: string;
      };
    };
  };
  environmentConfig?: {
    executionConfig?: {
      networkUri?: string;
      subnetworkUri?: string;
      networkTags?: string[];
      kmsKey?: string;
      serviceAccount?: string;
      stagingBucket?: string;
      idleTtl?: string;
      ttl?: string;
      authenticationConfig?: {
        userWorkloadAuthenticationType?: string;
      };
    };
    peripheralsConfig?: {
      metastoreService?: string;
      sparkHistoryServerConfig?: {
        dataprocCluster?: string;
      };
    };
  };
  creator?: string;
  createTime?: string;
  updateTime?: string;
  uuid?: string;
  labels?: Record<string, string>;
}

const SESSION_TEMPLATE_RESOURCE_PATTERN =
  /^projects\/[^/]+\/(?:locations|regions)\/([^/]+)\/sessionTemplates\/([^/]+)$/;

export const parseRuntimeProfileResourceName = (
  resourceName?: string
): { region: string; profileId: string } => {
  if (!resourceName) {
    return { region: '', profileId: '' };
  }
  const match = SESSION_TEMPLATE_RESOURCE_PATTERN.exec(resourceName.trim());
  if (match) {
    return {
      region: match[1] || '',
      profileId: match[2] || ''
    };
  }
  return {
    region: '',
    profileId: resourceName
  };
};

export const getDefaultTierForVersion = (
  version?: string
): 'Premium' | 'Standard' => {
  if (!version) {
    return 'Standard';
  }
  const match = version.trim().match(/^(\d+)\.(\d+)/);
  if (!match) {
    return 'Standard';
  }
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return major > 3 || (major === 3 && minor >= 1) ? 'Premium' : 'Standard';
};

export const runtimeProfileListMapper = (
  templates: IRuntimeProfileTemplate[]
): IRuntimeProfileRow[] => {
  return templates.map((t: IRuntimeProfileTemplate) => {
    const { region, profileId } = parseRuntimeProfileResourceName(t.name);
    const properties = t.runtimeConfig?.properties || {};
    const rawTier = (
      properties[DATAPROC_TIER_PROPERTY] ??
      properties[`dataproc:${DATAPROC_TIER_PROPERTY}`] ??
      properties[`spark:${DATAPROC_TIER_PROPERTY}`] ??
      ''
    )
      .trim()
      .toLowerCase();
    const tier =
      TierDisplayNameMap.get(rawTier) ??
      getDefaultTierForVersion(t.runtimeConfig?.version);

    const rawEngine = (
      properties[DATAPROC_LIGHTNING_ENGINE_PROPERTY] ??
      properties[`spark:${DATAPROC_LIGHTNING_ENGINE_PROPERTY}`] ??
      properties[`dataproc:${DATAPROC_LIGHTNING_ENGINE_PROPERTY}`] ??
      'default'
    ).trim();
    const engine = LightningEngineDisplayNameMap.get(rawEngine) ?? 'Default';

    return {
      name: t.jupyterSession?.displayName || profileId || t.name,
      region: region,
      runtimeVersion: t.runtimeConfig?.version || '',
      tier,
      engine,
      lastUsed: formatLastUsed(t.updateTime || ''),
      creator:
        (t.creator && t.creator.includes('@')
          ? t.creator.split('@')[0]
          : t.creator) || '',
      description: t.description || '',
      id: t.name // To use for deletion
    };
  });
};
