const initPluginTranslations = jest.fn().mockResolvedValue(undefined);
const scenesLoadResources = jest.fn();
const pluginLoadResources = jest.fn();

jest.mock('@grafana/i18n', () => ({
  initPluginTranslations: (...args: unknown[]) => initPluginTranslations(...args),
}));

jest.mock('@grafana/scenes', () => ({
  loadResources: scenesLoadResources,
}));

jest.mock('../loadResources', () => ({
  loadResources: pluginLoadResources,
}));

describe('initPluginI18n', () => {
  beforeEach(() => {
    jest.resetModules();
    initPluginTranslations.mockClear();
  });

  it('initializes scenes and plugin translations once', async () => {
    const { initPluginI18n } = await import('../initPluginI18n');
    await Promise.all([initPluginI18n(), initPluginI18n()]);

    expect(initPluginTranslations).toHaveBeenCalledTimes(2);
    expect(initPluginTranslations).toHaveBeenNthCalledWith(1, 'grafana-scenes', [scenesLoadResources]);
    expect(initPluginTranslations).toHaveBeenNthCalledWith(2, 'grafana-exploretraces-app', [pluginLoadResources]);
  });
});
