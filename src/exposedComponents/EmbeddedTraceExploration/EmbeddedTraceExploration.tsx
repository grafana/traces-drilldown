import React, { useState } from 'react';
import { SceneTimeRange, syncStateFromSearchParams, UrlSyncContextProvider } from '@grafana/scenes';

import { TraceExploration } from '../../pages/Explore/TraceExploration';
import { EmbeddedTraceExplorationState } from 'exposedComponents/types';
import { usePluginJsonData } from '../../components/App/App';

export function buildTraceExplorationFromState({
  initialTimeRange,
  onTimeRangeChange,
  queryRangeHours,
  syncFromUrl,
  ...state
}: EmbeddedTraceExplorationState & { queryRangeHours?: number; syncFromUrl?: boolean }) {
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

  const exploration = new TraceExploration({
    $timeRange,
    embedded: true,
    initialMetric: state.initialMetric ?? 'rate',
    queryRangeHours,
    ...state,
  });

  // embeddedMini, and callers that pass syncFromUrl: false, leave the host URL alone.
  if (syncFromUrl ?? !state.embeddedMini) {
    const params = new URLSearchParams(window.location.search);
    syncStateFromSearchParams(exploration, params);
  }

  return exploration;
}

export default function EmbeddedTraceExploration(props: EmbeddedTraceExplorationState) {
  // Get plugin configuration following Grafana's recommended approach
  // See: https://grafana.com/developers/plugin-tools/tutorials/build-an-app-plugin#configuration-page
  const jsonData = usePluginJsonData();
  const [exploration] = useState(
    buildTraceExplorationFromState({ ...props, queryRangeHours: jsonData.queryRangeHours })
  );

  if (!props.urlSync) {
    return <exploration.Component model={exploration} />;
  }

  return (
    <UrlSyncContextProvider namespace="td" scene={exploration} updateUrlOnInit={false} createBrowserHistorySteps={true}>
      <exploration.Component model={exploration} />
    </UrlSyncContextProvider>
  );
}
