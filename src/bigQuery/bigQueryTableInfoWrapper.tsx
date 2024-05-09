/**
 * @license
 * Copyright 2024 Google LLC
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

import React, { useEffect, useState } from 'react';
import { IThemeManager } from '@jupyterlab/apputils';
import { DataprocWidget } from '../controls/DataprocWidget';
import PreviewDataInfo from './previewDataInfo';
import BigQueryTableInfo from './bigQueryTableInfo';
import BigQuerySchemaInfo from './bigQuerySchema';
import { BigQueryService } from './bigQueryService';

interface IDatabaseProps {
  title: string;
  database: string;
  projectId: string;
}
const BigQueryTableInfoWrapper = ({
  title,
  database,
  projectId
}: IDatabaseProps): React.JSX.Element => {
  type Mode = 'Details' | 'Schema' | 'Preview';

  const [selectedMode, setSelectedMode] = useState<Mode>('Details');
  const [schemaInfoResponse, setSchemaInfoResponse] = useState<any>();

  const selectedModeChange = (mode: Mode) => {
    setSelectedMode(mode);
  };

  const toggleStyleSelection = (toggleItem: string) => {
    if (selectedMode === toggleItem) {
      return 'selected-header';
    } else {
      return 'unselected-header';
    }
  };

  useEffect(() => {
    BigQueryService.getBigQuerySchemaInfoAPIService(
      database,
      title,
      projectId,
      setSchemaInfoResponse
    );
  }, []);

  return (
    <div className="dpms-Wrapper">
      <div className="table-info-overlay">
        <div className="title-overlay">{title}</div>
        <div className="clusters-list-overlay" role="tab">
          <div
            role="tabpanel"
            className={toggleStyleSelection('Details')}
            onClick={() => selectedModeChange('Details')}
          >
            Details
          </div>
          <div
            role="tabpanel"
            className={toggleStyleSelection('Schema')}
            onClick={() => selectedModeChange('Schema')}
          >
            Schema
          </div>
          <div
            role="tabpanel"
            className={toggleStyleSelection('Preview')}
            onClick={() => selectedModeChange('Preview')}
          >
            Preview
          </div>
        </div>
        {selectedMode === 'Details' && (
          <BigQueryTableInfo
            title={title}
            dataset={database}
            projectId={projectId}
          />
        )}
        {selectedMode === 'Schema' &&
          schemaInfoResponse &&
          (schemaInfoResponse.length === 0 ? (
            <div className="no-data-style">No rows to display</div>
          ) : (
            <>
              <div className="db-title">Schema</div>
              <BigQuerySchemaInfo column={schemaInfoResponse} />
            </>
          ))}
        {selectedMode === 'Preview' &&
          schemaInfoResponse &&
          schemaInfoResponse.length > 0 && (
            <>
              <PreviewDataInfo
                column={schemaInfoResponse}
                tableId={title}
                dataSetId={database}
                projectId={projectId}
              />
            </>
          )}
      </div>
    </div>
  );
};

export class BigQueryTableWrapper extends DataprocWidget {
  constructor(
    title: string,
    private database: string,
    private projectId: string,
    themeManager: IThemeManager
  ) {
    super(themeManager);
  }

  renderInternal(): React.JSX.Element {
    return (
      <BigQueryTableInfoWrapper
        title={this.title.label}
        database={this.database}
        projectId={this.projectId}
      />
    );
  }
}
