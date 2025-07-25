import { lazy } from 'react';
import { AppPlugin } from '@grafana/data';

import { EmbeddedTraceExplorationState, OpenInExploreTracesButtonProps } from 'exposedComponents/types';
import { SuspendedEmbeddedTraceExploration, SuspendedOpenInExploreTracesButton } from 'exposedComponents';
import { linkConfigs } from 'utils/links';

const App = lazy(() => import('./components/App/App'));
const AppConfig = lazy(() => import('./components/AppConfig/AppConfig'));

export const plugin = new AppPlugin<{}>()
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
    description: 'A button that opens a traces view in the Traces drilldown app.',
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
