import { type PluginMeta } from '@grafana/data';
import { type BackendSrv, setBackendSrv } from '@grafana/runtime';

import { updatePluginSettings } from './updatePluginSettings';

jest.mock('@grafana/runtime/unstable', () => ({
  updateAppPluginSettings: undefined,
}));

const mockBackendSrv: BackendSrv = {
  chunked: jest.fn(),
  delete: jest.fn(),
  fetch: jest.fn(),
  get: jest.fn(),
  patch: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  datasourceRequest: jest.fn(),
  request: jest.fn(),
};

const mockData: Partial<PluginMeta> = { enabled: true, pinned: true };

describe('updatePluginSettings', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    setBackendSrv(mockBackendSrv);
    mockBackendSrv.post = jest.fn().mockResolvedValue(mockData);
    mockBackendSrv.get = jest.fn().mockResolvedValue(mockData);
  });

  it('should call correct function when updateAppPluginSettings does not exists', async () => {
    await updatePluginSettings('grafana-exploretraces-app', mockData);

    expect(mockBackendSrv.post).toHaveBeenCalled();
    expect(mockBackendSrv.post).toHaveBeenCalledWith(
      `/api/plugins/grafana-exploretraces-app/settings`,
      { ...mockData },
      { validatePath: true }
    );
  });

  it('should return correct response when updateAppPluginSettings does not exists', async () => {
    const result = await updatePluginSettings('grafana-exploretraces-app', mockData);

    expect(result).toStrictEqual(mockData);
  });
});
