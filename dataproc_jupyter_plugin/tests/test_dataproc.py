# Copyright 2024 Google LLC
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

import json
from unittest import mock

from dataproc_jupyter_plugin.tests import mocks

from google.cloud.dataproc_v1.services.cluster_controller import (
    ClusterControllerClient,
    pagers
)
from google.auth import credentials as ga_credentials
from google.cloud.dataproc_v1.types import clusters
import pytest


@pytest.mark.parametrize(
    "request_type",
    [
        clusters.ListClustersRequest,
        dict,
    ],
)

def test_list_clusters(request_type, transport: str = "grpc"):
    client = ClusterControllerClient(
        credentials=ga_credentials.AnonymousCredentials(),
        transport=transport,
    )

    # Everything is optional in proto3 as far as the runtime is concerned,
    # and we are mocking out the actual API, so just send an empty request.
    request = request_type()

    # Mock the actual call within the gRPC stub, and fake the request.
    with mock.patch.object(type(client.transport.list_clusters), "__call__") as call:
        # Designate an appropriate return value for the call.
        call.return_value = clusters.ListClustersResponse(
            next_page_token="next_page_token_value",
        )
        response = client.list_clusters(request)

        # Establish that the underlying gRPC stub method was called.
        assert len(call.mock_calls) == 1
        _, args, _ = call.mock_calls[0]
        request = clusters.ListClustersRequest()
        assert args[0] == request

    # Establish that the response is the type that we expect.
    assert isinstance(response, pagers.ListClustersPager)
    assert response.next_page_token == "next_page_token_value"


async def test_list_runtime(monkeypatch, jp_fetch):
    mocks.patch_mocks(monkeypatch)

    mock_project_id = "credentials-project"
    mock_page_token = "mock-page-token"
    mock_region_id = "mock-region"
    mock_page_size = "mock_page_size"
    mock_service_url = "mock_url"
    response = await jp_fetch(
        "dataproc-plugin",
        "runtimeList",
        params={"pageSize": mock_page_size, "pageToken": mock_page_token},
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert (
        payload["api_endpoint"]
        == f"https://dataproc.googleapis.com//v1/projects/{mock_project_id}/locations/{mock_region_id}/sessionTemplates?pageSize=mock_page_size&pageToken={mock_page_token}"
    )
    assert payload["headers"]["Authorization"] == f"Bearer mock-token"
