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

import { JupyterLab } from '@jupyterlab/application';
import React, { useState, useEffect, useRef } from 'react';
import { LabIcon } from '@jupyterlab/ui-components';
import { useTable, useGlobalFilter, Cell } from 'react-table';
import gcsFolderNewIcon from '../../style/icons/gcs_folder_new_icon.svg';
import gcsFolderIcon from '../../style/icons/gcs_folder_icon.svg';
import gcsFileIcon from '../../style/icons/gcs_file_icon.svg';
import gcsUploadIcon from '../../style/icons/gcs_upload_icon.svg';
import gcsRefreshIcon from '../../style/icons/gcs_refresh_icon.svg';
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
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as path from 'path';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import { IThemeManager } from '@jupyterlab/apputils';
import searchIcon from '../../style/icons/search_icon.svg';
import searchClearIcon from '../../style/icons/search_clear_icon.svg';
import { DataprocWidget } from '../controls/DataprocWidget';
import darkSearchIcon from '../../style/icons/search_icon_dark.svg';
import darkSearchClearIcon from '../../style/icons/dark_search_clear_icon.svg';
import darkGcsFileIcon from '../../style/icons/gcs_file_icon_dark.svg';
import darkGcsFolderIcon from '../../style/icons/gcs_folder_icon_dark.svg';

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

const darkIconSearchClear = new LabIcon({
  name: 'launcher:dark-search-clear-icon',
  svgstr: darkSearchClearIcon
});
const darkIconSearch = new LabIcon({
  name: 'launcher:dark-search-icon',
  svgstr: darkSearchIcon
});
const darkIconGcsFile = new LabIcon({
  name: 'launcher:dark-gcs-file-icon',
  svgstr: darkGcsFileIcon
});
const darkIconGcsFolder = new LabIcon({
  name: 'launcher:dark-gcs-folder-icon',
  svgstr: darkGcsFolderIcon
});

const GcsBucketComponent = ({
  app,
  factory,
  themeManager
}: {
  app: JupyterLab;
  factory: IFileBrowserFactory;
  themeManager: IThemeManager;
}): JSX.Element => {
  const isDarkTheme = !themeManager.isLight(themeManager.theme!);
  const iconSearch = isDarkTheme
    ? darkIconSearch
    : new LabIcon({
        name: 'launcher:search-icon',
        svgstr: searchIcon
      });
  const iconSearchClear = isDarkTheme
    ? darkIconSearchClear
    : new LabIcon({
        name: 'launcher:search-clear-icon',
        svgstr: searchClearIcon
      });
  const iconGcsFile = isDarkTheme
    ? darkIconGcsFile
    : new LabIcon({
        name: 'launcher:gcs-file-icon',
        svgstr: gcsFileIcon
      });
  const iconGcsFolder = isDarkTheme
    ? darkIconGcsFolder
    : new LabIcon({
        name: 'launcher:gcs-folder-icon',
        svgstr: gcsFolderIcon
      });
  const [searchTerm, setSearchTerm] = useState('');
  const inputFile = useRef<HTMLInputElement | null>(null);
  const [bucketsList, setBucketsList] = useState([]);
  const [bucketsListUpdate, setBucketsListUpdate] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [gcsFolderPath, setGcsFolderPath] = useState<string[]>([]);
  const [bucketsObjectsList, setBucketsObjectsList] = useState([]);

  const [folderName, setFolderName] = useState<string | undefined>(
    'Untitled Folder'
  );
  const [folderCreated, setFolderCreated] = useState(true);

  const [folderNameNew, setFolderNameNew] = useState('Untitled Folder');

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
    let localFileName = fileName.replace(/\//g, '_');
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
              const filePath = `.${gcsTempFolderPath}${path.sep}${localFileName}`;

              // // Remove any existing event handlers before adding a new one
              // contentsManager.fileChanged.disconnect(handleFileChangeConnect);

              // // Function to handle the fileChanged event
              // async function handleFileChangeConnect(_: any, change: any) {
              //   const response = await contentsManager.get(filePath);
              //   if (change.type === 'save') {
              //     // Call your function when a file is saved
              //     handleFileSave(change.newValue, response.content);
              //   }
              // }

              // // Listen for the fileChanged event
              // contentsManager.fileChanged.connect(handleFileChangeConnect);

              // Save the file to the workspace
              await contentsManager.save(filePath, {
                type: 'file',
                format: 'text',
                content: responseResult
              });

              // // Refresh the file browser to reflect the new file
              // app.shell.currentWidget?.update();

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
    type: string;
    name: string;
    mimetype: string;
  }
  const handleFileSave = async (fileDetail: IFileDetail, content: string) => {
    // Create a Blob object from the content and metadata
    let fileContent =
      fileDetail.type === 'notebook' ? JSON.stringify(content) : content;
    const blob = new Blob([fileContent], { type: fileDetail.mimetype });

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

  console.debug(handleFileSave)

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
    setBucketsListUpdate(updatedList);
    setSearchTerm(event.target.value);
  };

  const handleSearchClear = () => {
    setSearchTerm('');
    setBucketsListUpdate(bucketsList);
  };

  interface IBucketItem {
    updated: string;
    items: any;
    name: string;
    lastModified: string;
    folderName: string;
  }
  const listBucketsAPI = async () => {
    setIsLoading(true);
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
                  itemOne.name < itemTwo.name ? -1 : 1
              );
              let transformBucketsData = [];
              transformBucketsData = sortedResponse.map(
                (data: { updated: Date; name: string }) => {
                  const updatedDate = new Date(data.updated);
                  const lastModified = lastModifiedFormat(updatedDate);
                  return {
                    name: data.name.trim(),
                    lastModified: lastModified,
                    folderName:
                      gcsFolderPath.length > 0
                        ? data.name.split('/')[gcsFolderPath.length - 1]
                        : data.name
                  };
                }
              );
              transformBucketsData = transformBucketsData.filter(
                (data: { folderName: string }) => {
                  return data.folderName !== '';
                }
              );
              let finalBucketsData: any[] | ((prevState: never[]) => never[]) =
                [];
              finalBucketsData = [
                ...new Map(
                  transformBucketsData.map((item: { folderName: string }) => [
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
              finalBucketsData = finalBucketsData.sort(
                (itemOne: { name: string }, itemTwo: { name: string }) => {
                  const nameOne = itemOne.name.toLowerCase();
                  const nameTwo = itemTwo.name.toLowerCase();

                  // Define your condition here
                  const condition = '/';

                  const endsWithConditionOne = nameOne.endsWith(condition);
                  const endsWithConditionTwo = nameTwo.endsWith(condition);

                  if (endsWithConditionOne && !endsWithConditionTwo) {
                    return -1; // itemOne should come first
                  } else if (!endsWithConditionOne && endsWithConditionTwo) {
                    return 1; // itemTwo should come first
                  } else if (
                    nameOne.includes(condition) &&
                    !nameTwo.includes(condition)
                  ) {
                    return -1; // itemOne should come first if it contains "/"
                  } else if (
                    !nameOne.includes(condition) &&
                    nameTwo.includes(condition)
                  ) {
                    return 1; // itemTwo should come first if it contains "/"
                  } else {
                    return nameOne.localeCompare(nameTwo);
                  }
                }
              );

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
  }, [gcsFolderPath]);

  const createNewItem = async () => {
    if (folderCreated) {
      const currentTime = new Date();
      const lastModified = lastModifiedFormat(currentTime);

      let datalist: any = [...bucketsList];
      let existingUntitled = 0;
      setBucketsObjectsList(bucketsList);
      datalist.forEach((data: { folderName: string }) => {
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

      // Check if a folder with the same name already exists
      const folderExists = bucketsObjectsList.some((item: IBucketItem) => {
        console.log(folderName, item.folderName);
        return item.folderName === folderName;
      });
      console.log(folderExists, bucketsObjectsList);

      if (!folderExists) {
        fetch(
          `${GCS_UPLOAD_URL}/${gcsFolderPath[0]}/o?name=${newFolderName}/`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'Folder',
              Authorization: API_HEADER_BEARER + credentials.access_token
            }
          }
        )
          .then(async (response: Response) => {
            if (response.ok) {
              const responseResult = await response.json();
              console.log(responseResult);
              toast.success(
                `Folder ${folderName} successfully created`,
                toastifyCustomStyle
              );
            
            } else {
              const errorResponse = await response.json();
              console.log(errorResponse);
            }
          })
          .catch((err: Error) => {
            console.error('Failed to create folder', err);
            toast.error(`Failed to create folder`, toastifyCustomStyle);
          });
        setFolderCreated(true);
        listBucketsAPI();
      } else {
        // Display a toast message indicating that the folder already exists

        toast.error(`Folder ${folderName} already exists`, toastifyCustomStyle);
        bucketsList.shift();
        setBucketsList(bucketsList);
        setBucketsListUpdate(bucketsList);
        listBucketsAPI();
        setFolderCreated(true);
      }
    }
  };

  const handleFileChange = () => {
    //@ts-ignore
    inputFile.current.click();
  };

  const fileUploadAction = () => {
    const files = Array.from(inputFile.current?.files || []);

    if (files.length > 0) {
      files.forEach(file => {
        uploadFilesToGCS(files);
      });
    }
  };

  const uploadFilesToGCS = async (files: File[]) => {
    const credentials = await authApi();
    let uploadedCount = 0;
    let failedCount = 0;

    if (credentials) {
      const toastInfo = toast.info(
        `Uploading ${files.length} file${files.length > 1 ? 's' : ''}`,
        toastifyCustomStyle
      );

      for (const file of files) {
        let prefixList = '';
        gcsFolderPath.length > 1 &&
          gcsFolderPath.slice(1).forEach((folderName: string) => {
            if (prefixList === '') {
              prefixList = prefixList + folderName;
            } else {
              prefixList = prefixList + '/' + folderName;
            }
          });
        let newFileName = file.name;
        if (prefixList !== '') {
          newFileName = prefixList + '/' + file.name;
        }

        try {
          const response = await fetch(
            `${GCS_UPLOAD_URL}/${gcsFolderPath[0]}/o?name=${newFileName}`,
            {
              method: 'POST',
              body: file,
              headers: {
                'Content-Type': file.type,
                Authorization: API_HEADER_BEARER + credentials.access_token
              }
            }
          );

          if (response.ok) {
            uploadedCount++;
          } else {
            failedCount++;
          }
        } catch (err) {
          console.error('Upload failed', err);
          failedCount++;
        }
      }
      toast.dismiss(toastInfo);
      // Display toast messages after all files have been processed

      setTimeout(() => {
        // Display success toast if any files were uploaded
        if (uploadedCount > 0) {
          toast.success(
            `${uploadedCount} file${
              uploadedCount > 1 ? 's' : ''
            } uploaded successfully`,
            toastifyCustomStyle
          );
        }

        if (failedCount > 0) {
          toast.error(
            `Failed to upload ${failedCount} file${failedCount > 1 ? 's' : ''}`,
            toastifyCustomStyle
          );
        }
      }, 2000);
      // Refresh the file list
      listBucketsAPI();
    }
  };

  return (
    <>
      <div className="gcs-panel-parent">
        <div className="gcs-panel-header">
          <div className="gcs-panel-title">Google Cloud Storage</div>
          <div onClick={() => listBucketsAPI()} role="button">
            <iconGcsRefresh.react tag="div" className="gcs-title-icons" />
          </div>
          {gcsFolderPath.length > 0 && (
            <div
              onClick={() => createNewItem()}
              className="gcs-create-new-icon"
              role="button"
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
                multiple
              />
              <div onClick={handleFileChange} role="button">
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
            fromPage=""
          />
        </div>
      </div>
    </>
  );
};

export class GcsBucket extends DataprocWidget {
  app: JupyterLab;
  factory: IFileBrowserFactory;
  themeManager!: IThemeManager;

  constructor(
    app: JupyterLab,
    factory: IFileBrowserFactory,
    themeManager: IThemeManager
  ) {
    super(themeManager);
    this.app = app;
    this.factory = factory;
  }

  renderInternal(): JSX.Element {
    return (
      <GcsBucketComponent
        app={this.app}
        factory={this.factory}
        themeManager={this.themeManager}
      />
    );
  }
}
