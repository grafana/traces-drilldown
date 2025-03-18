import React, { useState } from 'react';
import { SceneTimeRange } from '@grafana/scenes';

import { TraceExploration } from '../../pages/Explore/TraceExploration';
import { EmbeddedTraceExplorationState } from 'exposedComponents/types';

function buildTraceExplorationFromState({ initialDS, initialFilters, timeRangeState }: EmbeddedTraceExplorationState) {
  return new TraceExploration({
    $timeRange: new SceneTimeRange(timeRangeState),
    initialDS,
    initialFilters,
    embedded: true,
  });
}

export default function EmbeddedTraceExploration(props: EmbeddedTraceExplorationState) {
  const [exploration] = useState(buildTraceExplorationFromState(props));

  return <exploration.Component model={exploration} />;
}
