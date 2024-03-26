
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


from unittest.mock import Mock, patch
from dataproc_jupyter_plugin.services.bigqueryService import BigQueryDatasetInfoService, BigQueryDatasetService, BigQueryPreviewService, BigQuerySchemaService, BigQueryTableInfoService


def test_list_datasets_with_valid_credentials():
    credentials = {
            "access_token": "token",
            "project_id": "project_id",
            "region_id": "region_id"
        }
    log = Mock()
    requests = Mock()
    response = Mock()
    response.status_code = 200
    response.json.return_value = {"key": "value"}
    requests.get.return_value = response
    service = BigQueryDatasetService()
    with patch('dataproc_jupyter_plugin.services.bigqueryService.requests', requests):
        result = service.list_datasets(credentials, log)

    assert result == {"key": "value"}

def test_list_datasets_with_missing_credentials():
    credentials = {}
    log = Mock()
    requests = Mock()
    service = BigQueryDatasetService()
    with patch('dataproc_jupyter_plugin.services.bigqueryService.requests', requests):
            result = service.list_datasets(credentials, log)
    assert result == {'error': 'Missing required credentials'}

def test_list_schema():
    credentials = {
            "access_token": "token",
            "project_id": "project_id",
            "region_id": "region_id"
        }
    log = Mock()
    requests = Mock()
    response = Mock()
    entry_name = "entry_name"
    response.status_code = 200
    response.json.return_value = {"key": "value"}
    requests.get.return_value = response
    service = BigQuerySchemaService()
    with patch('dataproc_jupyter_plugin.services.bigqueryService.requests', requests):
        result = service.list_schema(credentials, entry_name, log)

    assert result == {"key": "value"}

def test_list_dataset_info():
    credentials = {
            "access_token": "token",
            "project_id": "project_id",
            "region_id": "region_id"
        }
    log = Mock()
    requests = Mock()
    response = Mock()
    dataset_id = "dataset_id"
    response.status_code = 200
    response.json.return_value = {"key": "value"}
    requests.get.return_value = response
    service = BigQueryDatasetInfoService()
    with patch('dataproc_jupyter_plugin.services.bigqueryService.requests', requests):
        result = service.list_dataset_info(credentials, dataset_id, log)

    assert result == {"key": "value"}

def test_list_table_info():
    credentials = {
            "access_token": "token",
            "project_id": "project_id",
            "region_id": "region_id"
        }
    log = Mock()
    requests = Mock()
    response = Mock()
    dataset_id = "dataset_id"
    table_id = "table_id"
    response.status_code = 200
    response.json.return_value = {"key": "value"}
    requests.get.return_value = response
    service = BigQueryTableInfoService()
    with patch('dataproc_jupyter_plugin.services.bigqueryService.requests', requests):
        result = service.list_table_info(credentials, dataset_id,table_id, log)

    assert result == {"key": "value"}

def test_preview_data():
    credentials = {
            "access_token": "token",
            "project_id": "project_id",
            "region_id": "region_id"
        }
    log = Mock()
    requests = Mock()
    response = Mock()
    dataset_id = "dataset_id"
    table_id = "table_id"
    response.status_code = 200
    response.json.return_value = {"key": "value"}
    requests.get.return_value = response
    service = BigQueryPreviewService()
    with patch('dataproc_jupyter_plugin.services.bigqueryService.requests', requests):
        result = service.bigquery_preview_data(credentials, dataset_id,table_id, log)

    assert result == {"key": "value"}