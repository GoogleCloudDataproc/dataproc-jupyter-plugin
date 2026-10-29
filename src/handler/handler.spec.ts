/**
 * @license
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ServerConnection } from '@jupyterlab/services';
import { requestAPI } from './handler';

/** A fetch response with the given status and body text. */
const mockResponse = (status: number, body: string): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    text: async () => body
  } as Response);

describe('requestAPI', () => {
  let makeRequest: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(ServerConnection, 'makeSettings').mockReturnValue({
      baseUrl: 'http://localhost/'
    } as ServerConnection.ISettings);
    makeRequest = jest.spyOn(ServerConnection, 'makeRequest');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the JSON body', async () => {
    makeRequest.mockResolvedValueOnce(mockResponse(200, '{"catalogs": []}'));

    await expect(requestAPI('biglakeCatalogs')).resolves.toEqual({
      catalogs: []
    });
  });

  it("throws with the server's message", async () => {
    makeRequest.mockResolvedValueOnce(
      mockResponse(403, '{"message": "Forbidden by the server"}')
    );

    await expect(requestAPI('biglakeCatalogs')).rejects.toThrow(
      'Forbidden by the server'
    );
  });

  it('throws with the message of a Google API error', async () => {
    const body = JSON.stringify({
      error: { code: 403, message: 'Permission denied on project my-project.' }
    });
    makeRequest.mockResolvedValueOnce(mockResponse(403, body));

    await expect(requestAPI('biglakeCatalogs')).rejects.toThrow(
      'Permission denied on project my-project.'
    );
  });

  it('throws a generic error when the body has no message', async () => {
    // requestAPI logs bodies that aren't JSON.
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    makeRequest.mockResolvedValueOnce(
      mockResponse(502, '<html>Bad Gateway</html>')
    );

    await expect(requestAPI('biglakeCatalogs')).rejects.toThrow(
      'Invalid response: 502'
    );
  });
});
