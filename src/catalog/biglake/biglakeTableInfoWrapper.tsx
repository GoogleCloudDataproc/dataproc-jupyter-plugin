import React, { useEffect, useState } from 'react';
import { IThemeManager } from '@jupyterlab/apputils';
import { DataprocWidget } from '../../controls/DataprocWidget';
import { BigLakeWidgetService } from './biglakeWidgetService';
import BigQuerySchemaInfo from '../../bigQuery/bigQuerySchema';
import { CircularProgress } from '@mui/material';

interface IBigLakeTableProps {
  tableName: string;
  namespaceId: string;
  catalogId: string;
  projectId: string;
}

const BigLakeTableDetails = ({ tableName, namespaceId, catalogId, projectId }: IBigLakeTableProps) => {
  // Currently displaying available metadata. To fetch more details (like creation time, sizing),
  // the backend service `get_column_details` in `biglake.py` can be updated to return the full table metadata.
  const tableInfo: Record<string, string> = {
    'Table ID': tableName,
    'Namespace': namespaceId,
    'Catalog': catalogId,
    'Project ID': projectId,
  };

  return (
    <>
      <div className="db-title">Table info</div>
      <div className="table-container">
        <table className="db-table">
          <tbody>
            {Object.keys(tableInfo).map((tableData, index) => (
              <tr key={index} className="tr-row">
                <td className="bold-column">{tableData}</td>
                <td>{tableInfo[tableData]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

const BigLakeTablePreview = () => {
  return (
    <div className="no-data-style">
      Data preview is currently unavailable for BigLake tables.
    </div>
  );
};

const BigLakeTableInfoWrapper = ({
  tableName,
  namespaceId,
  catalogId,
  projectId
}: IBigLakeTableProps): React.JSX.Element => {
  type Mode = 'Details' | 'Schema' | 'Preview';
  const [selectedMode, setSelectedMode] = useState<Mode>('Details');
  const [schemaInfoResponse, setSchemaInfoResponse] = useState<any>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    BigLakeWidgetService.getBigLakeColumnDetailsAPIService(
      catalogId,
      namespaceId,
      tableName,
      setSchemaInfoResponse,
      setIsLoading
    );
  }, [catalogId, namespaceId, tableName]);

  const toggleStyleSelection = (toggleItem: string) => {
    return selectedMode === toggleItem ? 'selected-header' : 'unselected-header';
  };

  return (
    <div className="dpms-Wrapper">
      <div className="table-info-overlay">
        <div className="title-overlay">{tableName}</div>
        <div className="clusters-list-overlay" role="tab">
          <div
            role="tabpanel"
            className={toggleStyleSelection('Details')}
            onClick={() => setSelectedMode('Details')}
          >
            Details
          </div>
          <div
            role="tabpanel"
            className={toggleStyleSelection('Schema')}
            onClick={() => setSelectedMode('Schema')}
          >
            Schema
          </div>
          <div
            role="tabpanel"
            className={toggleStyleSelection('Preview')}
            onClick={() => setSelectedMode('Preview')}
          >
            Preview
          </div>
        </div>
        {isLoading ? (
          <div className="database-loader">
            <div>
              <CircularProgress
                className="spin-loader-custom-style"
                size={20}
                aria-label="Loading Spinner"
                data-testid="loader"
              />
            </div>
            Loading table details
          </div>
        ) : (
          <>
            {selectedMode === 'Details' && (
              <BigLakeTableDetails
                tableName={tableName}
                namespaceId={namespaceId}
                catalogId={catalogId}
                projectId={projectId}
              />
            )}
            {selectedMode === 'Schema' &&
              schemaInfoResponse && (
                schemaInfoResponse?.schema?.fields?.length === 0 ? (
                  <div className="no-data-style">No rows to display</div>
                ) : (
                  <>
                    <div className="db-title">Schema</div>
                    <BigQuerySchemaInfo column={schemaInfoResponse.schema.fields} />
                  </>
                )
            )}
            {selectedMode === 'Preview' && <BigLakeTablePreview />}
          </>
        )}
      </div>
    </div>
  );
};

export class BigLakeTableWrapper extends DataprocWidget {
  constructor(
    tableName: string,
    private namespaceId: string,
    private catalogId: string,
    private projectId: string,
    themeManager: IThemeManager
  ) {
    super(themeManager);
    this.title.label = tableName;
  }

  renderInternal(): React.JSX.Element {
    return (
      <BigLakeTableInfoWrapper
        tableName={this.title.label}
        namespaceId={this.namespaceId}
        catalogId={this.catalogId}
        projectId={this.projectId}
      />
    );
  }
}