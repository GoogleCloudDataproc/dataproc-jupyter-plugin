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

import React from 'react';
import { IThemeManager } from '@jupyterlab/apputils';
import { DataprocWidget } from '../controls/DataprocWidget';

interface IDatabaseProps {
  title: string;
  dataprocMetastoreServices: string;
  databaseDetails: Record<string, string>;
}

const DatabaseInfo = ({
  title,
  dataprocMetastoreServices,
  databaseDetails
}: IDatabaseProps): React.ReactElement => {
  const database = {
    'Database name': title,
    Description: databaseDetails[title],
    'DPMS Instance': dataprocMetastoreServices
  };
  const renderTable = () => {
    return (
      <div className="table-container">
        <table className="db-table">
          <tbody>
            {Object.entries(database).map(([key, value], index) => (
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
    );
  };

  return (
    <div>
      <div className="dpms-Wrapper">
        <div className="title-overlay">{title}</div>
        <div className="db-title">Database info</div>
        {renderTable()}
      </div>
    </div>
  );
};

export class Database extends DataprocWidget {
  constructor(
    title: string,
    private dataprocMetastoreServices: string,
    private databaseDetails: Record<string, string>,
    themeManager: IThemeManager
  ) {
    super(themeManager);
    this.title.label = title;
  }

  renderInternal(): React.ReactElement {
    return (
      <DatabaseInfo
        title={this.title.label}
        dataprocMetastoreServices={this.dataprocMetastoreServices}
        databaseDetails={this.databaseDetails}
      />
    );
  }
}
