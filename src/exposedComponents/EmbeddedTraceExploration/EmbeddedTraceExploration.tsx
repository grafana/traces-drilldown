import React, { useState } from 'react';
import { SceneTimeRange, sceneUtils, UrlSyncContextProvider } from '@grafana/scenes';

import { TraceExploration } from '../../pages/Explore/TraceExploration';
import { EmbeddedTraceExplorationState } from 'exposedComponents/types';
import { usePluginJsonData } from '../../components/App/App';

function buildTraceExplorationFromState({
  initialTimeRange,
  onTimeRangeChange,
  queryRangeHours,
  ...state
}: EmbeddedTraceExplorationState & { queryRangeHours?: number }) {
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
    ...state 
  });

  // Otherwise, we'll sync with the URL when in embedded mini mode,
  // and this conflicts the embedded mini mode query when Traces Drilldown is also opened
  // because the URL is already synced with Traces Drilldown
  if (!state.embeddedMini) {
    const params = new URLSearchParams(window.location.search);
    sceneUtils.syncStateFromSearchParams(exploration, params);
  }

  return exploration;
}

export default function EmbeddedTraceExploration(props: EmbeddedTraceExplorationState) {
  // Get plugin configuration following Grafana's recommended approach
  // See: https://grafana.com/developers/plugin-tools/tutorials/build-an-app-plugin#configuration-page
  const jsonData = usePluginJsonData();
  const [exploration] = useState(buildTraceExplorationFromState({ ...props, queryRangeHours: jsonData.queryRangeHours }));

  if (!props.urlSync) {
    return <exploration.Component model={exploration} />;
  }

  return (
    <UrlSyncContextProvider namespace='td' scene={exploration} updateUrlOnInit={false} createBrowserHistorySteps={true}>
      <exploration.Component model={exploration} />
    </UrlSyncContextProvider>
  );
}
