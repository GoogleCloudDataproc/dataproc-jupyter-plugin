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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [chosenProjectId, setChosenProjectId] =
    useState<string>(selectedProjectId);

  useEffect(() => {
    if (open) {
      setChosenProjectId(selectedProjectId);
      setSearchQuery('');
      setIsLoading(true);
      listProjectsWithDetailsAPI()
        .then(result => {
          setProjects(result);
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  }, [open, selectedProjectId]);

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
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredProjects.length > 0) {
                  setChosenProjectId(filteredProjects[0].projectId);
                } else if (searchQuery.trim()) {
                  setChosenProjectId(searchQuery.trim());
                }
              }
            }}
            autoFocus
          />
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
                    chosenProjectId.toLowerCase() ===
                    searchQuery.trim().toLowerCase()
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() => setChosenProjectId(searchQuery.trim())}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setChosenProjectId(searchQuery.trim());
                    }
                  }}
                >
                  <Radio
                    checked={
                      chosenProjectId.toLowerCase() ===
                      searchQuery.trim().toLowerCase()
                    }
                    onChange={() => setChosenProjectId(searchQuery.trim())}
                    value={searchQuery.trim()}
                    name="project-radio-selection"
                    size="small"
                    className="project-selector-radio"
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
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setChosenProjectId(project.projectId);
                    }
                  }}
                >
                  <Radio
                    checked={isSelected}
                    onChange={() => setChosenProjectId(project.projectId)}
                    value={project.projectId}
                    name="project-radio-selection"
                    size="small"
                    className="project-selector-radio"
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
