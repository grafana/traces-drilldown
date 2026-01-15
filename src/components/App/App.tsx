import React from 'react';
import { AppRootProps, PageLayoutType, usePluginContext } from '@grafana/data';
import { AppRoutes } from '../Routes';
import { PluginPage } from '@grafana/runtime';
import { JsonData } from '../AppConfig/AppConfig';

/**
 * Hook to access plugin configuration following Grafana's recommended approach.
 * See: https://grafana.com/developers/plugin-tools/tutorials/build-an-app-plugin#configuration-page
 */
export const usePluginJsonData = (): JsonData => {
  const context = usePluginContext<JsonData>();
  return context?.meta?.jsonData || {};
};

class App extends React.PureComponent<AppRootProps<JsonData>> {
  render() {
    return (
      <PluginPage layout={PageLayoutType.Custom}>
        <AppRoutes />
      </PluginPage>
    );
  }
}

export default App;
