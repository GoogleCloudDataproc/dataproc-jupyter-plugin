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

import { Notification } from '@jupyterlab/apputils';
import { BatchService } from './batchService';
import { DataprocLoggingService, LOG_LEVEL } from '../utils/loggingService';
import { authApi, loggedFetch } from '../utils/utils';

jest.mock('../handler/handler', () => ({
  requestAPI: jest.fn().mockResolvedValue({
    dataproc_url: 'https://dataproc.googleapis.com/',
    compute_url: 'https://compute.googleapis.com/compute/v1',
    metastore_url: 'https://metastore.googleapis.com/',
    cloudkms_url: 'https://cloudkms.googleapis.com/',
    cloudresourcemanager_url: 'https://cloudresourcemanager.googleapis.com/',
    datacatalog_url: 'https://datacatalog.googleapis.com/',
    storage_url: 'https://storage.googleapis.com/'
  })
}));
jest.mock('../utils/utils', () => ({
  ...jest.requireActual('../utils/utils'),
  authApi: jest.fn(),
  loggedFetch: jest.fn()
}));
jest.mock('../utils/loggingService', () => ({
  ...jest.requireActual('../utils/loggingService'),
  DataprocLoggingService: { log: jest.fn() }
}));
jest.mock('@jupyterlab/apputils', () => ({
  ...jest.requireActual('@jupyterlab/apputils'),
  Notification: { emit: jest.fn() }
}));

const mockAuthApi = authApi as jest.Mock;
const mockLoggedFetch = loggedFetch as jest.Mock;
const mockLog = jest.mocked(DataprocLoggingService.log);

const CREDENTIALS = {
  access_token: 'token-123',
  project_id: 'test-project',
  region_id: 'us-central1'
};
const HEADERS = {
  'Content-Type': 'application/json',
  Authorization: 'Bearer token-123'
};
const GET = { method: 'GET', headers: HEADERS };
const PROJECTS = 'https://compute.googleapis.com/compute/v1/projects';
const SHARED_VPC_URL = `${PROJECTS}/host-project/aggregated/subnetworks/listUsable`;
const METASTORE = 'https://metastore.googleapis.com/v1/projects/test-project';
const KMS_PATH = 'projects/test-project/locations/us-central1/keyRings';
const KMS_URL = `https://cloudkms.googleapis.com/v1/${KMS_PATH}`;
const API_ERROR = { code: 403, message: 'Permission denied' };
const INVALID_JSON = new SyntaxError('Unexpected token < in JSON');

const subnetUri = (region: string, name: string) =>
  `https://www.googleapis.com/compute/v1/projects/host-project/regions/${region}/subnetworks/${name}`;
const networkUri = (name: string) =>
  `https://www.googleapis.com/compute/v1/projects/test-project/global/networks/${name}`;
const metastore = (name: string, protocol: string, network = 'vpc-a') => ({
  name,
  network: `projects/test-project/global/networks/${network}`,
  hiveMetastoreConfig: { endpointProtocol: protocol }
});

// State setters shared by the lookups; jest.resetAllMocks() clears them.
const setList = jest.fn();
const setSelected = jest.fn();
const setLoading = jest.fn();
const setHostProject = jest.fn();

const listSharedVpc = () => BatchService.listSharedVPC('host-project', setList);
const findHostProject = () =>
  BatchService.runtimeSharedProjectService(setHostProject, setList);
const findSubnetNetwork = () =>
  BatchService.listNetworksFromSubNetworkAPIService(
    'subnet-a',
    setLoading,
    setSelected
  );
const listNetworks = (info?: unknown) =>
  BatchService.listNetworksAPIService(setList, setSelected, info, setLoading);
const listKeyRings = () => BatchService.listKeyRingsAPIService(setList);
const listKeys = () =>
  BatchService.listKeysAPIService('ring-a', setList, setSelected);
const listSubNetworks = (info?: unknown) =>
  BatchService.listSubNetworksAPIService(
    'vpc-a',
    setList,
    setSelected,
    info,
    setLoading
  );
const listMetastores = (location = 'us-central1', found: unknown[] = []) =>
  BatchService.listMetaStoreAPIService(
    'test-project',
    location,
    'vpc-a',
    found,
    setLoading,
    'us-central1',
    setList
  );
const listRegions = () =>
  BatchService.regionListAPIService(
    'test-project',
    'vpc-a',
    setLoading,
    'us-central1',
    setList
  );

// Most lookups fire their requests without awaiting them.
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));
const run = (call: () => Promise<unknown>) => call().then(flushPromises);
const mockResponse = (body: unknown) => ({
  json: jest.fn().mockResolvedValue(body)
});
const respondWith = (body: unknown) =>
  mockLoggedFetch.mockResolvedValue(mockResponse(body));
const expectRequest = (url: string, init: object = { headers: HEADERS }) =>
  expect(mockLoggedFetch).toHaveBeenCalledWith(url, init);
const expectToast = (message: unknown) =>
  expect(Notification.emit).toHaveBeenCalledWith(message, 'error', {
    autoClose: 5000
  });
const expectErrorLog = (message: string) =>
  expect(mockLog).toHaveBeenCalledWith(message, LOG_LEVEL.ERROR);

describe('BatchService network and resource lookups', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockAuthApi.mockResolvedValue(CREDENTIALS);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('listSharedVPC', () => {
    it('lists the usable shared VPC subnetworks of the current region', async () => {
      respondWith({
        items: [
          { subnetwork: subnetUri('us-central1', 'shared-a') },
          { subnetwork: subnetUri('europe-west1', 'shared-b') },
          { subnetwork: 'not-a-subnetwork-uri' }
        ]
      });
      await listSharedVpc();
      expectRequest(SHARED_VPC_URL, GET);
      expect(setList).toHaveBeenCalledWith(['shared-a']);
    });

    it('lists nothing when the credentials have no region', async () => {
      mockAuthApi.mockResolvedValue({ access_token: 'token-123' });
      respondWith({ items: [{ subnetwork: 'not-a-subnetwork-uri' }] });
      await listSharedVpc();
      expect(setList).toHaveBeenCalledWith([]);
    });
  });

  describe('runtimeSharedProjectService', () => {
    it('stores the shared VPC host project and lists its subnetworks', async () => {
      const items = [{ subnetwork: subnetUri('us-central1', 'shared-a') }];
      mockLoggedFetch
        .mockResolvedValueOnce(mockResponse({ name: 'host-project' }))
        .mockResolvedValueOnce(mockResponse({ items }));
      await run(findHostProject);
      expectRequest(`${PROJECTS}/test-project/getXpnHost`, GET);
      expect(setHostProject).toHaveBeenCalledWith('host-project');
      expectRequest(SHARED_VPC_URL, GET);
      expect(setList).toHaveBeenCalledWith(['shared-a']);
    });

    it('notifies the API error and still looks up the missing host project', async () => {
      const listSharedVPC = jest
        .spyOn(BatchService, 'listSharedVPC')
        .mockResolvedValue(undefined);
      respondWith({ error: API_ERROR });
      await run(findHostProject);
      expect(setHostProject).toHaveBeenCalledWith(undefined);
      expect(listSharedVPC).toHaveBeenCalledWith(undefined, setList);
      expectToast('Permission denied');
    });
  });

  describe('listNetworksFromSubNetworkAPIService', () => {
    it('selects the network that owns the subnetwork', async () => {
      respondWith({ network: networkUri('vpc-a') });
      await run(findSubnetNetwork);
      expect(setLoading).toHaveBeenCalledWith(true);
      expectRequest(
        `${PROJECTS}/test-project/regions/us-central1/subnetworks/subnet-a`
      );
      expect(setSelected).toHaveBeenCalledWith('vpc-a');
    });
  });

  describe('listNetworksAPIService', () => {
    const NETWORKS = {
      items: ['vpc-a', 'vpc-b'].map(name => ({ selfLink: networkUri(name) }))
    };

    it('lists the networks and selects the first one for a new batch', async () => {
      respondWith(NETWORKS);
      await listNetworks();
      expectRequest(`${PROJECTS}/test-project/global/networks`);
      expect(setList).toHaveBeenCalledWith(['vpc-a', 'vpc-b']);
      expect(setSelected).toHaveBeenCalledWith('vpc-a');
      expect(setLoading.mock.calls).toEqual([[true], [false]]);
    });

    it('keeps the current selection when editing an existing batch', async () => {
      respondWith(NETWORKS);
      await listNetworks({ uuid: 'batch-1' });
      expect(setList).toHaveBeenCalledWith(['vpc-a', 'vpc-b']);
      expect(setSelected).not.toHaveBeenCalled();
    });

    it.each([
      ['an empty list', { items: [] }, 'No networks found (empty list).'],
      ['no items', {}, 'No networks found in response.']
    ])('logs and notifies when the payload has %s', async (_, body, log) => {
      respondWith(body);
      await listNetworks();
      expectErrorLog(log);
      expectToast('No networks found.');
    });

    it('reports a null payload as a listing error and stops loading', async () => {
      respondWith(null);
      await listNetworks();
      expectErrorLog('Error listing Networks');
      expectToast(
        expect.stringContaining('Error listing Networks : TypeError')
      );
      expect(setLoading).toHaveBeenLastCalledWith(false);
    });
  });

  describe('listKeyRingsAPIService', () => {
    it('lists the key rings of the current region', async () => {
      respondWith({
        keyRings: ['ring-a', 'ring-b'].map(id => ({
          name: `${KMS_PATH}/${id}`
        }))
      });
      await run(listKeyRings);
      expectRequest(KMS_URL);
      expect(setList).toHaveBeenCalledWith(['ring-a', 'ring-b']);
    });
  });

  describe('listKeysAPIService', () => {
    it('lists only the keys with an enabled primary version and selects the first', async () => {
      const key = (id: string, state?: string) => ({
        name: `${KMS_PATH}/ring-a/cryptoKeys/${id}`,
        primary: state ? { state } : undefined
      });
      respondWith({
        cryptoKeys: [key('k1', 'DISABLED'), key('k2'), key('k3', 'ENABLED')]
      });
      await run(listKeys);
      expectRequest(`${KMS_URL}/ring-a/cryptoKeys`);
      expect(setList).toHaveBeenCalledWith(['k3']);
      expect(setSelected).toHaveBeenCalledWith('k3');
    });
  });

  describe('listSubNetworksAPIService', () => {
    const subnet = (name: string, network: string, privateAccess = true) => ({
      name,
      network: networkUri(network),
      privateIpGoogleAccess: privateAccess
    });
    const noSubnets = 'No subnetworks found for network "vpc-a"';

    it('resets the selection, then lists private-access subnetworks of the network', async () => {
      respondWith({
        items: [
          subnet('subnet-a', 'vpc-a'),
          subnet('subnet-b', 'vpc-a', false),
          subnet('subnet-c', 'vpc-b'),
          subnet('subnet-d', 'vpc-a')
        ]
      });
      await listSubNetworks();
      expectRequest(`${PROJECTS}/test-project/regions/us-central1/subnetworks`);
      expect(setList.mock.calls).toEqual([[[]], [['subnet-a', 'subnet-d']]]);
      expect(setSelected.mock.calls).toEqual([[''], ['subnet-a']]);
      expect(setLoading.mock.calls).toEqual([[true], [false]]);
    });

    it('keeps the current selection when editing an existing batch', async () => {
      respondWith({ items: [subnet('subnet-a', 'vpc-a')] });
      await listSubNetworks({ uuid: 'batch-1' });
      expect(setList).toHaveBeenLastCalledWith(['subnet-a']);
      expect(setSelected.mock.calls).toEqual([['']]);
      expect(Notification.emit).not.toHaveBeenCalled();
    });

    it('reports when no subnetwork has Private Google Access', async () => {
      respondWith({ items: [subnet('subnet-b', 'vpc-a', false)] });
      await listSubNetworks();
      const message =
        'There are no subnetworks with Google Private Access enabled for network "vpc-a"';
      expectToast(message);
      expectErrorLog(message);
      expect(setList).toHaveBeenLastCalledWith([]);
    });

    it.each([
      ['no items', {}],
      ['an empty list', { items: [] }],
      ['only other networks', { items: [subnet('subnet-c', 'vpc-b')] }]
    ])('reports no subnetworks for a payload with %s', async (_, body) => {
      respondWith(body);
      await listSubNetworks();
      expectToast(noSubnets);
      expectErrorLog(noSubnets);
      expect(setLoading).toHaveBeenLastCalledWith(false);
    });

    it('uses a generic message when the failure is not an Error', async () => {
      mockLoggedFetch.mockRejectedValue('boom');
      await listSubNetworks();
      expectToast('Error listing subNetworks');
      expect(setLoading).toHaveBeenLastCalledWith(false);
    });

    it('reports a null payload as a listing error', async () => {
      respondWith(null);
      await listSubNetworks();
      expectErrorLog('Error listing subNetworks');
      expectToast(
        expect.stringMatching(/^Error listing subNetworks: Cannot read/)
      );
    });
  });

  describe('listMetaStoreAPIService', () => {
    it('adds gRPC services and Thrift services in the batch region and network', async () => {
      const found = [{ name: 'earlier' }];
      respondWith({
        services: [
          metastore('grpc', 'GRPC', 'other-vpc'),
          metastore('thrift', 'THRIFT'),
          metastore('thrift-other-vpc', 'THRIFT', 'other-vpc')
        ]
      });
      await run(() => listMetastores('us-central1', found));
      expectRequest(`${METASTORE}/locations/us-central1/services`);
      expect(setList).toHaveBeenCalledWith(['earlier', 'grpc', 'thrift']);
      expect(found).toHaveLength(3);
      expect(setLoading.mock.calls).toEqual([[true], [false]]);
    });

    it('skips Thrift services outside the batch region', async () => {
      respondWith({ services: [metastore('thrift', 'THRIFT')] });
      await run(() => listMetastores('europe-west1'));
      expect(setList).toHaveBeenCalledWith([]);
    });
  });

  describe('regionListAPIService', () => {
    it('collects the metastore services of every region of the project', async () => {
      const regions = {
        items: [{ name: 'us-central1' }, { name: 'europe-west1' }]
      };
      const services = (name: string) =>
        mockResponse({ services: [metastore(name, 'GRPC')] });
      mockLoggedFetch
        .mockResolvedValueOnce(mockResponse(regions))
        .mockResolvedValueOnce(services('svc-us'))
        .mockResolvedValueOnce(services('svc-eu'));
      await run(listRegions);
      expect(mockLoggedFetch.mock.calls).toEqual([
        [`${PROJECTS}/test-project/regions`, { headers: HEADERS }],
        [`${METASTORE}/locations/us-central1/services`, { headers: HEADERS }],
        [`${METASTORE}/locations/europe-west1/services`, { headers: HEADERS }]
      ]);
      expect(setList).toHaveBeenLastCalledWith(['svc-us', 'svc-eu']);
      expect(Notification.emit).not.toHaveBeenCalled();
    });

    it('logs when a metastore lookup fails', async () => {
      const authError = new Error('auth failed');
      mockAuthApi
        .mockResolvedValueOnce(CREDENTIALS)
        .mockRejectedValueOnce(authError);
      respondWith({ items: [{ name: 'us-central1' }] });
      await run(listRegions);
      expect(console.log).toHaveBeenCalledWith(authError);
      expect(Notification.emit).not.toHaveBeenCalled();
    });
  });

  describe('shared request handling', () => {
    it.each([
      ['listSharedVPC', listSharedVpc, false],
      ['runtimeSharedProjectService', findHostProject, undefined],
      ['listNetworksFromSubNetworkAPIService', findSubnetNetwork, undefined],
      ['listNetworksAPIService', listNetworks, undefined],
      ['listKeyRingsAPIService', listKeyRings, undefined],
      ['listKeysAPIService', listKeys, undefined],
      ['listSubNetworksAPIService', listSubNetworks, undefined],
      ['listMetaStoreAPIService', listMetastores, undefined],
      ['regionListAPIService', listRegions, undefined]
    ])('%s makes no request without credentials', async (_, call, result) => {
      mockAuthApi.mockResolvedValue(undefined);
      await expect(call()).resolves.toBe(result);
      await flushPromises();
      expect(mockLoggedFetch).not.toHaveBeenCalled();
      expect(Notification.emit).not.toHaveBeenCalled();
    });

    it.each`
      method                                    | call                 | log                             | toast
      ${'listSharedVPC'}                        | ${listSharedVpc}     | ${undefined}                    | ${'Failed to fetch sharedVPC subNetwork : Error: offline'}
      ${'runtimeSharedProjectService'}          | ${findHostProject}   | ${'Error displaying user info'} | ${'Failed to fetch user information : Error: offline'}
      ${'listNetworksFromSubNetworkAPIService'} | ${findSubnetNetwork} | ${'Error selecting Network'}    | ${'Error selecting Network : Error: offline'}
      ${'listNetworksAPIService'}               | ${listNetworks}      | ${'Error listing Networks'}     | ${'Error listing Networks : Error: offline'}
      ${'listKeyRingsAPIService'}               | ${listKeyRings}      | ${'Error listing Networks'}     | ${'Error listing Networks : Error: offline'}
      ${'listKeysAPIService'}                   | ${listKeys}          | ${'Error listing Networks'}     | ${'Error listing Networks : Error: offline'}
      ${'listSubNetworksAPIService'}            | ${listSubNetworks}   | ${'Error listing subNetworks'}  | ${'Error listing subNetworks: offline'}
      ${'listMetaStoreAPIService'}              | ${listMetastores}    | ${'Error listing services'}     | ${'Error listing services : Error: offline'}
      ${'regionListAPIService'}                 | ${listRegions}       | ${'Error listing regions'}      | ${'Failed to fetch regions : Error: offline'}
    `(
      '$method logs and notifies when the request fails',
      async ({ call, log, toast }) => {
        mockLoggedFetch.mockRejectedValue(new Error('offline'));
        await run(call);
        expect(mockLog.mock.calls).toEqual(log ? [[log, LOG_LEVEL.ERROR]] : []);
        expectToast(toast);
      }
    );

    it.each([
      ['runtimeSharedProjectService', findHostProject],
      ['listNetworksFromSubNetworkAPIService', findSubnetNetwork],
      ['listKeyRingsAPIService', listKeyRings],
      ['listKeysAPIService', listKeys],
      ['listMetaStoreAPIService', listMetastores],
      ['regionListAPIService', listRegions]
    ])('%s logs an unreadable response body', async (_, call) => {
      mockLoggedFetch.mockResolvedValue({
        json: jest.fn().mockRejectedValue(INVALID_JSON)
      });
      await run(call);
      expect(console.log).toHaveBeenCalledWith(INVALID_JSON);
      expect(setList).not.toHaveBeenCalled();
      expect(Notification.emit).not.toHaveBeenCalled();
    });

    it.each`
      method                                    | call                 | payload
      ${'listSharedVPC'}                        | ${listSharedVpc}     | ${{ items: [] }}
      ${'listNetworksFromSubNetworkAPIService'} | ${findSubnetNetwork} | ${{ network: networkUri('vpc-a') }}
      ${'listNetworksAPIService'}               | ${listNetworks}      | ${{}}
      ${'listKeyRingsAPIService'}               | ${listKeyRings}      | ${{ keyRings: [] }}
      ${'listKeysAPIService'}                   | ${listKeys}          | ${{ cryptoKeys: [] }}
      ${'listSubNetworksAPIService'}            | ${listSubNetworks}   | ${{}}
      ${'listMetaStoreAPIService'}              | ${listMetastores}    | ${{ services: [] }}
      ${'regionListAPIService'}                 | ${listRegions}       | ${{ items: [] }}
    `('$method notifies the API error message', async ({ call, payload }) => {
      respondWith({ ...payload, error: API_ERROR });
      await run(call);
      expectToast('Permission denied');
    });
  });
});
