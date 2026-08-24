import React from 'react';

import { DataFrame } from '@grafana/data';
import { SceneObjectState, SceneObjectBase, SceneComponentProps, AdHocFiltersVariable } from '@grafana/scenes';
import { getFiltersVariable, getLabelValue } from '../../../utils/utils';
import { DATABASE_CALLS_KEY } from 'pages/Explore/primary-signals';
import { IncludeExcludeButtons } from './IncludeExcludeButtons';

interface AddToFiltersActionState extends SceneObjectState {
  frame: DataFrame;
  onClick: (payload: any) => void;
  labelKey?: string;
}

export class AddToFiltersAction extends SceneObjectBase<AddToFiltersActionState> {
  private handleFilterAction = (operator: '=' | '!=') => {
    const variable = getFiltersVariable(this);

    const labels = this.state.frame.fields.find((f) => f.labels)?.labels ?? {};
    if (this.state.labelKey) {
      if (!labels[this.state.labelKey]) {
        return;
      }
    } else {
      if (Object.keys(labels).length !== 1) {
        return;
      }
    }

    const labelName = this.state.labelKey ?? Object.keys(labels)[0];
    const value = getLabelValue(this.state.frame, this.state.labelKey);

    addToFilters(variable, labelName, value, operator);

    this.state.onClick({ labelName });
  };

  public onIncludeClick = () => {
    this.handleFilterAction('=');
  };

  public onExcludeClick = () => {
    this.handleFilterAction('!=');
  };

  public static Component = ({ model }: SceneComponentProps<AddToFiltersAction>) => {
    return <IncludeExcludeButtons onInclude={model.onIncludeClick} onExclude={model.onExcludeClick} />;
  };
}

export const addToFilters = (
  variable: AdHocFiltersVariable,
  label: string,
  value: string,
  operator: '=' | '!=' | '=~' | '!~' = '=',
  append = false
) => {
  // TODO: Replace it with new API introduced in https://github.com/grafana/scenes/issues/1103
  // At the moment AdHocFiltersVariable doesn't support pushing new history entry on change
  history.pushState(null, '');

  let baseFilters;
  if (append) {
    baseFilters = variable.state.filters;
  } else {
    baseFilters = variable.state.filters.filter((f) => f.key === DATABASE_CALLS_KEY || f.key !== label);
  }

  variable.setState({
    filters: [
      ...baseFilters,
      {
        key: label,
        operator: operator,
        value: value,
      },
    ],
  });
};
