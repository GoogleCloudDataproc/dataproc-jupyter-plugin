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

import React, { useEffect, useState } from 'react';
import { DpmsService } from './dpmsService';

const BigQueryDatasetInfo = ({ database }: { database: string }) => {
  const [datasetInfo, setDatasetInfo] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    DpmsService.getBigQueryDatasetDetailsAPIService(
      database,
      setDatasetInfo,
      setIsLoading
    );
  }, []);

  return (
    <>
      {!isLoading && (
        <>
          <div className="table-container">
            <table className="db-table">
              <tbody>
                {Object.keys(datasetInfo).map((tableData, index) => (
                  <tr
                    key={index}
                    className={index % 2 === 0 ? 'tr-row-even' : 'tr-row-odd'}
                  >
                    <td className="bold-column">{tableData}</td>
                    <td>{datasetInfo[tableData]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
};

export default BigQueryDatasetInfo;
