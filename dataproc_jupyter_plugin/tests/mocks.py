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

import aiohttp
from google.cloud import jupyter_config
from tornado.httpclient import HTTPClientError

from dataproc_jupyter_plugin import credentials


async def mock_credentials():
    return {
        "project_id": "credentials-project",
        "region_id": "mock-region",
        "access_token": "mock-token",
        "config_error": 0,
        "login_error": 0,
    }


async def mock_config(field_name):
    return None


class MockResponse:
    def __init__(self, json, status=200, text=None):
        self._json = json
        self._text = text
        self.status = status

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args, **kwargs):
        return

    async def json(self):
        return self._json

    async def text(self, encoding=None):
        return self._text or json.dumps(self._json)


class MockClientSession:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *args, **kwargs):
        return

    def get(self, api_endpoint, headers=None):
        return MockResponse(
            {
                "api_endpoint": api_endpoint,
                "headers": headers,
            }
        )

    def post(self, api_endpoint, headers=None, json=None):
        return MockResponse(
            {
                "results": [
                    {
                        "api_endpoint": api_endpoint,
                        "headers": headers,
                        "json": json,
                    }
                ]
            }
        )


class MockHTTPResponse:
    def __init__(self, body, code=200):
        self.code = code
        self.body = body if isinstance(body, bytes) else json.dumps(body).encode()


class MockAsyncHTTPClient:
    """Tornado's AsyncHTTPClient. Answers with the request it received, or
    with the given body and status code."""

    def __init__(self, body=None, code=200):
        self._body = body
        self._code = code

    async def fetch(self, url, headers=None, raise_error=True):
        body = self._body
        if body is None:
            body = {"api_endpoint": url, "headers": headers}
        response = MockHTTPResponse(body, self._code)
        # Like Tornado, an error status raises unless raise_error is False.
        if raise_error and self._code >= 400:
            raise HTTPClientError(self._code, response=response)
        return response


def patch_mocks(monkeypatch):
    monkeypatch.setattr(credentials, "get_cached", mock_credentials)
    monkeypatch.setattr(jupyter_config, "async_get_gcloud_config", mock_config)
    monkeypatch.setattr(aiohttp, "ClientSession", MockClientSession)
    # Patched only where the handlers use it, so jp_fetch still makes real requests.
    monkeypatch.setattr(
        "dataproc_jupyter_plugin.handlers.AsyncHTTPClient", MockAsyncHTTPClient
    )
