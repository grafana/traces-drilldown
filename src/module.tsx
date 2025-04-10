import { lazy } from 'react';
import { AppPlugin } from '@grafana/data';

import { exposedComponents } from 'exposedComponents';
import { linkConfigs } from 'utils/links';

const App = lazy(() => import('./components/App/App'));
const AppConfig = lazy(() => import('./components/AppConfig/AppConfig'));

export const plugin = new AppPlugin<{}>().setRootPage(App).addConfigPage({
  title: 'Configuration',
  icon: 'cog',
  body: AppConfig,
  id: 'configuration',
});

for (const linkConfig of linkConfigs) {
  plugin.addLink(linkConfig);
}

for (const exposedComponentConfig of exposedComponents) {
  plugin.exposeComponent(exposedComponentConfig);
}
