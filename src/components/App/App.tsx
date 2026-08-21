import React from 'react';
import { AppRootProps, PageLayoutType, usePluginContext } from '@grafana/data';
import { t } from '@grafana/i18n';
import { AppRoutes } from '../Routes';
import { PluginPage } from '@grafana/runtime';
import { JsonData } from '../AppConfig/AppConfig';
import { OpenFeaturePluginScope } from 'featureFlags/openFeature';

/**
 * Hook to access plugin configuration following Grafana's recommended approach.
 * See: https://grafana.com/developers/plugin-tools/tutorials/build-an-app-plugin#configuration-page
 */
export const usePluginJsonData = (): JsonData => {
  const context = usePluginContext<JsonData>();
  return context?.meta?.jsonData || {};
};

class App extends React.PureComponent<AppRootProps<JsonData>> {
  componentDidMount() {
    // Initialize Faro for internal Frontend Observability (Grafana Cloud hosts only)
    void import('../../faro/faro')
      .then(({ initFaro }) => {
        void initFaro();
      })
      .catch((error) => {
        console.error('Failed to initialize Faro', error);
      });
  }

  render() {
    return (
      <PluginPage layout={PageLayoutType.Custom} pageNav={{ text: t('app.page-title', 'Traces Drilldown') }}>
        <OpenFeaturePluginScope>
          <AppRoutes />
        </OpenFeaturePluginScope>
      </PluginPage>
    );
  }
}

export default App;
