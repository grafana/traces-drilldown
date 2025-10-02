import React, { ReactElement, useEffect, useState } from 'react';

import { TimeRange } from '@grafana/data';
import { EntityAssertionsWidgetProps } from "@grafana/plugin-types/grafana-asserts-app/"
import { usePluginComponent } from '@grafana/runtime';
import { sceneGraph, SceneObject } from '@grafana/scenes';

export type EntityAssertionsWidgetExternal = (props: EntityAssertionsWidgetProps) => ReactElement | null;

interface Props {
  serviceName: string;
  model: SceneObject;
}

export function EntityAssertionsWidget({ serviceName, model }: Props) {
  const { isLoading, component: EntityAssertionsWidgetExternal } = usePluginComponent<EntityAssertionsWidgetProps>(
    'grafana-asserts-app/entity-assertions-widget/v1'
  );
  const [timeRange, setTimeRange] = useState<TimeRange>();

  useEffect(() => {
    const sceneTimeRange = sceneGraph.getTimeRange(model);
    setTimeRange(sceneTimeRange.state.value);

    const sub = sceneTimeRange.subscribeToState((state) => {
      setTimeRange(state.value);
    });

    return () => {
      sub.unsubscribe();
    };
  }, [model]);

  if (isLoading || !EntityAssertionsWidgetExternal || !timeRange) {
    return null;
  }

  return (
    <EntityAssertionsWidgetExternal
      size='md'
      source='Traces Drilldown'
      query={{
        start: timeRange.from.valueOf(),
        end: timeRange.to.valueOf(),
        entityName: serviceName,
        entityType: 'Service',
        enabled: true,
      }}
      returnToPrevious={true}
    />
  );
}
