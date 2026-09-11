import { AdHocFiltersVariable } from '@grafana/scenes';
import { DATABASE_CALLS_KEY } from 'pages/Explore/primary-signals';
import { AdHocVariableFilter } from '@grafana/data';
import { getLabelValueType, stripOuterQuotes, toEscapedValue } from './utils';
import { IncludeExcludeOperator } from './shared';

export function addToVariableFilters(variable: AdHocFiltersVariable, filter: AdHocVariableFilter, append = false) {
  // TODO: Replace it with new API introduced in https://github.com/grafana/scenes/issues/1103
  // At the moment AdHocFiltersVariable doesn't support pushing new history entry on change
  history.pushState(null, '');

  let baseFilters;
  if (append) {
    baseFilters = variable.state.filters;
  } else {
    baseFilters = variable.state.filters.filter((f) => f.key === DATABASE_CALLS_KEY || f.key !== filter.key);
  }

  variable.setState({
    filters: [...baseFilters, { ...filter }],
  });
}

interface ToVariableFilterArgs {
  rawValue: string;
  key: string;
  operator: IncludeExcludeOperator;
}

export function toVariableFilter({ key, operator, rawValue }: ToVariableFilterArgs): AdHocVariableFilter {
  const valueType = getLabelValueType(rawValue, key);
  const bareValue = stripOuterQuotes(rawValue);

  // value carries its own type; valueLabels drives the pill text and must exist for newRenderFilter to work correctly
  const value = toEscapedValue(valueType, bareValue);
  const valueLabels = [bareValue];

  const filter = { key, value, valueLabels, operator };
  return filter;
}
