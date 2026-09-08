import { AdHocFiltersVariable, AdHocFilterWithLabels } from '@grafana/scenes';
import { AdHocVariableFilter } from '@grafana/data';
import { MetricFindValueWithMeta, VAR_FILTERS, explorationDS } from 'utils/shared';
import { renderTraceQLLabelFilters } from 'utils/filters-renderer';
import { VariableHide } from '@grafana/schema';
import { isUseValueTypeFilteringEnabled } from 'featureFlags/featureFlags';
import { getDataSourceSrv, logError } from '@grafana/runtime';
import { stripOuterQuotes, toLabelValueType, toEscapedValue } from 'utils/utils';
import { ProviderEvents } from '@openfeature/web-sdk';
import { getOpenFeatureClient } from 'featureFlags/openFeature';

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

    this.handleOpenFeatureFlagsReady = this.handleOpenFeatureFlagsReady.bind(this);

    this.addActivationHandler(() => {
      getOpenFeatureClient().addHandler(ProviderEvents.Ready, this.handleOpenFeatureFlagsReady);
      return () => getOpenFeatureClient().removeHandler(ProviderEvents.Ready, this.handleOpenFeatureFlagsReady); // cleanup
    });
  }

  private handleOpenFeatureFlagsReady() {
    if (!isUseValueTypeFilteringEnabled()) {
      // when feature flag is off we don't want to call setState
      return;
    }

    // this will re issue a call to renderTraceQLLabelFilters with isUseValueTypeFilteringEnabled set
    this.setState({ filters: [...this.state.filters] });
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
      if ('text' in d === false) {
        return { text: '' };
      }

      const { text } = d;
      // see https://github.com/grafana/grafana-tempo-datasource/pull/239
      if (!d.properties?.valueType) {
        return { text };
      }

      const valueType = toLabelValueType(d.properties?.valueType, text);
      const bareValue = stripOuterQuotes(text);

      // value carries its own type; valueLabels drives the pill text and must exist for newRenderFilter to work correctly
      const value = toEscapedValue(valueType, bareValue);
      const valueLabels = [bareValue];

      return { text, value, valueLabels };
    });

    return { replace: true, values };
  } catch (error) {
    const errorMessage = `TracesDrilldown: failed to retrieve tag values for filter with key:"${filter.key}", operator:"${filter.operator}" and value:"${filter.value}"`;
    logError(error instanceof Error ? error : new Error(String(error)), { errorMessage });
  }

  return { replace: false, values: [] };
}
