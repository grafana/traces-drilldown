import React, { useEffect, useState } from 'react';

import { TracesByServiceScene } from 'components/Explore/TracesByService/TracesByServiceScene';
import { usePluginJsonData } from '../../components/App/App';
import { EmbeddedTraceExceptionsState } from 'exposedComponents/types';
import { buildTraceExplorationFromState } from '../EmbeddedTraceExploration/EmbeddedTraceExploration';

export default function EmbeddedTraceExceptions(props: EmbeddedTraceExceptionsState) {
  const jsonData = usePluginJsonData();
  const [started] = useState(() => {
    const exploration = buildTraceExplorationFromState({
      ...props,
      embedded: true,
      initialMetric: 'errors',
      initialActionView: 'exceptions',
      allowedActionViews: ['exceptions'],
      // The host page owns the URL.
      syncFromUrl: false,
      queryRangeHours: jsonData.queryRangeHours,
    });

    // The service creates the exceptions scene on start, and only while the metric is errors.
    // Activating the exploration creates the service but does not start it.
    exploration.getMetricVariable();
    const stopExploration = exploration.activate();
    const service = exploration.state.topScene;
    if (!(service instanceof TracesByServiceScene)) {
      stopExploration();
      return undefined;
    }

    const stopService = service.activate();
    return {
      scene: service.state.exceptionsScene,
      stop() {
        stopService();
        stopExploration();
      },
    };
  });

  useEffect(() => started?.stop, [started]);

  return started?.scene ? <started.scene.Component model={started.scene} /> : null;
}
