import { AdHocFiltersVariable, AdHocFilterWithLabels } from '@grafana/scenes';
import { AdHocVariableFilter } from '@grafana/data';
import { MetricFindValueWithMeta, VAR_FILTERS, explorationDS } from 'utils/shared';
import { renderTraceQLLabelFilters } from 'utils/filters-renderer';
import { VariableHide } from '@grafana/schema';
import { isUseValueTypeFilteringEnabled } from 'featureFlags/featureFlags';
import { getDataSourceSrv } from '@grafana/runtime';
import { toLabelValueType } from 'utils/utils';

export interface AttributeFiltersVariableProps {
  initialFilters?: AdHocVariableFilter[];
}

export class AttributeFiltersVariable extends AdHocFiltersVariable {
  constructor(props: Partial<AttributeFiltersVariableProps>) {
    super({
      addFilterButtonText: 'Add filter',
      name: VAR_FILTERS,
      datasource: explorationDS,
      hide: VariableHide.hideLabel,
      layout: 'combobox',
      filters: props.initialFilters ?? [],
      allowCustomValue: true,
      expressionBuilder: renderTraceQLLabelFilters,
      getTagValuesProvider,
    });
  }
}

type ProviderResponse = { replace?: boolean; values: MetricFindValueWithMeta[] };

export async function getTagValuesProvider(
  variable: AdHocFiltersVariable,
  filter: AdHocFilterWithLabels
): Promise<ProviderResponse> {
  if (!isUseValueTypeFilteringEnabled()) {
    return { replace: false, values: [] };
  }

  try {
    const filters: AdHocVariableFilter[] = [{ key: filter.key, operator: filter.operator, value: filter.value }];
    const ds = await getDataSourceSrv().get(explorationDS, { __sceneObject: { value: variable } });
    const response = (await ds.getTagValues?.({ filters, key: filter.key })) ?? [];
    const data = Array.isArray(response) ? response : response.data;
    const values = data.filter(Boolean).map((d) => {
      const { text, expandable, group, value } = d;
      // see https://github.com/grafana/grafana-tempo-datasource/pull/239
      // and https://github.com/grafana/scenes/pull/1613
      const valueType = toLabelValueType(d.properties?.valueType, value);
      return { text, value, expandable, group, meta: { valueType } };
    });

    return { replace: true, values };
  } catch (error) {
    console.error(
      `TracesDrilldown: failed to retrieve tag values for filter with key:"${filter.key}", operator:"${filter.operator}" and value:"${filter.value}"`,
      error
    );
  }

  return { replace: false, values: [] };
}
