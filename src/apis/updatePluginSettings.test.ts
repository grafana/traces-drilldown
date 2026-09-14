import { type PluginMeta } from '@grafana/data';
import { updateAppPluginSettings } from '@grafana/runtime/unstable';

import { updatePluginSettings } from './updatePluginSettings';

jest.mock('@grafana/runtime/unstable', () => ({
  ...jest.requireActual('@grafana/runtime/unstable'),
  updateAppPluginSettings: jest.fn(),
}));

const mockRuntimeUpdateAppPluginSettings = jest.mocked(updateAppPluginSettings);
const mockData: Partial<PluginMeta> = { enabled: true, pinned: true };

describe('updatePluginSettings', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRuntimeUpdateAppPluginSettings.mockResolvedValue(mockData as PluginMeta);
  });

  it('should call correct function when updateAppPluginSettings exists', async () => {
    await updatePluginSettings('grafana-exploretraces-app', mockData);

    expect(mockRuntimeUpdateAppPluginSettings).toHaveBeenCalled();
    expect(mockRuntimeUpdateAppPluginSettings).toHaveBeenCalledWith('grafana-exploretraces-app', { ...mockData });
  });

  it('should return correct response when updateAppPluginSettings exists', async () => {
    const result = await updatePluginSettings('grafana-exploretraces-app', mockData);

    expect(result).toStrictEqual(mockData);
  });
});
