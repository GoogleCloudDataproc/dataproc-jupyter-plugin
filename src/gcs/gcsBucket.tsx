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

import { ReactWidget } from '@jupyterlab/apputils';
import { JupyterLab } from '@jupyterlab/application';
import React, { useState, useEffect, useRef } from 'react';
import { LabIcon } from '@jupyterlab/ui-components';
import { useTable, useGlobalFilter, Cell } from 'react-table';
import gcsFolderNewIcon from '../../style/icons/gcs_folder_new_icon.svg';
import gcsFolderIcon from '../../style/icons/gcs_folder_icon.svg';
import gcsFileIcon from '../../style/icons/gcs_file_icon.svg';
import gcsUploadIcon from '../../style/icons/gcs_upload_icon.svg';
import {
  authApi,
  lastModifiedFormat,
  toastifyCustomStyle
} from '../utils/utils';
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  GCS_UPLOAD_URL,
  GCS_URL
} from '../utils/const';
import TableData from '../utils/tableData';

import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import PollingTimer from '../utils/pollingTimer';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as path from 'path';
import { IconButton, InputAdornment, TextField } from '@mui/material';

import searchIcon from '../../style/icons/search_icon.svg';
import searchClearIcon from '../../style/icons/search_clear_icon.svg';

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

const iconSearch = new LabIcon({
  name: 'launcher:search-icon',
  svgstr: searchIcon
});
const iconSearchClear = new LabIcon({
  name: 'launcher:search-clear-icon',
  svgstr: searchClearIcon
});

const GcsBucketComponent = ({
  app,
  factory
}: {
  app: JupyterLab;
  factory: IFileBrowserFactory;
}): JSX.Element => {
  const [searchTerm, setSearchTerm] = useState('');

  const inputFile = useRef<HTMLInputElement | null>(null);
  const [bucketsList, setBucketsList] = useState([]);
  const [bucketsListUpdate, setBucketsListUpdate] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [gcsFolderPath, setGcsFolderPath] = useState<string[]>([]);

  const [folderName, setFolderName] = useState<string | undefined>(
    'Untitled Folder'
  );
  const [folderCreated, setFolderCreated] = useState(true);

  const [folderNameNew, setFolderNameNew] = useState('Untitled Folder');

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

  const data = React.useMemo(() => bucketsListUpdate, [bucketsListUpdate]);
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

  const handleGCSpath = () => {
    setGcsFolderPath([]);
  };

  const handleFolderPath = (folderName: string) => {
    let folderPath = gcsFolderPath;
    let positionAt = folderPath.indexOf(folderName);
    folderPath = folderPath.slice(0, positionAt + 1);
    setGcsFolderPath(folderPath);
  };

  const handleAddFolderPath = (folderName: string) => {
    let folderPath = gcsFolderPath;
    folderPath.push(folderName);
    setGcsFolderPath(folderPath);
    listBucketsAPI();
  };

  const handleFileClick = async (fileName: string) => {
    let editedFileName = fileName.replace(/\//g, '%2F');
    const credentials = await authApi();
    if (credentials) {
      let apiURL = `${GCS_URL}/${gcsFolderPath[0]}/o/${editedFileName}?alt=media`;
      fetch(apiURL, {
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token
        }
      })
        .then((response: Response) => {
          setIsLoading(false);
          response
            .text()
            .then(async (responseResult: unknown) => {
              // Get the contents manager to save the file
              const contentsManager = app.serviceManager.contents;

              // Define the path to the 'gcsTemp' folder within the local application directory
              const gcsTempFolderPath = `${path.sep}gcsTemp`;

              try {
                // Check if the 'gcsTemp' folder exists
                await contentsManager.get(gcsTempFolderPath);
              } catch (error) {
                // The folder does not exist; create it
                await contentsManager.save(gcsTempFolderPath, {
                  type: 'directory'
                });
              }

              // Replace 'path/to/save/file.txt' with the desired path and filename
              const filePath = `.${gcsTempFolderPath}${path.sep}${editedFileName}`;

              // Remove any existing event handlers before adding a new one
              contentsManager.fileChanged.disconnect(handleFileChangeConnect);

              // Function to handle the fileChanged event
              async function handleFileChangeConnect(_: any, change: any) {
                const response = await contentsManager.get(filePath);
                if (change.type === 'save') {
                  // Call your function when a file is saved
                  handleFileSave(change.newValue, response.content);
                }
              }

              // Listen for the fileChanged event
              contentsManager.fileChanged.connect(handleFileChangeConnect);

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

              setIsLoading(false);
            })
            .catch((e: Error) => {
              console.log(e);
              setIsLoading(false);
            });
        })
        .catch((err: Error) => {
          console.error('Failed to fetch file information', err);
          toast.error(`Failed to fetch file information`, toastifyCustomStyle);
        });
    }
  };

  const tableDataCondition = (cell: Cell) => {
    let nameIndex = gcsFolderPath.length === 0 ? 0 : gcsFolderPath.length - 1;
    if (cell.column.Header === 'Name') {
      return (
        <td
          {...cell.getCellProps()}
          className="gcs-name-field"
          onDoubleClick={() =>
            cell.value.split('/')[nameIndex] !== folderNameNew || folderCreated
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
              <iconGcsFolder.react tag="div" className="logo-alignment-style" />
            ) : (
              <iconGcsFile.react tag="div" className="logo-alignment-style" />
            )}
            {cell.value.split('/')[nameIndex] === folderNameNew &&
            !folderCreated ? (
              <input
                value={folderName}
                onFocus={e => e.target.select()}
                className="input-folder-name-style"
                onChange={e => setFolderName(e.target.value)}
                autoFocus={true}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    createFolderAPI();
                  }
                }}
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
  };
  interface IFileDetail {
    name: string;
    mimetype: string;
  }
  const handleFileSave = async (fileDetail: IFileDetail, content: string) => {
    // Create a Blob object from the content and metadata
    const blob = new Blob([content], { type: fileDetail.mimetype });

    // Create a File object
    const filePayload = new File([blob], fileDetail.name, {
      type: fileDetail.mimetype
    });

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
      let newFileName = fileDetail.name;

      fetch(`${GCS_UPLOAD_URL}/${gcsFolderPath[0]}/o?name=${newFileName}`, {
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
          console.error('Failed to upload file information', err);
          toast.error(`Failed to upload file information`, toastifyCustomStyle);
        });
    }
  };

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    //@ts-ignore
    preGlobalFilteredRows,
    //@ts-ignore
    setGlobalFilter
  } =
    // @ts-ignore
    useTable({ columns, data }, useGlobalFilter);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    let updatedList = bucketsList.filter((item: IBucketItem) => {
      return item.folderName.includes(event.target.value);
    });
    if (event.target.value === '') {
      setPollingDisable(false);
    } else {
      setPollingDisable(true);
    }
    setBucketsListUpdate(updatedList);
    setSearchTerm(event.target.value);
    listBucketsAPI();
  };

  const handleSearchClear = () => {
    setSearchTerm('');
    setBucketsListUpdate(bucketsList);
    setPollingDisable(false);
  };

  interface IBucketItem {
    updated: string;
    items: any;
    name: string;
    lastModified: string;
    folderName: string;
  }
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
          : `${GCS_URL}/${gcsFolderPath[0]}/o?prefix=${prefixList}/`;
      fetch(apiURL, {
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token
        }
      })
        .then((response: Response) => {
          response
            .json()
            .then((responseResult: IBucketItem) => {
              let sortedResponse = responseResult.items.sort(
                (itemOne: IBucketItem, itemTwo: IBucketItem) =>
                  itemOne.updated < itemTwo.updated ? -1 : 1
              );
              let transformBucketsData = [];
              transformBucketsData = sortedResponse.map((data: {updated : Date, name: string}) => {
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
              transformBucketsData = transformBucketsData.filter(
                (data: {folderName : string}) => {
                  return data.folderName !== '';
                }
              );
              let finalBucketsData = [];
              finalBucketsData = [
                ...new Map(
                  transformBucketsData.map((item: {folderName: string}) => [
                    item['folderName'],
                    item
                  ])
                ).values()
              ];
              finalBucketsData = finalBucketsData.sort(
                (itemOne: any, itemTwo: any) =>
                  itemOne.folderName < itemTwo.folderName ? -1 : 1
              );
              finalBucketsData = finalBucketsData.filter((item: any) => {
                return item.folderName.includes(searchTerm);
              });
              //@ts-ignore
              setBucketsList(finalBucketsData);
              //@ts-ignore
              setBucketsListUpdate(finalBucketsData);
              setIsLoading(false);
            })
            .catch((e: Error) => {
              console.log(e);
              setIsLoading(false);
            });
        })
        .catch((err: Error) => {
          console.error('Failed to get buckets/objects list', err);
          toast.error(
            `Failed to get buckets/objects list`,
            toastifyCustomStyle
          );
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
    if (folderCreated) {
      pollingGCSlist(listBucketsAPI, true);
      const currentTime = new Date();
      const lastModified = lastModifiedFormat(currentTime);

      let datalist: any = [...bucketsList];
      let existingUntitled = 0;
      datalist.forEach((data: {folderName: string}) => {
        if (data.folderName.includes('Untitled Folder')) {
          existingUntitled = existingUntitled + 1;
        }
      });
      let newFolderData;
      let folderNameConcat;

      let prefixList = '';
      gcsFolderPath.length > 1 &&
        gcsFolderPath.slice(1).forEach((folderName: string) => {
          if (prefixList === '') {
            prefixList = prefixList + folderName;
          } else {
            prefixList = prefixList + '/' + folderName;
          }
        });

      if (existingUntitled === 0 || datalist.length === 0) {
        let nameNewFolder = 'Untitled Folder/';
        if (prefixList !== '') {
          nameNewFolder = prefixList + '/' + 'Untitled Folder/';
        }
        newFolderData = {
          name: nameNewFolder,
          lastModified: lastModified,
          folderName: 'Untitled Folder'
        };
      } else {
        folderNameConcat = 'Untitled Folder ' + existingUntitled;
        let nameNewFolder = folderNameConcat + '/';
        if (prefixList !== '') {
          nameNewFolder = prefixList + '/' + folderNameConcat + '/';
        }
        newFolderData = {
          name: nameNewFolder,
          lastModified: lastModified,
          folderName: folderNameConcat
        };
      }

      setFolderName(newFolderData.folderName);
      setFolderNameNew(newFolderData.folderName);
      datalist.unshift(newFolderData);
      setFolderCreated(false);
      setBucketsList(datalist);
      setBucketsListUpdate(datalist);
    }
  };

  const createFolderAPI = async () => {
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
      let newFolderName = folderName;
      if (prefixList !== '') {
        newFolderName = prefixList + '/' + folderName;
      }
      fetch(`${GCS_UPLOAD_URL}/${gcsFolderPath[0]}/o?name=${newFolderName}/`, {
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
            toast.success(
              `Folder ${folderName} successfully created`,
              toastifyCustomStyle
            );
            listBucketsAPI();
          } else {
            const errorResponse = await response.json();
            pollingGCSlist(listBucketsAPI, false);
            console.log(errorResponse);
          }
        })
        .catch((err: Error) => {
          console.error('Failed to create folder', err);
          toast.error(`Failed to create folder`, toastifyCustomStyle);
        });
    }
    setFolderCreated(true);
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
      let prefixList = '';
      gcsFolderPath.length > 1 &&
        gcsFolderPath.slice(1).forEach((folderName: string) => {
          if (prefixList === '') {
            prefixList = prefixList + folderName;
          } else {
            prefixList = prefixList + '/' + folderName;
          }
        });
      let newFileName = inputFile.current?.files?.[0].name;
      if (prefixList !== '') {
        newFileName = prefixList + '/' + inputFile.current?.files?.[0].name;
      }
      fetch(`${GCS_UPLOAD_URL}/${gcsFolderPath[0]}/o?name=${newFileName}`, {
        method: 'POST',
        body: payload,
        headers: {
          'Content-Type': payload.type,
          Authorization: API_HEADER_BEARER + credentials.access_token
        }
      })
        .then(async (response: Response) => {
          if (response.ok) {
            const responseResult = await response.json();
            toast.success(
              `File ${inputFile.current?.files?.[0].name} successfully uploaded`,
              toastifyCustomStyle
            );
            console.log(responseResult);
            listBucketsAPI();
          } else {
            const errorResponse = await response.json();
            console.log(errorResponse);
          }
        })
        .catch((err: Error) => {
          console.error('Failed to upload file', err);
          toast.error(`Failed to upload file`, toastifyCustomStyle);
        });
    }
  };

  return (
    <>
      <div className="gcs-panel-parent">
        <div className="gcs-panel-header">
          <div className="gcs-panel-title">Google Cloud Storage</div>
          {gcsFolderPath.length > 0 && (
            <div
              onClick={() => createNewItem()}
              className="gcs-create-new-icon"
            >
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
        <div className="gcs-search-field">
          <TextField
            placeholder="Filter files by name"
            type="text"
            variant="outlined"
            fullWidth
            size="small"
            onChange={handleSearch}
            value={searchTerm}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <iconSearch.react
                    tag="div"
                    className="logo-alignment-style"
                  />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={handleSearchClear}
                >
                  <iconSearchClear.react
                    tag="div"
                    className="logo-alignment-style search-clear-icon"
                  />
                </IconButton>
              )
            }}
          />
        </div>
        <div className="gcs-folder-path-parent">
          <div style={{ display: 'flex' }}>
            <div
              onClick={() => handleGCSpath()}
              className="logo-alignment-style"
            >
              <iconGcsFolder.react tag="div" className="logo-alignment-style" />
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
