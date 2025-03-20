import React from 'react';
import { AppRootProps } from '@grafana/data';
import { AppRoutes } from '../Routes';

// This is used to be able to retrieve the root plugin props anywhere inside the app.
const PluginPropsContext = React.createContext<AppRootProps | null>(null);

class App extends React.PureComponent<AppRootProps> {
  render() {
    return (
      <PluginPropsContext.Provider value={this.props}>
        <AppRoutes />
      </PluginPropsContext.Provider>
    );
  }
}

export default App;
