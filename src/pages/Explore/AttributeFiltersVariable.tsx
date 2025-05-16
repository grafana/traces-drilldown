import { AdHocFiltersVariable } from '@grafana/scenes';
import { AdHocVariableFilter, VariableHide } from '@grafana/data';
import { VAR_FILTERS, explorationDS } from 'utils/shared';
import { renderTraceQLLabelFilters } from 'utils/filters-renderer';

export interface AttributeFiltersVariableProps {
  initialFilters?: AdHocVariableFilter[];
  embedderName?: string;
  embedded?: boolean;
}

export class AttributeFiltersVariable extends AdHocFiltersVariable {
  private initialFilters?: AdHocVariableFilter[];
  private embedderName?: string;
  private embedded?: boolean;

  constructor(props: Partial<AttributeFiltersVariableProps>) {
    super({
      addFilterButtonText: 'Add filter',
      name: VAR_FILTERS,
      datasource: explorationDS,
      hide: VariableHide.hideLabel,
      layout: 'combobox',
      filters: (props.initialFilters ?? []).map((f) => ({
        ...f,
        readOnly: props.embedded,
        origin: props.embedderName,
      })),
      allowCustomValue: true,
      expressionBuilder: renderTraceQLLabelFilters,
    });

    this.initialFilters = props.initialFilters;
    this.embedderName = props.embedderName;
    this.embedded = props.embedded;

    // Subscribe to state changes to update readOnly and origin for matching filters
    this.subscribeToState((newState) => {
      if (newState.filters && this.embedded) {
        let hasChanges = false;
        const updatedFilters = newState.filters.map((filter) => {
          // Check if this filter matches any of the initial filters
          const matchingInitialFilter = this.initialFilters?.find(
            (initialFilter) =>
              initialFilter.key === filter.key &&
              initialFilter.operator === filter.operator &&
              initialFilter.value === filter.value
          );

          if (matchingInitialFilter && !filter.readOnly && filter.origin !== this.embedderName) {
            hasChanges = true;
            return {
              ...filter,
              readOnly: true,
              origin: this.embedderName,
            };
          }

          return filter;
        });

        // Only update if there are actual changes
        if (hasChanges) {
          this.setState({ filters: updatedFilters });
        }
      }
    });
  }
}
