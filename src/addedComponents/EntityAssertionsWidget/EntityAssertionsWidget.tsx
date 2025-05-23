import React, { ReactElement } from 'react';

import { TimeRange } from '@grafana/data';
import { ComponentSize } from '@grafana/ui';
import { usePluginComponent } from '@grafana/runtime';

interface EntityAssertionsWidgetProps {
  query: {
    entityName?: string;
    entityType?: string;
    start: number;
    end: number;
  };
  size: ComponentSize;
  source?: string;
}

export type EntityAssertionsWidgetExternal = (props: EntityAssertionsWidgetProps) => ReactElement | null;

interface Props {
  serviceName: string;
  range: TimeRange;
}

export function EntityAssertionsWidget({ serviceName, range }: Props) {
  const { isLoading, component: EntityAssertionsWidgetExternal } = usePluginComponent<EntityAssertionsWidgetProps>(
    'grafana-asserts-app/entity-assertions-widget/v1'
  );

  if (isLoading || !EntityAssertionsWidgetExternal) {
    return null;
  }

  return (
    <EntityAssertionsWidgetExternal
      size='md'
      source='Traces Drilldown'
      query={{
        start: range.from.valueOf(),
        end: range.to.valueOf(),
        entityName: serviceName,
        entityType: 'Service',
      }}
    />
  );
}
