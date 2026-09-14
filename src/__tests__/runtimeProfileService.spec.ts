import { RuntimeProfileService } from '../runtimeProfile/runtimeProfileService';
import { authenticatedFetch } from '../utils/utils';
import { RuntimeService } from '../runtime/runtimeService';
import { HTTP_METHOD } from '../utils/const';

jest.mock('../utils/utils', () => ({
  ...jest.requireActual('../utils/utils'),
  authenticatedFetch: jest.fn()
}));

jest.mock('../runtime/runtimeService', () => ({
  RuntimeService: {
    deleteRuntimeTemplateAPI: jest.fn()
  }
}));

describe('RuntimeProfileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchRuntimeProfiles', () => {
    it('fetches profiles successfully via authenticatedFetch to sessionTemplates', async () => {
      const mockData = { sessionTemplates: [{ name: 'template1' }], nextPageToken: 'next-token' };
      (authenticatedFetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockData)
      });

      const result = await RuntimeProfileService.fetchRuntimeProfiles('page-1');

      expect(authenticatedFetch).toHaveBeenCalledWith({
        uri: 'sessionTemplates',
        method: HTTP_METHOD.GET,
        regionIdentifier: 'locations',
        queryParams: new URLSearchParams({ pageSize: '30', pageToken: 'page-1' })
      });
      expect(result).toEqual({
        templates: mockData.sessionTemplates,
        nextPageToken: 'next-token'
      });
    });

    it('returns empty array if sessionTemplates is missing', async () => {
      (authenticatedFetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue({})
      });

      const result = await RuntimeProfileService.fetchRuntimeProfiles();

      expect(authenticatedFetch).toHaveBeenCalledWith({
        uri: 'sessionTemplates',
        method: HTTP_METHOD.GET,
        regionIdentifier: 'locations',
        queryParams: new URLSearchParams({ pageSize: '30', pageToken: '' })
      });
      expect(result).toEqual({
        templates: [],
        nextPageToken: undefined
      });
    });

    it('throws error if authenticatedFetch fails', async () => {
      (authenticatedFetch as jest.Mock).mockRejectedValue(new Error('API error'));

      await expect(RuntimeProfileService.fetchRuntimeProfiles()).rejects.toThrow('API error');
    });
  });

  describe('deleteRuntimeProfile', () => {
    it('deletes profile successfully via RuntimeService.deleteRuntimeTemplateAPI', async () => {
      (RuntimeService.deleteRuntimeTemplateAPI as jest.Mock).mockResolvedValue({});

      await RuntimeProfileService.deleteRuntimeProfile('profile1', 'Profile 1');

      expect(RuntimeService.deleteRuntimeTemplateAPI).toHaveBeenCalledWith(
        'profile1',
        'Profile 1'
      );
    });

    it('throws error if deleteRuntimeTemplateAPI fails', async () => {
      (RuntimeService.deleteRuntimeTemplateAPI as jest.Mock).mockRejectedValue(new Error('Delete error'));

      await expect(RuntimeProfileService.deleteRuntimeProfile('profile1')).rejects.toThrow('Delete error');
    });
  });
});
