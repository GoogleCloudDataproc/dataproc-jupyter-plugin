# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


from typing import Dict, List, Optional

from pydantic import BaseModel


class ComposerEnvironment(BaseModel):
    """Defines a runtime context where job
    execution will happen. For example, conda
    environment.
    """

    name: str
    label: str
    description: str
    file_extensions: List[str]  # Supported input file types
    metadata: Optional[Dict[str, str]]  # Optional metadata

    def __str__(self):
        return self.json()


class DescribeJob(BaseModel):
    input_filename: str = None
    composer_environment_name: str = None
    output_formats: Optional[List[str]] = None
    parameters: Optional[List[str]] = None
    selected_mode: str = None
    serverless_name: object = None
    cluster_name: str = None
    mode_selected: str = None
    schedule_value: str = None
    retry_count: int = 2
    retry_delay: int = 5
    email_failure: bool = False
    email_delay: bool = False
    email: Optional[List[str]] = None
    name: str = None
    dag_id: str = None
    stop_cluster: bool = False
    time_zone: str = None
    email_success: bool = False

    @classmethod
    def from_dict(cls, data):
        return cls(**data)


class DescribeVertexJob(BaseModel):
    input_filename: str = None
    display_name: str = None
    machine_type: str = None
    accelerator_type: Optional[str] = None
    accelerator_count: Optional[int] = None
    kernel_name: str = None
    schedule_value: str = None
    time_zone: str = None
    max_run_count: Optional[str] = None
    region: str = None
    cloud_storage_bucket: str = None
    parameters: Optional[List[str]] = None
    service_account: str = None
    network: str = None
    subnetwork: str = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    disk_type: str = None
    disk_size: str = None

    @classmethod
    def from_dict(cls, data):
        return cls(**data)


class DescribeBucketName(BaseModel):
    bucket_name: str = None

    @classmethod
    def from_dict(cls, data):
        return cls(**data)


class DescribeUpdateVertexJob(BaseModel):
    input_filename: str = None
    display_name: str = None
    machine_type: Optional[str] = None
    accelerator_type: Optional[str] = None
    accelerator_count: Optional[int] = None
    kernel_name: Optional[str] = None
    schedule_value: str = None
    time_zone: str = None
    max_run_count: str = None
    region: Optional[str] = None
    cloud_storage_bucket: Optional[str] = None
    parameters: Optional[List[str]] = None
    service_account: Optional[str] = None
    network: Optional[str] = None
    subnetwork: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    gcs_notebook_source: str = None
    disk_type: Optional[str] = None
    disk_size: Optional[str] = None

    @classmethod
    def from_dict(cls, data):
        return cls(**data)
