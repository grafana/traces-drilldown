import React, { useEffect, useState } from 'react';

import { TracesByServiceScene } from 'components/Explore/TracesByService/TracesByServiceScene';
import type { ExceptionsScene } from 'components/Explore/TracesByService/Tabs/Exceptions/ExceptionsScene';
import { usePluginJsonData } from '../../components/App/App';
import { EmbeddedTraceExceptionsState } from 'exposedComponents/types';
import { buildTraceExplorationFromState } from '../EmbeddedTraceExploration/EmbeddedTraceExploration';

export default function EmbeddedTraceExceptions(props: EmbeddedTraceExceptionsState) {
  const jsonData = usePluginJsonData();
  const [exploration] = useState(() =>
    buildTraceExplorationFromState({
      ...props,
      embedded: true,
      initialMetric: 'errors',
      initialActionView: 'exceptions',
      allowedActionViews: ['exceptions'],
      // The host page owns the URL.
      syncFromUrl: false,
      queryRangeHours: jsonData.queryRangeHours,
    })
  );
  const [exceptionsScene, setExceptionsScene] = useState<ExceptionsScene>();

  useEffect(() => {
    // The service creates the exceptions scene on start, and only while the metric is errors.
    // Activating the exploration creates the service but does not start it.
    exploration.getMetricVariable();
    const stopExploration = exploration.activate();
    const service = exploration.state.topScene;
    if (!(service instanceof TracesByServiceScene)) {
      stopExploration();
      return;
    }

    const stopService = service.activate();
    setExceptionsScene(service.state.exceptionsScene);

    return () => {
      stopService();
      stopExploration();
    };
  }, [exploration]);

  return exceptionsScene ? <exceptionsScene.Component model={exceptionsScene} /> : null;
}
