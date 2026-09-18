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

export interface IRuntimeProfile {
  name: string;
  region: string;
  description: string;
  machineType: string;
  runtimeVersion: string;
  creator: string;
  lastUsed: string;
  id: string;
}

const formatLastUsed = (dateString: string) => {
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
    return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }
};

export interface ISessionTemplate {
  name: string;
  description?: string;
  jupyterSession?: {
    displayName?: string;
    kernel?: string;
  };
  runtimeConfig?: {
    version?: string;
    properties?: Record<string, string>;
  };
  creator?: string;
  updateTime?: string;
}

export const runtimeProfileListMapper = (
  templates: ISessionTemplate[]
): IRuntimeProfile[] => {
  const jupyterTemplates = templates.filter(
    (t: ISessionTemplate) => t.jupyterSession
  );

  return jupyterTemplates.map((t: ISessionTemplate) => {
    const nameParts = t.name?.split('/') || [];
    const region = nameParts[3] || '';

    return {
      name: t.jupyterSession?.displayName || t.name,
      region: region,
      description: t.description || '',
      // TODO: Machine type mapping from Spark properties will be added once the derivation logic is clarified/finalized.
      machineType: '',
      runtimeVersion: t.runtimeConfig?.version || '',
      creator:
        (t.creator && t.creator.includes('@')
          ? t.creator.split('@')[0]
          : t.creator) || '',
      lastUsed: formatLastUsed(t.updateTime || ''),
      id: t.name // To use for deletion
    };
  });
};
