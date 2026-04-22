import { lazy } from 'react';
import { AppPlugin } from '@grafana/data';
import { config } from '@grafana/runtime';
import { lt } from 'semver';

import { EmbeddedTraceExplorationState, OpenInExploreTracesButtonProps } from 'exposedComponents/types';
import { SuspendedEmbeddedTraceExploration, SuspendedOpenInExploreTracesButton } from 'exposedComponents';
import { linkConfigs } from 'utils/links';
import { JsonData } from './components/AppConfig/AppConfig';
import pluginJson from './plugin.json';

const App = lazy(async () => {
  const { initPluginTranslations } = await import('@grafana/i18n');

  const { loadResources: scenesLoadResources } = await import('@grafana/scenes');
  await initPluginTranslations('grafana-scenes', [scenesLoadResources]);

  const { loadResources } = await import('./i18n/loadResources');
  const pluginLoaders = lt(config?.buildInfo?.version || '0.0.0', '12.1.0') ? [loadResources] : [];
  await initPluginTranslations(pluginJson.id, pluginLoaders);

  return import('./components/App/App');
});
const AppConfig = lazy(() => import('./components/AppConfig/AppConfig'));

export const plugin = new AppPlugin<JsonData>()
  .setRootPage(App)
  .addConfigPage({
    title: 'Configuration',
    icon: 'cog',
    body: AppConfig,
    id: 'configuration',
  })
  .exposeComponent({
    id: 'grafana-exploretraces-app/open-in-explore-traces-button/v1',
    title: 'Open in Traces Drilldown button',
    description: 'A button that opens a traces view in the Traces Drilldown app.',
    component: SuspendedOpenInExploreTracesButton as React.ComponentType<OpenInExploreTracesButtonProps>,
  })
  .exposeComponent({
    id: 'grafana-exploretraces-app/embedded-trace-exploration/v1',
    title: 'Embedded Trace Exploration',
    description: 'A component that renders a trace exploration view that can be embedded in other parts of Grafana.',
    component: SuspendedEmbeddedTraceExploration as React.ComponentType<EmbeddedTraceExplorationState>,
  });

for (const linkConfig of linkConfigs) {
  plugin.addLink(linkConfig);
}
