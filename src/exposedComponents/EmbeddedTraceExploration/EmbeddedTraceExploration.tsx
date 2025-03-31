import React, { useState } from 'react';
import { SceneTimeRange } from '@grafana/scenes';

import { TraceExploration } from '../../pages/Explore/TraceExploration';
import { EmbeddedTraceExplorationState } from 'exposedComponents/types';

function buildTraceExplorationFromState({
  timeRangeState,
  onTimeRangeChange,
  ...state
}: EmbeddedTraceExplorationState) {
  const $timeRange = new SceneTimeRange(timeRangeState);
  $timeRange.subscribeToState((state) => {
    if (onTimeRangeChange) {
      onTimeRangeChange(state.value);
    }
  });

  return new TraceExploration({
    $timeRange,
    embedded: true,
    ...state,
  });
}

export default function EmbeddedTraceExploration(props: EmbeddedTraceExplorationState) {
  const [exploration] = useState(buildTraceExplorationFromState(props));

  return <exploration.Component model={exploration} />;
}
