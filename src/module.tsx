import { lazy } from 'react';
import { AppPlugin } from '@grafana/data';

import {
  EmbeddedTraceExceptionsState,
  EmbeddedTraceExplorationState,
  OpenInExploreTracesButtonProps,
} from 'exposedComponents/types';
import {
  SuspendedEmbeddedTraceExceptions,
  SuspendedEmbeddedTraceExploration,
  SuspendedOpenInExploreTracesButton,
} from 'exposedComponents';
import { initPluginI18n } from './i18n/initPluginI18n';
import { linkConfigs } from 'utils/links';
import { JsonData } from './components/AppConfig/AppConfig';

const App = lazy(async () => {
  await initPluginI18n();
  return import('./components/App/App');
});
const AppConfig = lazy(async () => {
  await initPluginI18n();
  return import('./components/AppConfig/AppConfig');
});

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
  })
  .exposeComponent({
    id: 'grafana-exploretraces-app/embedded-trace-exceptions/v1',
    title: 'Embedded Trace Exceptions',
    description: 'The Exceptions tab from Traces Drilldown, for the Assistant and other plugins to embed.',
    component: SuspendedEmbeddedTraceExceptions as React.ComponentType<EmbeddedTraceExceptionsState>,
  });

for (const linkConfig of linkConfigs) {
  plugin.addLink(linkConfig);
}
