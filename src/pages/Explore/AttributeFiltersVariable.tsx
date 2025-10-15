import { AdHocFiltersVariable } from '@grafana/scenes';
import { AdHocVariableFilter } from '@grafana/data';
import { VAR_FILTERS, explorationDS } from 'utils/shared';
import { renderTraceQLLabelFilters } from 'utils/filters-renderer';
import { VariableHide } from '@grafana/schema';

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
    });
  }
}
