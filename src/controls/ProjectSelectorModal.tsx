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

import React, { useEffect, useMemo, useState } from 'react';
import {
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Radio
} from '@mui/material';
import { LabIcon } from '@jupyterlab/ui-components';
import {
  IProjectInfo,
  listProjectsWithDetailsAPI
} from '../utils/projectService';
import '../../style/projectSelectorModal.css';
import searchIconSvg from '../../style/icons/search_icon.svg';

const searchLabIcon = new LabIcon({
  name: 'project-selector:search-icon',
  svgstr: searchIconSvg
});

// Delay before a typed search is sent to the API, as in the Settings dropdown.
export const PROJECT_SEARCH_DEBOUNCE_MS = 500;

export interface IProjectSelectorModalProps {
  open: boolean;
  selectedProjectId?: string;
  onClose: () => void;
  onSelect: (projectId: string, project?: IProjectInfo) => void;
}

export const ProjectSelectorModal: React.FC<IProjectSelectorModalProps> = ({
  open,
  selectedProjectId = '',
  onClose,
  onSelect
}) => {
  const [projects, setProjects] = useState<IProjectInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [chosenProjectId, setChosenProjectId] =
    useState<string>(selectedProjectId);

  // Start from the current project each time the modal opens.
  useEffect(() => {
    if (open) {
      setChosenProjectId(selectedProjectId);
    }
  }, [open, selectedProjectId]);

  // Start with a new list and an empty search each time the modal opens.
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setProjects([]);
      setIsLoading(true);
    }
  }, [open]);

  // Like the Settings project dropdown, search the API as the user types: one
  // page holds only some of the user's projects. Matches are added to the
  // list, which is then filtered locally.
  useEffect(() => {
    if (!open) {
      return;
    }
    // Ignore the response once the modal closes or a newer search starts.
    let active = true;
    const query = searchQuery.trim();
    const timer = setTimeout(
      () => {
        // A typed search keeps the list visible and shows a small spinner.
        setIsSearching(Boolean(query));
        listProjectsWithDetailsAPI(query)
          .then(result => {
            if (active) {
              setProjects(prev => [
                ...prev,
                ...result.filter(
                  project =>
                    !prev.some(known => known.projectId === project.projectId)
                )
              ]);
            }
          })
          .catch(() => undefined)
          .finally(() => {
            if (active) {
              setIsLoading(false);
              setIsSearching(false);
            }
          });
      },
      query ? PROJECT_SEARCH_DEBOUNCE_MS : 0
    );
    return () => {
      active = false;
      clearTimeout(timer);
      setIsSearching(false);
    };
  }, [open, searchQuery]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) {
      return projects;
    }
    const query = searchQuery.toLowerCase().trim();
    return projects.filter(
      p =>
        p.name?.toLowerCase().includes(query) ||
        p.projectId?.toLowerCase().includes(query) ||
        p.projectNumber?.includes(query)
    );
  }, [projects, searchQuery]);

  const handleSelect = () => {
    if (chosenProjectId) {
      const selectedProj = projects.find(p => p.projectId === chosenProjectId);
      onSelect(chosenProjectId, selectedProj);
    }
    onClose();
  };

  // Enter picks the exact or first match (or the typed ID) and a second Enter
  // on the same project confirms it. With an empty search it acts on the
  // current choice, so a pre-selected project is not replaced by the first one.
  const handleSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    const query = searchQuery.trim();
    let targetId: string | undefined;
    if (query) {
      const match =
        filteredProjects.find(
          p => p.projectId.toLowerCase() === query.toLowerCase()
        ) ?? filteredProjects[0];
      targetId = match?.projectId ?? query;
    } else {
      targetId = chosenProjectId || filteredProjects[0]?.projectId;
    }
    if (!targetId) {
      return;
    }
    if (targetId === chosenProjectId) {
      handleSelect();
    } else {
      setChosenProjectId(targetId);
    }
  };

  const isCustomSelected =
    chosenProjectId.toLowerCase() === searchQuery.trim().toLowerCase();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        className: 'project-selector-dialog-paper'
      }}
    >
      <DialogTitle className="project-selector-dialog-header">
        <div className="project-selector-title-text">Select a project</div>
        <button
          type="button"
          className="project-selector-close-btn"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
      </DialogTitle>

      <DialogContent className="project-selector-dialog-content">
        <div className="project-selector-search-box">
          <searchLabIcon.react className="project-selector-search-icon" />
          <input
            type="text"
            className="project-selector-search-input"
            placeholder="Search projects by name or ID"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            autoFocus
          />
          {isSearching && (
            <CircularProgress
              size={16}
              aria-label="Searching projects"
              sx={{ ml: 1, flexShrink: 0 }}
            />
          )}
        </div>

        {isLoading ? (
          <div className="project-selector-loading">
            <CircularProgress size={28} />
            <span>Loading projects...</span>
          </div>
        ) : filteredProjects.length === 0 && !searchQuery.trim() ? (
          <div className="project-selector-empty">No projects found.</div>
        ) : (
          <div className="project-selector-list" role="radiogroup">
            {/* If user searched an ID not present in the list, offer it as a selectable option */}
            {searchQuery.trim() &&
              !filteredProjects.some(
                p =>
                  p.projectId.toLowerCase() === searchQuery.trim().toLowerCase()
              ) && (
                <div
                  className={`project-selector-item ${
                    isCustomSelected ? 'selected' : ''
                  }`}
                  onClick={() => setChosenProjectId(searchQuery.trim())}
                  role="radio"
                  aria-checked={isCustomSelected}
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setChosenProjectId(searchQuery.trim());
                    }
                  }}
                >
                  {/* Visual only: the row is the focusable radio. */}
                  <Radio
                    checked={isCustomSelected}
                    value={searchQuery.trim()}
                    name="project-radio-selection"
                    size="small"
                    className="project-selector-radio"
                    inputProps={{ tabIndex: -1, 'aria-hidden': true }}
                  />
                  <div className="project-selector-item-info">
                    <div className="project-selector-item-name">
                      Use &quot;{searchQuery.trim()}&quot;
                    </div>
                    <div className="project-selector-item-id">
                      {searchQuery.trim()} (Custom / Direct ID)
                    </div>
                  </div>
                </div>
              )}

            {filteredProjects.map(project => {
              const isSelected = chosenProjectId === project.projectId;
              return (
                <div
                  key={project.projectId}
                  className={`project-selector-item ${
                    isSelected ? 'selected' : ''
                  }`}
                  onClick={() => setChosenProjectId(project.projectId)}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setChosenProjectId(project.projectId);
                    }
                  }}
                >
                  {/* Visual only: the row is the focusable radio. */}
                  <Radio
                    checked={isSelected}
                    value={project.projectId}
                    name="project-radio-selection"
                    size="small"
                    className="project-selector-radio"
                    inputProps={{ tabIndex: -1, 'aria-hidden': true }}
                  />
                  <div className="project-selector-item-info">
                    <div className="project-selector-item-name">
                      {project.name || project.projectId}
                    </div>
                    <div className="project-selector-item-id">
                      {project.projectId}
                    </div>
                  </div>
                  {project.projectNumber && (
                    <div className="project-selector-item-number">
                      #{project.projectNumber}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>

      <DialogActions className="project-selector-dialog-actions">
        <button
          type="button"
          className="project-selector-cancel-btn"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="project-selector-submit-btn"
          disabled={!chosenProjectId}
          onClick={handleSelect}
        >
          Select
        </button>
      </DialogActions>
    </Dialog>
  );
};
