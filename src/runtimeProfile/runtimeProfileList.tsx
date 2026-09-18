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

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RuntimeProfileService } from './runtimeProfileService';
import { LabIcon } from '@jupyterlab/ui-components';
import { Notification } from '@jupyterlab/apputils';
import addRuntimeIcon from '../../style/icons/plus_icon.svg';
import refreshIcon from '../../style/icons/refresh_icon.svg';
import { CircularProgress } from '@mui/material';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';
import { IRuntimeProfile, runtimeProfileListMapper } from './runtimeProfileListMapper';
import { JupyterLab } from '@jupyterlab/application';

const iconAddRuntime = new LabIcon({ name: 'runtime-profile:add-runtime-icon', svgstr: addRuntimeIcon });
const iconRefresh = new LabIcon({ name: 'runtime-profile:refresh-icon', svgstr: refreshIcon });

export default function RuntimeProfileList({ app }: { app?: JupyterLab }) {
  const [profiles, setProfiles] = useState<IRuntimeProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageTokens, setPageTokens] = useState<string[]>(['']);
  const [pageOffsets, setPageOffsets] = useState<number[]>([0]);
  const [currentPage, setCurrentPage] = useState(0);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [profileToDelete, setProfileToDelete] = useState<IRuntimeProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdownId(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const toggleDropdown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpenDropdownId(openDropdownId === id ? null : id);
  };

  const fetchProfiles = async (token: string = '') => {
    setIsLoading(true);
    try {
      const { templates, nextPageToken: newNextPageToken } = await RuntimeProfileService.fetchRuntimeProfiles(token);

      const mappedProfiles = runtimeProfileListMapper(templates);
      setProfiles(mappedProfiles);
      setNextPageToken(newNextPageToken || null);
    } catch (error) {
      DataprocLoggingService.log(`Error fetching runtime profiles: ${error}`, LOG_LEVEL.ERROR);
      Notification.emit(`Failed to fetch runtime profiles: ${error}`, 'error', {
        autoClose: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles(pageTokens[currentPage]);
  }, [currentPage]);

  const openDeleteModal = (profile: IRuntimeProfile) => {
    setOpenDropdownId(null);
    setProfileToDelete(profile);
  };

  const confirmDelete = async () => {
    if (!profileToDelete) return;
    setIsDeleting(true);
    try {
      await RuntimeProfileService.deleteRuntimeProfile(profileToDelete.id, profileToDelete.name);
      Notification.emit(`${profileToDelete.name} is deleted successfully`, 'success', {
        autoClose: 5000
      });
      setProfileToDelete(null);
      if (profiles.length === 1 && currentPage > 0) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchProfiles(pageTokens[currentPage]);
      }
    } catch (error) {
      DataprocLoggingService.log(`Error deleting profile: ${error}`, LOG_LEVEL.ERROR);
      Notification.emit(`Failed to delete ${profileToDelete.name}: ${error}`, 'error', {
        autoClose: 5000
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="runtime-profile-wrapper">
      {profileToDelete &&
        createPortal(
          <div
            className="delete-profile-modal-backdrop"
            onClick={() => !isDeleting && setProfileToDelete(null)}
          >
            <div
              className="delete-profile-modal"
              onClick={e => e.stopPropagation()}
            >
              <div className="delete-profile-modal-title">
                Delete Runtime Profile
              </div>
              <div className="delete-profile-modal-banner">
                <svg
                  className="delete-profile-modal-info-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
                <span>This operation cannot be undone.</span>
              </div>
              <div className="delete-profile-modal-body">
                Do you want to delete runtime profile {profileToDelete.name}?
              </div>
              <div className="delete-profile-modal-actions">
                <button
                  className="delete-profile-modal-btn"
                  onClick={() => setProfileToDelete(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  className="delete-profile-modal-btn"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      <div className="settings-header">
        <div className="settings-header-title">
          Serverless
          <div className="settings-header-actions">
            <button
              className="secondary-action-btn"
              onClick={() => app?.commands.execute('create-runtime-profile-component')}
            >
              <iconAddRuntime.react tag="div" />
              Create runtime profile
            </button>
            <button className="secondary-action-btn" onClick={() => fetchProfiles(pageTokens[currentPage])}>
              <iconRefresh.react tag="div" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="runtime-profile-table-container">
        {isLoading ? (
          <div className="loading-spinner-container">
            <CircularProgress size={24} />
          </div>
        ) : profiles.length === 0 ? (
          <div className="no-profiles-message">No runtime profiles found</div>
        ) : (
          <>
            <table className="runtime-profile-table">
              <thead>
                <tr>
                    <th>Runtime profile name</th>
                  <th>Region</th>
                  <th>Description</th>
                    <th>Machine type</th>
                  <th>Runtime version</th>
                  <th>Creator</th>
                  <th>Last used</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={profile.id}>
                    <td className="profile-name-cell">{profile.name}</td>
                    <td>{profile.region}</td>
                    <td className="description-cell" title={profile.description}>
                      {profile.description}
                    </td>
                    <td>{profile.machineType}</td>
                    <td>{profile.runtimeVersion}</td>
                    <td>{profile.creator}</td>
                    <td>{profile.lastUsed}</td>
                    <td className="actions-cell">
                      <div className="dropdown">
                        <span onClick={(e) => toggleDropdown(e, profile.id)}>&#8942;</span>
                        <div className={`dropdown-content ${openDropdownId === profile.id ? 'show' : ''}`}>
                          <div onClick={() => openDeleteModal(profile)}>Delete</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-footer">
              {profiles.length > 0 ? (
                  `Showing ${(pageOffsets[currentPage] ?? 0) + 1} – ${(pageOffsets[currentPage] ?? 0) + profiles.length} profiles`
              ) : (
                'Showing 0 profiles'
              )}
              <span
                className={`pagination-btn ${currentPage === 0 ? 'disabled' : ''}`}
                onClick={() => { if (currentPage > 0) setCurrentPage(currentPage - 1); }}
              >&lt;</span>
              <span
                className={`pagination-btn ${!nextPageToken ? 'disabled' : ''}`}
                onClick={() => {
                  if (nextPageToken) {
                    const newTokens = [...pageTokens];
                    newTokens[currentPage + 1] = nextPageToken;
                    setPageTokens(newTokens);
                    const newOffsets = [...pageOffsets];
                    newOffsets[currentPage + 1] = (pageOffsets[currentPage] ?? 0) + profiles.length;
                    setPageOffsets(newOffsets);
                    setCurrentPage(currentPage + 1);
                  }
                }}
              >&gt;</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
