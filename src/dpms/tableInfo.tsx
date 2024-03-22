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

import React, { useState } from 'react';
import { IThemeManager } from '@jupyterlab/apputils';
import { DataprocWidget } from '../controls/DataprocWidget';
import SchemaInfo from './schemaInfo';

interface IColumn {
  name: string;
  type: string;
  mode: string;
  description: string;
}

interface IDatabaseProps {
  title: string;
  dataprocMetastoreServices: string;
  database: string;
  column: IColumn[];
  tableDescription: Record<string, string>;
}
const TableInfo = ({
  title,
  dataprocMetastoreServices,
  database,
  column,
  tableDescription
}: IDatabaseProps): React.JSX.Element => {
  const table = {
    'Table name': title,
    Description: tableDescription[title],
    Database: database,
    'Dataproc Metastore Instance': dataprocMetastoreServices
  };

  type Mode = 'Details' | 'Schema' | 'Preview';

  const [selectedMode, setSelectedMode] = useState<Mode>('Details');

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
          {localStorage.getItem('notebookValue')?.includes('bigframes') && (
            <div
              role="tabpanel"
              className={toggleStyleSelection('Preview')}
              onClick={() => selectedModeChange('Preview')}
            >
              Preview
            </div>
          )}
        </div>
        {selectedMode === 'Details' && (
          <>
            <div className="db-title">Table info</div>
            <div className="table-container">
              <table className="db-table">
                <tbody>
                  {Object.entries(table).map(([key, value], index) => (
                    <tr
                      key={key}
                      className={index % 2 === 0 ? 'tr-row-even' : 'tr-row-odd'}
                    >
                      <td className="bold-column">{key}</td>
                      <td>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {selectedMode === 'Schema' && (
          <>
            <div className="db-title">Schema</div>
            <SchemaInfo column={column} />
          </>
        )}
      </div>
    </div>
  );
};

export class Table extends DataprocWidget {
  constructor(
    title: string,
    private dataprocMetastoreServices: string,
    private database: string,
    private column: IColumn[],
    private tableDescription: Record<string, string>,
    themeManager: IThemeManager
  ) {
    super(themeManager);
  }

  renderInternal(): React.JSX.Element {
    return (
      <TableInfo
        title={this.title.label}
        dataprocMetastoreServices={this.dataprocMetastoreServices}
        database={this.database}
        column={this.column}
        tableDescription={this.tableDescription}
      />
    );
  }
}
