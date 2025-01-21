import dayjs from "dayjs";

export interface IMachineType {
    machineType: string
    acceleratorConfigs: AcceleratorConfig[]
}

export interface AcceleratorConfig {
    acceleratorType: string
    allowedCounts: number[]
}
export interface ICreatePayload {
    input_filename: string;
    display_name: string;
    machine_type: string | null;
    accelerator_type?: string | null;
    accelerator_count?: string | null;
    kernel_name: string | null;
    schedule_value: string | undefined;
    time_zone?: string;
    max_run_count: string | number;
    region: string;
    cloud_storage_bucket: string | null;
    parameters: string[];
    service_account: string | undefined,
    network: string | undefined;
    subnetwork: string | undefined;
    start_time: dayjs.Dayjs | null;
    end_time: dayjs.Dayjs | null;
    gcs_notebook_source?: string;
}
