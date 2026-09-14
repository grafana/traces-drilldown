import { type PluginMeta } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { updateAppPluginSettings } from '@grafana/runtime/unstable';

export function updatePluginSettings(pluginId: string, data: Partial<PluginMeta>): Promise<PluginMeta> {
  if (typeof updateAppPluginSettings === 'function') {
    return updateAppPluginSettings(pluginId, data);
  }

  return backwardsCompatibleUpdatePluginSettings(pluginId, data);
}

async function backwardsCompatibleUpdatePluginSettings(
  pluginId: string,
  data: Partial<PluginMeta>
): Promise<PluginMeta> {
  await getBackendSrv().post(`/api/plugins/${pluginId}/settings`, data, { validatePath: true });
  return getBackendSrv().get(`/api/plugins/${pluginId}/settings`, undefined, undefined, {
    showErrorAlert: false,
    validatePath: true,
  });
}
