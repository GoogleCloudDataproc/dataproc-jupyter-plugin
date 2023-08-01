import React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
const DatabaseInfo = ({ title }: { title: any }): React.JSX.Element => {
  //   return (
  //     <div>
  //       <div className="lm-Widget p-Widget jp-Toolbar jp-Toolbar-micro">
  //         {title._label}
  //       </div>
  //       <div className="db-title">database info</div>
  //     </div>
  //   );
  // };
  const database = {
    dname: 'name',
    description: 'description',
    instanceName: 'instanceName'
  };

  // Render the JSON object in a React table
  const renderTable = () => {
    return (
      <div className="table-container">
        <table className="db-table">
          <tbody>
            {Object.entries(database).map(([key, value], index) => (
              <tr
                key={key}
                className={index % 2 === 0 ? 'tr-row-even' : 'tr-row-odd'} // Apply different classes to even and odd rows
              >
                <td>{key}</td>
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
      <div className="lm-Widget p-Widget jp-Toolbar jp-Toolbar-micro">
        {title._label}
      </div>
      <div className="db-title">Database info</div>
      {renderTable()}
    </div>
  );
};

export class Database extends ReactWidget {
  constructor(title: string) {
    super();
    this.addClass('jp-ReactWidget');
  }

  render(): React.JSX.Element {
    return <DatabaseInfo title={this.title} />;
  }
}
