import { config } from '@grafana/runtime';
import { lt } from 'semver';

import pluginJson from '../plugin.json';

let initPromise: Promise<void> | undefined;

export function initPluginI18n(): Promise<void> {
  if (!initPromise) {
    initPromise = doInit();
  }
  return initPromise;
}

async function doInit() {
  const { initPluginTranslations } = await import('@grafana/i18n');
  const { loadResources: scenesLoadResources } = await import('@grafana/scenes');
  await initPluginTranslations('grafana-scenes', [scenesLoadResources]);

  const { loadResources } = await import('./loadResources');
  await initPluginTranslations(
    pluginJson.id,
    lt(config?.buildInfo?.version || '0.0.0', '12.1.0') ? [loadResources] : []
  );
}
