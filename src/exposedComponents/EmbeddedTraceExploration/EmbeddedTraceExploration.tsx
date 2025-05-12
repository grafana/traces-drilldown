import React, { useState } from 'react';
import { SceneTimeRange, UrlSyncContextProvider } from '@grafana/scenes';

import { TraceExploration } from '../../pages/Explore/TraceExploration';
import { EmbeddedTraceExplorationState } from 'exposedComponents/types';

function buildTraceExplorationFromState({
  initialTimeRange,
  onTimeRangeChange,
  ...state
}: EmbeddedTraceExplorationState) {
  const $timeRange = new SceneTimeRange({
    value: initialTimeRange,
    from: initialTimeRange.raw.from.toString(),
    to: initialTimeRange.raw.to.toString(),
  });

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

  return (
    <UrlSyncContextProvider scene={exploration} updateUrlOnInit={false} createBrowserHistorySteps={true}>
      <exploration.Component model={exploration} />
    </UrlSyncContextProvider>
  );
}
