import os
from enum import Enum
from typing import Dict, List, Optional, Union
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
    output_formats: List[str]  # Supported output formats
    metadata: Optional[Dict[str, str]]  # Optional metadata
    compute_types: Optional[List[str]]
    default_compute_type: Optional[str]  # Should be a member of the compute_types list
    utc_only: Optional[bool]

    def __str__(self):
        return self.json()
    

class DescribeJob(BaseModel):
    input_filename: str = None
    composer_environment_name: str = None
    output_formats: Optional[List[str]] = None
    parameters: Optional[List[str]] = None
    selected_mode: str = None
    serverless_name: str = None
    cluster_name : str = None
    retry_count: int = 2
    retry_delay: int = 5
    email_failure: bool = False
    email_delay: bool = False
    email: Optional[List[str]] = None
    name: str = None
    dag_id: str = None

    class Config:
        orm_mode = True


class DagModel:
    def __init__(self, input_filename, composer_environment_name, composer_environment_parameters,
                 output_formats, parameters, cluster, retry_count, retry_delay,
                 email_on_failure, email_on_delay, email_list, name, dag_id):
        self.input_filename = input_filename
        self.composer_environment_name = composer_environment_name
        self.composer_environment_parameters = composer_environment_parameters
        self.output_formats = output_formats
        self.parameters = parameters
        self.cluster = cluster
        self.retry_count = retry_count
        self.retry_delay = retry_delay
        self.email_on_failure = email_on_failure
        self.email_on_delay = email_on_delay
        self.email_list = email_list
        self.name = name
        self.dag_id = dag_id

    def to_dict(self):
        return {
            "input_filename": self.input_filename,
            "composer_environment_name": self.composer_environment_name,
            "composer_environment_parameters": self.composer_environment_parameters,
            "output_formats": self.output_formats,
            "parameters": self.parameters,
            "cluster": self.cluster,
            "retryCount": self.retry_count,
            "retryDelay": self.retry_delay,
            "emailOnFailure": self.email_on_failure,
            "emailOnDelay": self.email_on_delay,
            "emailList": self.email_list,
            "name": self.name,
            "dag_id": self.dag_id
        }

    @classmethod
    def from_dict(cls, data):
        return cls(**data)