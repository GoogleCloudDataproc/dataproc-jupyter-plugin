import { ReactWidget } from '@jupyterlab/apputils';
import { JupyterLab } from '@jupyterlab/application';
import React, { useState, useEffect, useRef } from 'react';
import { LabIcon } from '@jupyterlab/ui-components';
import { useTable, useGlobalFilter } from 'react-table';
// import gcsRefreshIcon from '../../style/icons/gcs_refresh_icon.svg';
import gcsFolderNewIcon from '../../style/icons/gcs_folder_new_icon.svg';
import gcsFolderIcon from '../../style/icons/gcs_folder_icon.svg';
import gcsFileIcon from '../../style/icons/gcs_file_icon.svg';
import gcsUploadIcon from '../../style/icons/gcs_upload_icon.svg';
import gcsSearchIcon from '../../style/icons/gcs_search_icon.svg';
import { authApi, lastModifiedFormat } from '../utils/utils';
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  GCS_UPLOAD_URL,
  GCS_URL
} from '../utils/const';
import GlobalFilter from '../utils/globalFilter';
import TableData from '../utils/tableData';

import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import PollingTimer from '../utils/pollingTimer';

// const iconGcsRefresh = new LabIcon({
//   name: 'launcher:gcs-refresh-icon',
//   svgstr: gcsRefreshIcon
// });
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

const GcsBucketComponent = ({
  app,
  factory
}: {
  app: JupyterLab;
  factory: IFileBrowserFactory;
}): JSX.Element => {
  const inputFile = useRef<HTMLInputElement | null>(null);
  const [bucketsList, setBucketsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [gcsFolderPath, setGcsFolderPath] = useState<string[]>([]);

  const [folderName, setFolderName] = useState('Untitled Folder');
  const [folderCreateDone, setFolderCreateDone] = useState(true);

  const [pollingDisable, setPollingDisable] = useState(false);
  const timer = useRef<NodeJS.Timeout | undefined>(undefined);

  const pollingGCSlist = async (
    pollingFunction: () => void,
    pollingDisable: boolean
  ) => {
    timer.current = PollingTimer(
      pollingFunction,
      pollingDisable,
      timer.current
    );
  };

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
    setGcsFolderPath(folderPath);
    listBucketsAPI();
  };

  const handleAddFolderPath = (folderName: string) => {
    let folderPath = gcsFolderPath;
    folderPath.push(folderName);
    setGcsFolderPath(folderPath);
    listBucketsAPI();
  };

  const handleFileClick = async (fileName: string) => {
    console.log('handle file click');
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
          setIsLoading(false);
          response
            .text()
            .then(async (responseResult: any) => {
              // Replace 'path/to/save/file.txt' with the desired path and filename
              // const filePath = `/Users/jeyaprakashn/.jupyter/lab/workspaces/`;
              const filePath = `src/gcs/${fileName}`;

              // Get the contents manager to save the file
              const contentsManager = app.serviceManager.contents;

              // Listen for the fileChanged event
              contentsManager.fileChanged.connect(async (_, change: any) => {
                const response = await contentsManager.get(filePath);
                if (change.type === 'save') {
                  // Call your function when a file is saved
                  handleFileSave(change.newValue, response.content);
                }
              });

              // Save the file to the workspace
              await contentsManager.save(filePath, {
                type: 'file',
                format: 'text',
                content: responseResult
              });

              // Refresh the file browser to reflect the new file
              app.shell.currentWidget?.update();

              app.commands.execute('docmanager:open', {
                path: filePath
              });

              // contentsManager.delete(fileName)

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
    if (cell.row.original.folderName !== '') {
      if (cell.column.Header === 'Name') {
        let nameIndex =
          gcsFolderPath.length === 0 ? 0 : gcsFolderPath.length - 1;
        return (
          <td
            {...cell.getCellProps()}
            className="gcs-name-field"
            onClick={() =>
              cell.value.split('/')[nameIndex] !== 'Untitled Folder' || folderCreateDone 
                ? (cell.value.includes('/') &&
                    cell.value.split('/').length - 1 !== nameIndex) ||
                  gcsFolderPath.length === 0
                  ? handleAddFolderPath(cell.value.split('/')[nameIndex])
                  : handleFileClick(cell.value)
                : undefined
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
              {cell.value.split('/')[nameIndex] === 'Untitled Folder' && !folderCreateDone ? (
                <input
                  value={folderName}
                  className="input-folder-name-style"
                  onChange={e => setFolderName(e.target.value)}
                  onBlur={() => createFolderAPI()}
                  type="text"
                />
              ) : (
                <div className="gcs-name-file-folder">
                  {cell.value.split('/')[nameIndex]}
                </div>
              )}
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
    }
  };

  const handleFileSave = async (fileDetail: any, content: any) => {
    console.log('file save function');
    // Create a Blob object from the content and metadata
    const blob = new Blob([content], { type: fileDetail.mimetype });

    // Create a File object
    const filePayload = new File([blob], fileDetail.name, {
      type: fileDetail.mimetype
    });

    const credentials = await authApi();
    if (credentials) {
      fetch(`${GCS_UPLOAD_URL}/${gcsFolderPath[0]}/o?name=${fileDetail.name}`, {
        method: 'POST',
        body: filePayload,
        headers: {
          'Content-Type': fileDetail.mimetype,
          Authorization: API_HEADER_BEARER + credentials.access_token
        }
      })
        .then(async (response: Response) => {
          if (response.ok) {
            const responseResult = await response.json();
            console.log(responseResult);
            listBucketsAPI();
          } else {
            const errorResponse = await response.json();
            console.log(errorResponse);
          }
        })
        .catch((err: Error) => {
          console.error('Error Creating template', err);
          // toast.error('Failed to create the template',toastifyCustomStyle);
        });
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
              let sortedResponse = responseResult.items.sort(
                (itemOne: any, itemTwo: any) =>
                  itemOne.updated < itemTwo.updated ? -1 : 1
              );
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
              let finalBucketsData = [];
              finalBucketsData = [
                ...new Map(
                  transformBucketsData.map((item: any) => [
                    item['folderName'],
                    item
                  ])
                ).values()
              ];
              finalBucketsData = finalBucketsData.sort(
                (itemOne: any, itemTwo: any) =>
                  itemOne.folderName < itemTwo.folderName ? -1 : 1
              );
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
    pollingGCSlist(listBucketsAPI, pollingDisable);

    return () => {
      pollingGCSlist(listBucketsAPI, true);
    };
  }, [pollingDisable, gcsFolderPath]);

  const createNewItem = async () => {
    pollingGCSlist(listBucketsAPI, true);
    const currentTime = new Date();
    const lastModified = lastModifiedFormat(currentTime);
    let datalist: any = [...bucketsList];
    const newFolderData = {
      name: 'Untitled Folder/',
      lastModified: lastModified,
      folderName: 'Untitled Folder'
    };
    
    datalist.unshift(newFolderData);
    setFolderCreateDone(false)
    setBucketsList(datalist);

    // createFolderAPI()
    // const { tracker } = factory;
    // const widget = tracker.currentWidget;
    // if (widget) {
    //   return widget.createNewDirectory();
    // }
  };

  const createFolderAPI = async () => {
    const credentials = await authApi();
    if (credentials) {
      fetch(`${GCS_UPLOAD_URL}/${gcsFolderPath[0]}/o?name=${folderName}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'Folder',
          Authorization: API_HEADER_BEARER + credentials.access_token
        }
      })
        .then(async (response: Response) => {
          if (response.ok) {
            const responseResult = await response.json();
            pollingGCSlist(listBucketsAPI, false);
            console.log(responseResult);
            listBucketsAPI();
          } else {
            const errorResponse = await response.json();
            pollingGCSlist(listBucketsAPI, false);
            console.log(errorResponse);
          }
        })
        .catch((err: Error) => {
          console.error('Error Creating template', err);
          // toast.error('Failed to create the template',toastifyCustomStyle);
        });
    }
    setFolderCreateDone(true);
    listBucketsAPI();
  };

  const handleFileChange = () => {
    //@ts-ignore
    inputFile.current.click();
  };

  const fileUploadAction = () => {
    uploadFileToGCS(inputFile.current?.files?.[0]);
  };

  const uploadFileToGCS = async (payload: any) => {
    const credentials = await authApi();
    if (credentials) {
      fetch(
        `${GCS_UPLOAD_URL}/${gcsFolderPath[0]}/o?name=${inputFile.current?.files?.[0].name}`,
        {
          method: 'POST',
          body: payload,
          headers: {
            'Content-Type': payload.type,
            Authorization: API_HEADER_BEARER + credentials.access_token
          }
        }
      )
        .then(async (response: Response) => {
          if (response.ok) {
            const responseResult = await response.json();
            console.log(responseResult);
            listBucketsAPI();
          } else {
            const errorResponse = await response.json();
            console.log(errorResponse);
          }
        })
        .catch((err: Error) => {
          console.error('Error Creating template', err);
          // toast.error('Failed to create the template',toastifyCustomStyle);
        });
    }
  };

  return (
    <>
      <div className="gcs-panel-parent">
        <div className="gcs-panel-header">
          <div className="gcs-panel-title">Google Cloud Storage</div>
          {/* <div onClick={() => listBucketsAPI()}>
            <iconGcsRefresh.react tag="div" className="gcs-title-icons" />
          </div> */}
          {gcsFolderPath.length > 0 && (
            <div onClick={() => createNewItem()}>
              <iconGcsFolderNew.react tag="div" className="gcs-title-icons" />
            </div>
          )}
          {gcsFolderPath.length > 0 && (
            <>
              <input
                type="file"
                id="file"
                ref={inputFile}
                style={{ display: 'none' }}
                onChange={fileUploadAction}
              />
              <div onClick={handleFileChange}>
                <iconGcsUpload.react tag="div" className="gcs-title-icons" />
              </div>
            </>
          )}
        </div>
        <div className="gcs-filter-overlay">
          <div className="filter-cluster-icon">
            <iconGcsSearch.react tag="div" />
          </div>
          <div className="filter-cluster-text"></div>
          <div className="filter-cluster-section">
            <GlobalFilter
              preGlobalFilteredRows={preGlobalFilteredRows}
              globalFilter={state.globalFilter}
              setGlobalFilter={setGlobalFilter}
              setPollingDisable={setPollingDisable}
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
  app: JupyterLab;
  factory: IFileBrowserFactory;

  constructor(app: JupyterLab, factory: IFileBrowserFactory) {
    super();
    this.app = app;
    this.factory = factory;
  }

  render(): JSX.Element {
    return <GcsBucketComponent app={this.app} factory={this.factory} />;
  }
}
