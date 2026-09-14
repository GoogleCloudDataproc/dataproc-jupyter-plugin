import { RuntimeProfileService } from '../runtimeProfile/runtimeProfileService';
import { authenticatedFetch, loggedFetch, authApi } from '../utils/utils';
import { HTTP_METHOD } from '../utils/const';

jest.mock('../utils/utils', () => ({
  ...jest.requireActual('../utils/utils'),
  authenticatedFetch: jest.fn(),
  loggedFetch: jest.fn(),
  authApi: jest.fn()
}));

describe('RuntimeProfileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchRuntimeProfiles', () => {
    it('fetches profiles successfully via authenticatedFetch to sessionTemplates', async () => {
      const mockData = { sessionTemplates: [{ name: 'template1' }], nextPageToken: 'next-token' };
      (authenticatedFetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData)
      });

      const result = await RuntimeProfileService.fetchRuntimeProfiles('page-1');

      expect(authenticatedFetch).toHaveBeenCalledWith({
        uri: 'sessionTemplates',
        method: HTTP_METHOD.GET,
        regionIdentifier: 'locations',
        queryParams: new URLSearchParams({ pageSize: '50', pageToken: 'page-1' })
      });
      expect(result).toEqual({
        templates: mockData.sessionTemplates,
        nextPageToken: 'next-token'
      });
    });

    it('returns empty array if sessionTemplates is missing', async () => {
      (authenticatedFetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      const result = await RuntimeProfileService.fetchRuntimeProfiles();

      expect(authenticatedFetch).toHaveBeenCalledWith({
        uri: 'sessionTemplates',
        method: HTTP_METHOD.GET,
        regionIdentifier: 'locations',
        queryParams: new URLSearchParams({ pageSize: '50', pageToken: '' })
      });
      expect(result).toEqual({
        templates: [],
        nextPageToken: undefined
      });
    });

    it('throws error if response is not ok or contains error payload', async () => {
      (authenticatedFetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Forbidden',
        json: jest.fn().mockResolvedValue({ error: { message: 'Permission denied' } })
      });

      await expect(RuntimeProfileService.fetchRuntimeProfiles()).rejects.toThrow('Permission denied');
    });

    it('throws error if authenticatedFetch fails', async () => {
      (authenticatedFetch as jest.Mock).mockRejectedValue(new Error('API error'));

      await expect(RuntimeProfileService.fetchRuntimeProfiles()).rejects.toThrow('API error');
    });
  });

  describe('deleteRuntimeProfile', () => {
    it('deletes profile successfully via loggedFetch', async () => {
      (authApi as jest.Mock).mockResolvedValue({ access_token: 'test-token' });
      (loggedFetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      await RuntimeProfileService.deleteRuntimeProfile('profile1', 'Profile 1');

      expect(loggedFetch).toHaveBeenCalledWith(
        expect.stringContaining('profile1'),
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('throws error if delete fails', async () => {
      (authApi as jest.Mock).mockResolvedValue({ access_token: 'test-token' });
      (loggedFetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: { message: 'Delete error' } })
      });

      await expect(RuntimeProfileService.deleteRuntimeProfile('profile1')).rejects.toThrow('Delete error');
    });
  });
});
