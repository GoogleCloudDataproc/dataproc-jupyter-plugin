export interface IMachineType {
    machineType: string
    acceleratorConfigs: AcceleratorConfig[]
}

export interface AcceleratorConfig {
    acceleratorType: string
    allowedCounts: number[]
}

export interface IDagList {
    displayName: string;
    schedule: string;
    status: string;
}

export interface IDagRunList {
    dagRunId: string;
    startDate: string;
    endDate: string;
    gcsUrl: string;
    state: string;
    date: Date;
    time: string;
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
    start_time: Date | null | undefined;
    end_time: Date | null | undefined;
}

export interface IUpdateSchedulerAPIResponse {
    status: number;
    error: string;
}

export interface IDeleteSchedulerAPIResponse {
    done: boolean;
    metadata: object;
    name: string;
    response: object;
}

export interface ITriggerSchedule {
    metedata: object;
    name: string;
}
