# Copyright 2026 Google LLC
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
from urllib.parse import quote, urlencode

from tornado.httpclient import AsyncHTTPClient, HTTPClientError
from tornado.simple_httpclient import HTTPTimeoutError

from dataproc_jupyter_plugin import urls
from dataproc_jupyter_plugin.commons import constants

# Catalog list path, response keys and page token parameter of each Lakehouse
# runtime catalog endpoint. The Iceberg REST extensions use kebab-case names.
CATALOG_ENDPOINTS = {
    "iceberg": {
        "path": "iceberg/v1/restcatalog/extensions/projects/{project}/catalogs",
        "catalogs": "iceberg-catalogs",
        "page_token": "page-token",
        "next_page_token": "next-page-token",
    },
    "hive": {
        "path": "hive/v1/projects/{project}/catalogs",
        "catalogs": "catalogs",
        "page_token": "pageToken",
        "next_page_token": "nextPageToken",
    },
}

# Shorter than Tornado's 20 second defaults, so the UI shows an error soon
# when a firewall or VPC Service Controls silently drops the connection.
CONNECT_TIMEOUT_SECONDS = 10
REQUEST_TIMEOUT_SECONDS = 15

# The most pages listed for one request, in case BigLake keeps returning a
# next page token.
MAX_PAGES = 10

# How much of a non-JSON response, such as a proxy's HTML error page, to log.
MAX_LOGGED_BODY_BYTES = 2000


def error_response(code, message):
    """Returns a (status, body) pair, with the body in BigLake's error shape."""
    return code, {"error": {"code": code, "message": message}}


async def list_catalogs(log, endpoint, project_id, access_token):
    """Lists all of a project's catalogs from a Lakehouse runtime catalog endpoint.

    Returns a (status, body) pair to send to the UI, with the catalogs of every
    page under the endpoint's usual key. Errors, including BigLake's own such
    as 403, 404 or 429, keep their status and are in BigLake's error shape.
    """
    config = CATALOG_ENDPOINTS[endpoint]
    biglake_url = await urls.gcp_service_url(constants.BIGLAKE_SERVICE_NAME)
    path = config["path"].format(project=quote(project_id, safe=""))
    url = f"{biglake_url.rstrip('/')}/{path}"

    catalogs = []
    page_url = url
    for _ in range(MAX_PAGES):
        status, body = await _fetch(log, page_url, access_token)
        if status != 200:
            return status, body
        catalogs.extend(body.get(config["catalogs"]) or [])
        page_token = body.get(config["next_page_token"])
        if not page_token:
            return status, {config["catalogs"]: catalogs}
        page_url = f"{url}?{urlencode({config['page_token']: page_token})}"
    log.warning(f"Listed only the first {MAX_PAGES} pages of catalogs: {url}")
    return 200, {config["catalogs"]: catalogs}


async def _fetch(log, url, access_token):
    """Calls BigLake. Returns a (status, body) pair, with errors in BigLake's error shape."""
    try:
        # AsyncHTTPClient() is Tornado's shared client, not a new one per call.
        response = await AsyncHTTPClient().fetch(
            url,
            headers={"Authorization": f"Bearer {access_token}"},
            connect_timeout=CONNECT_TIMEOUT_SECONDS,
            request_timeout=REQUEST_TIMEOUT_SECONDS,
            # Error statuses are returned instead of raised. Timeouts still raise.
            raise_error=False,
        )
    except HTTPTimeoutError:
        log.error(f"Timed out calling BigLake: {url}")
        message = "BigLake didn't respond in time. Check your network connection and try again."
        return error_response(504, message)
    except (HTTPClientError, OSError):
        log.exception(f"Failed to connect to BigLake: {url}")
        message = "Couldn't connect to BigLake. See the Jupyter server log for details."
        return error_response(502, message)

    try:
        body = json.loads(response.body)
    except ValueError:
        body = None
    # Not BigLake's JSON, such as a proxy's HTML error page: log it, as the UI
    # only shows a short message.
    if not isinstance(body, dict):
        text = response.body[:MAX_LOGGED_BODY_BYTES].decode("utf-8", errors="replace")
        log.error(f"Unexpected BigLake response (HTTP {response.code}): {text}")
        message = (
            f"Unexpected response from BigLake (HTTP {response.code}). "
            "See the Jupyter server log for details."
        )
        return error_response(response.code if response.code >= 400 else 502, message)
    return response.code, body
