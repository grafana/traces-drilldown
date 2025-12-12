import React, { memo } from 'react';

import {
  SceneComponentProps,
  SceneFlexItem,
  SceneObjectBase,
  SceneObjectState,
  sceneGraph,
} from '@grafana/scenes';
import { useStyles2, LoadingPlaceholder } from '@grafana/ui';
import { css } from '@emotion/css';
import { GrafanaTheme2, TimeRange } from '@grafana/data';
import { usePluginComponent } from '@grafana/runtime';
import { getFiltersVariable } from '../../../../../utils/utils';

interface SpanLatencyProps {
  timeRange?: TimeRange;
  policyId: string;
}

interface AdaptiveTracesSceneState extends SceneObjectState {}

const SpanLatencyWrapper = memo(
  function SpanLatencyWrapper({
    SpanLatencyComponent,
    policyId,
    timeRange,
  }: {
    SpanLatencyComponent: React.ComponentType<SpanLatencyProps>;
    policyId: string;
    timeRange: TimeRange;
  }) {
    const styles = useStyles2(getStyles);

    return (
      <div className={styles.container}>
        <SpanLatencyComponent policyId={policyId} timeRange={timeRange} />
      </div>
    );
  },
  (prev, next) =>
    prev.policyId === next.policyId &&
    prev.timeRange.from.valueOf() === next.timeRange.from.valueOf() &&
    prev.timeRange.to.valueOf() === next.timeRange.to.valueOf()
);

export class AdaptiveTracesScene extends SceneObjectBase<AdaptiveTracesSceneState> {
  constructor(state: Partial<AdaptiveTracesSceneState>) {
    super({ ...state });
  }

  public static Component = ({ model }: SceneComponentProps<AdaptiveTracesScene>) => {
    const styles = useStyles2(getStyles);
    const { isLoading, component: SpanLatencyComponent } = usePluginComponent<SpanLatencyProps>(
      'grafana-adaptivetraces-app/span-latency/v1'
    );

    const filtersVariable = getFiltersVariable(model);
    const { filters } = filtersVariable.useState();
    const policyId = filters.find((f) => f.key === 'instrumentation.tailsampling.policy')?.value.replace('.*/', '');

    const timeRangeObj = sceneGraph.getTimeRange(model);
    const { value: timeRange } = timeRangeObj.useState();

    if (isLoading) {
      return (
        <div className={styles.container}>
          <LoadingPlaceholder text="Loading Adaptive Traces..." />
        </div>
      );
    }

    if (!SpanLatencyComponent || !policyId) {
      return null;
    }

    return (
      <SpanLatencyWrapper
        SpanLatencyComponent={SpanLatencyComponent}
        policyId={policyId}
        timeRange={timeRange}
      />
    );
  };
}

export function buildAdaptiveTracesScene() {
  return new SceneFlexItem({
    body: new AdaptiveTracesScene({}),
  });
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      label: 'container',
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
    }),
  };
}

