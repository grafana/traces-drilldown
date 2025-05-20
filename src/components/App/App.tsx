import React from 'react';
import { AppRootProps, PageLayoutType } from '@grafana/data';
import { AppRoutes } from '../Routes';
import { PluginPage } from '@grafana/runtime';

import './globalStyles.css';

// This is used to be able to retrieve the root plugin props anywhere inside the app.
const PluginPropsContext = React.createContext<AppRootProps | null>(null);

class App extends React.PureComponent<AppRootProps> {
  render() {
    return (
      <PluginPropsContext.Provider value={this.props}>
        <PluginPage layout={PageLayoutType.Custom}>
          <AppRoutes />
        </PluginPage>
      </PluginPropsContext.Provider>
    );
  }
}

export default App;
