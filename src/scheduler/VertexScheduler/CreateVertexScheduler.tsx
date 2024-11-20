import React, { useEffect, useState } from 'react';
import { Input } from '../../controls/MuiWrappedInput';
import {
  Autocomplete,
  TextField,
  Radio,
  Button,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Typography
} from '@mui/material';
import { IThemeManager } from '@jupyterlab/apputils';
import { JupyterLab } from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import LabelProperties from '../../jobs/labelProperties';
import LearnMore from '../common/LearnMore';
import Scheduler from '../common/Scheduler';
import { RegionDropdown } from '../../controls/RegionDropdown';
import { authApi } from '../../utils/utils';


const CreateVertexScheduler = ({ themeManager,
  app,
  context,
  settingRegistry,
  createCompleted,
  setCreateCompleted, }: {
    themeManager: IThemeManager;
    app: JupyterLab;
    context: any;
    settingRegistry: ISettingRegistry;
    createCompleted: boolean;
    setCreateCompleted: React.Dispatch<React.SetStateAction<boolean>>;
  }) => {

  const [dummyList] = useState([1, 2, 3]);

  const machineDetails = [
    {
      machineType: 'n1-standard-2',
      acceleratorConfigs: [
        {
          acceleratorType: "NVIDIA_TESLA_T4",
          allowedCounts: [
            1,
            2,
            4
          ]
        },
        {
          acceleratorType: "NVIDIA_TESLA_V100",
          allowedCounts: [
            1,
            2,
            4,
            8
          ]
        }
      ],
    },
    {
      machineType: "n1-standard-4",
      acceleratorConfigs: [
        {
          acceleratorType: "NVIDIA_TESLA_T4",
          allowedCounts: [
            1,
            2,
            4
          ]
        },
        {
          acceleratorType: "NVIDIA_TESLA_V100",
          allowedCounts: [
            1,
            2,
            4,
            8
          ]
        }
      ],
    },
    {
      machineType: "n1-standard-5",
    }

  ]
  const [parameterDetail, setParameterDetail] = useState(['']);
  const [parameterDetailUpdated, setParameterDetailUpdated] = useState(['']);
  const [keyValidation, setKeyValidation] = useState(-1);
  const [valueValidation, setValueValidation] = useState(-1);
  const [duplicateKeyError, setDuplicateKeyError] = useState(-1);

  const [kernel] = useState(['python3', 'pytorch', 'tensorflow']);
  const [kernelSelected, setKernelSelected] = useState('');
  const [machineTypeSelected, setMachineTypeSelected] = useState('');
  const [acceleratorType, setAcceleratorType] = useState('');
  const [acceleratedCount, setAcceleratedCount] = useState(null);
  const [networkSelected, setNetworkSelected] = useState('networkInThisProject');
  const [region, setRegion] = useState('');
  const [projectId, setProjectId] = useState('');


  /**
 * Kernel selection
 * @param {string} kernelSelected seleted kernel
 */
  const handleKernel = (kernelValue: any) => {
    setKernelSelected(kernelValue)
  }

  /**
  * Machine Type selection
  * @param {string} machineTypeSelected seleted machine type
  */
  const handleMachineType = (machineType: any) => {
    setMachineTypeSelected(machineType);
  }

  /**
  * Acceleration Type listing
  * @param {Array} acceleratorConfig acceleratorConfigs data
  */
  const getAcceleratedType = (acceleratorConfig: any) => {
    return acceleratorConfig.map((item: any) => item.acceleratorType);
  }

  /**
  * Acceleration Count listing
  * @param {Array} allowedCounts allowedCounts data
  */
  // const getAcceleratedCount = (allowedCounts: any) => {
  //   return allowedCounts.map((item: any) => item.allowedCounts);
  // }

  /**
  * Acceleration Type selection
  * @param {string} acceleratorType accelerationType type selected
  */
  const handleAccelerationType = (acceleratorType: any) => {
    setAcceleratorType(acceleratorType);
  }

  /**
  * Acceleration Count selection
  * @param {string} acceleratorCount accelerationType count selected
  */
  const handleAcceleratorCount = (acceleratorCount: any) => {
    setAcceleratedCount(acceleratorCount);
  }

  const handleNetworkSelection = (eventValue: any) => {
    console.log('network', eventValue);
    setNetworkSelected(eventValue.target.value);
  }

  /**
  * Create a job schedule
  */
  // const handleCreateJobScheduler = () => {
  //   const payload = {
  //     //scheduler: string,
  //     //input_filename: string,
  //     //display_name: string,
  //     machine_spec: {
  //       machine_type: machineTypeSelected,
  //       accelerator_type: acceleratorType,
  //       accelerator_count: acceleratedCount
  //     },
  //     kernel_name: kernelSelected,
  //     //schedule_value: string,
  //     //region: string,
  //     //cloud_storage_bucket: string,
  //     //parameters: [

  //     //],
  //     //service_account: string,
  //     //network_spec: {
  //     //enable_internet_access: True, //this will always be true
  //     //network: string,
  //     //subnetwork: string
  //     //}
  //   }
  // }

  useEffect(() => {
    authApi()
      .then((credentials) => {
        if (credentials && credentials?.region_id && credentials.project_id) {
          setRegion(credentials.region_id);
          setProjectId(credentials.project_id);
        }
      })
      .catch((error) => {
        console.error(error);
      });
  }, [projectId]);


  return (
    <>
      {
        createCompleted ?
          <></>
            //VertexScheduledJobs
            // app={app}
            // themeManager={themeManager}
            // settingRegistry={settingRegistry}
            // composerSelectedFromCreate={composerSelected}
            // createCompleted={createCompleted}
            // setCreateCompleted={setCreateCompleted}
           :
          <div className='submit-job-container'>

            <div className="region-overlay create-scheduler-form-element">
              <RegionDropdown
                projectId={projectId}
                region={region}
                onRegionChange={region => setRegion(region)}
              />
            </div>

            <div className="create-scheduler-form-element">
              <Autocomplete
                className="create-scheduler-style"
                options={machineDetails.map(item => item.machineType)}
                value={machineTypeSelected}
                onChange={(_event, val) => handleMachineType(val)}
                renderInput={params => (
                  <TextField {...params} label="Machine type*" />
                )}
              //disabled={editMode}
              />
            </div>

            {
              machineDetails.map(item => {
                if ("acceleratorConfigs" in item && item.machineType === machineTypeSelected) {
                  return (
                    console.log('getAcceleratedType(item.acceleratorConfigs)', getAcceleratedType(item.acceleratorConfigs)),
                    <div className="execution-history-main-wrapper">
                      <div className="create-scheduler-form-element create-scheduler-form-element-input-fl create-pr">
                        <Autocomplete
                          className="create-scheduler-style create-scheduler-form-element-input-fl"
                          options={getAcceleratedType(item.acceleratorConfigs)}
                          value={acceleratorType}
                          onChange={(_event, val) => handleAccelerationType(val)}
                          renderInput={params => (
                            <TextField {...params} label="Accelerator type*" />
                          )}
                        //disabled={editMode}
                        />
                      </div>

                      {
                        item?.acceleratorConfigs?.map(element => {
                          return (
                            console.log("element.allowedCounts", element.allowedCounts),
                            <>
                              {
                                element.acceleratorType === acceleratorType ? <div className="create-scheduler-form-element create-scheduler-form-element-input-fl">
                                  <Autocomplete
                                    className="create-scheduler-style create-scheduler-form-element-input-fl"
                                    options={element.allowedCounts.map(item => item.toString())}
                                    value={acceleratedCount}
                                    onChange={(_event, val) => handleAcceleratorCount(val)}
                                    renderInput={params => (
                                      <TextField {...params} label="Accelerator count*" />
                                    )}
                                  //disabled={editMode}
                                  />
                                </div> : null
                              }
                            </>
                          )
                        })
                      }

                    </div>
                  )
                }
              })
            }


            <div className="create-scheduler-form-element">
              <Autocomplete
                className="create-scheduler-style"
                options={kernel}
                value={kernelSelected}
                onChange={(_event, val) => handleKernel(val)}
                renderInput={params => (
                  <TextField {...params} label="Kernel*" />
                )}
              //disabled={editMode}
              />
            </div>

            <div className="create-scheduler-form-element">
              <Autocomplete
                className="create-scheduler-style"
                options={dummyList}
                //value={composerSelected}
                //onChange={(_event, val) => handleComposerSelected(val)}
                renderInput={params => (
                  <TextField {...params} label="Cloud Storage Bucket*" />
                )}
              //disabled={editMode}
              />
            </div>
            <span className="tab-description tab-text-sub-cl">Where results are stored. Select an existing bucket or create a new one.</span>


            <>
              <div className="create-job-scheduler-title sub-title-heading ">
                Parameters
              </div>
              <LabelProperties
                labelDetail={parameterDetail}
                setLabelDetail={setParameterDetail}
                labelDetailUpdated={parameterDetailUpdated}
                setLabelDetailUpdated={setParameterDetailUpdated}
                buttonText="ADD PARAMETER"
                keyValidation={keyValidation}
                setKeyValidation={setKeyValidation}
                valueValidation={valueValidation}
                setValueValidation={setValueValidation}
                duplicateKeyError={duplicateKeyError}
                setDuplicateKeyError={setDuplicateKeyError}
                fromPage="scheduler"
              />
            </>

            <div className="create-scheduler-form-element panel-margin">
              <Autocomplete
                className="create-scheduler-style"
                options={dummyList}
                //value={composerSelected}
                //onChange={(_event, val) => handleComposerSelected(val)}
                renderInput={params => (
                  <TextField {...params} label="Service account" />
                )}
              //disabled={editMode}
              />
            </div>

            <div className="create-job-scheduler-text-para create-job-scheduler-sub-title">
              Network Configuration
            </div>

            <p>Establishes connectivity for VM instances in the cluster</p>

            <div className="create-scheduler-form-element panel-margin">
              <FormControl>
                <RadioGroup
                  aria-labelledby="demo-controlled-radio-buttons-group"
                  name="controlled-radio-buttons-group"
                  value={networkSelected}
                  onChange={handleNetworkSelection}
                >
                  <FormControlLabel
                    value="networkInThisProject"
                    className="create-scheduler-label-style"
                    control={<Radio size="small" />}
                    label={
                      <Typography sx={{ fontSize: 13 }}>
                        Network in this project
                      </Typography>
                    }
                  />
                  <div>
                    <span className="sub-para tab-text-sub-cl">Choose a shared VPC network from the project that is different from the clusters project</span>
                    <LearnMore />
                  </div>
                  <FormControlLabel
                    value="networkShared"
                    className="create-scheduler-label-style"
                    control={<Radio size="small" />}
                    label={
                      <Typography sx={{ fontSize: 13 }}>Network shared from host project</Typography>
                    }
                  />
                  <span className="sub-para tab-text-sub-cl">Choose a shared VPC network from the project that is different from the clusters project</span>
                  <LearnMore />
                </RadioGroup>
              </FormControl>
            </div>

            {/* Network in this project  */}
            {
              networkSelected === 'networkInThisProject' ?
                <>
                  <div className="execution-history-main-wrapper">
                    <div className="create-scheduler-form-element create-scheduler-form-element-input-fl create-pr">
                      <Autocomplete
                        className="create-scheduler-style create-scheduler-form-element-input-fl"
                        options={dummyList}
                        //value={composerSelected}
                        //onChange={(_event, val) => handleComposerSelected(val)}
                        renderInput={params => (
                          <TextField {...params} label="Primary network" />
                        )}
                      //disabled={editMode}
                      />
                    </div>
                    <div className="create-scheduler-form-element create-scheduler-form-element-input-fl">
                      <Autocomplete
                        className="create-scheduler-style create-scheduler-form-element-input-fl"
                        options={dummyList}
                        //value={composerSelected}
                        //onChange={(_event, val) => handleComposerSelected(val)}
                        renderInput={params => (
                          <TextField {...params} label="Sub network" />
                        )}
                      //disabled={editMode}
                      />
                    </div>
                  </div>

                  <div className="create-scheduler-form-element">
                    <Input
                      className="create-scheduler-style"
                      //value={jobNameSelected}
                      //onChange={e => handleJobNameChange(e)}
                      type="text"
                      placeholder=""
                      Label="Network tags"
                    //disabled={editMode}
                    />
                  </div>
                  <span className="tab-description tab-text-sub-cl">Network tabs are text attributes you can add to make firewall rules and routes applicable to specify VM instances</span>
                </> :
                <>
                  {/* Network shared from host project */}
                  <div className="create-scheduler-form-element">
                    <Autocomplete
                      className="create-scheduler-style"
                      options={dummyList}
                      //value={composerSelected}
                      //onChange={(_event, val) => handleComposerSelected(val)}
                      renderInput={params => (
                        <TextField {...params} label="Share subnetwork" />
                      )}
                    //disabled={editMode}
                    />
                  </div>
                </>
            }

            <Scheduler />

            <div className="save-overlay">
              <Button
                //onClick={
                //() => {
                //   if (!isSaveDisabled()) {
                // handleCreateJobScheduler()}
                //   }
                // }}
                variant="contained"
                //disabled={isSaveDisabled()}
                aria-label='Create Schedule'
              >
                <div>
                  Create
                </div>
              </Button>
              <Button
                variant="outlined"
                // disabled={creatingScheduler}
                aria-label="cancel Batch"
              //onClick={!creatingScheduler ? handleCancel : undefined}
              >
                <div>CANCEL</div>
              </Button>
            </div>

          </div>


      }



    </>

  );
};

export default CreateVertexScheduler;

