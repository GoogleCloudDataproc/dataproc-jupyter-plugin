import { ReactWidget } from '@jupyterlab/apputils';
import React, { useState, useEffect } from 'react';
import { LabIcon } from '@jupyterlab/ui-components';
import { useTable, useGlobalFilter } from 'react-table';
import gcsRefreshIcon from '../../style/icons/gcs_refresh_icon.svg';
import gcsFolderNewIcon from '../../style/icons/gcs_folder_new_icon.svg';
import gcsFolderIcon from '../../style/icons/gcs_folder_icon.svg';
import gcsFileIcon from '../../style/icons/gcs_file_icon.svg';
import gcsUploadIcon from '../../style/icons/gcs_upload_icon.svg';
import gcsSearchIcon from '../../style/icons/gcs_search_icon.svg';
import { authApi, lastModifiedFormat } from '../utils/utils';
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  GCS_URL
} from '../utils/const';
import GlobalFilter from '../utils/globalFilter';
import TableData from '../utils/tableData';

const iconGcsRefresh = new LabIcon({
  name: 'launcher:gcs-refresh-icon',
  svgstr: gcsRefreshIcon
});
const iconGcsFolderNew = new LabIcon({
  name: 'launcher:gcs-folder-new-icon',
  svgstr: gcsFolderNewIcon
});
const iconGcsUpload = new LabIcon({
  name: 'launcher:gcs-upload-icon',
  svgstr: gcsUploadIcon
});
const iconGcsFolder = new LabIcon({
  name: 'launcher:gcs-folder-icon',
  svgstr: gcsFolderIcon
});
const iconGcsFile = new LabIcon({
  name: 'launcher:gcs-file-icon',
  svgstr: gcsFileIcon
});
const iconGcsSearch = new LabIcon({
  name: 'launcher:gcs-search-icon',
  svgstr: gcsSearchIcon
});

const GcsBucketComponent = (): JSX.Element => {
  const [bucketsList, setBucketsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [gcsFolderPath, setGcsFolderPath] = useState<string[]>([]);

  const data = React.useMemo(() => bucketsList, [bucketsList]);
  const columns = React.useMemo(
    () => [
      {
        Header: 'Name',
        accessor: 'name'
      },
      {
        Header: 'Last Modified',
        accessor: 'lastModified'
      }
    ],
    []
  );

  const handleFolderPath = (folderName: string) => {
    let folderPath = gcsFolderPath;
    let positionAt = folderPath.indexOf(folderName);
    folderPath = folderPath.slice(0, positionAt + 1);
    console.log(folderPath);
    setGcsFolderPath(folderPath);
    listBucketsAPI();
  };

  const handleAddFolderPath = (folderName: string) => {
    let folderPath = gcsFolderPath;
    folderPath.push(folderName);
    console.log(folderPath);
    setGcsFolderPath(folderPath);
    listBucketsAPI();
  };

  const handleFileClick = async(fileName: string) => {
    console.log(fileName);
    const credentials = await authApi();
    if (credentials) {
    let apiURL = `${GCS_URL}/${gcsFolderPath[0]}/o/${fileName}?alt=media`;
      fetch(apiURL, {
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token
        }
      })
        .then((response: any) => {
          console.log(response);
          // console.log(response.text(), response.json());
          setIsLoading(false);
          response
            .text()
            .then((responseResult: any) => {
              console.log(responseResult);
              setIsLoading(false);
            })
            .catch((e: any) => {
              console.log(e);
              setIsLoading(false);
            });
        })
        .catch((err: any) => {
          console.error('Error listing batches', err);
        });
      }
  };

  const tableDataCondition = (cell: any) => {
    if (cell.column.Header === 'Name') {
      let nameIndex = gcsFolderPath.length === 0 ? 0 : gcsFolderPath.length - 1;
      return (
        <td
          {...cell.getCellProps()}
          className="gcs-name-field"
          onClick={() =>
            (cell.value.includes('/') &&
              cell.value.split('/').length - 1 !== nameIndex) ||
            gcsFolderPath.length === 0
              ? handleAddFolderPath(cell.value.split('/')[nameIndex])
              : handleFileClick(cell.value)
          }
        >
          <div key="Status" className="gcs-object-name">
            {(cell.value.includes('/') &&
              cell.value.split('/').length - 1 !== nameIndex) ||
            gcsFolderPath.length === 0 ? (
              <iconGcsFolder.react tag="div" />
            ) : (
              <iconGcsFile.react tag="div" />
            )}
            <div className="gcs-name-file-folder">
              {cell.value.split('/')[nameIndex]}
            </div>
          </div>
        </td>
      );
    } else {
      return (
        <td {...cell.getCellProps()} className="gcs-modified-date">
          {cell.render('Cell')}
        </td>
      );
    }
  };

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    state,
    //@ts-ignore
    preGlobalFilteredRows,
    //@ts-ignore
    setGlobalFilter
  } =
    // @ts-ignore
    useTable({ columns, data }, useGlobalFilter);

  const listBucketsAPI = async () => {
    const credentials = await authApi();
    if (credentials) {
      let prefixList = '';
      console.log(gcsFolderPath);
      gcsFolderPath.length > 1 &&
        gcsFolderPath.slice(1).forEach((folderName: string) => {
          if (prefixList === '') {
            prefixList = prefixList + folderName;
          } else {
            prefixList = prefixList + '/' + folderName;
          }
        });
      let apiURL =
        gcsFolderPath.length === 0
          ? `${GCS_URL}?project=${credentials.project_id}`
          : gcsFolderPath.length === 1
          ? `${GCS_URL}/${gcsFolderPath[0]}/o`
          : `${GCS_URL}/${gcsFolderPath[0]}/o?prefix=${prefixList}`;
      fetch(apiURL, {
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token
        }
      })
        .then((response: any) => {
          response
            .json()
            .then((responseResult: any) => {
              let sortedResponse = responseResult.items
                .sort((itemOne: any, itemTwo: any) =>
                  itemOne.updated < itemTwo.updated ? -1 : 1
                )
              console.log(sortedResponse);
              let transformBucketsData = [];
              transformBucketsData = sortedResponse.map((data: any) => {
                const updatedDate = new Date(data.updated);
                const lastModified = lastModifiedFormat(updatedDate);
                return {
                  name: data.name,
                  lastModified: lastModified,
                  folderName:
                    gcsFolderPath.length > 0
                      ? data.name.split('/')[gcsFolderPath.length - 1]
                      : data.name
                };
              });
              console.log(transformBucketsData);
              let finalBucketsData = [];
              finalBucketsData = [
                ...new Map(
                  transformBucketsData.map((item: any) => [
                    item['folderName'],
                    item
                  ])
                ).values()
              ];
              finalBucketsData = finalBucketsData
                .sort((itemOne: any, itemTwo: any) =>
                  itemOne.folderName < itemTwo.folderName ? -1 : 1
                )
              console.log(finalBucketsData);
              //@ts-ignore
              setBucketsList(finalBucketsData);
              setIsLoading(false);
            })
            .catch((e: any) => {
              console.log(e);
              setIsLoading(false);
            });
        })
        .catch((err: any) => {
          console.error('Error listing batches', err);
        });
    }
  };

  useEffect(() => {
    listBucketsAPI();
    console.log(gcsFolderPath);
  }, [gcsFolderPath]);

  return (
    <>
      <div className="gcs-panel-parent">
        <div className="gcs-panel-header">
          <div className="gcs-panel-title">Google Cloud Storage</div>
          <div onClick={() => listBucketsAPI()}>
            <iconGcsRefresh.react tag="div" className="gcs-title-icons" />
          </div>
          <iconGcsFolderNew.react tag="div" className="gcs-title-icons" />
          <iconGcsUpload.react tag="div" className="gcs-title-icons" />
        </div>
        <div className="gcs-filter-overlay">
          <div className="filter-cluster-icon">
            <iconGcsSearch.react tag="div" />
          </div>
          <div className="filter-cluster-text"></div>
          <div className="filter-cluster-section">
            <GlobalFilter
              preGlobalFilteredRows={preGlobalFilteredRows}
              //@ts-ignore
              globalFilter={state.globalFilter}
              setGlobalFilter={setGlobalFilter}
              listBucketsAPI={listBucketsAPI}
              gcsBucket={true}
            />
          </div>
        </div>
        <div className="gcs-folder-path-parent">
          <div style={{ display: 'flex' }}>
            <div onClick={() => setGcsFolderPath([])}>
              <iconGcsFolder.react tag="div" />
            </div>
            <div className="divider"> / </div>
          </div>
          {gcsFolderPath.length > 0 &&
            gcsFolderPath.map(folder => {
              return (
                <div style={{ display: 'flex' }}>
                  <div onClick={() => handleFolderPath(folder)}>{folder}</div>
                  <div className="divider"> / </div>
                </div>
              );
            })}
        </div>
        <div className="gcs-file-list-data">
          <TableData
            getTableProps={getTableProps}
            headerGroups={headerGroups}
            getTableBodyProps={getTableBodyProps}
            isLoading={isLoading}
            rows={rows}
            prepareRow={prepareRow}
            tableDataCondition={tableDataCondition}
            fromPage="Buckets"
          />
        </div>
      </div>
    </>
  );
};

export class GcsBucket extends ReactWidget {
  menu: any;
  constructor() {
    super();
    this.addClass('jp-ReactWidget');
  }

  render(): JSX.Element {
    return <GcsBucketComponent />;
  }
}