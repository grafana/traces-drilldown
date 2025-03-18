import { lazy } from 'react';
import { AppPlugin } from '@grafana/data';

// @ts-ignore new API that is not yet in stable release
import { sidecarServiceSingleton_EXPERIMENTAL } from '@grafana/runtime';
import pluginJson from './plugin.json';
import { EmbeddedTraceExplorationState, OpenInExploreTracesButtonProps } from 'exposedComponents/types';
import { SuspendedEmbeddedTraceExploration, SuspendedOpenInExploreTracesButton } from 'exposedComponents';

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
  .addLink({
    title: 'traces drilldown',
    description: 'Open in Traces Drilldown',
    icon: 'align-left',
    targets: 'grafana-lokiexplore-app/toolbar-open-related/v1',
    onClick: () => {
      sidecarServiceSingleton_EXPERIMENTAL?.openAppV3({ pluginId: pluginJson.id, path: '/explore' });
    },
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
