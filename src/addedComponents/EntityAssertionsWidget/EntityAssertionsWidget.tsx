import React, { ReactElement, useEffect, useMemo, useState } from 'react';

import { AdHocVariableFilter, TimeRange } from '@grafana/data';
import { 
  EntityAssertionsWidgetProps, 
  EntityFilterPropertyMatcher,
  StringRules,
  EntityPropertyTypes
} from "@grafana/plugin-types/grafana-asserts-app"
import { usePluginComponent } from '@grafana/runtime';
import { sceneGraph, SceneObject } from '@grafana/scenes';
import { getFiltersVariable } from 'utils/utils';

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
  const [filters, setFilters] = useState<AdHocVariableFilter[]>([]);

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

  useEffect(() => {
    const filtersVariable = getFiltersVariable(model);
    setFilters(filtersVariable.state.filters);

    const sub = filtersVariable.subscribeToState((state) => {
      setFilters(state.filters);
    });

    return () => {
      sub.unsubscribe();
    };
  }, [model]);

  if (isLoading || !EntityAssertionsWidgetExternal || !timeRange) {
    return null;
  }

  // Convert AdHocVariableFilter to EntityFilterPropertyMatcher format for additionalMatchers
  const additionalMatchers: EntityFilterPropertyMatcher[] = useMemo(() => {
    return filters
      .filter((filter) => filter.key !== 'resource.service.name') // Exclude service.name as it's already passed as entityName
      .map((filter, index) => ({
        id: index,
        name: filter.key,
        value: filter.value,
        op: mapOperatorToStringRule(filter.operator),
        type: 'String' as EntityPropertyTypes,
      }));
  }, [filters]);

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
        additionalMatchers: additionalMatchers.length > 0 ? additionalMatchers : undefined,
      }}
      returnToPrevious={true}
    />
  );
}

const mapOperatorToStringRule = (operator: string): StringRules => {
  switch (operator) {
    case '!=':
      return StringRules.NOT_EQUALS;
    case '=~':
      return StringRules.CONTAINS;
    case '=':
    default:
      return StringRules.EQUALS;
  }
};
