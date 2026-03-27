import React, { ReactElement, useEffect, useMemo, useState } from 'react';

import { AdHocVariableFilter, TimeRange } from '@grafana/data';
import type { 
  EntityAssertionsWidgetProps, 
  EntityFilterPropertyMatcher,
  EntityPropertyTypes,
  StringRules
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
        additionalMatchers: additionalMatchers.length > 0 ? additionalMatchers : undefined,
      }}
      returnToPrevious={true}
    />
  );
}

/**
 * Maps TraceQL operator strings to StringRules enum values.
 * 
 * Note: We use string literals with type assertions instead of importing StringRules as a value
 * because @grafana/plugin-types only exports types (no runtime code). The package.json exports
 * field only includes "types", not "import" or "default", so webpack cannot resolve runtime
 * imports. We import StringRules as a type-only import and use the enum's string literal values
 * directly to maintain type safety while avoiding runtime import errors.
 */
const mapOperatorToStringRule = (operator: string): StringRules => {
  switch (operator) {
    case '!=':
      return '<>' as StringRules; // StringRules.NOT_EQUALS
    case '=~':
      return 'CONTAINS' as StringRules; // StringRules.CONTAINS
    case '=':
    default:
      return '=' as StringRules; // StringRules.EQUALS
  }
};
