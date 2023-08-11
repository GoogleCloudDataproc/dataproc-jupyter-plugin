import { ReactWidget } from '@jupyterlab/apputils';
import React from 'react';

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
    dname: title,
    description: databaseDetails[title],
    instanceName: dataprocMetastoreServices
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
      <div className="title-overlay">{title}</div>
      <div className="db-title">Database info</div>
      {renderTable()}
    </div>
  );
};

export class Database extends ReactWidget {
  dataprocMetastoreServices: string;
  databaseDetails: Record<string, string>;
  constructor(
    title: string,
    dataprocMetastoreServices: string,
    databaseDetails: Record<string, string>
  ) {
    super();
    this.addClass('jp-ReactWidget');
    this.title.label = title; // Set the title label here
    this.dataprocMetastoreServices = dataprocMetastoreServices;
    this.databaseDetails = databaseDetails;
  }

  render(): React.ReactElement {
    return (
      <DatabaseInfo
        title={this.title.label}
        dataprocMetastoreServices={this.dataprocMetastoreServices}
        databaseDetails={this.databaseDetails}
      />
    );
  }
}
