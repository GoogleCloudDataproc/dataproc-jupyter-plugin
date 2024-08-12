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
